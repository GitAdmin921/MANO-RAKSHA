# MANORAKSHA V15.1 — Mobile OAuth & Bottom-Gap Fix

## Fixed
- Android/iOS browsers no longer switch the app shell into the desktop/tablet layout after Google OAuth returns.
- Bottom navigation remains fixed to the phone viewport and respects the iOS safe area.
- Extra bottom blank space is removed.
- Mobile viewport metadata is hardened for Android/iOS.
- Google users are not asked to choose a gender during login. If Supabase has no gender metadata, the account is automatically given the neutral `other` profile value. This does not guess a user's gender; it can be changed later in Profile.
- Successful OAuth return explicitly opens the Home screen.

## Files changed
- `frontend/src/main.jsx`
- `frontend/src/styles.css`
- `frontend/index.html`
- `frontend/package.json`
- `docs/V15_1_MOBILE_OAUTH_FIX.md`
