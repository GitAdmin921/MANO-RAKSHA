"""MANORAKSHA Telegram Bot integration (V14).

Text-only foundation for the first Telegram release. Voice/media can be added in V14.3.
The bot calls the same MANORAKSHA AI function used by the website.
"""
from fastapi import APIRouter, HTTPException, Request
from telegram import Update
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

from .chat import generate_manoraksha_reply
from .config import TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET

router = APIRouter()


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
        print("MANORAKSHA TELEGRAM ERROR:", repr(exc))
        await update.message.reply_text(
            "I’m having trouble reaching MANORAKSHA AI right now. Please try again in a moment."
        )


async def build_application() -> Application:
    app = _application()
    app.add_handler(CommandHandler("start", _start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, _message))
    await app.initialize()
    return app


telegram_app: Application | None = None


async def initialize_telegram():
    global telegram_app
    if not TELEGRAM_BOT_TOKEN:
        return False
    telegram_app = await build_application()
    return True


async def shutdown_telegram():
    global telegram_app
    if telegram_app is not None:
        await telegram_app.shutdown()
        telegram_app = None


@router.get("/telegram/status")
async def telegram_status():
    return {"configured": bool(TELEGRAM_BOT_TOKEN), "webhook_secret_configured": bool(TELEGRAM_WEBHOOK_SECRET)}


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
