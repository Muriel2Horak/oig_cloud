"""The PLÁN A CENY block the hourly AI report is built on.

Regression: the block used to be fetched over HTTP with a path-only URL
(``session.get("/api/oig_cloud/...")``). aiohttp rejects that with
InvalidUrlClientError, the broad except swallowed it, and the model was handed
the literal string "(nedostupné)" on every single tick — it never saw a price
or a plan. The data now comes from the precomputed store the REST views read.
"""
from __future__ import annotations

from typing import Any

from tests.test_ai_task_wiring import _install_shim  # noqa: E402

_install_shim()

from custom_components.oig_cloud.ai_eval import coordinator  # noqa: E402


TILE = {
    "today": {
        "plan_total_cost": 35.54,
        "actual_total_cost": 7.66,
        "delta": -27.88,
        "eod_prediction": {"predicted_total": 25.16, "confidence": "high"},
    }
}
TIMELINE = [
    {"time": "2026-09-05T15:00:00", "status": "completed", "mode_name": "HOME I",
     "spot_price": 1.29, "solar_kwh": 0.77, "load_kwh": 0.18, "battery_soc": 10},
    {"time": "2026-09-05T16:45:00", "status": "planned", "mode_name": "HOME UPS",
     "spot_price": 3.01, "solar_kwh": 0.73, "load_kwh": 0.76, "battery_soc": 11,
     "grid_charge_kwh": 1.5},
    {"time": "2026-09-05T17:00:00", "status": "planned", "mode_name": "HOME UPS",
     "spot_price": 2.32, "solar_kwh": 0.59, "load_kwh": 0.82, "battery_soc": 12,
     "grid_charge_kwh": 1.75},
]


def test_block_carries_cost_plan_forecast_and_upcoming_intervals():
    block = coordinator._format_plan_block(
        TILE, TIMELINE, "Předpověď FVE: dnes 19.8 kWh, zítra 33.2 kWh"
    )
    assert "(nedostupné)" not in block
    assert "plán 35.54 Kč" in block
    assert "zatím utraceno 7.66 Kč" in block
    assert "Odhad konce dne: 25.16 Kč" in block
    assert "Předpověď FVE: dnes 19.8 kWh" in block
    # the planned charging window, with the price range the model must judge against
    assert "Plánované nabíjení ze sítě: 16:45–17:00" in block
    assert "3.25 kWh" in block
    assert "2.32–3.01 Kč/kWh" in block
    # forward-looking intervals only; the completed one must not be offered as "next"
    assert "16:45 HOME UPS" in block
    assert "15:00 HOME I" not in block


def test_block_states_when_no_charging_is_planned():
    block = coordinator._format_plan_block(TILE, [TIMELINE[0]], "")
    assert "Plánované nabíjení ze sítě: žádné" in block


async def test_missing_store_degrades_to_unavailable_without_raising():
    # asyncio_mode=auto: let pytest-asyncio own the loop. Calling asyncio.run()
    # here closes it and the next test's fixture then trips over
    # get_event_loop() on Python 3.13.
    class _Hass:
        pass

    result = await coordinator._fetch_plan_block(_Hass(), "2206237016")
    assert result == "PLÁN A CENY: (nedostupné)"


def test_solar_summary_is_optional():
    class _States:
        def get(self, entity_id: str) -> Any:
            return None

    class _Hass:
        states = _States()

    assert coordinator._solar_forecast_summary(_Hass(), "2206237016") == ""


class _SolarState:
    def __init__(self, attributes):
        self.attributes = attributes


class _SolarStates:
    def __init__(self, mapping):
        self._mapping = mapping

    def get(self, entity_id):
        return self._mapping.get(entity_id)


class _SolarHass:
    def __init__(self, mapping):
        self.states = _SolarStates(mapping)


_SOLAR_ENTITY = "sensor.oig_2206237016_solar_forecast"


def test_solar_summary_reports_today_and_tomorrow():
    hass = _SolarHass({
        _SOLAR_ENTITY: _SolarState(
            {"today_total_kwh": 19.824, "string1_tomorrow_kwh": 33.159}
        )
    })
    line = coordinator._solar_forecast_summary(hass, "2206237016")
    assert line == "Předpověď FVE: dnes 19.8 kWh, zítra 33.2 kWh"


def test_solar_summary_survives_a_half_populated_sensor():
    hass = _SolarHass({_SOLAR_ENTITY: _SolarState({"today_total_kwh": 5.0})})
    assert coordinator._solar_forecast_summary(hass, "2206237016") == (
        "Předpověď FVE: dnes 5.0 kWh"
    )
    # attributes present but none of the two keys -> no line at all
    hass = _SolarHass({_SOLAR_ENTITY: _SolarState({"unrelated": 1})})
    assert coordinator._solar_forecast_summary(hass, "2206237016") == ""


async def test_plan_block_is_built_from_the_precomputed_store(monkeypatch):
    """The success path: the store is the source, no HTTP is involved."""
    captured = {}

    class _Store:
        def __init__(self, hass, version, key):
            captured["key"] = key

        async def async_load(self):
            return {"unified_cost_tile": TILE, "timeline": TIMELINE}

    monkeypatch.setattr(coordinator, "Store", _Store)

    hass = _SolarHass({
        _SOLAR_ENTITY: _SolarState(
            {"today_total_kwh": 19.824, "string1_tomorrow_kwh": 33.159}
        )
    })
    block = await coordinator._fetch_plan_block(hass, "2206237016")

    assert captured["key"] == "oig_cloud.precomputed_data_2206237016"
    assert "(nedostupné)" not in block
    assert "plán 35.54 Kč" in block
    assert "Předpověď FVE: dnes 19.8 kWh" in block
    assert "Plánované nabíjení ze sítě: 16:45–17:00" in block


async def test_plan_block_falls_back_to_the_hybrid_payloads(monkeypatch):
    class _Store:
        def __init__(self, hass, version, key):
            pass

        async def async_load(self):
            # only the *_hybrid variants exist in the store
            return {"unified_cost_tile_hybrid": TILE, "timeline_hybrid": TIMELINE}

    monkeypatch.setattr(coordinator, "Store", _Store)
    block = await coordinator._fetch_plan_block(_SolarHass({}), "2206237016")
    assert "plán 35.54 Kč" in block


async def test_plan_block_handles_a_store_holding_something_else(monkeypatch):
    class _Store:
        def __init__(self, hass, version, key):
            pass

        async def async_load(self):
            return ["not", "a", "dict"]

    monkeypatch.setattr(coordinator, "Store", _Store)
    block = await coordinator._fetch_plan_block(_SolarHass({}), "2206237016")
    assert block == "PLÁN A CENY: (nedostupné)"


def test_solar_summary_never_raises_on_a_junk_value():
    """The forecast line is a diagnostic extra — a bad value must not kill the tick."""
    hass = _SolarHass(
        {_SOLAR_ENTITY: _SolarState({"today_total_kwh": "not a number"})}
    )
    assert coordinator._solar_forecast_summary(hass, "2206237016") == ""
