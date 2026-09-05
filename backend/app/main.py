from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import APP_ENV, SUPABASE_URL
from contextlib import asynccontextmanager

from .chat import router as chat_router
from .telegram_bot import router as telegram_router, initialize_telegram, shutdown_telegram

@asynccontextmanager
async def lifespan(app: FastAPI):
    await initialize_telegram()
    yield
    await shutdown_telegram()


app = FastAPI(title="MANORAKSHA API", version="0.14.0", lifespan=lifespan)

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
app.include_router(telegram_router, prefix="/api")

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
