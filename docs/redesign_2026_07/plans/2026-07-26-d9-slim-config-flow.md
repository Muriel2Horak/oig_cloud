# D9 — slim HA config flow + portal-gated tabs + telemetry move — bite-sized TDD plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement task-by-task. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** the HA-native "Add integration" dialog for OIG Cloud collapses to ONE credentials-only
form; every other new-install question (modules, solar, pricing, battery, boiler, connection/
telemetry) moves to the web portal wizard (`www_v2`, already implemented — Phase A+B of
`docs/redesign_2026_07/plans/2026-07-25-wizard-v2-implementation.md` are landed on this branch,
confirmed via `docs/redesign_2026_07/rework/PHASE-B-INTEGRATION-REPORT.md`). Dashboard content tabs
(Toky/Ceny/Bojler) are hidden until onboarding is done, except for grandfathered (pre-existing)
entries. The HA-native **options/reconfigure** flow is explicitly OUT of scope — kept as-is (Stage D
explains why, with evidence).

## Owner design (binding — verbatim from the dispatch brief)

1. HA config flow (new install) = credentials (login/password/box) ONLY, plus: standard + extended
   sensors enabled BY DEFAULT (no questions), and a "Zapnout portal (dashboard)" checkbox — DEFAULT
   CHECKED (integrator decision, flag if problematic).
2. Everything else moves to the portal wizard — including `data_source_mode`, which leaves the
   config-flow surface entirely and lives in the portal's connection step.
3. Dashboard tab gating: Toky/Ceny/Bojler HIDDEN until onboarding completed. Grandfathered entries
   are NOT gated — tabs visible immediately. The dashboard page + Nastavení + the wizard stay
   accessible (page renders, content tabs are locked).
4. Existing entries / reconfigure path: NO regression — options/reconfigure keeps working.

## Design decisions made by this plan (not stated by the brief, needed to keep tasks unambiguous)

1. **"box" field.** Nothing in the current flow ever asks for a box/inverter id — `OigCloudApi`
   auto-picks the first key from `get_stats()`'s response (`lib/oig_cloud_client/api/oig_cloud_api.py:359-360`,
   `self.box_id = list(to_return.keys())[0]`) and `__init__.py` infers `options["box_id"]` from live
   coordinator data post-setup (`__init__.py:1066`) when the account has exactly one box. The brief's
   "box" becomes an **optional** advanced text field, `box_id_override`, on the credentials form —
   blank (the default, "no questions") preserves today's auto-infer-first-box behavior unchanged;
   filled, it pins `options["box_id"]` at entry creation instead of waiting for post-setup inference.
   This is the minimal change that satisfies "login/password/box" without building a new
   auth-then-discover-then-pick sub-flow for the (currently unsupported and unevidenced) multi-box
   case. **Flag for integrator:** if multi-box accounts are real and common, this needs a proper
   discovery step later — this plan does not add one.
2. **Portal-checkbox default diverges from the registry default.** `enable_dashboard`'s registered
   default is `False` (`config_registry.py:573`) and the *options*-flow/portal-review UI must keep
   showing that default for existing entries (no behavior change there). The new **credentials-only**
   form overrides it to checked (`True`) per the brief's explicit "DEFAULT CHECKED (integrator
   decision, flag if problematic)" — Task 1 hardcodes `True` for this one form only, it does not
   touch `config_registry.py`'s registered default.
3. **`live_data_enabled` confirmation checkbox is dropped**, folded into the form's description text
   instead. It was never functionally required — `validate_input` (`config/validation.py:33-62`)
   already raises `LiveDataNotEnabled` from the real API response regardless of what the checkbox
   said (`config/steps.py:917`, `:1289` quick_setup's own copy of the same check). Keeping it as a
   *second*, independent required checkbox contradicts "credentials ONLY, no questions" for zero
   safety gain — the live-data check happens against the real API either way. The warning text stays,
   just as prose (mirrors `wizard_credentials`'s existing description in `strings.json`, quoted in
   Task 3).
4. **Completion signal for tab gating = `finished_at`, not "all steps done".** `OnboardingState`
   explicitly forbids a "complete"/"gate" concept in its per-step data (`onboarding/state.py:1-6`,
   the four banned keys) because steps are independent and skippable (AI is optional, etc.) — "every
   step done" is not a coherent target. `async_finish()` (`state.py:176-191`) is the one explicit,
   user-driven "I'm done" signal (fired by the portal wizard's step-9 Uložit, per
   `2026-07-25-wizard-v2-implementation.md` Task 10) and it is **already transmitted to the FE**: the
   REST GET handler returns the raw state dict verbatim (`api/ha_rest_api.py:1825-1836`,
   `web.json_response(state)`), so `finished_at` is on the wire today — the FE `OnboardingState`
   TypeScript interface (`onboarding-data.ts:54-77`) just never declared the field. Stage B adds it
   with a **backend-free** change.
5. **Reconfigure-path decision: KEEP the legacy WizardMixin options flow unchanged, indefinitely —
   not "until a later cleanup".** Evidence (Stage D elaborates): the portal is only mounted when
   `enable_dashboard=True` (`__init__.py:620` `_setup_frontend_panel` / `:665`
   `_remove_frontend_panel`, gated on that flag at `__init__.py:1912/1915`, `:2030`,
   `:2163-2199`). An entry with the portal checkbox OFF (a real, first-class choice per design
   decision 2) has **no other way to ever reconfigure itself** except HA's native "Configure" dialog
   (`OigCloudOptionsFlowHandler`, `config/steps.py:3427`). Its own `async_step_init` menu
   (`:3507-3528`) is already a slimmed section-jump UI (not the old 12-step linear wizard — see the
   docstring at `:3510-3513`), and it never overlaps credentials (no `section_credentials` in its
   menu; credential changes go through the separate `reauth` flow, `:3202-3268`). There is nothing to
   retire: it is the load-bearing fallback for a state this same plan's Stage A makes newly
   first-class.
6. **`wizard_welcome`/`wizard_credentials` (WizardMixin) and `async_step_quick_setup`/
   `async_step_import_yaml` (ConfigFlow) are ORPHANED, not deleted, by this plan.** Once
   `async_step_user` stops calling them (Task 1), nothing in any live flow reaches them — but they
   are each still exercised directly by multiple existing unit tests (`wizard_welcome`/
   `wizard_credentials`: `tests/test_config_flow_wizard_steps.py`, `tests/test_config_steps_wizard_extra.py`,
   `tests/test_config_steps_more.py`, `tests/test_config_steps_more4.py`; `quick_setup`:
   `tests/test_config_flow_quick_setup.py`, `tests/test_config_steps_more4.py`,
   `tests/test_dead_keys_removed.py`). Deleting the methods now means rewriting/deleting ~15+ test
   functions across 6 files for a pure cleanup with no functional benefit to D9 — out of scope. This
   plan removes only the 2 tests that assert the *router* being removed (Task 2), and leaves the
   orphaned methods + their direct unit tests as tracked tech debt (flag in the final report).

## Tech stack / verify commands

- **Backend:** Python 3.12, HA custom integration, `.venv/bin/python -m pytest`,
  `.venv/bin/flake8 --max-line-length=120`, `.venv/bin/mypy --ignore-missing-imports
  --explicit-package-bases`.
- **Frontend:** TypeScript + Lit, vitest. Run from `custom_components/oig_cloud/www_v2`:
  `npx vitest run <path>`, `npx tsc --noEmit`.
- **i18n/hassfest gate:** `scripts/run_hassfest.sh`.
- **Format reference:** `docs/redesign_2026_07/plans/2026-07-25-wizard-v2-implementation.md`.

---

## Stage A — Slim new-install flow (`ConfigFlow` only, `OptionsFlow` untouched)

### Task 1: `async_step_user` becomes the single credentials-only form

**Files:**
- Modify: `custom_components/oig_cloud/config/steps.py` — `ConfigFlow.async_step_user`
  (`:3172-3200`), remove the `setup_type` branch entirely; new schema replaces
  `_get_credentials_schema` (`:1153-1173`) for THIS flow only (that method stays, used by the
  orphaned `wizard_credentials` per design decision 6).
- Test: `tests/test_config_flow_entry.py` (rewrite `test_step_user_form` at `:27-31`; DELETE
  `test_step_user_quick_setup` `:96-101` and `test_step_user_wizard` `:104-109` — they assert the
  router this task removes)
- New test file: `tests/test_config_flow_slim_credentials.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_config_flow_entry.py — replace test_step_user_form
@pytest.mark.asyncio
async def test_step_user_form():
    flow = DummyConfigFlow()
    result = await flow.async_step_user()
    assert result["type"] == "form"
    assert result["step_id"] == "user"
    schema_keys = {str(k) for k in result["data_schema"].schema}
    assert schema_keys == {"username", "password", "box_id_override", "enable_dashboard"}
    # DELETE test_step_user_quick_setup and test_step_user_wizard (setup_type is gone)
```

```python
# tests/test_config_flow_slim_credentials.py — new
@pytest.mark.asyncio
async def test_user_step_creates_entry_with_sensor_and_dashboard_defaults(monkeypatch):
    async def _fake_validate_input(_hass, _data):
        return {"title": "OIG Cloud"}
    monkeypatch.setattr(steps_module, "validate_input", _fake_validate_input)
    # get_stats() single-box case — box auto-inferred, not asked
    flow = DummyConfigFlow()
    result = await flow.async_step_user({
        "username": "demo", "password": "pw", "box_id_override": "", "enable_dashboard": True,
    })
    assert result["type"] == "create_entry"
    assert result["options"]["enable_statistics"] is True
    assert result["options"]["enable_extended_sensors"] is True
    assert result["options"]["enable_dashboard"] is True
    assert result["options"]["enable_solar_forecast"] is False  # untouched registry default
    assert "data_source_mode" not in result  # not asked; still lands in options via registry default
    assert result["options"]["data_source_mode"] == "cloud_only"

@pytest.mark.asyncio
async def test_user_step_box_override_pins_box_id(monkeypatch):
    monkeypatch.setattr(steps_module, "validate_input", _fake_validate_input)
    flow = DummyConfigFlow()
    result = await flow.async_step_user({
        "username": "demo", "password": "pw", "box_id_override": "BOX123", "enable_dashboard": True,
    })
    assert result["options"]["box_id"] == "BOX123"

@pytest.mark.asyncio
async def test_user_step_blank_box_override_omits_box_id(monkeypatch):
    # blank override = unchanged auto-infer-post-setup behavior (__init__.py:1066) — box_id
    # must NOT appear in the created entry's options at all.
    ...
    assert "box_id" not in result["options"]

@pytest.mark.asyncio
async def test_user_step_surfaces_invalid_auth(monkeypatch):
    async def _raise(*_a, **_kw):
        raise steps_module.InvalidAuth
    monkeypatch.setattr(steps_module, "validate_input", _raise)
    flow = DummyConfigFlow()
    result = await flow.async_step_user({"username": "x", "password": "bad", "box_id_override": "", "enable_dashboard": True})
    assert result["type"] == "form"
    assert result["errors"]["base"] == "invalid_auth"
```

- [ ] **Step 2: Run — verify FAIL.** `async_step_user` today shows `setup_type`, not
  username/password directly; `create_entry`'s options today (via `quick_setup`, the closest
  analog) hardcode a flat dict rather than reading `_build_options_payload`.

Run: `.venv/bin/python -m pytest -q tests/test_config_flow_entry.py tests/test_config_flow_slim_credentials.py`

- [ ] **Step 3: Implement.**

```python
async def async_step_user(
    self, user_input: Optional[Dict[str, Any]] = None
) -> ConfigFlowResult:
    """Credentials-only new-install form (D9 — no wizard, no quick/import chooser)."""
    errors: Dict[str, str] = {}
    if user_input is not None:
        if not user_input.get(CONF_USERNAME, "").strip():
            errors[CONF_USERNAME] = "required"
        if not user_input.get(CONF_PASSWORD, ""):
            errors[CONF_PASSWORD] = "required"
        if not errors:
            try:
                info = await validate_input(self.hass, user_input)
            except LiveDataNotEnabled:
                errors["base"] = "live_data_not_enabled"
            except CannotConnect:
                errors["base"] = "cannot_connect"
            except InvalidAuth:
                errors["base"] = "invalid_auth"
            except Exception:
                _LOGGER.exception("Unexpected exception during initial setup")
                errors["base"] = "unknown"
            else:
                options = self._build_options_payload(
                    {"enable_dashboard": user_input.get("enable_dashboard", True)}
                )
                box_override = (user_input.get("box_id_override") or "").strip()
                if box_override:
                    options["box_id"] = box_override
                return self.async_create_entry(
                    title=info["title"],
                    data={
                        CONF_USERNAME: user_input[CONF_USERNAME],
                        CONF_PASSWORD: user_input[CONF_PASSWORD],
                    },
                    options=options,
                )

    return self.async_show_form(
        step_id="user",
        data_schema=vol.Schema({
            vol.Required(CONF_USERNAME, default=(user_input or {}).get(CONF_USERNAME, "")): str,
            vol.Required(CONF_PASSWORD): str,
            vol.Optional("box_id_override", default=""): str,
            vol.Optional("enable_dashboard", default=True): bool,
        }),
        errors=errors,
        description_placeholders=self._get_step_placeholders("user"),
    )
```

Confirm `_build_options_payload({"enable_dashboard": True})` (`steps.py:358-367`) really pulls every
other `basic`/`modules`/`solar`/`battery`/`pricing`/`boiler` default straight from
`config_registry.py` with no hand-copied literal — this is the DRY win over the old `quick_setup`'s
hardcoded dict (`:3335-3352`), and it's what keeps `data_source_mode` correct with zero extra code
(Stage C leans on this).

- [ ] **Step 4: Run — PASS.** Re-run the full config-flow suite for fallout: `_get_credentials_schema`,
  `wizard_welcome`, `wizard_credentials`, `quick_setup`, `import_yaml` remain unchanged/orphaned
  (design decision 6) — their own direct-call tests must still pass untouched.

Run: `.venv/bin/python -m pytest -q tests/test_config_flow_entry.py tests/test_config_flow_slim_credentials.py tests/test_config_flow_wizard_steps.py tests/test_config_flow_quick_setup.py tests/test_config_steps_wizard_extra.py tests/test_config_steps_more.py tests/test_config_steps_more4.py tests/test_dead_keys_removed.py`

- [ ] **Step 5: Lint + commit**

```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/config/steps.py
git add custom_components/oig_cloud/config/steps.py tests/test_config_flow_entry.py tests/test_config_flow_slim_credentials.py
git commit -m "feat(config-flow): slim new-install async_step_user to credentials-only (D9)"
```

**Done-criteria:** a brand-new install asks ONLY username/password(+optional box override,
+dashboard checkbox default-checked); entry is created in one round-trip with every other option at
its registry default; no orphaned method's own tests break.

---

### Task 2: Retire the `setup_type` strings, update `user` step copy

**Files:**
- Modify: `custom_components/oig_cloud/strings.json` — `config.step.user` (currently
  `{"title": "...Výběr typu nastavení", "data": {"setup_type": ...}}`)
- Modify: `custom_components/oig_cloud/translations/en.json`, `.../cs.json` (mirror)
- Test: covered by Stage E's hassfest run (Task 9) — this task only needs the JSON edit + a quick
  manual key-parity check, not a new unit test.

- [ ] **Step 1–2:** N/A (JSON content, not test-driven) — Stage E's parity test is the guard.
- [ ] **Step 3: Implement.** Replace `config.step.user` with:

```json
{
  "title": "🔐 OIG Cloud — přihlášení",
  "description": "Zadejte přihlašovací údaje do OIG Cloud aplikace. Standardní a rozšířené senzory se zapnou automaticky — vše ostatní (solár, ceny, baterie, bojler, připojení) nastavíte ve webovém portálu po dokončení.\n\n⚠️ V mobilní aplikaci OIG Cloud musí být zapnutá funkce 'Živá data'.",
  "data": {
    "username": "E-mail nebo uživatelské jméno",
    "password": "Heslo",
    "box_id_override": "ID zařízení (Box ID) — nechte prázdné, pokud máte jeden box",
    "enable_dashboard": "📊 Zapnout portál (webový dashboard)"
  },
  "data_description": {
    "box_id_override": "Vyplňte jen pokud váš účet spravuje více boxů a chcete vybrat konkrétní.",
    "enable_dashboard": "Otevře webový portál s grafy a průvodcem nastavení po dokončení."
  }
}
```

Delete the old `setup_type`/`quick_setup`-chooser copy since `user` no longer shows it (leave
`quick_setup`'s own strings key as-is — orphaned per design decision 6, same as the code).

- [ ] **Step 4: Run.** `.venv/bin/python -m json.tool custom_components/oig_cloud/strings.json >/dev/null`
  (syntax only — Stage E does the real parity gate).
- [ ] **Step 5: Commit**

```bash
git add custom_components/oig_cloud/strings.json custom_components/oig_cloud/translations/en.json custom_components/oig_cloud/translations/cs.json
git commit -m "feat(i18n): credentials-only user-step copy (D9)"
```

**Done-criteria:** `strings.json`'s `user` step matches Task 1's schema keys exactly; no
`setup_type` key remains anywhere in `config.step.user`.

---

## Stage B — Portal tab gating

### Task 3: FE `OnboardingState` gains `finished_at` (no backend change — already on the wire)

**Files:**
- Modify: `www_v2/src/ui/features/onboarding/onboarding-data.ts` — `OnboardingState` interface
  (`:54-77`), `EMPTY_ONBOARDING_STATE` (`:103-119`)
- Test: `www_v2/src/__tests__/onboarding-review-mode.test.ts` or a focused new assertion in
  `onboarding-mount.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
test('OnboardingState carries finished_at, EMPTY state defaults it to null', () => {
  expect(EMPTY_ONBOARDING_STATE.finished_at).toBeNull();
  const state: OnboardingState = { ...EMPTY_ONBOARDING_STATE, finished_at: '2026-07-26T10:00:00Z' };
  expect(state.finished_at).toBe('2026-07-26T10:00:00Z');
});
```

- [ ] **Step 2: Run — verify FAIL** (TS compile error today: `finished_at` isn't a declared field).

Run: `cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit`

- [ ] **Step 3: Implement.** Add `finished_at: string | null;` to the `OnboardingState` interface
  (`onboarding-data.ts:54-77`, right after `banner_dismissed`) and `finished_at: null` to
  `EMPTY_ONBOARDING_STATE` (`:103-119`). No backend change: `OIGCloudOnboardingView.get`
  (`api/ha_rest_api.py:1825-1836`) already returns the raw `OnboardingState` dict verbatim, which
  always contains `finished_at` (`onboarding/state.py:48`, `:184`).

- [ ] **Step 4: Run — PASS.**

Run: `cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit && npx vitest run src/__tests__/onboarding-mount.test.ts`

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/features/onboarding/onboarding-data.ts src/__tests__/onboarding-mount.test.ts
git commit -m "feat(onboarding): expose finished_at on the FE OnboardingState type (D9, wire-compatible)"
```

**Done-criteria:** `finished_at` is typed and defaulted; zero backend files touched.

---

### Task 4: `app.ts` hides Toky/Ceny/Bojler until `finished_at` (or grandfathered)

**Files:**
- Modify: `www_v2/src/ui/app.ts` — new `dashboardGated` getter/computation near
  `showOnboardingBanner` (`:1330-1332`); `DEFAULT_TABS` usage at `:1351`; `activeTab` initial value
  (`@state() private activeTab`, find its declaration near `:1330` block) when gated on mount.
- Test: new `www_v2/src/__tests__/app-tab-gating.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// new file
test('non-grandfathered entry with no finished_at shows only the Nastavení tab', async () => {
  el.onboarding = { ...EMPTY_ONBOARDING_STATE, grandfathered: false, finished_at: null };
  await el.updateComplete;
  const tabIds = [...el.shadowRoot.querySelectorAll('oig-tabs')[0].tabs].map((t) => t.id);
  expect(tabIds).toEqual(['settings']);
});

test('grandfathered entry sees all tabs immediately, finished_at irrelevant', async () => {
  el.onboarding = { ...EMPTY_ONBOARDING_STATE, grandfathered: true, finished_at: null };
  await el.updateComplete;
  const tabIds = [...el.shadowRoot.querySelectorAll('oig-tabs')[0].tabs].map((t) => t.id);
  expect(tabIds).toEqual(['flow', 'pricing', 'boiler', 'settings']);
});

test('non-grandfathered entry with finished_at set sees all tabs', async () => {
  el.onboarding = { ...EMPTY_ONBOARDING_STATE, grandfathered: false, finished_at: '2026-07-26T10:00:00Z' };
  await el.updateComplete;
  const tabIds = [...el.shadowRoot.querySelectorAll('oig-tabs')[0].tabs].map((t) => t.id);
  expect(tabIds).toEqual(['flow', 'pricing', 'boiler', 'settings']);
});

test('gated entry defaults activeTab to settings on mount, dashboard page still renders', async () => {
  el.onboarding = { ...EMPTY_ONBOARDING_STATE, grandfathered: false, finished_at: null };
  await el.updateComplete;
  expect(el.activeTab).toBe('settings');
  expect(el.shadowRoot.querySelector('oig-header')).not.toBeNull(); // page itself still renders
});
```

- [ ] **Step 2: Run — verify FAIL** (`DEFAULT_TABS` (`app.ts:57-62`) is a module-level constant,
  always all 4 tabs, unconditionally passed to `<oig-tabs>` at `:1351`; `activeTab` has no
  gating-aware initial value).

- [ ] **Step 3: Implement.**

```typescript
// app.ts, near showOnboardingBanner (:1330)
const dashboardGated = !!this.onboarding
  && !this.onboarding.grandfathered
  && !this.onboarding.finished_at;
const visibleTabs = dashboardGated
  ? DEFAULT_TABS.filter((t) => t.id === 'settings')
  : DEFAULT_TABS;
```

Pass `.tabs=${visibleTabs}` instead of `.tabs=${DEFAULT_TABS}` at `:1351`. In the onboarding-state
load path (wherever `this.onboarding` is first assigned from `loadOnboardingState` — same method
`showOnboardingBanner`'s logic already depends on), if `dashboardGated` is true on that first load
AND `this.activeTab` is still at its default (`'flow'`), set `this.activeTab = 'settings'`. The
`tab-content` divs for flow/pricing/boiler (`:1368`, `:1417`, `:1450`) stay in the template
unconditionally (unaffected — they're just never reachable via the nav when gated, matching "page
renders, content tabs are locked" from the owner design, not a second gate to build).

- [ ] **Step 4: Run — PASS.** Re-run existing app tests for fallout (any test asserting all 4 tabs
  render must now seed `grandfathered: true` or `finished_at` non-null).

Run: `cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/app-tab-gating.test.ts src/__tests__/app-refresh.test.ts`

- [ ] **Step 5: Lint + commit**

```bash
cd custom_components/oig_cloud/www_v2 && npx tsc --noEmit
git add src/ui/app.ts src/__tests__/app-tab-gating.test.ts
git commit -m "feat(app): gate Toky/Ceny/Bojler tabs behind onboarding completion, grandfathered exempt (D9)"
```

**Done-criteria:** a fresh, non-grandfathered, unfinished entry sees only Nastavení in the tab bar;
a grandfathered entry is never gated regardless of `finished_at`; the wizard overlay
(`onboardingWizardOpen`, `app.ts:132`) and its `launch-onboarding` entry points (`:975-981`,
`settings/index.ts:803`) are untouched and still reachable from the visible Nastavení tab.

---

## Stage C — Telemetry move (verification, not new code)

### Task 5: Regression-lock that `data_source_mode` never surfaces in the new-install flow surface

**Files:**
- Test only: `tests/test_config_flow_slim_credentials.py` (append)

- [ ] **Step 1: Write the failing test**

```python
@pytest.mark.asyncio
async def test_user_step_schema_never_asks_data_source_mode():
    flow = DummyConfigFlow()
    result = await flow.async_step_user()
    schema_keys = {str(k) for k in result["data_schema"].schema}
    assert "data_source_mode" not in schema_keys

@pytest.mark.asyncio
async def test_user_step_created_entry_gets_registry_default_data_source_mode(monkeypatch):
    monkeypatch.setattr(steps_module, "validate_input", _fake_validate_input)
    flow = DummyConfigFlow()
    result = await flow.async_step_user({"username": "d", "password": "p", "box_id_override": "", "enable_dashboard": True})
    assert result["options"]["data_source_mode"] == "cloud_only"  # config_registry.py:567 default
```

This is already true after Task 1 (`_build_options_payload` reads `basic.data_source_mode`'s
registry default — `_build_base_options`, `steps.py:381-389` — since it's never in `user_input`).
This task exists to make it an explicit, load-bearing regression test rather than an accidental
side effect of Task 1's implementation.

- [ ] **Step 2: Run — verify PASS already** (if it fails, Task 1 regressed — fix Task 1, not this
  test).
- [ ] **Step 3:** N/A — no production code change.
- [ ] **Step 4: Run — confirm PASS.**
- [ ] **Step 5: Commit**

```bash
git add tests/test_config_flow_slim_credentials.py
git commit -m "test(config-flow): lock data_source_mode out of the new-install form surface (D9)"
```

Separately, confirm (no test needed — already shipped on this branch per
`PHASE-B-INTEGRATION-REPORT.md`) that the portal's Connection step
(`www_v2/src/ui/features/onboarding/step-connection.ts:22,27,29`) renders `data_source_mode` via
`fieldsFromRegistry(reg, 'basic')` — i.e. the field has exactly one home now: the portal, for both
new-install (once the user opens the wizard post-create) and review-mode edits.

**Done-criteria:** `data_source_mode` appears in zero fields of the HA-native new-install form;
still lands in options at its registry default; portal Connection step remains its only editable
surface.

---

## Stage D — Reconfigure-path decision + tests (evidence, not new code)

### Task 6: Regression-lock the options/reconfigure flow is untouched

**Files:**
- Test only: existing `tests/test_config_options_flow.py`, `tests/test_config_flow_wizard_steps.py`
  — no new file; this task is "run them and prove zero diff in behavior", per design decision 5.

- [ ] **Step 1–2:** N/A — these are pre-existing tests of `OigCloudOptionsFlowHandler`; if Task 1
  accidentally touched anything they exercise, they fail now.
- [ ] **Step 3:** N/A — no production code change (that's the point of the decision).
- [ ] **Step 4: Run — confirm PASS, unchanged.**

Run: `.venv/bin/python -m pytest -q tests/test_config_options_flow.py tests/test_config_flow_wizard_steps.py tests/test_config_steps_wizard_extra.py`

- [ ] **Step 5: No commit needed if genuinely zero diff** (if lint/type changes ripple in from Task 1's
  edits to shared `WizardMixin` helpers, fix and commit those narrowly).

**Done-criteria — the decision, recorded:** the legacy WizardMixin options/reconfigure flow (HA's
native "Configure" dialog) is KEPT, unmodified, permanently — not "until later cleanup" — because it
is the only reconfigure path for any entry with the portal checkbox off (`enable_dashboard=False`,
a real Task-1 choice), and it already doesn't overlap the portal (no credentials step, already a
slimmed section-menu, per design decision 5's citations). Report this decision explicitly to the
requester — it is the answer to the brief's "reconfigure-path decision" ask.

---

## Stage E — i18n / hassfest for changed flow strings

### Task 7: hassfest + i18n parity gate over the whole diff

**Files:** none new — this is a verification-only stage over Stages A–D's edits.

- [ ] **Step 1–2:** N/A.
- [ ] **Step 3:** N/A.
- [ ] **Step 4: Run the gates.**

```bash
bash scripts/run_hassfest.sh
.venv/bin/python -m pytest -q tests/  # full backend suite — catches any orphaned-string / schema drift
cd custom_components/oig_cloud/www_v2 && npx vitest run && npx tsc --noEmit
```

If hassfest flags `strings.json`/`translations/en.json`/`translations/cs.json` key drift from
Task 2's edit, fix in place (English translation of the new `user` step copy is required — mirror
the Czech from Task 2 into `en.json`, following the existing `wizard_credentials` en/cs pairing as
the template).

- [ ] **Step 5: Commit** (only if fixes were needed)

```bash
git add custom_components/oig_cloud/translations/en.json custom_components/oig_cloud/translations/cs.json custom_components/oig_cloud/strings.json
git commit -m "fix(i18n): hassfest parity for D9 credentials-only user step"
```

**Done-criteria:** `scripts/run_hassfest.sh` exits 0; full backend + frontend suites green; no
orphaned or missing translation keys for anything Stages A–D touched.

---

## Summary for the requester

- **Task count:** 7 tasks across 5 stages (A: 2, B: 2, C: 1, D: 1, E: 1).
- **Reconfigure-path decision (Stage D):** KEEP the legacy HA-native options/reconfigure flow
  unmodified, permanently — it is the sole reconfigure path when the portal checkbox is off, and it
  already doesn't overlap the portal (no credentials step; already slimmed to a section-menu).
  "Slimming" in this plan applies ONLY to `ConfigFlow.async_step_user` (new install).
- **Conflicts with the deployed wizard v2 found:** none — Stage C's telemetry move is already
  structurally in place (`step-connection.ts` already renders `data_source_mode` from the `basic`
  registry section on this branch); this plan only needed to lock the HA-native side shut and add a
  regression test. Stage B's completion signal (`finished_at`) is already transmitted by the backend
  REST endpoint wizard v2 built — no backend change needed, only a one-line FE type addition.
- **Flags for the integrator:** (1) `enable_dashboard` default-checked for new installs only,
  diverging from the registry's own `False` default — brief already anticipated this. (2) the "box"
  field is a minimal optional-override text field, not a discovery UI — flag if multi-box accounts
  are a real, common case. (3) `wizard_welcome`/`wizard_credentials`/`quick_setup`/`import_yaml`
  become orphaned dead code after this plan, deliberately not deleted (blast radius on ~15 existing
  unit tests) — tracked as follow-up tech debt, not fixed here.
