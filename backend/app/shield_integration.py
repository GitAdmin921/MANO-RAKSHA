
import os
import time

import httpx
from starlette.middleware.base import BaseHTTPMiddleware

SHIELD_URL = os.getenv("SHIELD_INGEST_URL", "").rstrip("/")
SHIELD_KEY = os.getenv("SHIELD_INGEST_KEY", "")


class ShieldEventMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        started = time.monotonic()
        response = await call_next(request)
        elapsed_ms = int((time.monotonic() - started) * 1000)

        # Report security-relevant responses only.
        if (
            SHIELD_URL
            and SHIELD_KEY
            and (
                response.status_code in (401, 403, 404, 429)
                or response.status_code >= 500
            )
        ):
            payload = {
                "severity": (
                    "high"
                    if response.status_code in (401, 403, 429)
                    else "medium"
                ),
                "category": "http_security_signal",
                "message": (
                    f"HTTP response {response.status_code}; "
                    f"{elapsed_ms} ms"
                ),
                "path": request.url.path[:300],
                "method": request.method[:12],
                "status_code": response.status_code,
                "metadata": {"latency_ms": elapsed_ms},
            }

            try:
                async with httpx.AsyncClient(timeout=1.5) as client:
                    await client.post(
                        f"{SHIELD_URL}/api/ingest/events",
                        json=payload,
                        headers={
                            "X-Shield-Ingest-Key": SHIELD_KEY
                        },
                    )
            except Exception:
                # Shield must not break the main website.
                pass

        return response
      
