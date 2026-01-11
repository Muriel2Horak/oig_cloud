from __future__ import annotations

from types import SimpleNamespace

from custom_components.oig_cloud.battery_forecast.planning import scenario_analysis


class DummySensor:
    def __init__(self):
        self._log_rate_limited = lambda *_args, **_kwargs: None


def test_iter_interval_inputs_handles_mismatch_and_bad_time(monkeypatch):
    sensor = DummySensor()

    def fake_get_solar_for_timestamp(_ts, _forecast, log_rate_limited=None):
        return 1.25

    monkeypatch.setattr(
        scenario_analysis, "get_solar_for_timestamp", fake_get_solar_for_timestamp
    )

    spot_prices = [
        {"time": "2025-01-01T12:00:00", "price": 3.0},
        {"time": "bad", "price": 2.0},
    ]
    export_prices = [{"price": 1.5}]
    load_forecast = [0.4]

    rows = list(
        scenario_analysis._iter_interval_inputs(
            sensor,
            spot_prices=spot_prices,
            export_prices=export_prices,
            solar_forecast={},
            load_forecast=load_forecast,
        )
    )

    assert rows[0][0] == 0
    assert rows[0][2] == 3.0
    assert rows[0][3] == 1.5
    assert rows[0][4] == 0.4
    assert rows[0][5] == 1.25

    assert rows[1][0] == 1
    assert rows[1][2] == 2.0
    assert rows[1][3] == 0.0
    assert rows[1][4] == 0.0
    assert rows[1][5] == 0.0
