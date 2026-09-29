"""MANORAKSHA Telegram Bot integration (V14).

Text-only foundation for the first Telegram release. Voice/media can be added in V14.3.
The bot calls the same MANORAKSHA AI function used by the website.
"""
import logging
from fastapi import APIRouter, HTTPException, Request
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

from .chat import generate_manoraksha_reply
from .config import TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, PUBLIC_BACKEND_URL

router = APIRouter()
logger = logging.getLogger("manoraksha.telegram")


def _application() -> Application:
    if not TELEGRAM_BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not configured")
    return Application.builder().token(TELEGRAM_BOT_TOKEN).updater(None).build()


async def _start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message:
        await update.message.reply_text(
            "🪷 Welcome to MANORAKSHA AI.\n\n"
            "You can talk to me naturally. Tell me what is happening or ask me anything.\n\n"
            "I am a supportive AI companion, not a doctor or emergency service."
        )


async def _message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not update.message or not update.message.text:
        return
    text = update.message.text.strip()
    if not text:
        return
    try:
        reply = generate_manoraksha_reply(text)
        # Telegram messages have a 4096-character limit; MANORAKSHA normally stays short.
        for i in range(0, len(reply), 4000):
            await update.message.reply_text(reply[i:i + 4000])
    except Exception as exc:
        logger.exception("MANORAKSHA TELEGRAM ERROR: %s", type(exc).__name__)
        await update.message.reply_text(
            "I’m having trouble reaching MANORAKSHA AI right now. Please try again in a moment."
        )


async def build_application() -> Application:
    app = _application()
    app.add_handler(CommandHandler("start", _start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, _message))
    await app.initialize()
    await app.start()
    return app


telegram_app: Application | None = None


async def initialize_telegram():
    global telegram_app
    if not TELEGRAM_BOT_TOKEN:
        return False
    telegram_app = await build_application()
    if PUBLIC_BACKEND_URL:
        if not PUBLIC_BACKEND_URL.startswith("https://"):
            logger.warning("PUBLIC_BACKEND_URL must be an HTTPS URL for Telegram webhooks")
        else:
            try:
                await telegram_app.bot.set_webhook(
                    url=f"{PUBLIC_BACKEND_URL}/api/telegram/webhook",
                    secret_token=TELEGRAM_WEBHOOK_SECRET or None,
                    allowed_updates=["message"],
                    drop_pending_updates=False,
                )
                logger.info("Telegram webhook registered at %s/api/telegram/webhook", PUBLIC_BACKEND_URL)
            except Exception:
                logger.exception("Telegram webhook registration failed")
    else:
        logger.warning("PUBLIC_BACKEND_URL missing; Telegram webhook was NOT registered")
    return True


async def shutdown_telegram():
    global telegram_app
    if telegram_app is not None:
        await telegram_app.stop()
        await telegram_app.shutdown()
        telegram_app = None


@router.get("/telegram/status")
async def telegram_status():
    result = {"configured": bool(TELEGRAM_BOT_TOKEN), "webhook_secret_configured": bool(TELEGRAM_WEBHOOK_SECRET), "bot_initialized": telegram_app is not None, "public_backend_url_configured": bool(PUBLIC_BACKEND_URL)}
    if telegram_app is not None:
        try:
            info = await telegram_app.bot.get_webhook_info()
            result.update({"webhook_url": info.url, "pending_update_count": info.pending_update_count, "last_error_message": info.last_error_message})
        except Exception:
            logger.exception("Could not retrieve Telegram webhook status")
            result["webhook_status_error"] = True
    return result


@router.post("/telegram/webhook")
async def telegram_webhook(request: Request):
    if not TELEGRAM_BOT_TOKEN:
        raise HTTPException(status_code=503, detail="Telegram bot is not configured")
    if TELEGRAM_WEBHOOK_SECRET:
        supplied = request.headers.get("x-telegram-bot-api-secret-token", "")
        if supplied != TELEGRAM_WEBHOOK_SECRET:
            raise HTTPException(status_code=403, detail="Invalid Telegram webhook secret")
    if telegram_app is None:
        raise HTTPException(status_code=503, detail="Telegram bot is not initialized")
    data = await request.json()
    update = Update.de_json(data, telegram_app.bot)
    await telegram_app.process_update(update)
    return {"ok": True}
