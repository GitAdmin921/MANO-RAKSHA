# MANORAKSHA V15.2 — Responsive OAuth + Notification Overlay Fix

## Fixed
- Notification panel is now a viewport-level fixed overlay, so it cannot render behind the page content.
- Added a dimmed backdrop and Escape-to-close behavior.
- Notification panel respects mobile safe-area insets and remains usable on small screens.
- Android/iOS phone detection prevents an inflated CSS viewport after Google OAuth from switching the phone into the desktop shell.
- Authentication page now uses true responsive sizing: phone, tablet and laptop layouts adapt to the available viewport.
- Google OAuth still returns users to Home and keeps the neutral profile fallback when gender is missing.

## Files changed
- `frontend/src/main.jsx`
- `frontend/src/styles.css`
- `frontend/package.json`
- `README.md`
- `docs/V15_2_RESPONSIVE_NOTIFICATION_FIX.md`
