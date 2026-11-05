"""Box control through the OIG Proxy (control/proxy_control.py and its wiring)."""

from __future__ import annotations

from types import SimpleNamespace
from typing import Any

import pytest

from custom_components.oig_cloud import services as svc
from custom_components.oig_cloud.control import battery_export as be
from custom_components.oig_cloud.control import proxy_control as pc
from custom_components.oig_cloud.core.data_source import (
    DATA_SOURCE_CLOUD_ONLY,
    DATA_SOURCE_LOCAL_ONLY,
    DataSourceState,
)
from custom_components.oig_cloud.shield import dispatch, queue, validation

BOX = "2206237016"


class _States:
    def __init__(self, states: dict[str, Any]) -> None:
        self._states = states

    def get(self, entity_id: str) -> Any:
        return self._states.get(entity_id)

    def set(self, entity_id: str, state: str, **attributes: Any) -> None:
        self._states[entity_id] = SimpleNamespace(
            entity_id=entity_id, state=state, attributes=attributes
        )


class _Services:
    def __init__(self, hass: "_Hass") -> None:
        self.calls: list[tuple[str, str, dict[str, Any]]] = []
        self._hass = hass

    async def async_call(self, domain: str, service: str, data: dict, blocking: bool = False):
        self.calls.append((domain, service, dict(data)))


class _Hass:
    def __init__(self) -> None:
        self.states = _States({})
        self.services = _Services(self)
        self.data: dict[str, Any] = {"oig_cloud": {"entry1": {}}}
        self.created: list[Any] = []

    def async_create_task(self, coro: Any) -> None:
        self.created.append(coro)
        coro.close()


def _proxy_box(hass: _Hass) -> None:
    """Entities as they exist on Martin's HA (mixed entity_id prefixes)."""
    s = hass.states
    s.set("select.oig_local_2206237016_tbl_box_prms_mode_cfg", "Home 1")
    s.set("sensor.oig_local_2206237016_tbl_box_prms_mode", "Home 1")
    s.set("number.2206237016_tbl_invertor_prm1_aac_max_chrg_cfg", "50.0", min=0, max=125)
    s.set("sensor.oig_local_2206237016_tbl_invertor_prm1_aac_max_chrg", "50.0")
    s.set("sensor.oig_local_2206237016_tbl_invertor_prm1_a_max_chrg", "125")
    s.set("switch.2206237016_tbl_invertor_prms_to_grid_cfg", "on")
    s.set("binary_sensor.oig_local_2206237016_tbl_invertor_prms_to_grid", "on")
    s.set("number.oig_local_2206237016_tbl_invertor_prm1_p_max_feed_grid_cfg", "5333")
    s.set("sensor.oig_local_2206237016_tbl_invertor_prm1_p_max_feed_grid", "5333")
    s.set("switch.2206237016_tbl_invertor_prms_grid_pv_on_cfg", "off")
    s.set("switch.2206237016_tbl_invertor_prms_grid_pv_off_cfg", "off")
    s.set("binary_sensor.oig_local_2206237016_tbl_invertor_prms_grid_pv_on", "off")
    s.set("binary_sensor.oig_local_2206237016_tbl_invertor_prms_grid_pv_off", "off")
    s.set("switch.oig_local_2206237016_tbl_boiler_prms_manual_cfg", "off")
    s.set("sensor.oig_local_2206237016_tbl_batt_bat_c", "48")
    s.set("sensor.oig_local_2206237016_tbl_batt_prms_bat_min", "20")


def _entry(**options: Any) -> Any:
    opts = {"box_id": BOX, "control_via_proxy": True, "data_source_mode": "local_only"}
    opts.update(options)
    return SimpleNamespace(entry_id="entry1", options=opts)


@pytest.fixture
def hass(monkeypatch) -> _Hass:
    h = _Hass()
    _proxy_box(h)
    monkeypatch.setattr(pc, "_entity_registry", lambda _h: None)
    set_source(monkeypatch, local=True)
    return h


def set_source(monkeypatch, *, local: bool) -> None:
    state = DataSourceState(
        configured_mode=DATA_SOURCE_LOCAL_ONLY,
        effective_mode=DATA_SOURCE_LOCAL_ONLY if local else DATA_SOURCE_CLOUD_ONLY,
        local_available=local,
        last_local_data=None,
        reason="test",
    )
    monkeypatch.setattr(pc, "get_data_source_state", lambda _h, _e: state)


# --- route and entity lookup -------------------------------------------------


def test_route_follows_data_source_and_option(hass, monkeypatch):
    entry = _entry()
    assert pc.use_local_route(hass, entry, BOX, {}) is True
    assert pc.use_local_route(hass, entry, BOX, {pc.FORCE_CLOUD_KEY: True}) is False
    assert pc.use_local_route(hass, entry, "999", {}) is False
    assert pc.use_local_route(hass, _entry(control_via_proxy=False), BOX, {}) is False
    set_source(monkeypatch, local=False)
    assert pc.use_local_route(hass, entry, BOX, {}) is False


def test_entities_found_by_unique_id_in_registry(hass, monkeypatch):
    registry = SimpleNamespace(
        async_get_entity_id=lambda domain, platform, uid: (
            "number.renamed_charge"
            if (domain, platform, uid)
            == ("number", "mqtt", f"oig_local_{BOX}_tbl_invertor_prm1_aac_max_chrg_cfg")
            else None
        )
    )
    monkeypatch.setattr(pc, "_entity_registry", lambda _h: registry)
    assert (
        pc.find_proxy_entity(hass, BOX, pc.KEY_CHARGE_CURRENT, control=True)
        == "number.renamed_charge"
    )


def test_entities_found_with_and_without_oig_local_prefix(hass):
    assert (
        pc.find_proxy_entity(hass, BOX, pc.KEY_GRID_PV_ON, control=True)
        == "switch.2206237016_tbl_invertor_prms_grid_pv_on_cfg"
    )
    assert (
        pc.find_proxy_entity(hass, BOX, pc.KEY_GRID_PV_ON, control=False)
        == "binary_sensor.oig_local_2206237016_tbl_invertor_prms_grid_pv_on"
    )


@pytest.mark.asyncio
async def test_write_uses_the_entity_domain_service(hass):
    await pc.async_write(hass, BOX, pc.KEY_BOX_MODE, "Home UPS")
    await pc.async_write(hass, BOX, pc.KEY_CHARGE_CURRENT, 121)
    await pc.async_write(hass, BOX, pc.KEY_GRID_PV_OFF, True)
    await pc.async_write(hass, BOX, pc.KEY_GRID_PV_OFF, False)
    assert hass.services.calls == [
        ("select", "select_option", {"entity_id": "select.oig_local_2206237016_tbl_box_prms_mode_cfg", "option": "Home UPS"}),
        ("number", "set_value", {"entity_id": "number.2206237016_tbl_invertor_prm1_aac_max_chrg_cfg", "value": 121}),
        ("switch", "turn_on", {"entity_id": "switch.2206237016_tbl_invertor_prms_grid_pv_off_cfg"}),
        ("switch", "turn_off", {"entity_id": "switch.2206237016_tbl_invertor_prms_grid_pv_off_cfg"}),
    ]


@pytest.mark.asyncio
async def test_write_refuses_unavailable_entity(hass):
    hass.states.set("select.oig_local_2206237016_tbl_box_prms_mode_cfg", "unavailable")
    with pytest.raises(pc.ProxyControlError):
        await pc.async_write(hass, BOX, pc.KEY_BOX_MODE, "Home 1")


def test_charge_current_limit_is_the_lowest_of_box_entity_and_user_cap(hass):
    assert pc.validate_charge_current(hass, _entry(), BOX, 121) == 121
    with pytest.raises(pc.ProxyControlError):
        pc.validate_charge_current(hass, _entry(), BOX, 126)
    with pytest.raises(pc.ProxyControlError):
        pc.validate_charge_current(hass, _entry(proxy_max_charge_current_a=80), BOX, 100)
    hass.states.set("sensor.oig_local_2206237016_tbl_invertor_prm1_a_max_chrg", "90")
    with pytest.raises(pc.ProxyControlError):
        pc.validate_charge_current(hass, _entry(), BOX, 100)


def test_charge_current_needs_a_known_box_limit(hass):
    hass.states.set("sensor.oig_local_2206237016_tbl_invertor_prm1_a_max_chrg", "unknown")
    hass.states.set("number.2206237016_tbl_invertor_prm1_aac_max_chrg_cfg", "50.0")
    with pytest.raises(pc.ProxyControlError):
        pc.validate_charge_current(hass, _entry(), BOX, 60)


# --- service actions -----------------------------------------------------------


@pytest.fixture
def actions(hass, monkeypatch):
    cloud = SimpleNamespace(calls=[])

    async def _record(name, *args):
        cloud.calls.append((name, args))
        return True

    client = SimpleNamespace(
        set_box_mode=lambda v: _record("set_box_mode", v),
        set_grid_delivery=lambda v: _record("set_grid_delivery", v),
        set_grid_delivery_limit=lambda v: _record("set_grid_delivery_limit", v),
        set_boiler_mode=lambda v: _record("set_boiler_mode", v),
    )
    monkeypatch.setattr(svc, "_get_entry_client", lambda _h, _e: client)
    monkeypatch.setattr(svc, "_resolve_box_id_from_service", lambda *_a: BOX)
    monkeypatch.setattr(svc, "_resolve_boiler_box_id_from_service", lambda *_a: BOX)
    return cloud


@pytest.mark.asyncio
async def test_box_mode_goes_to_proxy_when_local(hass, actions):
    data = {"mode": "home_ups"}
    await svc._action_set_box_mode(hass, _entry(), data, "")
    assert hass.services.calls[0][2]["option"] == "Home UPS"
    assert actions.calls == []
    assert data[pc.ROUTE_KEY] == pc.ROUTE_LOCAL


@pytest.mark.asyncio
async def test_box_mode_goes_to_cloud_when_forced_or_reading_from_cloud(hass, actions, monkeypatch):
    data = {"mode": "home_2", pc.FORCE_CLOUD_KEY: True}
    await svc._action_set_box_mode(hass, _entry(), data, "")
    assert actions.calls == [("set_box_mode", ("1",))]
    assert data[pc.ROUTE_KEY] == pc.ROUTE_CLOUD
    set_source(monkeypatch, local=False)
    await svc._action_set_box_mode(hass, _entry(), {"mode": "home_1"}, "")
    assert actions.calls[-1] == ("set_box_mode", ("0",))
    assert hass.services.calls == []


@pytest.mark.asyncio
async def test_charge_step_needs_home_ups_then_writes_current(hass, actions):
    with pytest.raises(pc.ProxyControlError):
        await svc._action_set_box_mode(hass, _entry(), {"charge_current": 121}, "")
    hass.states.set("sensor.oig_local_2206237016_tbl_box_prms_mode", "Home UPS")
    await svc._action_set_box_mode(
        hass, _entry(), {"charge_current": 121, "_box_mode_step": "charge"}, ""
    )
    assert hass.services.calls[-1] == (
        "number",
        "set_value",
        {"entity_id": "number.2206237016_tbl_invertor_prm1_aac_max_chrg_cfg", "value": 121},
    )


@pytest.mark.asyncio
async def test_mode_and_current_in_one_unshielded_call_is_refused(hass, actions):
    with pytest.raises(pc.ProxyControlError):
        await svc._action_set_box_mode(
            hass, _entry(), {"mode": "home_ups", "charge_current": 100}, ""
        )
    assert hass.services.calls == []


@pytest.mark.asyncio
async def test_grid_delivery_and_boiler_go_to_proxy(hass, actions):
    await svc._action_set_grid_delivery(hass, _entry(), {"limit": 4000}, "", True)
    await svc._action_set_grid_delivery(hass, _entry(), {"mode": "off"}, "", True)
    await svc._action_set_boiler_mode(hass, _entry(), {"mode": "manual"}, "")
    assert [c[1:] for c in hass.services.calls] == [
        ("set_value", {"entity_id": "number.oig_local_2206237016_tbl_invertor_prm1_p_max_feed_grid_cfg", "value": 4000}),
        ("turn_off", {"entity_id": "switch.2206237016_tbl_invertor_prms_to_grid_cfg"}),
        ("turn_on", {"entity_id": "switch.oig_local_2206237016_tbl_boiler_prms_manual_cfg"}),
    ]
    assert actions.calls == []


def test_charge_current_requires_home_ups_in_schema():
    svc.SET_BOX_MODE_SCHEMA({"mode": "home_ups", "charge_current": 100, "acknowledgement": True})
    svc.SET_BOX_MODE_SCHEMA({"charge_current": 100, "acknowledgement": True})
    with pytest.raises(Exception):
        svc.SET_BOX_MODE_SCHEMA({"mode": "home_1", "charge_current": 100, "acknowledgement": True})


def test_export_needs_exactly_one_end():
    base = {"limit": 2000, "acknowledgement": True, "warning": True}
    svc.BATTERY_EXPORT_SCHEMA({**base, "duration_minutes": 30})
    with pytest.raises(Exception):
        svc.BATTERY_EXPORT_SCHEMA(base)
    with pytest.raises(Exception):
        svc.BATTERY_EXPORT_SCHEMA({**base, "duration_minutes": 30, "until": "2026-11-06 18:00"})


# --- battery export -------------------------------------------------------------


class _Manager:
    def __init__(self) -> None:
        self.armed: list[Any] = []
        self.cleared = 0
        self.lease: Any = None
        self.at_min = False

    def restore_limit(self, current):
        return self.lease["restore_limit"] if self.lease else current

    def soc_at_minimum(self) -> bool:
        return self.at_min

    async def async_arm(self, until, restore):
        self.armed.append((until, restore))
        self.lease = {"restore_limit": restore}

    async def async_clear(self):
        self.cleared += 1
        self.lease = None


@pytest.fixture
def manager(hass, actions) -> _Manager:
    m = _Manager()
    hass.data["oig_cloud"]["entry1"]["battery_export"] = m
    return m


@pytest.mark.asyncio
async def test_export_precheck_arms_window_and_keeps_restore_limit(hass, manager):
    data = {"limit": 2000, "duration_minutes": 30}
    await svc._precheck_battery_export(hass, _entry(), data)
    assert data["_restore_limit"] == 5333
    assert "duration_minutes" not in data and "_until" in data
    assert manager.armed[0][1] == 5333


@pytest.mark.asyncio
async def test_export_precheck_refusals(hass, manager, monkeypatch):
    with pytest.raises(pc.ProxyControlError):
        await svc._precheck_battery_export(hass, _entry(), {"limit": 6000, "duration_minutes": 5})
    await svc._precheck_battery_export(
        hass, _entry(proxy_export_limit_w=8000), {"limit": 6000, "duration_minutes": 5}
    )
    manager.at_min = True
    with pytest.raises(pc.ProxyControlError):
        await svc._precheck_battery_export(hass, _entry(), {"limit": 1000, "duration_minutes": 5})
    manager.at_min = False
    hass.states.set("binary_sensor.oig_local_2206237016_tbl_invertor_prms_to_grid", "off")
    with pytest.raises(pc.ProxyControlError):
        await svc._precheck_battery_export(hass, _entry(), {"limit": 1000, "duration_minutes": 5})
    hass.states.set("binary_sensor.oig_local_2206237016_tbl_invertor_prms_to_grid", "on")
    set_source(monkeypatch, local=False)
    with pytest.raises(pc.ProxyControlError):
        await svc._precheck_battery_export(hass, _entry(), {"limit": 1000, "duration_minutes": 5})


@pytest.mark.asyncio
async def test_export_and_stop_write_in_order_and_clear_window(hass, manager):
    await svc._action_battery_export(hass, _entry(), {"limit": 2000})
    await svc._action_stop_battery_export(hass, _entry(), {"_restore_limit": 5333})
    assert [(c[1], c[2]["entity_id"].split(".")[1], c[2].get("value")) for c in hass.services.calls] == [
        ("set_value", "oig_local_2206237016_tbl_invertor_prm1_p_max_feed_grid_cfg", 2000),
        ("turn_on", "2206237016_tbl_invertor_prms_grid_pv_off_cfg", None),
        ("turn_on", "2206237016_tbl_invertor_prms_grid_pv_on_cfg", None),
        ("turn_off", "2206237016_tbl_invertor_prms_grid_pv_on_cfg", None),
        ("turn_off", "2206237016_tbl_invertor_prms_grid_pv_off_cfg", None),
        ("set_value", "oig_local_2206237016_tbl_invertor_prm1_p_max_feed_grid_cfg", 5333),
    ]
    assert manager.cleared == 1


@pytest.mark.asyncio
async def test_manager_stops_export_left_active_by_a_restart(hass, monkeypatch):
    stored = {"until": "2026-11-05T17:00:00+00:00", "restore_limit": 5333}

    class _Store:
        def __init__(self, *_a, **_k):
            pass

        async def async_load(self):
            return stored

        async def async_save(self, _data):
            return None

    monkeypatch.setattr(be, "Store", _Store)
    hass.bus = SimpleNamespace(async_listen=lambda *_a: (lambda: None))
    manager = be.BatteryExportManager(hass, _entry(), BOX)
    await manager.async_setup()
    assert manager.active
    assert manager.restore_limit(2000) == 5333
    assert len(hass.created) == 1  # stop requested


def test_manager_soc_floor(hass):
    manager = be.BatteryExportManager.__new__(be.BatteryExportManager)
    manager.hass, manager.box_id = hass, BOX
    assert manager.soc_at_minimum() is False
    hass.states.set("sensor.oig_local_2206237016_tbl_batt_bat_c", "20")
    assert manager.soc_at_minimum() is True


# --- shield ---------------------------------------------------------------------


def test_box_mode_with_current_splits_mode_then_charge():
    steps = dispatch._split_box_mode_params(
        {"mode": "home_ups", "charge_current": 121, "acknowledgement": True}
    )
    assert [s["_box_mode_step"] for s in steps] == ["mode", "charge"]
    assert "charge_current" not in steps[0] and "mode" not in steps[1]


def test_export_services_split_into_ordered_steps():
    start = dispatch._split_export_params("oig_cloud.battery_export", {"limit": 2000})
    stop = dispatch._split_export_params("oig_cloud.stop_battery_export", {})
    assert [s["_export_step"] for s in start] == ["limit", "pv_off_on", "pv_on_on"]
    assert [s["_export_step"] for s in stop] == ["pv_on_off", "pv_off_off", "finish"]
    assert dispatch._split_export_params("oig_cloud.battery_export", start[0]) is None


def test_charge_and_finish_steps_are_never_skipped():
    assert dispatch._always_proceed({"_box_mode_step": "charge"})
    assert dispatch._always_proceed({"charge_current": 50})
    assert dispatch._always_proceed({"_export_step": "finish"})
    assert not dispatch._always_proceed({"_export_step": "pv_on_on"})
    assert not dispatch._always_proceed({"mode": "home_1"})


def _shield(hass) -> Any:
    shield = SimpleNamespace(hass=hass, last_checked_entity_id=None, _expected_entity_missing=False)
    return shield


def test_expected_readbacks_for_charge_and_export(hass, monkeypatch):
    monkeypatch.setattr(validation, "_resolve_box_id_for_shield", lambda _s: BOX)
    shield = _shield(hass)
    assert validation._expected_box_mode(shield, {"charge_current": 121, "_box_mode_step": "charge"}, None) == {
        "sensor.oig_local_2206237016_tbl_invertor_prm1_aac_max_chrg": "121"
    }
    assert validation._expected_battery_export(shield, {"limit": 2000, "_export_step": "limit"}) == {
        "sensor.oig_local_2206237016_tbl_invertor_prm1_p_max_feed_grid": "2000"
    }
    assert validation._expected_battery_export(shield, {"_export_step": "pv_on_off"}) == {
        "binary_sensor.oig_local_2206237016_tbl_invertor_prms_grid_pv_on": "off"
    }
    assert validation._expected_battery_export(shield, {"_export_step": "finish"}) == {}


def test_proxy_numbers_compare_numerically():
    shield = SimpleNamespace(_normalize_value=validation.normalize_value)
    expected, current = queue._normalize_entity_values(
        shield, "sensor.oig_local_x_tbl_invertor_prm1_aac_max_chrg", "121", "121.0"
    )
    assert expected == current


def test_only_local_writes_with_a_cloud_twin_are_retried():
    call = (None, "oig_cloud", "set_box_mode", False, None)
    local = {"params": {"mode": "home_1", pc.ROUTE_KEY: pc.ROUTE_LOCAL}, "call": call}
    assert queue._cloud_retry_allowed("oig_cloud.set_box_mode", local)
    assert not queue._cloud_retry_allowed(
        "oig_cloud.set_box_mode", {**local, "params": {"mode": "home_1", pc.ROUTE_KEY: pc.ROUTE_CLOUD}}
    )
    assert not queue._cloud_retry_allowed(
        "oig_cloud.set_box_mode",
        {**local, "params": {"charge_current": 100, "_box_mode_step": "charge", pc.ROUTE_KEY: pc.ROUTE_LOCAL}},
    )
    assert not queue._cloud_retry_allowed("oig_cloud.battery_export", local)
    assert not queue._cloud_retry_allowed(
        "oig_cloud.set_box_mode",
        {**local, "params": {"mode": "home_1", pc.ROUTE_KEY: pc.ROUTE_LOCAL, pc.FORCE_CLOUD_KEY: True}},
    )


@pytest.mark.asyncio
async def test_timed_out_local_write_is_requeued_through_cloud():
    intercepted: list[Any] = []

    async def _intercept(domain, service, data, original_call, blocking, context):
        intercepted.append((domain, service, data))

    async def _log_event(*_a, **_k):
        return None

    call = ("orig", "oig_cloud", "set_box_mode", False, None)
    shield = SimpleNamespace(
        cloud_retries=[
            ("oig_cloud.set_box_mode", {"params": {"mode": "home_1", pc.ROUTE_KEY: "local"}, "call": call, "entities": {}})
        ],
        intercept_service_call=_intercept,
        _log_event=_log_event,
    )
    await queue._dispatch_cloud_retries(shield)
    assert intercepted == [
        ("oig_cloud", "set_box_mode", {"params": {"mode": "home_1", pc.FORCE_CLOUD_KEY: True}})
    ]
    assert shield.cloud_retries == []
