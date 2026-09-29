"""Optional one-time Llama license activation. Never runs without explicit opt-in."""
import logging
import httpx
from .config import CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, AI_MODEL

logger = logging.getLogger("manoraksha.license")

def accept_llama_license_once():
    """Call only after an authorized person has reviewed and accepted Meta's terms."""
    if AI_MODEL != "@cf/meta/llama-3.2-11b-vision-instruct":
        logger.warning("License activation skipped: configured model is not Llama 3.2 11B Vision")
        return
    if not CLOUDFLARE_ACCOUNT_ID or not CLOUDFLARE_API_TOKEN:
        logger.error("License activation skipped: missing Cloudflare credentials")
        return
    endpoint = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/{AI_MODEL}"
    try:
        with httpx.Client(timeout=20.0) as client:
            response = client.post(endpoint, headers={"Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}"}, json={"prompt": "agree"})
        try:
            body = response.json()
        except ValueError:
            body = {}
        codes = [str(e.get("code")) for e in body.get("errors", []) if isinstance(e, dict) and isinstance(e.get("code"), int)] if isinstance(body, dict) else []
        if response.status_code == 200 and isinstance(body, dict) and body.get("success") is True:
            logger.info("Cloudflare Llama license activation succeeded (HTTP 200)")
        else:
            logger.warning("Cloudflare Llama license activation failed (HTTP %s, error_codes=%s)", response.status_code, ",".join(codes) or "none")
    except httpx.RequestError:
        logger.warning("Cloudflare Llama license activation failed: network error")
