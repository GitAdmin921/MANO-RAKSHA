from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from google import genai

from .config import (
    GEMINI_API_KEY,
    AI_PROVIDER,
    GEMINI_MODEL,
)

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
def chat(request: ChatRequest):

    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured"
        )

    if AI_PROVIDER.lower() != "gemini":
        raise HTTPException(
            status_code=500,
            detail="AI_PROVIDER must be set to gemini"
        )

    try:
        client = genai.Client(
            api_key=GEMINI_API_KEY
        )

        prompt = f"""
You are MANORAKSHA, a supportive mental-health
conversation assistant.

Be:
- empathetic
- calm
- respectful
- non-judgmental
- safety-focused

Do not claim to be a doctor, psychologist,
psychiatrist, or mental-health professional.

Encourage the user to seek professional or
emergency help when appropriate.

User message:
{request.message}
"""

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
        )

        return {
            "reply": response.text
        }

    except Exception as e:
        print("GEMINI ERROR:", repr(e))

        raise HTTPException(
            status_code=500,
            detail="AI request failed"
        )
