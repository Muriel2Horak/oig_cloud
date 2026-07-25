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
| 4 | Ceny — distribuce (Pricing — distribution) | Distributor/tariff dataset selection (5 registry fields) + derived single/dual info line + 5 tariff-schedule keys (dual only, round-2 move from step 5) | Dataset default shown as a *suggestion*, requires explicit confirm | Pre-filled from `entry.options`; diff hint on edit |
| 5 | Ceny — dodavatel (Pricing — supplier) | RESTORED: 18 of 24 legacy supplier/commercial keys (RCA-R3 + round-2 NT variants), only shown if `enable_pricing` | Empty/dataset-neutral defaults, `show_if`-gated by scenario pickers | Pre-filled from `entry.options` (values already live there — R3 finding); diff hint on edit |
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

Fields, in order: `solar_forecast_provider` → provider-conditional block → GPS pair → String 1
group → String 2 group.

**Provider-conditional block (owner correction, round 2):**

- `solar_forecast_provider=forecast_solar`: `solar_forecast_mode` (required, enum) +
  `solar_forecast_api_key` (**optional** — `config_registry.py:312-313`,
  `optional=True`, `default=""`; needed only for the faster update modes, not for
  `daily_optimized`).
- `solar_forecast_provider=solcast`: **both** `solcast_api_key` **and** `solcast_site_id` are
  required (`config_registry.py:314-317` — neither `Field()` carries `optional=True`, both
  `secret=True`, both `show_if=("solar_forecast_provider", ("solcast",))`). The original spec
  omitted `solcast_site_id` from the field order; it must render explicitly, directly below the
  API key field:

  | Field | CZ label | CZ hint |
  |---|---|---|
  | `solcast_site_id` | **CZ:** "Solcast Site ID" | **CZ:** "Povinný — ID vaší instalace ze solcast.com" |

  (Supersedes the current `fields.ts:39,100` entry — "Solcast site ID" / "Jen pro Solcast (z
  rooftop site URL)" — which is close but not the owner's wording; this spec's copy is
  authoritative.)

`solar_forecast_mode` is an enum (`hourly`, `every_4h`, `daily_optimized`,
`config_registry.py:309-311`) with **no per-value CZ label anywhere in the codebase today**
(`fields.ts` has a field-level label/hint at lines 81/128 but no enum-value map — confirmed by
grep, zero hits for `daily_optimized`/`every_4h` outside test fixtures). Per §6's enum-label
principle, render:

> **CZ:** "Každou hodinu (vyžaduje API klíč)" (`hourly`) / "Každé 4 hodiny (vyžaduje API klíč)"
> (`every_4h`) / "Denně, optimalizovaně (výchozí)" (`daily_optimized`)

**GPS pair** (`solar_forecast_latitude`+`solar_forecast_longitude`, rendered as a paired GPS
control, ideally a map picker per F1-DESIGN §5's "GPS (z HA, mapa)" — visual guidance only, no
widget code here). New-install mode: R4 fix removes the Prague fallback, so the fields render
**empty with a placeholder** instead of a silently-filled 50.0/14.0:

> **CZ:** (placeholder text, not a value) "Zadejte GPS souřadnice instalace (najdete je v HA →
> Nastavení → Systém → Obecné, nebo na mapě)"

**Owner correction, round 2:** add an explicit one-click action next to the GPS pair that reads
`hass.config.latitude`/`hass.config.longitude` (same values the HA-native flow already reads at
`steps.py:1687-1688`, so this is wiring an existing source into a new affordance, not a new data
source) into the two fields. This does **not** reintroduce the R4 defect: R4's bug was a silent,
unconditional fallback the user never asked for; this is an explicit, user-triggered action —
the no-fabricated-prefill principle is about values appearing *without* user intent, not about
offering a shortcut the user chooses to invoke.

> **CZ:** "📍 Převzít z Home Assistanta"

**String groups** (owner correction, round 2 — the original spec's "kwp/declination/azimuth"
shorthand read ambiguously as one combined control; it is not): each string is **three separate
numeric fields**, no combined input, shown only if `solar_forecast_stringN_enabled=true`:

| Field | CZ label | CZ hint |
|---|---|---|
| `solar_forecast_string1_kwp` | **CZ:** "Výkon stringu 1 (kWp)" | **CZ:** "Špičkový výkon panelů v tomto stringu" |
| `solar_forecast_string1_declination` | **CZ:** "Sklon stringu 1 (°)" | **CZ:** "0 = vodorovně, 90 = svisle" |
| `solar_forecast_string1_azimuth` | **CZ:** "Azimut stringu 1 (°)" | **CZ:** "0 = jih, −90 = východ, 90 = západ" |

(String 2 fields mirror the above with "stringu 2" / `string2` — omitted here to avoid
duplication.)

The registry-driven FE resolves these labels from `CS_LABELS` in
`www_v2/src/i18n/fields.ts` (not `cs.json`'s `wizard_solar` section — that is a separate,
HA-native translation layer this FE step does not read). All 15 solar fields already have
correct `CS_LABELS` entries per RCA-R1's corrected inventory (R1's defect is scoped to 5 pricing
+ 2 battery fields; solar is unaffected) — reuse verbatim for the fields whose copy is not
revised above.

### Step 4 — Ceny — distribuce

Fields: `confirmed_distribution_distributor` → `confirmed_distribution_tariff` (options
re-derived from the live `/pricelists` dataset per selected distributor, existing
`onPricingFieldChange` logic in `index.ts:1011-1038` — reuse, not redesigned) →
`confirmed_distribution_price_incl_vat`/`price_excl_vat`/`unit` (read-only display, derived).

**Dual-tariff derivation (owner correction, round 2 — MAJOR, see §4 for the full field-inventory
impact).** The selected `confirmed_distribution_tariff` code carries single/dual-tariff nature by
itself — verified against the bundled dataset: `D01d`/`D02d` never carry an `nt` price leg,
`D25d`/`D26d`/`D27d`/`D35d`/`D45d`/`D56d`/`D57d`/`D61d` always do, for all three distributors
(`remote_config/data/pricelists.json`, cross-checked programmatically — 30/30 tariff×distributor
combinations match this split with zero exceptions). The wizard must **derive** dual-ness from
this selection; the user never answers "do I have two tariffs" as a separate question — the
sazba they picked already says so. Immediately after tariff selection, show an info line:

> **CZ (single):** "Jednotarifní — jedna cena po celý den."
>
> **CZ (dual):** "Dvoutarifní — ceny zvlášť pro VT a NT."

When dual, this step additionally reveals:
- The NT start-time field(s) (moved here from step 5's old placement — this step is where the
  tariff is chosen, so this is where its consequences should show, not one step later).
- **Both** VT and NT distribution prices from the dataset, not VT only. This is a display gap,
  not a data gap — see §4a: the dataset already carries the NT leg, the wizard just does not
  render it yet.

**Cross-step data flow:** step 5's layout (which supplier fields render, VT-only vs VT+NT)
depends on step 4's tariff selection. This is a new explicit dependency between two steps that
did not previously share state this way — the wizard's draft state must carry the derived
single/dual flag forward from step 4 into step 5's `show_if` evaluation (same mechanism as the
existing per-step draft objects, e.g. `solarDraft`/`pricingDraft` in `index.ts` — a peer to those,
not a rename of them).

RCA-R1 defect (corrected): these 5 fields currently render **humanised** fallback labels
(`confirmed_distribution_distributor` → "confirmed distribution distributor") because
`CS_LABELS` in `www_v2/src/i18n/fields.ts` has no entry for them — `strings.json`/
`translations/cs.json` are a different, HA-native layer and are not the cause (R1 fix is
translation-data-only in `fields.ts`, tracked separately — this spec supplies the copy R1's fix
should ship):

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

See §4 below — the field-inventory restoration is the second centerpiece of this spec. Revised
round 2: 18 of the 24 `pricing_supplier` keys render here (5 tariff-schedule keys moved to step
4, `dual_tariff_enabled` is derived and renders nowhere) — see §4's field-inventory count.

### Step 6 — Baterie a plánovač

Fields, grouped: "Nabíjení" (`charge_rate_kw`, `battery_comfort_soc_percent`) → "Automatika"
(`auto_mode_switch_enabled`) → "Vyrovnávání článků" (`balancing_enabled` gates
`balancing_interval_days`/`balancing_hold_hours`/`balancing_opportunistic_threshold`/
`balancing_economic_threshold`) → "Plánovač" (`expensive_percentile`, `cheap_window_percentile`).

The registry-driven FE resolves these labels from `CS_LABELS` in `www_v2/src/i18n/fields.ts`
(not `cs.json`'s `wizard_battery` section — a separate, HA-native layer this FE step does not
read). 8 of 10 battery fields already have correct `CS_LABELS` entries — including
`battery_comfort_soc_percent` ("Komfortní rezerva baterie (%)") and `expensive_percentile`
("Práh drahých hodin (%)"), both already present at `fields.ts:30-31` — reuse verbatim, no new
copy needed for those two. RCA-R1's corrected inventory found the actual 2 missing entries are
`balancing_opportunistic_threshold` and `balancing_economic_threshold`:

| Field | CZ label | CZ hint |
|---|---|---|
| `balancing_opportunistic_threshold` | **CZ:** "Oportunní práh balancování (%)" | **CZ:** "Balancování proběhne dřív, pokud je v tomto okně dost levné energie" |
| `balancing_economic_threshold` | **CZ:** "Ekonomický práh balancování (%)" | **CZ:** "Nad tímto cenovým prahem se balancování odkládá, aby se nenabíjelo draze" |

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
local_only`).

**Correction to the original spec text:** this step is part of the FE dashboard wizard (this
spec's target surface, per the Scope section above), so — same as steps 3/6 — it resolves labels
from `CS_LABELS` in `fields.ts`, **not** `cs.json`'s `wizard_intervals` section (a separate,
HA-native translation layer this FE step does not read). The original spec's "reuse `cs.json`
verbatim" instruction was inconsistent with its own established pattern; verified: `fields.ts`
has **zero entries** for `data_source_mode`, `standard_scan_interval`, `extended_scan_interval`,
or the `local_proxy_stale_minutes`/`local_event_debounce_ms` pair today (grep, zero hits) — this
step's fields are entirely unlabeled in the FE layer, not merely mislabeled.

`data_source_mode` (owner correction, round 2 — enum labels, general principle in §6): enum is
3-valued in the registry (`cloud_only`/`local_only`/`hybrid`,
`config_registry.py:451-457`) but the UI only ever offers two — `hybrid` is a legacy value kept
in the enum purely so a GET→POST round-trip on a pre-existing entry that still stores `hybrid`
stays honest (`config_registry.py:446-449` comment, verified). No raw enum value may be a visible
label:

> **CZ:** "Přes OIG Cloud (výchozí — funguje vždy)" (`cloud_only`) / "Přímo z boxu po domácí síti
> (rychlejší, bez internetu)" (`local_only`)

`standard_scan_interval`/`extended_scan_interval`/`local_proxy_stale_minutes`/
`local_event_debounce_ms` are numeric fields (seconds/minutes/ms) — reuse the existing `cs.json`
`wizard_intervals` **copy text** as source material for the new `fields.ts` entries (the words
are fine, only the file they live in is wrong), adapted to this step's field-level label/hint
shape.

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

  This paragraph describes what RCA-R3 found *already stored* by the legacy options-flow —
  necessarily the original 19-key set, since the 5 new `_nt`-variant keys (§4, round 2) are net
  new and cannot pre-exist in any entry. A dual-tariff user reviewing a pre-R3-fix install
  correctly sees their 19 legacy values recovered per the note above, **and** empty new `_nt`
  fields per the new-install rule (nothing to recover — the value never existed) — both rules
  apply simultaneously per-field, not as a whole-section either/or.

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
already in `config_registry.py`, unchanged — step 4) and `pricing_supplier` — RCA-R3's original
19 legacy keys, **revised below (owner correction, round 2 — MAJOR)** to 24 distinct keys (19 +
5 new NT-variant keys) split across two steps: the 5 tariff-schedule keys now render in step 4
(they describe the tariff itself, a distribution-level fact), everything else renders in step 5
(the supplier contract). This spec designs the wizard UI for `pricing_supplier`; the
registry/backend wiring (`Field()` definitions, `_map_pricing_to_backend`) is implementation,
not this spec's deliverable — the `_vt`/`_nt` suffix convention used below is not invented here:
it is already established at `steps.py:147-216` (`_migrate_import_percentage`,
`_migrate_import_fixed`, `_migrate_export_pricing` — a pre-existing migration path for the
HA-native flow's own dual-tariff handling) and already partly used in RCA-R3's original 19-key
set (`fixed_commercial_price_vt`/`_nt`, `distribution_fee_vt_kwh`/`_nt`,
`tariff_vt_start_weekday`/`tariff_nt_start_weekday`). This spec extends the same convention to
the three fields that RCA-R3's inventory left unsplit; final backend key names remain the
implementer's call.

**`dual_tariff_enabled` is no longer a user-facing field, in either step** (owner correction,
round 2 — MAJOR): dual-ness is derived from `confirmed_distribution_tariff` in step 4 (see
above), never asked of the user directly. The option key itself may remain in `entry.options`
as a derived/persisted value — implementer's call, for backward compat with entries that already
have it stored — but the UI contract is unconditional: **no step renders a "Mám dva tarify"
toggle anywhere.**

Step 5 layout — three sub-groups matching the legacy wizard's existing 3-step split
(`wizard_pricing_import`/`export`/`distribution`), collapsed into sections within one step
instead of three separate steps (consistent with this spec's "fewer, richer steps" principle,
§6):

**A — Nákupní cena (import)**

`spot_pricing_model` (enum: `percentage`|`fixed`|`fixed_prices` — selector, drives the rest of
this group via `show_if`). Owner correction, round 2: the two variable-price scenarios now split
VT/NT the same way `fixed_prices` already did — `_vt` is the base key (always shown when its
scenario is selected), `_nt` is a new key shown only when the tariff is dual:

| Field | `show_if` | CZ label | CZ hint |
|---|---|---|---|
| `spot_pricing_model` | — | **CZ:** "Scénář nákupní ceny" | **CZ:** "💰 SPOT + procento — variabilní cena podle burzy · 💵 SPOT + fixní poplatek — stabilnější · 🔒 FIX cena — předvídatelná" |
| `spot_positive_fee_percent_vt` | `spot_pricing_model=percentage` | **CZ:** "Přirážka při kladné spotové ceně, VT (%)" | **CZ:** "Při kladné spotové ceně: cena × (1 + procento/100). Např. 15 % = spot × 1,15" |
| `spot_positive_fee_percent_nt` *(new)* | `spot_pricing_model=percentage` AND tariff is dual | **CZ:** "Přirážka při kladné spotové ceně, NT (%)" | same formula, NT leg |
| `spot_negative_fee_percent_vt` | `spot_pricing_model=percentage` | **CZ:** "Přirážka při záporné spotové ceně, VT (%)" | **CZ:** "Při záporné spotové ceně: cena × (1 − procento/100). Např. 9 % = spot × 0,91" |
| `spot_negative_fee_percent_nt` *(new)* | `spot_pricing_model=percentage` AND tariff is dual | **CZ:** "Přirážka při záporné spotové ceně, NT (%)" | same formula, NT leg |
| `spot_fixed_fee_mwh_vt` | `spot_pricing_model=fixed` | **CZ:** "Fixní poplatek, VT (CZK/MWh)" | **CZ:** "Konstantní poplatek přičtený ke spotové ceně" |
| `spot_fixed_fee_mwh_nt` *(new)* | `spot_pricing_model=fixed` AND tariff is dual | **CZ:** "Fixní poplatek, NT (CZK/MWh)" | same, NT leg |
| `fixed_commercial_price_vt` | `spot_pricing_model=fixed_prices` | **CZ:** "Fixní nákupní cena VT (CZK/kWh)" | **CZ:** "⚠️ Zadávejte bez DPH a distribuce" |
| `fixed_commercial_price_nt` | `spot_pricing_model=fixed_prices` AND tariff is dual | **CZ:** "Fixní nákupní cena NT (CZK/kWh)" | **CZ:** "⚠️ Zadávejte bez DPH a distribuce" |

**B — Prodejní cena / export**

Same VT/NT treatment as group A, for the two scenarios with a migration precedent
(`_migrate_export_pricing`, `steps.py:201-235`). `export_fixed_price` (the `fixed_prices`
scenario) has **no VT/NT precedent anywhere in the codebase today** — `_migrate_old_pricing_data`
has no branch for it at all (confirmed by reading the function in full) — so it is **not** split
here; flagged in "Not established" at the end of this document rather than invented.

| Field | `show_if` | CZ label | CZ hint |
|---|---|---|---|
| `export_pricing_model` | — | **CZ:** "Scénář prodejní ceny" | **CZ:** "💰 SPOT − procento — výhodné při vysokých cenách · 💵 SPOT − fixní srážka — stabilnější výkup · 🔒 FIX cena — stabilní po celý rok" |
| `export_fee_percent_vt` | `export_pricing_model=percentage` | **CZ:** "Srážka z exportu, VT (%)" | **CZ:** "Např. 15 % = dostanete 85 % ze spotové ceny (spot × 0,85)" |
| `export_fee_percent_nt` *(new)* | `export_pricing_model=percentage` AND tariff is dual | **CZ:** "Srážka z exportu, NT (%)" | same formula, NT leg |
| `export_fixed_fee_czk_vt` | `export_pricing_model=fixed` | **CZ:** "Fixní srážka exportu, VT (CZK/kWh)" | **CZ:** "Fixní srážka od spotové ceny. Např. 0,20 CZK/kWh = spot − 0,20" |
| `export_fixed_fee_czk_nt` *(new)* | `export_pricing_model=fixed` AND tariff is dual | **CZ:** "Fixní srážka exportu, NT (CZK/kWh)" | same, NT leg |
| `export_fixed_price` | `export_pricing_model=fixed_prices` | **CZ:** "Fixní výkupní cena (CZK/kWh)" | **CZ:** "Výkupní cena bez ohledu na spot" |

**C — Distribuce, tarify a DPH**

Shrunk from 9 to 3 keys: `dual_tariff_enabled` is gone (derived, see above) and the 5
tariff-schedule keys moved to step 4 (see there).

| Field | `show_if` | CZ label | CZ hint |
|---|---|---|---|
| `distribution_fee_vt_kwh` | — | **CZ:** "Poplatek za distribuci VT (CZK/kWh)" | **CZ:** "Např. 1,42 CZK/kWh" |
| `distribution_fee_nt_kwh` | tariff is dual | **CZ:** "Poplatek za distribuci NT (CZK/kWh)" | **CZ:** "Např. 0,91 CZK/kWh" |
| `vat_rate` | — | **CZ:** "DPH (%)" | **CZ:** "Standardně 21 %" |

**Step 4's tariff-schedule fields** (relocated from this section, owner correction round 2 — the
tariff's own start-time schedule is a distribution-level fact, shown right after tariff
selection, not bundled into the supplier-contract step):

| Field | `show_if` | CZ label | CZ hint |
|---|---|---|---|
| `tariff_vt_start_weekday` | tariff is dual | **CZ:** "VT začátek, pracovní den (hodina)" | **CZ:** "Např. '6' = 06:00" |
| `tariff_nt_start_weekday` | tariff is dual | **CZ:** "NT začátek, pracovní den (hodina1,hodina2)" | **CZ:** "Např. '22,2' = 22:00 večer a 02:00 ráno" |
| `tariff_weekend_same_as_weekday` | tariff is dual | **CZ:** "Víkend stejně jako pracovní dny" | **CZ:** "Vypněte, pokud se víkendové tarify liší" |
| `tariff_vt_start_weekend` | tariff is dual AND `tariff_weekend_same_as_weekday=false` | **CZ:** "VT začátek, víkend (hodina)" | **CZ:** "Nechte prázdné pro NT celý den" |
| `tariff_nt_start_weekend` | tariff is dual AND `tariff_weekend_same_as_weekday=false` | **CZ:** "NT začátek, víkend (hodina1,hodina2)" | **CZ:** "Např. '0' = NT celý den" |

**Field-inventory count, revised:** RCA-R3's original 19 keys + 5 new `_nt`-variant keys
(`spot_positive_fee_percent_nt`, `spot_negative_fee_percent_nt`, `spot_fixed_fee_mwh_nt`,
`export_fee_percent_nt`, `export_fixed_fee_czk_nt`) = **24 distinct `pricing_supplier` registry
keys**. Of those: 18 render in step 5 (group A 9 + group B 6 + group C 3), 5 render in step 4
(tariff schedule), 1 (`dual_tariff_enabled`) is derived/persisted and renders nowhere. At most
scenario-count-many fields are visible at once (the `show_if` chains are mutually exclusive per
scenario selector), never all 24 simultaneously.

Section intro copy (step 5, replaces the "not configurable" gap RCA-R3 found):

> **CZ:** "Dodavatelské a distribuční ceny (obchodní podmínky vaší smlouvy s dodavatelem a
> distributorem elektřiny). Tyto hodnoty se liší od datové sady v předchozím kroku — tam je
> orientační ceník distributora, tady je vaše skutečná smlouva."

That last sentence exists specifically to prevent the confusion RCA-R3's split is designed
around: two visually similar "pricing" steps back to back need an explicit sentence
distinguishing "dataset reference price" (step 4) from "your actual contract" (step 5), or the
restoration re-creates the exact "which price field is real" confusion R6 complains about.

## 4a. Bundled dataset VT/NT: already shipped, spec correction (owner correction, round 2)

The owner's round-2 brief asked for a new dataset requirement: "`pricelists.json` currently
carries ONE price per tariff; dual tariffs need a VT/NT price split per distributor — extend the
dataset schema + `scripts/build_pricelists.py`." **Verified against code: this premise does not
hold. The split already exists and is already correct** — flagging the mismatch rather than
designing around it, same precedent as RCA-R4's "Discrepancy with the original ticket wording."

Evidence:

- `scripts/build_pricelists.py`'s own module docstring (schema v2, "ERU-decree mode") already
  documents a per-tariff `vt`/`nt` sub-object split: single-tariff codes (`D01d`, `D02d`) carry
  `vt` only, dual-tariff codes carry both `vt` and `nt`, with the top-level `price_incl_vat`/
  `price_excl_vat` mirroring the VT leg "so existing 2-level readers keep working."
- The bundled `remote_config/data/pricelists.json` matches this exactly: checked
  programmatically across all 3 distributors × 11 tariff codes (33 combinations) — `nt` is
  present if and only if the tariff code is one of `D25d/D26d/D27d/D35d/D45d/D56d/D57d/D61d`,
  absent for `D01d`/`D02d`/`POZE`. Zero exceptions.
- The source XLSX (`scripts/data_sources/ceny-nn26-1.xlsx`, sheet `Distribuce`) genuinely
  carries both legs for every dual-tariff sazba: e.g. row 322 "z platu za distribuované množství
  elektřiny **ve vysokém tarifu**" (VT) and row 325 "**v nízkém tarifu**" (NT) are two separate
  labeled price-row blocks under "Sazba D 25d". `build_pricelists.py` already reads both and the
  resulting JSON values match the XLSX cells exactly (ČEZ D25d: VT 2252.45, NT 116.5 Kč/MWh in
  both the sheet and the bundled JSON).
- The `/pricelists` REST endpoint (`ha_rest_api.py:1354-1419`, `OIGCloudPricelistsView`) already
  forwards the raw per-tariff dict — including the `nt` sub-object — to the frontend unfiltered
  (`distributors[distributor][tariff] = dict(rates)`, no key allowlist). The FE already has the
  NT data on the wire today, for every request.

**What is actually missing** — and what step 4's "displays BOTH VT and NT distribution prices"
requirement (above) really depends on: `config_registry.py`'s `pricing` section only declares
`confirmed_distribution_price_incl_vat`/`_excl_vat` (the VT-mirrored top-level pair, per
`config_registry.py:421-434`) — there is no registered field for the NT leg, and step 4's current
FE rendering only ever reads the VT-mirrored pair, never `selected_rate.nt`. This is a **wizard
display gap**, not a dataset or build-script gap. The implementer's task is: add NT-leg display
(either two new registry `Field()`s, `confirmed_distribution_price_nt_incl_vat`/`_excl_vat`, or a
direct read of the already-delivered `distributors[...].nt` object client-side — implementer's
call) and render it in step 4 when the tariff is dual. No change to `pricelists.json`'s schema or
to `scripts/build_pricelists.py` is needed or should be made.

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

**No raw enum value is ever a visible label (owner correction, round 2 — spec-wide principle).**
Every `enum`-typed registry field renders a human Czech label per allowed value, never the raw
string (`hourly`, `cloud_only`, `percentage`, …) — this generalizes the specific defects already
fixed above (RCA-R1's field-label gap was about *field* labels; this is the equivalent
requirement for *enum-value* labels, a distinct gap RCA-R1 did not cover). Concrete cases fixed
by this spec: `solar_forecast_mode` (§ Step 3), `data_source_mode` (§ Step 8, note `hybrid` stays
out of the UI per `config_registry.py:447-449`). Cases already correct and unchanged: every
pricing-scenario enum (`spot_pricing_model`, `export_pricing_model`, `import_pricing_scenario`,
`export_pricing_scenario`) already carries humanized labels in §4's tables above — no rework
needed there, cited here only so the principle's scope is unambiguous.

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
- **`export_fixed_price` VT/NT split** (§4, group B, round 2): every other commercial-price
  scenario has an established `_vt`/`_nt` migration precedent in `steps.py` (either in
  `_migrate_old_pricing_data` or already in RCA-R3's original inventory); the `fixed_prices`
  export scenario has none — `_migrate_old_pricing_data` has no branch for old
  `export_pricing_model=fixed_prices` at all. This spec deliberately does **not** invent a split
  for it (see §4). Flag to whoever wires the registry: either add the missing migration branch
  (mirroring `fixed_commercial_price_vt`/`_nt`'s existing pattern) or confirm this scenario is
  genuinely VT-only by design and the asymmetry is intentional.
