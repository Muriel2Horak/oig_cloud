"""Pure AI provider backoff state machine."""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Any, Callable


HASS_DATA_KEY = "oig_ai_backoff_state"
DOMAIN = "oig_cloud"


@dataclass(frozen=True)
class AiBackoffSnapshot:
    """Public immutable view of one (entry, provider) backoff state."""

    state: str
    attempt: int
    next_probe_at: float | None


class AiBackoffState:
    """Exponential backoff state per (entry_id, provider)."""

    def __init__(
        self,
        now: Callable[[], float] = time.monotonic,
        base_interval_s: float = 30,
        max_interval_s: float = 3600,
    ) -> None:
        self._now = now
        self._base_interval_s = base_interval_s
        self._max_interval_s = max_interval_s
        self._states: dict[tuple[str, str], AiBackoffSnapshot] = {}

    def snapshot(self, entry_id: str, provider: str | None) -> AiBackoffSnapshot:
        if provider is None:
            return self._idle()
        return self._states.get((entry_id, provider), self._idle())

    def record_failure(self, entry_id: str, provider: str) -> AiBackoffSnapshot:
        current = self.snapshot(entry_id, provider)
        attempt = current.attempt + 1
        next_probe_at = self._now() + self._interval_for_attempt(attempt)
        snapshot = AiBackoffSnapshot("backing_off", attempt, next_probe_at)
        self._states[(entry_id, provider)] = snapshot
        return snapshot

    def record_success(self, entry_id: str, provider: str) -> AiBackoffSnapshot:
        self._states.pop((entry_id, provider), None)
        return self._idle()

    def is_due(self, entry_id: str, provider: str | None) -> bool:
        state = self.snapshot(entry_id, provider)
        if state.next_probe_at is None:
            return True
        return self._now() >= state.next_probe_at

    def _interval_for_attempt(self, attempt: int) -> float:
        # Plan-author decision: attempts are uncapped; re-probe forever at the
        # ceiling interval instead of entering a permanent give-up state.
        interval = self._base_interval_s
        for _ in range(max(0, attempt - 1)):
            if interval >= self._max_interval_s:
                return self._max_interval_s
            interval *= 2
        return min(interval, self._max_interval_s)

    @staticmethod
    def _idle() -> AiBackoffSnapshot:
        return AiBackoffSnapshot("idle", 0, None)


def get_ai_backoff_state(hass: Any) -> AiBackoffState:
    """Return the integration-lifetime AI backoff state singleton."""
    domain_data = hass.data.setdefault(DOMAIN, {})
    state = domain_data.get(HASS_DATA_KEY)
    if not isinstance(state, AiBackoffState):
        state = AiBackoffState()
        domain_data[HASS_DATA_KEY] = state
    return state
