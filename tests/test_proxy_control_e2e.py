"""End-to-end: real HA core, real ServiceShield, simulated OIG Proxy.

The proxy simulator is the only hardware boundary. It registers the HA services
the proxy's MQTT entities would answer (select/number/switch), updates the
``_cfg`` entity at once and reports the box readback after a delay, like the
real box does on its next poll. Entity ids and unique_ids copy Martin's HA
(2026-11-05), including the ones without the ``oig_local_`` prefix.
"""

from __future__ import annotations

from datetime import timedelta
from types import SimpleNamespace
from typing import Any

import pytest
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.event import async_call_later
from homeassistant.util import dt as dt_util
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

from custom_components.oig_cloud import _setup_battery_export
from custom_components.oig_cloud.const import DOMAIN
from custom_components.oig_cloud.core.data_source import (
    DATA_SOURCE_CLOUD_ONLY,
    DATA_SOURCE_LOCAL_ONLY,
    PROXY_LAST_DATA_ENTITY_ID,
    DataSourceState,
)
from custom_components.oig_cloud.services import async_setup_entry_services_with_shield
from custom_components.oig_cloud.shield.core import ServiceShield

BOX = "2206237016"

# The shield's 2-minute backup check loop has no unsubscribe handle (unchanged code).
pytestmark = pytest.mark.parametrize("expected_lingering_timers", [True])

# key -> (cfg entity_id, readback entity_id, initial value)
PROXY = {
    "tbl_box_prms_mode": (
        "select.oig_local_2206237016_tbl_box_prms_mode_cfg",
        "sensor.oig_local_2206237016_tbl_box_prms_mode",
        "Home 1",
    ),
    "tbl_invertor_prm1_aac_max_chrg": (
        "number.2206237016_tbl_invertor_prm1_aac_max_chrg_cfg",
        "sensor.oig_local_2206237016_tbl_invertor_prm1_aac_max_chrg",
        "50.0",
    ),
    "tbl_invertor_prms_to_grid": (
        "switch.2206237016_tbl_invertor_prms_to_grid_cfg",
        "binary_sensor.oig_local_2206237016_tbl_invertor_prms_to_grid",
        "on",
    ),
    "tbl_invertor_prm1_p_max_feed_grid": (
        "number.oig_local_2206237016_tbl_invertor_prm1_p_max_feed_grid_cfg",
        "sensor.oig_local_2206237016_tbl_invertor_prm1_p_max_feed_grid",
        "5333",
    ),
    "tbl_invertor_prms_grid_pv_on": (
        "switch.2206237016_tbl_invertor_prms_grid_pv_on_cfg",
        "binary_sensor.oig_local_2206237016_tbl_invertor_prms_grid_pv_on",
        "off",
    ),
    "tbl_invertor_prms_grid_pv_off": (
        "switch.2206237016_tbl_invertor_prms_grid_pv_off_cfg",
        "binary_sensor.oig_local_2206237016_tbl_invertor_prms_grid_pv_off",
        "off",
    ),
}
CLOUD_MODE_SENSOR = "sensor.oig_2206237016_box_prms_mode"
READBACK_DELAY_S = 40  # box picks the setting up on its next poll


class ProxySim:
    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.writes: list[tuple[str, Any]] = []
        self.ignore: set[str] = set()
        self.fail: set[str] = set()
        by_cfg = {cfg: (key, ro) for key, (cfg, ro, _v) in PROXY.items()}
        self._by_cfg = by_cfg

        registry = er.async_get(hass)
        for key, (cfg, ro, value) in PROXY.items():
            for entity_id, suffix in ((cfg, "_cfg"), (ro, "")):
                domain, object_id = entity_id.split(".", 1)
                registry.async_get_or_create(
                    domain,
                    "mqtt",
                    f"oig_local_{BOX}_{key}{suffix}",
                    suggested_object_id=object_id,
                )
            attrs = {"min": 0, "max": 125} if key == "tbl_invertor_prm1_aac_max_chrg" else {}
            hass.states.async_set(cfg, value, attrs)
            hass.states.async_set(ro, value)
        hass.states.async_set("sensor.oig_local_2206237016_tbl_invertor_prm1_a_max_chrg", "125")
        hass.states.async_set("sensor.oig_local_2206237016_tbl_batt_bat_c", "60")
        hass.states.async_set("sensor.oig_local_2206237016_tbl_batt_prms_bat_min", "20")
        hass.states.async_set(CLOUD_MODE_SENSOR, "Home 1")

        hass.services.async_register("select", "select_option", self._on_select)
        hass.services.async_register("number", "set_value", self._on_number)
        hass.services.async_register("switch", "turn_on", self._on_switch_on)
        hass.services.async_register("switch", "turn_off", self._on_switch_off)

    def _apply(self, cfg_entity: str, value: str) -> None:
        if cfg_entity in self.fail:
            raise HomeAssistantError(f"{cfg_entity} unavailable")
        self.writes.append((cfg_entity, value))
        attrs = dict(self.hass.states.get(cfg_entity).attributes)
        self.hass.states.async_set(cfg_entity, value, attrs)
        key, ro = self._by_cfg[cfg_entity]
        if cfg_entity in self.ignore:
            return

        @callback
        def _readback(_now: Any) -> None:
            self.hass.states.async_set(ro, value)
            if key == "tbl_box_prms_mode":
                self.hass.states.async_set(CLOUD_MODE_SENSOR, value)

        async_call_later(self.hass, READBACK_DELAY_S, _readback)

    async def _on_select(self, call: ServiceCall) -> None:
        self._apply(call.data["entity_id"], call.data["option"])

    async def _on_number(self, call: ServiceCall) -> None:
        self._apply(call.data["entity_id"], f"{float(call.data['value']):.1f}")

    async def _on_switch_on(self, call: ServiceCall) -> None:
        self._apply(call.data["entity_id"], "on")

    async def _on_switch_off(self, call: ServiceCall) -> None:
        self._apply(call.data["entity_id"], "off")


class Cloud:
    def __init__(self) -> None:
        self.calls: list[tuple[str, Any]] = []

    async def set_box_mode(self, value: str) -> bool:
        self.calls.append(("set_box_mode", value))
        return True

    async def set_grid_delivery(self, value: int) -> bool:
        self.calls.append(("set_grid_delivery", value))
        return True

    async def set_grid_delivery_limit(self, value: int) -> bool:
        self.calls.append(("set_grid_delivery_limit", value))
        return True

    async def set_boiler_mode(self, value: str) -> bool:
        self.calls.append(("set_boiler_mode", value))
        return True


async def _noop() -> None:
    return None


def _source(local: bool) -> DataSourceState:
    return DataSourceState(
        configured_mode=DATA_SOURCE_LOCAL_ONLY,
        effective_mode=DATA_SOURCE_LOCAL_ONLY if local else DATA_SOURCE_CLOUD_ONLY,
        local_available=local,
        last_local_data=None,
        reason="test",
    )


async def _make_rig(hass: HomeAssistant, freezer) -> SimpleNamespace:
    entry = MockConfigEntry(
        domain=DOMAIN,
        entry_id="e2e",
        data={},
        options={"box_id": BOX, "control_via_proxy": True, "data_source_mode": "local_only"},
    )
    entry.add_to_hass(hass)
    proxy = ProxySim(hass)
    cloud = Cloud()
    shield = ServiceShield(hass, entry)
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = {
        "coordinator": SimpleNamespace(
            api=cloud, data={BOX: {}}, config_entry=entry, async_request_refresh=_noop
        ),
        "service_shield": shield,
        "data_source_state": _source(True),
    }
    hass.data[DOMAIN]["shield"] = shield
    await shield.start()
    await async_setup_entry_services_with_shield(hass, entry, shield)
    await _setup_battery_export(hass, entry)
    await hass.async_block_till_done()

    async def advance(seconds: float) -> None:
        moment = dt_util.utcnow() + timedelta(seconds=seconds)
        freezer.move_to(moment)
        async_fire_time_changed(hass, moment)
        await hass.async_block_till_done(wait_background_tasks=True)

    def set_local(local: bool) -> None:
        hass.data[DOMAIN][entry.entry_id]["data_source_state"] = _source(local)

    return SimpleNamespace(
        hass=hass, entry=entry, proxy=proxy, cloud=cloud, shield=shield,
        advance=advance, set_local=set_local,
    )


def _idle(shield: ServiceShield) -> bool:
    return not shield.pending and not shield.queue and shield.running is None


@pytest.mark.asyncio
async def test_home_ups_then_charge_current_in_order(hass, freezer):
    rig = await _make_rig(hass, freezer)
    await rig.hass.services.async_call(
        DOMAIN,
        "set_box_mode",
        {"mode": "home_ups", "charge_current": 121, "acknowledgement": True},
        blocking=True,
    )
    await rig.hass.async_block_till_done(wait_background_tasks=True)
    # Only the mode is written; the current waits for the box to confirm Home UPS.
    assert rig.proxy.writes == [("select.oig_local_2206237016_tbl_box_prms_mode_cfg", "Home UPS")]

    await rig.advance(READBACK_DELAY_S + 1)
    assert rig.proxy.writes[-1] == ("number.2206237016_tbl_invertor_prm1_aac_max_chrg_cfg", "121.0")

    await rig.advance(READBACK_DELAY_S + 1)
    assert _idle(rig.shield)
    assert rig.cloud.calls == []


@pytest.mark.asyncio
async def test_charge_current_over_box_limit_is_refused_before_queueing(hass, freezer):
    rig = await _make_rig(hass, freezer)
    with pytest.raises(Exception, match="nad limitem"):
        await rig.hass.services.async_call(
            DOMAIN,
            "set_box_mode",
            {"mode": "home_ups", "charge_current": 130, "acknowledgement": True},
            blocking=True,
        )
    assert rig.proxy.writes == []
    assert _idle(rig.shield)


@pytest.mark.asyncio
async def test_cloud_mode_sends_mode_to_cloud_and_refuses_current(hass, freezer):
    rig = await _make_rig(hass, freezer)
    rig.set_local(False)
    with pytest.raises(Exception, match="jen přes OIG Proxy"):
        await rig.hass.services.async_call(
            DOMAIN,
            "set_box_mode",
            {"mode": "home_ups", "charge_current": 100, "acknowledgement": True},
            blocking=True,
        )
    await rig.hass.services.async_call(
        DOMAIN, "set_box_mode", {"mode": "home_2", "acknowledgement": True}, blocking=True
    )
    await rig.hass.async_block_till_done(wait_background_tasks=True)
    assert rig.cloud.calls == [("set_box_mode", "1")]
    assert rig.proxy.writes == []


@pytest.mark.asyncio
async def test_unconfirmed_local_mode_is_retried_through_cloud_once(hass, freezer):
    rig = await _make_rig(hass, freezer)
    rig.proxy.ignore.add("select.oig_local_2206237016_tbl_box_prms_mode_cfg")
    await rig.hass.services.async_call(
        DOMAIN, "set_box_mode", {"mode": "home_2", "acknowledgement": True}, blocking=True
    )
    await rig.hass.async_block_till_done(wait_background_tasks=True)
    assert len(rig.proxy.writes) == 1
    assert rig.cloud.calls == []

    await rig.advance(16 * 60)  # past the shield timeout (15 min)
    await rig.advance(1)
    assert rig.cloud.calls == [("set_box_mode", "1")]
    assert len(rig.proxy.writes) == 1  # not written to the proxy again

    rig.hass.states.async_set(CLOUD_MODE_SENSOR, "Home 2")  # cloud applied it
    await rig.advance(1)
    assert _idle(rig.shield)


@pytest.mark.asyncio
async def test_battery_export_runs_in_order_and_stops_at_end_time(hass, freezer):
    rig = await _make_rig(hass, freezer)
    await rig.hass.services.async_call(
        DOMAIN,
        "battery_export",
        {"limit": 2000, "duration_minutes": 30, "acknowledgement": True, "warning": True},
        blocking=True,
    )
    await rig.hass.async_block_till_done(wait_background_tasks=True)
    for _ in range(3):
        await rig.advance(READBACK_DELAY_S + 1)
    assert rig.proxy.writes == [
        ("number.oig_local_2206237016_tbl_invertor_prm1_p_max_feed_grid_cfg", "2000.0"),
        ("switch.2206237016_tbl_invertor_prms_grid_pv_off_cfg", "on"),
        ("switch.2206237016_tbl_invertor_prms_grid_pv_on_cfg", "on"),
    ]
    assert _idle(rig.shield)
    manager = rig.hass.data[DOMAIN]["e2e"]["battery_export"]
    assert manager.active

    await rig.advance(30 * 60)
    for _ in range(3):
        await rig.advance(READBACK_DELAY_S + 1)
    assert rig.proxy.writes[3:] == [
        ("switch.2206237016_tbl_invertor_prms_grid_pv_on_cfg", "off"),
        ("switch.2206237016_tbl_invertor_prms_grid_pv_off_cfg", "off"),
        ("number.oig_local_2206237016_tbl_invertor_prm1_p_max_feed_grid_cfg", "5333.0"),
    ]
    assert not manager.active
    assert _idle(rig.shield)
    assert rig.cloud.calls == []


@pytest.mark.asyncio
async def test_battery_export_stops_when_soc_reaches_minimum(hass, freezer):
    rig = await _make_rig(hass, freezer)
    await rig.hass.services.async_call(
        DOMAIN,
        "battery_export",
        {"limit": 1500, "duration_minutes": 120, "acknowledgement": True, "warning": True},
        blocking=True,
    )
    for _ in range(3):
        await rig.advance(READBACK_DELAY_S + 1)
    rig.hass.states.async_set("sensor.oig_local_2206237016_tbl_batt_bat_c", "20")
    await rig.hass.async_block_till_done(wait_background_tasks=True)
    for _ in range(3):
        await rig.advance(READBACK_DELAY_S + 1)
    assert [w[1] for w in rig.proxy.writes[3:]] == ["off", "off", "5333.0"]
    assert not rig.hass.data[DOMAIN]["e2e"]["battery_export"].active


@pytest.mark.asyncio
async def test_battery_export_refused_over_current_export_limit(hass, freezer):
    rig = await _make_rig(hass, freezer)
    with pytest.raises(Exception, match="nad povoleným limitem"):
        await rig.hass.services.async_call(
            DOMAIN,
            "battery_export",
            {"limit": 6000, "duration_minutes": 10, "acknowledgement": True, "warning": True},
            blocking=True,
        )
    assert rig.proxy.writes == []
    assert not rig.hass.data[DOMAIN]["e2e"]["battery_export"].active


async def _start_export(rig) -> Any:
    await rig.hass.services.async_call(
        DOMAIN,
        "battery_export",
        {"limit": 2000, "duration_minutes": 60, "acknowledgement": True, "warning": True},
        blocking=True,
    )
    for _ in range(3):
        await rig.advance(READBACK_DELAY_S + 1)
    assert [w[1] for w in rig.proxy.writes] == ["2000.0", "on", "on"]
    return rig.hass.data[DOMAIN]["e2e"]["battery_export"]


async def _proxy_heartbeat(rig, tick: int) -> None:
    rig.hass.states.async_set(PROXY_LAST_DATA_ENTITY_ID, f"2026-11-05T20:00:{tick:02d}+00:00")
    await rig.hass.async_block_till_done(wait_background_tasks=True)


@pytest.mark.asyncio
async def test_export_active_at_restart_is_stopped_once_the_proxy_is_back(hass, freezer):
    rig = await _make_rig(hass, freezer)
    old_manager = await _start_export(rig)

    # HA restarts: the old manager goes away; at setup the proxy is not back yet.
    old_manager.unload()
    rig.set_local(False)
    await _setup_battery_export(rig.hass, rig.entry)
    await rig.hass.async_block_till_done(wait_background_tasks=True)
    manager = rig.hass.data[DOMAIN]["e2e"]["battery_export"]
    assert manager is not old_manager
    assert manager.active
    assert manager.stop_in_progress
    assert len(rig.proxy.writes) == 3  # nothing could be written yet

    # A proxy push while still reading from cloud does not try.
    await _proxy_heartbeat(rig, 1)
    assert len(rig.proxy.writes) == 3

    # Proxy entities are back and the data source is local: the next push stops it.
    rig.set_local(True)
    await _proxy_heartbeat(rig, 2)
    for _ in range(3):
        await rig.advance(READBACK_DELAY_S + 1)
    assert [w[1] for w in rig.proxy.writes[3:]] == ["off", "off", "5333.0"]
    assert not manager.active
    assert _idle(rig.shield)
    manager.unload()


@pytest.mark.asyncio
async def test_failed_flag_off_keeps_window_and_stop_is_retried(hass, freezer):
    rig = await _make_rig(hass, freezer)
    manager = await _start_export(rig)
    pv_on = "switch.2206237016_tbl_invertor_prms_grid_pv_on_cfg"
    rig.proxy.fail.add(pv_on)

    await manager.async_request_stop("test")
    for _ in range(3):
        await rig.advance(READBACK_DELAY_S + 1)
    assert manager.active, "window must survive while grid_pv_on is still on"
    assert manager.stop_in_progress
    assert rig.hass.states.get(pv_on).state == "on"

    rig.proxy.fail.discard(pv_on)
    await _proxy_heartbeat(rig, 3)
    for _ in range(3):
        await rig.advance(READBACK_DELAY_S + 1)
    assert rig.hass.states.get(pv_on).state == "off"
    assert rig.hass.states.get("switch.2206237016_tbl_invertor_prms_grid_pv_off_cfg").state == "off"
    assert not manager.active
    assert _idle(rig.shield)
    manager.unload()


@pytest.mark.asyncio
async def test_new_export_is_refused_while_a_stop_is_in_progress(hass, freezer):
    rig = await _make_rig(hass, freezer)
    manager = await _start_export(rig)
    await manager.async_request_stop("test")
    with pytest.raises(Exception, match="ukončuje"):
        await rig.hass.services.async_call(
            DOMAIN,
            "battery_export",
            {"limit": 1000, "duration_minutes": 10, "acknowledgement": True, "warning": True},
            blocking=True,
        )
    for _ in range(3):
        await rig.advance(READBACK_DELAY_S + 1)
    assert not manager.active
    manager.unload()
