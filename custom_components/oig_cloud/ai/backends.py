"""OIG's own OpenAI-compatible AI backend (SCOPE-REVISION #9).

Calls Groq / NVIDIA DIRECTLY with the user's key. No HACS plugin, no
homeassistant.components.ai_task import — this module must stay importable and
testable on any HA version (the dev harness is currently 2025.1.4, which has no
ai_task at all).

PRIVACY (DECISIONS K2b, O2 — binding): prompts carry ONLY anonymous numbers,
enforced by an ALLOW-LIST (PROMPT_ALLOWED_FIELDS). A field that is not explicitly
allowed is not sent — no coordinates, box id, e-mail, entity id, or any future
field somebody forgot to think about.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, Mapping

_LOGGER = logging.getLogger(__name__)

DEFAULT_TIMEOUT_S = 30

# Provider is a CO-EQUAL choice (SCOPE-REVISION #8). Deliberately NO "recommended"
# and NO ordering semantics: Groq restricted even a legitimate account, so a hard
# default is fragile. base_url is overridable from the config flow.
PROVIDERS: Dict[str, Dict[str, str]] = {
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",   # CONFIRM against provider docs
        "key_prefix": "gsk_",
    },
    "nvidia": {
        "base_url": "https://integrate.api.nvidia.com/v1",  # CONFIRM against provider docs
        "key_prefix": "nvapi-",
    },
}

# The ONLY keys that may ever be interpolated into a prompt (K2b, binding).
#
# This is an ALLOW-LIST and the distinction is the whole point. A deny-list of
# identifying fields leaks by omission: every field added to the codebase after
# this line was written ships to a third-party LLM until somebody remembers to
# deny it. Here, a new field is dropped until somebody deliberately allows it —
# the failure mode is a missing number in a prompt, not a customer's phone number
# on Groq's servers.
#
# Membership rule: an anonymous SCALAR that a task's numeric reasoning needs, and
# which cannot identify an installation on its own or in combination. Nothing
# spatial (SCOPE-REVISION #5: "validate_config … BEZ lokace"), nothing naming,
# nothing that is an id.
PROMPT_ALLOWED_FIELDS = frozenset({
    # solar geometry — shape of the array, not where it is
    "kwp", "declination", "azimuth",
    # battery sizing + planner ratios
    "capacity_kwh", "battery_comfort_soc_percent", "auto_mode_switch_enabled",
    "balancing_enabled", "balancing_interval_days", "balancing_hold_hours",
    "cheap_window_percentile", "expensive_percentile", "charge_rate_kw",
})


def build_anonymous_prompt(task: str, install: Mapping[str, Any]) -> str:
    """Render a task prompt from allow-listed anonymous numbers only.

    Anything not in PROMPT_ALLOWED_FIELDS is DROPPED — silently and by default.
    Adding a field to a prompt is therefore a deliberate, reviewable act.
    """
    safe = {k: v for k, v in install.items() if k in PROMPT_ALLOWED_FIELDS}
    dropped = sorted(set(install) - set(safe))
    if dropped:
        # Names only — a dropped field's VALUE is exactly what must not be logged.
        _LOGGER.debug("Prompt %s: dropped non-allow-listed fields %s", task, dropped)
    lines = [f"{k}={v}" for k, v in sorted(safe.items())]
    return f"task={task}\n" + "\n".join(lines)


class OpenAiCompatBackend:
    """Minimal OpenAI-compatible client (chat/completions + models probe)."""

    def __init__(self, session: Any, base_url: str, api_key: str, model: str) -> None:
        self._session = session
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._model = model

    @property
    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json"}

    async def async_verify_key(self) -> bool:
        async with self._session.get(
            f"{self._base_url}/models", headers=self._headers,
            timeout=DEFAULT_TIMEOUT_S,
        ) as resp:
            return resp.status == 200

    async def async_generate_data(
        self, task: str, install: Mapping[str, Any], schema: Dict[str, Any]
    ) -> Any:
        """The OUTGOING boundary (K2b/O2, binding).

        Takes an install MAPPING, not free text — there is no parameter through
        which raw instruction text can flow into the request body. The content
        is built here, from the allow-list, at the point bytes leave the
        process, so a caller that forgets to anonymize cannot leak: there is
        nothing to forget.
        """
        content = build_anonymous_prompt(task, install)
        payload = {
            "model": self._model,
            "messages": [{"role": "user", "content": content}],
            "response_format": {"type": "json_object"},
            "temperature": 0,
        }
        async with self._session.post(
            f"{self._base_url}/chat/completions", headers=self._headers,
            json=payload, timeout=DEFAULT_TIMEOUT_S,
        ) as resp:
            if resp.status != 200:
                raise RuntimeError(f"AI backend HTTP {resp.status}")
            body = await resp.json()
        content = body["choices"][0]["message"]["content"]
        try:
            return json.loads(content)
        except (TypeError, ValueError) as err:
            raise ValueError("AI backend returned non-JSON content") from err
