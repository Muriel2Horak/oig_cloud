# F1 full-design adversarial review — Codex

SOUND-WITH-FIXES — do not author Plans 3–4 until the critical control-plane, authorization, and migration contracts below are made executable.

The overall direction is sound: deterministic solar/pricing onboarding, a shared merge path, and separating AI from core control are the right foundations.  However, the current specification still lets a signed-but-remotely-updatable data file change live battery/boiler behaviour, carries mutually contradictory decisions as if all were current, and defers configuration semantics that F1 itself needs after removing defaults.  Plan 1 also proves that “single registry” and “secret handling” are not self-enforcing claims: it is deployed while static FE lists, duplicate defaults, and a non-admin configuration read remain.

## Findings

### [CRITICAL] `remote_config` is an undefined live control plane, not just model metadata

**Applies to:** F1-DESIGN §4, P8, K2a.

The design names a mutable `main` URL at [F1-DESIGN.md:72](../docs/redesign_2026_07/F1-DESIGN.md#L72), then requires a tag/commit pin at [F1-DESIGN.md:94-99](../docs/redesign_2026_07/F1-DESIGN.md#L94-L99). A fixed commit cannot receive the promised daily updates; a `main` URL can. More importantly, `tuning` is permitted to influence battery/boiler heuristics ([F1-DESIGN.md:84](../docs/redesign_2026_07/F1-DESIGN.md#L84), [DECISIONS.md:115-125](../docs/redesign_2026_07/DECISIONS.md#L115-L125)); a min/max clamp prevents an extreme number, not a damaging but in-range change to a holding threshold, cooldown, boost window, or model policy. Cache precedence, rollback protection, expiry, key rotation, revocation, and the behaviour after a valid-but-stale cache are unspecified, so an implementation can both violate the pin requirement and silently change a live installation's behaviour.

**Concrete fix:** define a signed immutable release manifest (version, digest, issued/expires times, monotonic sequence, next-key authorization) fetched from one stable URL; it points only to immutable content-addressed config. State exactly which values are advisory versus safety/control-affecting, keep safety-critical policy local, and require an explicit user-visible “remote tuning version changed” audit record plus rollback. Add integration tests for `main` substitution/MITM, signature/key rotation, rollback to lower sequence, expiry/offline cache, bundled-version upgrade, and every individual tuning key at each boundary—not only “outside min/max”.

### [CRITICAL] Plan 1 already exposes private configuration to non-admin HA users and presents API keys as plain text

**Applies to:** deployed Plan 1 vs F1 §3/§6 and privacy requirements.

`OIGCloudModuleConfigView.get` only requires authentication ([ha_rest_api.py:1202-1222](../custom_components/oig_cloud/api/ha_rest_api.py#L1202-L1222)); unlike POST, it does not require `hass_user.is_admin` ([ha_rest_api.py:1224-1230](../custom_components/oig_cloud/api/ha_rest_api.py#L1224-L1230)). It returns non-secret solar latitude/longitude and site ID through `opts.get(...)` ([ha_rest_api.py:1212-1220](../custom_components/oig_cloud/api/ha_rest_api.py#L1212-L1220)), so any authenticated HA account that can call this route can obtain home-location/configuration data. The current settings renderer also classifies a key merely by an `api_key` suffix and renders it as `<input type="text">` ([settings/index.ts:626-636](../custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts#L626-L636)); storage/log masking in §3 ([F1-DESIGN.md:61-68](../docs/redesign_2026_07/F1-DESIGN.md#L61-L68)) does not fix shoulder-surfing, browser autofill, or a future secret whose name does not match that suffix.

**Concrete fix:** before extending REST with onboarding/AI routes, make an explicit permission matrix: all config values, onboarding state, writes, and secret-presence state require the entry owner/admin policy selected for the integration; fail closed and test an authenticated non-admin. Make `secret` a registry rendering property, emit password inputs with appropriate autocomplete policy, never infer secrecy from a key name, and add browser-level tests that neither secret value nor a text input reaches the DOM.

### [MAJOR] F1 removes the fallback path before it supplies all values required to replace it

**Applies to:** F1 §7/§11, P7–P9.

F1 says missing required configuration becomes `unavailable` ([F1-DESIGN.md:162-168](../docs/redesign_2026_07/F1-DESIGN.md#L162-L168)) and says preferences belong in registry/Advanced ([F1-DESIGN.md:170-172](../docs/redesign_2026_07/F1-DESIGN.md#L170-L172)), while P9 defers the advanced P8 UI and battery/boiler wizard to F2 ([DECISIONS.md:127-136](../docs/redesign_2026_07/DECISIONS.md#L127-L136)). The deployed serializer still manufactures battery and solar values, including `home_charge_rate`, capacity-related legacy values, coordinates, geometry, and enabling flags ([steps.py:390-433](../custom_components/oig_cloud/config/steps.py#L390-L433), [steps.py:436-465](../custom_components/oig_cloud/config/steps.py#L436-L465)); its forecast runtime still falls back to the author's GPS ([solar_forecast_sensor.py:639-646](../custom_components/oig_cloud/entities/solar_forecast_sensor.py#L639-L646)). The F1 wizard describes solar and pricing, not a complete source/owner/UI for every P7/P8 value, so a fresh F1 install can have unavailable sensors or a grandfathered install can be pre-seeded with values it cannot inspect or correct until F2.

**Concrete fix:** make a field-by-field ownership matrix before Plan 3: source priority, required-on-new versus migrated, F1 editor, F2 editor (if any), unit, validation, and behaviour when sensor data is absent/stale. Either retain a safe deterministic F1 editor for every value whose fallback is removed, or move that default-removal slice to F2; do not call an unreachable Advanced field “configured”. Test new, partial legacy, no-box-sensor, stale-box-sensor, and downgrade fixtures end-to-end.

### [MAJOR] The proposed `Field` model cannot generate the promised wizard safely

**Applies to:** F1 §6/P5, Plan 2 OQ-2/OQ-4.

The design reduces a field to type/range/enum/label/scope ([F1-DESIGN.md:137-146](../docs/redesign_2026_07/F1-DESIGN.md#L137-L146)), yet the deployed FE needs display scaling, optionality, entity domain, select choices, and custom rendering ([settings/index.ts:34-49](../custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts#L34-L49)). It also needs dependency rules: forecast.solar versus Solcast has different required credentials, as the HA flow currently models ([steps.py:1607-1621](../custom_components/oig_cloud/config/steps.py#L1607-L1621)); Plan 2 itself records that a flat Field cannot represent conditionally existing pricing keys ([Plan 2:1020-1023](../docs/redesign_2026_07/plans/2026-07-16-f1-plan2-basic-fields-registry.md#L1020-L1023)). The result is a false choice between hard-coded FE rules—which violates P5—or a generic form that lets users save an invalid provider/configuration combination.

**Concrete fix:** promote the registry to a versioned form-schema contract, not a scalar field list: backing store, secret/read policy, widget/unit/scale, visibility/required predicates, validator/error key, reload semantics, and module/wizard step membership. Keep provider-specific and pricing conditional schemas as first-class composites. Contract-test the complete API schema against frontend rendering and backend validation, including provider switches and every conditional branch.

### [MAJOR] The deployed registry is materially partial and already has contradictory defaults

**Applies to:** Plan 1 reality, F1 §6, Plan 2 OQ-5/OQ-6.

Plan 1's registry sets both `enable_statistics` and `enable_extended_sensors` to `False` ([config_registry.py:120-129](../custom_components/oig_cloud/config_registry.py#L120-L129)), while the live options serializer defaults both to `True` ([steps.py:367-386](../custom_components/oig_cloud/config/steps.py#L367-L386)). Since module GET uses the registry default for absent values ([ha_rest_api.py:1212-1220](../custom_components/oig_cloud/api/ha_rest_api.py#L1212-L1220)), the dashboard can report a different state from the running options-flow/runtime baseline. Plan 2 explicitly leaves this product decision open and says P5 remains partial, and separately leaves legacy `data_source_mode="hybrid"` unable to round-trip through REST ([Plan 2:1025-1067](../docs/redesign_2026_07/plans/2026-07-16-f1-plan2-basic-fields-registry.md#L1025-L1067)); it also retains mirror data-loss paths through Plan 2 ([Plan 2:962-976](../docs/redesign_2026_07/plans/2026-07-16-f1-plan2-basic-fields-registry.md#L962-L976)).

**Concrete fix:** resolve OQ-5 and OQ-6 before further plan authoring, not during implementation; for the live box, choose the current behavioural default unless a migration persists the alternate value first. Add an invariant test across registry, REST GET, options flow, runtime reads, and generated FE for every field, plus legacy sparse/mirror and GET→edit→POST→restart scenarios. Plan 2 may be a staging plan, but no plan may describe its partial result as fulfilling P5.

### [MAJOR] Migration/rollback is not a recoverable protocol for the live entry

**Applies to:** F1 §7–§8, P6/P7/K2e, HACS upgrades.

The board says “drop on first save” ([DECISIONS.md:97-104](../docs/redesign_2026_07/DECISIONS.md#L97-L104)); the design instead filters keys during `async_setup_entry` and retains a backup for one release ([F1-DESIGN.md:155-160](../docs/redesign_2026_07/F1-DESIGN.md#L155-L160)). It does not specify ordering, atomicity, migration marker, re-entry after a crash, restore command, backup expiry criterion, or which release a HACS downgrade can actually run. This is not theoretical: setup already performs several ad-hoc option writes ([__init__.py:1535-1558](../custom_components/oig_cloud/__init__.py#L1535-L1558)), while the ConfigFlow remains `VERSION = 1` ([steps.py:3104-3110](../custom_components/oig_cloud/config/steps.py#L3104-L3110)). A partial pre-seed/delete sequence can therefore leave the live entry in a neither-old-nor-new state; a backup that no downgraded code consumes is not a downgrade path.

**Concrete fix:** specify one idempotent F1 migrator with its own schema/migration version and durable journal: snapshot first, compute and validate all transforms, write options/onboarding/store state as a recoverable transaction, mark complete last, and expose an admin repair/restore action for one defined release range. Use the shared merge helper for writes, but do not mistake merge for transactionality. Test interruption at every write, retry, old/new mixed versions, missing/corrupt store, HACS downgrade, and the author's actual sparse entry fixture.

### [MAJOR] “Source of truth” is not true: materially incompatible decisions remain active text

**Applies to:** D4/D6/D10/P4/P6 versus P10/K1/K2.

F1 says the decision board is its source of truth ([F1-DESIGN.md:1-5](../docs/redesign_2026_07/F1-DESIGN.md#L1-L5)), but the board still says `ai_task → NVIDIA` ([DECISIONS.md:21-23](../docs/redesign_2026_07/DECISIONS.md#L21-L23)) and Kimi→GLM→Mistral ([DECISIONS.md:29-31](../docs/redesign_2026_07/DECISIONS.md#L29-L31)), whereas P10 makes Groq the default ([DECISIONS.md:142-154](../docs/redesign_2026_07/DECISIONS.md#L142-L154)). D10 requires verified AI before unlock ([DECISIONS.md:43-45](../docs/redesign_2026_07/DECISIONS.md#L43-L45)), while K1 unlocks after deterministic steps ②+③ ([DECISIONS.md:156-164](../docs/redesign_2026_07/DECISIONS.md#L156-L164)); P4 puts PDF download/pdfplumber in the runtime backend ([DECISIONS.md:84-88](../docs/redesign_2026_07/DECISIONS.md#L84-L88)), while K2c forbids it ([DECISIONS.md:166-180](../docs/redesign_2026_07/DECISIONS.md#L166-L180)). These are precisely the decisions that determine dependencies, user lockout, dependencies in `manifest`, and privacy disclosure.

**Concrete fix:** publish a compact normative decision register with one row per topic: current rule, supersedes, implementation consequence, and acceptance test. Mark obsolete text as superseded in place or remove it. Plans must cite only that register and fail review if they cite a superseded D/P statement.

### [MAJOR] The AI availability contract cannot meet its stated UX budget yet

**Applies to:** F1 §3/§5/§9, P1/P10.

The documented NVIDIA history is 51 dead models out of 83 ([DECISIONS.md:54-66](../docs/redesign_2026_07/DECISIONS.md#L54-L66)). Yet the runtime specifies 30-second attempts, cached last-good model for one hour, special 429 backoff, and only says it will not immediately skip ([F1-DESIGN.md:57-59](../docs/redesign_2026_07/F1-DESIGN.md#L57-L59)); onboarding simultaneously promises an example 90-second total budget rather than 32×30 seconds ([F1-DESIGN.md:112-119](../docs/redesign_2026_07/F1-DESIGN.md#L112-L119)). There is no per-attempt allocation, cancellation, persistence/concurrency model, cache invalidation when a remote chain disables a model, provider-level circuit breaker, or definition of `no_credits` for the providers actually offered. A `/v1/models` probe plus one-token completion ([F1-DESIGN.md:64-65](../docs/redesign_2026_07/F1-DESIGN.md#L64-L65)) also does not establish that the selected model can produce the required structured response.

**Concrete fix:** specify a bounded state machine with a single deadline, per-attempt budget, cancellation propagation, retry/backoff schedule, circuit-breaker scope, cache key `(provider, remote-config sequence, task schema)`, and deterministic final status. Verify with a real structured task per provider/model before “ready”; treat an unavailable provider as a soft feature failure under K1. Add virtual-clock tests for all failures, simultaneous retries/restarts, remote chain updates, and quota exhaustion.

### [MAJOR] “Anonymous numbers” is not a complete privacy/GDPR design

**Applies to:** F1 §3, P10/O2.

The prompt rule excludes direct identifiers ([F1-DESIGN.md:67-68](../docs/redesign_2026_07/F1-DESIGN.md#L67-L68)), and its test only proves a synthetic fixture's literal GPS/box ID/email/entity ID do not occur ([F1-DESIGN.md:195-203](../docs/redesign_2026_07/F1-DESIGN.md#L195-L203)). Fine-grained solar, consumption, tariff and time series can still be personal/household data or indirectly identify an installation; neither a wizard disclosure nor a string-absence test establishes data minimisation, purpose, retention, subprocessors, consent recording, or user deletion/revocation. The board itself records that NVIDIA can use deidentified inputs and that production use is a ToS grey area ([DECISIONS.md:195-200](../docs/redesign_2026_07/DECISIONS.md#L195-L200)).

**Concrete fix:** make an explicit data inventory per AI task/provider, with data category, transformations (aggregation/time shifting/redaction), purpose, legal basis/consent text, retention and user deletion/rotation behaviour. Default to the minimum deterministic rows needed; make AI verification opt-in and revocable without disabling the deterministic dashboard. Test the actual outbound request body, headers, telemetry/error paths, and provider changes—not only prompt text.

### [MAJOR] The known solar and dropdown UX defects have no F1 acceptance contract

**Applies to:** F1 §5–§6 and deployed settings UI.

The live UI offers a provider selector but omits `solar_forecast_api_key`, displays Solcast fields for both providers, and lacks visibility/required rules ([settings/index.ts:83-97](../custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts#L83-L97)); the sensor genuinely reads different key paths for forecast.solar and Solcast ([solar_forecast_sensor.py:632-642](../custom_components/oig_cloud/entities/solar_forecast_sensor.py#L632-L642), [solar_forecast_sensor.py:723-733](../custom_components/oig_cloud/entities/solar_forecast_sensor.py#L723-L733)). The settings screen still owns static `*_FIELDS` despite F1 promising their deletion ([F1-DESIGN.md:142-146](../docs/redesign_2026_07/F1-DESIGN.md#L142-L146)), and Plan 2 defers their removal ([Plan 2:962-976](../docs/redesign_2026_07/plans/2026-07-16-f1-plan2-basic-fields-registry.md#L962-L976)). Current CSS now assigns select background/text tokens ([settings/index.ts:289-299](../custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts#L289-L299)), but F1 neither records the reported transparent/unreadable-dropdown regression nor requires a cross-theme visual assertion; it can regress when the new generated renderer replaces this code.

**Concrete fix:** add explicit UX acceptance examples to the F1 spec: switching provider immediately changes only the applicable fields; forecast.solar paid modes cannot continue without its key; Solcast cannot continue without site/key; secrets remain masked; and select text/background meet contrast in HA light/dark themes. Add Playwright tests for both providers, fresh/migrated credentials, provider switch without accidental key deletion, keyboard use, and visual/contrast snapshots.

### [MINOR] HA-version and HACS support policy is internally undecided

**Applies to:** F1 §3/§9 and K2c/O1.

F1 says HA < 2025.8 hides `ai_task` and uses a key provider ([F1-DESIGN.md:183-193](../docs/redesign_2026_07/F1-DESIGN.md#L183-L193)), while K2c says `manifest.json` and `hacs.json` will receive a minimum HA version ([DECISIONS.md:173-174](../docs/redesign_2026_07/DECISIONS.md#L173-L174)). The required minimum is absent, so a HACS upgrade may either block installations that were intended to use the key fallback or install code that imports/selects unavailable HA APIs.

**Concrete fix:** decide whether F1 supports older HA with no `ai_task` or requires 2025.8+, put that one policy in manifest/HACS/release notes, and test the lowest supported HA plus the first unsupported one. Treat the compatibility matrix as a release gate, not an implementation afterthought.

## Top five: fix before authoring Plans 3–4

1. Replace the `remote_config` prose with an immutable signed-manifest, freshness, rollback, key-rotation, and local-safety contract.
2. Close the deployed authorization/secret-presentation gap and define access control for every new `/ai` and `/onboarding` endpoint.
3. Produce the complete F1 field-ownership matrix; keep all needed edit paths in F1 or defer the associated default removal.
4. Resolve Plan 2 OQ-5/OQ-6 and legacy mirror semantics now; do not build new generated forms on contradictory defaults or non-round-trippable data.
5. Write the transactional, recoverable migration/downgrade protocol and prove it on a copy of the author's sparse live entry before deleting/pre-seeding anything.

## Testability verdict

The listed unit tests are useful but cannot catch the most dangerous risks as written. They test invalid signatures and out-of-range clamp values ([F1-DESIGN.md:201-203](../docs/redesign_2026_07/F1-DESIGN.md#L201-L203)), not replay/rollback/expiry or a safe effective control decision; they test prompt string exclusion, not the full data-processing path; and a Playwright onboarding smoke ([F1-DESIGN.md:212](../docs/redesign_2026_07/F1-DESIGN.md#L212)) cannot prove provider switching, HA role access, migration interruption, HACS downgrade, or light/dark select readability. The deployed test inventory found module-config and boiler coverage but no settings-solar frontend test (`rg -n "SOLAR_FIELDS|solar_forecast_api_key" custom_components/oig_cloud/www_v2/src/__tests__ tests -g '*.ts' -g '*.py'` returned no frontend match), so the known live solar defect is currently unguarded.

## What in this design will hurt the live box if built as written?

First, a daily-fetched `remote_config` can become an opaque control input to battery/boiler decisions despite the stated pin, and its cache/rollback rules do not constrain a bad in-range update. Second, the migration can pre-seed and delete option keys during setup without a transactional restore path, leaving a live entry changed on a failed upgrade or an unusable downgrade. Third, the partially deployed registry can already show `enable_statistics`/extended sensors as off while the legacy runtime assumes on, and the generated-form rewrite can reproduce the existing provider/key and unreadable-select failures unless conditional schema and visual acceptance are defined. Finally, every authenticated non-admin HA user can currently read the module configuration including coordinates, while users type solar API keys into a plain-text field; adding AI/onboarding endpoints on that pattern expands the privacy blast radius.

Finding count: 2 CRITICAL, 8 MAJOR, 1 MINOR.
