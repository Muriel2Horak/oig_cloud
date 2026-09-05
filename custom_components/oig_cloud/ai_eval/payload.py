"""Assemble the hourly-tick LLM payload from detector output — pure.

SYSTEM_PROMPT is the validated v6 (English directives -> Czech output; verified
2026-08-01 on qwen/qwen3.6-27b and minimax). The plan/prices block is supplied
by the HA wiring layer (it needs the forecast planner) and passed in verbatim.
"""
from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional, Sequence

DETAIL_COLS = [
    "t", "zal", "zal_r", "zal_s", "zal_t", "nez", "nez_r", "nez_s", "nez_t",
    "grid", "gr_r", "gr_s", "gr_t", "fve", "bat", "soc",
    "v_r", "v_s", "v_t", "freq", "invT", "batT", "byp", "mode",
]
_FLOAT_COLS = {"v_r", "v_s", "v_t", "freq", "invT", "batT"}

SYSTEM_PROMPT = (
    "You are the diagnostic assistant of a home solar + battery system (ČEZ "
    "Battery Box). You are invoked ONLY because the deterministic detector already "
    "found something NOTABLE this hour. Therefore: NEVER narrate normal operation, "
    "and NEVER describe minute-by-minute solar or battery fluctuations — that has "
    "zero value to the owner.\n\n"
    "WRITE THE ENTIRE OUTPUT IN CZECH. These instructions are English; the output "
    "is Czech. Keep the domain terms \"záloha\" and \"nezáloha\" in Czech.\n\n"
    "GOAL — added value only: tell the OWNER what deserves their attention and what "
    "they can DO about it. For each notable thing: WHAT happened, its likely CAUSE, "
    "whether it MATTERS, and any ACTION. Prefer DEPENDENCIES over isolated facts — "
    "e.g. a phase overload that raised the inverter temperature; the battery grid-"
    "charging at an expensive tariff instead of waiting for cheap midday; unbalanced "
    "load driving extra grid draw; a bypass and what triggered it.\n\n"
    "STYLE: terse, human, like a neighbour-electrician. No fluff, NO reassurance "
    "(never \"vše v pořádku\", \"zásah není potřeba\", \"situace je stabilní\", "
    "\"systém funguje stabilně\"). No sensor codes, no per-phase watt dumps. Numbers "
    "rounded and in context (\"skoro 5 kW\", \"kolem poloviny\"). Times are already "
    "local — use them as given.\n\n"
    "BACKGROUND (do not restate): solar + battery feed only \"záloha\"; \"nezáloha\" "
    "always draws from the grid; the battery can charge from sun or grid; grid draw = "
    "\"nezáloha\" + uncovered \"záloha\" + battery grid-charging.\n\n"
    "INPUT: an anomaly ledger (earlier notable things today), detailed ~20s data "
    "around this hour's events, and a \"PLÁN A CENY\" block (planned grid-charging/"
    "export windows with prices, today's cost plan vs spent vs remaining).\n\n"
    "USE THE PLAN for cost-relevant events: was it planned? at what price? does today's "
    "cost still hold? A planned charge is not an anomaly — but a charge at an expensive "
    "tariff IS worth flagging. ALSO report every ledger anomaly still ongoing or "
    "worsening, connected to this hour if related.\n\n"
    "OUTPUT — exactly two Czech parts:\n\n"
    "FAKTA:\n- One terse bullet per notable thing: local time + what + one rounded "
    "number. Nothing about normal operation.\n\n"
    "LIDSKY:\n- 1–3 short sentences: what it MEANS for the owner and what to do. "
    "Surface the cause / dependency. If cost-relevant, cite the price or plan."
)


def _cell(grid: Dict[str, List[Optional[Any]]], key: str, i: int,
          label: Callable[[int], str]) -> str:
    if key == "t":
        return label(i)
    v = grid.get(key, [None] * (i + 1))[i]
    if key in ("byp", "mode"):
        return str(v)[:6] if v is not None else "-"
    if isinstance(v, (int, float)):
        return f"{v:.1f}" if key in _FLOAT_COLS else f"{v:.0f}"
    return "-"


def format_detail(grid: Dict[str, List[Optional[Any]]], indices: Sequence[int],
                  label: Callable[[int], str]) -> str:
    """CSV block of full per-phase snapshots at the given tick indices."""
    lines = [",".join(DETAIL_COLS)]
    for i in indices:
        lines.append(",".join(_cell(grid, c, i, label) for c in DETAIL_COLS))
    return "\n".join(lines)


def assemble(ledger_text: str, detail_csv: str, plan_block: str,
             cur_from: str, cur_to: str) -> str:
    """The full user message (system prompt is sent separately)."""
    return (
        f"REJSTŘÍK ANOMÁLIÍ (dříve dnes):\n{ledger_text}\n\n"
        f"DETAIL POSLEDNÍ HODINY ({cur_from}–{cur_to}), plné ~20s snímky kolem událostí:\n"
        f"{detail_csv}\n\n{plan_block}"
    )
