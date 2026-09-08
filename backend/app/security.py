import logging
from dataclasses import dataclass
from typing import Any

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client

from .config import SUPABASE_URL, SUPABASE_SECRET_KEY

logger = logging.getLogger("manoraksha.security")
_bearer = HTTPBearer(auto_error=False)
_supabase_admin = None


def _admin_client():
    global _supabase_admin
    if _supabase_admin is None and SUPABASE_URL and SUPABASE_SECRET_KEY:
        _supabase_admin = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
    return _supabase_admin


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> Any:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Authentication required")
    client = _admin_client()
    if client is None:
        raise HTTPException(status_code=503, detail="Supabase authentication is not configured")
    try:
        result = client.auth.get_user(credentials.credentials)
        user = getattr(result, "user", None) or getattr(result, "data", None)
        if isinstance(user, dict):
            user_id = user.get("id")
        else:
            user_id = getattr(user, "id", None)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        return user
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("Token validation failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid authentication token") from exc


def delete_user(user_id: str) -> None:
    client = _admin_client()
    if client is None:
        raise RuntimeError("Supabase admin access is not configured")
    result = client.auth.admin.delete_user(user_id)
    error = getattr(result, "error", None)
    if error:
        raise RuntimeError(str(error))
