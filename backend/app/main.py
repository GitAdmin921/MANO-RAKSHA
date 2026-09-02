from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import APP_ENV, SUPABASE_URL
from .chat import router as chat_router

app = FastAPI(title="MANORAKSHA API", version="0.1.0")

# MVP: allow the deployed frontend and local development to call the API.
# No credentials are used by the chat endpoint.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api")

@app.get("/")
def root():
    return {"service": "manoraksha-api", "status": "ok"}

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "manoraksha-api",
        "environment": APP_ENV,
        "supabase_configured": bool(SUPABASE_URL),
    }
