# MANORAKSHA · मनः रक्षा

**SIH26094 — AI-Powered Dynamic Mental Health Monitoring and Distress Prediction System for Victims of Atrocities**

MANORAKSHA is a safety-first research/MVP application for continuous, consent-aware wellbeing check-ins, supportive AI conversation, longitudinal self-reported trends, resources and authorized operational monitoring. The current implementation keeps the existing Gemini AI endpoint intact while adding account persistence, database-backed records, Realtime synchronization and an authorized admin console.

## What changed in V2
- Real Supabase Auth login/signup.
- Persistent profile and male/female character personalization.
- Database-backed mood and journal records.
- Realtime user/admin synchronization.
- `/admin` authorized dashboard with live metrics, users, alerts, resources, messages and audit view.
- Admin-to-user notifications.
- Resource publishing for videos/images/articles/exercises.
- Browser navigation/session restoration so back/swipe/reload does not reset the journey.
- MANORAKSHA traditional/relaxing visual identity with Devanagari accents and supplied character assets.
- Existing Gemini AI chat remains on `/api/chat`.

## Setup
1. Create/configure a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL editor.
3. Sign up the first admin account, then promote its profile to `super_admin` using the SQL comment in the schema.
4. In Vercel/frontend env set only:
   - `VITE_API_BASE_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
5. In Render/backend env keep secrets server-side (`GEMINI_API_KEY`, Supabase secret key, database URL, JWT secret). Never expose these as `VITE_*`.
6. `cd frontend && npm install && npm run build`

## Admin
Open `/admin` after logging in with an authorized admin account. The dashboard reads the same database and subscribes to Realtime changes.

## Important safety boundary
MANORAKSHA is not a doctor, psychologist, emergency service or diagnostic system. Self-reported scores are records and trends, not diagnoses. Any future distress-prediction model must be trained, validated, explainable, consent-aware and governed before being used for real-world decisions.

## IP
Copyright (c) 2026 MANORAKSHA. All rights reserved. See `LICENSE`.
