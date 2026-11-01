"""A customer who changed the OIG Cloud password can enter the new one in setup.

Regression: the only path was the reauth flow, which appears after authentication
has already failed. With a still-valid session or a planned change there was no
way to reach it, short of removing and re-adding the integration.
"""

from __future__ import annotations

import json
from pathlib import Path
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.config import steps as steps_module
from custom_components.oig_cloud.config.steps import ConfigFlow, OigCloudOptionsFlowHandler
from custom_components.oig_cloud.config.validation import (
    CannotConnect,
    InvalidAuth,
    LiveDataNotEnabled,
)
from custom_components.oig_cloud.const import CONF_PASSWORD, CONF_USERNAME

COMPONENT = Path(steps_module.__file__).parents[1]
NEW = {CONF_USERNAME: "new@example.com", CONF_PASSWORD: "new-secret"}


class _ConfigEntries:
    def __init__(self, entry):
        self.entry = entry
        self.reloaded = []

    def async_get_entry(self, entry_id):
        return self.entry if entry_id == self.entry.entry_id else None

    def async_update_entry(self, entry, data=None, options=None):
        assert options is None, "changing the login must not touch the options"
        entry.data = data

    async def async_reload(self, entry_id):
        self.reloaded.append(entry_id)
        return True


class _OptionsFlow(OigCloudOptionsFlowHandler):
    def async_show_form(self, **kwargs):
        return {"type": "form", **kwargs}

    def async_show_menu(self, **kwargs):
        return {"type": "menu", **kwargs}

    def async_abort(self, **kwargs):
        return {"type": "abort", **kwargs}


class _ConfigFlow(ConfigFlow):
    def async_show_form(self, **kwargs):
        return {"type": "form", **kwargs}

    def async_abort(self, **kwargs):
        return {"type": "abort", **kwargs}


def _entry():
    return SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "old@example.com", CONF_PASSWORD: "old-secret", "keep": 1},
        options={"enable_pricing": True},
    )


def _options_flow(entry):
    flow = _OptionsFlow(entry)
    flow.hass = SimpleNamespace(
        config_entries=_ConfigEntries(entry),
        states=SimpleNamespace(get=lambda _eid: None),
    )
    return flow


def _config_flow(entry):
    flow = _ConfigFlow()
    flow.context = {"entry_id": entry.entry_id}
    flow.hass = SimpleNamespace(config_entries=_ConfigEntries(entry))
    return flow


@pytest.fixture
def valid_login(monkeypatch):
    seen = []

    async def _validate(_hass, data):
        seen.append(data)
        return {"title": "OIG Cloud"}

    monkeypatch.setattr(steps_module, "validate_input", _validate)
    return seen



@pytest.mark.asyncio
async def test_options_menu_offers_the_login():
    result = await _options_flow(_entry()).async_step_init()

    assert "section_credentials" in result["menu_options"]


@pytest.mark.asyncio
async def test_form_shows_the_username_but_never_the_stored_password():
    form = await _options_flow(_entry()).async_step_section_credentials()

    assert form["type"] == "form"
    assert form["step_id"] == "section_credentials"
    schema_keys = {str(key): key for key in form["data_schema"].schema}
    assert schema_keys[CONF_USERNAME].default() == "old@example.com"
    assert "old-secret" not in repr(form)
    assert not callable(getattr(schema_keys[CONF_PASSWORD], "default", None))


@pytest.mark.asyncio
async def test_new_login_is_verified_stored_and_reloaded(valid_login):
    entry = _entry()
    flow = _options_flow(entry)

    result = await flow.async_step_section_credentials(dict(NEW))

    assert valid_login == [NEW]
    assert entry.data == {**NEW, "keep": 1}
    assert entry.options == {"enable_pricing": True}
    assert flow.hass.config_entries.reloaded == ["entry1"]
    assert result == {"type": "abort", "reason": "credentials_updated"}


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("error", "code"),
    [
        (InvalidAuth, "invalid_auth"),
        (CannotConnect, "cannot_connect"),
        (LiveDataNotEnabled, "live_data_not_enabled"),
        (RuntimeError, "unknown"),
    ],
)
async def test_rejected_login_changes_nothing(monkeypatch, error, code):
    async def _validate(_hass, _data):
        raise error

    monkeypatch.setattr(steps_module, "validate_input", _validate)
    entry = _entry()
    flow = _options_flow(entry)

    result = await flow.async_step_section_credentials(dict(NEW))

    assert result["type"] == "form"
    assert result["errors"] == {"base": code}
    assert entry.data[CONF_PASSWORD] == "old-secret"
    assert flow.hass.config_entries.reloaded == []
    keys = {str(key): key for key in result["data_schema"].schema}
    assert keys[CONF_USERNAME].default() == NEW[CONF_USERNAME]
    assert NEW[CONF_PASSWORD] not in repr(result)


@pytest.mark.asyncio
async def test_rejected_login_does_not_log_the_password(monkeypatch, caplog):
    async def _validate(_hass, _data):
        raise RuntimeError("boom")

    monkeypatch.setattr(steps_module, "validate_input", _validate)

    await _options_flow(_entry()).async_step_section_credentials(dict(NEW))

    assert NEW[CONF_PASSWORD] not in caplog.text


@pytest.mark.asyncio
async def test_home_assistant_reconfigure_entry_changes_the_login(valid_login):
    entry = _entry()
    flow = _config_flow(entry)

    form = await flow.async_step_reconfigure()
    assert form["step_id"] == "reconfigure"

    result = await flow.async_step_reconfigure(dict(NEW))

    assert entry.data == {**NEW, "keep": 1}
    assert flow.hass.config_entries.reloaded == ["entry1"]
    assert result == {"type": "abort", "reason": "reconfigure_successful"}


@pytest.mark.asyncio
async def test_reconfigure_without_an_entry_aborts():
    flow = _config_flow(_entry())
    flow.context = {"entry_id": "gone"}

    result = await flow.async_step_reconfigure()

    assert result == {"type": "abort", "reason": "unknown"}


@pytest.mark.parametrize(
    "catalog", ["strings.json", "translations/cs.json", "translations/en.json"]
)
def test_every_catalog_names_the_login_steps(catalog):
    data = json.loads((COMPONENT / catalog).read_text(encoding="utf-8"))

    for section, steps, aborts in (
        ("config", ("reconfigure", "reauth_confirm"), ("reconfigure_successful", "reauth_successful", "unknown")),
        ("options", ("section_credentials",), ("credentials_updated", "unknown")),
    ):
        for step in steps:
            labels = data[section]["step"][step]
            assert labels["title"]
            assert set(labels["data"]) == {CONF_USERNAME, CONF_PASSWORD}
        for reason in aborts:
            assert data[section]["abort"][reason]
        for code in ("invalid_auth", "cannot_connect", "live_data_not_enabled", "unknown"):
            assert data[section]["error"][code]

    assert data["options"]["step"]["init"]["menu_options"]["section_credentials"]
