from __future__ import annotations

from datetime import timedelta

from homeassistant.util import dt as dt_util

from custom_components.oig_cloud.battery_forecast.sensors import recommended_sensor


class DummyCoordinator:
    def __init__(self):
        self.hass = None
        self.last_update_success = True

    def async_add_listener(self, _callback):
        return lambda: None


class DummyConfigEntry:
    def __init__(self, options):
        self.options = options
        self.data = options
        self.entry_id = "entry-id"


def test_compute_state_and_attrs_with_detail_tabs(monkeypatch):
    monkeypatch.setattr(
        "custom_components.oig_cloud.sensor_types.SENSOR_TYPES",
        {"planner_recommended_mode": {"name": "Recommended", "icon": "mdi:robot"}},
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.base_sensor.resolve_box_id",
        lambda _coord: "123",
    )

    coordinator = DummyCoordinator()
    config_entry = DummyConfigEntry({"auto_mode_switch_lead_seconds": 180.0})

    sensor = recommended_sensor.OigCloudPlannerRecommendedModeSensor(
        coordinator,
        "planner_recommended_mode",
        config_entry,
        device_info={},
        hass=None,
    )

    now = dt_util.now()
    current_start = now.replace(
        minute=(now.minute // 15) * 15, second=0, microsecond=0
    )
    next_start = current_start + timedelta(minutes=15)

    intervals = [
        {
            "time": current_start.strftime("%H:%M"),
            "planned": {"mode": 0, "mode_name": "HOME 1"},
        },
        {
            "time": next_start.strftime("%H:%M"),
            "planned": {"mode": 3, "mode_name": "HOME UPS"},
        },
    ]

    sensor._precomputed_payload = {
        "timeline_data": [],
        "calculation_time": now.isoformat(),
        "detail_tabs": {
            "today": {
                "date": current_start.date().isoformat(),
                "intervals": intervals,
            }
        },
    }

    value, attrs, _sig = sensor._compute_state_and_attrs()

    assert value == "Home 1"
    assert attrs["next_mode"] == "Home UPS"

    effective_from = dt_util.parse_datetime(attrs["recommended_effective_from"])
    next_change = dt_util.parse_datetime(attrs["next_mode_change_at"])
    assert (next_change - effective_from).total_seconds() == 180.0
