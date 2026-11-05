"""Parse and validate the AI advisor's structured answer — pure.

The model is asked for one JSON object (situace / rizika / doporuceni /
anomalie). Models wrap JSON in prose, code fences or <think> blocks, so the
parser digs the object out, then enforces what makes advice useful: every
recommendation has a time and an action, no reassurance filler, short lists.
"""
from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Mapping, Optional, Tuple

MAX_ITEMS = 3
MAX_TEXT = 400

FILLER = (
    "vše v pořádku",
    "vse v poradku",
    "zásah není potřeba",
    "není potřeba žádný zásah",
    "situace je stabilní",
    "systém funguje stabilně",
    "systém funguje správně",
    "nic není potřeba",
    "žádná akce",
)

_VAGUE_TIME = re.compile(r"celodenn|cel[ýý] den|během dne|kdykoli", re.I)

_PRIORITY = {
    "vysoka": "vysoka", "vysoká": "vysoka", "high": "vysoka",
    "stredni": "stredni", "střední": "stredni", "medium": "stredni",
    "nizka": "nizka", "nízká": "nizka", "low": "nizka",
}

_FIELDS = {
    "rizika": ("kdy", "co", "proc"),
    "doporuceni": ("kdy", "akce", "duvod"),
    "anomalie": ("kdy", "co", "vyznam"),
}
# Fields that must be non-empty for an item to survive.
_REQUIRED = {
    "rizika": ("co",),
    "doporuceni": ("kdy", "akce"),
    "anomalie": ("co",),
}


def _extract_json(text: str) -> Optional[Any]:
    if "</think>" in text:
        text = text.split("</think>", 1)[1]
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.S)
    if fence:
        text = fence.group(1)
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end <= start:
        return None
    try:
        return json.loads(text[start:end + 1])
    except ValueError:
        return None


def _text(value: Any) -> str:
    if value is None:
        return ""
    text = re.sub(r"\s+", " ", str(value)).strip()
    if len(text) <= MAX_TEXT:
        return text
    cut = text[:MAX_TEXT - 1]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    return cut.rstrip(" ,;:") + "…"


def _is_filler(*parts: str) -> bool:
    joined = " ".join(parts).lower()
    return any(f in joined for f in FILLER)


def _benefit(value: Any) -> Optional[float]:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, (int, float)):
        return round(float(value), 1)
    match = re.search(r"-?\d+(?:[.,]\d+)?", str(value))
    return round(float(match.group(0).replace(",", ".")), 1) if match else None


def _items(raw: Any, kind: str) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if not isinstance(raw, list):
        return out
    for entry in raw:
        if not isinstance(entry, Mapping):
            continue
        item: Dict[str, Any] = {f: _text(entry.get(f)) for f in _FIELDS[kind]}
        if _VAGUE_TIME.search(item.get("kdy", "")):
            item["kdy"] = ""  # "celý den" is not a time the owner can act on
        if any(not item[f] for f in _REQUIRED[kind]):
            continue
        if _is_filler(*item.values()):
            continue
        if kind == "doporuceni":
            item["prinos_kc"] = _benefit(entry.get("prinos_kc"))
            item["priorita"] = _PRIORITY.get(_text(entry.get("priorita")).lower(), "stredni")
        out.append(item)
        if len(out) >= MAX_ITEMS:
            break
    return out


def parse_report(text: Optional[str]) -> Optional[Dict[str, Any]]:
    """Return the validated report dict, or None when unusable."""
    if not text or not isinstance(text, str):
        return None
    data = _extract_json(text)
    if not isinstance(data, Mapping):
        return None
    situation = _text(data.get("situace"))
    if not situation:
        return None
    return {
        "situace": situation,
        "rizika": _items(data.get("rizika"), "rizika"),
        "doporuceni": _items(data.get("doporuceni"), "doporuceni"),
        "anomalie": _items(data.get("anomalie"), "anomalie"),
    }


def to_legacy_text(report: Mapping[str, Any]) -> Tuple[str, str]:
    """(fakta, lidsky) for the old attributes, the notification and old FE."""
    fakta = [f"- {r['kdy'] or '—'} | {r['co']}" + (f" ({r['proc']})" if r.get("proc") else "")
             for r in report.get("rizika") or []]
    fakta += [f"- {a['kdy'] or '—'} | {a['co']}" + (f": {a['vyznam']}" if a.get("vyznam") else "")
              for a in report.get("anomalie") or []]
    lidsky = [str(report.get("situace") or "")]
    for d in report.get("doporuceni") or []:
        line = f"- {d['kdy']}: {d['akce']}"
        if d.get("duvod"):
            line += f" — {d['duvod']}"
        if d.get("prinos_kc"):
            line += f" (~{d['prinos_kc']:g} Kč)"
        lidsky.append(line)
    return "\n".join(fakta), "\n".join(x for x in lidsky if x)


def is_urgent(report: Mapping[str, Any]) -> bool:
    """Worth a persistent notification: a risk, an anomaly, or a high-priority action."""
    if report.get("rizika") or report.get("anomalie"):
        return True
    return any(d.get("priorita") == "vysoka" for d in report.get("doporuceni") or [])
