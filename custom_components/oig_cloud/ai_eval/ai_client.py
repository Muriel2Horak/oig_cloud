"""AI eval text-path client (Unit 2).

Calls the configured AI provider for the hourly-eval prompt and returns the
RAW Czech markdown (FAKTA/LIDSKY). AI is OPTIONAL — nothing breaks when no
provider is configured.

PRIVACY (binding): this module passes through ONLY the system_prompt and
user_message it is GIVEN. It MUST NOT inject any identifying field
(box_id, serial, latitude, longitude, name, entry_id) into the outgoing
request body.
"""
from __future__ import annotations

from typing import Any

from homeassistant.helpers.aiohttp_client import async_get_clientsession

from ..ai.backends import PROVIDERS, OpenAiCompatBackend
from ..ai.key_store import AiKeyStore
from ..ai.model_cache import get_ai_model_cache
from ..ai_task import MODEL_CHAINS


async def generate_eval_report(
    hass: Any,
    config_entry: Any,
    system_prompt: str,
    user_message: str,
) -> str | None:
    """Call the configured AI provider and return raw markdown, or None.

    Returns None when no AI provider is configured (AI is optional).
    """
    store = AiKeyStore(hass, config_entry.entry_id)
    options = getattr(config_entry, "options", None) or {}
    options_provider = options.get("ai_provider") or ""

    if options_provider:
        provider = options_provider
        stored_provider = await store.async_get_provider()
        key = await store.async_get_key() if stored_provider == provider else None
    else:
        provider = await store.async_get_provider()
        key = await store.async_get_key() if provider else None

    if not provider or provider not in PROVIDERS or not key:
        return None

    base_url = options.get("ai_base_url") or PROVIDERS[provider]["base_url"]
    model_override = options.get("ai_model") or ""
    models = (model_override,) if model_override else MODEL_CHAINS[provider]

    backend = OpenAiCompatBackend(
        session=async_get_clientsession(hass),
        base_url=base_url,
        api_key=key,
        models=models,
        entry_id=config_entry.entry_id,
        provider=provider,
        model_cache=get_ai_model_cache(hass),
    )

    return await backend.async_generate_text(system_prompt, user_message)
