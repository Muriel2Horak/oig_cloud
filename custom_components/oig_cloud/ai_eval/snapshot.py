"""Compact situation snapshot for the AI advisor — pure, no HA imports.

The HA wiring layer collects plain values (planner timeline, solar forecast,
prices, tariff, boiler, ČHMÚ, opted-in sensors) into an ``inputs`` dict; this
module turns them into a small structured snapshot and renders it as text.
Every window, sum and percentage is computed HERE, so the model only has to
read numbers, never derive them.

Privacy: nothing here carries the box id, coordinates or entity ids. Names of
opted-in sensors are stripped of long digit runs (box serials).
"""
from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, OrderedDict
from datetime import date, datetime, timedelta
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

MAX_EXTRA_ENTITIES = 10
MAX_PLAN_BLOCKS = 10
MAX_CHMU = 5
WINDOW_HOURS = 3
_SLOT = timedelta(minutes=15)
_DIGIT_RUN = re.compile(r"\s*\d{6,}\s*")
_MODE_SHORT = {"HOME I": "H1", "HOME II": "H2", "HOME III": "H3", "HOME UPS": "UPS"}
_DAY_LABELS = {0: "dnes", 1: "zítra", 2: "pozítří"}


# --------------------------------------------------------------------------- helpers

def _num(value: Any) -> Optional[float]:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    try:
        return float(str(value).replace(",", "."))
    except (TypeError, ValueError):
        return None


def _naive(value: datetime) -> datetime:
    return value.replace(tzinfo=None) if value.tzinfo else value


def _parse_dt(value: Any) -> Optional[datetime]:
    """Parse an ISO timestamp to naive LOCAL time (timeline times are local)."""
    if isinstance(value, datetime):
        return _naive(value)
    text = str(value or "").strip()
    if not text:
        return None
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    return _naive(parsed)


def _day_label(day: date, today: date) -> str:
    return _DAY_LABELS.get((day - today).days, day.strftime("%d.%m."))


def _when(moment: datetime, today: date) -> str:
    return f"{_day_label(moment.date(), today)} {moment.strftime('%H:%M')}"


def _pct(kwh: Optional[float], capacity: Optional[float]) -> Optional[int]:
    if kwh is None or not capacity:
        return None
    return int(round(max(0.0, min(100.0, kwh / capacity * 100))))


def _clean_name(name: Any) -> str:
    text = _DIGIT_RUN.sub(" ", str(name or "")).strip()
    return re.sub(r"\s{2,}", " ", text)[:60]


def _r(value: Optional[float], digits: int = 1) -> Optional[float]:
    return None if value is None else round(value, digits)


def split_entity_ids(value: Any) -> List[str]:
    """Opted-in entity ids from the stored CSV (or a list), bounded to 10."""
    items = value if isinstance(value, (list, tuple)) else str(value or "").split(",")
    out: List[str] = []
    for item in items:
        entity_id = str(item or "").strip()
        if entity_id and "." in entity_id and entity_id not in out:
            out.append(entity_id)
        if len(out) >= MAX_EXTRA_ENTITIES:
            break
    return out


# --------------------------------------------------------------------------- tariff

def _parse_tariff_intervals(items: Iterable[Any], year: int) -> List[Tuple[datetime, datetime]]:
    """'05.11 09:00-12:00' -> (start, end); '24:00' rolls to next midnight."""
    out: List[Tuple[datetime, datetime]] = []
    for item in items or []:
        match = re.match(r"\s*(\d{1,2})\.(\d{1,2})\s+(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})", str(item))
        if not match:
            continue
        d, m, h1, m1, h2, m2 = (int(g) for g in match.groups())
        try:
            day = datetime(year, m, d)
        except ValueError:
            continue
        start = day + timedelta(hours=h1, minutes=m1)
        end = day + timedelta(hours=h2, minutes=m2)
        if end <= start:
            end += timedelta(days=1)
        out.append((start, end))
    return out


def _tariff_at(moment: datetime, nt: Sequence[Tuple[datetime, datetime]],
               vt: Sequence[Tuple[datetime, datetime]]) -> Optional[str]:
    for start, end in nt:
        if start <= moment < end:
            return "NT"
    for start, end in vt:
        if start <= moment < end:
            return "VT"
    return None


# --------------------------------------------------------------------------- timeline

def _upcoming(timeline: Sequence[Mapping[str, Any]], now: datetime) -> List[Tuple[datetime, Mapping[str, Any]]]:
    slot_start = now.replace(minute=now.minute - now.minute % 15, second=0, microsecond=0)
    rows = []
    for item in timeline or []:
        if not isinstance(item, Mapping):
            continue
        t = _parse_dt(item.get("time") or item.get("timestamp"))
        if t is None or t < slot_start:
            continue
        rows.append((t, item))
    rows.sort(key=lambda r: r[0])
    return rows


def _home1_extra(item: Mapping[str, Any]) -> float:
    metrics = item.get("decision_metrics")
    if isinstance(metrics, Mapping):
        return _num(metrics.get("home1_extra_cost_czk")) or 0.0
    return 0.0


def _plan_blocks(rows, capacity, today) -> List[Dict[str, Any]]:
    blocks: List[Dict[str, Any]] = []
    current: List[Tuple[datetime, Mapping[str, Any]]] = []

    def flush() -> None:
        if not current:
            return
        prices = [p for p in (_num(i.get("spot_price")) for _, i in current) if p is not None]
        reasons = Counter(str(i.get("decision_reason") or "").strip() for _, i in current)
        reasons.pop("", None)
        lo, hi = (min(prices), max(prices)) if prices else (None, None)
        if lo is None:
            price = None
        elif abs(hi - lo) < 0.005:
            price = f"{lo:.2f}"
        else:
            price = f"{lo:.2f}–{hi:.2f}"
        block = {
            "od": _when(current[0][0], today),
            "do": _when(current[-1][0] + _SLOT, today),
            "rezim": str(current[0][1].get("mode_name") or "-"),
            "ze_site_kwh": round(sum(_num(i.get("grid_charge_kwh")) or 0.0 for _, i in current), 1),
            "cena_kc": price,
            "home1_priplatek_kc": round(sum(_home1_extra(i) for _, i in current), 1),
            "soc_konec_pct": _pct(_num(current[-1][1].get("battery_soc")), capacity),
        }
        if reasons:
            block["duvod"] = reasons.most_common(1)[0][0][:120]
        blocks.append(block)

    for t, item in rows:
        mode = item.get("mode_name")
        if current and mode != current[-1][1].get("mode_name"):
            flush()
            current = []
        current.append((t, item))
    flush()
    return blocks[:MAX_PLAN_BLOCKS]


def _hourly(rows, capacity, today, nt, vt) -> List[Dict[str, Any]]:
    groups: "OrderedDict[datetime, List[Mapping[str, Any]]]" = OrderedDict()
    for t, item in rows:
        groups.setdefault(t.replace(minute=0), []).append(item)
    out = []
    for hour, items in groups.items():
        buy = [p for p in (_num(i.get("spot_price")) for i in items) if p is not None]
        sell = [p for p in (_num(i.get("export_price_czk")) for i in items) if p is not None]
        modes = Counter(str(i.get("mode_name") or "-") for i in items)
        mode = modes.most_common(1)[0][0]
        out.append({
            "h": f"{_day_label(hour.date(), today)} {hour.strftime('%H')}",
            "_dt": hour,
            "nakup": _r(sum(buy) / len(buy), 2) if buy else None,
            "prodej": _r(sum(sell) / len(sell), 2) if sell else None,
            "fve_kwh": round(sum(_num(i.get("solar_kwh")) or 0.0 for i in items), 1),
            "spotreba_kwh": round(sum(_num(i.get("load_kwh")) or 0.0 for i in items), 1),
            "ze_site_nabiti_kwh": round(sum(_num(i.get("grid_charge_kwh")) or 0.0 for i in items), 1),
            "soc_pct": _pct(_num(items[-1].get("battery_soc")), capacity),
            "rezim": _MODE_SHORT.get(mode, mode[:6]),
            "tarif": _tariff_at(hour, nt, vt),
        })
    return out


def _windows(hourly: List[Dict[str, Any]], today: date) -> Dict[str, Any]:
    out: Dict[str, Any] = {}
    by_day: Dict[int, List[Dict[str, Any]]] = {}
    for row in hourly:
        if row["nakup"] is None:
            continue
        by_day.setdefault((row["_dt"].date() - today).days, []).append(row)
    for offset, key in ((0, "dnes"), (1, "zitra")):
        day_rows = by_day.get(offset, [])
        if len(day_rows) < WINDOW_HOURS:
            continue
        spans = []
        for i in range(len(day_rows) - WINDOW_HOURS + 1):
            chunk = day_rows[i:i + WINDOW_HOURS]
            if chunk[-1]["_dt"] - chunk[0]["_dt"] != timedelta(hours=WINDOW_HOURS - 1):
                continue
            avg = sum(r["nakup"] for r in chunk) / WINDOW_HOURS
            spans.append((avg, chunk))
        if not spans:
            continue
        for name, pick in (("nejlevnejsi", min), ("nejdrazsi", max)):
            avg, chunk = pick(spans, key=lambda s: s[0])
            out[f"{name}_{key}"] = {
                "od": chunk[0]["_dt"].strftime("%H:%M"),
                "do": (chunk[-1]["_dt"] + timedelta(hours=1)).strftime("%H:%M"),
                "prumer_kc": round(avg, 2),
                "fve_kwh": round(sum(r["fve_kwh"] for r in chunk), 1),
            }
    return out


# --------------------------------------------------------------------------- sources

def _solar(solar: Mapping[str, Any], now: datetime) -> Dict[str, Any]:
    if not solar:
        return {}
    daily = solar.get("daily") if isinstance(solar.get("daily"), Mapping) else {}
    today = now.date()

    def day_total(offset: int) -> Optional[float]:
        key = (today + timedelta(days=offset)).isoformat()
        return _r(_num(daily.get(key)))

    remaining = 0.0
    seen = False
    for key, kw in (solar.get("today_hourly") or {}).items():
        t = _parse_dt(key)
        value = _num(kw)
        if t is None or value is None:
            continue
        seen = True
        if t >= now.replace(minute=0, second=0, microsecond=0):
            remaining += value
    peak = None
    tomorrow = [(t, _num(v)) for t, v in ((_parse_dt(k), v) for k, v in (solar.get("tomorrow_hourly") or {}).items())
                if t is not None and _num(v) is not None]
    if tomorrow:
        best = max(tomorrow, key=lambda tv: tv[1])
        if best[1] > 0:
            peak = best[0].strftime("%H:%M")
    out = {
        "dnes_kwh": day_total(0),
        "dnes_zbyva_kwh": round(remaining, 1) if seen else None,
        "zitra_kwh": day_total(1),
        "pozitri_kwh": day_total(2),
        "zitra_spicka": peak,
        "stari_h": _r(_num(solar.get("age_hours"))),
        "zastarala": bool(solar.get("stale")),
    }
    return {k: v for k, v in out.items() if v is not None}


def _chmu(warnings: Iterable[Any], today: date) -> List[Dict[str, Any]]:
    out = []
    for w in warnings or []:
        if not isinstance(w, Mapping):
            continue
        event = str(w.get("event") or "").strip()
        if not event or event.lower().startswith("žádná výstraha"):
            continue
        onset = _parse_dt(w.get("onset"))
        expires = _parse_dt(w.get("expires"))
        out.append({
            "udalost": event[:80],
            "zavaznost": str(w.get("severity") or ""),
            "od": _when(onset, today) if onset else None,
            "do": _when(expires, today) if expires else None,
            "popis": str(w.get("description") or "").strip()[:200],
        })
    return out[:MAX_CHMU]


def _boiler(boiler: Mapping[str, Any], today: date) -> Dict[str, Any]:
    if not boiler:
        return {}
    out: Dict[str, Any] = {
        "horni_c": _r(_num(boiler.get("upper_temp"))),
        "dolni_c": _r(_num(boiler.get("lower_temp"))),
        "potrebuje_kwh": _r(_num(boiler.get("energy_needed_kwh"))),
        "doporuceny_zdroj": boiler.get("recommended_source"),
        "aktualni_zdroj": boiler.get("current_source"),
        "komfort_splnen": boiler.get("comfort_satisfied"),
    }
    window = boiler.get("recommended_window")
    if isinstance(window, Mapping):
        start, end = _parse_dt(window.get("start")), _parse_dt(window.get("end"))
        if start and end:
            out["doporucene_okno"] = f"{_when(start, today)}–{end.strftime('%H:%M')}"
        price = _num(window.get("spot_price"))
        if price is not None:
            out["cena_okna_kc"] = round(price, 2)
    return {k: v for k, v in out.items() if v not in (None, "")}


def _extra(items: Iterable[Any]) -> List[Dict[str, Any]]:
    out = []
    for item in items or []:
        if not isinstance(item, Mapping):
            continue
        name = _clean_name(item.get("name"))
        state = str(item.get("state") or "").strip()[:40]
        if not name or state in ("", "unknown", "unavailable"):
            continue
        row = {"nazev": name, "stav": state}
        unit = str(item.get("unit") or "").strip()
        if unit:
            row["jednotka"] = unit[:10]
        details = item.get("details")
        if isinstance(details, Mapping):
            row["detail"] = {str(k)[:20]: v for k, v in list(details.items())[:6]}
        out.append(row)
        if len(out) >= MAX_EXTRA_ENTITIES:
            break
    return out


def _anomalies(entries: Iterable[Any]) -> List[Dict[str, Any]]:
    summary: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()
    for e in entries or []:
        if not isinstance(e, Mapping):
            continue
        kind = str(e.get("kind") or "").strip()
        if not kind:
            continue
        row = summary.setdefault(kind, {"druh": kind, "pocet": 0, "naposledy": ""})
        row["pocet"] += 1
        row["naposledy"] = str(e.get("at") or "")
    return list(summary.values())


# --------------------------------------------------------------------------- public

def build_snapshot(inputs: Mapping[str, Any]) -> Dict[str, Any]:
    """Structured snapshot from collected plain inputs (see module doc)."""
    now = _naive(inputs.get("now") or datetime.now())
    today = now.date()
    capacity = _num(inputs.get("capacity_kwh"))
    tariff = inputs.get("tariff") or {}
    nt = _parse_tariff_intervals(tariff.get("nt_intervals") or [], now.year)
    vt = _parse_tariff_intervals(tariff.get("vt_intervals") or [], now.year)

    rows = _upcoming(inputs.get("timeline") or [], now)
    hourly = _hourly(rows, capacity, today, nt, vt)

    soc_min = None
    if rows and capacity:
        t_min, i_min = min(rows, key=lambda r: _num(r[1].get("battery_soc")) if _num(r[1].get("battery_soc")) is not None else 1e9)
        kwh = _num(i_min.get("battery_soc"))
        if kwh is not None:
            soc_min = {"pct": _pct(kwh, capacity), "kwh": round(kwh, 1), "kdy": _when(t_min, today)}

    soc_pct = _num(inputs.get("soc_pct"))
    ted = {
        "cas": now.strftime("%d.%m. %H:%M"),
        "soc_pct": int(round(soc_pct)) if soc_pct is not None else None,
        "soc_kwh": _r(soc_pct / 100 * capacity) if soc_pct is not None and capacity else None,
        "kapacita_kwh": _r(capacity),
        "rezim": inputs.get("mode"),
        "nakup_kc": _r(_num(inputs.get("buy_price")), 2),
        "prodej_kc": _r(_num(inputs.get("sell_price")), 2),
        "tarif": tariff.get("current") or _tariff_at(now, nt, vt),
    }

    consumption = inputs.get("planned_consumption") or {}
    cost = inputs.get("cost_today") or {}
    snapshot = {
        "ted": {k: v for k, v in ted.items() if v is not None},
        "plan_bloky": _plan_blocks(rows, capacity, today),
        "soc_min": soc_min,
        "hodiny": hourly,
        "okna": _windows(hourly, today),
        "zaporne_ceny": [r["h"] for r in hourly if r["nakup"] is not None and r["nakup"] < 0],
        "fve": _solar(inputs.get("solar") or {}, now),
        "spotreba": {k: v for k, v in {
            "dnes_kwh": _r(_num(consumption.get("today"))),
            "zitra_kwh": _r(_num(consumption.get("tomorrow"))),
            "profil": consumption.get("profile"),
        }.items() if v is not None},
        "bojler": _boiler(inputs.get("boiler") or {}, today),
        "chmu": _chmu(inputs.get("chmu") or [], today),
        "naklady_dnes": {k: v for k, v in {
            "plan_kc": _r(_num(cost.get("plan"))),
            "zatim_kc": _r(_num(cost.get("actual"))),
            "odhad_konec_dne_kc": _r(_num(cost.get("eod"))),
        }.items() if v is not None},
        "senzory": _extra(inputs.get("extra") or []),
        "anomalie": _anomalies(inputs.get("anomalies") or []),
    }
    return snapshot


def _fmt(value: Any) -> str:
    if value is None:
        return "-"
    if isinstance(value, float):
        return f"{value:g}"
    return str(value)


def _span(start: str, end: str) -> str:
    day_a, _, _ = start.partition(" ")
    day_b, _, time_b = end.partition(" ")
    return f"{start}–{time_b}" if day_a == day_b and time_b else f"{start}–{end}"


def render_snapshot(s: Mapping[str, Any]) -> str:
    """Render the snapshot as the compact Czech text block the model reads."""
    lines: List[str] = []
    ted = s.get("ted") or {}
    if ted:
        lines.append("TEĎ: " + ", ".join(f"{k}={_fmt(v)}" for k, v in ted.items()))

    blocks = s.get("plan_bloky") or []
    if blocks:
        lines.append("PLÁN REŽIMŮ (od–do, režim, nabití ze sítě kWh, nákupní cena Kč/kWh, "
                     "příplatek UPS proti Home 1 Kč, SoC na konci %, důvod):")
        for b in blocks:
            lines.append(
                f"  {_span(b['od'], b['do'])} {b['rezim']} {b['ze_site_kwh']:g} kWh "
                f"{_fmt(b.get('cena_kc'))} Kč +{b['home1_priplatek_kc']:g} Kč "
                f"SoC {_fmt(b.get('soc_konec_pct'))} % {b.get('duvod', '')}".rstrip()
            )
    else:
        lines.append("PLÁN REŽIMŮ: (nedostupný)")
    if s.get("soc_min"):
        m = s["soc_min"]
        lines.append(f"NEJNIŽŠÍ SoC V PLÁNU: {m['pct']} % ({m['kwh']:g} kWh) {m['kdy']}")

    hourly = s.get("hodiny") or []
    if hourly:
        lines.append("HODINY (hodina, nákup Kč, prodej Kč, FVE kWh, spotřeba kWh, "
                     "nabití ze sítě kWh, SoC %, režim, tarif):")
        for r in hourly:
            lines.append("  " + " ".join(_fmt(r.get(k)) for k in (
                "h", "nakup", "prodej", "fve_kwh", "spotreba_kwh",
                "ze_site_nabiti_kwh", "soc_pct", "rezim", "tarif")))
    windows = s.get("okna") or {}
    if windows:
        lines.append("CENOVÁ OKNA (3 h, průměr nákupní ceny): " + "; ".join(
            f"{k.replace('_', ' ')} {w['od']}–{w['do']} {w['prumer_kc']:g} Kč (FVE {w['fve_kwh']:g} kWh)"
            for k, w in windows.items()))
    if s.get("zaporne_ceny"):
        lines.append("ZÁPORNÉ CENY: " + ", ".join(s["zaporne_ceny"]))

    for title, key in (("FVE PŘEDPOVĚĎ", "fve"), ("SPOTŘEBA PLÁN", "spotreba"),
                       ("BOJLER", "bojler"), ("NÁKLADY DNES", "naklady_dnes")):
        data = s.get(key) or {}
        if data:
            lines.append(f"{title}: " + ", ".join(f"{k}={_fmt(v)}" for k, v in data.items()))

    chmu = s.get("chmu") or []
    if chmu:
        lines.append("VÝSTRAHY ČHMÚ:")
        for w in chmu:
            lines.append(f"  {w['udalost']} ({w['zavaznost']}) {_fmt(w.get('od'))} až "
                         f"{_fmt(w.get('do'))}. {w.get('popis', '')}".rstrip())
    else:
        lines.append("VÝSTRAHY ČHMÚ: žádné")

    sensors = s.get("senzory") or []
    if sensors:
        lines.append("DALŠÍ SENZORY (vybral majitel): " + "; ".join(
            f"{x['nazev']}={x['stav']}{(' ' + x['jednotka']) if x.get('jednotka') else ''}"
            + (f" {json.dumps(x['detail'], ensure_ascii=False)}" if x.get("detail") else "")
            for x in sensors))
    anomalies = s.get("anomalie") or []
    if anomalies:
        lines.append("ANOMÁLIE ZA 23 H (druh×počet, naposledy): " + ", ".join(
            f"{a['druh']}×{a['pocet']} {a['naposledy']}" for a in anomalies))
    return "\n".join(lines)


def fingerprint(s: Mapping[str, Any]) -> str:
    """Stable digest of the facts that justify a fresh advice run.

    New/cleared ČHMÚ warning, tomorrow's prices appearing, or a big swing in
    tomorrow's solar forecast. Small price noise must NOT trigger a call.
    """
    hourly = s.get("hodiny") or []
    has_tomorrow = any(str(r.get("h", "")).startswith("zítra") for r in hourly)
    solar_tomorrow = (s.get("fve") or {}).get("zitra_kwh")
    key = {
        "chmu": sorted((w.get("udalost"), w.get("od")) for w in s.get("chmu") or []),
        "tomorrow_prices": has_tomorrow,
        "solar_bucket": None if solar_tomorrow is None else int(solar_tomorrow // 4),
    }
    return hashlib.sha1(json.dumps(key, ensure_ascii=False, sort_keys=True).encode()).hexdigest()[:12]


def strip_private(snapshot: Dict[str, Any]) -> Dict[str, Any]:
    """Drop helper fields (datetimes) before storing or rendering as JSON."""
    for row in snapshot.get("hodiny") or []:
        row.pop("_dt", None)
    return snapshot
