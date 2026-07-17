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
    assert payload["enable_auto"] is False


@pytest.mark.asyncio
async def test_dashboard_modules_view_enable_auto():
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
    assert payload["enable_auto"] is True


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
async def test_consumption_profiles_view_ok():
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
async def test_consumption_profiles_view_missing_component():
    hass = DummyHass()
    view = api_module.OIGCloudConsumptionProfilesView()
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 500


@pytest.mark.asyncio
async def test_balancing_decisions_view_ok():
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
async def test_balancing_decisions_view_missing_entity():
    hass = DummyHass()
    hass.data["entity_components"] = {"sensor": DummyComponent([])}
    view = api_module.OIGCloudBalancingDecisionsView()
    view.hass = hass
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 404


@pytest.mark.asyncio
async def test_balancing_decisions_view_missing_component():
    hass = DummyHass()
    hass.data["entity_components"] = {}
    view = api_module.OIGCloudBalancingDecisionsView()
    view.hass = hass
    response = await view.get(DummyRequest(hass), "123")
    assert response.status == 404


@pytest.mark.asyncio
async def test_planner_settings_view_get_and_post():
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


def test_setup_api_endpoints_registers_views():
    registered = []

    class DummyHttp:
        def register_view(self, view):
            registered.append(type(view).__name__)

    hass = SimpleNamespace(http=DummyHttp())

    api_module.setup_api_endpoints(hass)

    assert "OIGCloudBatteryTimelineView" in registered
    assert "OIGCloudDetailTabsView" in registered


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


def test_config_registry_view_requires_auth():
    assert api_module.OIGCloudConfigRegistryView.requires_auth is True


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
async def test_module_config_post_normalises_a_legacy_unsigned_azimuth(monkeypatch):
    """M2: the registry pins azimuth to -180..180 (config_registry.py:166) but the
    flow's normalisation (steps.py:1662) never ran on the REST path — a stored
    legacy 270 used to 400 on the next save."""
    entry = _solar_entry()
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    view = api_module.OIGCloudModuleConfigView()
    req = _module_config_request(hass, {
        "section": "solar", "values": {"solar_forecast_string1_azimuth": 270}})

    resp = await view.post(req, "box1")

    assert resp.status == 200
    assert entry.options["solar_forecast_string1_azimuth"] == -90


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
