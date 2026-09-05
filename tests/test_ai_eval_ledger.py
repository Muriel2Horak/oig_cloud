"""Unit tests for the rolling anomaly ledger (pure)."""
from custom_components.oig_cloud.ai_eval import ledger as L


def _ev(kind, at="t", detail="d"):
    return {"kind": kind, "at": at, "detail": detail}


def test_add_events_stamps_and_keeps():
    out = L.add_events([], [_ev("grid_skok"), _ev("nerovnovaha")], now_ts=1000.0)
    assert len(out) == 2
    assert all(e["ts"] == 1000.0 for e in out)


def test_same_kind_within_15min_is_a_continuation_not_a_new_row():
    base = L.add_events([], [_ev("nerovnovaha")], now_ts=1000.0)
    # next tick, 5 min later, same kind still ongoing -> not re-added
    nxt = L.add_events(base, [_ev("nerovnovaha")], now_ts=1000.0 + 300)
    assert len(nxt) == 1


def test_different_kind_is_added_even_if_recent():
    base = L.add_events([], [_ev("nerovnovaha")], now_ts=1000.0)
    nxt = L.add_events(base, [_ev("grid_skok")], now_ts=1000.0 + 60)
    assert {e["kind"] for e in nxt} == {"nerovnovaha", "grid_skok"}


def test_prune_drops_entries_outside_the_window():
    old = {"ts": 0.0, "kind": "x", "at": "t", "detail": "d"}
    new = {"ts": 100000.0, "kind": "y", "at": "t", "detail": "d"}
    kept = L.prune([old, new], now_ts=100000.0, window_hours=23)
    assert [e["kind"] for e in kept] == ["y"]


def test_format_empty_and_nonempty():
    assert L.format_for_prompt([]) == "(zatím prázdný)"
    txt = L.format_for_prompt([{"at": "09:41", "kind": "grid_skok", "detail": "sit +4kW"}])
    assert "09:41 | grid_skok | sit +4kW" == txt
