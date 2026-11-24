"""The multi-box planner replay on synthetic slots (no Influx needed)."""

from __future__ import annotations

import importlib.util
import math
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("replay_boxes", ROOT / "scripts" / "replay_boxes.py")
replay = importlib.util.module_from_spec(spec)
spec.loader.exec_module(replay)

TZ = ZoneInfo("Europe/Prague")
T0 = int(datetime(2026, 11, 10, tzinfo=TZ).timestamp())


def _slots(days: int, *, gap_at: int | None = None):
    rows = []
    for i in range(days * 96):
        if gap_at is not None and i == gap_at:
            continue
        hour = (i % 96) / 4
        rows.append(
            {
                "t": T0 + 900 * i,
                "load_kwh": 0.5 if 17 <= hour < 21 else 0.2,
                "pv_kwh": 0.3 if 10 <= hour < 14 else 0.0,
                "soc_pct": 50.0,
                "import_price": 9.0 if 17 <= hour < 21 else 5.0,
                "export_price": 1.0,
            }
        )
    return rows


BOX = {"capacity_kwh": 10.0, "bat_min_pct": 20.0, "charge_kw": 2.6}


def test_prices_become_visible_for_tomorrow_at_one_o_clock():
    morning = int(datetime(2026, 11, 10, 9, tzinfo=TZ).timestamp())
    afternoon = int(datetime(2026, 11, 10, 14, tzinfo=TZ).timestamp())
    far = T0 + 10 * 86400
    assert replay.known_until(morning, far) == int(datetime(2026, 11, 11, tzinfo=TZ).timestamp())
    assert replay.known_until(afternoon, far) == int(datetime(2026, 11, 12, tzinfo=TZ).timestamp())


def test_profile_is_the_same_quarter_on_previous_days():
    load = {T0: 0.2, T0 + 86400: 0.4}
    assert replay.profile_load(load, T0 + 2 * 86400) == pytest.approx(0.3)


@pytest.mark.parametrize("variant", list(replay.VARIANTS))
def test_every_variant_replays_a_box(variant):
    result = replay.replay_box(_slots(3), BOX, variant=variant)

    assert result["days"] == pytest.approx(2.0, abs=0.05)
    assert math.isfinite(result["money_czk"]) and math.isfinite(result["adjusted_czk"])
    assert result["discharged_kwh"] > 0  # the evening peak is served from the battery


def test_gaps_split_an_install_into_runs():
    runs = replay.contiguous_runs(_slots(5, gap_at=2 * 96 + 10), min_days=2.0)
    assert [len(run) for run in runs] == [2 * 96 + 10, 3 * 96 - 11]


def test_main_needs_influx_settings(monkeypatch, capsys):
    for key in ("INFLUX_URL", "INFLUX_TOKEN", "INFLUX_ORG"):
        monkeypatch.delenv(key, raising=False)
    assert replay.main([]) == 2
