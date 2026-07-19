"""SCOPE-REVISION #8/#9: AI is optional and its key never lands in options."""
from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from custom_components.oig_cloud.config.steps import OigCloudOptionsFlowHandler
from custom_components.oig_cloud.config_registry import FIELD_REGISTRY, fields_for_section


def test_ai_section_exists_and_holds_no_secret():
    ai = fields_for_section("ai")
    assert {"ai_provider", "ai_base_url", "ai_model"} <= set(ai)
    assert all(not field.secret for field in ai.values()), (
        "the AI key must live in .storage, not options"
    )
    assert "ai_api_key" not in FIELD_REGISTRY


def test_provider_enum_is_co_equal_and_unset_by_default():
    """No hard default (SCOPE-REVISION #8) and AI is optional (#5)."""
    provider = FIELD_REGISTRY["ai_provider"]
    assert set(provider.enum) == {"ai_task", "groq", "nvidia"}
    assert provider.default in ("", None), "no provider may be pre-selected"


def test_ai_is_optional_everywhere():
    """#5: AI is never a condition for the dashboard."""
    for key in ("ai_provider", "ai_base_url", "ai_model"):
        assert FIELD_REGISTRY[key].optional is True


_SECRET = "gsk_ThisIsARealLookingSecretKey0123456789"


class _SpyKeyStore:
    """Capture what the flow step routes out of band."""

    instances = []

    def __init__(self, hass, entry_id):
        self.entry_id = entry_id
        self.calls = []
        self.clears = 0
        _SpyKeyStore.instances.append(self)

    async def async_set_key(self, provider, api_key):
        self.calls.append((provider, api_key))

    async def async_clear(self):
        self.clears += 1


@pytest.fixture
def spy_key_store(monkeypatch):
    _SpyKeyStore.instances = []
    monkeypatch.setattr(
        "custom_components.oig_cloud.config.steps.AiKeyStore", _SpyKeyStore
    )
    return _SpyKeyStore


def _flow(options=None):
    entry = SimpleNamespace(entry_id="e1", options=options or {}, data={})
    hass = SimpleNamespace(
        config_entries=SimpleNamespace(async_update_entry=MagicMock())
    )
    flow = OigCloudOptionsFlowHandler(entry)
    flow.hass = hass
    return entry, hass, flow


@pytest.mark.asyncio
async def test_ai_step_is_reachable_from_optional_options_menu():
    _, _, flow = _flow()

    result = await flow.async_step_init()

    assert "section_ai" in result["menu_options"]


@pytest.mark.asyncio
async def test_ai_step_form_contains_provider_connection_and_masked_key():
    _, _, flow = _flow()

    result = await flow.async_step_ai()

    schema = result["data_schema"].schema
    fields = {marker.schema: validator for marker, validator in schema.items()}
    assert set(fields) == {"ai_provider", "ai_base_url", "ai_model", "ai_api_key"}
    assert fields["ai_api_key"].config["type"] == "password"


@pytest.mark.asyncio
async def test_ai_step_stores_key_out_of_band(spy_key_store):
    """Submitting the AI step writes the key to AiKeyStore, never to options."""
    _, hass, flow = _flow({"charge_rate_kw": 2.8})

    result = await flow.async_step_ai(
        {
            "ai_provider": "groq",
            "ai_base_url": "",
            "ai_model": "",
            "ai_api_key": _SECRET,
        }
    )

    store = spy_key_store.instances[-1]
    assert store.calls == [("groq", _SECRET)]

    _, kwargs = hass.config_entries.async_update_entry.call_args
    options = kwargs["options"]
    assert options["ai_provider"] == "groq"
    assert "ai_api_key" not in options
    assert _SECRET not in str(options)
    assert "gsk_" not in str(options)
    assert result["type"] in ("create_entry", "form")


@pytest.mark.asyncio
async def test_ai_step_with_no_key_is_a_valid_submission(spy_key_store):
    """A blank step must not overwrite a stored key with an empty one."""
    _, _, flow = _flow()

    await flow.async_step_ai(
        {
            "ai_provider": "",
            "ai_base_url": "",
            "ai_model": "",
            "ai_api_key": "",
        }
    )

    assert all(not store.calls for store in spy_key_store.instances)


@pytest.mark.asyncio
async def test_ai_step_clears_stored_key_when_provider_changes_without_new_key(spy_key_store):
    """R11.4: a blank key on provider switch must clear the previous provider key."""
    _, hass, flow = _flow({"ai_provider": "groq", "charge_rate_kw": 2.8})

    await flow.async_step_ai(
        {
            "ai_provider": "nvidia",
            "ai_base_url": "",
            "ai_model": "",
            "ai_api_key": "",
        }
    )

    store = spy_key_store.instances[-1]
    assert store.calls == []
    assert store.clears == 1
    _, kwargs = hass.config_entries.async_update_entry.call_args
    assert kwargs["options"]["ai_provider"] == "nvidia"
    assert "ai_api_key" not in kwargs["options"]


@pytest.mark.asyncio
async def test_module_config_get_does_not_expose_ai_section(monkeypatch):
    """AI state has a dedicated endpoint; module_config must not grow this surface."""
    from custom_components.oig_cloud.api import ha_rest_api as api_module

    entry = SimpleNamespace(entry_id="e1", options={"ai_provider": "groq"})
    hass = SimpleNamespace()
    request = SimpleNamespace(
        app={"hass": hass, "hass_user": SimpleNamespace(is_admin=True)}
    )
    request.get = lambda _key, default=None: default
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda _hass, _box: entry)

    response = await api_module.OIGCloudModuleConfigView().get(request, "box1")
    body = json.loads(response.text)

    assert "ai" not in body


@pytest.mark.parametrize(
    "relative_path",
    [
        "custom_components/oig_cloud/strings.json",
        "custom_components/oig_cloud/translations/cs.json",
        "custom_components/oig_cloud/translations/en.json",
    ],
)
def test_ai_step_has_labels_and_co_equal_menu_copy(relative_path):
    path = Path(__file__).parents[1] / relative_path
    strings = json.loads(path.read_text(encoding="utf-8"))
    steps = strings["options"]["step"]

    assert steps["init"]["menu_options"]["section_ai"]
    ai_step = steps["ai"]
    assert {"ai_provider", "ai_base_url", "ai_model", "ai_api_key"} <= set(
        ai_step["data"]
    )
    copy = json.dumps(ai_step, ensure_ascii=False).lower()
    assert "recommended" not in copy
    assert "doporuč" not in copy
