import logging
import re

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
import httpx

from .config import CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, AI_PROVIDER, AI_MODEL
from .rate_limit import before_request, record_usage
from .security import get_current_user

logger = logging.getLogger("manoraksha.ai")
router = APIRouter()
class AIProviderError(Exception):
    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        super().__init__(message)


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
    # GLM-4.7-Flash is text-only; never silently discard an image.
    if image_data_url:
        raise HTTPException(status_code=400, detail="This AI model supports text only. Turn off camera/image input and try again.")
    return [
        {"role": "system", "content": MANORAKSHA_INSTRUCTIONS},
        {"role": "user", "content": message},
    ]


def generate_manoraksha_reply(message: str, image_data_url: str | None = None, user_id: str | None = None) -> str:
    """Shared Cloudflare Workers AI function for website and Telegram."""
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        raise RuntimeError("Cloudflare Workers AI credentials are missing")
    if AI_PROVIDER.lower() != "cloudflare":
        raise RuntimeError("AI_PROVIDER must be set to cloudflare")
    messages = _build_input(message, image_data_url)
    if user_id:
        before_request(str(user_id))
    endpoint = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/{AI_MODEL}"
    # Do not log endpoint headers or payload; these can contain sensitive data.
    try:
        with httpx.Client(timeout=40.0) as client:
            response = client.post(
                endpoint,
                headers={"Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}"},
                json={"messages": messages, "max_completion_tokens": 600, "temperature": 0.65, "chat_template_kwargs": {"enable_thinking": False}},
            )
    except httpx.RequestError as exc:
        raise AIProviderError(503, "Cloudflare network error") from exc
    if response.status_code != 200:
        # Only log numeric Cloudflare error codes; never log upstream bodies, prompts or tokens.
        try:
            error_codes = [str(e.get("code")) for e in response.json().get("errors", []) if isinstance(e, dict) and isinstance(e.get("code"), int)]
        except (ValueError, TypeError, AttributeError):
            error_codes = []
        logger.warning("Cloudflare AI returned HTTP %s (model=%s, error_codes=%s)", response.status_code, AI_MODEL, ",".join(error_codes) or "none")
        raise AIProviderError(response.status_code, "Cloudflare request failed")
    try:
        body = response.json()
        if not body.get("success", False):
            logger.warning("Cloudflare AI returned unsuccessful result (model=%s)", AI_MODEL)
            raise AIProviderError(502, "Cloudflare returned an error")
        result = body.get("result") or {}
        # GLM's synchronous response uses OpenAI-style choices, not result.response.
        choices = result.get("choices") or []
        first = choices[0] if choices and isinstance(choices[0], dict) else {}
        assistant = first.get("message") or {}
        reply = (assistant.get("content") or "").strip()
        if not reply:
            logger.warning("Cloudflare returned no visible GLM reply (model=%s, finish_reason=%s)", AI_MODEL, first.get("finish_reason", "unknown"))
            raise AIProviderError(502, "Cloudflare returned no visible reply")
        usage = result.get("usage") or {}
        record_usage(usage.get("completion_tokens", 0), usage.get("prompt_tokens", 0))
        return reply
    except (ValueError, AttributeError, TypeError) as exc:
        raise AIProviderError(502, "Unexpected Cloudflare response") from exc


@router.post("/chat")
def chat(request: ChatRequest, current_user=Depends(get_current_user)):
    user_id = getattr(current_user, "id", None) or (current_user.get("id") if isinstance(current_user, dict) else None)
    crisis = is_crisis_text(request.message)
    try:
        reply = generate_manoraksha_reply(request.message, request.image_data_url, user_id=user_id)
        return {
            "reply": reply,
            "model": AI_MODEL,
            "camera_context_used": False,
            "crisis_detected": crisis,
            "safety": {"country": "India", "tele_manas": "14416", "kiran": "1800-599-0019", "emergency": "112"} if crisis else None,
        }
    except HTTPException:
        raise
    except AIProviderError as exc:
        # Do not leak API credentials or upstream response bodies to clients.
        status_code = getattr(exc, "status_code", None)
        logger.warning("Cloudflare API error: HTTP %s (model=%s)", status_code, AI_MODEL)
        status = 429 if status_code == 429 else 503 if status_code in (500, 502, 503, 504) else 502
        raise HTTPException(status_code=status, detail="Cloudflare request limit reached" if status == 429 else "AI provider temporarily unavailable")
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
