import logging
import re
import base64
import binascii

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from openai import OpenAI, APIStatusError, APIConnectionError, APITimeoutError

from .config import GROQ_API_KEY, AI_PROVIDER, AI_MODEL
from .rate_limit import before_request, record_usage
from .security import get_current_user

logger = logging.getLogger("manoraksha.ai")
router = APIRouter()
client = OpenAI(api_key=GROQ_API_KEY, base_url="https://api.groq.com/openai/v1", timeout=30.0, max_retries=1) if GROQ_API_KEY else None


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=6000)
    image_data_url: str | None = None


CRISIS_PATTERNS = [
    r"\bkill myself\b", r"\bend my life\b", r"\bsuicid(?:e|al)\b", r"\bwant to die\b",
    r"\bdon't want to live\b", r"\bdont want to live\b", r"\bself[- ]?harm\b", r"\bhurt myself\b",
    r"\bcut myself\b", r"\boverdose\b", r"\bshoot myself\b", r"\bhang myself\b",
]
CRISIS_RE = re.compile("|".join(CRISIS_PATTERNS), re.IGNORECASE)

MANORAKSHA_INSTRUCTIONS = """
You are MANORAKSHA AI, a calm, warm, culturally respectful mental-health support companion.

Your job is to help the person feel heard and take one safe, realistic next step.

STYLE
- Speak naturally, like a kind trusted companion, never like a textbook.
- Keep normal replies short: usually 2-6 sentences.
- Answer the user's actual question first. Do not wander into unrelated education.
- Ask at most one gentle follow-up question when it would genuinely help.
- Use simple language. Match the user's language when practical.
- Do not use long lists unless the user asks for detail.

SAFETY
- You are not a doctor, therapist, psychologist, psychiatrist, or emergency service.
- Never diagnose a mental disorder from text, voice, or appearance.
- Never claim that facial expression proves an emotion, disorder, or risk level.
- If the person appears to be in immediate danger, encourage contacting local emergency services, a trusted person, or a qualified professional.
- For self-harm, suicide, violence, abuse, or immediate-danger content, respond with empathy, encourage immediate human support, and keep the message concise.

VISION
- An optional camera frame may be provided. Treat it only as a weak contextual signal.
- You may describe visible, non-sensitive presentation such as whether the face is visible or whether the person appears engaged, but do not infer protected traits, identity, diagnosis, or certainty about emotions.
- Never say that the camera can determine whether someone is depressed, anxious, traumatized, or safe.

PRIVACY
- The supplied image is transient context for this request. Do not claim it has been stored.

OUTPUT
- Be concise, relevant, compassionate, and grounded.
- Prefer a human sentence over a generic disclaimer.
"""


def is_crisis_text(message: str) -> bool:
    return bool(CRISIS_RE.search(message or ""))


def _build_input(message: str, image_data_url: str | None = None):
    # GPT-OSS 120B on Groq is text-only. Do not silently discard camera frames.
    if image_data_url:
        raise HTTPException(status_code=400, detail="Camera images are not supported by the current AI model. Turn off camera and retry.")
    return [{"role": "system", "content": MANORAKSHA_INSTRUCTIONS}, {"role": "user", "content": message}]


def generate_manoraksha_reply(message: str, image_data_url: str | None = None, user_id: str | None = None) -> str:
    """Shared Groq AI function for the website and Telegram bot."""
    if not GROQ_API_KEY or client is None:
        raise RuntimeError("GROQ_API_KEY is not configured")
    if AI_PROVIDER.lower() != "groq":
        raise RuntimeError("AI_PROVIDER must be set to groq")
    messages = _build_input(message, image_data_url)
    if user_id:
        before_request(str(user_id))
    response = client.chat.completions.create(
        model=AI_MODEL,
        messages=messages,
        max_completion_tokens=900,
        temperature=0.6,
    )
    usage = getattr(response, "usage", None)
    record_usage(
        getattr(usage, "completion_tokens", 0) if usage else 0,
        getattr(usage, "prompt_tokens", 0) if usage else 0,
    )
    text = (response.choices[0].message.content or "").strip() if response.choices else ""
    if not text:
        logger.error("Groq returned empty output (model=%s)", AI_MODEL)
        raise RuntimeError("AI returned an empty response")
    return text


@router.post("/chat")
def chat(request: ChatRequest, current_user=Depends(get_current_user)):
    user_id = getattr(current_user, "id", None) or (current_user.get("id") if isinstance(current_user, dict) else None)
    crisis = is_crisis_text(request.message)
    try:
        reply = generate_manoraksha_reply(request.message, request.image_data_url, user_id=user_id)
        return {
            "reply": reply,
            "model": AI_MODEL,
            "camera_context_used": bool(request.image_data_url),
            "crisis_detected": crisis,
            "safety": {"country": "India", "tele_manas": "14416", "kiran": "1800-599-0019", "emergency": "112"} if crisis else None,
        }
    except HTTPException:
        raise
    except APIStatusError as exc:
        # Gemini can return 429 for free-tier rate limits; do not leak API keys/errors to clients.
        status_code = getattr(exc, "status_code", None)
        logger.warning("Groq API error: HTTP %s (model=%s)", status_code, AI_MODEL)
        status = 429 if status_code == 429 else 503 if status_code in (500, 502, 503, 504) else 502
        raise HTTPException(status_code=status, detail="Groq request limit reached" if status == 429 else "AI provider temporarily unavailable")
    except (APIConnectionError, APITimeoutError):
        logger.warning("Groq connection timeout or network failure")
        raise HTTPException(status_code=503, detail="AI provider temporarily unavailable")
    except RuntimeError as exc:
        msg = str(exc)
        if "daily" in msg.lower() or "capacity" in msg.lower() or "budget" in msg.lower() or "limit" in msg.lower():
            raise HTTPException(status_code=429, detail=msg)
        logger.error("MANORAKSHA AI configuration/limit error", exc_info=exc)
        raise HTTPException(status_code=503, detail="MANORAKSHA AI is temporarily unavailable")
    except Exception:
        logger.exception("MANORAKSHA AI request failed")
        if crisis:
            return {
                "reply": "I'm glad you told me. Please stay with someone you trust right now and get immediate human support.",
                "model": AI_MODEL,
                "camera_context_used": False,
                "crisis_detected": True,
                "safety": {"country": "India", "tele_manas": "14416", "kiran": "1800-599-0019", "emergency": "112"},
            }
        raise HTTPException(status_code=500, detail="MANORAKSHA AI request failed")
