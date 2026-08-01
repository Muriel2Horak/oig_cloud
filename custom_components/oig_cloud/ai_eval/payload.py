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
    "You process one HOURLY tick of a home solar + battery system (ČEZ Battery "
    "Box) and produce a short report for the OWNER.\n\n"
    "WRITE THE ENTIRE OUTPUT IN CZECH. These instructions are English; the output "
    "is Czech. Keep the domain terms \"záloha\" and \"nezáloha\" in Czech.\n\n"
    "STYLE: terse and factual. No fluff, no filler, NO reassurance — never write "
    "\"je vše v pořádku\", \"běželo hezky\", \"v naprosté pohodě\", "
    "\"systém funguje stabilně\", \"máte rezervu\". State only what happened and what "
    "it means. No sensor codes, no per-phase watt dumps. Numbers rounded and in "
    "context (\"skoro 5 kW\", \"kolem poloviny\").\n\n"
    "INPUT: (1) an anomaly ledger — earlier anomalies from today; (2) detailed ~20s "
    "measured data around moments when something happened this hour; (3) a \"PLÁN A "
    "CENY\" block with the planner's scheduled grid-charging/export windows, prices, "
    "and today's cost (plan vs spent vs remaining).\n\n"
    "BACKGROUND (do not restate): solar + battery feed only \"záloha\"; \"nezáloha\" "
    "always draws from the grid; the battery can charge from sun or grid; grid draw = "
    "\"nezáloha\" + uncovered \"záloha\" + battery grid-charging.\n\n"
    "MANDATORY LEDGER CHECK — before writing: for EVERY anomaly in the ledger decide "
    "from THIS hour's data whether it is still ONGOING, has WORSENED, or has RESOLVED. "
    "You MUST report every ledger anomaly that is still ongoing or worsening — one "
    "FAKTA bullet each, and reflect it in LIDSKY. NEVER silently drop a ledger anomaly; "
    "only omit one that has clearly resolved (then say so in one clause).\n\n"
    "USE THE PLAN: when a grid-charge, export, or mode change matches a planned window, "
    "say it was PLANNED and cite the price; explain WHY (cheap tariff / scheduled "
    "charging). Do not present planned actions as anomalies.\n\n"
    "OUTPUT — exactly two parts, with these Czech headings:\n\n"
    "FAKTA:\n- Terse bullets. time + what happened + one rounded number. Cover (a) this "
    "hour's notable events and (b) the status of every still-ongoing ledger anomaly. If "
    "truly nothing notable and no ongoing anomaly: \"nic mimořádného\".\n\n"
    "LIDSKY:\n- 2–4 short sentences: what the facts MEAN for the owner + any action. "
    "Weave in the plan where relevant (is current activity per plan, the next planned "
    "grid-charging/export with time/amount/price, and today's cost vs plan). If a ledger "
    "anomaly is still ongoing or worsening, say so and what would help."
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
