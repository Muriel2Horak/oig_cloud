"""The compact situation snapshot the AI advisor reasons over.

The old prompt saw eight 15-minute rows and nothing else, and its "SoC %"
column carried kWh. These tests pin the snapshot that replaces it: real
numbers, precomputed windows, and only data the owner opted into.
"""
from __future__ import annotations

from datetime import datetime, timedelta

from custom_components.oig_cloud.ai_eval import snapshot as snap

NOW = datetime(2026, 11, 5, 14, 5)
CAP = 15.36


def _iv(t: datetime, mode: str, price: float, soc_kwh: float, **kw):
    row = {
        "time": t.strftime("%Y-%m-%dT%H:%M:%S"),
        "mode_name": mode,
        "spot_price": price,
        "export_price_czk": round(price / 2, 2),
        "battery_soc": soc_kwh,
        "solar_kwh": kw.pop("solar", 0.0),
        "load_kwh": kw.pop("load", 0.25),
        "grid_charge_kwh": kw.pop("charge", 0.0),
    }
    row.update(kw)
    return row


def _timeline():
    rows = []
    start = datetime(2026, 11, 5, 13, 45)  # one past interval, must be dropped
    for i in range(4 * 36):
        t = start + timedelta(minutes=15 * i)
        h = t.hour
        tomorrow = t.date() == NOW.date() + timedelta(days=1)
        # tomorrow 11-14 is the cheapest stretch, 17-20 the most expensive
        if tomorrow and 11 <= h < 14:
            price = 0.8
        elif 17 <= h < 20:
            price = 13.0
        else:
            price = 9.0
        mode = "HOME UPS" if (tomorrow and 1 <= h < 4) else "HOME I"
        charge = 0.7 if mode == "HOME UPS" else 0.0
        extra = {}
        if mode == "HOME UPS":
            extra = {
                "decision_metrics": {"home1_extra_cost_czk": 0.5},
                "decision_reason": "Nabíjení ze sítě, později bude elektřina dražší",
            }
        soc = 6.0 if (t.date() == NOW.date() and h == 23) else 12.0
        solar = 1.0 if (tomorrow and 10 <= h < 15) else 0.0
        rows.append(_iv(t, mode, price, soc, charge=charge, solar=solar, **extra))
    return rows


def _inputs(**over):
    base = {
        "now": NOW,
        "timeline": _timeline(),
        "capacity_kwh": CAP,
        "soc_pct": 83.0,
        "mode": "Home 1",
        "buy_price": 9.1,
        "sell_price": 4.2,
        "tariff": {
            "current": "NT",
            "nt_intervals": ["05.11 13:00-15:00", "05.11 20:00-24:00", "06.11 00:00-06:00"],
            "vt_intervals": ["05.11 15:00-20:00", "06.11 06:00-09:00"],
        },
        "solar": {
            "daily": {"2026-11-05": 7.7, "2026-11-06": 18.2, "2026-11-07": 4.7},
            "today_hourly": {"2026-11-05T14:00:00": 2.2, "2026-11-05T15:00:00": 1.6,
                             "2026-11-05T16:00:00": 0.8},
            "tomorrow_hourly": {"2026-11-06T11:00:00": 2.3, "2026-11-06T12:00:00": 2.9,
                                "2026-11-06T13:00:00": 2.5},
            "age_hours": 2.2,
            "stale": False,
        },
        "planned_consumption": {"today": 11.2, "tomorrow": 18.9, "profile": "Home office"},
        "boiler": {"upper_temp": 39.8, "lower_temp": 19.5, "energy_needed_kwh": 7.06,
                   "recommended_source": "FVE", "current_source": "Síť",
                   "comfort_satisfied": "no",
                   "recommended_window": {"start": "2026-11-05T14:00:00+01:00",
                                          "end": "2026-11-05T14:15:00+01:00",
                                          "spot_price": 7.35}},
        "chmu": [
            {"event": "Žádná výstraha před větrem", "severity": "Minor",
             "onset": "2026-11-04T10:10:50+01:00", "expires": "", "description": ""},
            {"event": "Silné bouřky", "severity": "Moderate",
             "onset": "2026-11-05T16:00:00+01:00", "expires": "2026-11-05T22:00:00+01:00",
             "description": "Ojedinělé silné bouřky s nárazy větru až 25 m/s."},
        ],
        "cost_today": {"plan": 100.5, "actual": 111.0, "eod": 121.0},
        "extra": [
            {"name": "Venkovní teplota 2206237016", "state": "7.5", "unit": "°C"},
        ],
        "anomalies": [
            {"at": "09:52", "kind": "bypass", "detail": "bypass ON"},
            {"at": "12:12", "kind": "nerovnovaha", "detail": "x"},
            {"at": "12:40", "kind": "nerovnovaha", "detail": "y"},
        ],
    }
    base.update(over)
    return base


def test_now_block_reports_soc_in_percent_and_kwh():
    s = snap.build_snapshot(_inputs())
    assert s["ted"]["soc_pct"] == 83
    assert s["ted"]["soc_kwh"] == 12.7
    assert s["ted"]["nakup_kc"] == 9.1
    assert s["ted"]["prodej_kc"] == 4.2
    assert s["ted"]["tarif"] == "NT"


def test_timeline_soc_kwh_is_converted_to_percent():
    # Regression: the old block printed battery_soc (kWh) under "SoC %".
    s = snap.build_snapshot(_inputs())
    assert s["soc_min"]["pct"] == round(6.0 / CAP * 100)
    assert s["soc_min"]["kdy"] == "dnes 23:00"
    for row in s["hodiny"]:
        assert 0 <= row["soc_pct"] <= 100


def test_past_intervals_are_dropped():
    s = snap.build_snapshot(_inputs())
    assert s["hodiny"][0]["h"] == "dnes 14"
    assert s["plan_bloky"][0]["od"] == "dnes 14:00"


def test_plan_blocks_group_modes_with_charge_cost_and_reason():
    s = snap.build_snapshot(_inputs())
    ups = [b for b in s["plan_bloky"] if b["rezim"] == "HOME UPS"]
    assert len(ups) == 1
    b = ups[0]
    assert b["od"] == "zítra 01:00"
    assert b["do"] == "zítra 04:00"
    assert b["ze_site_kwh"] == 8.4          # 12 slots x 0.7
    assert b["home1_priplatek_kc"] == 6.0   # 12 slots x 0.5
    assert b["cena_kc"] == "9.00"
    assert "dražší" in b["duvod"]


def test_hourly_rows_carry_prices_solar_tariff_and_mode():
    s = snap.build_snapshot(_inputs())
    rows = {r["h"]: r for r in s["hodiny"]}
    assert rows["zítra 12"]["nakup"] == 0.8
    assert rows["zítra 12"]["fve_kwh"] == 4.0
    assert rows["zítra 02"]["rezim"] == "UPS"
    assert rows["dnes 15"]["tarif"] == "VT"
    assert rows["dnes 21"]["tarif"] == "NT"


def test_cheapest_and_most_expensive_windows_are_precomputed():
    s = snap.build_snapshot(_inputs())
    w = s["okna"]
    assert w["nejlevnejsi_zitra"]["od"] == "11:00"
    assert w["nejlevnejsi_zitra"]["do"] == "14:00"
    assert w["nejlevnejsi_zitra"]["prumer_kc"] == 0.8
    assert w["nejdrazsi_dnes"]["od"] == "17:00"
    assert w["nejdrazsi_dnes"]["prumer_kc"] == 13.0


def test_solar_summary_includes_remaining_today_tomorrow_and_peak():
    s = snap.build_snapshot(_inputs())
    f = s["fve"]
    assert f["dnes_kwh"] == 7.7
    assert f["dnes_zbyva_kwh"] == 4.6
    assert f["zitra_kwh"] == 18.2
    assert f["pozitri_kwh"] == 4.7
    assert f["zitra_spicka"] == "12:00"


def test_chmu_keeps_only_real_warnings():
    s = snap.build_snapshot(_inputs())
    assert len(s["chmu"]) == 1
    w = s["chmu"][0]
    assert w["udalost"] == "Silné bouřky"
    assert w["od"] == "dnes 16:00"
    assert w["do"] == "dnes 22:00"


def test_extra_sensors_are_bounded_and_stripped_of_ids():
    extra = [{"name": f"Senzor {i}", "state": "1", "unit": ""} for i in range(25)]
    s = snap.build_snapshot(_inputs(extra=extra))
    assert len(s["senzory"]) == snap.MAX_EXTRA_ENTITIES
    s2 = snap.build_snapshot(_inputs())
    assert "2206237016" not in s2["senzory"][0]["nazev"]


def test_anomalies_are_summarised_by_kind():
    s = snap.build_snapshot(_inputs())
    kinds = {a["druh"]: a for a in s["anomalie"]}
    assert kinds["nerovnovaha"]["pocet"] == 2
    assert kinds["nerovnovaha"]["naposledy"] == "12:40"
    assert kinds["bypass"]["pocet"] == 1


def test_missing_sources_degrade_without_crashing():
    s = snap.build_snapshot({"now": NOW, "timeline": []})
    assert s["plan_bloky"] == []
    assert s["hodiny"] == []
    assert s["chmu"] == []
    text = snap.render_snapshot(s)
    assert "nedostupn" in text


def test_render_is_compact_and_readable():
    text = snap.render_snapshot(snap.build_snapshot(_inputs()))
    assert len(text) < 6000
    assert "Silné bouřky" in text
    assert "zítra 01:00–04:00" in text
    assert "2206237016" not in text


def test_fingerprint_changes_on_new_warning_but_not_on_price_noise():
    a = snap.fingerprint(snap.build_snapshot(_inputs()))
    tl = _timeline()
    tl[5]["spot_price"] += 0.3
    b = snap.fingerprint(snap.build_snapshot(_inputs(timeline=tl)))
    assert a == b
    c = snap.fingerprint(snap.build_snapshot(_inputs(chmu=[])))
    assert a != c
