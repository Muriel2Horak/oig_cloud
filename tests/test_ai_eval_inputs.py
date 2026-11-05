"""Collecting the advisor's inputs from HA, and deciding when advice is due.

Carries over the regressions of the old PLÁN A CENY block: the plan comes
from the precomputed store (never HTTP), the *_hybrid aliases still work, and
a missing or junk source must never kill the tick.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from tests.test_ai_task_wiring import _install_shim  # noqa: E402

_install_shim()

from custom_components.oig_cloud.ai_eval import coordinator  # noqa: E402

BOX = "2206237016"
TILE = {"today": {"plan_total_cost": 35.54, "actual_total_cost": 7.66,
                  "eod_prediction": {"predicted_total": 25.16}}}
TIMELINE = [{"time": "2026-11-05T15:00:00", "mode_name": "HOME I", "spot_price": 9.0,
             "battery_soc": 10.0}]


class _State:
    def __init__(self, state: Any, attributes: dict | None = None):
        self.state = state
        self.attributes = attributes or {}


class _States:
    def __init__(self, mapping):
        self._mapping = mapping

    def get(self, entity_id):
        return self._mapping.get(entity_id)


class _Hass:
    def __init__(self, mapping=None):
        self.states = _States(mapping or {})


def _s(suffix: str) -> str:
    return f"sensor.oig_{BOX}_{suffix}"


# ------------------------------------------------------------- precomputed store

async def test_precomputed_comes_from_the_store_not_http(monkeypatch):
    captured = {}

    class _Store:
        def __init__(self, hass, version, key):
            captured["key"] = key

        async def async_load(self):
            return {"unified_cost_tile": TILE, "timeline": TIMELINE}

    monkeypatch.setattr(coordinator, "Store", _Store)
    data = await coordinator._fetch_precomputed(_Hass(), BOX)
    assert captured["key"] == f"oig_cloud.precomputed_data_{BOX}"
    assert data["timeline"] == TIMELINE
    assert data["cost_tile"] == TILE


async def test_precomputed_falls_back_to_hybrid_aliases(monkeypatch):
    class _Store:
        def __init__(self, *_a):
            pass

        async def async_load(self):
            return {"unified_cost_tile_hybrid": TILE, "timeline_hybrid": TIMELINE}

    monkeypatch.setattr(coordinator, "Store", _Store)
    data = await coordinator._fetch_precomputed(_Hass(), BOX)
    assert data["timeline"] == TIMELINE
    assert data["cost_tile"] == TILE


async def test_precomputed_survives_junk_and_missing_store(monkeypatch):
    class _Store:
        def __init__(self, *_a):
            pass

        async def async_load(self):
            return ["not", "a", "dict"]

    monkeypatch.setattr(coordinator, "Store", _Store)
    assert await coordinator._fetch_precomputed(_Hass(), BOX) == {"timeline": [], "cost_tile": {}}

    class _Broken:
        def __init__(self, *_a):
            raise RuntimeError("no store")

    monkeypatch.setattr(coordinator, "Store", _Broken)
    assert await coordinator._fetch_precomputed(_Hass(), BOX) == {"timeline": [], "cost_tile": {}}


# ------------------------------------------------------------- collecting inputs

def _full_states():
    return {
        _s("batt_bat_c"): _State("83"),
        _s("box_prms_mode"): _State("Home 1"),
        _s("spot_price_current_15min"): _State("7.35"),
        _s("export_price_current_15min"): _State("4.26"),
        _s("current_tariff"): _State("NT", {"current_tariff": "NT",
                                            "nt_intervals": ["05.11 13:00-15:00"],
                                            "vt_intervals": ["05.11 15:00-16:00"]}),
        _s("battery_forecast"): _State("12.7", {"max_capacity_kwh": 15.36,
                                                "planned_consumption_today": 11.2,
                                                "planned_consumption_tomorrow": 18.9,
                                                "profile_today": "Home office"}),
        _s("solar_forecast"): _State("7.6", {"total_daily": {"2026-11-06": 13.9},
                                             "today_hourly_total_kw": {"2026-11-05T15:00:00": 1.6},
                                             "tomorrow_hourly_total_kw": {"2026-11-06T12:00:00": 2.6},
                                             "forecast_age_hours": 2.2,
                                             "forecast_stale": False}),
        _s("chmu_warning_level"): _State("2", {"all_warnings_details": [
            {"event": "Silný vítr", "severity": "Moderate", "onset": "2026-11-05T18:00:00+01:00"}]}),
        _s("boiler_upper_zone_temp"): _State("39.8"),
        _s("boiler_lower_zone_temp"): _State("19.5"),
        _s("boiler_energy_needed"): _State("7.06"),
        _s("boiler_recommended_source"): _State("FVE"),
        _s("boiler_current_source"): _State("Síť"),
        _s("boiler_plan_comfort_satisfied"): _State("no"),
        _s("boiler_charging_recommended"): _State("ano", {
            "start": "2026-11-05T14:00:00+01:00", "end": "2026-11-05T14:15:00+01:00",
            "spot_price": 7.35}),
        "weather.domov": _State("sunny", {"friendly_name": "Domov", "temperature": 7.5,
                                          "cloud_coverage": 0, "wind_speed": 10.1,
                                          "temperature_unit": "°C"}),
        "sensor.wallbox": _State("3.2", {"friendly_name": "Wallbox 2206237016",
                                         "unit_of_measurement": "kW"}),
    }


def test_collect_inputs_reads_live_states():
    now = datetime(2026, 11, 5, 14, 5)
    inputs = coordinator._collect_inputs(
        _Hass(_full_states()), BOX, {"timeline": TIMELINE, "cost_tile": TILE},
        ["weather.domov", "sensor.wallbox", "sensor.missing"], [], now)
    assert inputs["soc_pct"] == 83.0
    assert inputs["capacity_kwh"] == 15.36
    assert inputs["buy_price"] == 7.35
    assert inputs["sell_price"] == 4.26
    assert inputs["tariff"]["current"] == "NT"
    assert inputs["solar"]["daily"] == {"2026-11-06": 13.9}
    assert inputs["chmu"][0]["event"] == "Silný vítr"
    assert inputs["boiler"]["energy_needed_kwh"] == 7.06
    assert inputs["boiler"]["recommended_window"]["spot_price"] == 7.35
    assert inputs["cost_today"] == {"plan": 35.54, "actual": 7.66, "eod": 25.16}
    assert inputs["planned_consumption"]["tomorrow"] == 18.9
    names = [e["name"] for e in inputs["extra"]]
    assert names == ["Domov", "Wallbox 2206237016"]  # snapshot strips the digits later
    weather = inputs["extra"][0]
    assert weather["details"]["temperature"] == 7.5


def test_collect_inputs_bounds_extra_entities_and_skips_unavailable():
    states = {f"sensor.x{i}": _State("1", {"friendly_name": f"X{i}"}) for i in range(20)}
    states["sensor.x0"] = _State("unavailable", {"friendly_name": "X0"})
    ids = [f"sensor.x{i}" for i in range(20)]
    inputs = coordinator._collect_inputs(_Hass(states), BOX, {}, ids, [], datetime(2026, 11, 5, 14))
    assert len(inputs["extra"]) == coordinator.snapshot.MAX_EXTRA_ENTITIES
    assert all(e["name"] != "X0" for e in inputs["extra"])


def test_collect_inputs_with_nothing_available_does_not_raise():
    inputs = coordinator._collect_inputs(_Hass(), BOX, {}, None, [], datetime(2026, 11, 5, 14))
    assert inputs["timeline"] == []
    assert inputs["soc_pct"] is None
    assert inputs["boiler"] == {}
    assert inputs["chmu"] == []


def test_collect_inputs_ignores_junk_values():
    states = _full_states()
    states[_s("batt_bat_c")] = _State("not a number")
    states[_s("solar_forecast")] = _State("x", {"total_daily": "junk"})
    inputs = coordinator._collect_inputs(_Hass(states), BOX, {}, [], [], datetime(2026, 11, 5, 14))
    assert inputs["soc_pct"] is None
    assert inputs["solar"]["daily"] == {}


# ------------------------------------------------------------- when advice is due

NOW = datetime(2026, 11, 5, 15, 0)


def test_advice_due_on_fingerprint_change():
    assert coordinator._advice_due(NOW, NOW - timedelta(minutes=30), "a", "b") is True


def test_advice_due_when_never_generated():
    assert coordinator._advice_due(NOW, None, "a", "a") is True


def test_advice_due_at_fixed_hours_once():
    at_14 = datetime(2026, 11, 5, 14, 0)
    assert coordinator._advice_due(at_14, at_14 - timedelta(hours=3), "a", "a") is True
    assert coordinator._advice_due(at_14.replace(minute=40), at_14, "a", "a") is False


def test_advice_not_due_in_between():
    assert coordinator._advice_due(NOW, NOW - timedelta(hours=1), "a", "a") is False


def test_advice_due_when_stale():
    assert coordinator._advice_due(NOW, NOW - timedelta(hours=9), "a", "a") is True


def test_extra_entity_ids_accepts_csv_or_list_and_bounds_it():
    assert coordinator._extra_entity_ids({"ai_extra_entities": " sensor.a, ,weather.b "}) == [
        "sensor.a", "weather.b"]
    assert coordinator._extra_entity_ids({"ai_extra_entities": ["sensor.a"]}) == ["sensor.a"]
    assert coordinator._extra_entity_ids({}) == []
    many = ",".join(f"sensor.x{i}" for i in range(30))
    assert len(coordinator._extra_entity_ids({"ai_extra_entities": many})) == 10
