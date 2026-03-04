# V2 Recovery Alignment — návrat k původnímu plánu

## TL;DR

> **Quick Summary**: Stabilizovat rozbitý V2 flow stav a dorovnat ho na původní scope: `v2-polish-phase2.md` + nedodělané položky z `v2-flow-overhaul.md` (Task 9/10), bez zásahů mimo frontend V2 a bez úprav deploy skriptu.
>
> **Deliverables**:
> - Obnovený layout flow (bez nechtěně kolabovaných panelů, správné umístění tiles)
> - Dokončený Tile Config Editor (Task 5 z phase2)
> - Deterministický deploy + ověření na HA s cache/state hygienou
> - Dokončená finální verifikace (Task 9) + řízené spuštění modernizace (Task 10)
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES (4 waves)
> **Critical Path**: Recovery baseline -> Tile editor -> Deploy verify -> Modernization

---

## Context

### Source of truth
- Primární baseline: `.sisyphus/plans/v2-polish-phase2.md`
- Rozšíření scope: nedokončené `.sisyphus/plans/v2-flow-overhaul.md` Task 9/10

### Co je nyní rozbité
- Runtime stav neodpovídá očekávanému layoutu a původnímu zadání (uživatel hlásí "stará/rozbitá" verze).
- Výsledek deploy/refresh je nekonzistentní napříč relacemi.

### Metis guardrails (aplikováno)
- Neměnit deploy skript ani deploy konvenci uživatele.
- Zamknout scope jen na recovery + původně plánované nedodělky.
- Verifikace pouze agent-executed (žádné "uživatel ručně ověří").
- Sloučit duplicitní verify kroky (Task 12 + Task 9) do jedné finální fáze.

---

## Work Objectives

### Core Objective
Vrátit V2 flow dashboard do stavu definovaného v původním plánu oprav a dokončit zbývající práce bez dalšího scope creep.

### Must Have
- Layout flow odpovídá phase2 cíli (tiles + nody + control panel bez regresí)
- Tile editor (V1 parity) dokončen a funkční
- Finální deploy/verify pipeline reprodukovatelná na HA
- Task 10 modernizace spuštěna až po green verifikaci recovery baseline

### Must NOT Have
- Žádné změny `custom_components/oig_cloud/*.py`
- Žádné změny V1 (`custom_components/oig_cloud/www/`)
- Žádné zásahy do `deploy_to_ha.sh`
- Žádné nové npm závislosti

---

## Verification Strategy

### Test decision
- **Infrastructure exists**: YES (vitest)
- **Automated tests**: YES (TDD + test-after for UI integration)
- **Frameworks**: vitest + Playwright MCP verifikace

### Viewport baseline (default applied)
- Desktop: `1920x1080`
- Tablet: `1024x600`
- Mobile: `400x977`

### Universal agent QA rule
- Každý task má příkaz/skript + DOM/assertion výstup.
- Žádná acceptance podmínka nesmí vyžadovat ruční klikání uživatele.

---

## Execution Strategy

### Wave 1 — Recovery baseline
1. Zafixovat výchozí UI state (panely/layout) dle původního scope
2. Re-validovat tiles container layout (2-column desktop, 1-column mobile)
3. Re-validovat flow node umístění a spojnice

### Wave 2 — Chybějící phase2 práce
4. Dokončit Tile Config Editor (Task 5 parity scope)
5. Build + test gating (Task 11)

### Wave 3 — Finální deploy + verifikace
6. Deploy podle původního skriptu/konvence
7. Konsolidovaná production verifikace (Task 12 + flow-overhaul Task 9)

### Wave 4 — Task 10 modernizace
8. Flow modernization pouze po green baseline (Task 10)

---

## TODOs

- [ ] 1. Recovery baseline state alignment
  - **What to do**:
    - Ověřit a sjednotit výchozí state panelů/layoutu tak, aby se flow renderoval dle phase2 očekávání.
    - Ověřit, že levý/right panel nejsou nechtěně kolabované při default load.
  - **References**:
    - `custom_components/oig_cloud/www_v2/src/ui/app.ts` (state + panel toggles)
    - `.sisyphus/plans/v2-polish-phase2.md`
  - **Acceptance criteria**:
    - `npm run build` vrátí exit 0
    - V DOM existuje `oig-flow-canvas`, `oig-control-panel`, `oig-tiles-container`
    - `gridTemplateColumns` hlavního layoutu odpovídá očekávanému desktop režimu
  - **QA scenario**:
    - Tool: Playwright MCP
    - Steps: otevřít V2 panel -> počkat na `oig-app` -> načíst computed styles -> assert layout columns
    - Evidence: `.sisyphus/evidence/recovery-baseline-desktop.png`

- [ ] 2. Tiles layout parity re-check
  - **What to do**:
    - Potvrdit 2-column behavior na desktopu a 1-column na mobile.
    - Potvrdit že tiles nejsou překryté a nejsou mimo flow kontejnery.
  - **References**:
    - `custom_components/oig_cloud/www_v2/src/ui/features/tiles/tile.ts`
    - `.sisyphus/plans/v2-polish-phase2.md`
  - **Acceptance criteria**:
    - Desktop `1920x1080`: `oig-tiles-container` má 2 sloupce
    - Mobile `400x977`: `oig-tiles-container` má 1 sloupec
  - **QA scenario**:
    - Tool: Playwright MCP
    - Steps: resize desktop/mobile -> query computed `gridTemplateColumns` -> assert expected values
    - Evidence: `.sisyphus/evidence/tiles-desktop-mobile.png`

- [ ] 3. Tile Config Editor completion (phase2 Task 5)
  - **What to do**:
    - Dokončit parity scope editoru (Entity/Button tab, icon picker, support entities, save/cancel flow).
  - **References**:
    - `custom_components/oig_cloud/www_v2/src/ui/features/tiles/tile-dialog.ts`
    - `custom_components/oig_cloud/www_v2/src/ui/features/tiles/icon-picker.ts`
    - `custom_components/oig_cloud/www_v2/src/ui/app.ts`
  - **Acceptance criteria**:
    - Dialog se otevře z tile akce v edit módu
    - Save aktualizuje tile konfiguraci bez JS errorů
    - Cancel zavře dialog bez změny konfigurace
  - **QA scenario**:
    - Tool: Playwright MCP
    - Steps: zapnout edit mode -> otevřít tile dialog -> upravit ikonu/label -> save -> assert změna v tile
    - Evidence: `.sisyphus/evidence/tile-editor-save-flow.png`

- [ ] 4. Build and test gate (phase2 Task 11)
  - **What to do**:
    - Spustit test/build bránu před deploy.
  - **References**:
    - `custom_components/oig_cloud/www_v2/package.json`
    - `custom_components/oig_cloud/www_v2/vitest.config.ts`
  - **Acceptance criteria**:
    - `npx vitest run` buď exit 0, nebo explicitně stejný baseline fail-set jako před změnami (bez nových failů v dotčených souborech)
    - `npm run build` exit 0
  - **QA scenario**:
    - Tool: Bash
    - Steps: spustit test -> spustit build -> uložit stdout/stderr
    - Evidence: `.sisyphus/evidence/build-test-gate.txt`

- [ ] 5. Deploy verification unification (phase2 Task 12 + overhaul Task 9)
  - **What to do**:
    - Nasadit přes `./deploy_to_ha.sh` **BEZ přepínače** (plný deploy s automatickým restartem HA).
    - Skript má restart zabudovaný (řádky 316–353): HA API → SSH docker → SSH ha core → Supervisor API.
    - Flag `--fe-v2-only` se NEPOUŽÍVÁ — přeskakuje restart, což je nežádoucí.
    - Prerekvizity: `.ha_config` soubor s `HA_TOKEN`/`HA_URL`, nebo SSH alias `ha` nakonfigurovaný.
    - Provést jednotnou production verifikaci (DOM + vizuál + network + console).
  - **References**:
    - `.sisyphus/plans/v2-polish-phase2.md`
    - `.sisyphus/plans/v2-flow-overhaul.md`
    - `deploy_to_ha.sh` (read-only usage, řádky 316–353 pro restart logiku)
  - **Acceptance criteria**:
    - V2 panel načte `oig_cloud_static_v2/index.html` bez JS runtime error
    - Console neobsahuje nové critical errors související s layout/render
    - Screenshots pro desktop/tablet/mobile jsou konzistentní s plánem
  - **QA scenario**:
    - Tool: Playwright MCP + Bash
    - Steps: deploy -> otevřít V2 panel -> assert `oig-app` loaded -> capture screenshot 3 viewports -> capture console
    - Evidence: `.sisyphus/evidence/prod-verify-{desktop|tablet|mobile}.png`

- [ ] 6. Flow modernization (overhaul Task 10) — gated
  - **What to do**:
    - Spustit modernizační úpravy flow až po green verifikaci úkolů 1–5.
    - Zachovat guardrails (žádné nové animace mimo V1 precedent, žádné backend změny).
  - **References**:
    - `.sisyphus/plans/v2-flow-overhaul.md`
    - `custom_components/oig_cloud/www_v2/src/ui/features/flow/canvas.ts`
    - `custom_components/oig_cloud/www_v2/src/ui/features/flow/node.ts`
  - **Acceptance criteria**:
    - Modernizace nezpůsobí regresi layoutu ani funkcionality flow
    - Všechny předchozí recovery assertions zůstávají green
  - **QA scenario**:
    - Tool: Playwright MCP
    - Steps: porovnání baseline vs modernization screenshotů + DOM assertions
    - Evidence: `.sisyphus/evidence/modernization-regression-check.png`

---

## Commit Strategy

- Commit A: Recovery baseline + tiles parity
- Commit B: Tile editor completion
- Commit C: Build/test/deploy verification artifacts
- Commit D: Task 10 modernization (pouze pokud gated criteria splněna)

---

## Success Criteria

- [ ] V2 flow layout odpovídá baseline plánu a je stabilní na 3 viewports
- [ ] Tile editor je dokončen v parity scope
- [ ] Deploy + production verification je reprodukovatelný bez improvizací
- [ ] Task 10 je buď bezpečně dokončen, nebo explicitně odložen se zdůvodněním
