"""Parsing and validating the advisor's structured answer."""
from __future__ import annotations

import json

from custom_components.oig_cloud.ai_eval import report as rep

GOOD = {
    "situace": "Baterie je na 83 %, zítra FVE 18 kWh a poledne pod 1 Kč.",
    "rizika": [
        {"kdy": "dnes 16:00–22:00", "co": "ČHMÚ hlásí silné bouřky",
         "proc": "hrozí výpadek sítě, baterie by měla mít rezervu"},
    ],
    "doporuceni": [
        {"kdy": "zítra 11:00–14:00", "akce": "Ohřej bojler (7 kWh) ze slunce",
         "duvod": "FVE 7,5 kWh a nákup 0,80 Kč místo 13 Kč večer",
         "prinos_kc": 85, "priorita": "vysoka"},
        {"kdy": "", "akce": "Sleduj spotřebu", "duvod": "obecně",
         "prinos_kc": None, "priorita": "nizka"},
        {"kdy": "dnes 17:00", "akce": "Vše v pořádku, zásah není potřeba",
         "duvod": "x", "prinos_kc": 0, "priorita": "nizka"},
    ],
    "anomalie": [],
}


def test_parses_plain_json():
    r = rep.parse_report(json.dumps(GOOD, ensure_ascii=False))
    assert r is not None
    assert r["situace"].startswith("Baterie je na 83 %")
    assert r["rizika"][0]["kdy"] == "dnes 16:00–22:00"


def test_parses_json_inside_code_fence_and_think_block():
    text = "<think>hmm</think>\nTady je:\n```json\n" + json.dumps(GOOD) + "\n```"
    assert rep.parse_report(text) is not None


def test_recommendation_without_time_is_dropped():
    r = rep.parse_report(json.dumps(GOOD, ensure_ascii=False))
    assert all(d["kdy"] for d in r["doporuceni"])
    assert not any(d["akce"] == "Sleduj spotřebu" for d in r["doporuceni"])


def test_filler_phrases_are_dropped():
    r = rep.parse_report(json.dumps(GOOD, ensure_ascii=False))
    assert not any("v pořádku" in d["akce"].lower() for d in r["doporuceni"])
    assert len(r["doporuceni"]) == 1


def test_priority_and_benefit_are_normalised():
    data = dict(GOOD, doporuceni=[
        {"kdy": "zítra 11:00", "akce": "Spusť pračku", "duvod": "levno",
         "prinos_kc": "12,5 Kč", "priorita": "HIGH"},
    ])
    r = rep.parse_report(json.dumps(data))
    d = r["doporuceni"][0]
    assert d["prinos_kc"] == 12.5
    assert d["priorita"] == "vysoka"


def test_lists_are_capped():
    item = {"kdy": "zítra 11:00", "akce": "a", "duvod": "b", "prinos_kc": 1, "priorita": "nizka"}
    data = dict(GOOD, doporuceni=[dict(item, akce=f"a{i}") for i in range(8)])
    r = rep.parse_report(json.dumps(data))
    assert len(r["doporuceni"]) == rep.MAX_ITEMS


def test_garbage_and_missing_situation_return_none():
    assert rep.parse_report("FAKTA:\n- něco") is None
    assert rep.parse_report(json.dumps({"rizika": []})) is None
    assert rep.parse_report("") is None
    assert rep.parse_report(None) is None


def test_to_legacy_text_keeps_old_fields_meaningful():
    r = rep.parse_report(json.dumps(GOOD, ensure_ascii=False))
    fakta, lidsky = rep.to_legacy_text(r)
    assert "ČHMÚ hlásí silné bouřky" in fakta
    assert "Baterie je na 83 %" in lidsky
    assert "zítra 11:00–14:00" in lidsky


def test_is_urgent_on_high_priority_or_risk():
    r = rep.parse_report(json.dumps(GOOD, ensure_ascii=False))
    assert rep.is_urgent(r) is True
    calm = dict(GOOD, rizika=[], doporuceni=[
        {"kdy": "zítra 11:00", "akce": "Spusť pračku", "duvod": "levno",
         "prinos_kc": 5, "priorita": "nizka"}])
    assert rep.is_urgent(rep.parse_report(json.dumps(calm))) is False


def test_long_text_is_cut_on_a_word_boundary_with_an_ellipsis():
    long = "slovo " * 120
    data = dict(GOOD, situace=long)
    r = rep.parse_report(json.dumps(data))
    assert len(r["situace"]) <= rep.MAX_TEXT
    assert r["situace"].endswith("…")
    assert not r["situace"].endswith("slov…")
