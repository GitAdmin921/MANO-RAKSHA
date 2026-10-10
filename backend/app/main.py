import logging
import asyncio
import os
import re
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from .config import APP_ENV, SUPABASE_URL, CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, AI_PROVIDER, AI_MODEL, CORS_ALLOW_ORIGINS
from .chat import router as chat_router
from .telegram_bot import router as telegram_router, telegram_supervisor, shutdown_telegram
from .security import get_current_user, delete_user

class RedactSecrets(logging.Filter):
    """Remove configured secrets and Telegram bot-token URLs from log records."""
    _telegram_url = re.compile(r"(api\.telegram\.org/bot)[^/\s\"]+")

    def filter(self, record):
        message = record.getMessage()
        for name in ("TELEGRAM_BOT_TOKEN", "CLOUDFLARE_API_TOKEN", "TELEGRAM_WEBHOOK_SECRET", "SUPABASE_SECRET_KEY", "DATABASE_URL", "JWT_SECRET"):
            secret = os.getenv(name, "")
            if secret:
                message = message.replace(secret, "[REDACTED]")
        record.msg = self._telegram_url.sub(r"\1[REDACTED]", message)
        record.args = ()
        return True


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
# httpx logs full Telegram API URLs (including bot tokens) at INFO level.
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
for _handler in logging.getLogger().handlers:
    _handler.addFilter(RedactSecrets())
logger = logging.getLogger("manoraksha.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not CLOUDFLARE_API_TOKEN:
        logger.warning("MANORAKSHA AI: CLOUDFLARE_API_TOKEN is missing; website AI will be unavailable.")
    if AI_PROVIDER.lower() != "cloudflare":
        logger.warning("MANORAKSHA AI: AI_PROVIDER must be exactly 'cloudflare' (currently %s).", AI_PROVIDER)
    logger.info("MANORAKSHA AI model configured: %s", AI_MODEL)
    # Telegram outages must not prevent the API and website from starting.
    telegram_task = asyncio.create_task(telegram_supervisor())
    try:
        yield
    finally:
        telegram_task.cancel()
        try:
            await telegram_task
        except asyncio.CancelledError:
            pass
        await shutdown_telegram()


app = FastAPI(title="MANORAKSHA API", version="0.16.1", lifespan=lifespan)
from .shield_integration import ShieldEventMiddleware

app.add_middleware(ShieldEventMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(chat_router, prefix="/api")
app.include_router(telegram_router, prefix="/api")


@app.get("/")
def root():
    return {"service": "manoraksha-api", "status": "ok", "version": "0.16.1"}


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "manoraksha-api",
        "environment": APP_ENV,
        "supabase_configured": bool(SUPABASE_URL),
        "ai_configured": bool(CLOUDFLARE_API_TOKEN) and bool(CLOUDFLARE_ACCOUNT_ID) and AI_PROVIDER.lower() == "cloudflare",
        "ai_model": AI_MODEL,
    }


@app.delete("/api/account")
def delete_account(current_user=Depends(get_current_user)):
    user_id = getattr(current_user, "id", None) or (current_user.get("id") if isinstance(current_user, dict) else None)
    if not user_id:
        return {"status": "error"}
    delete_user(user_id)
    return {"status": "deleted"}
