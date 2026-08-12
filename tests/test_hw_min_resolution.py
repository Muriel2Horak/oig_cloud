"""Part A (F1 h-w1): hw_min sensor-first resolution.

``_run_planner`` used to hardcode ``hw_min_kwh = max_capacity * 0.20``, never
consulting the box's own bat_min sensor (already read elsewhere via
``_resolve_proxy_bat_min_pct`` for the planning-floor safety margin). This
covers the pure resolution helper (sensor available / unavailable /
implausible) and a golden resolved-value assertion proving default config +
absent sensor preserves the prior hardcoded fraction.
"""

from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

from custom_components.oig_cloud.battery_forecast.planning import (
    forecast_update as forecast_update_module,
)

_resolve_hw_min_kwh = forecast_update_module._resolve_hw_min_kwh
_run_planner = forecast_update_module._run_planner


# --- Pure helper: sensor available / unavailable / implausible ---------------


def test_hw_min_uses_sensor_value_when_available():
    assert _resolve_hw_min_kwh(2.5, 10.0) == 2.5


def test_hw_min_uses_configured_fraction_when_sensor_unavailable():
    assert _resolve_hw_min_kwh(None, 10.0, fallback_fraction=0.35) == 3.5


def test_hw_min_sensor_precedes_configured_fraction():
    assert _resolve_hw_min_kwh(2.5, 10.0, fallback_fraction=0.35) == 2.5


def test_hw_min_falls_back_when_sensor_unavailable():
    assert _resolve_hw_min_kwh(None, 10.0) == 10.0 * forecast_update_module._HW_MIN_FRACTION


def test_hw_min_falls_back_when_sensor_implausible_above_max():
    assert _resolve_hw_min_kwh(10.0, 10.0) == 10.0 * forecast_update_module._HW_MIN_FRACTION
    assert _resolve_hw_min_kwh(15.0, 10.0) == 10.0 * forecast_update_module._HW_MIN_FRACTION


def test_hw_min_falls_back_when_sensor_implausible_negative():
    assert _resolve_hw_min_kwh(-1.0, 10.0) == 10.0 * forecast_update_module._HW_MIN_FRACTION
    assert _resolve_hw_min_kwh(0.0, 10.0) == 10.0 * forecast_update_module._HW_MIN_FRACTION


# --- Golden _run_planner: default config, absent sensor == prior hardcoded ---


class _States:
    def get(self, _entity_id):  # cloud-only install: bat_min proxy entity absent
        return None


class _PlannerSensor:
    def __init__(self, options=None):
        self._config_entry = SimpleNamespace(options=options or {})
        self._charging_metrics: dict = {}
        self._plan_lock_until = None
        self._plan_lock_modes = None
        self._box_id = "123"
        self.hass = SimpleNamespace(states=_States())
        self._hass = self.hass
        self._log_calls: list = []

    def _log_rate_limited(self, key, level, message, *args, **kwargs):
        self._log_calls.append((key, level, message))

    def _get_solar_forecast(self):
        return {}

    def _create_mode_recommendations(self, timeline, hours_ahead=48):
        return []


def _price_series(count: int, price: float) -> list[dict]:
    start = datetime(2025, 1, 1, 0, 0, tzinfo=timezone.utc)
    return [
        {"time": (start.replace(hour=i % 24)).isoformat(), "price": price}
        for i in range(count)
    ]


def _run(sensor: _PlannerSensor):
    n = 8
    box_floor = forecast_update_module._capture_box_floor_snapshot(sensor)
    return _run_planner(
        sensor,
        _price_series(n, 2.0),
        _price_series(n, 1.0),
        [0.3] * n,
        [0.0] * n,
        current_capacity=5.0,
        max_capacity=10.0,
        box_floor=box_floor,
        run_id="test-run",
        correlation_id="test-corr",
    )


def test_hw_min_default_config_preserves_prior_hardcoded_fraction():
    """No override preserves the pre-change hardcoded 20% resolution."""
    sensor = _PlannerSensor(options={})
    configured_fraction = sensor._config_entry.options.get(
        "hw_min_fraction", forecast_update_module._HW_MIN_FRACTION
    )

    assert _resolve_hw_min_kwh(
        None, 10.0, fallback_fraction=configured_fraction
    ) == 10.0 * 0.20


def test_run_planner_uses_configured_hw_min_fraction():
    sensor = _PlannerSensor(options={"hw_min_fraction": 0.35})

    _, mode_result, _ = _run(sensor)

    assert mode_result["planning_min_kwh"] == 3.7
