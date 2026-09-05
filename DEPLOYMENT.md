# MANORAKSHA SIH26094 — Deployment Guide

## Stack
- React + Vite → Vercel
- FastAPI → Render
- Supabase Auth + PostgreSQL + Realtime + Storage
- MANORAKSHA AI through the existing FastAPI `/api/chat` endpoint

## 1. Supabase
1. Open your Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Create/verify the storage bucket used for MANORAKSHA resources.
5. Review RLS/storage policies before real-user deployment.
6. Create the first account in the app, then promote it to `super_admin` using the SQL instruction at the bottom of `schema.sql`.

## 2. Render backend
Root Directory: `backend`

Build:
```bash
pip install -r requirements.txt
```

Start:
```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Backend environment:
```env
APP_ENV=production
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
DATABASE_URL=
REDIS_URL=
GEMINI_API_KEY=
AI_PROVIDER=MANORAKSHA AI
GEMINI_MODEL=MANORAKSHA AI-3.5-flash-lite
JWT_SECRET=
```

Never expose `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `GEMINI_API_KEY`, or `JWT_SECRET` to the frontend.

## 3. Vercel frontend
Root Directory: `frontend`

Build:
```bash
npm run build
```

Environment:
```env
VITE_API_BASE_URL=https://YOUR-RENDER-SERVICE.onrender.com
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## 4. Authentication
The frontend auth foundation uses Supabase Auth. Configure your Supabase Auth Site URL and redirect URLs for the deployed Vercel domain.

## 5. Realtime
`supabase/schema.sql` enables the main operational tables for Realtime. Review RLS and Realtime settings in Supabase before production.

## 6. AI
The existing AI endpoint is preserved:
`POST /api/chat`

Do not put the MANORAKSHA AI key in Vercel.

## 7. Security
- Keep `.env` out of Git.
- Use RLS for user-owned data.
- Keep admin roles in `user_roles`.
- Limit staff access to operational data.
- Review audit logs and storage policies.
- Do not treat mood/check-in data as a diagnosis.
- Validate any future distress-prediction model with appropriate data, governance, evaluation and human oversight.

## Local development

Frontend:
```bash
cd frontend
npm install
npm run dev
```

Backend:
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```
