# MANORAKSHA V14.1 — AI Web Fix

This patch fixes the website MANORAKSHA AI navigation crash.

## Root cause
The AI screen referenced `TELEGRAM_BOT_USERNAME` without declaring it in `frontend/src/main.jsx`. When React rendered the AI screen, the browser could throw a `ReferenceError`, making the page appear to flash/loading and return to the previous state.

## Fixes
- Declares `VITE_TELEGRAM_BOT_USERNAME` safely.
- Uses the Render API as a safe default when `VITE_API_BASE_URL` is not present.
- Adds `type="button"` to navigation/quick-action buttons.
- Adds a React error boundary with a refresh action.
- Keeps camera, voice, text, OpenAI backend, Telegram, Supabase, Monitor, Journal, Support and existing UI unchanged.

## Vercel
Recommended frontend environment variables:

```env
VITE_API_BASE_URL=https://mano-raksha.onrender.com
VITE_TELEGRAM_BOT_USERNAME=YOUR_BOT_USERNAME_WITHOUT_@
```

Do not put OpenAI or Telegram bot tokens in Vercel frontend variables.
