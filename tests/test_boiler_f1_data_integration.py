"""F1 data-integration tests: boiler adapter reads spot prices and overflow windows
from the battery module's internal pipeline instead of a user-configured HA sensor.

Coverage:
  - _read_spot_prices: primary path via battery_forecast_data['spot_prices_czk_kwh']
  - _read_spot_prices: legacy fallback via boiler_spot_price_sensor when battery data absent
  - _read_spot_prices: no reason_code INPUT_STALE_PRICE when pipeline data is present
  - _read_overflow_windows: windows populated from pipeline-derived list (no soc key)
  - _parse_adapter_overflow_window: soc-less dict accepted; soc<100 dict still rejected
  - _derive_spot_prices_czk_kwh: unit test for forecast_update helper
  - _derive_overflow_windows: unit test for forecast_update helper
  - reason_codes: INPUT_STALE_PRICE / INPUT_STALE_PV cleared when both inputs present
  - reason_codes: INPUT_STALE_PRICE retained when battery data absent and no sensor fallback

Review-finding regression tests (F1 review):
  - Bug 1/3: naive OTE timestamps in overflow windows must become tz-aware (no TypeError)
  - Bug 2: battery_forecast_data present but lacking overflow_windows key = graceful empty
  - Bug 3: naive ISO spot-price keys must become tz-aware so slot.start lookup succeeds
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.const import CONF_BOILER_SPOT_PRICE_SENSOR, DOMAIN
from custom_components.oig_cloud.boiler.planner_contract import PlannerReasonCode


# ---------------------------------------------------------------------------
# Helpers / shared fixtures
# ---------------------------------------------------------------------------

UTC = timezone.utc
SLOT0 = datetime(2026, 6, 10, 8, 0, tzinfo=UTC)


def _make_hass(domain_data: dict) -> SimpleNamespace:
    return SimpleNamespace(
        states=SimpleNamespace(get=lambda _k: None),
        data={DOMAIN: domain_data},
    )


def _make_coordinator(hass, config=None):
    return SimpleNamespace(hass=hass, config=config or {})


def _make_adapter(domain_data, config=None, entry_id="entry_1", box_id="box1"):
    from custom_components.oig_cloud.boiler.runtime import _CoordinatorEnergyInputAdapter

    hass = _make_hass(domain_data)
    coord = _make_coordinator(hass, config)
    return _CoordinatorEnergyInputAdapter(coord, entry_id=entry_id, box_id=box_id)


# ---------------------------------------------------------------------------
# Unit tests: _derive_spot_prices_czk_kwh
# ---------------------------------------------------------------------------


def test_derive_spot_prices_czk_kwh_basic():
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _derive_spot_prices_czk_kwh,
    )

    timeline = [
        {"time": "2026-06-10T08:00:00+00:00", "spot_price": 1.5},
        {"time": "2026-06-10T08:15:00+00:00", "spot_price": 2.0},
        {"time": "2026-06-10T08:30:00+00:00", "spot_price": 2.5},
    ]
    result = _derive_spot_prices_czk_kwh(timeline)
    assert len(result) == 3
    assert result["2026-06-10T08:00:00+00:00"] == 1.5
    assert result["2026-06-10T08:15:00+00:00"] == 2.0
    assert result["2026-06-10T08:30:00+00:00"] == 2.5


def test_derive_spot_prices_czk_kwh_empty_timeline():
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _derive_spot_prices_czk_kwh,
    )

    assert _derive_spot_prices_czk_kwh([]) == {}


def test_derive_spot_prices_czk_kwh_skips_missing_fields():
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _derive_spot_prices_czk_kwh,
    )

    timeline = [
        {"time": "2026-06-10T08:00:00+00:00"},  # no spot_price
        {"spot_price": 1.5},  # no time
        {"time": "2026-06-10T08:30:00+00:00", "spot_price": 2.5},
    ]
    result = _derive_spot_prices_czk_kwh(timeline)
    assert len(result) == 1
    assert "2026-06-10T08:30:00+00:00" in result


def test_derive_spot_prices_czk_kwh_uses_timestamp_fallback():
    """Falls back to 'timestamp' key when 'time' is absent."""
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _derive_spot_prices_czk_kwh,
    )

    timeline = [
        {"timestamp": "2026-06-10T09:00:00+00:00", "spot_price": 3.0},
    ]
    result = _derive_spot_prices_czk_kwh(timeline)
    assert result.get("2026-06-10T09:00:00+00:00") == 3.0


# ---------------------------------------------------------------------------
# Unit tests: _derive_overflow_windows
# ---------------------------------------------------------------------------


def _slot(offset_min: int) -> str:
    return (SLOT0 + timedelta(minutes=offset_min)).isoformat()


def _entry(offset_min: int, solar: float, load: float, soc: float) -> dict:
    return {
        "time": _slot(offset_min),
        "solar_kwh": solar,
        "load_kwh": load,
        "battery_capacity_kwh": soc,
    }


def test_derive_overflow_windows_single_run():
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _derive_overflow_windows,
    )

    max_cap = 10.0
    timeline = [
        _entry(0, solar=2.0, load=1.0, soc=9.9),   # overflow (soc >=9.8)
        _entry(15, solar=2.5, load=1.0, soc=9.9),  # overflow
        _entry(30, solar=0.5, load=1.5, soc=8.0),  # not overflow (solar<load)
    ]
    windows = _derive_overflow_windows(timeline, max_cap)
    assert len(windows) == 1
    assert windows[0]["start"] == _slot(0)
    # end should be last overflow slot + 15 min = SLOT0 + 30 min
    assert windows[0]["end"] == _slot(30)


def test_derive_overflow_windows_no_overflow():
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _derive_overflow_windows,
    )

    timeline = [
        _entry(0, solar=0.5, load=1.5, soc=9.9),
        _entry(15, solar=0.3, load=1.2, soc=8.0),
    ]
    assert _derive_overflow_windows(timeline, 10.0) == []


def test_derive_overflow_windows_battery_not_full():
    """solar > load but battery not full — should NOT count as overflow."""
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _derive_overflow_windows,
    )

    timeline = [
        _entry(0, solar=3.0, load=1.0, soc=5.0),  # battery only half full
    ]
    assert _derive_overflow_windows(timeline, 10.0) == []


def test_derive_overflow_windows_no_max_cap_uses_solar_only():
    """When max_capacity is None/0, overflow = solar > load (no SoC check)."""
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _derive_overflow_windows,
    )

    timeline = [
        _entry(0, solar=3.0, load=1.0, soc=2.0),
        _entry(15, solar=0.5, load=1.5, soc=2.0),
    ]
    windows = _derive_overflow_windows(timeline, None)
    assert len(windows) == 1


def test_derive_overflow_windows_multiple_runs():
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _derive_overflow_windows,
    )

    max_cap = 10.0
    timeline = [
        _entry(0, solar=2.0, load=1.0, soc=9.9),   # run 1
        _entry(15, solar=0.2, load=1.0, soc=8.0),  # gap
        _entry(30, solar=2.5, load=1.0, soc=9.9),  # run 2
    ]
    windows = _derive_overflow_windows(timeline, max_cap)
    assert len(windows) == 2
    assert windows[0]["start"] == _slot(0)
    assert windows[1]["start"] == _slot(30)


def test_derive_overflow_windows_trailing_run_closed():
    """A run that extends to the last slot must still be closed."""
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _derive_overflow_windows,
    )

    timeline = [
        _entry(0, solar=2.0, load=1.0, soc=9.9),
        _entry(15, solar=2.5, load=1.0, soc=9.9),
    ]
    windows = _derive_overflow_windows(timeline, 10.0)
    assert len(windows) == 1
    assert windows[0]["start"] == _slot(0)
    assert windows[0]["end"] == _slot(30)  # last slot start + 15 min


def test_derive_overflow_windows_empty():
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _derive_overflow_windows,
    )

    assert _derive_overflow_windows([], 10.0) == []


# ---------------------------------------------------------------------------
# Unit test: _parse_adapter_overflow_window with soc-less pipeline dict
# ---------------------------------------------------------------------------


def test_parse_adapter_overflow_window_no_soc_accepted():
    """Pipeline-derived windows (no soc key) must be accepted without threshold check."""
    from custom_components.oig_cloud.boiler.runtime import _parse_adapter_overflow_window

    raw = {
        "start": "2026-06-10T08:00:00+00:00",
        "end": "2026-06-10T08:30:00+00:00",
    }
    result = _parse_adapter_overflow_window(raw)
    assert result is not None
    start, end = result
    assert start.tzinfo is not None
    assert end > start


def test_parse_adapter_overflow_window_soc_below_threshold_rejected():
    """Windows with explicit soc < 100 must still be rejected."""
    from custom_components.oig_cloud.boiler.runtime import _parse_adapter_overflow_window

    raw = {
        "start": "2026-06-10T08:00:00+00:00",
        "end": "2026-06-10T08:30:00+00:00",
        "soc": 95.0,
    }
    assert _parse_adapter_overflow_window(raw) is None


def test_parse_adapter_overflow_window_soc_at_threshold_accepted():
    """Windows with soc == 100 must be accepted."""
    from custom_components.oig_cloud.boiler.runtime import _parse_adapter_overflow_window

    raw = {
        "start": "2026-06-10T08:00:00+00:00",
        "end": "2026-06-10T08:30:00+00:00",
        "soc": 100.0,
    }
    assert _parse_adapter_overflow_window(raw) is not None


# ---------------------------------------------------------------------------
# Integration: adapter reads spot prices from battery pipeline
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_adapter_reads_spot_prices_from_battery_pipeline():
    """When battery_forecast_data has spot_prices_czk_kwh, adapter uses it directly."""
    from custom_components.oig_cloud.boiler.runtime import _CoordinatorEnergyInputAdapter

    spot_prices = {
        "2026-06-10T08:00:00+00:00": 1.5,
        "2026-06-10T08:15:00+00:00": 2.0,
        "2026-06-10T08:30:00+00:00": 2.5,
    }
    domain_data = {
        "entry_1": {
            "coordinator": SimpleNamespace(
                battery_forecast_data={
                    "spot_prices_czk_kwh": spot_prices,
                    "overflow_windows": [],
                }
            )
        }
    }
    adapter = _make_adapter(domain_data)
    energy_input = await adapter.async_get_energy_input()

    assert len(energy_input.spot_prices) == 3
    assert PlannerReasonCode.INPUT_STALE_PRICE not in energy_input.reason_codes


@pytest.mark.asyncio
async def test_adapter_clears_stale_price_when_pipeline_present():
    """INPUT_STALE_PRICE must not appear when pipeline has spot prices."""
    from custom_components.oig_cloud.boiler.runtime import _CoordinatorEnergyInputAdapter

    domain_data = {
        "entry_1": {
            "coordinator": SimpleNamespace(
                battery_forecast_data={
                    "spot_prices_czk_kwh": {
                        "2026-06-10T08:00:00+00:00": 3.0,
                    },
                    "overflow_windows": [],
                }
            )
        }
    }
    adapter = _make_adapter(domain_data)
    energy_input = await adapter.async_get_energy_input()

    assert PlannerReasonCode.INPUT_STALE_PRICE not in energy_input.reason_codes


@pytest.mark.asyncio
async def test_adapter_falls_back_to_spot_sensor_when_no_battery_data():
    """Legacy boiler_spot_price_sensor used when no battery pipeline data present."""

    prices_attr = [
        {"datetime": "2026-06-10T08:00:00+00:00", "price": 1.5},
        {"datetime": "2026-06-10T08:15:00+00:00", "price": 2.0},
    ]
    sensor_state = SimpleNamespace(attributes={"prices": prices_attr})

    hass = SimpleNamespace(
        states=SimpleNamespace(get=lambda _k: sensor_state),
        data={DOMAIN: {}},
    )
    config = {CONF_BOILER_SPOT_PRICE_SENSOR: "sensor.spot_price"}
    coord = _make_coordinator(hass, config)

    from custom_components.oig_cloud.boiler.runtime import _CoordinatorEnergyInputAdapter

    adapter = _CoordinatorEnergyInputAdapter(coord, entry_id="entry_1", box_id="box1")
    energy_input = await adapter.async_get_energy_input()

    assert len(energy_input.spot_prices) == 2
    assert PlannerReasonCode.INPUT_STALE_PRICE not in energy_input.reason_codes


@pytest.mark.asyncio
async def test_adapter_returns_stale_price_when_no_data_no_sensor():
    """INPUT_STALE_PRICE returned when battery data absent and no sensor configured."""
    domain_data: dict = {}
    adapter = _make_adapter(domain_data)
    energy_input = await adapter.async_get_energy_input()

    assert PlannerReasonCode.INPUT_STALE_PRICE in energy_input.reason_codes


# ---------------------------------------------------------------------------
# Integration: adapter reads overflow windows from battery pipeline
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_adapter_reads_overflow_windows_from_pipeline():
    """overflow_windows written by battery pipeline are surfaced correctly."""
    start_iso = "2026-06-10T10:00:00+00:00"
    end_iso = "2026-06-10T10:30:00+00:00"
    domain_data = {
        "entry_1": {
            "coordinator": SimpleNamespace(
                battery_forecast_data={
                    "spot_prices_czk_kwh": {},
                    "overflow_windows": [{"start": start_iso, "end": end_iso}],
                }
            )
        }
    }
    adapter = _make_adapter(domain_data)
    energy_input = await adapter.async_get_energy_input()

    assert len(energy_input.overflow_windows) == 1
    start, end = energy_input.overflow_windows[0]
    assert start.isoformat() == start_iso
    assert end.isoformat() == end_iso
    assert PlannerReasonCode.INPUT_STALE_PV not in energy_input.reason_codes


@pytest.mark.asyncio
async def test_adapter_clears_stale_pv_when_pipeline_windows_present():
    """INPUT_STALE_PV must not appear when overflow_windows are fed from pipeline."""
    domain_data = {
        "entry_1": {
            "coordinator": SimpleNamespace(
                battery_forecast_data={
                    "spot_prices_czk_kwh": {},
                    "overflow_windows": [
                        {
                            "start": "2026-06-10T12:00:00+00:00",
                            "end": "2026-06-10T12:15:00+00:00",
                        }
                    ],
                }
            )
        }
    }
    adapter = _make_adapter(domain_data)
    energy_input = await adapter.async_get_energy_input()

    assert PlannerReasonCode.INPUT_STALE_PV not in energy_input.reason_codes


@pytest.mark.asyncio
async def test_adapter_empty_windows_is_fresh_not_stale():
    """An EMPTY overflow_windows list is fresh data (battery pipeline ran and
    predicts no overflow — e.g. night, battery far from full), NOT staleness.
    Flagging it stale kept the plan degraded every night."""
    domain_data = {
        "entry_1": {
            "coordinator": SimpleNamespace(
                battery_forecast_data={
                    "spot_prices_czk_kwh": {},
                    "overflow_windows": [],
                }
            )
        }
    }
    adapter = _make_adapter(domain_data)
    energy_input = await adapter.async_get_energy_input()

    assert PlannerReasonCode.INPUT_STALE_PV not in energy_input.reason_codes
    assert energy_input.overflow_windows == []


@pytest.mark.asyncio
async def test_adapter_stale_pv_when_windows_unparseable():
    """Stale only when entries existed but none could be parsed."""
    domain_data = {
        "entry_1": {
            "coordinator": SimpleNamespace(
                battery_forecast_data={
                    "spot_prices_czk_kwh": {},
                    "overflow_windows": [{"start": "garbage", "end": None}],
                }
            )
        }
    }
    adapter = _make_adapter(domain_data)
    energy_input = await adapter.async_get_energy_input()

    assert PlannerReasonCode.INPUT_STALE_PV in energy_input.reason_codes


@pytest.mark.asyncio
async def test_adapter_both_inputs_clears_both_stale_codes():
    """When both spot prices and overflow windows come from pipeline, no stale codes."""
    domain_data = {
        "entry_1": {
            "coordinator": SimpleNamespace(
                battery_forecast_data={
                    "spot_prices_czk_kwh": {"2026-06-10T08:00:00+00:00": 1.5},
                    "overflow_windows": [
                        {
                            "start": "2026-06-10T12:00:00+00:00",
                            "end": "2026-06-10T12:15:00+00:00",
                        }
                    ],
                }
            )
        }
    }
    adapter = _make_adapter(domain_data)
    energy_input = await adapter.async_get_energy_input()

    assert PlannerReasonCode.INPUT_STALE_PRICE not in energy_input.reason_codes
    assert PlannerReasonCode.INPUT_STALE_PV not in energy_input.reason_codes


# ---------------------------------------------------------------------------
# Integration: _save_forecast_to_coordinator writes derived keys
# ---------------------------------------------------------------------------


def test_save_forecast_writes_spot_prices_czk_kwh():
    """_save_forecast_to_coordinator must populate spot_prices_czk_kwh on coordinator."""
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _save_forecast_to_coordinator,
    )

    coord = SimpleNamespace(battery_forecast_data=None)
    sensor = SimpleNamespace(
        coordinator=coord,
        _last_update=datetime(2026, 6, 10, 8, 0, tzinfo=UTC),
        _mode_recommendations=[],
        _charging_metrics=None,
        _timeline_data=[
            {"time": "2026-06-10T08:00:00+00:00", "spot_price": 1.5, "battery_capacity_kwh": 9.0},
            {"time": "2026-06-10T08:15:00+00:00", "spot_price": 2.0, "battery_capacity_kwh": 9.0},
        ],
    )

    def _get_max():
        return 10.0

    sensor._get_max_battery_capacity = _get_max

    _save_forecast_to_coordinator(sensor)

    bfd = coord.battery_forecast_data
    assert "spot_prices_czk_kwh" in bfd
    assert len(bfd["spot_prices_czk_kwh"]) == 2


def test_save_forecast_writes_overflow_windows():
    """_save_forecast_to_coordinator must populate overflow_windows on coordinator."""
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _save_forecast_to_coordinator,
    )

    coord = SimpleNamespace(battery_forecast_data=None)
    sensor = SimpleNamespace(
        coordinator=coord,
        _last_update=datetime(2026, 6, 10, 8, 0, tzinfo=UTC),
        _mode_recommendations=[],
        _charging_metrics=None,
        _timeline_data=[
            {
                "time": "2026-06-10T10:00:00+00:00",
                "solar_kwh": 2.0,
                "load_kwh": 0.5,
                "battery_capacity_kwh": 9.9,
                "spot_price": 1.0,
            },
            {
                "time": "2026-06-10T10:15:00+00:00",
                "solar_kwh": 0.2,
                "load_kwh": 1.0,
                "battery_capacity_kwh": 8.0,
                "spot_price": 1.0,
            },
        ],
    )
    sensor._get_max_battery_capacity = lambda: 10.0

    _save_forecast_to_coordinator(sensor)

    bfd = coord.battery_forecast_data
    assert "overflow_windows" in bfd
    # First slot is overflow, second is not → one window
    assert len(bfd["overflow_windows"]) == 1
    win = bfd["overflow_windows"][0]
    assert win["start"] == "2026-06-10T10:00:00+00:00"


def test_save_forecast_backward_compat_timeline_data_still_present():
    """timeline_data must still be present in battery_forecast_data (backward compat)."""
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _save_forecast_to_coordinator,
    )

    coord = SimpleNamespace(battery_forecast_data=None)
    sensor = SimpleNamespace(
        coordinator=coord,
        _last_update=datetime(2026, 6, 10, 8, 0, tzinfo=UTC),
        _mode_recommendations=[],
        _charging_metrics=None,
        _timeline_data=[{"time": "2026-06-10T08:00:00+00:00", "spot_price": 1.0}],
    )
    sensor._get_max_battery_capacity = lambda: 10.0

    _save_forecast_to_coordinator(sensor)

    assert "timeline_data" in coord.battery_forecast_data


# ---------------------------------------------------------------------------
# Review-finding regression tests
# ---------------------------------------------------------------------------


def test_derive_overflow_windows_naive_timestamps_become_aware():
    """Bug 1: _derive_overflow_windows must produce tz-aware ISO strings from naive OTE input.

    OTE produces timestamps like "2026-06-10T08:15:00" (no tz offset).  After
    _derive_overflow_windows these must carry timezone info so that
    _parse_adapter_datetime -> _overlap_fraction does not raise TypeError when
    comparing against tz-aware slot.start.
    """
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _derive_overflow_windows,
    )

    # Naive timestamps (no tz offset) — as produced by the OTE pipeline.
    naive_timeline = [
        {"time": "2026-06-10T10:00:00", "solar_kwh": 2.0, "load_kwh": 0.5, "battery_capacity_kwh": 9.9},
        {"time": "2026-06-10T10:15:00", "solar_kwh": 2.5, "load_kwh": 0.5, "battery_capacity_kwh": 9.9},
        {"time": "2026-06-10T10:30:00", "solar_kwh": 0.1, "load_kwh": 1.5, "battery_capacity_kwh": 8.0},
    ]
    windows = _derive_overflow_windows(naive_timeline, max_capacity_kwh=10.0)

    assert len(windows) == 1
    win = windows[0]
    # start and end must be tz-aware (parseable to tz-aware datetime).
    from datetime import datetime as _dt
    start_dt = _dt.fromisoformat(win["start"])
    end_dt = _dt.fromisoformat(win["end"])
    assert start_dt.tzinfo is not None, "start must be tz-aware"
    assert end_dt.tzinfo is not None, "end must be tz-aware"


def test_derive_spot_prices_naive_timestamps_become_aware():
    """Bug 3: _derive_spot_prices_czk_kwh must produce tz-aware ISO keys from naive OTE input.

    Slot.start is always tz-aware.  If spot-price dict keys are naive the lookup
    in _spot_price_for_slot always misses, falling back to daily average instead
    of per-slot price.  After this fix the keys must be tz-aware so they match.
    """
    from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
        _derive_spot_prices_czk_kwh,
    )

    # Naive timestamps — OTE format.
    naive_timeline = [
        {"time": "2026-06-10T08:00:00", "spot_price": 1.5},
        {"time": "2026-06-10T08:15:00", "spot_price": 2.0},
    ]
    result = _derive_spot_prices_czk_kwh(naive_timeline)

    assert len(result) == 2
    from datetime import datetime as _dt
    for key in result:
        key_dt = _dt.fromisoformat(key)
        assert key_dt.tzinfo is not None, f"key {key!r} must be tz-aware"


def test_parse_adapter_datetime_naive_string_becomes_aware():
    """Bug 1/3: _parse_adapter_datetime must normalize naive strings to tz-aware.

    Previously dt_util.parse_datetime returned a naive datetime for naive ISO
    strings.  That caused TypeError in _overlap_fraction (max(aware, naive)).
    """
    from custom_components.oig_cloud.boiler.runtime import _parse_adapter_datetime

    result = _parse_adapter_datetime("2026-06-10T08:00:00")
    assert result is not None
    assert result.tzinfo is not None, "naive string must be normalized to tz-aware"


def test_parse_adapter_datetime_naive_datetime_becomes_aware():
    """Bug 1: _parse_adapter_datetime must also normalize naive datetime objects."""
    from datetime import datetime as _dt
    from custom_components.oig_cloud.boiler.runtime import _parse_adapter_datetime

    naive = _dt(2026, 6, 10, 8, 0, 0)  # no tzinfo
    result = _parse_adapter_datetime(naive)
    assert result is not None
    assert result.tzinfo is not None, "naive datetime must be normalized to tz-aware"


def test_parse_adapter_datetime_aware_string_unchanged():
    """Already tz-aware strings must pass through unchanged."""
    from custom_components.oig_cloud.boiler.runtime import _parse_adapter_datetime
    from datetime import timezone

    result = _parse_adapter_datetime("2026-06-10T08:00:00+00:00")
    assert result is not None
    assert result.tzinfo is not None
    assert result.tzinfo == timezone.utc or result.utcoffset().total_seconds() == 0


@pytest.mark.asyncio
async def test_adapter_old_firmware_missing_overflow_windows_key_is_graceful():
    """Bug 2: battery_forecast_data present but without overflow_windows key must not give INPUT_STALE_PV.

    Older firmware produces battery_forecast_data with timeline_data but no
    overflow_windows key.  The adapter must treat this as degraded-but-live
    (no stale code) rather than treating it as stale PV input.
    """
    domain_data = {
        "entry_1": {
            "coordinator": SimpleNamespace(
                battery_forecast_data={
                    # Old firmware: has timeline_data but lacks overflow_windows key.
                    "timeline_data": [{"time": "2026-06-10T08:00:00+00:00"}],
                    "spot_prices_czk_kwh": {"2026-06-10T08:00:00+00:00": 1.5},
                    # No "overflow_windows" key at all.
                }
            )
        }
    }
    adapter = _make_adapter(domain_data)
    energy_input = await adapter.async_get_energy_input()

    # No overflow data is fine — empty list, no stale code.
    assert energy_input.overflow_windows == []
    assert PlannerReasonCode.INPUT_STALE_PV not in energy_input.reason_codes


@pytest.mark.asyncio
async def test_adapter_spot_price_naive_keys_match_aware_slot_start():
    """Bug 3: spot prices stored with tz-aware keys must match tz-aware slot.start lookups.

    After fix, _parse_adapter_datetime normalizes naive keys to tz-aware, so the
    lookup in _spot_price_for_slot (which uses slot.start, always tz-aware) succeeds
    and returns the per-slot price rather than falling back to the daily average.
    """
    from datetime import timezone
    from custom_components.oig_cloud.boiler.runtime import _parse_adapter_datetime

    # Simulate OTE naive timestamp as stored in spot_prices_czk_kwh dict key.
    naive_key = "2026-06-10T08:00:00"
    aware_key = _parse_adapter_datetime(naive_key)
    assert aware_key is not None

    # Simulate slot.start (always tz-aware, UTC).
    slot_start = datetime(2026, 6, 10, 8, 0, 0, tzinfo=timezone.utc)

    # The two should be equal (same instant) so dict lookup succeeds.
    assert aware_key == slot_start, (
        f"Parsed aware key {aware_key!r} does not equal slot_start {slot_start!r}; "
        "spot price lookup would silently miss"
    )


def test_last_plan_had_stale_inputs_detection():
    """Cached plans built with stale inputs must not be served for their whole
    validity window (startup race: boiler plans before battery publishes)."""
    from types import SimpleNamespace as NS
    from custom_components.oig_cloud.boiler.runtime import BoilerRuntime

    probe = BoilerRuntime.__new__(BoilerRuntime)

    probe.last_plan_result = NS(
        reason_codes=[PlannerReasonCode.INPUT_STALE_PRICE]
    )
    assert probe._last_plan_had_stale_inputs() is True

    probe.last_plan_result = NS(reason_codes=[PlannerReasonCode.INPUT_STALE_PV])
    assert probe._last_plan_had_stale_inputs() is True

    probe.last_plan_result = NS(
        reason_codes=[PlannerReasonCode.COMFORT_SATISFIED]
    )
    assert probe._last_plan_had_stale_inputs() is False

    probe.last_plan_result = None
    assert probe._last_plan_had_stale_inputs() is False
