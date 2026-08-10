# Solar compass and provider-boundary implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make compass azimuth, Forecast.Solar conversion, Solcast field ownership, legacy adoption, and candidate testing consistent across every configuration surface.

**Architecture:** `config/solar_rules.py` owns strict application values and legacy read metadata. A new pure `forecast/provider_contract.py` owns Forecast.Solar conversion and URL construction. Registry metadata drives both web surfaces; native HA uses the same validators. `/solar_test` parses provider-discriminated bodies and remains side-effect-free.

**Tech Stack:** Python 3.12, Home Assistant ConfigFlow/aiohttp, TypeScript/Lit, pytest, Vitest, Playwright.

---

## Contract references

- Design: `docs/superpowers/specs/2026-08-10-wizard-v2-auth-solar-design.md`
- Rules: `custom_components/oig_cloud/config/solar_rules.py`
- Registry: `custom_components/oig_cloud/config_registry.py`
- REST: `custom_components/oig_cloud/api/ha_rest_api.py`
- Native flow: `custom_components/oig_cloud/config/steps.py`
- Runtime: `custom_components/oig_cloud/entities/solar_forecast_sensor.py`
- Candidate helper: `custom_components/oig_cloud/forecast/candidate_test.py`

### Task 1: Define strict compass and provider helpers with RED unit tests

**Files:**

- Modify: `tests/test_solar_rules.py`
- Add: `tests/test_solar_provider_contract.py`
- Modify: `custom_components/oig_cloud/config/solar_rules.py`
- Add: `custom_components/oig_cloud/forecast/provider_contract.py`

- [ ] Replace modulo expectations with a table accepting only numeric, finite, integral `0..360`; explicitly reject booleans, numeric strings, fractions, negatives, `361`, huge integers, NaN, and infinities.
- [ ] Add cardinal plus operator-value conversion tests: `0 -> -180`, `90 -> -90`, `138 -> -42`, `180 -> 0`, `270 -> 90`, `360 -> 180`.
- [ ] Add legacy display tests: negative stored provider values map to equivalent compass display without mutation; non-negative `138` stays `138`; invalid stored `361`, `720`, fractional/non-finite-like values classify as invalid legacy and cannot produce a provider value.
- [ ] Add one URL-construction table proving runtime and candidate callers share the exact formatter. Cover API keys and Site IDs containing slash, question mark, hash, percent, and space; path segments use `quote(value, safe="")`, query parameters use `urlencode`, and safe diagnostics return no secret or credential-bearing URL.
- [ ] Run `pytest -q tests/test_solar_rules.py tests/test_solar_provider_contract.py`; expect old modulo behavior and missing module failures.
- [ ] Implement `validate_compass_azimuth`, `legacy_azimuth_read_model`, `forecast_solar_azimuth`, and encoded provider URL builders as pure functions. Remove `normalize_azimuth` after all callers migrate.
- [ ] Re-run the focused tests; expect green.

### Task 2: Make registry validation and visibility canonical

**Files:**

- Modify: `custom_components/oig_cloud/config_registry.py`
- Modify: `custom_components/oig_cloud/www_v2/src/data/registry-data.ts`
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts`
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/step-solar.ts`
- Modify: `tests/test_config_registry.py`
- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/registry-data.test.ts`
- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/onboarding-steps.test.ts`
- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/fixtures/solar-registry-fixture.ts`

- [ ] Add RED registry tests: both azimuths `min=0,max=360,step=1`; mode enum includes `daily`; GPS is Forecast.Solar-only; declination/azimuth require both Forecast.Solar and enabled string; kWp remains visible for enabled strings under either provider.
- [ ] Add RED frontend tests for generic `show_if_all` evaluation in registry data, Settings, and `STEP_SOLAR`.
- [ ] Extend `RegistrySpec`/`FieldDef` with typed `show_if_all`; make one generic visibility predicate apply `show_if` plus every `show_if_all` entry. Remove solar-specific duplicate visibility logic.
- [ ] Configure GPS with provider `show_if`; declination/azimuth with enabled-string `show_if` plus provider `show_if_all`; leave kWp enabled-string-only.
- [ ] Add `daily` Czech/English enum labels and fixtures.
- [ ] Run focused Python and Vitest registry tests; expect green.

### Task 3: Implement the legacy-negative read/adoption protocol test-first

**Files:**

- Modify: `tests/test_ha_rest_api_views.py`
- Modify: `tests/test_solar_draft_rest.py`
- Modify: `tests/test_config_steps_more4.py`
- Modify: `tests/test_config_options_flow.py`
- Modify: `custom_components/oig_cloud/api/ha_rest_api.py`
- Modify: `custom_components/oig_cloud/config/steps.py`
- Modify: `custom_components/oig_cloud/www_v2/src/data/settings-data.ts`
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts`
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts`
- Add or modify focused Settings/Onboarding Vitest files under `custom_components/oig_cloud/www_v2/src/__tests__/`

- [ ] Add REST GET RED tests for `_meta.legacy_fields.<field>` containing exact `stored_value`, `display_value`, `legacy_provider_value`, and `requires_adoption`, while the rendered section value is the compass display.
- [ ] Add REST POST RED tests: unrelated save and equivalent display without `adopt_legacy_fields` preserve raw negative; known touched field adopts; different valid value adopts; unknown/non-legacy adoption keys fail `400`; no-op adoption never double-converts.
- [ ] Add native flow RED tests for transient per-field adoption checkbox: no-op/unrelated submit preserves raw; checkbox or changed value adopts; the checkbox is absent from stored options.
- [ ] Add web RED tests that dirty tracking sends `adopt_legacy_fields` only for a touched legacy input, displays a warning, and clears metadata after successful adoption/reload.
- [ ] Implement a shared backend read-model/adoption resolver. Keep the transport control outside registry values and whitelist the two azimuth keys.
- [ ] Extend module-config GET/POST types and save helpers; use the same module-config path from Wizard v2 and Settings.
- [ ] Run focused REST/native/frontend tests; expect green.

### Task 4: Enforce strict persistence without migration

**Files:**

- Modify: `custom_components/oig_cloud/api/ha_rest_api.py`
- Modify: `custom_components/oig_cloud/config/steps.py`
- Modify: `tests/test_ha_rest_api_views.py`
- Modify: `tests/test_config_flow_entry.py`
- Modify: `tests/test_config_options_flow.py`
- Modify: `tests/test_config_steps_more4.py`
- Modify: `tests/test_author_defaults_removed.py`

- [ ] Add RED round-trip tests proving `0,90,138,180,270,360` persist unchanged on REST and native surfaces.
- [ ] Add RED invalid-write tables for negative, `361`, fraction, bool, numeric string, malformed text, NaN-like transport, and huge integer; assert field error plus unchanged options.
- [ ] Add RED existing-corrupt-state tests: stored `361/720/fraction` is returned with invalid-legacy warning, not provider-dispatched, and remains until a valid explicit correction.
- [ ] Replace every pre-validation `normalize_azimuth` call with strict validation. Do not bump ConfigFlow version and do not add numeric migration.
- [ ] Verify author default `138` remains `138` in config migration/default tests.

### Task 5: Unify Forecast.Solar request conversion

**Files:**

- Modify: `custom_components/oig_cloud/entities/solar_forecast_sensor.py`
- Modify: `custom_components/oig_cloud/forecast/candidate_test.py`
- Modify: `tests/test_entities_solar_forecast_sensor.py`
- Modify: `tests/test_entities_solar_forecast_sensor_more4.py`
- Modify: `tests/test_solar_test_view.py`

- [ ] Add RED captured-URL tests for both runtime and candidate paths over the cardinal/operator table; both must call `provider_contract.build_forecast_solar_url`.
- [ ] Add RED mode/key tests: missing Forecast.Solar key succeeds for `daily`/`daily_optimized`, fails before dispatch for `hourly`/`every_4h`, and the runtime/candidate paths select the same endpoint contract.
- [ ] Add RED reserved-character tests for Forecast.Solar keys and Solcast Site ID/API key; runtime and candidate URLs remain structurally identical and secrets never enter logs.
- [ ] Add RED legacy runtime tests proving stored `-90` still sends `-90` until adoption, while stored `90` converts to `-90`.
- [ ] Add RED invalid stored-state tests asserting zero provider requests and preserved stale cache.
- [ ] Remove both independent URL formatters and import the shared provider helper.
- [ ] Run the focused provider tests; expect green.

### Task 6: Make `/solar_test` provider-discriminated and side-effect-free

**Files:**

- Modify: `custom_components/oig_cloud/api/ha_rest_api.py`
- Modify: `custom_components/oig_cloud/forecast/candidate_test.py`
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts`
- Modify: `tests/test_solar_test_view.py`
- Modify: `tests/test_solar_draft_rest.py`
- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/onboarding-solar-gps.test.ts`

- [ ] Add RED Forecast.Solar DTO tests requiring GPS and enabled-string kWp/tilt/compass azimuth while rejecting Solcast fields. API key is optional for `daily`/`daily_optimized` and required for `hourly`/`every_4h`.
- [ ] Add RED Solcast DTO tests requiring credentials, Site ID, enabled flags, and enabled-string kWp while rejecting GPS/tilt/azimuth.
- [ ] Add shared strict DTO tables: latitude finite `-90..90`, longitude finite `-180..180`, kWp finite `0.1..50`, declination integral `0..90`, azimuth integral `0..360`; reject bool, numeric string, NaN/infinity, fraction where integral, and every out-of-range value with HTTP `400` and zero outbound requests.
- [ ] Capture the Solcast provider URL/request and assert no geometry or kWp leaves OIG.
- [ ] Snapshot key-store active/candidate credentials, options, provider, and cache before success/failure/cancel; assert all remain byte-for-byte unchanged.
- [ ] Remove candidate credential set/promote calls from the test endpoint. Keep explicit module-config save as the only persistence path.
- [ ] Build the frontend test body by provider contract, not by all visible registry fields.
- [ ] Run focused backend/frontend candidate tests; expect green.

### Task 7: Make explicit save the atomic credential activation boundary

**Files:**

- Modify: `custom_components/oig_cloud/config/solar_key_store.py`
- Modify: `custom_components/oig_cloud/api/ha_rest_api.py`
- Modify: `custom_components/oig_cloud/config/steps.py`
- Modify: `custom_components/oig_cloud/www_v2/src/data/settings-data.ts`
- Modify: Settings/Onboarding save callers and focused tests
- Modify: `tests/test_solar_key_store.py`
- Modify: `tests/test_solar_draft_rest.py`
- Modify: native flow tests

- [ ] Add a server-side proof store under `hass.data`: cryptographically random opaque token, five-minute TTL, single use, bound to ConfigEntry/provider plus SHA-256 of normalized DTO. Return only the opaque token; never return credentials or their hash.
- [ ] RED: successful `/solar_test` returns a proof while active/candidate key-store bytes, options, provider, cache, and revision remain unchanged. Failure/cancel returns no usable proof and also mutates nothing.
- [ ] RED: explicit save with a valid matching proof activates verified credentials; save without proof activates unverified credentials; native HA save follows the unverified path and runtime immediately reads the new active values.
- [ ] RED: supplied expired, mismatched, or replayed proof fails `400` with old active credentials/options/revision unchanged.
- [ ] Add one key-store `async_activate` operation that writes provider, active credentials, optional `verified_at`, additive verification metadata, inactive-secret cleanup, and one incremented credential revision in one Store save.
- [ ] Keep `SolarKeyStore.STORAGE_VERSION` and the legacy top-level `active` shape readable by the previous artifact; all revision/proof-status fields are additive and ignored by old code.
- [ ] Implement a compensating options/key-store transaction: validate effective DTO, snapshot both states, activate key store, update ConfigEntry options, then reload. Any Store/options/reload failure restores both snapshots and reloads the prior effective state; prior active credentials remain usable and revision does not advance.
- [ ] RED fault injection at every write/reload boundary plus provider switch. Assert exactly one revision increment on success, exact rollback on failure, and inactive credential/Site-ID deletion only on committed provider switch.
- [ ] Load the new additive key-store object through a previous-artifact parser fixture; assert legacy code still reads `active` credentials and ignores revision/verification metadata.

### Task 8: Align copy, both strings, and secret-switch behavior

**Files:**

- Modify: `custom_components/oig_cloud/strings.json`
- Modify: `custom_components/oig_cloud/translations/cs.json`
- Modify: `custom_components/oig_cloud/translations/en.json`
- Modify: `custom_components/oig_cloud/www_v2/src/i18n/fields.ts`
- Modify: `custom_components/oig_cloud/www_v2/src/i18n/enum-labels.ts`
- Modify: translation/registry/frontend tests covering these catalogs

- [ ] Replace every duplicate azimuth hint with compass text: north `0/360`, east `90`, south `180`, west `270`; include `0..360` range and legacy-warning copy.
- [ ] Ensure String 2 has the same help and validation as String 1.
- [ ] Add provider help: Solcast geometry is configured in Rooftop Site; local kWp is allocation/fallback only.
- [ ] Preserve non-secret geometry on provider switches. Keep and test current inactive credential deletion, including Site ID and candidate state; switch-back requires re-entry.
- [ ] Parse all JSON catalogs and run translation parity tests.

### Task 9: Add provider-boundary E2E and commit

**Files:**

- Modify: `tests/e2e/test_config_flow_runtime_e2e.py`
- Add: `custom_components/oig_cloud/www_v2/playwright/solar-provider-contract.spec.ts`

- [ ] E2E: enter east `90`, persist `90`, reload, capture Forecast.Solar outbound `-90`.
- [ ] E2E: retain operator `138`, capture outbound `-42`.
- [ ] E2E: switch to Solcast, verify geometry hidden, kWp visible, candidate request succeeds without geometry, cancel leaves persisted state unchanged, and switch back retains geometry but requires credentials.
- [ ] E2E: save without candidate test activates unverified credentials; test then save with its single-use proof activates verified credentials; replay and transaction fault preserve the prior runtime configuration.
- [ ] Run focused Python E2E, frontend Playwright, full affected unit suites, typecheck, lint, and build.
- [ ] Run `git diff --check` and review all duplicated translations.
- [ ] Commit only this slice: `fix: use compass azimuth at solar provider boundary`.
