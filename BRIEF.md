TASK: fe/fix

MILESTONES (3):
1 (30%) read this brief and the exact site; reproduce (grep confirms no comma replace)
2 (70%) apply fix + add regression test
3 (100%) STOP and report FILES CHANGED

# Boiler tab — rev4 review finding: missed Czech-comma site in timeline summary

## Context
Repo: /repos/oig-cloud, this worktree /repos/wt-boiler-fix-rev4c, branch f1/wizard-v2-impl
(tip a57429524). This closes the ONE finding from an independent review of the rev4 visual-fidelity
fixes (FIX-1..4a): a comma-locale site the prior two fix workers missed.

## Finding (from review, verbatim)
File: `custom_components/oig_cloud/www_v2/src/ui/features/boiler/boiler-timeline-chart.ts`, the
`.timeline-summary` block, ~lines 793-797 (search for `timeline-summary` — only one hit in the file):

```
${t('boiler.model.today', lang)}: <strong>${sumGridKwh.toFixed(1)} kWh</strong> ze sítě
· <strong style="color:${FVE_COLOR}">${sumPvAltKwh.toFixed(1)} kWh</strong> z FVE/přetoku
${sumCostCzk > 0 ? html` · <strong>~${sumCostCzk.toFixed(2)} Kč</strong>` : ''}
${sumTotalKwh > 0 ? html` · spotřeba <strong>~${sumTotalKwh.toFixed(1)} kWh</strong>` : ''}
```

All four numbers render with a dot decimal (`.toFixed(...)`, no comma conversion). Every other number
in the boiler tab was already fixed to Czech comma in a prior slice — this component (mounted live as
`oig-boiler-timeline-chart`, wired at `src/ui/app.ts:1433`) was not touched and is the last surviving
dot-decimal site. It has NO existing test coverage (`grep -rn 'timeline-summary' src/__tests__/` is
empty) — that's why it was missed.

## Fix
- Replace `.toFixed(1)` / `.toFixed(2)` on `sumGridKwh`, `sumPvAltKwh`, `sumCostCzk`, `sumTotalKwh` in
  that block with the existing comma-locale pattern already used elsewhere in this file/feature dir —
  either `.replace('.', ',')` inline (matches `boiler-energy-today.ts`/`boiler-metric-panel.ts` style)
  OR import `formatKwh`/`formatCzk` from `./format` if that fits more cleanly with the surrounding
  markup (check current imports in this file first — do not introduce a new formatting convention).
- Add a regression test in `src/__tests__/` (new test file or an existing boiler-timeline-chart test
  file if one exists — check first) asserting the `.timeline-summary` block renders comma decimals,
  e.g. plan slots that sum to a fractional kWh/Kč value render `,` not `.`.

## Scope fence — touch ONLY
- `custom_components/oig_cloud/www_v2/src/ui/features/boiler/boiler-timeline-chart.ts`
- `custom_components/oig_cloud/www_v2/src/ui/features/boiler/format.ts` (only if you choose the
  import-helper route and it needs no change — do not modify `format.ts` behavior, it is already
  correct and covered by other tests)
- one test file under `custom_components/oig_cloud/www_v2/src/__tests__/`

Do NOT touch any other boiler component, any non-boiler file, or the Python backend.

## Do-NOT
- Do not run the build or the full test suite (box contention) — the integrator runs the gate.
- Do not commit. Write the code, list FILES CHANGED, STOP.
- Do not touch `sumGridKwh`/`sumPvAltKwh`/`sumCostCzk`/`sumTotalKwh` computation — only the render
  (`.toFixed` → comma). The arithmetic is correct and out of scope.

## Accept
- All four numbers in `.timeline-summary` render with Czech comma decimals.
- New/updated test covers it and would have failed before your fix.
