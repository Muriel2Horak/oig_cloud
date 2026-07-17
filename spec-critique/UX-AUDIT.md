# V2 Settings — UX / Wiring Code Audit

**Scope:** `custom_components/oig_cloud/www_v2` settings tab + the BE it talks to
(`api/ha_rest_api.py`, `config_registry.py`, `config/steps.py`). Read-only audit,
no code changed. Anchors are `file:line` against the `codex/f1-spec-complete` tree.

**TL;DR — provider-wiring root cause (one sentence):**
The solar-provider `<select>` only writes `solar_forecast_provider` into pending
state; every solar field is flat-listed in `SOLAR_FIELDS`
(`www_v2/src/ui/features/settings/index.ts:83-97`) with **no conditional render**,
so switching provider neither reveals the correct key nor hides the irrelevant one —
and the REST POST (`api/ha_rest_api.py:1248-1279`) does no provider cross-field
validation to compensate, so an incomplete provider switch saves silently.

---

## Finding counts

- **MAJOR (must fix in Plan 3):** 6
- **MINOR / nice-to-have:** 7
- **Total:** 13

Must-fix set: U1 (provider conditional visibility), U2 (missing forecast.solar
key + mode fields), U3 (REST POST skips provider validation), U4 (transparent
dropdowns), U5 (API keys in cleartext), U6 (azimuth convention clash).

---

## MAJOR — must fix in Plan 3

### [MAJOR] U1 — Provider switch has no conditional field visibility
- **Anchor:** `www_v2/src/ui/features/settings/index.ts:83-97` (field list),
  `:574-586` (`select` renderer), `:833` (solar card render).
- **Symptom:** User picks *Poskytovatel = Solcast* — the Solcast site ID / API-key
  fields are already visible (good), but picking *forecast.solar* leaves them
  visible too (irrelevant, confusing). There is **no** reveal/hide on provider
  change. The `select` renderer at `:580-583` only calls `setPending(...)`; nothing
  re-evaluates which sibling fields should show. The only conditional rendering in
  the whole file is hand-rolled inline inside `renderBoilerCard()` (`:741`, `:756`,
  `:763`, `:769-770`) — solar gets none.
- **Root cause:** No conditional-visibility mechanism exists. `grep` for
  `show_if|depends_on|visible_if|showIf` in `www_v2/src/` → **none**. The
  `FieldDef` interface (`:34-49`) has no `showIf`/`dependsOn` field.
- **Fix (minimal, registry-driven):** Add `showIf?: { field: string; in: string[] }`
  to `FieldDef`, then in `renderField`/`renderCard` skip fields whose `showIf`
  predicate is unsatisfied against `current(section, showIf.field)`. Tag
  `solcast_site_id` / `solcast_api_key` with `showIf:{field:'solar_forecast_provider',
  in:['solcast']}` and `solar_forecast_api_key` with `in:['forecast_solar']`. This
  mirrors the inline gating already used in `renderBoilerCard` but makes it
  declarative and reusable. (See also U9 — prefer to drive this from
  `/config_registry` so the BE stays the single source of truth.)

### [MAJOR] U2 — forecast.solar API key + forecast mode are not editable from the dashboard
- **Anchor:** FE form `index.ts:83-97` vs. data model
  `www_v2/src/data/settings-data.ts:38-54` (`SolarConfig` has
  `solar_forecast_mode`, `solar_forecast_api_key_set`) and BE registry
  `config_registry.py:153-156`.
- **Symptom:** The BE registry defines `solar_forecast_mode`
  (`config_registry.py:154`, enum `hourly|every_4h|daily_optimized`) and
  `solar_forecast_api_key` (`:155`, secret). The GET handler returns both
  (`api/ha_rest_api.py:1212-1218`, incl. `solar_forecast_api_key_set`). The FE
  data model types them (`settings-data.ts:40-42`). **But `SOLAR_FIELDS`
  (`index.ts:83-97`) renders neither.** A forecast.solar user who wants hourly /
  every-4h updates — which *requires* an API key (`config/steps.py:1613-1614`,
  error `api_key_required_for_frequent_updates`) — cannot set the key or the mode
  from the dashboard at all; they must fall back to the HA options flow.
- **Fix:** Add `solar_forecast_mode` (select) and `solar_forecast_api_key` (secret
  text) to `SOLAR_FIELDS`, gated `showIf:{field:'solar_forecast_provider',
  in:['forecast_solar']}`. Surface the mode→key dependency in the hint (the options
  flow already labels the enum values “vyžaduje API klíč”, `config/steps.py:1693-1702`).

### [MAJOR] U3 — module_config REST POST does no provider/mode cross-field validation
- **Anchor:** `api/ha_rest_api.py:1248-1279` (POST handler) vs. the options-flow
  validation it should mirror at `config/steps.py:1607-1622`
  (`_validate_solar_provider`).
- **Symptom:** The POST loop (`:1262-1276`) only calls `coerce_value` per field
  (type/range/enum). It never checks that *solcast* implies a non-empty
  `solcast_api_key` + `solcast_site_id`, nor that *forecast.solar* + fast mode
  implies `solar_forecast_api_key`. The HA options flow enforces all of this
  (`config/steps.py:1613-1621`). So a user can switch provider to *Solcast* in the
  dashboard, leave the key/site blank, hit **Uložit**, get a green “✓ Uloženo”
  toast (`index.ts:534`) — and the forecast silently stops updating. The empty-key
  guard at `:1269` (`if field.secret and value == "": continue`) makes it worse: a
  blank key is treated as “keep current”, so the misconfiguration leaves the
  previous (forecast.solar) key in place across a provider switch.
- **Fix:** Add a per-section cross-field validator on the POST path that reuses the
  same rules as `_validate_solar_provider` (factor it out of `config/steps.py` into
  a shared helper both surfaces call). Return violations in the existing
  `{ "fields": {...} }` shape (`:1277`) so the FE already renders them
  (`index.ts:502-505`). This is the safety net behind U1/U2.

### [MAJOR] U4 — Dropdown popovers are see-through in dark mode (native `<select>`)
- **Anchor:** CSS `www_v2/src/ui/features/settings/index.ts:289-297` (styles the
  closed `<select>` box only); renderer `:574-586`; theme
  `www_v2/src/ui/theme.ts:95-108` (`applyTheme` sets CSS vars but **not**
  `color-scheme`); static meta `www_v2/index.html:6`
  (`<meta name="color-scheme" content="light dark">`).
- **Symptom:** The select box itself is themed (`background: var(--secondary-background-color)`
  = `#1a2044` dark, text `#e1e1e1`). But the **options popover is painted by the
  OS/browser**, and the `<option>` elements have no `background`/`color` rule
  anywhere (`grep "option {"` in the file → only the `FieldDef.options` data field,
  no CSS). The page declares only a static `color-scheme: light dark`
  (`index.html:6`) and never sets `color-scheme` dynamically to match the *applied*
  HA theme — `applyTheme()` (`theme.ts:95-108`) writes every CSS variable but omits
  `color-scheme`. So when HA runs dark on a light-OS host (the common kiosk case),
  the browser paints the option list in the OS (light/transparent) scheme: white or
  transparent popup over a dark card → the “transparent dropdown” the user sees.
- **Fix (two layers):**
  1. **One-line minimum:** set `color-scheme` to match the live theme — add
     `'color-scheme': 'dark'` to `DARK_THEME` and `'color-scheme': 'light'` to
     `LIGHT_THEME` (`theme.ts:31-59`), so `applyTheme`’s loop (`:99-101`) exports
     it and native controls follow the app theme.
  2. **Robust:** replace the native `<select>` with a custom themed popover,
     reusing the existing `<oig-entity-picker>` pattern
     (`www_v2/src/ui/components/entity-picker.ts:1-16` — already a keyboard-
     accessible, `CSS_VARS`-themed dropdown). This is the only cross-platform
     guarantee (some Linux/WebView renderers ignore `color-scheme` for option
     lists). Style `select option { background: var(--oig-surface); color: ... }`
     is a weaker middle ground that helps Chromium but not all WebViews.

### [MAJOR] U5 — API keys are typed and echoed in cleartext (`type="text"`)
- **Anchor:** `www_v2/src/ui/features/settings/index.ts:626-636`.
- **Symptom:** Secret detection is correct (`const isSecret = f.key.endsWith('api_key')`,
  `:627`) and the placeholder masks whether a key is set (`:635`). But the input is
  rendered `<input type="text">` (`:634`) — the API key is visible on screen as the
  user types and while editing. `grep` for `type='password'` in `www_v2/src/` →
  **none**. For an over-the-shoulder / kiosk context (this dashboard runs on a Nest
  Hub per project context) that is a real exposure.
- **Fix:** Render secret fields as `<input type="password" autocomplete="off">`
  when `isSecret`. Keep the current “blank = keep current” semantics (POST already
  treats empty secret as no-op, `api/ha_rest_api.py:1269`). The placeholder already
  communicates “nastaveno / nenastaveno”.

### [MAJOR] U6 — Azimuth convention clashes between dashboard and options flow
- **Anchor:** FE `index.ts:92` and `:96` (`min:-180, max:180`, hint “0 = jih, −90 =
  východ, 90 = západ”); BE registry `config_registry.py` `solar_forecast_string1_azimuth`
  / `string2_azimuth` (`min=-180, max=180`); options-flow validation
  `config/steps.py:1668` (`if not (0 <= azim1 <= 360)`) and `:1692`
  (`0 <= azim2 <= 360`), with default `180` (`config/steps.py:1684`).
- **Symptom:** The **same config key** (`solar_forecast_string1_azimuth`) has two
  incompatible validation ranges and two different “south” conventions: dashboard +
  registry use signed −180…180 (0 = south), the options flow uses unsigned 0…360
  (180 = south). A user who configures via the dashboard and later re-saves via the
  HA options flow (or vice versa) gets a silently rotated roof, or a validation
  rejection, on the same stored value. forecast.solar itself expects yet another
  convention, so the ambiguity is load-bearing.
- **Fix:** Pick one convention (recommend signed −180…180, which is what the
  registry + dashboard already agree on and what forecast.solar documents) and make
  `_validate_solar_string1/2` (`config/steps.py:1660-1695`) accept/normalise to it.
  This is a correctness bug, not just cosmetics — track under Plan 3 alongside U1/U3.

---

## MINOR / nice-to-have

### [MINOR] U7 — String 2 geometry fields are always shown even when String 2 is disabled
- **Anchor:** `www_v2/src/ui/features/settings/index.ts:93-96`.
- The `solar_forecast_string2_enabled` toggle exists (`:93`) but gates nothing —
  `string2_kwp/declination/azimuth` (`:94-96`) render unconditionally. Compare with
  the boiler section, where `secondTherm` does gate `boiler_temp_sensor_bottom`
  (`:741`). Fix: same `showIf` mechanism as U1, `showIf:{field:
  'solar_forecast_string2_enabled', in:['true']}` (bool true). Mirror for
  `string1_*` against `string1_enabled`.

### [MINOR] U8 — Battery balancing thresholds exist in registry + data model but not in the form
- **Anchor:** BE `config_registry.py` (`balancing_opportunistic_threshold`,
  `balancing_economic_threshold`, lines ~147-150) and legacy
  `api/ha_rest_api.py:1135-1136`; FE data model `settings-data.ts:33-34`
  (`BatteryConfig` types them); FE form `BATTERY_FIELDS` `index.ts:72-81` **omits
  them**.
- Symptom: two tunable thresholds are round-tripped by the GET/POST and typed in the
  FE model, but the user can only edit them via YAML/options-flow. Either render
  them (under `balancing_enabled`) or drop them from the typed model to avoid the
  “looks editable, isn’t” gap. Same class of drift as U2.

### [MINOR] U9 — FE keeps hand-maintained field lists that duplicate (and drift from) `/config_registry`
- **Anchor:** FE lists `index.ts:62-145` (`MODULE_FIELDS`, `BATTERY_FIELDS`,
  `SOLAR_FIELDS`, `BOILER_FIELDS_ALL`); canonical BE registry served at
  `api/ha_rest_api.py:1284-1297` (`OIGCloudConfigRegistryView` →
  `registry_as_api_dict`, `config_registry.py:94-120`).
- Symptom: `config_registry.py:1-6` states the registry is the single source of
  truth that “the dashboard forms (served via /config_registry) … derive validation
  and rendering from — never from local field lists.” But `grep config_registry` in
  `www_v2/src/` → **the FE never calls `/config_registry`**; it ships its own
  parallel lists. That is exactly how U2 (missing `solar_forecast_mode`/key) and U8
  (missing thresholds) happened, and it will keep happening. The legacy
  `_MODULE_CONFIG_FIELDS` dict in `ha_rest_api.py:1078-1163` is already marked
  “LEGACY — superseded by config_registry; removed in Plan 4” — the FE is the last
  hold-out.
- Fix (Plan 3 enabler): have the FE fetch `/config_registry` once and build the
  forms from it (sections, types, enums, min/max/step, secret). Add the `showIf`
  metadata to the registry `Field` (`config_registry.py:18-39`) and expose it via
  `registry_as_api_dict` so U1/U7 become data, not code. `label`/`hint` are already
  i18n keys (`:37-44`) — wire them to the i18n layer at the same time.

### [MINOR] U10 — Selects and inputs have no accessible name (label not associated)
- **Anchor:** `www_v2/src/ui/features/settings/index.ts:547-553` (label is a
  `<span class="lab">`, not a `<label for>`), `:574-604` (select/number),
  `:630-638` (text).
- Symptom: no `<label for=…>` association, no `aria-label`/`aria-labelledby` on any
  control. The `<select>` (U4’s subject) is unnamed to screen readers. Fix: render
  `<label for>` wrapping or set `aria-labelledby` to the label span id.

### [MINOR] U11 — Second-thermometer: bottom-sensor value silently ignored when toggle is off
- **Anchor:** `www_v2/src/ui/features/settings/index.ts:740-741`.
- The bottom sensor field only renders when `boiler_enable_second_thermometer` is
  on (`:741`), but if a user previously saved a bottom sensor and later turns the
  toggle off, the stored `boiler_temp_sensor_bottom` is never cleared on save
  (POST only sends pending/dirty fields, `:494`). Stale value persists in the entry.
  Low impact (planner only reads it when the toggle is on), but worth either
  clearing on toggle-off or noting. Same pattern lurks for U7 string fields and the
  hasAlt/home56 groups.

### [MINOR] U12 — Two sibling “percentile” fields use different storage units (trap)
- **Anchor:** `expensive_percentile` stored as a 0.5–0.95 fraction
  (`config_registry.py` + legacy `api/ha_rest_api.py:1129`), FE shows 50–95 with
  `scale:100` (`index.ts:75`); `cheap_window_percentile` stored as 5–80 percent
  directly (`config_registry.py`, FE `:80` no scale).
- Symptom: two fields labelled “percentile” next to each other use different units;
  the FE hides this correctly today via `scale`, but it is a maintenance trap
  (anyone reading either field assumes one unit). Not user-visible now — flag for
  the U9 registry-driven rewrite to normalise.

### [MINOR] U13 — Inconsistent hint coverage across numeric fields
- **Anchor:** `www_v2/src/ui/features/settings/index.ts:72-81`.
- Several sibling numeric fields carry a `hint` (e.g. `expensive_percentile:75`,
  `battery_comfort_soc_percent:76`, `cheap_window_percentile:80`) but adjacent ones
  don’t (`charge_rate_kw:74` has one; `balancing_interval_days:78`,
  `balancing_hold_hours:79` don’t). Cosmetic, but the hint is the only place that
  explains units/window-meaning. Fill the gaps when the field lists are regenerated
  from the registry (U9).

---

## Proposed mechanism — registry-driven `showIf` (unblocks U1, U2, U7, U9)

1. **BE:** extend `Field` in `config_registry.py:18-39` with
   `show_if: Optional[Tuple[str, Tuple[str, ...]]] = None` (`(field_key, allowed_values)`);
   emit it in `registry_as_api_dict` (`:94-120`). Tag the solar/boiler conditionals
   there (single source of truth — currently encoded only in FE `renderBoilerCard`
   and not at all for solar).
2. **FE:** fetch `/config_registry` (`api/ha_rest_api.py:1284`) once at settings
   load, build `FieldDef[]` per section from it (replacing the hand lists
   `index.ts:62-145`). In `renderField`, skip when `showIf` predicate is false.
3. **Safety net:** add the cross-field validator behind U3 on the POST path so a
   provider switch can never persist a config the options flow would reject.

This converges the three surfaces (REST, dashboard, options flow) the registry
docstring already promises, and turns U1/U2/U7/U8 into data edits instead of code.

---

## Method / verification

- Read end-to-end: FE render+save (`index.ts`), FE data layer (`settings-data.ts`),
  theme (`theme.ts`), BE GET/POST (`ha_rest_api.py:1204-1283`), registry
  (`config_registry.py`), options-flow validation (`config/steps.py:1607-1695`).
- Every claim verified by `grep`: `show_if|depends_on|visible_if|showIf` (none),
  `config_registry` consumption by FE (none), `type='password'` (none),
  `color-scheme` (static meta only), `option {` CSS (none).
- No build run, no live box driven, no files modified except this report.
