import threading
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone

from .config import (
    AI_DAILY_REQUEST_CAP,
    AI_DAILY_USER_REQUEST_CAP,
    AI_DAILY_OUTPUT_TOKEN_CAP,
    AI_DAILY_SPEND_USD_CAP,
    AI_INPUT_COST_PER_MILLION,
    AI_OUTPUT_COST_PER_MILLION,
)


@dataclass
class _DayState:
    day: str
    total_requests: int = 0
    total_output_tokens: int = 0
    total_cost_usd: float = 0.0
    user_requests: dict[str, int] | None = None

    def __post_init__(self):
        if self.user_requests is None:
            self.user_requests = defaultdict(int)


_lock = threading.Lock()
_state = _DayState(datetime.now(timezone.utc).date().isoformat())


def _today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


def _reset_if_needed() -> None:
    global _state
    day = _today()
    if _state.day != day:
        _state = _DayState(day)


def before_request(user_id: str) -> None:
    with _lock:
        _reset_if_needed()
        if _state.total_requests >= AI_DAILY_REQUEST_CAP:
            raise RuntimeError("MANORAKSHA AI daily capacity has been reached. Please try again tomorrow.")
        if _state.user_requests[user_id] >= AI_DAILY_USER_REQUEST_CAP:
            raise RuntimeError("Your MANORAKSHA AI daily message limit has been reached. Please try again tomorrow.")
        if _state.total_output_tokens >= AI_DAILY_OUTPUT_TOKEN_CAP:
            raise RuntimeError("MANORAKSHA AI daily capacity has been reached. Please try again tomorrow.")
        if _state.total_cost_usd >= AI_DAILY_SPEND_USD_CAP:
            raise RuntimeError("MANORAKSHA AI daily budget has been reached. Please try again tomorrow.")
        _state.total_requests += 1
        _state.user_requests[user_id] += 1


def record_usage(output_tokens: int = 0, input_tokens: int = 0) -> None:
    with _lock:
        _reset_if_needed()
        _state.total_output_tokens += max(0, int(output_tokens or 0))
        _state.total_cost_usd += (
            max(0, int(input_tokens or 0)) / 1_000_000 * AI_INPUT_COST_PER_MILLION
            + max(0, int(output_tokens or 0)) / 1_000_000 * AI_OUTPUT_COST_PER_MILLION
        )
