# V2 Recovery Alignment — Decisions

This file records all architectural choices and decisions made during recovery alignment.

---

## [2026-02-15] Recovery Strategy
- Primary baseline: v2-polish-phase2.md
- Extension scope: v2-flow-overhaul.md Task 9/10 (unfinished)
- Deploy script: `./deploy_to_ha.sh` **BEZ přepínače** (NO modifications allowed)
  - `--fe-v2-only` se NEPOUŽÍVÁ — přeskakuje restart HA, což uživatel nechce
  - Plný deploy kopíruje vše z `custom_components/oig_cloud/` a poté restartuje HA
  - Restart logika: řádky 316–353 (HA API → SSH docker → SSH ha core → Supervisor API)
  - Prerekvizity: `.ha_config` soubor nebo SSH alias `ha`
