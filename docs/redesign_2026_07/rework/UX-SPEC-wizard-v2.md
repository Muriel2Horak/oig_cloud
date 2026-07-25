# UX-SPEC — Wizard v2 (R5 AI intro + R6 overall wizard UX)

Source: worker `task-f1-wizard-v2-ux-spec-r5-ai-intro-7b7951` (fe/design), branch
`f1-plan3.6-impl` (base_sha `aa00fe923eb5f94ca62f15d64fc0443247114e41`). DESIGN slice — spec
only, no code. Grounded against `custom_components/oig_cloud/config/steps.py`,
`config_registry.py`, `www_v2/src/ui/features/onboarding/*`, `docs/redesign_2026_07/F1-DESIGN.md`,
`DECISIONS.md`, and RCA-R1/R3/R4 (`docs/redesign_2026_07/rework/`).

## Copy convention

Every piece of user-facing text in this spec is fenced as:

> **CZ:** "…"

Anything outside a `CZ:` fence — headings, field-order notes, `show_if` conditions, rationale —
is structural prose for the implementer, in English. A national/domain term that has no faithful
English equivalent stays in the original inside its own quotes, e.g. "datová schránka" (not used
in this integration, cited only as the convention example), "ZenBPM" (not present here either —
this spec has no such terms; none invented). Existing emoji already used in the wizard
(🎯 ☀️ 🔋 💰 🔧 📖 💡 ⚠️ 🤖 📦 ⏱️ 🔥) are reused where the copy replaces an existing string with
that emoji; no new emoji invented.

## Scope decision — which surface is "wizard v2"

Two wizard surfaces exist today:

1. **HA-native config/options flow** (`config/steps.py`, `WizardMixin`) — the granular
   HA-forms flow: `wizard_welcome → wizard_credentials → wizard_modules → wizard_intervals →
   wizard_solar → wizard_battery → wizard_pricing_import → wizard_pricing_export →
   wizard_pricing_distribution → wizard_boiler(+8 simple substeps) → wizard_summary`, plus a
   flat reconfigure menu (`async_step_init` → `section_modules/intervals/solar/battery/pricing/
   boiler/ai/all`). This is what the owner meets when adding/reconfiguring the HA integration
   itself.
2. **FE dashboard onboarding overlay** (`www_v2/src/ui/features/onboarding/`) — a 3-step modal
   (① AI ② Solar ③ Ceny) gating the premium dashboard (D9/D10), plus the registry-driven
   Settings tab for everything else.

`F1-DESIGN.md` §2 already states the target architecture: *"Zeštíhlený HA config flow; složité
moduly výhradně v dashboardu (premium)"* — the HA-native flow shrinks to credentials + a
premium checkbox, and every module (solar/battery/pricing/boiler/AI) is configured exclusively
in the FE dashboard. **This spec designs "wizard v2" as that FE dashboard wizard** — it
supersedes today's 3-step onboarding overlay, replacing it with the full step sequence below.
The HA-native flow's future shape (minimal credentials-only) is *not* redesigned here — it is
out of scope for R5/R6, which are dashboard-facing defects. Implementer note: this leaves the
HA-native flow's granular steps (`wizard_modules`, `wizard_solar`, …) as the CURRENT fallback
until the FE wizard v2 ships; no regression either way since the HA-native flow keeps working
standalone.

## Table of contents

| # | Step | Purpose | New install | Review mode (existing entry) |
|---|------|---------|--------------|-------------------------------|
| 0 | Welcome | Detect mode, set expectations | Empty-state welcome, no diff UI | Review welcome: "your config is safe", entry point to per-step diff |
| 1 | Moduly (Modules) | Pick which optional modules are active — gates which later steps render | All off except recommended defaults | Pre-filled from `entry.options`; toggling off a previously-on module surfaces a warning, not silent field loss |
| 2 | AI — proč a jak (AI — why & how) | R5: explain what AI does + why, then existing key-acquisition guide | No provider selected; disclosure shown before any key entry | Pre-filled provider/model; key never re-shown (write-only), "change key" affordance instead |
| 3 | Solar | Forecast provider, GPS, string geometry | Empty GPS/string fields (R4 fix: no Prague fallback) — only shown if `enable_solar_forecast` | Pre-filled from `entry.options`/`hass.config`; diff hint on edit |
| 4 | Ceny — distribuce (Pricing — distribution) | Distributor/tariff dataset selection (existing 5 registry fields) | Dataset default shown as a *suggestion*, requires explicit confirm | Pre-filled from `entry.options`; diff hint on edit |
| 5 | Ceny — dodavatel (Pricing — supplier) | RESTORED: 19 legacy supplier/commercial keys (RCA-R3), only shown if `enable_pricing` | Empty/dataset-neutral defaults, `show_if`-gated by scenario pickers | Pre-filled from `entry.options` (values already live there — R3 finding); diff hint on edit |
| 6 | Baterie a plánovač (Battery & planner) | Battery sizing + balancing/planner tuning, only shown if `enable_battery_prediction` | Empty numeric fields, no invented defaults | Pre-filled; diff hint on edit |
| 7 | Bojler (Boiler) | Physical boiler setup, only shown if `enable_boiler` | Empty entity pickers/fields | Pre-filled; diff hint on edit |
| 8 | Připojení (Connection/basic) | Scan intervals, data source mode — set-once technical plumbing | Registry defaults (30 s / 300 s / cloud_only) | Pre-filled; diff hint on edit |
| 9 | Shrnutí (Summary) | Final review before save | Flat "what will be created" list | Full diff table: every changed field, "was X → now Y"; nothing changes until confirmed |

Two macro-phases group steps 1–8 by the R6 mental-model complaint ("confusing and ugly" —
flat list of unrelated technical forms). Phase and step both render in the progress indicator
(§6):

- **Phase A — "Nastavuje se jednou" (set up once):** Modules, AI, Solar, Pricing–distribution,
  Boiler, Connection. Installation facts and one-time choices; revisited rarely.
- **Phase B — "Mění se v čase" (changes over time):** Pricing–supplier (ERÚ tariffs/VAT update
  ~yearly — `pricelists.year` staleness warning already exists, `config_registry.py:99-101`),
  Battery & planner (strategy numbers users retune as they learn their usage). Framed to the
  user as "these are worth checking again periodically", distinct from "set once and forget".

Rationale: the owner's complaint was that the current flow is one undifferentiated sequence of
technical forms. Splitting by "install fact vs. thing to revisit" gives the user a mental
model for *why* the wizard reopens later (D11 grandfather banner: "go review with AI") instead
of it looking like the same monolithic form again.

## 1–2. Per-step content

Each step below lists: fields (registry key), order, grouping, and Czech copy. Field
order/grouping mirrors the registry section unless noted. Help text strategy: every step keeps
the existing pattern (`📖 What this module does` / `🔧 What you need` / inline `data_description`
hints) — this spec extends that pattern into new steps rather than inventing a new one, per the
existing `wizard_solar`/`wizard_battery`/`wizard_boiler` `cs.json` entries.

### Step 0 — Welcome

New install:

> **CZ:** "Vítejte v průvodci nastavením OIG Cloud. Projdeme spolu pár kroků — solární
> předpověď, ceny energie, volitelně AI a bojler. Nic nemusíte vyplnit najednou, průvodce si
> pamatuje, kde jste skončili."

Review mode (ties to D11's banner promise, `onboarding-data.ts: grandfathered`):

> **CZ:** "Váš stávající nastavení zůstává beze změny, dokud ho výslovně nepotvrdíte. V každém
> kroku uvidíte svou aktuální hodnotu a můžete ji ověřit nebo upravit — nic se nesmaže, dokud
> nedáte Uložit."

### Step 1 — Moduly

Fields (registry section `modules`, order as registered): `enable_solar_forecast`,
`enable_pricing`, `enable_battery_prediction`, `enable_boiler`, `enable_statistics`,
`enable_extended_sensors`, `enable_chmu_warnings`.

Grouping: two visual groups — "Hlavní moduly" (solar/pricing/battery/boiler, each gates a later
step) above "Doplňkové" (statistics/extended sensors/CHMU, no gated step). This tells the user
up front that the first four choices change what they'll see next — motivates Modules being
step 1, not buried mid-flow as it is today (`wizard_modules` currently sits after credentials,
same position, but flat — no group distinction).

Reuse existing `cs.json` `wizard_modules.data` labels for the six registry-backed fields
(`enable_solar_forecast`, `enable_battery_prediction`, `enable_pricing`, `enable_boiler`,
`enable_statistics`, `enable_extended_sensors`, `enable_chmu_warnings`) verbatim — already
correct Czech, no defect there. New copy needed only for the group headers:

> **CZ:** "Hlavní moduly" / "Doplňkové"

### Step 2 — AI — proč a jak

See §5 below (full R5 content — this step's copy is the centerpiece of this spec).

### Step 3 — Solar

Fields, in order: `solar_forecast_provider` → (`solar_forecast_mode` | `solar_forecast_api_key`
if provider=`forecast_solar`; `solcast_api_key`+`solcast_site_id` if provider=`solcast`) →
`solar_forecast_latitude`+`solar_forecast_longitude` (rendered as a paired GPS control, ideally
a map picker per F1-DESIGN §5's "GPS (z HA, mapa)" — visual guidance only, no widget code here)
→ String 1 group (`solar_forecast_string1_enabled` → kwp/declination/azimuth, shown only if
enabled) → String 2 group (same pattern).

Existing `cs.json` `wizard_solar` labels/hints are already correct Czech (RCA-R1 does not flag
this step) — reuse verbatim. The one content change this spec requires: the R4 fix removes the
Prague fallback, so in new-install mode the GPS fields render **empty with a placeholder**
instead of a silently-filled 50.0/14.0:

> **CZ:** (placeholder text, not a value) "Zadejte GPS souřadnice instalace (najdete je v HA →
> Nastavení → Systém → Obecné, nebo na mapě)"

### Step 4 — Ceny — distribuce

Fields: `confirmed_distribution_distributor` → `confirmed_distribution_tariff` (options
re-derived from the live `/pricelists` dataset per selected distributor, existing
`onPricingFieldChange` logic in `index.ts:1011-1038` — reuse, not redesigned) →
`confirmed_distribution_price_incl_vat`/`price_excl_vat`/`unit` (read-only display, derived).

RCA-R1 defect: these 5 fields currently render raw registry keys as labels
(`confirmed_distribution_distributor` etc.) because `strings.json`/`translations/cs.json` lack a
`"field"` section (R1 fix is translation-data-only, tracked separately — this spec supplies the
copy R1's fix should ship):

| Field | CZ label | CZ hint |
|---|---|---|
| `confirmed_distribution_distributor` | **CZ:** "Distributor" | **CZ:** "Vyberte svého distributora elektřiny (ČEZ, EG.D, PRE)" |
| `confirmed_distribution_tariff` | **CZ:** "Sazba (tarif)" | **CZ:** "Vaše distribuční sazba dle smlouvy s distributorem" |
| `confirmed_distribution_price_incl_vat` | **CZ:** "Cena s DPH" | **CZ:** "Doplněno automaticky z ceníku distributora" |
| `confirmed_distribution_price_excl_vat` | **CZ:** "Cena bez DPH" | **CZ:** "Doplněno automaticky z ceníku distributora" |
| `confirmed_distribution_unit` | **CZ:** "Jednotka" | **CZ:** "Doplněno automaticky z ceníku distributora" |

Stale-dataset warning (`pricing.stale_warning`, already wired in `index.ts:1222-1224` via
`onboarding.pricing.stale_warning` i18n key) stays as-is — not a defect in scope here.

### Step 5 — Ceny — dodavatel (RESTORED, RCA-R3 "proper fix")

See §4 below — the 19-field restoration is the second centerpiece of this spec.

### Step 6 — Baterie a plánovač

Fields, grouped: "Nabíjení" (`charge_rate_kw`, `battery_comfort_soc_percent`) → "Automatika"
(`auto_mode_switch_enabled`) → "Vyrovnávání článků" (`balancing_enabled` gates
`balancing_interval_days`/`balancing_hold_hours`/`balancing_opportunistic_threshold`/
`balancing_economic_threshold`) → "Plánovač" (`expensive_percentile`, `cheap_window_percentile`).

Existing `cs.json` `wizard_battery` labels are already correct Czech for the registry-backed
fields (`auto_mode_switch_enabled`, `balancing_*`, `cheap_window_percentile`) — reuse verbatim.
Two registry fields have no existing translation (`charge_rate_kw` maps to legacy
`home_charge_rate` via `Field.mirror`, already labeled; `battery_comfort_soc_percent` and
`expensive_percentile` need labels distinct from the legacy `target_capacity_percent`/
`expensive_percentile_pct` strings, since scale differs — registry stores `expensive_percentile`
as a 0.5–0.95 fraction scaled ×100 for display, `scale=100` in `config_registry.py:291-292`):

| Field | CZ label | CZ hint |
|---|---|---|
| `battery_comfort_soc_percent` | **CZ:** "Komfortní nabití baterie (%)" | **CZ:** "Baterie se nenechá klesnout pod tuto hodnotu mimo plánované vybíjení" |
| `expensive_percentile` | **CZ:** "Práh drahých hodin (percentil)" | **CZ:** "Import dražší než tento percentil se plánovač snaží pokrýt levným přednabitím" |

### Step 7 — Bojler

Not part of the current 3-step FE onboarding overlay at all (only reachable via HA-native
`wizard_boiler`/Settings tab today) — this spec adds it as wizard v2's step 7, gated by
`enable_boiler`, so boiler owners get the same guided/reviewable flow as solar/pricing/battery
owners instead of a separate surface. Field set: the 25 `boiler` registry fields, grouped per
existing `wizard_boiler` cs.json structure ("co modul dělá" intro → sensors → thresholds →
circulation → legionella) — reuse that copy verbatim, it is not defective. Structural note only:
render as a single step (registry has no `show_if` chain fragmenting it further today), not the
8-substep HA-native flow (`wizard_boiler_simple_1..8`) — that fragmentation is exactly the kind
of "confusing" flow R6 complains about; the registry-driven single-step + section-grouping
pattern (per §6 below) replaces it.

### Step 8 — Připojení

Fields: `data_source_mode` → `standard_scan_interval`/`extended_scan_interval` →
(`local_proxy_stale_minutes`/`local_event_debounce_ms`, shown only if `data_source_mode=
local_only`). Existing `cs.json` `wizard_intervals` labels are correct Czech — reuse verbatim.
`enable_dashboard` is NOT shown here — it is the premium gate checkbox itself (D9), out of
scope for a step that runs after the gate is already open.

### Step 9 — Shrnutí

New install: flat list, "toto se vytvoří" framing:

> **CZ:** "Shrnutí nastavení — zkontrolujte prosím před uložením:"

Review mode: see §3 — full diff table is this step's entire content, not a generic summary.

## 3. Review mode vs. new-install mode

Both modes render the **same step sequence** (§ table of contents) — no separate review-only
navigation, per D11/K2f ("soft guide, never a wall", `onboarding-data.ts:29-31`). The
difference is entirely in per-field state and step 9's content.

### New install

- Every field starts empty or at its registry `default` — **never** a silently-plausible
  fabricated value (this is the general form of the R4 fix: R4 fixed one hardcoded fallback,
  this spec's principle is "no field in wizard v2 may render a non-`None`, non-registry-default
  value the user did not provide or the system did not derive from a live source" — dataset
  defaults for pricing are an explicit UI-visible *suggestion*, not silently pre-filled, because
  the user must actively confirm them; GPS/solar/battery/boiler fields with no live source stay
  empty).
- No diff UI anywhere — there is nothing to compare against.
- Step 9 is a flat confirm list.

### Review mode (existing `entry.options`)

- **Every field is pre-filled from `entry.options`** at step entry — this is the general
  seeding principle the ticket states ("existing users see THEIR values, not dataset
  defaults"). R2's sibling RCA will name the exact keys currently failing to seed; this spec
  does not block on that inventory — the UX requirement is unconditional: whichever keys R2
  finds unseeded are bugs against *this* spec's stated behavior, not exceptions to design
  around.
- **Solar GPS** pre-fills from `entry.options` first, `hass.config` second, empty third (R4's
  fix, already scoped) — never a hardcoded location.
- **Pricing–supplier (19 keys)** pre-fills from `entry.options` directly — RCA-R3 confirms these
  values already live there (the legacy options-flow wrote them; only the registry/wizard
  *display* path was missing). This is the one section where "review mode" for a pre-R3-fix
  install actually recovers data that was invisible before — worth calling out to the user:

  > **CZ:** "Tyto hodnoty jsme našli ve vašem stávajícím nastavení — dosud nebyly v průvodci
  > vidět, teď je můžete zkontrolovat."

  (Show this note only when `enable_pricing=true` **and** at least one of the 19 keys is
  present in `entry.options` **and** the entry predates this wizard version — i.e., a true
  "we recovered this" case, not shown for a fresh install that happens to have defaults.)

- **Per-field changed-vs-current diff hint** (the R2/D11 "review your config, nothing lost"
  requirement, K2e): when the user edits a pre-filled field, render a small inline hint below
  it, cleared if the user reverts to the original value:

  > **CZ:** "Bylo: {stará_hodnota} → Nyní: {nová_hodnota}"

  Applies to every field in every step, not just pricing/solar. Implementation note (structural,
  not code): the diff hint needs the field's *original* `entry.options` value retained
  client-side for the duration of the wizard session (separate from the live draft state
  already tracked per step, e.g. `solarDraft`/`pricingDraft` in `index.ts`) — this is a new
  piece of state (`originalValues: Record<string, unknown>`, snapshotted once at wizard open),
  not a rename of existing drafts.
- **Step 9 becomes a full diff table**: one row per *changed* field only (unchanged fields are
  omitted — a wall of "X → X" rows defeats the purpose), columns "Pole" / "Bylo" / "Nyní".
  Nothing is written to `entry.options` until the user confirms this screen — matches the
  existing `confirmPricing`/`saveModuleConfig` pattern of explicit per-step save, extended to a
  single final confirm covering every step's draft.

  > **CZ:** "Toto se změní. Dokud nekliknete na Uložit, nic se neuloží."

- **Modules step, review mode only**: turning OFF a module that was previously ON does not
  silently drop its configured fields from `entry.options` — flag this explicitly since it is
  the one action in the whole wizard that looks like data loss even though the field values are
  merely hidden, not deleted (merge-save semantics, matches existing "merge ukládání" design
  principle in F1-DESIGN.md §1 item 3):

  > **CZ:** "Vypnutím modulu se jeho nastavení skryje, ale zůstane uloženo — pokud modul znovu
  > zapnete, hodnoty budou stále tady."

## 4. Restored commercial-price section (RCA-R3 "proper fix")

Registry split, per RCA-R3's proposal: `pricing_distribution` (existing 5 dataset fields,
already in `config_registry.py`, unchanged — this is step 4) and a new `pricing_supplier`
section (19 fields below, step 5). This spec designs the wizard UI for `pricing_supplier`;
the registry/backend wiring (`Field()` definitions, `_map_pricing_to_backend`) is
implementation, not this spec's deliverable.

Step 5 layout — three sub-groups matching the legacy wizard's existing 3-step split
(`wizard_pricing_import`/`export`/`distribution`), collapsed into sections within one step
instead of three separate steps (consistent with this spec's "fewer, richer steps" principle,
§6):

**A — Nákupní cena (import)**

`spot_pricing_model` (enum: `percentage`|`fixed`|`fixed_prices` — selector, drives the rest of
this group via `show_if`):

| Field | `show_if` | CZ label | CZ hint |
|---|---|---|---|
| `spot_pricing_model` | — | **CZ:** "Scénář nákupní ceny" | **CZ:** "💰 SPOT + procento — variabilní cena podle burzy · 💵 SPOT + fixní poplatek — stabilnější · 🔒 FIX cena — předvídatelná" |
| `spot_positive_fee_percent` | `spot_pricing_model=percentage` | **CZ:** "Přirážka při kladné spotové ceně (%)" | **CZ:** "Při kladné spotové ceně: cena × (1 + procento/100). Např. 15 % = spot × 1,15" |
| `spot_negative_fee_percent` | `spot_pricing_model=percentage` | **CZ:** "Přirážka při záporné spotové ceně (%)" | **CZ:** "Při záporné spotové ceně: cena × (1 − procento/100). Např. 9 % = spot × 0,91" |
| `spot_fixed_fee_mwh` | `spot_pricing_model=fixed` | **CZ:** "Fixní poplatek (CZK/MWh)" | **CZ:** "Konstantní poplatek přičtený ke spotové ceně" |
| `fixed_commercial_price_vt` | `spot_pricing_model=fixed_prices` | **CZ:** "Fixní nákupní cena VT (CZK/kWh)" | **CZ:** "⚠️ Zadávejte bez DPH a distribuce" |
| `fixed_commercial_price_nt` | `spot_pricing_model=fixed_prices` AND `dual_tariff_enabled=true` | **CZ:** "Fixní nákupní cena NT (CZK/kWh)" | **CZ:** "⚠️ Zadávejte bez DPH a distribuce" |

**B — Prodejní cena / export**

| Field | `show_if` | CZ label | CZ hint |
|---|---|---|---|
| `export_pricing_model` | — | **CZ:** "Scénář prodejní ceny" | **CZ:** "💰 SPOT − procento — výhodné při vysokých cenách · 💵 SPOT − fixní srážka — stabilnější výkup · 🔒 FIX cena — stabilní po celý rok" |
| `export_fee_percent` | `export_pricing_model=percentage` | **CZ:** "Srážka z exportu (%)" | **CZ:** "Např. 15 % = dostanete 85 % ze spotové ceny (spot × 0,85)" |
| `export_fixed_fee_czk` | `export_pricing_model=fixed` | **CZ:** "Fixní srážka exportu (CZK/kWh)" | **CZ:** "Fixní srážka od spotové ceny. Např. 0,20 CZK/kWh = spot − 0,20" |
| `export_fixed_price` | `export_pricing_model=fixed_prices` | **CZ:** "Fixní výkupní cena (CZK/kWh)" | **CZ:** "Výkupní cena bez ohledu na spot" |

**C — Distribuce, tarify a DPH**

| Field | `show_if` | CZ label | CZ hint |
|---|---|---|---|
| `dual_tariff_enabled` | — | **CZ:** "Mám dva tarify (VT/NT)" | **CZ:** "Zapněte, pokud váš distributor rozlišuje vysoký a nízký tarif" |
| `distribution_fee_vt_kwh` | — | **CZ:** "Poplatek za distribuci VT (CZK/kWh)" | **CZ:** "Např. 1,42 CZK/kWh" |
| `distribution_fee_nt_kwh` | `dual_tariff_enabled=true` | **CZ:** "Poplatek za distribuci NT (CZK/kWh)" | **CZ:** "Např. 0,91 CZK/kWh" |
| `tariff_vt_start_weekday` | — | **CZ:** "VT začátek, pracovní den (hodina)" | **CZ:** "Např. '6' = 06:00" |
| `tariff_nt_start_weekday` | `dual_tariff_enabled=true` | **CZ:** "NT začátek, pracovní den (hodina1,hodina2)" | **CZ:** "Např. '22,2' = 22:00 večer a 02:00 ráno" |
| `tariff_weekend_same_as_weekday` | `dual_tariff_enabled=true` | **CZ:** "Víkend stejně jako pracovní dny" | **CZ:** "Vypněte, pokud se víkendové tarify liší" |
| `tariff_vt_start_weekend` | `dual_tariff_enabled=true` AND `tariff_weekend_same_as_weekday=false` | **CZ:** "VT začátek, víkend (hodina)" | **CZ:** "Nechte prázdné pro NT celý den" |
| `tariff_nt_start_weekend` | `dual_tariff_enabled=true` AND `tariff_weekend_same_as_weekday=false` | **CZ:** "NT začátek, víkend (hodina1,hodina2)" | **CZ:** "Např. '0' = NT celý den" |
| `vat_rate` | — | **CZ:** "DPH (%)" | **CZ:** "Standardně 21 %" |

19 fields accounted for: 6 (A) + 4 (B) + 9 (C) = 19, matching RCA-R3's inventory exactly.

Section intro copy (step 5, replaces the "not configurable" gap RCA-R3 found):

> **CZ:** "Dodavatelské a distribuční ceny (obchodní podmínky vaší smlouvy s dodavatelem a
> distributorem elektřiny). Tyto hodnoty se liší od datové sady v předchozím kroku — tam je
> orientační ceník distributora, tady je vaše skutečná smlouva."

That last sentence exists specifically to prevent the confusion RCA-R3's split is designed
around: two visually similar "pricing" steps back to back need an explicit sentence
distinguishing "dataset reference price" (step 4) from "your actual contract" (step 5), or the
restoration re-creates the exact "which price field is real" confusion R6 complains about.

## 5. "AI — proč a jak" intro block (R5)

### What is actually verified against the codebase

Verified AI-driven capability, live in code today:

- `ai_task.py` (`OigAiTaskEntity`) registers a Home Assistant **AI Task** entity
  (`homeassistant.components.ai_task`, HA ≥ 2025.8) once a provider is configured. Once
  registered, the user's own HA automations/scripts can call the `ai_task.generate_data`
  service and get a structured (not free-text) answer back, generated by whichever provider the
  user chose in this wizard.
- Three co-equal provider choices (`SCOPE-REVISION #8`, `ai/backends.py`,
  `www_v2/.../step-ai.ts:37-71`): the user's own already-configured HA AI (`ai_task`
  delegation — nothing leaves the device), or Groq, or NVIDIA (both free-tier, user's own key).
- Privacy boundary is real and enforced in code, not just policy: `ai/backends.py:49-57`
  (`PROMPT_ALLOWED_FIELDS`) allow-lists a small, explicit set of anonymous numbers — solar
  panel geometry (`kwp`, `declination`, `azimuth`) and battery sizing/planner ratios
  (`capacity_kwh`, `battery_comfort_soc_percent`, balancing settings, `charge_rate_kw`) — and
  nothing else can reach a prompt. No name, address, GPS, box ID, or e-mail is ever
  constructible into a prompt by design (deny-by-default membership rule, not a filter).

**Not established / explicitly NOT claimed in the copy below** (verify before extending this
copy — see "Not established" at the end of this document):

- The ticket's own hint to "reference `battery_forecast/`" does **not** hold up: `grep`
  across `custom_components/oig_cloud/battery_forecast/` for any AI/provider/backend symbol
  returns zero matches. The battery forecast/planner is rule-based, not AI-driven. **This spec
  does not claim AI powers battery planning** — doing so would repeat the R5 defect pattern
  (a claim not backed by code) in the very block meant to fix it.
  - Precedent for flagging a ticket premise mismatch rather than writing around it: RCA-R4 did
    the same for its own ticket wording (`RCA-R4.md`, "Discrepancy with the original ticket
    wording").
- `ai/backends.py:60-61` allow-lists a task named `validate_config` — but `grep -rn
  "validate_config"` across the component finds **zero callers**: the task is scaffolded, not
  wired to any UI. **This spec does not claim AI checks/validates your configuration today** —
  that capability is designed (`F1-DESIGN.md` §3/§5, "AI validace") but unshipped. Do not add
  it to user-facing copy until a caller exists; flag to whoever ships `validate_config`'s UI
  wiring that this step's intro copy should be revisited then.
- Similarly unshipped: pricelist cross-model verification (`F1-DESIGN.md` §5 step ③, "Ověřit
  proti aktuálnímu ceníku") and the `oig_ai_status` sensor (`ai/status.py` does not exist in
  this tree). Not referenced in the copy below.

### Intro copy (new content, before the existing key-acquisition guide)

Replaces today's `wizard_ai`/`section_ai` description
(`"AI je volitelná a dashboard funguje i bez ní. Groq, NVIDIA a vlastní HA AI Task jsou
rovnocenné volby."` — states that AI is optional, never says what it does or why to bother).
New structure: **what** → **why** → **how** (existing, kept).

> **CZ (heading):** "🤖 K čemu je tu AI"
>
> **CZ (body):** "Když nastavíte AI, vaše instalace (OIG Cloud) získá vlastní 'AI Task' entitu
> přímo ve vaší Home Assistant instanci. To znamená, že si ve svých automatizacích a skriptech
> můžete nechat od AI vygenerovat strukturovanou odpověď — založenou na pár anonymních číslech z
> vaší instalace (výkon a orientace panelů, kapacita a nastavení baterie), nikdy na vaší poloze,
> jménu nebo e-mailu. Tahle čísla nikam neodejdou bez vašeho souhlasu — a pokud zvolíte 'moje
> vlastní AI v Home Assistantu', neodejdou vůbec, protože se použije AI, kterou už máte
> nastavenou u sebe doma."
>
> **CZ (why-it-matters, concrete not marketing):** "Nejde o žádnou skrytou magii navíc — je to
> stejná AI Task funkce, kterou Home Assistant nabízí pro cokoliv jiného, jen předpřipravená s
> čísly z vaší FVE a baterie, abyste je nemuseli do každé automatizace přepisovat ručně."
>
> **CZ (optionality, kept — matches existing "AI je volitelná" framing, now placed AFTER the
> why instead of instead of it):** "AI je volitelná — dashboard i všechny výpočty (predikce
> baterie, ceny, bojler) fungují úplně stejně bez ní. Nic se kvůli vynechání tohoto kroku
> nezhorší."

### Existing key-acquisition guidance — kept as-is

Everything downstream of the intro (provider cards, numbered registration steps, `[Ověřit]`
verify flow, per-provider disclosure) is **not redefective** per the brief — R5 is the missing
"why", not the existing "how". `step-ai.ts` `PROVIDER_GUIDES` content
(`console.groq.com`/`build.nvidia.com` steps, free-tier figures, disclosure keys) carries over
unchanged into wizard v2's step 2. The only structural change: the intro block above now
renders *above* the three provider cards, inside the same step, not as a separate screen —
keeps the step count in the table of contents accurate (AI is still one step, now with a
"why" header before its "how" body).

## 6. Visual hierarchy guidance

Principles for whoever implements this — no pixel-level design, no CSS, no code.

**Progress indicator.** Two-level: macro-phase (Phase A / Phase B, §table-of-contents) as a
faint grouping label above the existing step-number nav (`nav.steps` in `index.ts` already
renders numbered buttons with a status badge per step — extend it with a phase label spanning
its steps, not a second competing progress bar). Per-step status (`pending`/`done`/`skipped`,
already implemented, `STEP_STATUS_LABELS`) stays exactly as today — do not redesign a working
mechanism.

**Section grouping within a step.** Cards over a flat list wherever a step has more than ~4
fields grouped by sub-topic (Battery's "Nabíjení"/"Automatika"/"Vyrovnávání"/"Plánovač", Pricing
supplier's A/B/C groups, Boiler's existing sensors/thresholds/circulation/legionella grouping).
A flat list is fine for steps with ≤4 ungrouped fields (Connection, Pricing–distribution). This
mirrors the pattern already shipped for the admin tile dialog (`164c622a8`, "sekce, inline
mřížka ikon") — reuse that established pattern rather than inventing a new one.

**Primary/secondary action styling.** Existing footer pattern in `index.ts` (`button.primary`
filled/colored for Next/Confirm, plain outlined for Back, italic text-only for Skip) is correct
and should extend unchanged to every new step — do not give any step a different action
hierarchy. One addition: **Step 9's "Uložit" (review mode) is the only destructive-adjacent
action in the whole wizard** (it writes every changed field at once) — style it as primary
per the existing convention, but its confirm copy (§3, "Toto se změní…") must appear directly
above the button, not in a separate dialog, so the primary-action click is never a surprise.

**Diff hints (new pattern, §3).** Render inline, directly under the field it annotates, in a
visually secondary/muted style (matches the existing `.hint`/`data-description` treatment
already used for field help text) — never as a modal, toast, or separate summary-only surface,
so the user sees the change at the moment they make it, not just at the end.

## Not established (flag explicitly)

- **R2 pending**: the exact set of keys that fail to seed from `entry.options` generally is
  R2's RCA, not yet available. §3's review-mode seeding requirement is written as an
  unconditional principle ("every field pre-fills from `entry.options`") precisely so it does
  not need R2's specific inventory to be actionable — whatever R2 finds unseeded is a bug
  against this spec, not a scope question.
- **AI capability claims**: verified only `ai_task.py` (generic AI Task entity) and
  `ai/backends.py`'s `PROMPT_ALLOWED_FIELDS` allow-list as live. `validate_config` and
  pricelist cross-verification are designed (`F1-DESIGN.md`) but unwired — explicitly excluded
  from the copy in §5. `battery_forecast/` has no AI ties at all, contradicting the ticket's own
  suggestion to reference it — flagged, not worked around.
- **Boiler in wizard v2**: this spec adds boiler as step 7 of the unified FE wizard, which is
  new relative to today's 3-step onboarding overlay (AI/Solar/Pricing only) — confirm with
  whoever owns the onboarding gate (D9/D10) that boiler should participate in the *soft-guide*
  step sequence (skippable, no lock) the same way solar/pricing do, since boiler was never part
  of the original 3-step design's scope statement.
- **GPS map picker**: §per-step content step 3 references "ideally a map picker" per
  `F1-DESIGN.md`'s own wording — this is visual guidance only; whether a map widget is feasible
  within the existing Lit/`www_v2` stack was not investigated (no code changes evaluated, per
  DESIGN-slice scope).
- **Pricing dataset-vs-contract distinguishing copy** (§4, step 5 intro): this is new copy with
  no existing precedent to verify against; recommend user-testing the two-step-back-to-back
  framing before shipping, since RCA-R3 itself did not investigate the dashboard settings form's
  current supplier-pricing UI (RCA-R3 "Not established").
