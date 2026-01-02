from __future__ import annotations

from datetime import datetime, timedelta
from types import SimpleNamespace

from custom_components.oig_cloud.entities.adaptive_load_profiles_sensor import (
    OigCloudAdaptiveLoadProfilesSensor,
    _generate_profile_name,
    _get_season,
)


class DummyCoordinator:
    def __init__(self):
        self.data = {}
        self.forced_box_id = "123"
        self.hass = None

    def async_add_listener(self, *_args, **_kwargs):
        return lambda: None


def _make_sensor():
    coordinator = DummyCoordinator()
    entry = SimpleNamespace()
    device_info = {"identifiers": {("oig_cloud", "123")}}
    return OigCloudAdaptiveLoadProfilesSensor(
        coordinator,
        "adaptive_load_profiles",
        entry,
        device_info,
    )


def test_get_season():
    assert _get_season(datetime(2025, 1, 1)) == "winter"
    assert _get_season(datetime(2025, 4, 1)) == "spring"
    assert _get_season(datetime(2025, 7, 1)) == "summer"
    assert _get_season(datetime(2025, 10, 1)) == "autumn"


def test_generate_profile_name_winter_heating():
    hourly = [0.6] * 18 + [1.6] * 6
    name = _generate_profile_name(hourly, "winter", False)
    assert name == "Pracovn\u00ed den s topen\u00edm"


def test_generate_profile_name_weekend_morning_spike():
    hourly = [0.4] * 6 + [1.2] * 6 + [0.4] * 12
    name = _generate_profile_name(hourly, "spring", True)
    assert name == "V\u00edkend s pran\u00edm"


def test_generate_profile_name_invalid_length():
    assert _generate_profile_name([1.0], "summer", False) == "Nezn\u00e1m\u00fd profil"


def test_fill_missing_values_linear():
    sensor = _make_sensor()
    filled, interpolated = sensor._fill_missing_values(
        [1.0, None, 3.0],
        hour_medians={1: 2.0},
        day_avg=2.0,
        global_median=2.0,
    )
    assert filled == [1.0, 2.0, 3.0]
    assert interpolated == 1


def test_build_daily_profiles_interpolates():
    sensor = _make_sensor()
    day1 = datetime(2025, 1, 1)
    day2 = datetime(2025, 1, 2)
    hourly_series = []

    for hour in range(24):
        if hour not in (5, 6):
            hourly_series.append((day1.replace(hour=hour), 1.0))
    for hour in range(24):
        hourly_series.append((day2.replace(hour=hour), 2.0))

    profiles, medians, interpolated = sensor._build_daily_profiles(hourly_series)

    assert len(profiles) == 2
    assert medians[5] == 2.0
    assert interpolated[day1.date()] == 2
    assert profiles[day1.date()][5] == 1.0


def test_build_72h_profiles():
    sensor = _make_sensor()
    base = datetime(2025, 1, 1).date()
    daily_profiles = {
        base: [1.0] * 24,
        base + timedelta(days=1): [2.0] * 24,
        base + timedelta(days=2): [3.0] * 24,
    }
    profiles = sensor._build_72h_profiles(daily_profiles)

    assert len(profiles) == 1
    assert profiles[0]["total_consumption"] == 144.0
    assert len(profiles[0]["consumption_kwh"]) == 72


def test_build_current_match(monkeypatch):
    sensor = _make_sensor()
    fixed_now = datetime(2025, 1, 2, 5, 0, 0)
    monkeypatch.setattr(
        "custom_components.oig_cloud.entities.adaptive_load_profiles_sensor.dt_util.now",
        lambda: fixed_now,
    )

    hourly_series = [
        (datetime(2025, 1, 1, hour), 1.0) for hour in range(24)
    ] + [(datetime(2025, 1, 2, hour), 2.0) for hour in range(5)]
    hour_medians = {hour: 1.0 for hour in range(24)}

    match = sensor._build_current_match(hourly_series, hour_medians)

    assert match is not None
    assert len(match) == 29
    assert match[0] == 1.0
    assert match[-1] == 2.0


def test_apply_floor_to_prediction():
    sensor = _make_sensor()
    predicted = [0.1, 0.2]
    adjusted, applied = sensor._apply_floor_to_prediction(
        predicted,
        start_hour=0,
        hour_medians={0: 1.0, 1: 1.0},
        recent_match=[1.0] * 24,
    )

    assert applied == 2
    assert adjusted[0] >= 0.35
    assert adjusted[1] >= 0.35


def test_calculate_profile_similarity():
    sensor = _make_sensor()
    score = sensor._calculate_profile_similarity([1.0, 2.0], [1.0, 2.0])
    assert score > 0.99

    mismatch = sensor._calculate_profile_similarity([1.0], [1.0, 2.0])
    assert mismatch == 0.0
