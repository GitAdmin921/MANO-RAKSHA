# MANORAKSHA — Mental Health MVP

MANORAKSHA is an early-stage, accessibility-first mental-health support MVP.

> Safety: This is a software prototype, not a medical device, therapist, diagnosis system, or replacement for qualified professionals or emergency services.

## MVP direction
- Identify the user's real problem and communication needs.
- Study trauma/atrocity-related contexts and their effect on help-seeking.
- Explore voice/video communication for people who may be unable to navigate a conventional UI.
- Design a safe AI conversation layer.
- Provide a human/professional escalation path.
- Minimize sensitive data collection and build privacy/security into the architecture.

## Repository structure
```text
MANORAKSHA/
├── frontend/
├── backend/
├── docs/
├── .env.example
├── .gitignore
├── docker-compose.yml
├── LICENSE
└── README.md
```

## Technology
- Frontend: React + Vite
- Backend: Python + FastAPI
- Database/Auth/Storage/Realtime: Supabase
- AI: OpenAI API through the backend
- PostgreSQL: Supabase
- Redis: optional for later sessions/queues
- Hosting: Vercel (frontend) + Render or equivalent (backend)

## Environment variables
Create a private `.env` for local development from `.env.example`.

Never commit `.env`.

Required values:
```text
SUPABASE_URL
SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
DATABASE_URL
AI_PROVIDER
AI_API_KEY
JWT_SECRET
```

Secret rules:
- SUPABASE_SECRET_KEY: backend only.
- DATABASE_URL: backend/server only.
- AI_API_KEY: backend only.
- JWT_SECRET: backend only.
- Never put these secrets in React/frontend source code.
- Never commit real secrets to GitHub.

## Local development

### Backend
```bash
cd backend
python -m venv .venv
```

Windows:
```bash
.venv\Scripts\activate
```

Linux/macOS:
```bash
source .venv/bin/activate
```

Install:
```bash
pip install -r requirements.txt
```

Run:
```bash
uvicorn app.main:app --reload
```

API: `http://127.0.0.1:8000`
Health: `GET /health`

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Docker
From repository root:
```bash
docker compose up --build
```

Stop:
```bash
docker compose down
```

## GitHub
```bash
git add .
git commit -m "Configure MANORAKSHA MVP with Supabase"
git push origin main
```

Before pushing, verify that `.env` is NOT listed.

## Hosting

### Frontend — Vercel
1. Import the GitHub repository.
2. Root Directory: `frontend`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add only frontend-safe environment variables.
6. Deploy.

### Backend — Render
1. Create a Web Service from the GitHub repository.
2. Root Directory: `backend`.
3. Build command: `pip install -r requirements.txt`
4. Start command:
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
5. Add the real backend environment variables in Render Environment settings.
6. Never commit those values to GitHub.
7. Enable HTTPS.
8. Test `/health`.

### Supabase
Use the Supabase project for PostgreSQL and other backend services.

Before real sensitive data is used:
- enable Row Level Security (RLS);
- use least-privilege access;
- configure backups and retention;
- review authentication and consent;
- perform security/privacy testing.

## Development phases
1. Research — problem, user research, accessibility, trauma context, safety, privacy.
2. UX — voice-first flow, video flow, minimal UI, consent, human handoff.
3. Technical MVP — auth, backend API, Supabase, AI abstraction, safety service.
4. Validation — security, usability, safety, professional review, performance.
5. Controlled pilot — only after appropriate safety, privacy, legal and professional review.

## Current status
This repository is the technical foundation for the MANORAKSHA MVP. It is not production clinical software.


## SIH26094 V2 structure note

This repository contains the current patient MVP plus the database/auth/admin foundation:
- `supabase/schema.sql` — PostgreSQL/RLS/Realtime foundation
- `frontend/src/lib/supabase.js` — browser Supabase client
- `frontend/src/auth/AuthPanel.jsx` — authentication foundation
- `frontend/src/admin/AdminDashboard.jsx` — live database analytics foundation
- `frontend/public/assets/` — supplied male/female emotional-state assets
- `DEPLOYMENT.md` — deployment instructions

The existing MANORAKSHA AI `/api/chat` implementation is preserved.

**Important:** The database/auth/admin foundation must be wired into the final patient UI and tested in the target Supabase project before being treated as production-ready. No secrets are included in this repository.


## V14 — Telegram AI

MANORAKSHA AI can also be reached through a Telegram bot. The Telegram integration uses the same backend AI agent as the website. See `docs/TELEGRAM_V14_SETUP.md`.
