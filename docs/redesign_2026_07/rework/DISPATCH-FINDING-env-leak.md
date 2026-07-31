# Dispatch finding — a minimax-hosted orchestrator poisons every claude-family child

**Date:** 2026-07-27
**Found by:** orchestrator `plan-eru-data-forensic-analysis-plann-5f7300` (running on minimax)
**Cost before diagnosis:** 3 dead worker slices on one unit (`fe/fix`, planner chip)

## Symptom

Three consecutive dispatches of the same unit to claude-family models died `rc=1 cause=tool_failure`
with empty/deleted logs:

| session | model_req |
|---|---|
| `plan-wire-planner-settings-into-fe-fl-385a66` | sonnet-3 |
| `plan-wire-planner-settings-into-fe-fl-81efff` | sonnet-3 |
| `plan-wire-planner-settings-into-fe-fl-32872a` | sonnet |

The same unit dispatched to `minimax` (`plan-wire-planner-settings-into-fe-fl-c82eef`) delivered
`rc=0 cause=delivered`. Pattern read as "sonnet cannot do this unit" — it is not.

## Root cause

The orchestrator itself runs on the minimax endpoint, so its process environment carries:

    ANTHROPIC_BASE_URL=https://api.minimax.io/anthropic
    ANTHROPIC_AUTH_TOKEN=sk-cp-...
    ANTHROPIC_MODEL=MiniMax-M3[1m]
    ANTHROPIC_DEFAULT_SONNET_MODEL=MiniMax-M3[1m]
    ANTHROPIC_DEFAULT_OPUS_MODEL=MiniMax-M3[1m]
    ANTHROPIC_DEFAULT_HAIKU_MODEL=MiniMax-M3[1m]

`fleet-launch` inherits that environment. The `claude`/`claude-3` wrappers set their own account HOME
but do NOT scrub these, so the child starts as Claude Code pointed at minimax's base URL asking for a
model id that account does not serve. It dies at startup before any milestone.

Reproduced deterministically with `fleet-ping`:

    fleet-ping sonnet-3
      -> FAILED - There's an issue with the selected model (MiniMax-M3[1m]).

    env -u ANTHROPIC_MODEL -u ANTHROPIC_BASE_URL -u ANTHROPIC_AUTH_TOKEN \
        -u ANTHROPIC_DEFAULT_SONNET_MODEL -u ANTHROPIC_DEFAULT_OPUS_MODEL \
        -u ANTHROPIC_DEFAULT_HAIKU_MODEL fleet-ping sonnet-3
      -> sonnet-3 OK

## Workaround (use until the wrappers scrub)

Scrub the six vars on every dispatch out of a non-base-claude session:

    env -u ANTHROPIC_MODEL -u ANTHROPIC_BASE_URL -u ANTHROPIC_AUTH_TOKEN \
        -u ANTHROPIC_DEFAULT_SONNET_MODEL -u ANTHROPIC_DEFAULT_OPUS_MODEL \
        -u ANTHROPIC_DEFAULT_HAIKU_MODEL \
      VIBESTRUCT_SESSION_PARENT=<your-id> fleet-launch <model> <brief> "<desc>"

Both review slices dispatched this way started clean (`review-eru-forensic-doc-refute-n-7b4ef1`,
`review-planner-auto-mode-chip-wi-7f3429`).

## Why it matters beyond this slice

- It is SILENT and it MIMICS incapability. Routing scores the cell `(fe, fix)` against sonnet/sonnet-3
  for a failure that was environmental — three MISS-shaped rows that say nothing about the model.
- It is asymmetric: a minimax/kimi/zai-hosted orchestrator can only dispatch its own provider
  successfully, so a whole tree silently collapses onto one model.
- `fleet-ping <model>` from inside the orchestrator's own environment detects it in one command.
  Ping before concluding a model is unfit for a unit.

## Suggested fix (shared tooling — needs its own reviewed slice)

Scrub `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_MODEL` and the three
`ANTHROPIC_DEFAULT_*_MODEL` vars inside the `claude` / `claude-second` / `claude-3` wrappers (each
already owns its account HOME and its own model defaults). `fleet-ping` already does an equivalent
scrub for `OCGO_MODEL` (`scripts/fleet/fleet-ping:54`) — same shape, one provider over.
