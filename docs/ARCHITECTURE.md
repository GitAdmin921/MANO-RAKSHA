# MANORAKSHA Architecture

```text
User
 │
 ├── Voice
 ├── Video
 └── Text
       │
       ▼
Frontend
       │
       ▼
FastAPI Backend
       │
 ┌─────┼─────────────┐
 ▼     ▼             ▼
AI   Safety       Supabase
      │           PostgreSQL/Auth
      ▼
Human / Professional
Escalation
```

## Security boundary

Frontend:
- SUPABASE_URL
- SUPABASE_PUBLISHABLE_KEY

Backend only:
- SUPABASE_SECRET_KEY
- DATABASE_URL
- AI_API_KEY
- JWT_SECRET

The backend is the trust boundary for AI calls and privileged database operations.
