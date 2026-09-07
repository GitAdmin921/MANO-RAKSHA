# V15.4 — Mobile OAuth Return Fix

## Fixed
- Prevent Android/iOS phone layout from becoming a centered desktop-sized shell after Google OAuth.
- Detects Android phones using `userAgentData.mobile`, physical screen size, and touch capability.
- Keeps iPhone/iPod as phone layout.
- Leaves tablets and laptops on responsive larger layouts.
- Adds a CSS fallback for touch phones and a hard full-width `.device-phone` shell.
- Bottom navigation spans the phone viewport after OAuth.
- No backend, Supabase, AI, Telegram, or notification logic changed.
