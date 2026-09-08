import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from .config import APP_ENV, SUPABASE_URL, OPENAI_API_KEY, AI_PROVIDER, AI_MODEL, CORS_ALLOW_ORIGINS
from .chat import router as chat_router
from .telegram_bot import router as telegram_router, initialize_telegram, shutdown_telegram
from .security import get_current_user, delete_user

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("manoraksha.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if not OPENAI_API_KEY:
        logger.warning("MANORAKSHA AI: OPENAI_API_KEY is missing; website AI will be unavailable.")
    if AI_PROVIDER.lower() != "openai":
        logger.warning("MANORAKSHA AI: AI_PROVIDER must be exactly 'openai' (currently %s).", AI_PROVIDER)
    logger.info("MANORAKSHA AI model configured: %s", AI_MODEL)
    await initialize_telegram()
    yield
    await shutdown_telegram()


app = FastAPI(title="MANORAKSHA API", version="0.16.1", lifespan=lifespan)

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
        "ai_configured": bool(OPENAI_API_KEY) and AI_PROVIDER.lower() == "openai",
        "ai_model": AI_MODEL,
    }


@app.delete("/api/account")
def delete_account(current_user=Depends(get_current_user)):
    user_id = getattr(current_user, "id", None) or (current_user.get("id") if isinstance(current_user, dict) else None)
    if not user_id:
        return {"status": "error"}
    delete_user(user_id)
    return {"status": "deleted"}
