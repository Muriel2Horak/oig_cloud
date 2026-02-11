from __future__ import annotations

from custom_components.oig_cloud import sensor as sensor_module
from custom_components.oig_cloud.battery_forecast.sensors import recommended_sensor


def test_extract_sensor_type_without_suffix_returns_none():
    assert sensor_module._extract_sensor_type("sensor.oig_123") is None


def test_recommended_sensor_tzinfo_from_naive_timestamp_returns_none():
    assert (
        recommended_sensor.OigCloudPlannerRecommendedModeSensor._tzinfo_from_timestamp(
            "2026-01-01T10:15:00"
        )
        is None
    )
