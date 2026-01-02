from __future__ import annotations

from types import SimpleNamespace

from custom_components.oig_cloud.entities.chmu_sensor import OigCloudChmuSensor


class DummyCoordinator:
    def __init__(self, warning_data=None):
        self.forced_box_id = "123"
        self.chmu_warning_data = warning_data


class DummyConfigEntry:
    def __init__(self, options):
        self.options = options


class DummyHass:
    def __init__(self, lat=None, lon=None):
        self.config = SimpleNamespace(latitude=lat, longitude=lon)


def test_get_gps_coordinates_priority():
    coordinator = DummyCoordinator()
    entry = DummyConfigEntry(
        {
            "enable_solar_forecast": True,
            "solar_forecast_latitude": 50.1,
            "solar_forecast_longitude": 14.2,
        }
    )
    sensor = OigCloudChmuSensor(coordinator, "chmu_warning_level", entry, {})
    sensor.hass = DummyHass(lat=49.0, lon=13.0)

    lat, lon = sensor._get_gps_coordinates()
    assert lat == 50.1
    assert lon == 14.2


def test_get_gps_coordinates_fallback_to_ha():
    coordinator = DummyCoordinator()
    entry = DummyConfigEntry({"enable_solar_forecast": False})
    sensor = OigCloudChmuSensor(coordinator, "chmu_warning_level", entry, {})
    sensor.hass = DummyHass(lat=49.0, lon=13.0)

    lat, lon = sensor._get_gps_coordinates()
    assert lat == 49.0
    assert lon == 13.0


def test_compute_severity_global_and_local():
    warning_data = {
        "highest_severity_cz": 3,
        "severity_level": 2,
        "top_local_warning": {"event": "\u017d\u00e1dn\u00e1", "severity": 0},
    }

    coordinator = DummyCoordinator(warning_data)
    entry = DummyConfigEntry({})

    global_sensor = OigCloudChmuSensor(
        coordinator, "chmu_warning_level_global", entry, {}
    )
    global_sensor.hass = DummyHass()
    assert global_sensor._compute_severity() == 3

    local_sensor = OigCloudChmuSensor(coordinator, "chmu_warning_level", entry, {})
    local_sensor.hass = DummyHass()
    assert local_sensor._compute_severity() == 0


def test_extra_state_attributes_global_truncates_description():
    long_desc = "x" * 200
    warning_data = {
        "all_warnings_count": 2,
        "all_warnings": [
            {"event": "Test", "severity": 2, "description": long_desc}
        ],
        "last_update": "2025-01-01T00:00:00",
        "highest_severity_cz": 2,
    }

    coordinator = DummyCoordinator(warning_data)
    entry = DummyConfigEntry({})
    sensor = OigCloudChmuSensor(coordinator, "chmu_warning_level_global", entry, {})
    sensor.hass = DummyHass()
    sensor._last_warning_data = warning_data

    attrs = sensor.extra_state_attributes
    assert attrs["warnings_count"] == 2
    assert len(attrs["all_warnings"]) == 1
    assert attrs["all_warnings"][0]["description"].endswith("...")
