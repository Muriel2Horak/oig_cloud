"""Contract guards for the three classified operational warnings.

None of these warnings is a code defect (see
``docs/operational_warnings_classification.md``). These tests pin the *decided*
contract so a future change cannot silently:

  - downgrade a truthful severity (masking a real condition), or
  - break the ``hw_min`` resolution precedence (sensor -> config -> constant).

They are not RED-before-fix tests: there is no code fix under test here. They
protect a deliberate decision.
"""
from __future__ import annotations

import math

import pytest

from custom_components.oig_cloud.battery_forecast.planning.forecast_update import (
    _HW_MIN_FRACTION,
    _resolve_hw_min_kwh,
)


# --------------------------------------------------------------------------
# hw_min precedence: sensor > config > constant fallback
# --------------------------------------------------------------------------


def test_hw_min_uses_sensor_when_valid():
    """A plausible sensor value wins over every fallback."""
    result = _resolve_hw_min_kwh(
        sensor_min_kwh=1.5, max_capacity=10.0, fallback_fraction=0.99
    )
    assert result == 1.5


@pytest.mark.parametrize("bad_sensor", [None, 0.0, -1.0, 10.0, 11.0])
def test_hw_min_rejects_implausible_sensor_and_uses_config(caplog, bad_sensor):
    """Zero, negative, or >= max_capacity sensor values fall back to config."""
    caplog.set_level("WARNING")
    # 30% configured fraction
    result = _resolve_hw_min_kwh(
        sensor_min_kwh=bad_sensor, max_capacity=10.0, fallback_fraction=0.30
    )
    assert math.isclose(result, 3.0)
    # The warning must fire and stay at WARNING severity (truthful condition).
    assert any(
        "hw_min sensor unavailable or implausible" in rec.message
        and rec.levelname == "WARNING"
        for rec in caplog.records
    )


def test_hw_min_uses_constant_when_no_config(caplog):
    """No configured fraction -> 20% hardware-floor constant."""
    caplog.set_level("WARNING")
    result = _resolve_hw_min_kwh(sensor_min_kwh=None, max_capacity=10.0)
    assert math.isclose(result, 10.0 * _HW_MIN_FRACTION)
    assert any(
        "hw_min sensor unavailable or implausible" in rec.message
        and rec.levelname == "WARNING"
        for rec in caplog.records
    )


def test_hw_min_constant_is_twenty_percent():
    """The documented hardware floor is 20% (CBB 3F Home Plus Premium)."""
    assert _HW_MIN_FRACTION == 0.20


def test_hw_min_warning_retains_warning_severity_even_when_configured(caplog):
    """A dead sensor path stays WARNING even with a configured fraction.

    This pins the 'retain truthful severity' decision: downgrading to INFO/DEBUG
    when a config fraction exists would hide that the sensor path is unhealthy.
    """
    caplog.set_level("WARNING")
    _resolve_hw_min_kwh(
        sensor_min_kwh=None, max_capacity=10.0, fallback_fraction=0.20
    )
    levels = {
        rec.levelname
        for rec in caplog.records
        if "hw_min sensor unavailable or implausible" in rec.message
    }
    assert levels == {"WARNING"}, (
        f"hw_min fallback severity regressed to {levels}; expected WARNING"
    )


# --------------------------------------------------------------------------
# Boiler schedule restore: warning text and severity are source-pinned
# --------------------------------------------------------------------------


def test_boiler_schedule_restore_skip_is_warning_level():
    """The legacy unversioned schedule skip must remain WARNING.

    Guards the classification: a stale-schema schedule is intentionally skipped
    and the operator must be told, not silently ignored.
    """
    import inspect

    from custom_components.oig_cloud.boiler import actuator

    src = inspect.getsource(actuator._restore_boiler_schedule)
    assert "Skipping legacy unversioned boiler schedule restore" in src
    # The skip message must be emitted via warning(), not downgraded to info/debug.
    assert '_LOGGER.warning(' in src


# --------------------------------------------------------------------------
# Cloud->local fallback: incident warning is source-pinned
# --------------------------------------------------------------------------


def test_cloud_to_local_fallback_is_warning_level():
    """The cloud->local fallback incident must remain WARNING."""
    import inspect

    from custom_components.oig_cloud.core import data_source

    src = inspect.getsource(data_source.DataSourceController._async_emit_fallback_incident)
    assert "Data source fallback emitted" in src
    assert "_LOGGER.warning" in src
