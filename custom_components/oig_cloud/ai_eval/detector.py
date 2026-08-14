"""Pure event detection over native ~16-20s sensor snapshots (validated on
Martin's box 2026-08-01). No HA imports — feed it raw (ts, value) samples per
metric; it returns events and full-snapshot rows for the hourly LLM tick.

Metric keys the caller must provide (already split zaloha vs nezaloha, since
FVE+battery feed only zaloha and nezaloha always draws from the grid):
  grid, gr_r, gr_s, gr_t            — grid total + per phase (W; +import/-export)
  zal, zal_r, zal_s, zal_t          — zaloha (backed-up) total + per phase (W)
  nez, nez_r, nez_s, nez_t          — nezaloha (non-backup) total + per phase (W)
  fve, bat, soc                     — solar (W), battery power (+charge/-discharge), SoC %
  v_r, v_s, v_t, freq               — grid voltage per phase (V), frequency (Hz)
  invT, batT, byp, mode             — inverter/battery temp (C), bypass state, box mode
"""
from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

STEP_S = 20                     # snapshot grid step (native cadence is ~16-20s)
BACKUP_PHASE_LIMIT_W = 3300     # per-phase zaloha limit before the box bypasses
PHASE_NEAR_LIMIT_W = 3000       # "getting tight" threshold
IMBALANCE_W = 1400              # sustained phase imbalance worth noting
GRID_JUMP_W = 1500             # grid rise over ~40s that counts as a spike
REARM_TICKS = 9                 # a sustained-state event re-arms only after
# the condition is false this many ticks (~3 min)
CONTEXT_TICKS = 5               # full snapshots kept on each side of an event (~90s)

Sample = Tuple[float, Any]      # (epoch_seconds, value)


def forward_fill(samples: Sequence[Sample], start_ts: float, n: int,
                 step_s: int = STEP_S) -> List[Optional[float]]:
    """Resample change-on-write samples onto a regular grid, carrying the last
    known numeric value forward. Non-numeric samples (bypass/mode) are kept as
    the raw value so callers can read them too."""
    out: List[Optional[Any]] = [None] * n
    ordered = sorted(samples, key=lambda s: s[0])
    j = 0
    last: Optional[Any] = None
    for i in range(n):
        t = start_ts + i * step_s
        while j < len(ordered) and ordered[j][0] <= t:
            last = ordered[j][1]
            j += 1
        out[i] = last
    return out


def _num(v: Any, default: float = 0.0) -> float:
    return float(v) if isinstance(v, (int, float)) else default


def derive_series(grid: Dict[str, List[Optional[Any]]], n: int) -> Dict[str, List[float]]:
    """Compute the derived per-tick series the detector reasons over."""
    def g(key: str, i: int) -> float:
        return _num(grid.get(key, [None] * n)[i])
    zphase = [[g("zal_r", i), g("zal_s", i), g("zal_t", i)] for i in range(n)]
    return {
        "zpeak": [max(p) for p in zphase],
        "imbalance": [max(p) - min(p) for p in zphase],
        "grid": [g("grid", i) for i in range(n)],
        "zal": [g("zal", i) for i in range(n)],
        "nez": [g("nez", i) for i in range(n)],
        "fve": [g("fve", i) for i in range(n)],
        "bat": [g("bat", i) for i in range(n)],
        "soc": [g("soc", i) for i in range(n)],
    }


def detect_events(
    grid: Dict[str, List[Optional[Any]]],
    n: int,
    label: Callable[[int], str],
    prior_low_soc_minutes: float = 0.0,
) -> List[Dict[str, Any]]:
    """Onset-based event detection with re-arm hysteresis (no oscillation spam).

    `label(i)` maps a tick index to a human timestamp string. `prior_low_soc_
    minutes` lets the caller signal the battery was already long at its floor
    before this window (for the recovery-after-minimum event)."""
    d = derive_series(grid, n)
    events: List[Dict[str, Any]] = []
    armed: Dict[str, bool] = {}
    false_streak: Dict[str, int] = {}

    def edge(name: str, cond: bool, i: int, mk: Callable[[int], str]) -> None:
        if cond:
            if armed.get(name, True):
                events.append({"i": i, "at": label(i), "kind": name, "detail": mk(i)})
                armed[name] = False
            false_streak[name] = 0
        else:
            fs = false_streak.get(name, REARM_TICKS) + 1
            false_streak[name] = fs
            if fs >= REARM_TICKS:
                armed[name] = True

    soc_low_ticks = 0
    for i in range(1, n):
        g2 = d["grid"][max(0, i - 2)]
        edge("grid_skok", d["grid"][i] - g2 > GRID_JUMP_W and d["grid"][i] > GRID_JUMP_W, i,
             lambda i: f"sit +{d['grid'][i]-d['grid'][max(0, i-2)]:.0f}W za 40s na {d['grid'][i]:.0f}; "
                       f"zal {d['zal'][i]:.0f} nez {d['nez'][i]:.0f} fve {d['fve'][i]:.0f} "
                       f"bat {d['bat'][i]:+.0f} soc {d['soc'][i]:.0f}")
        edge("faze_limit", d["zpeak"][i] >= PHASE_NEAR_LIMIT_W, i,
             lambda i: f"spicka faze {d['zpeak'][i]:.0f}W (limit {BACKUP_PHASE_LIMIT_W}), "
                       f"imbalance {d['imbalance'][i]:.0f}")
        edge("nerovnovaha", d["imbalance"][i] > IMBALANCE_W, i,
             lambda i: f"imbalance naskocila na {d['imbalance'][i]:.0f}W, zpeak {d['zpeak'][i]:.0f}")
        b = grid.get("byp", [None] * n)[i]
        edge("bypass", isinstance(b, str) and b.lower() in ("on", "1", "true"), i,
             lambda i: f"bypass ON, batT {_num(grid.get('batT', [None]*n)[i]):.1f} "
                       f"invT {_num(grid.get('invT', [None]*n)[i]):.1f}")
        # recovery-after-minimum: charging kicks in while SoC sat low a long time
        if d["soc"][i] and d["soc"][i] <= 30:
            soc_low_ticks += 1
        low_minutes = prior_low_soc_minutes + soc_low_ticks * STEP_S / 60.0
        edge("dobijeni_po_minimu",
             d["bat"][i] > 1500 and d["soc"][i] <= 40 and low_minutes >= 60, i,
             lambda i: f"dobijeni {d['bat'][i]:+.0f}W po ~{low_minutes:.0f} min na minimu, "
                       f"soc {d['soc'][i]:.0f}, fve {d['fve'][i]:.0f}, sit {d['grid'][i]:.0f}")
    return events


def event_snapshot_indices(events: Sequence[Dict[str, Any]], n: int,
                           win: int = CONTEXT_TICKS) -> List[int]:
    """The union of full-snapshot rows to send: +/- `win` ticks around each event."""
    idx = set()
    for e in events:
        i = e["i"]
        for j in range(max(0, i - win), min(n, i + win + 1)):
            idx.add(j)
    return sorted(idx)
