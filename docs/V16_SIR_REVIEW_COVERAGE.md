# MANORAKSHA V16 — Sir Review Coverage

This checklist maps the supplied code-review notes to the V16 hardening release.

## Fixed in V16

1. OpenAI endpoint auth, CORS, rate/budget guards, timeout/retry, logging.
2. Admin mood/check-in totals through an aggregate RPC rather than row access.
3. Alert acknowledge/resolve path plus audit records.
4. Staff-only notification creation path.
5. Deployment documentation matches OpenAI configuration names.
6. Rerunnable policies/realtime handling in the main schema.
7. User-local calendar date for mood/check-ins.
8. One mood/check-in row per user/day.
9. Profile upsert/insert policy and confirmed save result.
10. Auth callback no longer waits for the full data load.
11. Camera off by default with explicit user control.
12. Realtime refresh narrowed to affected datasets; resources subscription filtered.
13. Existing session user ID is reused by the affected save flows.
14. Broken one-line auth/admin stub files removed and README wording corrected.
16. Map markers are cleared through a dedicated layer group.

Additional V16 hardening:
- Account deletion endpoint/UI.
- Idle logout.
- Deterministic initial crisis keyword routing with India support numbers.
- No fabricated mood state before first check-in.
- Pinch-to-zoom restored.
- Local wellness audio replaces demo SoundHelix URLs.
- Professional verification is explicit.
- External links are protocol-checked.
- Remaining browser alert boxes were replaced with an in-app status toast.
- Emergency SOS explicitly identifies India/112.
- Calming music closes via Escape/outside tap.

## Pending by design / requires a product or legal decision

15. `package-lock.json` and switching Vercel to `npm ci` remain pending because the lockfile could not be generated in this offline/registry-timeout environment.

Safety operations: who receives alerts, response SLA, overnight/weekend coverage, and external delivery channels.

Privacy/legal: retention periods, formal privacy policy, consent wording, and the exact deletion/retention process for journals and AI conversations.

AI: conversation memory and durable response logging are intentionally not enabled until retention/consent decisions exist.

Accessibility/localization: full multilingual UI/voice coverage and a larger component refactor remain separate workstreams.

The review explicitly recommends tests/automatic checks before the large `main.jsx` refactor. Full frontend build/lint/CI is therefore not claimed from this environment.
