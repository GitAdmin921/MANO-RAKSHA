# MANORAKSHA V2 deployment

## Vercel
Use `frontend` as the Root Directory (recommended). Build command: `npm run build`. Output: `dist`. Add VITE_* variables from `.env.example`.

## Render
Root Directory: `backend`. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Add backend-only secrets.

## Supabase
Run `supabase/schema.sql`. Promote the first admin manually. Confirm RLS policies and Realtime publication before real user testing.
