"""The price forecast wired into the planner's price timeline."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.battery_forecast.planning import price_forecast_glue as glue

NOW = datetime(2026, 11, 16, 9, 0, tzinfo=timezone.utc)  # HA's zone is UTC in tests


def _iso(when: datetime) -> str:
    return when.isoformat().replace("+00:00", "Z")


def _forecast_entries(start: datetime, n: int, value: float = 0.12):
    return [
        {"start": _iso(start + timedelta(minutes=15 * i)), "end": _iso(start + timedelta(minutes=15 * (i + 1))), "value": value}
        for i in range(n)
    ]


def _known(start: datetime, n: int):
    return [{"time": (start + timedelta(minutes=15 * i)).strftime("%Y-%m-%dT%H:%M:%S"), "price": 6.0} for i in range(n)]


class _Store:
    data = None

    def __init__(self, *_a, **_k):
        pass

    async def async_load(self):
        return _Store.data

    def async_delay_save(self, func, delay):
        _Store.data = func()


def _sensor(mode, *, entity="sensor.price_forecast_series", attrs=None):
    states = {
        "sensor.price_forecast_series": SimpleNamespace(
            state="0.11",
            attributes=attrs
            if attrs is not None
            else {"unit_of_measurement": "EUR/kWh", "raw_forecast": _forecast_entries(datetime(2026, 11, 17, 0, tzinfo=timezone.utc), 8)},
        ),
        "sensor.oig_123_eur_czk_exchange_rate": SimpleNamespace(state="24.5", attributes={}),
    }
    hass = SimpleNamespace(states=SimpleNamespace(get=states.get), data={})
    options = {"price_forecast_mode": mode, "vat_rate": 21.0}
    if entity:
        options["price_forecast_entity"] = entity
    return SimpleNamespace(hass=hass, _hass=hass, _box_id="123", _config_entry=SimpleNamespace(entry_id="e", options=options))


@pytest.fixture(autouse=True)
def _store():
    _Store.data = None
    with patch.object(glue, "Store", _Store):
        yield


async def test_off_or_no_entity_changes_nothing():
    known = _known(datetime(2026, 11, 16, 23, 0), 4)
    for sensor in (_sensor("off"), _sensor("shadow", entity=None)):
        spot, export = await glue.async_apply_price_forecast(sensor, list(known), list(known), now=NOW)
        assert spot == known and export == known


async def test_shadow_records_the_forecast_but_the_planner_keeps_published_prices():
    known = _known(datetime(2026, 11, 16, 23, 0), 4)
    sensor = _sensor("shadow")
    spot, export = await glue.async_apply_price_forecast(sensor, list(known), list(known), now=NOW)

    assert spot == known
    summary = sensor._price_forecast_summary
    assert summary["mode"] == "shadow"
    assert summary["forecast_slots"] == 8
    assert summary["used_slots"] == 0
    assert _Store.data["open"]  # predictions saved for scoring


async def test_on_extends_the_timeline_with_estimated_slots():
    known = _known(datetime(2026, 11, 16, 23, 0), 4)
    sensor = _sensor("on")
    spot, export = await glue.async_apply_price_forecast(sensor, list(known), list(known), now=NOW)

    assert len(spot) == 12 and len(export) == 12
    assert all(p["estimated"] for p in spot[4:])
    assert sensor._price_forecast_summary["used_slots"] == 8


async def test_published_prices_score_earlier_predictions():
    sensor = _sensor("shadow")
    await glue.async_apply_price_forecast(sensor, [], [], now=NOW)
    published = [{"time": "2026-11-17T00:00:00", "price": 6.0}]
    await glue.async_apply_price_forecast(sensor, published, list(published), now=NOW + timedelta(hours=5))

    accuracy = sensor._price_forecast_summary["accuracy"]
    assert sum(row["n"] for row in accuracy.values()) == 1


async def test_missing_entity_or_euro_rate_is_reported_not_raised():
    sensor = _sensor("on", entity="sensor.nope")
    spot, _ = await glue.async_apply_price_forecast(sensor, [], [], now=NOW)
    assert spot == []
    assert sensor._price_forecast_summary["issue"] == "entity_unavailable"

    sensor = _sensor("on", attrs={"unit_of_measurement": "ct/kWh", "raw_forecast": _forecast_entries(NOW, 2)})
    await glue.async_apply_price_forecast(sensor, [], [], now=NOW)
    assert sensor._price_forecast_summary["forecast_slots"] == 0


# ── planner wiring ─────────────────────────────────────────────────────────

from custom_components.oig_cloud.battery_forecast.planning import (  # noqa: E402
    forecast_update as forecast_update_module,
)
from custom_components.oig_cloud.battery_forecast.timeline.planner import (  # noqa: E402
    build_planner_timeline,
)


def test_planner_horizon_grows_to_48_hours_only_with_estimated_slots():
    published = [{"time": f"t{i}", "price": 1.0} for i in range(200)]
    assert forecast_update_module._planner_max_intervals(published) == 144
    published[150]["estimated"] = True
    assert forecast_update_module._planner_max_intervals(published) == 192


def test_timeline_marks_estimated_prices():
    spot = [
        {"time": "2026-11-17T00:00:00", "price": 5.0},
        {"time": "2026-11-17T00:15:00", "price": 5.5, "estimated": True},
    ]
    timeline = build_planner_timeline(
        modes=[0, 0],
        spot_prices=spot,
        export_prices=[],
        solar_forecast={},
        load_forecast=[0.2, 0.2],
        current_capacity=8.0,
        max_capacity=15.36,
        hw_min_capacity=3.07,
        efficiency=0.915,
        home_charge_rate_kw=2.6,
    )
    assert "estimated" not in timeline[0]
    assert timeline[1]["estimated"] is True
