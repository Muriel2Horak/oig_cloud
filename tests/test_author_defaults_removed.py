"""P7 — author installation defaults removed.

Per SCOPE-REVISION R5.5 (binding), a missing-configuration warning MUST be visible on a
mounted surface (not log-only). Per Plan 4 Task 4, the author's hardcoded installation
values (GPS, 15.36 kWh capacity, scenario thresholds, classifier cold-inlet) must be
removed from runtime code and replaced with sensor-first / options-first reads.

These tests fail on the unchanged tree because:
- the literals 50.1219800 / 13.9373742 / 15.36 are still used as defaults;
- the solar forecast sensor does not expose a `warning` attribute when GPS is absent;
- the live activity classifier still uses the module-level `_COLD_INLET_TEMP_C=10.0`
  fallback at the call site (classifier.py:180), bypassing user configuration.
"""

from __future__ import annotations

import inspect
from pathlib import Path

import pytest

# --- Source-level guards -----------------------------------------------------


REPO_ROOT = Path(__file__).resolve().parents[1]


def _read(rel: str) -> str:
    return (REPO_ROOT / "custom_components" / "oig_cloud" / rel).read_text()


def test_no_author_gps_defaults_in_validation_module():
    """config/validation.py must not embed the author's GPS as a parameter default."""
    src = _read("config/validation.py")
    # The author coordinates appear ONLY in tests/fixtures/translations,
    # never as runtime defaults.
    assert "50.1219800" not in src, (
        "Author GPS literal 50.1219800 is still a default in config/validation.py"
    )
    assert "13.9373742" not in src, (
        "Author GPS literal 13.9373742 is still a default in config/validation.py"
    )


def test_no_author_gps_defaults_in_solar_sensor():
    """entities/solar_forecast_sensor.py must not fall back to the author's GPS."""
    src = _read("entities/solar_forecast_sensor.py")
    assert "50.1219800" not in src, (
        "Author GPS literal 50.1219800 still used as options.get fallback at sensor:640"
    )
    assert "13.9373742" not in src, (
        "Author GPS literal 13.9373742 still used as options.get fallback at sensor:641"
    )


def test_no_author_roof_geometry_defaults_in_solar_sensor():
    """The 6 roof-geometry defaults at sensor:548-576 must be removed (not relocated).

    Original lines had `options.get("...declination", 10)`, `(..., 138)`, `(..., 5.4)` etc.
    After Task 4 these bare numeric fallbacks must be gone (sensor must read configured
    value, not fall back to the author's installation).
    """
    src = _read("entities/solar_forecast_sensor.py")
    # Strict regex-style guard: each known option key must not be followed by a
    # numeric default on the same call. We grep for the exact original lines.
    forbidden_patterns = (
        '"solar_forecast_string1_declination", 10',
        '"solar_forecast_string1_azimuth", 138',
        '"solar_forecast_string1_kwp", 5.4',
        '"solar_forecast_string2_declination", 10',
        '"solar_forecast_string2_azimuth", 138',
        '"solar_forecast_string2_kwp", 0',
    )
    leaked = [p for p in forbidden_patterns if p in src]
    assert not leaked, (
        "Author roof-geometry defaults still embedded as numeric fallbacks in "
        f"solar_forecast_sensor.py: {leaked}"
    )


def test_no_1536_capacity_literal_in_runtime_files():
    """15.36 kWh is the author's installation value; it must not appear in runtime code."""
    runtime_files = (
        "battery_forecast/physics/interval_simulator.py",
        "battery_forecast/config.py",
        "battery_forecast/balancing/executor.py",
        "battery_forecast/storage/plan_storage_baseline.py",
    )
    for rel in runtime_files:
        src = _read(rel)
        assert "15.36" not in src, (
            f"Author capacity literal 15.36 still present in {rel}"
        )


# --- Runtime behaviour: R5.5 visible warning on the mounted surface ----------


class _DummyCoordinator:
    def __init__(self):
        self.forced_box_id = "123"

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


class _DummyConfigEntry:
    def __init__(self, options):
        self.options = options


def _make_solar_sensor(options):
    from custom_components.oig_cloud.entities.solar_forecast_sensor import (
        OigCloudSolarForecastSensor,
    )

    return OigCloudSolarForecastSensor(
        _DummyCoordinator(), "solar_forecast", _DummyConfigEntry(options), {}
    )


def test_solar_sensor_missing_gps_exposes_visible_warning():
    """R5.5: missing GPS must be visible on the mounted surface (extra_state_attributes).

    The user-visible attributes dict must contain a `warning` key and a `recovery_action`
    key when GPS is missing. This is the mounted surface that the dashboard / Lovelace
    cards actually render — a log line does not satisfy R5.5.
    """
    sensor = _make_solar_sensor(
        {"enable_solar_forecast": True, "solar_forecast_provider": "forecast_solar"}
    )  # no lat/lon
    attrs = sensor.extra_state_attributes
    assert "warning" in attrs, (
        "R5.5 violation: missing-GPS warning is NOT mounted on the sensor surface "
        f"(attrs keys: {sorted(attrs)})"
    )
    assert attrs["warning"], "warning attribute must be non-empty"
    assert "recovery_action" in attrs, (
        "R5.5 requires a visible recovery action alongside the warning"
    )
    assert attrs["recovery_action"], "recovery_action attribute must be non-empty"
    # The mounted warning must mention the missing piece (GPS / latitude).
    assert any(
        token in attrs["warning"].lower()
        for token in ("gps", "latitude", "longitude", "location")
    ), f"warning text does not identify the missing piece: {attrs['warning']!r}"


def test_solar_sensor_missing_gps_is_unavailable():
    """R5.5: the unavailable state must accompany the visible warning."""
    sensor = _make_solar_sensor(
        {"enable_solar_forecast": True, "solar_forecast_provider": "forecast_solar"}
    )  # no lat/lon
    assert sensor.available is False, (
        "Missing-GPS sensor must surface unavailable, not silently fall back"
    )
    assert sensor.state is None, "Missing-GPS sensor must return None state, not a number"


def test_solar_sensor_with_gps_is_available_and_no_warning():
    """When GPS is provided, the sensor is available AND no missing-config warning mounts."""
    sensor = _make_solar_sensor(
        {
            "enable_solar_forecast": True,
            "solar_forecast_provider": "forecast_solar",
            "solar_forecast_latitude": 50.0,
            "solar_forecast_longitude": 14.0,
        }
    )
    # The sensor must publish a positive `config_status` attribute so the dashboard
    # can tell "all required values present" from "missing GPS". On the unchanged tree
    # the attribute does not exist at all -> this assertion fails.
    attrs = sensor.extra_state_attributes
    assert attrs.get("config_status") == "ok", (
        "Sensor with GPS must surface config_status='ok' on the mounted surface; "
        f"got attrs={sorted(attrs)}"
    )
    # And no missing-config warning is mounted when GPS is provided.
    assert not attrs.get("warning"), (
        f"Sensor with GPS must not mount a warning, got: {attrs.get('warning')!r}"
    )


# --- Cold-inlet wiring in the live activity classifier -----------------------


def test_classifier_passes_cold_inlet_from_config():
    """classifier.py:180 must accept cold_inlet_c sourced from configuration.

    Before: `compute_ready_fraction(top_c=..., bottom_c=...)` — silently falls back
    to module-level `_COLD_INLET_TEMP_C = 10.0`, decoupled from the user's
    CONF_BOILER_COLD_INLET_TEMP_C setting.

    After: the call site must pass `cold_inlet_c=` so the configured value reaches
    `compute_ready_fraction`.
    """
    from custom_components.oig_cloud.boiler.classifier import BoilerActivityClassifier

    src = inspect.getsource(BoilerActivityClassifier.classify)
    assert "cold_inlet_c=" in src, (
        "BoilerActivityClassifier.classify() does not pass cold_inlet_c through; "
        "the live path still falls back to the module-level _COLD_INLET_TEMP_C=10.0"
    )
    assert "else _COLD_INLET_TEMP_C" not in src, (
        "BoilerActivityClassifier.classify() still falls back to _COLD_INLET_TEMP_C "
        "instead of using the caller-provided configured cold_inlet_c"
    )


# --- Scenario thresholds: literals removed (replaced by named module consts) --


def test_scenario_thresholds_have_no_bare_15_28_literals():
    """scenario_analysis.py:645-646 had `if price < 1.5: charge_amount = min(2.8 / 4.0, ...)`.

    The literals 1.5 and 2.8 are author installation values. After Task 4 they must be
    named module constants (so they can be audited and overridden), not bare inline
    literals at the call site.
    """
    src = _read("battery_forecast/planning/scenario_analysis.py")
    # The bare literal pattern at the original call site is gone — replaced by named constants.
    assert "if price < 1.5:" not in src, (
        "scenario_analysis.py still contains the bare 'if price < 1.5:' literal at "
        "the original call site"
    )
    assert "2.8 / 4.0" not in src, (
        "scenario_analysis.py still contains the bare '2.8 / 4.0' literal at the "
        "original call site"
    )


def test_default_simulator_config_capacity_is_explicitly_unavailable():
    """Default construction must not crash after removing the 15.36 kWh fallback."""
    from custom_components.oig_cloud.battery_forecast.config import SimulatorConfig

    cfg = SimulatorConfig()
    assert cfg.max_capacity_kwh is None
    assert cfg.min_capacity_kwh is None
    assert cfg.usable_capacity_kwh is None


@pytest.mark.asyncio
async def test_migration_preseeds_legacy_effective_solar_defaults(monkeypatch):
    """Upgrade path: old entries keep the effective values the removed defaults provided."""
    from custom_components.oig_cloud import config_migration

    class _ConfigEntries:
        def async_update_entry(self, entry, *, options=None, data=None):
            if options is not None:
                entry.options = options
            if data is not None:
                entry.data = data

    class _Hass:
        config_entries = _ConfigEntries()

    class _Entry:
        entry_id = "entry-author-defaults"
        data = {}

        def __init__(self):
            self.options = {
                "enable_solar_forecast": True,
                # Legacy planner key makes this an upgrade entry for the Task-2 migrator.
                "min_capacity_percent": 20.0,
            }

    class _Store:
        value = None

        def __init__(self, *_args, **_kwargs):
            pass

        async def async_load(self):
            return self.value

        async def async_save(self, payload):
            self.value = payload

    monkeypatch.setattr(config_migration, "Store", _Store)
    entry = _Entry()

    migrated = await config_migration.run_migration(_Hass(), entry)

    assert migrated is True
    assert entry.options["solar_forecast_provider"] == "forecast_solar"
    assert entry.options["solar_forecast_latitude"] == pytest.approx(50.1219800)
    assert entry.options["solar_forecast_longitude"] == pytest.approx(13.9373742)
    assert entry.options["solar_forecast_string1_enabled"] is True
    assert entry.options["solar_forecast_string1_declination"] == 10
    assert entry.options["solar_forecast_string1_azimuth"] == 138
    assert entry.options["solar_forecast_string1_kwp"] == pytest.approx(5.4)
    assert entry.options["_migration"]["complete"] is True
