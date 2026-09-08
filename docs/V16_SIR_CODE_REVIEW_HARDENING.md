# MANORAKSHA V16.1 — Sir Code Review Hardening

This release aligns the working prototype with the supplied code-review notes while preserving the existing UI/navigation changes from V15.

## Implemented
- Website `/api/chat` now requires a signed-in Supabase access token before OpenAI is called.
- CORS is allowlisted by environment instead of `*`.
- Per-user and global daily AI request/token/budget guards are added. Configure current model pricing through environment variables before relying on the spend guard.
- OpenAI client is created once at server startup/import; timeout and bounded retry are enabled; Python logging replaces `print()`.
- Admin dashboard totals come from a security-definer aggregate RPC; staff are not granted broad mood/check-in row access.
- Staff can acknowledge/resolve alerts and actions are written to `audit_logs`.
- Staff can send notifications; users cannot insert arbitrary notifications.
- Profiles have an insert policy and profile writes confirm the returned row.
- Login-state loading no longer awaits database work inside Supabase Auth callbacks.
- Realtime listeners refresh only the affected data set and the resources subscription is filtered to published resources.
- Mood/check-ins use a user-local `entry_date`, enforce one record per user/day, and graphs use that date. Existing duplicate same-day records are reduced to the newest row during migration.
- `wellness_assignments.assigned_month` is migrated to `assigned_date`, and its user foreign key points to `profiles`.
- Database policies are dropped/recreated and Realtime additions are wrapped so the schema can be rerun safely.
- Indexes are added for the common user/date/status queries.
- Camera is off by default with an explicit on/off control.
- Crisis keywords trigger an in-app India support card with Tele-MANAS 14416, KIRAN 1800-599-0019 and emergency 112.
- Home no longer displays a made-up mood state when no check-in exists.
- Account deletion endpoint and Profile UI were added.
- Idle logout is enabled at 30 minutes of inactivity.
- Pinch-to-zoom is restored.
- Map markers use a dedicated layer group so old pins are cleared together.
- SoundHelix test tracks are replaced by local original WAV assets.
- Professional contact verification is now explicit instead of being silently set true.
- External resource and professional website links are protocol-checked before navigation.
- Common frontend browser alert boxes were replaced with an in-app status toast for the remaining affected actions.
- Emergency SOS text now states that 112 is for India; the crisis card also labels the country.
- Calming music modal now closes with Escape or an outside tap; bundled audio uses local WAV assets.

## Intentionally still requires a product/operations decision
- Who receives critical alerts, response SLA, overnight/weekend coverage, and the external delivery channel (email/SMS/phone) are operational decisions and are not fabricated in code.
- Journal/AI conversation retention period needs a documented policy before long-term logging is enabled. AI response content is not persisted by this release.
- The exact OpenAI price inputs for the daily USD budget must match the currently selected model.
- Full multilingual UI/voice coverage and a full component refactor are separate workstreams.
- A formal privacy policy/legal review should be completed before real-user deployment.

## Supabase
Run `supabase/v16_data_hardening_migration.sql` on the existing project, or run the corrected `supabase/schema.sql` on a fresh project.

## V16.1 additions
- Added a review-coverage checklist at `docs/V16_SIR_REVIEW_COVERAGE.md`.
- Hardened the existing-project wellness assignment migration so it does not assume `assigned_month` still exists.

## Verification note
- Backend Python source compiles successfully with `python -m compileall`.
- A full Vite production build was not runnable in this environment because npm dependency installation timed out and `vite` is not locally installed.
- `package-lock.json` remains a pending reproducibility item until generated and committed from a networked npm environment.
