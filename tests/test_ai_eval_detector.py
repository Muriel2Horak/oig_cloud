"""Unit tests for the pure hourly-eval detector (no HA deps)."""
from custom_components.oig_cloud.ai_eval import detector as det


def _label(i):
    return f"t{i}"


def _grid(n, **series):
    """Build a metric->list grid, filling absent metrics with zeros."""
    keys = ["grid", "gr_r", "gr_s", "gr_t", "zal", "zal_r", "zal_s", "zal_t",
            "nez", "nez_r", "nez_s", "nez_t", "fve", "bat", "soc",
            "v_r", "v_s", "v_t", "freq", "invT", "batT", "byp", "mode"]
    g = {k: series.get(k, [0.0] * n) for k in keys}
    return g


def test_forward_fill_carries_last_value_onto_grid():
    # samples at t=0 ->10, t=45 ->20; grid step 20s, n=4 -> [10,10,20,20]
    out = det.forward_fill([(0.0, 10.0), (45.0, 20.0)], start_ts=0.0, n=4, step_s=20)
    assert out == [10.0, 10.0, 10.0, 20.0]  # 20 applies from t>=45 (tick t=60)


def test_forward_fill_keeps_non_numeric_state():
    out = det.forward_fill([(0.0, "off"), (30.0, "on")], start_ts=0.0, n=3, step_s=20)
    assert out == ["off", "off", "on"]  # "on" at t=30 applies from tick t=40


def test_grid_spike_is_detected_once():
    n = 6
    grid = [100.0, 100.0, 100.0, 4800.0, 4800.0, 4800.0]  # jump at i=3
    ev = det.detect_events(_grid(n, grid=grid), n, _label)
    spikes = [e for e in ev if e["kind"] == "grid_skok"]
    assert len(spikes) == 1
    assert spikes[0]["i"] == 3


def test_sustained_imbalance_does_not_oscillate_into_many_events():
    # phase T sits ~1.5kW the whole hour, others near zero -> ONE event, not N
    n = 40
    zal_t = [1500.0] * n
    ev = det.detect_events(_grid(n, zal_t=zal_t), n, _label)
    imb = [e for e in ev if e["kind"] == "nerovnovaha"]
    assert len(imb) == 1


def test_phase_over_limit_flags_faze_limit():
    n = 5
    zal_r = [3400.0] * n  # over 3300 W
    ev = det.detect_events(_grid(n, zal_r=zal_r), n, _label)
    assert any(e["kind"] == "faze_limit" for e in ev)


def test_recovery_after_long_minimum_fires_only_after_an_hour_low():
    # SoC pinned at 25% for the whole window, then charging -> needs >=60 min low.
    # With prior_low_soc_minutes=60 the very first charging tick qualifies.
    n = 5
    soc = [25.0] * n
    bat = [0.0, 0.0, 5000.0, 5000.0, 5000.0]  # charging from i=2
    ev = det.detect_events(_grid(n, soc=soc, bat=bat), n, _label,
                           prior_low_soc_minutes=60.0)
    assert any(e["kind"] == "dobijeni_po_minimu" for e in ev)


def test_recovery_does_not_fire_when_battery_was_not_long_low():
    n = 5
    soc = [25.0] * n
    bat = [0.0, 0.0, 5000.0, 5000.0, 5000.0]
    ev = det.detect_events(_grid(n, soc=soc, bat=bat), n, _label,
                           prior_low_soc_minutes=0.0)
    assert not any(e["kind"] == "dobijeni_po_minimu" for e in ev)


def test_event_snapshot_indices_merge_overlapping_windows():
    events = [{"i": 3}, {"i": 5}]
    idx = det.event_snapshot_indices(events, n=20, win=2)
    assert idx == [1, 2, 3, 4, 5, 6, 7]
