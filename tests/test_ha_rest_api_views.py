from __future__ import annotations

import json
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.api import ha_rest_api as api_module
from custom_components.oig_cloud.const import CONF_AUTO_MODE_SWITCH, DOMAIN

_ADMIN_USER = SimpleNamespace(is_admin=True)


class DummyRequest:
    def __init__(self, hass, query=None):
        self.app = {"hass": hass, "hass_user": SimpleNamespace(is_admin=True)}
        self.query = query or {}


class DummyStore:
    data = None

    def __init__(self, hass, version, key):
        self.hass = hass
        self.version = version
        self.key = key

    async def async_load(self):
        return DummyStore.data


class DummyComponent:
    def __init__(self, entities):
        self.entities = entities


class DummyEntity:
    def __init__(self, entity_id, spot_data=None, last_update=None):
        self.entity_id = entity_id
        self._spot_data_15min = spot_data or {}
        self._last_update = last_update


class DummyEntry:
    def __init__(self, entry_id, options=None, data=None, domain=DOMAIN):
        self.entry_id = entry_id
        self.options = options or {}
        self.data = data or {}
        self.domain = domain


class DummyHass:
    def __init__(self, config_entries=None):
        self.data = {}
        self.config_entries = config_entries or DummyConfigEntries()


class DummyConfigEntries:
    def __init__(self, entries=None):
        self._entries = entries or []
        self.updated = []

    def async_entries(self, _domain):
        return self._entries

    def async_update_entry(self, entry, options=None):
        entry.options = options or {}
        self.updated.append(entry)

    def async_get_entry(self, entry_id):
        for entry in self._entries:
            if entry.entry_id == entry_id:
                return entry
        return None


class DummyJsonRequest(DummyRequest):
    def __init__(self, hass, payload=None, raise_json=False):
        super().__init__(hass)
        self._payload = payload
        self._raise_json = raise_json

    async def json(self):
        if self._raise_json:
            raise ValueError("invalid json")
        return self._payload


@pytest.mark.asyncio
async def test_battery_timeline_view_precomputed(monkeypatch):
    hass = DummyHass()
    DummyStore.data = {
        "last_update": "2025-01-01T00:00:00+00:00",
        "timeline": [{"time": "t1"}, {"time": "t2"}],
    }

    monkeypatch.setattr("homeassistant.helpers.storage.Store", DummyStore)

    view = api_module.OIGCloudBatteryTimelineView()
    request = DummyRequest(hass, {"type": "both"})

    response = await view.get(request, "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["active"] == DummyStore.data["timeline"]
    assert payload["metadata"]["points_count"] == 2


@pytest.mark.asyncio
async def test_battery_timeline_view_missing_sensor_component(monkeypatch):
    hass = DummyHass()
    DummyStore.data = None
    monkeypatch.setattr("homeassistant.helpers.storage.Store", DummyStore)

    view = api_module.OIGCloudBatteryTimelineView()
    request = DummyRequest(hass, {"type": "both"})

    response = await view.get(request, "123")
    payload = json.loads(response.text)

    assert response.status == 503
    assert "no precomputed data" in payload["error"]


@pytest.mark.asyncio
async def test_battery_timeline_view_entity_precomputed(monkeypatch):
    hass = DummyHass()
    DummyStore.data = {"timeline": [{"t": 1}], "last_update": "2025-01-01"}

    class EmptyStore:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return None

    class EntityStore:
        async def async_load(self):
            return DummyStore.data

    monkeypatch.setattr("homeassistant.helpers.storage.Store", EmptyStore)

    entity = DummyEntity("sensor.oig_123_battery_forecast")
    entity._precomputed_store = EntityStore()
    hass.data["sensor"] = DummyComponent([entity])

    view = api_module.OIGCloudBatteryTimelineView()
    request = DummyRequest(hass, {"type": "baseline"})

    response = await view.get(request, "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert "active" not in payload
    assert payload["baseline"] == []


@pytest.mark.asyncio
async def test_spot_prices_view_invalid_type():
    hass = DummyHass()
    view = api_module.OIGCloudSpotPricesView()
    request = DummyRequest(hass, {"type": "invalid"})

    response = await view.get(request, "123")

    assert response.status == 400


@pytest.mark.asyncio
async def test_spot_prices_view_valid(monkeypatch):
    hass = DummyHass()
    entity = DummyEntity(
        "sensor.oig_123_export_price_current_15min",
        spot_data={"prices15m_czk_kwh": {"2025-01-01T00:00:00": 1.2}},
        last_update=datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
    )
    hass.data["sensor"] = DummyComponent([entity])

    view = api_module.OIGCloudSpotPricesView()
    request = DummyRequest(hass, {"type": "export"})

    response = await view.get(request, "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["intervals"][0]["price"] == 1.2
    assert payload["metadata"]["intervals_count"] == 1


@pytest.mark.asyncio
async def test_spot_prices_view_missing_component():
    hass = DummyHass()
    view = api_module.OIGCloudSpotPricesView()
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 500


@pytest.mark.asyncio
async def test_spot_prices_view_missing_entity():
    hass = DummyHass()
    hass.data["sensor"] = DummyComponent([])
    view = api_module.OIGCloudSpotPricesView()
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 404


@pytest.mark.asyncio
async def test_unified_cost_tile_view_precomputed(monkeypatch):
    hass = DummyHass()
    DummyStore.data = {
        "unified_cost_tile": {"today": {"plan_total_cost": 10}},
        "cost_comparison": {"delta": 1.5},
    }
    monkeypatch.setattr("homeassistant.helpers.storage.Store", DummyStore)

    view = api_module.OIGCloudUnifiedCostTileView()
    request = DummyRequest(hass)

    response = await view.get(request, "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["today"]["plan_total_cost"] == 10
    assert payload["comparison"]["delta"] == 1.5


@pytest.mark.asyncio
async def test_detail_tabs_view_precomputed(monkeypatch):
    hass = DummyHass()
    DummyStore.data = {
        "detail_tabs": {
            "today": {"mode_blocks": []},
            "yesterday": {"mode_blocks": []},
            "tomorrow": {"mode_blocks": []},
        }
    }
    monkeypatch.setattr("homeassistant.helpers.storage.Store", DummyStore)

    view = api_module.OIGCloudDetailTabsView()
    request = DummyRequest(hass, {"tab": "today"})

    response = await view.get(request, "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert "today" in payload
    assert "yesterday" not in payload


@pytest.mark.asyncio
async def test_consumption_profiles_view_missing_component():
    hass = DummyHass()
    view = api_module.OIGCloudConsumptionProfilesView()
    request = DummyRequest(hass)

    response = await view.get(request, "123")
    payload = json.loads(response.text)

    assert response.status == 500
    assert "error" in payload


@pytest.mark.asyncio
async def test_consumption_profiles_view_missing_entity():
    hass = DummyHass()
    hass.data["sensor"] = DummyComponent([])
    view = api_module.OIGCloudConsumptionProfilesView()
    request = DummyRequest(hass)

    response = await view.get(request, "123")
    payload = json.loads(response.text)

    assert response.status == 404
    assert "not found" in payload["error"]


@pytest.mark.asyncio
async def test_consumption_profiles_view_ok():
    class ProfileEntity:
        def __init__(self):
            self.entity_id = "sensor.oig_123_adaptive_load_profiles"
            self._last_profile_created = "2025-01-01T00:00:00+00:00"
            self._profiling_status = "ok"
            self._data_hash = "hash"

        def get_current_prediction(self):
            return {"predicted_total_kwh": 12.3}

    hass = DummyHass()
    hass.data["sensor"] = DummyComponent([ProfileEntity()])
    view = api_module.OIGCloudConsumptionProfilesView()
    request = DummyRequest(hass)

    response = await view.get(request, "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["current_prediction"]["predicted_total_kwh"] == 12.3
    assert payload["metadata"]["profiling_status"] == "ok"


@pytest.mark.asyncio
async def test_balancing_decisions_view_missing_component():
    hass = DummyHass()
    hass.data["entity_components"] = {}
    view = api_module.OIGCloudBalancingDecisionsView()
    view.hass = hass
    request = DummyRequest(hass)

    response = await view.get(request, "123")
    assert response.status == 404


@pytest.mark.asyncio
async def test_balancing_decisions_view_missing_entity():
    hass = DummyHass()
    hass.data["entity_components"] = {"sensor": DummyComponent([])}
    view = api_module.OIGCloudBalancingDecisionsView()
    view.hass = hass
    request = DummyRequest(hass)

    response = await view.get(request, "123")
    payload = json.loads(response.text)

    assert response.status == 404
    assert "not found" in payload["error"]


@pytest.mark.asyncio
async def test_balancing_decisions_view_ok():
    class BalancingEntity:
        def __init__(self):
            self.entity_id = "sensor.oig_123_battery_balancing"
            self._last_balancing_profile_created = datetime(
                2025, 1, 1, tzinfo=timezone.utc
            )
            self._balancing_profiling_status = "ok"

        async def _find_best_matching_balancing_pattern(self):
            return {"predicted_balancing_hours": 3}

    hass = DummyHass()
    hass.data["entity_components"] = {"sensor": DummyComponent([BalancingEntity()])}
    view = api_module.OIGCloudBalancingDecisionsView()
    view.hass = hass
    request = DummyRequest(hass)

    response = await view.get(request, "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["current_prediction"]["predicted_balancing_hours"] == 3
    assert payload["metadata"]["profiling_status"] == "ok"


@pytest.mark.asyncio
async def test_planner_settings_view_get_and_post(monkeypatch):
    entry = DummyEntry(entry_id="entry1", options={CONF_AUTO_MODE_SWITCH: False})
    coordinator = SimpleNamespace(data={"123": {}})
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))
    hass.data[DOMAIN] = {entry.entry_id: {"coordinator": coordinator}}

    view = api_module.OIGCloudPlannerSettingsView()
    request = DummyRequest(hass)

    response = await view.get(request, "123")
    payload = json.loads(response.text)
    assert payload["auto_mode_switch_enabled"] is False

    response = await view.post(
        DummyJsonRequest(hass, payload={"auto_mode_switch_enabled": True}), "123"
    )
    payload = json.loads(response.text)

    assert payload["updated"] is True
    assert entry.options[CONF_AUTO_MODE_SWITCH] is True


@pytest.mark.asyncio
async def test_planner_settings_view_invalid_payload():
    entry = DummyEntry(entry_id="entry1", options={CONF_AUTO_MODE_SWITCH: False})
    coordinator = SimpleNamespace(data={"123": {}})
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))
    hass.data[DOMAIN] = {entry.entry_id: {"coordinator": coordinator}}

    view = api_module.OIGCloudPlannerSettingsView()
    response = await view.post(DummyJsonRequest(hass, raise_json=True), "123")

    assert response.status == 400

    response = await view.post(DummyJsonRequest(hass, payload=[]), "123")
    assert response.status == 400


@pytest.mark.asyncio
async def test_dashboard_modules_view():
    entry = DummyEntry(entry_id="entry1", options={"enable_boiler": True})
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))
    view = api_module.OIGCloudDashboardModulesView()
    request = DummyRequest(hass)

    response = await view.get(request, "entry1")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["enable_boiler"] is True
    assert "enable_auto" not in payload


@pytest.mark.asyncio
async def test_dashboard_modules_view_strips_legacy_enable_auto():
    entry = DummyEntry(
        entry_id="entry1", options={"enable_boiler": False, "enable_auto": True}
    )
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))
    view = api_module.OIGCloudDashboardModulesView()
    request = DummyRequest(hass)

    response = await view.get(request, "entry1")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["enable_boiler"] is False
    assert "enable_auto" not in payload


@pytest.mark.asyncio
async def test_dashboard_modules_view_missing():
    hass = DummyHass(config_entries=DummyConfigEntries([]))
    view = api_module.OIGCloudDashboardModulesView()

    response = await view.get(DummyRequest(hass), "missing")
    assert response.status == 404


def _module_config_request(hass, payload):
    class _Req:
        app = {"hass": hass}

        def get(self, key, default=None):
            if key == "hass_user":
                return _ADMIN_USER
            return default

        async def json(self):
            return payload

    return _Req()


def _make_hass_for_module_config(box_id: str, options: dict):
    entry = DummyEntry(entry_id=f"eid_{box_id}", options=dict(options))
    coordinator = SimpleNamespace(data={box_id: {}})
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))
    hass.data[DOMAIN] = {entry.entry_id: {"coordinator": coordinator}}
    return hass, entry


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "section,key,raw",
    [
        ("battery", "charge_rate_kw", float("nan")),
        ("battery", "charge_rate_kw", float("inf")),
        ("battery", "charge_rate_kw", float("-inf")),
        ("battery", "balancing_interval_days", float("nan")),
        ("battery", "balancing_interval_days", float("inf")),
        ("battery", "balancing_interval_days", float("-inf")),
    ],
)
async def test_module_config_post_rejects_non_finite_numbers(section, key, raw):
    """POST must return 400 for NaN/Infinity, never 500 or persist."""
    hass, entry = _make_hass_for_module_config("nanbox", {"charge_rate_kw": 2.8})
    view = api_module.OIGCloudModuleConfigView()
    request = _module_config_request(
        hass, {"section": section, "values": {key: raw}}
    )

    response = await view.post(request, "nanbox")

    assert response.status == 400
    payload = json.loads(response.text)
    assert key in payload.get("fields", {})
    assert entry.options.get("charge_rate_kw") == 2.8  # unchanged


@pytest.mark.asyncio
async def test_module_config_post_rejects_oversized_finite_integer():
    """POST must return 400 for a huge finite int, never 500, and not persist."""
    hass, entry = _make_hass_for_module_config(
        "bigbox", {"balancing_interval_days": 7}
    )
    view = api_module.OIGCloudModuleConfigView()
    request = _module_config_request(
        hass, {"section": "battery", "values": {"balancing_interval_days": 10**400}}
    )

    response = await view.post(request, "bigbox")

    assert response.status == 400
    payload = json.loads(response.text)
    assert "balancing_interval_days" in payload.get("fields", {})
    assert entry.options.get("balancing_interval_days") == 7  # unchanged


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "raw,expected_message",
    [
        (10**400, "above maximum"),
        (-(10**400), "below minimum"),
    ],
)
async def test_module_config_post_rejects_oversized_integer_for_float_field(
    raw, expected_message
):
    """A huge int on a FLOAT field overflows float(); it must be a 400, not a 500."""
    hass, entry = _make_hass_for_module_config("floatbox", {"charge_rate_kw": 2.8})
    view = api_module.OIGCloudModuleConfigView()
    request = _module_config_request(
        hass, {"section": "battery", "values": {"charge_rate_kw": raw}}
    )

    response = await view.post(request, "floatbox")

    assert response.status == 400
    payload = json.loads(response.text)
    assert expected_message in payload["fields"]["charge_rate_kw"]
    assert entry.options.get("charge_rate_kw") == 2.8  # unchanged


@pytest.mark.asyncio
async def test_module_config_post_accepts_finite_update():
    hass, entry = _make_hass_for_module_config("okbox", {"charge_rate_kw": 2.8})
    view = api_module.OIGCloudModuleConfigView()
    request = _module_config_request(
        hass, {"section": "battery", "values": {"charge_rate_kw": 3.5}}
    )

    response = await view.post(request, "okbox")

    assert response.status == 200
    assert entry.options["charge_rate_kw"] == 3.5


def test_setup_api_endpoints_registers_views():
    registered = []

    class DummyHttp:
        def register_view(self, view):
            registered.append(type(view).__name__)

    hass = SimpleNamespace(http=DummyHttp())

    api_module.setup_api_endpoints(hass)

    assert "OIGCloudBatteryTimelineView" in registered
    assert "OIGCloudBalancingDecisionsView" in registered


@pytest.mark.asyncio
async def test_analytics_view_ok():
    hass = DummyHass()
    entity = DummyEntity(
        "sensor.oig_123_hourly_analytics",
        spot_data=[],
    )
    entity._hourly_prices = [1, 2, 3]
    entity._last_update = datetime(2025, 1, 1, tzinfo=timezone.utc)
    hass.data["sensor"] = DummyComponent([entity])

    view = api_module.OIGCloudAnalyticsView()
    request = DummyRequest(hass)

    response = await view.get(request, "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["hourly_prices"] == [1, 2, 3]
    assert payload["metadata"]["hours_count"] == 3


@pytest.mark.asyncio
async def test_analytics_view_missing_entity():
    hass = DummyHass()
    hass.data["sensor"] = DummyComponent([])
    view = api_module.OIGCloudAnalyticsView()
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 404


@pytest.mark.asyncio
async def test_consumption_profiles_view_ok_shadowed_coverage():
    hass = DummyHass()

    class DummyProfilesEntity:
        def __init__(self, entity_id):
            self.entity_id = entity_id

        def get_current_prediction(self):
            return {"predicted_total_kwh": 10.5}

    entity = DummyProfilesEntity("sensor.oig_123_adaptive_load_profiles")
    hass.data["sensor"] = DummyComponent([entity])

    view = api_module.OIGCloudConsumptionProfilesView()
    request = DummyRequest(hass)

    response = await view.get(request, "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["current_prediction"]["predicted_total_kwh"] == 10.5
    assert payload["metadata"]["box_id"] == "123"


@pytest.mark.asyncio
async def test_consumption_profiles_view_missing_component_shadowed_coverage():
    hass = DummyHass()
    view = api_module.OIGCloudConsumptionProfilesView()
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 500


@pytest.mark.asyncio
async def test_balancing_decisions_view_ok_shadowed_coverage():
    hass = DummyHass()

    class DummyBalancingEntity:
        def __init__(self, entity_id):
            self.entity_id = entity_id
            self._balancing_profiling_status = "ok"
            self._last_balancing_profile_created = datetime(2025, 1, 1)

        async def _find_best_matching_balancing_pattern(self):
            return {"predicted_balancing_hours": 4}

    entity = DummyBalancingEntity("sensor.oig_123_battery_balancing")
    hass.data["entity_components"] = {"sensor": DummyComponent([entity])}

    view = api_module.OIGCloudBalancingDecisionsView()
    view.hass = hass
    request = DummyRequest(hass)

    response = await view.get(request, "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["current_prediction"]["predicted_balancing_hours"] == 4
    assert payload["metadata"]["profiling_status"] == "ok"


@pytest.mark.asyncio
async def test_balancing_decisions_view_missing_entity_shadowed_coverage():
    hass = DummyHass()
    hass.data["entity_components"] = {"sensor": DummyComponent([])}
    view = api_module.OIGCloudBalancingDecisionsView()
    view.hass = hass
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 404


@pytest.mark.asyncio
async def test_balancing_decisions_view_missing_component_shadowed_coverage():
    hass = DummyHass()
    hass.data["entity_components"] = {}
    view = api_module.OIGCloudBalancingDecisionsView()
    view.hass = hass
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 404


@pytest.mark.asyncio
async def test_planner_settings_view_get_and_post_shadowed_coverage():
    entry = SimpleNamespace(
        entry_id="entry1",
        options={CONF_AUTO_MODE_SWITCH: False},
    )
    entry_data = {"coordinator": SimpleNamespace(data={"123": {}})}
    hass = DummyHass()
    hass.data = {DOMAIN: {entry.entry_id: entry_data}}
    hass.config_entries = DummyConfigEntries([entry])

    view = api_module.OIGCloudPlannerSettingsView()

    get_response = await view.get(DummyRequest(hass), "123")
    get_payload = json.loads(get_response.text)
    assert get_payload["auto_mode_switch_enabled"] is False

    class DummyJsonRequest(DummyRequest):
        async def json(self):
            return {"auto_mode_switch_enabled": True}

    post_response = await view.post(DummyJsonRequest(hass), "123")
    post_payload = json.loads(post_response.text)
    assert post_payload["updated"] is True
    assert post_payload["auto_mode_switch_enabled"] is True


@pytest.mark.asyncio
async def test_planner_settings_view_invalid_json():
    entry = SimpleNamespace(entry_id="entry1", options={CONF_AUTO_MODE_SWITCH: False})
    entry_data = {"coordinator": SimpleNamespace(data={"123": {}})}
    hass = DummyHass()
    hass.data = {DOMAIN: {entry.entry_id: entry_data}}
    hass.config_entries = DummyConfigEntries([entry])

    class DummyBadJsonRequest(DummyRequest):
        async def json(self):
            raise ValueError("bad")

    view = api_module.OIGCloudPlannerSettingsView()
    response = await view.post(DummyBadJsonRequest(hass), "123")
    assert response.status == 400


@pytest.mark.asyncio
async def test_planner_settings_view_no_change():
    entry = SimpleNamespace(entry_id="entry1", options={CONF_AUTO_MODE_SWITCH: False})
    entry_data = {"coordinator": SimpleNamespace(data={"123": {}})}
    hass = DummyHass()
    hass.data = {DOMAIN: {entry.entry_id: entry_data}}
    hass.config_entries = DummyConfigEntries([entry])

    class DummyJsonRequest(DummyRequest):
        async def json(self):
            return {"auto_mode_switch_enabled": False}

    view = api_module.OIGCloudPlannerSettingsView()
    response = await view.post(DummyJsonRequest(hass), "123")
    payload = json.loads(response.text)

    assert payload["updated"] is False


@pytest.mark.asyncio
async def test_dashboard_modules_view_ok():
    entry = SimpleNamespace(entry_id="entry1", domain=DOMAIN, options={"enable_boiler": True})
    hass = DummyHass()
    hass.config_entries = DummyConfigEntries([entry])

    view = api_module.OIGCloudDashboardModulesView()
    response = await view.get(DummyRequest(hass), "entry1")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["enable_boiler"] is True


@pytest.mark.asyncio
async def test_dashboard_modules_view_missing_entry():
    hass = DummyHass()
    hass.config_entries = DummyConfigEntries([])

    view = api_module.OIGCloudDashboardModulesView()
    response = await view.get(DummyRequest(hass), "missing")

    assert response.status == 404


@pytest.mark.asyncio
async def test_detail_tabs_view_fallback(monkeypatch):
    hass = DummyHass()

    class EmptyStore:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return None

    class DetailEntity(DummyEntity):
        async def build_detail_tabs(self, tab=None, plan=None):
            return {"today": {"mode_blocks": []}}

    monkeypatch.setattr("homeassistant.helpers.storage.Store", EmptyStore)

    hass.data["sensor"] = DummyComponent(
        [DetailEntity("sensor.oig_123_battery_forecast")]
    )

    view = api_module.OIGCloudDetailTabsView()
    response = await view.get(DummyRequest(hass), "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert "today" in payload


@pytest.mark.asyncio
async def test_battery_timeline_view_entity_fallback(monkeypatch):
    hass = DummyHass()

    class EmptyStore:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return None

    monkeypatch.setattr("homeassistant.helpers.storage.Store", EmptyStore)

    entity = DummyEntity("sensor.oig_123_battery_forecast")
    entity._timeline_data = [{"t": 1}]
    entity._last_update = datetime(2025, 1, 1, tzinfo=timezone.utc)
    hass.data["sensor"] = DummyComponent([entity])

    view = api_module.OIGCloudBatteryTimelineView()
    response = await view.get(DummyRequest(hass, {"type": "active"}), "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["active"] == [{"t": 1}]
    assert payload["metadata"]["points_count"] == 1


@pytest.mark.asyncio
async def test_unified_cost_tile_view_build_from_entity(monkeypatch):
    hass = DummyHass()

    class EmptyStore:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return None

    class TileEntity(DummyEntity):
        async def build_unified_cost_tile(self):
            return {"today": {"plan_total_cost": 12.5}}

    monkeypatch.setattr("homeassistant.helpers.storage.Store", EmptyStore)

    hass.data["sensor"] = DummyComponent([TileEntity("sensor.oig_123_battery_forecast")])
    view = api_module.OIGCloudUnifiedCostTileView()

    response = await view.get(DummyRequest(hass), "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["today"]["plan_total_cost"] == 12.5


@pytest.mark.asyncio
async def test_unified_cost_tile_view_missing_build_method(monkeypatch):
    hass = DummyHass()

    class EmptyStore:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return None

    class BareEntity(DummyEntity):
        pass

    monkeypatch.setattr("homeassistant.helpers.storage.Store", EmptyStore)
    hass.data["sensor"] = DummyComponent([BareEntity("sensor.oig_123_battery_forecast")])

    view = api_module.OIGCloudUnifiedCostTileView()
    response = await view.get(DummyRequest(hass), "123")
    payload = json.loads(response.text)

    assert response.status == 500
    assert "build_unified_cost_tile" in payload["error"]


@pytest.mark.asyncio
async def test_planner_settings_view_missing_entry():
    hass = DummyHass()
    view = api_module.OIGCloudPlannerSettingsView()

    response = await view.get(DummyRequest(hass), "missing")
    assert response.status == 404


@pytest.mark.asyncio
async def test_dashboard_modules_view_wrong_domain():
    entry = SimpleNamespace(entry_id="entry1", domain="other", options={})
    hass = DummyHass()
    hass.config_entries = DummyConfigEntries([entry])

    view = api_module.OIGCloudDashboardModulesView()
    response = await view.get(DummyRequest(hass), "entry1")

    assert response.status == 404


@pytest.mark.asyncio
async def test_detail_tabs_view_missing_component(monkeypatch):
    hass = DummyHass()

    class EmptyStore:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return None

    monkeypatch.setattr("homeassistant.helpers.storage.Store", EmptyStore)

    view = api_module.OIGCloudDetailTabsView()
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 503


@pytest.mark.asyncio
async def test_detail_tabs_view_missing_build_method(monkeypatch):
    hass = DummyHass()

    class EmptyStore:
        def __init__(self, hass, version, key):
            self.hass = hass
            self.version = version
            self.key = key

        async def async_load(self):
            return None

    class BareEntity(DummyEntity):
        pass

    monkeypatch.setattr("homeassistant.helpers.storage.Store", EmptyStore)
    hass.data["sensor"] = DummyComponent([BareEntity("sensor.oig_123_battery_forecast")])

    view = api_module.OIGCloudDetailTabsView()
    response = await view.get(DummyRequest(hass), "123")
    payload = json.loads(response.text)

    assert response.status == 500
    assert "build_detail_tabs method not found" in payload["error"]


def test_setup_api_endpoints_registers_views_shadowed_coverage():
    registered = []

    class DummyHttp:
        def register_view(self, view):
            registered.append(type(view).__name__)

    hass = SimpleNamespace(http=DummyHttp())

    api_module.setup_api_endpoints(hass)

    assert "OIGCloudBatteryTimelineView" in registered
    assert "OIGCloudDetailTabsView" in registered
    assert "OIGCloudPricelistsView" in registered


@pytest.mark.asyncio
async def test_pricelists_view_requires_admin():
    hass = DummyHass(config_entries=DummyConfigEntries([
        DummyEntry(entry_id="e1")
    ]))
    hass.data[DOMAIN] = {"e1": {"coordinator": SimpleNamespace(data={"box1": {}})}}
    view = api_module.OIGCloudPricelistsView()

    class _NonAdminReq:
        app = {"hass": hass}

        def get(self, key, default=None):
            if key == "hass_user":
                return SimpleNamespace(is_admin=False)
            return default

    existing_box = await view.get(_NonAdminReq(), "box1")
    missing_box = await view.get(_NonAdminReq(), "missing")
    existing_text = existing_box.text

    assert existing_box.status == 403
    assert missing_box.status == 403
    assert existing_text == missing_box.text


@pytest.mark.asyncio
async def test_pricelists_view_returns_dataset_for_admin():
    hass = DummyHass(config_entries=DummyConfigEntries([DummyEntry(entry_id="e2")]))
    hass.data[DOMAIN] = {"e2": {"coordinator": SimpleNamespace(data={"box2": {}})}}
    view = api_module.OIGCloudPricelistsView()

    response = await view.get(DummyRequest(hass), "box2")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["distributors"]
    assert payload["tariffs"]
    assert payload["selected_distributor"] in payload["distributors"]
    assert payload["selected_tariff"] in payload["tariffs"]
    assert "stale_warning" in payload
    assert "valid_from" in payload
    # Owner D57d bug: the FE suggestion needs system_services/electricity_tax
    # on top of dist_leg — the endpoint must pass the shipped dataset's
    # top-level regulated_components section through untouched.
    assert payload["regulated_components"]["system_services"]["price_excl_vat"] == 164.24
    assert payload["regulated_components"]["electricity_tax"]["price_excl_vat"] == 28.30


def _synthetic_pricelist(year, valid_from):
    rates = {"price_incl_vat": 1.0, "price_excl_vat": 1.0, "unit": "Kc"}
    return {
        "year": year,
        "distributors": {"d1": {"t1": dict(rates)}},
        "valid_from_snapshots": [
            {"valid_from": valid_from, "distributors": {"d1": {"t1": dict(rates)}}},
        ],
    }


@pytest.mark.asyncio
async def test_pricelists_view_stale_warning_uses_snapshot_valid_from_year(monkeypatch):
    current_year = datetime.now(timezone.utc).year
    hass = DummyHass(config_entries=DummyConfigEntries([DummyEntry(entry_id="e3")]))
    hass.data[DOMAIN] = {"e3": {"coordinator": SimpleNamespace(data={"box3": {}})}}
    view = api_module.OIGCloudPricelistsView()

    # Top-level "year" says current (not stale) but the SELECTED snapshot's
    # valid_from is last year — R7.6/R8.6 require the check to key off the
    # snapshot's valid_from, not the top-level field.
    monkeypatch.setattr(
        api_module,
        "_load_released_pricelists",
        lambda: _synthetic_pricelist(current_year, f"{current_year - 1}-01-01"),
    )
    response = await view.get(DummyRequest(hass), "box3")
    payload = json.loads(response.text)
    assert payload["year"] == current_year - 1
    assert payload["stale_warning"] is True

    # Inverse: top-level year says stale but the snapshot's valid_from is
    # current — must NOT warn.
    monkeypatch.setattr(
        api_module,
        "_load_released_pricelists",
        lambda: _synthetic_pricelist(current_year - 1, f"{current_year}-01-01"),
    )
    response = await view.get(DummyRequest(hass), "box3")
    payload = json.loads(response.text)
    assert payload["year"] == current_year
    assert payload["stale_warning"] is False


@pytest.mark.asyncio
async def test_config_registry_view_ok():
    entry = DummyEntry(entry_id="entry1")
    coordinator = SimpleNamespace(data={"123": {}})
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))
    hass.data[DOMAIN] = {entry.entry_id: {"coordinator": coordinator}}

    view = api_module.OIGCloudConfigRegistryView()
    response = await view.get(DummyRequest(hass), "123")
    payload = json.loads(response.text)

    assert response.status == 200
    assert "fields" in payload
    assert "sections" in payload

    charge_rate = payload["fields"]["charge_rate_kw"]
    assert charge_rate["section"] == "battery"
    assert charge_rate["min"] == 0.5
    assert charge_rate["max"] == 10.0
    assert charge_rate["label"] == "field.charge_rate_kw.label"

    solar_key = payload["fields"]["solar_forecast_api_key"]
    assert solar_key["secret"] is True
    assert "default" not in solar_key

    assert "battery" in payload["sections"]


@pytest.mark.asyncio
async def test_config_registry_view_missing_box():
    hass = DummyHass(config_entries=DummyConfigEntries([]))
    view = api_module.OIGCloudConfigRegistryView()
    response = await view.get(DummyRequest(hass), "missing")

    assert response.status == 404


@pytest.mark.asyncio
async def test_config_registry_view_requires_admin_for_existing_and_missing_box():
    entry = DummyEntry(entry_id="entry1")
    coordinator = SimpleNamespace(data={"123": {}})
    hass = DummyHass(config_entries=DummyConfigEntries([entry]))
    hass.data[DOMAIN] = {entry.entry_id: {"coordinator": coordinator}}
    view = api_module.OIGCloudConfigRegistryView()

    class _NonAdminReq:
        app = {"hass": hass}

        def get(self, key, default=None):
            if key == "hass_user":
                return SimpleNamespace(is_admin=False)
            return default

    existing_box = await view.get(_NonAdminReq(), "123")
    missing_box = await view.get(_NonAdminReq(), "missing")

    assert existing_box.status == 403
    assert missing_box.status == 403
    assert existing_box.text == missing_box.text
    assert "fields" not in existing_box.text
    assert "sections" not in existing_box.text


def test_config_registry_view_requires_auth():
    assert api_module.OIGCloudConfigRegistryView.requires_auth is True


def test_pricelists_view_requires_auth():
    assert api_module.OIGCloudPricelistsView.requires_auth is True


# --- Plan 2 Task 2: basic section is exposed by module_config GET/POST -----


@pytest.mark.asyncio
async def test_module_config_get_includes_basic_section():
    hass, entry = _make_hass_for_module_config("basicbox", {})
    view = api_module.OIGCloudModuleConfigView()
    request = _module_config_request(hass, {})
    response = await view.get(request, "basicbox")
    payload = json.loads(response.text)

    assert response.status == 200
    assert "basic" in payload
    basic = payload["basic"]
    assert basic["standard_scan_interval"] == 30
    assert basic["extended_scan_interval"] == 300
    assert basic["data_source_mode"] == "cloud_only"
    assert basic["local_proxy_stale_minutes"] == 10
    assert basic["local_event_debounce_ms"] == 300
    assert basic["enable_dashboard"] is False


@pytest.mark.asyncio
async def test_module_config_post_basic_section_accepts_update():
    hass, entry = _make_hass_for_module_config("basicbox", {})
    view = api_module.OIGCloudModuleConfigView()
    request = _module_config_request(
        hass,
        {
            "section": "basic",
            "values": {"standard_scan_interval": 60, "enable_dashboard": True},
        },
    )
    response = await view.post(request, "basicbox")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["updated"] is True
    assert "standard_scan_interval" in payload["keys"]
    assert entry.options["standard_scan_interval"] == 60
    assert entry.options["enable_dashboard"] is True


@pytest.mark.asyncio
async def test_module_config_post_basic_rejects_unknown_field():
    hass, entry = _make_hass_for_module_config("basicbox", {})
    view = api_module.OIGCloudModuleConfigView()
    request = _module_config_request(
        hass,
        {"section": "basic", "values": {"phantom_key": 1}},
    )
    response = await view.post(request, "basicbox")
    payload = json.loads(response.text)

    assert response.status == 400
    assert payload["error"] == "validation"
    assert payload["fields"]["phantom_key"] == "unknown field"


@pytest.mark.asyncio
async def test_module_config_post_basic_rejects_out_of_bounds():
    """Registry bounds must be enforced on the REST path too, and nothing persisted."""
    hass, entry = _make_hass_for_module_config(
        "basicbox", {"standard_scan_interval": 30}
    )
    view = api_module.OIGCloudModuleConfigView()
    request = _module_config_request(
        hass,
        {
            "section": "basic",
            "values": {"standard_scan_interval": 5},  # below registry min 30
        },
    )
    response = await view.post(request, "basicbox")
    payload = json.loads(response.text)

    assert response.status == 400
    assert "standard_scan_interval" in payload["fields"]
    assert entry.options["standard_scan_interval"] == 30  # unchanged


@pytest.mark.asyncio
async def test_module_config_get_basic_defaults_when_unset():
    """An entry with no basic keys must GET the registry defaults, not omit the keys."""
    hass, entry = _make_hass_for_module_config("basicbox", {})
    view = api_module.OIGCloudModuleConfigView()
    request = _module_config_request(hass, {})
    response = await view.get(request, "basicbox")
    payload = json.loads(response.text)

    assert payload["basic"]["data_source_mode"] == "cloud_only"


@pytest.mark.asyncio
async def test_module_config_hybrid_data_source_mode_round_trips():
    """OQ-6: a legacy stored 'hybrid' must GET back as 'hybrid' and POST back WITHOUT a 400."""
    hass, entry = _make_hass_for_module_config(
        "basicbox", {"data_source_mode": "hybrid"}
    )
    view = api_module.OIGCloudModuleConfigView()
    get_resp = await view.get(_module_config_request(hass, {}), "basicbox")
    get_payload = json.loads(get_resp.text)
    assert get_payload["basic"]["data_source_mode"] == "hybrid"
    post_resp = await view.post(
        _module_config_request(
            hass,
            {
                "section": "basic",
                "values": {"data_source_mode": get_payload["basic"]["data_source_mode"]},
            },
        ),
        "basicbox",
    )
    assert post_resp.status == 200
    assert entry.options["data_source_mode"] == "hybrid"


@pytest.mark.asyncio
async def test_module_config_get_unset_extended_sensors_and_statistics_default_true():
    """OQ-5: a legacy entry that never stored enable_extended_sensors or
    enable_statistics must GET both as True (registry default), matching the flow."""
    hass, entry = _make_hass_for_module_config("basicbox", {})
    view = api_module.OIGCloudModuleConfigView()
    response = await view.get(_module_config_request(hass, {}), "basicbox")
    payload = json.loads(response.text)

    assert payload["modules"]["enable_extended_sensors"] is True
    assert payload["modules"]["enable_statistics"] is True


def _solar_entry(**options):
    base = {
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_api_key": "fs-key",
        "solar_forecast_string1_enabled": True,
    }
    base.update(options)
    return DummyEntry("e1", options=base)


@pytest.mark.asyncio
async def test_module_config_post_rejects_incomplete_provider_switch(monkeypatch):
    """U3: switching to Solcast with blank credentials must NOT save."""
    entry = _solar_entry()
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    view = api_module.OIGCloudModuleConfigView()
    req = _module_config_request(hass, {
        "section": "solar", "values": {"solar_forecast_provider": "solcast"}})

    resp = await view.post(req, "box1")

    assert resp.status == 400
    body = json.loads(resp.text)
    assert body["error"] == "validation"
    assert "solcast_api_key" in body["fields"]
    assert entry.options["solar_forecast_provider"] == "forecast_solar"  # not written


@pytest.mark.asyncio
async def test_module_config_post_rejects_disabling_every_string(monkeypatch):
    """M1: no_strings_enabled must bind REST too — it used to be flow-only
    (steps.py:1643), so this POST silently saved a panel-less solar config."""
    entry = _solar_entry()
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    view = api_module.OIGCloudModuleConfigView()
    req = _module_config_request(hass, {"section": "solar", "values": {
        "solar_forecast_string1_enabled": False,
        "solar_forecast_string2_enabled": False}})

    resp = await view.post(req, "box1")

    assert resp.status == 400
    assert json.loads(resp.text)["fields"]["base"] == "no_strings_enabled"
    assert entry.options["solar_forecast_string1_enabled"] is True  # not written


@pytest.mark.asyncio
@pytest.mark.parametrize("value", [0, 90, 138, 180, 270, 360])
async def test_module_config_post_persists_compass_azimuth_unchanged(
    monkeypatch, value
):
    entry = _solar_entry()
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    view = api_module.OIGCloudModuleConfigView()
    req = _module_config_request(hass, {
        "section": "solar", "values": {"solar_forecast_string1_azimuth": value}})

    resp = await view.post(req, "box1")

    assert resp.status == 200
    assert entry.options["solar_forecast_string1_azimuth"] == value


@pytest.mark.asyncio
async def test_module_config_get_renders_legacy_negative_with_exact_metadata(monkeypatch):
    entry = _solar_entry(solar_forecast_string1_azimuth=-90)
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)

    response = await api_module.OIGCloudModuleConfigView().get(
        _module_config_request(hass, {}), "box1"
    )
    body = json.loads(response.text)

    assert body["solar"]["solar_forecast_string1_azimuth"] == 90
    assert body["_meta"]["legacy_fields"]["solar_forecast_string1_azimuth"] == {
        "stored_value": -90,
        "display_value": 90,
        "legacy_provider_value": True,
        "requires_adoption": True,
    }
    assert entry.options["solar_forecast_string1_azimuth"] == -90


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("values", "adopt", "expected"),
    [
        ({"charge_rate_kw": 3.5}, [], -90),
        ({"solar_forecast_string1_azimuth": 90}, [], -90),
        ({"solar_forecast_string1_azimuth": 90}, ["solar_forecast_string1_azimuth"], 90),
        ({"solar_forecast_string1_azimuth": 138}, [], 138),
    ],
)
async def test_module_config_legacy_adoption_is_explicit_and_single_conversion(
    monkeypatch, values, adopt, expected
):
    entry = _solar_entry(solar_forecast_string1_azimuth=-90)
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    section = "battery" if "charge_rate_kw" in values else "solar"
    response = await api_module.OIGCloudModuleConfigView().post(
        _module_config_request(
            hass,
            {"section": section, "values": values, "adopt_legacy_fields": adopt},
        ),
        "box1",
    )
    assert response.status == 200
    assert entry.options["solar_forecast_string1_azimuth"] == expected


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "adopt",
    [["unknown"], ["solar_forecast_string2_azimuth"]],
)
async def test_module_config_rejects_unknown_or_nonlegacy_adoption_keys(
    monkeypatch, adopt
):
    entry = _solar_entry(solar_forecast_string1_azimuth=-90)
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    response = await api_module.OIGCloudModuleConfigView().post(
        _module_config_request(
            hass,
            {
                "section": "solar",
                "values": {"solar_forecast_string1_azimuth": 90},
                "adopt_legacy_fields": adopt,
            },
        ),
        "box1",
    )
    assert response.status == 400
    assert entry.options["solar_forecast_string1_azimuth"] == -90


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "bad",
    [-1, 361, 90.5, True, "90", "bad", float("nan"), 10**400],
)
async def test_module_config_rejects_invalid_compass_write_without_mutation(
    monkeypatch, bad
):
    entry = _solar_entry(solar_forecast_string1_azimuth=138)
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    response = await api_module.OIGCloudModuleConfigView().post(
        _module_config_request(
            hass,
            {
                "section": "solar",
                "values": {"solar_forecast_string1_azimuth": bad},
            },
        ),
        "box1",
    )
    assert response.status == 400
    assert entry.options["solar_forecast_string1_azimuth"] == 138


@pytest.mark.asyncio
@pytest.mark.parametrize("stored", [361, 720, 90.5, "NaN"])
async def test_module_config_invalid_stored_azimuth_warns_and_waits_for_correction(
    monkeypatch, stored
):
    entry = _solar_entry(solar_forecast_string1_azimuth=stored)
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    view = api_module.OIGCloudModuleConfigView()

    response = await view.get(_module_config_request(hass, {}), "box1")
    body = json.loads(response.text)
    assert body["solar"]["solar_forecast_string1_azimuth"] == stored
    assert body["_meta"]["legacy_fields"]["solar_forecast_string1_azimuth"][
        "invalid_legacy_value"
    ] is True
    assert entry.options["solar_forecast_string1_azimuth"] == stored

    corrected = await view.post(
        _module_config_request(
            hass,
            {
                "section": "solar",
                "values": {"solar_forecast_string1_azimuth": 138},
            },
        ),
        "box1",
    )
    assert corrected.status == 200
    assert entry.options["solar_forecast_string1_azimuth"] == 138


@pytest.mark.asyncio
async def test_rest_and_flow_reject_the_same_panel_less_config(monkeypatch):
    """The claim this task exists to make true: ONE rule set, two surfaces.
    Same input, same verdict — asserted, not asserted-about."""
    from custom_components.oig_cloud.config.solar_rules import validate_solar_effective

    panel_less = {
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_mode": "daily_optimized",
        "solar_forecast_api_key": "fs-key",
        "solar_forecast_string1_enabled": False,
        "solar_forecast_string2_enabled": False,
    }
    # flow surface (the shared validator IS the flow's rule after Step 4)
    assert validate_solar_effective(panel_less) == {"base": "no_strings_enabled"}

    # REST surface, same input
    entry = DummyEntry("e1", options=dict(panel_less))
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    view = api_module.OIGCloudModuleConfigView()
    req = _module_config_request(hass, {
        "section": "solar", "values": {"solar_forecast_string1_enabled": False}})

    resp = await view.post(req, "box1")
    assert resp.status == 400
    assert json.loads(resp.text)["fields"]["base"] == "no_strings_enabled"


# --- R11.1: GET module_config must fail closed for non-admin (SEC-2, CRITICAL) ---


@pytest.mark.asyncio
async def test_module_config_get_requires_admin_and_hides_solar_location():
    """Today ANY authenticated household account can read the box config,
    including home GPS coordinates and the Solcast site id. Mirrors the
    POST admin gate at :1235-1237."""
    hass, entry = _make_hass_for_module_config("secretbox", {
        "solar_forecast_latitude": 50.087,
        "solar_forecast_longitude": 14.421,
        "solcast_site_id": "site_leak_12345",
    })
    view = api_module.OIGCloudModuleConfigView()

    class _NonAdminReq:
        app = {"hass": hass}

        def get(self, key, default=None):
            if key == "hass_user":
                return SimpleNamespace(is_admin=False)
            return default

    response = await view.get(_NonAdminReq(), "secretbox")
    body_text = response.text

    assert response.status == 403
    assert "solar_forecast_latitude" not in body_text
    assert "solar_forecast_longitude" not in body_text
    assert "site_leak_12345" not in body_text


# --- F1 Plan 3.6 Task 7: pricing section wired into module_config GET/POST -


@pytest.mark.asyncio
async def test_module_config_get_includes_pricing_section():
    """The GET section tuple omitted "pricing" — the exact gap Task 7 closes."""
    hass, entry = _make_hass_for_module_config("pricebox", {})
    view = api_module.OIGCloudModuleConfigView()
    request = _module_config_request(hass, {})
    response = await view.get(request, "pricebox")
    payload = json.loads(response.text)

    assert response.status == 200
    assert "pricing" in payload
    pricing = payload["pricing"]
    for key in (
        "confirmed_distribution_distributor",
        "confirmed_distribution_tariff",
        "confirmed_distribution_price_incl_vat",
        "confirmed_distribution_price_excl_vat",
        "confirmed_distribution_unit",
    ):
        assert key in pricing
    assert isinstance(pricing["confirmed_distribution_distributor"], str)
    assert pricing["confirmed_distribution_distributor"] != ""
    assert isinstance(pricing["confirmed_distribution_tariff"], str)
    assert pricing["confirmed_distribution_tariff"] != ""
    assert isinstance(pricing["confirmed_distribution_price_incl_vat"], float)
    assert isinstance(pricing["confirmed_distribution_price_excl_vat"], float)
    assert isinstance(pricing["confirmed_distribution_unit"], str)


@pytest.mark.asyncio
async def test_module_config_post_pricing_round_trips_via_merge_entry_options():
    """POST {section:"pricing", values} must persist via the same shared
    merge_entry_options path every other section uses — no special-casing."""
    hass, entry = _make_hass_for_module_config("pricebox", {})
    view = api_module.OIGCloudModuleConfigView()

    baseline = json.loads(
        (await view.get(_module_config_request(hass, {}), "pricebox")).text
    )["pricing"]
    distributor = baseline["confirmed_distribution_distributor"]
    tariff = baseline["confirmed_distribution_tariff"]

    post_response = await view.post(
        _module_config_request(
            hass,
            {
                "section": "pricing",
                "values": {
                    "confirmed_distribution_distributor": distributor,
                    "confirmed_distribution_tariff": tariff,
                    "confirmed_distribution_price_incl_vat": 11.5,
                    "confirmed_distribution_price_excl_vat": 9.0,
                    "confirmed_distribution_unit": "Kc/kWh",
                },
            },
        ),
        "pricebox",
    )
    post_payload = json.loads(post_response.text)

    assert post_response.status == 200
    assert post_payload["updated"] is True
    assert entry.options["confirmed_distribution_price_incl_vat"] == 11.5
    assert entry.options["confirmed_distribution_price_excl_vat"] == 9.0
    assert entry.options["confirmed_distribution_unit"] == "Kc/kWh"

    after = json.loads(
        (await view.get(_module_config_request(hass, {}), "pricebox")).text
    )["pricing"]
    assert after["confirmed_distribution_price_incl_vat"] == 11.5
    assert after["confirmed_distribution_price_excl_vat"] == 9.0
    assert after["confirmed_distribution_unit"] == "Kc/kWh"


# --- F1 U4 R3: pricing_supplier wired into module_config GET/POST ----------
# (RCA-R3 restoration — same "no special-casing" pattern as Task 7's
# `pricing` section wiring above; the GET section tuple omitted
# "pricing_supplier" until this unit added it.)


_LEGACY_PRICING_OPTIONS = {
    # A realistic pre-existing entry.options as the legacy config/steps.py
    # wizard would have written it — every key WITHOUT the new _nt suffixes,
    # since no install has ever had those.
    "spot_pricing_model": "percentage",
    "spot_positive_fee_percent": 20.0,
    "spot_negative_fee_percent": 11.0,
    "spot_fixed_fee_mwh": 480.0,
    "fixed_commercial_price_vt": 5.10,
    "fixed_commercial_price_nt": 3.90,
    "export_pricing_model": "fixed",
    "export_fee_percent": 12.0,
    "export_fixed_fee_czk": 0.18,
    "export_fixed_price": 2.75,
    "dual_tariff_enabled": True,
    "distribution_fee_vt_kwh": 1.55,
    "distribution_fee_nt_kwh": 0.95,
    "tariff_vt_start_weekday": "7",
    "tariff_nt_start_weekday": "23,3",
    "tariff_vt_start_weekend": "8",
    "tariff_nt_start_weekend": "1",
    "tariff_weekend_same_as_weekday": False,
    "vat_rate": 21.0,
}


@pytest.mark.asyncio
async def test_module_config_get_includes_pricing_supplier_section():
    hass, entry = _make_hass_for_module_config("supplierbox", {})
    view = api_module.OIGCloudModuleConfigView()
    response = await view.get(_module_config_request(hass, {}), "supplierbox")
    payload = json.loads(response.text)

    assert response.status == 200
    assert "pricing_supplier" in payload
    supplier = payload["pricing_supplier"]
    for key in (
        "spot_pricing_model", "spot_positive_fee_percent",
        "spot_positive_fee_percent_nt", "export_pricing_model",
        "tariff_vt_start_weekday", "dual_tariff_enabled",
    ):
        assert key in supplier
    # Relocated to `pricing` (UX-SPEC §3/§4, owner correction round 2 —
    # supplier-step redesign): distribution does not belong in the supplier
    # contract, so these no longer appear under pricing_supplier.
    assert "distribution_fee_vt_kwh" not in supplier
    assert "vat_rate" not in supplier
    pricing = payload["pricing"]
    assert "distribution_fee_vt_kwh" in pricing
    assert "vat_rate" in pricing


@pytest.mark.asyncio
async def test_module_config_get_reflects_preexisting_legacy_options_unmigrated():
    """RCA-R3's core requirement: existing entry.options values reappear
    through the registry with NO migration — the legacy keys are read as-is."""
    hass, entry = _make_hass_for_module_config("legacybox", _LEGACY_PRICING_OPTIONS)
    view = api_module.OIGCloudModuleConfigView()
    response = await view.get(_module_config_request(hass, {}), "legacybox")
    payload = json.loads(response.text)
    supplier = payload["pricing_supplier"]
    pricing = payload["pricing"]
    # Relocated to `pricing` (UX-SPEC §3/§4 owner correction round 2) —
    # unchanged key names, just a different registry section/response bucket.
    _RELOCATED = ("distribution_fee_vt_kwh", "distribution_fee_nt_kwh", "vat_rate")

    for key, value in _LEGACY_PRICING_OPTIONS.items():
        bucket = pricing if key in _RELOCATED else supplier
        assert bucket[key] == value, key
    # The new NT-only keys never lived in this legacy entry — they fall back
    # to their registry defaults, not an error or a missing key.
    assert supplier["spot_positive_fee_percent_nt"] == 13.0
    assert supplier["export_fee_percent_nt"] == 13.0


@pytest.mark.asyncio
async def test_module_config_post_pricing_supplier_round_trips_preserving_other_legacy_keys():
    """POST {section:"pricing_supplier", values} must merge — not replace —
    so unrelated legacy keys already in entry.options survive untouched."""
    hass, entry = _make_hass_for_module_config("supplierbox", _LEGACY_PRICING_OPTIONS)
    view = api_module.OIGCloudModuleConfigView()

    post_response = await view.post(
        _module_config_request(
            hass,
            {
                "section": "pricing_supplier",
                "values": {"spot_positive_fee_percent": 17.5},
            },
        ),
        "supplierbox",
    )
    post_payload = json.loads(post_response.text)

    assert post_response.status == 200
    assert post_payload["updated"] is True
    assert entry.options["spot_positive_fee_percent"] == 17.5
    # every other legacy key untouched
    for key, value in _LEGACY_PRICING_OPTIONS.items():
        if key == "spot_positive_fee_percent":
            continue
        assert entry.options[key] == value, key

    after = json.loads(
        (await view.get(_module_config_request(hass, {}), "supplierbox")).text
    )["pricing_supplier"]
    assert after["spot_positive_fee_percent"] == 17.5


@pytest.mark.asyncio
async def test_module_config_post_pricing_supplier_rejects_unknown_field():
    hass, entry = _make_hass_for_module_config("supplierbox", {})
    view = api_module.OIGCloudModuleConfigView()
    response = await view.post(
        _module_config_request(
            hass,
            {"section": "pricing_supplier", "values": {"not_a_real_key": 1}},
        ),
        "supplierbox",
    )
    payload = json.loads(response.text)
    assert response.status == 400
    assert payload["fields"]["not_a_real_key"] == "unknown field"


@pytest.mark.asyncio
@pytest.mark.parametrize("tariff_code,expected", [
    ("D25d", True), ("D26d", True), ("D27d", True), ("D35d", True),
    ("D45d", True), ("D56d", True), ("D57d", True), ("D61d", True),
    # POZE was dropped from the tariff enum (it is a regulated line item,
    # not a sazba) — single-tariff coverage stays via D01d/D02d.
    ("D01d", False), ("D02d", False),
])
async def test_module_config_post_pricing_derives_and_persists_dual_tariff_enabled(
    tariff_code, expected,
):
    """RCA-R3 + UX-SPEC §4 (owner correction round 2): dual_tariff_enabled is
    never posted by the client — it is derived from confirmed_distribution_tariff
    and persisted under the legacy key for backward compat."""
    hass, entry = _make_hass_for_module_config("dualbox", {})
    view = api_module.OIGCloudModuleConfigView()

    post_response = await view.post(
        _module_config_request(
            hass,
            {
                "section": "pricing",
                "values": {"confirmed_distribution_tariff": tariff_code},
            },
        ),
        "dualbox",
    )
    assert post_response.status == 200
    assert entry.options["dual_tariff_enabled"] is expected

    after = json.loads(
        (await view.get(_module_config_request(hass, {}), "dualbox")).text
    )
    assert after["pricing_supplier"]["dual_tariff_enabled"] is expected


@pytest.mark.asyncio
async def test_module_config_post_pricing_supplier_save_does_not_reset_dual_tariff_enabled():
    """Saving pricing_supplier fields must not touch the derived value —
    only a confirmed_distribution_tariff change (section "pricing") does."""
    hass, entry = _make_hass_for_module_config(
        "dualbox", {"dual_tariff_enabled": True, "confirmed_distribution_tariff": "D25d"}
    )
    view = api_module.OIGCloudModuleConfigView()

    await view.post(
        _module_config_request(
            hass,
            {"section": "pricing_supplier", "values": {"spot_positive_fee_percent": 17.5}},
        ),
        "dualbox",
    )
    assert entry.options["dual_tariff_enabled"] is True
    assert entry.options["spot_positive_fee_percent"] == 17.5


@pytest.mark.asyncio
async def test_module_config_post_pricing_vat_rate_does_not_reset_dual_tariff_enabled():
    """`vat_rate` moved to the `pricing` section (UX-SPEC §3/§4 owner
    correction round 2) — saving it must not touch the derived
    dual_tariff_enabled value either, same as the pricing_supplier case
    above."""
    hass, entry = _make_hass_for_module_config(
        "dualbox2", {"dual_tariff_enabled": True, "confirmed_distribution_tariff": "D25d"}
    )
    view = api_module.OIGCloudModuleConfigView()

    await view.post(
        _module_config_request(
            hass,
            {"section": "pricing", "values": {"vat_rate": 15.0}},
        ),
        "dualbox2",
    )
    assert entry.options["dual_tariff_enabled"] is True
    assert entry.options["vat_rate"] == 15.0
