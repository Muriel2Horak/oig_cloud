"""The Home 6 window is set in setup and written to the box only when it changes.

Home 6 without a window behaves as Home 1, and until now the window could only be
set on the box itself or in the OIG portal.
"""

from __future__ import annotations

from types import SimpleNamespace

import pytest

from custom_components.oig_cloud import home6_window as module
from custom_components.oig_cloud.config.steps import WizardMixin
from custom_components.oig_cloud.config_registry import FIELD_REGISTRY
from custom_components.oig_cloud.const import DOMAIN
from custom_components.oig_cloud.onboarding.state import ONBOARDING_STEPS


class _Api:
    def __init__(self, fail_on=None):
        self.writes = []
        self.fail_on = fail_on

    async def set_home6_window_start(self, hour):
        self._record("start", hour)

    async def set_home6_window_end(self, hour):
        self._record("end", hour)

    def _record(self, column, hour):
        if column == self.fail_on:
            raise RuntimeError("portal down")
        self.writes.append((column, hour))


def _setup(options, api):
    entry = SimpleNamespace(entry_id="e1", options=dict(options))

    def _update(target, options):
        target.options = options

    hass = SimpleNamespace(
        data={DOMAIN: {"e1": {"session_manager": api}}},
        config_entries=SimpleNamespace(async_update_entry=_update),
    )
    return hass, entry


@pytest.fixture
def notifications(monkeypatch):
    calls = {"created": [], "dismissed": []}
    monkeypatch.setattr(
        module.persistent_notification,
        "async_create",
        lambda _hass, message, **_kw: calls["created"].append(message),
    )
    monkeypatch.setattr(
        module.persistent_notification,
        "async_dismiss",
        lambda _hass, notification_id: calls["dismissed"].append(notification_id),
    )

    async def _no_wait(_seconds):
        calls.setdefault("waits", []).append(_seconds)

    monkeypatch.setattr(module.asyncio, "sleep", _no_wait)
    return calls


@pytest.mark.asyncio
async def test_default_window_never_touches_the_box(notifications):
    """A window set on the box itself must survive an install that never chose one."""
    api = _Api()
    hass, entry = _setup({}, api)

    await module.async_sync_home6_window(hass, entry)

    assert api.writes == []


@pytest.mark.asyncio
async def test_changed_window_is_written_one_value_at_a_time(notifications):
    api = _Api()
    hass, entry = _setup({"home6_window_start": 22, "home6_window_end": 6}, api)

    await module.async_sync_home6_window(hass, entry)

    assert api.writes == [("start", 22), ("end", 6)]
    assert notifications["waits"] == [module.WRITE_SPACING_SECONDS]
    assert entry.options["home6_window_applied"] == "22-6"


@pytest.mark.asyncio
async def test_only_the_changed_bound_is_written(notifications):
    api = _Api()
    hass, entry = _setup(
        {
            "home6_window_start": 23,
            "home6_window_end": 6,
            "home6_window_applied": "22-6",
        },
        api,
    )

    await module.async_sync_home6_window(hass, entry)

    assert api.writes == [("start", 23)]
    assert "waits" not in notifications


@pytest.mark.asyncio
async def test_applied_window_is_not_written_again(notifications):
    api = _Api()
    hass, entry = _setup(
        {
            "home6_window_start": 22,
            "home6_window_end": 6,
            "home6_window_applied": "22-6",
        },
        api,
    )

    await module.async_sync_home6_window(hass, entry)

    assert api.writes == []


@pytest.mark.asyncio
async def test_failed_write_is_reported_and_retried_later(notifications):
    api = _Api(fail_on="end")
    hass, entry = _setup({"home6_window_start": 22, "home6_window_end": 6}, api)

    await module.async_sync_home6_window(hass, entry)

    assert "home6_window_applied" not in entry.options
    assert len(notifications["created"]) == 1

    api.fail_on = None
    api.writes = []
    await module.async_sync_home6_window(hass, entry)

    assert ("end", 6) in api.writes
    assert entry.options["home6_window_applied"] == "22-6"
    assert notifications["dismissed"] == [module.NOTIFICATION_ID]


def test_empty_window_is_normalized():
    """The box reads equal times as no window, so 5-5 is stored as 0-0."""
    options = WizardMixin._build_home56_options(
        {"home6_window_start": 5, "home6_window_end": 5}
    )

    assert options == {"home6_window_start": 0, "home6_window_end": 0}


def test_window_fields_are_registered_with_hour_bounds():
    for key in ("home6_window_start", "home6_window_end"):
        field = FIELD_REGISTRY[key]
        assert (field.section, field.min, field.max, field.default) == ("home56", 0, 23, 0)
    assert FIELD_REGISTRY["home6_window_applied"].hidden is True


def _wizard(**data):
    wizard = WizardMixin()
    wizard._wizard_data = data
    return wizard


def test_wizard_shows_the_step_only_with_the_switch_on():
    assert _wizard(box_has_home56=True)._should_skip_step("wizard_home56") is False
    assert _wizard(box_has_home56=False)._should_skip_step("wizard_home56") is True


def test_wizard_routes_through_the_step():
    assert _wizard(box_has_home56=True)._get_next_step("wizard_battery") == "wizard_home56"


def test_step_count_includes_the_step():
    without = _wizard(box_has_home56=False)._get_total_steps()

    assert _wizard(box_has_home56=True)._get_total_steps() == without + 1
    assert "wizard_home56" in _wizard(box_has_home56=True)._build_step_sequence(False)


def test_onboarding_tracks_the_step():
    assert "home56" in ONBOARDING_STEPS
