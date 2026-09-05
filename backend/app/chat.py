from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from openai import OpenAI

from .config import OPENAI_API_KEY, AI_PROVIDER, AI_MODEL

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=6000)
    image_data_url: str | None = None


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
- Do not mention camera analysis unless it is relevant to the user's request or useful for transparency.
- Never say that the camera can determine whether someone is depressed, anxious, traumatized, or safe.

PRIVACY
- The supplied image is transient context for this request. Do not claim it has been stored.

OUTPUT
- Be concise, relevant, compassionate, and grounded.
- Prefer a human sentence over a generic disclaimer.
"""


def _build_input(request: ChatRequest):
    content = [{"type": "input_text", "text": request.message}]
    if request.image_data_url:
        if not request.image_data_url.startswith(("data:image/jpeg;base64,", "data:image/png;base64,", "data:image/webp;base64,")):
            raise HTTPException(status_code=400, detail="Unsupported camera image format")
        # Keep requests bounded so a camera frame cannot become an oversized API payload.
        if len(request.image_data_url) > 1_500_000:
            raise HTTPException(status_code=413, detail="Camera frame is too large")
        content.append({"type": "input_image", "image_url": request.image_data_url})
    return [{"role": "user", "content": content}]


@router.post("/chat")
def chat(request: ChatRequest):
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY is not configured")
    if AI_PROVIDER.lower() != "openai":
        raise HTTPException(status_code=500, detail="AI_PROVIDER must be set to openai")

    try:
        client = OpenAI(api_key=OPENAI_API_KEY)
        response = client.responses.create(
            model=AI_MODEL,
            instructions=MANORAKSHA_INSTRUCTIONS,
            input=_build_input(request),
            max_output_tokens=500,
            store=False,
        )
        return {
            "reply": response.output_text.strip(),
            "model": AI_MODEL,
            "camera_context_used": bool(request.image_data_url),
        }
    except HTTPException:
        raise
    except Exception as e:
        print("MANORAKSHA AI ERROR:", repr(e))
        raise HTTPException(status_code=500, detail="MANORAKSHA AI request failed")
