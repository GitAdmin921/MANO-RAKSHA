# MANORAKSHA Telegram Bot — V14 setup

## 1. Create the bot

1. Open Telegram.
2. Search for **@BotFather** (Telegram's official bot-management account).
3. Send `/newbot`.
4. Enter a display name, for example `MANORAKSHA AI`.
5. Enter a unique username ending in `bot`, for example `ManorakshaAI_bot`.
6. BotFather gives you a **bot token**. Keep it secret. Do not paste it into GitHub, the frontend, or chat.

## 2. Deploy the V14 backend

In Render, add these environment variables:

```text
TELEGRAM_BOT_TOKEN=your_real_bot_token
TELEGRAM_BOT_USERNAME=ManorakshaAI_bot
TELEGRAM_WEBHOOK_SECRET=long_random_secret
```

Keep your existing Supabase and OpenAI variables unchanged.

## 3. Set the webhook

After Render deploys, the backend URL should expose:

```text
POST https://YOUR-RENDER-SERVICE.onrender.com/api/telegram/webhook
```

Telegram must send the webhook with the configured secret header. The easiest safe method is to run Telegram's `setWebhook` request from a private server shell using the bot token and a URL that includes your secret. Do not put the bot token in GitHub or frontend code.

A typical Telegram Bot API request is:

```text
https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https%3A%2F%2FYOUR-RENDER-SERVICE.onrender.com%2Fapi%2Ftelegram%2Fwebhook&secret_token=<WEBHOOK_SECRET>
```

## 4. Test

Open the bot in Telegram and send:

```text
/start
```

Then send:

```text
Hello, I had a difficult day.
```

The reply should come from the same MANORAKSHA AI agent used by the website.

## 5. Website link

Add this Vercel environment variable:

```text
VITE_TELEGRAM_BOT_USERNAME=ManorakshaAI_bot
```

Redeploy the frontend. The AI page will show **Continue on Telegram**.
