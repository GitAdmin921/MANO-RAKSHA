# MANORAKSHA V15 — Profile, Authentication, Notifications & Theme

This release keeps the existing MANORAKSHA AI, Telegram, monitoring, journal, support, feedback, wellness and admin workflows intact while adding the requested usability updates.

## What changed

- Removed the long pre-login philosophy/description page. Users now land directly on the simple authentication screen.
- Added the **मनः शान्तिः** mark beside the MANORAKSHA logo on login/sign-up.
- Added strong sign-up password rules: 10+ characters, upper + lowercase, number and special character.
- Added live password-strength guidance and **Forgot password?** on login.
- Added **Continue with Google** using Supabase OAuth.
- Added a clean Dark / Light appearance selector. The choice is saved in the browser and can be changed later in Profile.
- Added a top-right notification center with unread count and mark-as-read support.
- The top-right menu icon opens Profile directly.
- Added a Home weekly mood snapshot beside the check-in/state area so users can see a quick report from the Home page.
- Added profile fields for display name, age and contact number.
- Added current-email reauthentication before changing the login email, followed by Supabase's secure email-change confirmation flow.
- Added a verified professional directory in Support. Staff can publish trusted doctors/mental-health professionals with role, organization, email, phone and website.
- Tightened mobile layout and reduced visual weight/empty space through the V15 CSS overrides.

## Supabase migration

Run:

`supabase/v15_profile_contacts_migration.sql`

This adds `profiles.phone`, `profiles.age`, and the `professional_contacts` table with RLS.

## Google sign-in setup

The code uses:

```js
supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: window.location.origin }
})
```

In Supabase, enable the Google provider and configure the Google OAuth client. Add the deployed MANORAKSHA origin to the Google OAuth authorized JavaScript origins and configure the Supabase callback URL in the Google provider settings.

## Email change safety

The Profile page first calls `supabase.auth.reauthenticate()` and asks the user to enter the OTP sent to the current email. Only after that verification does it request the new email. Supabase then runs its normal secure email-change confirmation flow.

Keep **Secure email change** enabled in Supabase for the strongest confirmation flow.

## No secrets in the frontend

Continue to keep Supabase secret/service-role keys, database passwords, OpenAI keys and JWT secrets out of the frontend repository.
