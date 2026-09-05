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

import asyncio
import json
import logging
from typing import Any, Dict, Mapping, Sequence

import voluptuous as vol

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

ALLOWED_TASKS = frozenset({
    "ai_task_generate_data",
    "validate_config",
})

# One response contract for the validate_config task. The direct backend accepts
# this JSON-schema form; the host ai_task path uses validate_config_selector_schema()
# below, derived from this same source of truth.
VALIDATE_CONFIG_SCHEMA: Dict[str, Any] = {
    "type": "object",
    "properties": {
        "ok": {"const": True},
        "findings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "severity": {"type": "string"},
                    "message": {"type": "string"},
                },
                "required": ["severity", "message"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["findings"],
    "additionalProperties": False,
}


class AiBackendError(RuntimeError):
    """Sanitized AI backend failure with a closed classification code."""

    def __init__(self, code: str, attempts: int | None = None) -> None:
        self.code = code
        if attempts is None:
            super().__init__(f"AI backend failed ({code})")
            return
        super().__init__(
            f"AI backend: all {attempts} models in chain failed ({code})"
        )


def _json_schema_to_vol(schema: Mapping[str, Any]) -> Any:
    """Adapt the small JSON-schema subset used by AI callers to voluptuous."""
    if "enum" in schema:
        return vol.In(schema["enum"])
    if "const" in schema:
        return vol.Equal(schema["const"])

    schema_type = schema.get("type")
    if schema_type == "object" or "properties" in schema:
        required = set(schema.get("required", ()))
        rules = {
            (vol.Required(name) if name in required else name):
            _json_schema_to_vol(value)
            for name, value in schema.get("properties", {}).items()
        }
        extra = (
            vol.PREVENT_EXTRA
            if schema.get("additionalProperties") is False
            else vol.ALLOW_EXTRA
        )
        return vol.Schema(rules, extra=extra)
    if schema_type == "array":
        item_schema = schema.get("items")
        return [
            _json_schema_to_vol(item_schema)
            if isinstance(item_schema, Mapping)
            else object
        ]
    if schema_type == "string":
        return str
    if schema_type == "integer":
        return _json_integer
    if schema_type == "number":
        return _json_number
    if schema_type == "boolean":
        return bool
    if schema_type == "null":
        return vol.Equal(None)
    if isinstance(schema_type, list):
        return vol.Any(*(_json_schema_to_vol({"type": item}) for item in schema_type))
    return object


def _json_integer(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise vol.Invalid("expected integer")
    return value


def _json_number(value: Any) -> int | float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise vol.Invalid("expected number")
    return value


def _validate_response_schema(parsed: Any, schema: Any) -> Any:
    """Validate a decoded response against voluptuous or a JSON-schema dict."""
    if schema is None or schema == {}:
        return parsed
    if isinstance(schema, vol.Schema):
        validator = schema
    elif isinstance(schema, Mapping) and (
        "type" in schema
        or "properties" in schema
        or "required" in schema
        or "items" in schema
        or "enum" in schema
    ):
        validator = _json_schema_to_vol(schema)
    else:
        validator = vol.Schema(schema)
    if not isinstance(validator, vol.Schema):
        validator = vol.Schema(validator)
    return validator(parsed)


def validate_config_selector_schema() -> vol.Schema:
    """Return the host ai_task selector shape for validate_config."""
    return _json_schema_to_vol(VALIDATE_CONFIG_SCHEMA)


def validate_config_result(result: Any) -> Dict[str, Any]:
    """Validate and normalize one provider's validate_config response."""
    try:
        validated = _validate_response_schema(result, VALIDATE_CONFIG_SCHEMA)
    except vol.Invalid as err:
        raise AiBackendError("invalid_response") from err
    return {"findings": list(validated["findings"])}


def _classify_http_status(status: int) -> str:
    if status == 429:
        # P1 names this state no_credits, but bundled providers use it for a
        # quota/rate window exhausted for this key, not a literal balance signal.
        return "no_credits"
    if status in (401, 403):
        return "auth"
    if 500 <= status <= 599:
        return "provider_unreachable"
    return "invalid_response"


def _validated_task(task: str) -> str:
    if not isinstance(task, str) or task not in ALLOWED_TASKS:
        raise ValueError("unknown AI task")
    return task


# Per-task output instruction appended to the anonymous prompt. Constant text
# only (no installation data). Supplies the JSON keyword Groq's json_object
# mode requires AND the target shape the response schema validates against.
_TASK_OUTPUT_SPEC: Dict[str, str] = {
    "validate_config": (
        'Respond ONLY with a single valid JSON object of the form '
        '{"findings":[{"severity":"info|warning|error","message":"..."}]}. '
        "Each finding is one short observation about the config numbers above; "
        "return an empty findings array if nothing is wrong."
    ),
}


def build_anonymous_prompt(task: str, install: Mapping[str, Any]) -> str:
    """Render a task prompt from allow-listed anonymous numbers only.

    Anything not in PROMPT_ALLOWED_FIELDS is DROPPED — silently and by default.
    Adding a field to a prompt is therefore a deliberate, reviewable act.
    """
    task = _validated_task(task)
    safe = {k: v for k, v in install.items() if k in PROMPT_ALLOWED_FIELDS}
    dropped = sorted(set(install) - set(safe))
    if dropped:
        # Names only — a dropped field's VALUE is exactly what must not be logged.
        _LOGGER.debug("Prompt %s: dropped non-allow-listed fields %s", task, dropped)
    lines = [f"{k}={v}" for k, v in sorted(safe.items())]
    prompt = f"task={task}\n" + "\n".join(lines)
    spec = _TASK_OUTPUT_SPEC.get(task)
    if spec:
        # Two jobs, both required for json_object mode: (1) Groq rejects
        # response_format=json_object unless the word "json" appears in the
        # messages (HTTP 400), (2) the model needs the target shape to satisfy
        # the schema. Constant per-task text — carries NO installation data.
        prompt += "\n\n" + spec
    return prompt


class OpenAiCompatBackend:
    """Minimal OpenAI-compatible client (chat/completions + models probe)."""

    def __init__(
        self, session: Any, base_url: str, api_key: str,
        models: Sequence[str],
        entry_id: str | None = None,
        provider: str | None = None,
        model_cache: Any = None,
    ) -> None:
        self._session = session
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._models = tuple(models)
        self._entry_id = entry_id
        self._provider = provider
        self._model_cache = model_cache

    @property
    def _model(self) -> str:
        """Compatibility property — returns the head of the model chain."""
        return self._models[0]

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
        self, task: str, install: Mapping[str, Any], schema: Any
    ) -> Any:
        """The OUTGOING boundary (K2b/O2, binding).

        Takes an install MAPPING, not free text — there is no parameter through
        which raw instruction text can flow into the request body. The content
        is built here, from the allow-list, at the point bytes leave the
        process, so a caller that forgets to anonymize cannot leak: there is
        nothing to forget.

        Walks the ordered model chain (P1): tries the cached last-working model
        first (Task 3), then falls back to chain order. On HTTP error, timeout,
        or invalid JSON from one model, continues to the next. Exhausting the
        chain raises a classified AiBackendError.
        """
        content = build_anonymous_prompt(task, install)
        last_code: str | None = None

        # Try cached model first (Task 3)
        if self._model_cache and self._entry_id and self._provider:
            cached = self._model_cache.get(self._entry_id, self._provider)
            if cached:
                result, code = await self._try_model(
                    cached, content, schema,
                )
                if code is None:
                    self._model_cache.set(
                        self._entry_id, self._provider, cached,
                    )
                    return result
                last_code = code

        for model in self._models:
            result, code = await self._try_model(model, content, schema)
            if code is None:
                if self._model_cache and self._entry_id and self._provider:
                    self._model_cache.set(
                        self._entry_id, self._provider, model,
                    )
                return result
            last_code = code
        raise AiBackendError(last_code or "provider_unreachable", len(self._models))

    async def async_generate_text(
        self, system_prompt: str, user_message: str,
    ) -> str | None:
        """Text-output variant: no json_object, returns raw markdown.

        Mirrors async_generate_data model-chain walk but WITHOUT
        response_format=json_object. Groq qwen reasoning_effort=none is
        preserved. Returns None only when every model in the chain fails.
        """
        last_code: str | None = None

        if self._model_cache and self._entry_id and self._provider:
            cached = self._model_cache.get(self._entry_id, self._provider)
            if cached:
                result, code = await self._try_model_text(
                    cached, system_prompt, user_message,
                )
                if code is None:
                    self._model_cache.set(
                        self._entry_id, self._provider, cached,
                    )
                    return result
                last_code = code

        for model in self._models:
            result, code = await self._try_model_text(
                model, system_prompt, user_message,
            )
            if code is None:
                if self._model_cache and self._entry_id and self._provider:
                    self._model_cache.set(
                        self._entry_id, self._provider, model,
                    )
                return result
            last_code = code
        return None

    async def _try_model_text(
        self, model: str, system_prompt: str, user_message: str,
    ) -> tuple[str | None, str | None]:
        """Try a single model for text output; return (text, None) or (None, error code)."""
        payload: Dict[str, Any] = {
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            "temperature": 0,
        }
        if (
            self._provider == "groq"
            and "api.groq.com" in self._base_url
            and model.startswith("qwen")
        ):
            payload["reasoning_effort"] = "none"
        try:
            async with self._session.post(
                f"{self._base_url}/chat/completions", headers=self._headers,
                json=payload, timeout=DEFAULT_TIMEOUT_S,
            ) as resp:
                if resp.status != 200:
                    return None, _classify_http_status(resp.status)
                try:
                    body = await resp.json()
                except Exception:
                    return None, "invalid_response"
            msg_content = body["choices"][0]["message"]["content"]
            if (
                msg_content
                and msg_content.lstrip().startswith("<think>")
                and "</think>" in msg_content
            ):
                msg_content = msg_content.split("</think>", 1)[1]
            return msg_content, None
        except (asyncio.TimeoutError, TimeoutError):
            return None, "timeout"
        except (KeyError, TypeError):
            return None, "invalid_response"
        except (ConnectionError, OSError):
            return None, "provider_unreachable"
        except Exception:
            return None, "provider_unreachable"

    async def _try_model(
        self, model: str, content: str, schema: Any
    ) -> tuple[Any | None, str | None]:
        """Try a single model; return (parsed JSON, None) or (None, error code)."""
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": content}],
            "response_format": {"type": "json_object"},
            "temperature": 0,
        }
        # Reasoning models (e.g. Groq qwen3.x) emit a <think> block that breaks
        # response_format=json_object with HTTP 400 ("Failed to validate JSON").
        # Disabling reasoning yields a pure-JSON body. Verified 2026-08-01
        # against Groq qwen/qwen3.6-27b: none -> valid JSON, absent -> 400.
        # Scoped to the canonical Groq endpoint — not just the provider name:
        # base_url is overridable, so a groq-labelled backend pointed at another
        # host must not receive reasoning_effort (a Groq-specific field that
        # another endpoint rejects with 400).
        if (
            self._provider == "groq"
            and "api.groq.com" in self._base_url
            and model.startswith("qwen")
        ):
            payload["reasoning_effort"] = "none"
        try:
            async with self._session.post(
                f"{self._base_url}/chat/completions", headers=self._headers,
                json=payload, timeout=DEFAULT_TIMEOUT_S,
            ) as resp:
                if resp.status != 200:
                    return None, _classify_http_status(resp.status)
                try:
                    body = await resp.json()
                except Exception:
                    return None, "invalid_response"
            msg_content = body["choices"][0]["message"]["content"]
            # Belt-and-suspenders: a reasoning model may prepend a
            # <think>…</think> block. Strip it only when the content actually
            # begins with one, so a legitimate "</think>" inside a JSON string
            # value is never touched.
            if (
                msg_content
                and msg_content.lstrip().startswith("<think>")
                and "</think>" in msg_content
            ):
                msg_content = msg_content.split("</think>", 1)[1]
            parsed = json.loads(msg_content)
            return _validate_response_schema(parsed, schema), None
        except (asyncio.TimeoutError, TimeoutError):
            return None, "timeout"
        except (json.JSONDecodeError, KeyError, TypeError, vol.Invalid):
            return None, "invalid_response"
        except (ConnectionError, OSError):
            return None, "provider_unreachable"
        except Exception:
            return None, "provider_unreachable"
