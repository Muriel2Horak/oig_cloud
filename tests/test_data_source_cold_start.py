"""Cold-start behaviour of ``DataSourceController`` incident classification.

An entry stored as ``local_only`` still has to survive Home Assistant startup,
where the local proxy's entities do not exist yet. ``init_data_source_state()``
runs early in setup, finds no proxy, and seeds ``effective_mode=cloud_only``.
When the proxy entities appear a moment later the effective mode moves to
``local_only``.

That first move is a **startup artifact**, not an operational incident: nothing
failed, the proxy simply had not been registered when setup ran. Reporting it
emits a cloud incident, logs a WARNING at every restart, and -- worse -- burns
the ``incident_fallback_cloud_to_local`` dedupe slot, so the *genuine* recovery
that may follow hours later is silently swallowed.

These tests drive the real controller: ``async_start()``, the real
``async_track_state_change_event`` subscription, and real ``hass.states``
writes. The controller's private evaluation callbacks are never poked directly
to fabricate a transition.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import timedelta

import pytest
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

from custom_components.oig_cloud.const import DOMAIN
from custom_components.oig_cloud.core.data_source import (
    DATA_SOURCE_CLOUD_ONLY,
    DATA_SOURCE_LOCAL_ONLY,
    PROXY_BOX_ID_ENTITY_ID,
    PROXY_LAST_DATA_ENTITY_ID,
    DataSourceController,
    get_data_source_state,
    init_data_source_state,
)
from custom_components.oig_cloud.shared.cloud_contract import EventName

BOX_ID = "2206237016"
CLOUD_TO_LOCAL = EventName.INCIDENT_FALLBACK_CLOUD_TO_LOCAL.value
LOCAL_TO_CLOUD = EventName.INCIDENT_FALLBACK_LOCAL_TO_CLOUD.value

DATA_SOURCE_LOGGER = "custom_components.oig_cloud.core.data_source"


class _RecordingEmitter:
    """Cloud emitter double that records every accepted event."""

    def __init__(self) -> None:
        self.events: list[dict] = []

    async def emit_cloud_event(self, event) -> bool:
        self.events.append(event)
        return True

    @property
    def names(self) -> list[str]:
        return [event["event_name"] for event in self.events]


class _Coordinator:
    def __init__(self) -> None:
        self.data = None
        self.refresh_calls = 0

    async def async_request_refresh(self) -> None:
        self.refresh_calls += 1


@pytest.fixture
def entry(hass) -> MockConfigEntry:
    config_entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        options={
            "data_source_mode": DATA_SOURCE_LOCAL_ONLY,
            "box_id": BOX_ID,
        },
    )
    config_entry.add_to_hass(hass)
    return config_entry


@pytest.fixture
def emitter(hass, entry) -> _RecordingEmitter:
    recording = _RecordingEmitter()
    hass.data.setdefault(DOMAIN, {}).setdefault(entry.entry_id, {})["telemetry"] = {
        "emitter": recording,
        "incident_dedupe": {},
    }
    hass.data["core.uuid"] = "cold-start-uuid"
    return recording


def _dedupe(hass, entry) -> dict:
    return hass.data[DOMAIN][entry.entry_id]["telemetry"]["incident_dedupe"]


async def _make_proxy_available(hass, *, age: timedelta = timedelta(seconds=0)) -> None:
    """Register the proxy entities exactly as the local proxy integration does."""
    hass.states.async_set(PROXY_BOX_ID_ENTITY_ID, BOX_ID)
    hass.states.async_set(
        PROXY_LAST_DATA_ENTITY_ID, (dt_util.utcnow() - age).isoformat()
    )
    await hass.async_block_till_done()


async def _make_proxy_stale(hass, freezer) -> None:
    """The proxy stops publishing; the periodic health check notices it went stale.

    Time is advanced rather than a new state written: writing any state would
    refresh the proxy entity's ``last_updated``, which is itself one of the
    freshness sources, so the mode would never go stale.
    """
    freezer.tick(timedelta(hours=6))
    async_fire_time_changed(hass, dt_util.utcnow())
    await hass.async_block_till_done()


async def _start_controller(hass, entry, coordinator) -> DataSourceController:
    # Production ordering: the early seed runs first, with no proxy present.
    seeded = init_data_source_state(hass, entry)
    assert seeded.effective_mode == DATA_SOURCE_CLOUD_ONLY
    assert seeded.local_available is False

    controller = DataSourceController(hass, entry, coordinator, telemetry_store=None)
    await controller.async_start()
    await hass.async_block_till_done()
    return controller


# ---------------------------------------------------------------------------
# Cold start: the proxy arriving late is not an incident
# ---------------------------------------------------------------------------


async def test_cold_start_proxy_arrival_emits_no_incident_and_no_warning(
    hass, entry, emitter, caplog, recwarn
):
    caplog.set_level(logging.WARNING)
    coordinator = _Coordinator()

    controller = await _start_controller(hass, entry, coordinator)
    try:
        # Startup settle: the proxy registers its entities a moment later.
        await _make_proxy_available(hass)

        state = get_data_source_state(hass, entry.entry_id)
        assert state.effective_mode == DATA_SOURCE_LOCAL_ONLY, (
            "the controller never recognised the proxy at all -- the test would "
            "pass vacuously"
        )
        assert state.local_available is True

        assert emitter.events == [], (
            f"cold start emitted a false incident: {emitter.names}"
        )
        warnings = [
            rec.getMessage()
            for rec in caplog.records
            if rec.levelno >= logging.WARNING and rec.name.startswith(DATA_SOURCE_LOGGER)
        ]
        assert not warnings, f"cold start logged a warning: {warnings}"
    finally:
        await controller.async_stop()

    # No orphaned coroutine or unclosed resource from the scheduled tasks.
    leaked = [
        w
        for w in recwarn
        if issubclass(w.category, (ResourceWarning,))
        or "never awaited" in str(w.message)
    ]
    assert not leaked, [str(w.message) for w in leaked]


async def test_cold_start_leaves_the_recovery_dedupe_slot_free(
    hass, entry, emitter
):
    """The startup artifact must not consume the real incident's dedupe slot."""
    coordinator = _Coordinator()
    controller = await _start_controller(hass, entry, coordinator)
    try:
        await _make_proxy_available(hass)
        assert get_data_source_state(hass, entry.entry_id).effective_mode == (
            DATA_SOURCE_LOCAL_ONLY
        )
        assert not _dedupe(hass, entry).get(CLOUD_TO_LOCAL), (
            "cold start burned the cloud->local dedupe slot; the genuine "
            "recovery incident would now be swallowed"
        )
    finally:
        await controller.async_stop()


# ---------------------------------------------------------------------------
# After readiness the genuine transitions are still reported
# ---------------------------------------------------------------------------


async def test_genuine_loss_and_recovery_each_emit_once_after_readiness(
    hass, entry, emitter, caplog, freezer
):
    caplog.set_level(logging.WARNING)
    coordinator = _Coordinator()
    controller = await _start_controller(hass, entry, coordinator)
    try:
        await _make_proxy_available(hass)
        assert emitter.events == []

        # Genuine local loss: the proxy's data goes stale.
        await _make_proxy_stale(hass, freezer)
        assert get_data_source_state(hass, entry.entry_id).effective_mode == (
            DATA_SOURCE_CLOUD_ONLY
        )
        assert emitter.names == [LOCAL_TO_CLOUD], (
            f"local loss did not report exactly one incident: {emitter.names}"
        )

        # Recovery: the proxy reports fresh data again.
        await _make_proxy_available(hass)
        assert get_data_source_state(hass, entry.entry_id).effective_mode == (
            DATA_SOURCE_LOCAL_ONLY
        )
        assert emitter.names == [LOCAL_TO_CLOUD, CLOUD_TO_LOCAL], (
            f"recovery did not report exactly one incident: {emitter.names}"
        )

        # A second full cycle still reports one incident per real transition.
        await _make_proxy_stale(hass, freezer)
        await _make_proxy_available(hass)
        assert emitter.names == [
            LOCAL_TO_CLOUD,
            CLOUD_TO_LOCAL,
            LOCAL_TO_CLOUD,
            CLOUD_TO_LOCAL,
        ], emitter.names
    finally:
        await controller.async_stop()


async def test_duplicate_incident_scheduling_is_deduplicated(hass, entry, emitter):
    """Two concurrent emits of the same incident collapse to one cloud event."""
    coordinator = _Coordinator()
    controller = await _start_controller(hass, entry, coordinator)
    try:
        await asyncio.gather(
            controller._async_emit_fallback_incident(
                event_name=LOCAL_TO_CLOUD,
                previous_mode=DATA_SOURCE_LOCAL_ONLY,
                current_mode=DATA_SOURCE_CLOUD_ONLY,
            ),
            controller._async_emit_fallback_incident(
                event_name=LOCAL_TO_CLOUD,
                previous_mode=DATA_SOURCE_LOCAL_ONLY,
                current_mode=DATA_SOURCE_CLOUD_ONLY,
            ),
        )
        assert emitter.names == [LOCAL_TO_CLOUD], emitter.names
    finally:
        await controller.async_stop()


async def test_sustained_absent_proxy_arms_the_baseline_after_the_grace_window(
    hass, entry, emitter, freezer
):
    """A proxy that never appears must not silence incidents forever.

    Once the bounded readiness window (the operator's configured proxy stale
    window) has elapsed with no local data at all, a later arrival is a real
    recovery and is reported.
    """
    coordinator = _Coordinator()
    controller = await _start_controller(hass, entry, coordinator)
    try:
        # Well past the default 10-minute proxy stale window.
        freezer.tick(timedelta(minutes=30))
        await _make_proxy_available(hass)

        assert get_data_source_state(hass, entry.entry_id).effective_mode == (
            DATA_SOURCE_LOCAL_ONLY
        )
        assert emitter.names == [CLOUD_TO_LOCAL], (
            f"a proxy appearing long after startup is a real recovery: {emitter.names}"
        )
    finally:
        await controller.async_stop()


async def test_cloud_only_entry_reports_nothing_and_stays_cloud(hass, emitter_free):
    """An explicitly cloud-only entry never waits for, or reports on, a proxy."""
    hass_, entry_, emitter_ = emitter_free
    coordinator = _Coordinator()

    init_data_source_state(hass_, entry_)
    controller = DataSourceController(hass_, entry_, coordinator, telemetry_store=None)
    await controller.async_start()
    await hass_.async_block_till_done()
    try:
        await _make_proxy_available(hass_)
        assert get_data_source_state(hass_, entry_.entry_id).effective_mode == (
            DATA_SOURCE_CLOUD_ONLY
        )
        assert emitter_.events == []
    finally:
        await controller.async_stop()


@pytest.fixture
def emitter_free(hass):
    """A cloud-only entry with its own recording emitter."""
    config_entry = MockConfigEntry(
        domain=DOMAIN,
        data={},
        options={"data_source_mode": DATA_SOURCE_CLOUD_ONLY, "box_id": BOX_ID},
    )
    config_entry.add_to_hass(hass)
    recording = _RecordingEmitter()
    hass.data.setdefault(DOMAIN, {}).setdefault(config_entry.entry_id, {})[
        "telemetry"
    ] = {"emitter": recording, "incident_dedupe": {}}
    hass.data["core.uuid"] = "cloud-only-uuid"
    return hass, config_entry, recording
