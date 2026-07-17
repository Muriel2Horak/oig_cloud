# F1 Plan 3/4 — Soft Onboarding + OIG's own AI backend + Registry-driven forms & UX fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard's config surface generate itself from the field registry (with
provider-conditional visibility and validation), give OIG its **own** AI backend (no HACS plugin, no
remote fetch), and land the two confirmed live UX gaps. Onboarding is a **SOFT guided flow** — the
dashboard always renders, for every install, new or old.

**Architecture:** `config_registry.py` gains render/visibility metadata (`show_if`, `widget`, `scale`,
`optional`, `entity_domain`) so conditional forms become **data, not code**. A shared solar validator
(`config/solar_rules.py`) owns **every** solar cross-field rule and is called by both the REST POST and
the HA options flow, so a provider switch can never persist a config one surface would reject. The V2
settings tab fetches `/config_registry` and builds its `modules`/`battery`/`solar` cards from it. New
`ai/` package: `key_store.py` (`.storage`, never options), `backends.py` (`OpenAiCompatBackend` →
Groq/NVIDIA with the user's key, **pure aiohttp, no HA `ai_task` import**, prompts filtered through an
**allow-list**), and a thin `ai_task.py` platform supplying OIG's own `AITaskEntity` (`GENERATE_DATA` /
`_async_generate_data`) which **dispatches on the chosen provider** — a user who picks their own HA
`ai_task` is never routed to Groq. New `onboarding/` package: a versioned `.storage` state machine +
REST, and a V2 wizard that is launched voluntarily and **never gates render**.

> **The three defaults are the plan's own tripwire.** The bug this plan is built around —
> a registry default its own `coerce_value` rejects — has **three** instances, not two
> (`solar_forecast_provider`, `solar_forecast_mode`, `boiler_alt_source_type`), and fixing the default
> is only half the repair: the **stored** `""` survives it. Task 1 therefore fixes all three *and*
> promotes the stored blanks, and asserts the *rule* (`test_no_enum_field_defaults_outside_its_own_enum`)
> rather than the three instances.

**Tech Stack:** Python 3.12, Home Assistant custom integration, pytest, flake8 (CI runs
`--max-line-length=120`, `.flake8` local config says 88 with E501 ignored — CI's 120 is the gate), mypy
(`--ignore-missing-imports --explicit-package-bases`). Frontend: TypeScript + Lit 3 under
`custom_components/oig_cloud/www_v2/`, vitest (`src/__tests__/**/*.test.ts`, `@` → `src`), tsc, eslint.

> **Venv note (verified 2026-07-17):** there is **no `.venv` inside this worktree** — the only one on the
> box is `/repos/oig-cloud/.venv`. Plan 1's bare `.venv/bin/python` acceptance commands therefore do not
> run from a worktree. Every acceptance command below uses the form below, which was **executed and
> confirmed green** while writing this plan (`tests/test_config_registry.py` → `20 passed in 4.86s`):
> ```bash
> cd <your-worktree> && PYTHONPATH=$PWD /repos/oig-cloud/.venv/bin/python -m pytest -q <file>
> ```

**Spec:** **`SCOPE-REVISION.md` (2026-07-17) is BINDING and OVERRIDES `F1-DESIGN.md` wherever they
conflict.** Governing points: #5 (AI optional), #6 (soft guide — K1 hard gate DROPPED), #7 (registration
links + numbered key steps), #8 (provider is a co-equal choice — no "Groq recommended", no hard default),
#9 (OIG ships its own AI backend — no HACS dependency). Also `F1-DESIGN.md` §5–§6 and DECISIONS P2, P5,
K2b, K2f **as narrowed by SCOPE-REVISION**. Fold-ins: `spec-critique/UX-AUDIT.md` U1–U7, U9;
`spec-critique/REPORT-codex.md` (authorization on new endpoints; conditional-schema contract).

> **Superseded — do NOT implement, even though F1-DESIGN still describes them:** remote `tuning`
> (SCOPE-REVISION #1), runtime `remote_config` fetch / signature / MITM / cache / rollback / expiry
> (#4 — this also voids codex's CRITICAL #1), the hard dashboard gate incl. D5/D10/K1 lock
> (#6), and "Groq (doporučeno)" / hard default (#8, contra `F1-DESIGN.md:47-48` and DECISIONS P10.2).
> `ai_models` + `pricelists` become a **bundled** dataset — that is **Plan 4's**, not this plan's.

**Not this plan:** Plan 2's work (the `basic` section + options-flow payload derivation) and Plan 4's
work (dead-key deletion, `_MODULE_CONFIG_FIELDS` removal, migration, the bundled dataset) — with **one
declared exception**: Task 1 re-defaults three enum fields whose stored `""` would then 400 on the next
save, so Task 1 Steps 6–9 promote exactly those three keys. A plan that creates a migration and hands it
to the next plan has shipped a regression. Nothing else is migrated here. See *What this plan does NOT
fix*.

**Worklog convention:** commit after every task; all commits end with:
```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
Stage **named paths only** (never `git add -A`, never a bare directory).

---

## Facts established by grep/execution before writing this plan

Every anchor below was personally verified in this worktree at `a5ef87a74` on 2026-07-17. **Re-verify
before editing** — Plan 1's and Plan 2's references have already rotted (Plan 2's self-review cites
`config_registry.py:74/81/85` for `_register`/`fields_for_section`/`registry_as_api_dict`; they are
**really** at `:83/:90/:94` today).

| Fact | Anchor (verified) |
|---|---|
| `Field` has **no** `show_if` / widget metadata | `config_registry.py:15-36` (fields listed `:17-30`) |
| `label`/`hint` auto-derive i18n keys `field.<key>.label` | `config_registry.py:32-36` |
| `coerce_value` rejects values outside `enum` | `config_registry.py:74-75` |
| Registry has **57** fields, sections `battery, boiler, modules, solar` (no `basic` — Plan 2 adds it) | executed against `FIELD_REGISTRY` |
| `registry_as_api_dict` emits section/type/scope/label/hint/min/max/step/enum/secret/reload | `config_registry.py:94-117` |
| `solar_forecast_provider` **default `""` is NOT in its own enum** | `config_registry.py:151-152` |
| `solar_forecast_mode` — **same bug**, `default=""` not in its enum | `config_registry.py:153-154` |
| `boiler_alt_source_type` — **the THIRD instance of the same bug**, `default=""` not in `("gas","heat_pump","fireplace","other")` | `config_registry.py:193-194` |
| …though the config flow already defaults `boiler_alt_source_type` to `"gas"` | `config/steps.py:579-580` |
| `no_strings_enabled` is a solar cross-field rule that lives **outside** `_validate_solar_provider` | `config/steps.py:1643` in `_validate_solar_strings` (`:1637`), called `:1558` |
| REST POST coerces the **raw** azimuth — no normalisation on that surface | `ha_rest_api.py:1261` (loop `:1252-1265`) |
| GET `module_config` has **NO admin check** (POST does) | `ha_rest_api.py:1206-1222` vs `:1228-1230` |
| GET falls back to `field.default` for absent keys | `ha_rest_api.py:1220` |
| GET masks secrets to `<key>_set` | `ha_rest_api.py:1218` |
| POST does **only** per-field `coerce_value` — no cross-field rule | `ha_rest_api.py:1252-1265` |
| POST: empty secret == "keep current" | `ha_rest_api.py:1258-1259` |
| POST error shape `{"error":"validation","fields":{...}}` | `ha_rest_api.py:1267-1268` |
| Views registered in one block | `ha_rest_api.py:1333-1343` (inside `setup_api_endpoints`, `:1323`) |
| `SOLAR_FIELDS` is a flat list; provider is a plain select | `settings/index.ts:83-97` (`:84`) |
| `solar_forecast_api_key` + `solar_forecast_mode` **absent from the form** | `settings/index.ts:83-97` |
| …though both are typed in the FE model | `data/settings-data.ts:38-54` (`:40`, `:41`) |
| `FieldDef` has no `showIf` | `settings/index.ts:34-49` |
| Select CSS styles the **closed box only**; no `option{}` rule | `settings/index.ts:289-299` |
| `applyTheme` sets CSS vars but **never `color-scheme`** | `ui/theme.ts:95-108` (loop `:99-101`) |
| Only a **static** `color-scheme` meta exists | `www_v2/index.html:6` |
| Secrets render as `<input type="text">`, detected by `endsWith('api_key')` | `settings/index.ts:627`, `:634` |
| Azimuth: flow validates `0..360`; registry+FE use `-180..180` | `steps.py:1662` & `:1679` vs `config_registry.py:166`, `settings/index.ts:92` |
| `_validate_solar_provider` (the rule REST must mirror) | `steps.py:1606-1622` (`:1613-1614`, `:1616-1621`) |
| Settings tab is mounted unconditionally | `ui/app.ts:1397-1398`; tabs `:55-58` |
| **No** `onboarding/` dir, **no** `ai/` module, **no** `ai_task`/`key_store` code anywhere | `ls` + `grep -rn 'ai_task\|AITaskEntity\|key_store\|OpenAiCompat' custom_components/` → 0 hits |
| FE **never** calls `/config_registry` | `grep -rn config_registry www_v2/src` → 0 hits |
| **No** `showIf`/`show_if`/`dependsOn` anywhere in FE | `grep -rn` → 0 hits |
| **No** `type='password'` anywhere in FE | `grep -rn` → 0 hits |
| **No** translation defines any `field.*` key | `grep -rn '"field\.' strings.json translations/*.json` → 0 hits |
| Store convention: `Store(hass, version=1, key=…, private=True)` | `battery_forecast/balancing/core.py:79-84` |
| REST test fixtures to reuse | `tests/test_ha_rest_api_views.py:15-87` (`DummyRequest`, `DummyJsonRequest`, `DummyEntry`, `DummyHass`, `DummyConfigEntries`) |

### ⚠️ The finding that shapes this plan: `ai_task` does not exist in the test environment

```
$ /repos/oig-cloud/.venv/bin/python -c "import homeassistant.const as c; print(c.__version__)"
2025.1.4
$ ... "import homeassistant.components.ai_task"
ai_task: ABSENT -> ModuleNotFoundError: No module named 'homeassistant.components.ai_task'
```

- `requirements-dev.txt:1075` pins **`homeassistant==2025.1.4`** (dragged in by
  `pytest-homeassistant-custom-component==0.13.205`, `requirements-dev.in:5`), and
  `.github/workflows/test.yml` installs **`requirements-dev.txt`** — so **CI tests run on HA 2025.1.4**.
- `requirements.in:5` / `requirements.txt:184` pin `homeassistant==2026.1.0`, but that file is for
  security scanning; it is **not** what the test job installs.
- `ai_task` landed in HA 2025.7/2025.8 (DECISIONS O1). **On 2025.1.4 there is no `ai_task` module and no
  `Platform.AI_TASK` enum member.**

**Consequences, and they are structural — not cosmetic:**
1. `ai/backends.py` and `ai/key_store.py` **must not import `ai_task`**. They are plain modules and are
   therefore fully testable on the CI harness as it stands today. All the security-critical tests the
   brief demands (key-never-in-options, key-never-in-logs, prompt anonymity) live there and run **now**.
2. The `AITaskEntity` subclass is a **thin adapter** behind a guarded import; its tests `skipif` the
   module is unavailable. Task 9 bumps the harness and un-skips them.
3. Nothing about the AI feature may break setup on an HA without `ai_task` (SCOPE-REVISION #5: AI is
   optional and never a condition for the dashboard).

---

### Task 1: Registry gains conditional-visibility + render metadata, and its blank enum defaults are fixed + promoted

**Files:**
- Modify: `custom_components/oig_cloud/config_registry.py` (`Field` `:15-36`; `registry_as_api_dict` `:94-117`; solar block `:150-172`; `boiler_alt_source_type` `:193-194`)
- Create: `custom_components/oig_cloud/config/promote_defaults.py` (Steps 6–9 — the migration this task's own default change creates)
- Modify: `custom_components/oig_cloud/__init__.py` (call the promote on entry setup — Step 8)
- Test: `tests/test_config_registry.py` (append), `tests/test_promote_defaults.py` (new)

Closes UX-AUDIT U9's mechanism proposal and codex's "flat Field cannot generate the wizard safely".
`show_if` is `(field_key, allowed_values)` — a tuple, because `Field` is `frozen=True` and must stay
hashable-friendly and importable without HA.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_config_registry.py (append)

def test_field_show_if_defaults_to_none():
    f = Field(key="x", section="solar", type=str, default="")
    assert f.show_if is None
    assert f.widget is None
    assert f.scale is None
    assert f.optional is False
    assert f.entity_domain is None


def test_solar_secrets_are_provider_conditional():
    """U1/U2: which key is required is a property of the registry, not the FE."""
    reg = FIELD_REGISTRY
    assert reg["solcast_api_key"].show_if == ("solar_forecast_provider", ("solcast",))
    assert reg["solcast_site_id"].show_if == ("solar_forecast_provider", ("solcast",))
    assert reg["solar_forecast_api_key"].show_if == (
        "solar_forecast_provider", ("forecast_solar",))
    assert reg["solar_forecast_mode"].show_if == (
        "solar_forecast_provider", ("forecast_solar",))


def test_string2_geometry_is_gated_on_string2_enabled():
    """U7: geometry fields hide when their string is off."""
    for key in ("solar_forecast_string2_kwp", "solar_forecast_string2_declination",
                "solar_forecast_string2_azimuth"):
        assert FIELD_REGISTRY[key].show_if == ("solar_forecast_string2_enabled", (True,))


def test_show_if_targets_are_real_registry_keys():
    """A typo in show_if must not silently hide a field forever."""
    for key, f in FIELD_REGISTRY.items():
        if f.show_if is None:
            continue
        target, allowed = f.show_if
        assert target in FIELD_REGISTRY, f"{key}.show_if points at unknown {target}"
        assert allowed, f"{key}.show_if has an empty allowed set"
        tf = FIELD_REGISTRY[target]
        for value in allowed:
            # allowed values must be legal for the TARGET field's own type
            assert isinstance(value, tf.type), f"{key}.show_if: {value!r} not a {tf.type.__name__}"


@pytest.mark.parametrize("key", [
    "solar_forecast_provider",
    "solar_forecast_mode",
    "boiler_alt_source_type",   # the THIRD instance — same bug, different section
])
def test_provider_default_round_trips_through_coerce(key):
    """REGRESSION (verified live 2026-07-17): these registry defaults ('') are
    rejected by their own coerce_value (config_registry.py:74-75), so GET ->
    POST of an untouched form 400s."""
    f = FIELD_REGISTRY[key]
    assert coerce_value(f, f.default) == f.default


def test_no_enum_field_defaults_outside_its_own_enum():
    """The general rule behind the three instances above — a fourth must not
    slip in unnoticed. An enum field's default must be legal, or blank-and-
    optional if 'unset' is genuinely a state (e.g. ai_provider, Task 8)."""
    for key, f in FIELD_REGISTRY.items():
        if f.enum is None:
            continue
        if f.default in ("", None) and f.optional:
            continue   # deliberately unset — Task 8's ai_provider
        assert f.default in f.enum, f"{key}: default {f.default!r} not in {f.enum}"


def test_api_dict_emits_show_if_and_widget_metadata():
    api = registry_as_api_dict()
    assert api["solcast_api_key"]["show_if"] == {
        "field": "solar_forecast_provider", "in": ["solcast"]}
    assert api["expensive_percentile"]["scale"] == 100
    assert api["boiler_temp_sensor_top"]["entity_domain"] == "sensor"
    assert api["boiler_temp_sensor_bottom"]["optional"] is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `PYTHONPATH=$PWD /repos/oig-cloud/.venv/bin/python -m pytest -q tests/test_config_registry.py`
Expected: FAIL — `TypeError: Field.__init__() got an unexpected keyword argument 'show_if'` /
`AttributeError: 'Field' object has no attribute 'show_if'`.

- [ ] **Step 3: Extend `Field` and the API dict**

Append to the `Field` dataclass (`config_registry.py`, after `hint` at `:30` — keep every new field
**keyword-defaulted** so the positional `key, section, type` call convention at `:121+` still works):

```python
    # --- F1 Plan 3: render + visibility contract (UX-AUDIT U1/U2/U7/U9) -------
    # (field_key, allowed_values) — field is rendered/validated only when the
    # referenced field's current value is in allowed_values.
    show_if: Optional[Tuple[str, Tuple[Any, ...]]] = None
    widget: Optional[str] = None        # override the type-derived control
    scale: Optional[float] = None       # display multiplier (fraction stored, % shown)
    optional: bool = False              # may be left blank
    entity_domain: Optional[str] = None  # render an entity picker for this domain
```

In `registry_as_api_dict` (`:94-117`), before `out[key] = spec` (`:116`):

```python
        if f.show_if is not None:
            target, allowed = f.show_if
            spec["show_if"] = {"field": target, "in": list(allowed)}
        for attr in ("widget", "scale", "entity_domain"):
            if getattr(f, attr) is not None:
                spec[attr] = getattr(f, attr)
        if f.optional:
            spec["optional"] = True
```

Now tag the solar block (`:150-172`). **Also fix the THREE defaults that cannot round-trip** — the
registry defaults `provider`/`mode`/`boiler_alt_source_type` to `""`, which its own `coerce_value`
rejects (`:74-75`). In every case adopt the **flow's** live default, which is the same resolution Plan 2
recommends for OQ-5 (registry follows the flow, no user-visible change): `"forecast_solar"`
(`steps.py:1608`), `"daily_optimized"` (`steps.py:1610`) and `"gas"` (`steps.py:579-580`).

> **The third instance is in the boiler section, not the solar one** (`config_registry.py:193-194`).
> It was missed by the first pass of this plan because the headline bug was framed as a *solar* bug; it
> is not — it is an **enum-field-with-blank-default** bug, and `test_no_enum_field_defaults_outside_its_
> own_enum` (Step 1) is the rule that stops a fourth appearing. Fixing only the two solar keys would
> leave `POST {"section":"boiler","values":{...}}` of an untouched form 400-ing exactly as before.

```python
    Field("solar_forecast_provider", "solar", str, default="forecast_solar",
          enum=("forecast_solar", "solcast")),
    Field("solar_forecast_mode", "solar", str, default="daily_optimized",
          enum=("hourly", "every_4h", "daily_optimized"),
          show_if=("solar_forecast_provider", ("forecast_solar",))),
    Field("solar_forecast_api_key", "solar", str, default="", secret=True, optional=True,
          show_if=("solar_forecast_provider", ("forecast_solar",))),
    Field("solcast_api_key", "solar", str, default="", secret=True,
          show_if=("solar_forecast_provider", ("solcast",))),
    Field("solcast_site_id", "solar", str, default="",
          show_if=("solar_forecast_provider", ("solcast",))),
```

…and the third instance, in the **boiler** block (`:193-194`) — the flow already defaults it to `"gas"`
(`steps.py:579-580`), so this is the registry catching up, not a behaviour change:

```python
    Field("boiler_alt_source_type", "boiler", str, default="gas",
          enum=("gas", "heat_pump", "fireplace", "other"), reload_on_change=True),
```

…and gate the string-2 geometry trio on `solar_forecast_string2_enabled`
(`show_if=("solar_forecast_string2_enabled", (True,))`), mirroring string-1 against
`solar_forecast_string1_enabled`. Add `scale=100` to `expensive_percentile` (`:136` — stored as a
0.5–0.95 fraction, shown as %; U12) and `entity_domain="sensor"` / `optional=True` to the boiler
entity/optional fields (transcribe from `settings/index.ts:112-145`, which is the live source of that
metadata today).

> **Do NOT change** `enable_statistics` / `enable_extended_sensors` here — their registry-vs-flow
> default divergence is Plan 2's **OQ-5** and is explicitly blocked there. Touching it in Plan 3 would
> flip sensors off for real users behind an unrelated commit.

- [ ] **Step 4: Run tests — PASS**

Run: `PYTHONPATH=$PWD /repos/oig-cloud/.venv/bin/python -m pytest -q tests/test_config_registry.py tests/test_config_merge.py`

- [ ] **Step 5: Lint** (the commit comes after Steps 6–9 — the default change and its migration ship
      together, or there is a release window in which existing users 400 on every save)

```bash
/repos/oig-cloud/.venv/bin/python -m flake8 --max-line-length=120 custom_components/oig_cloud/config_registry.py tests/test_config_registry.py
```

#### Steps 6–9: promote the stored `""` — the migration THIS task's default change creates

Steps 3–4 change what an **absent** key defaults to. They do nothing for a key that is **present and
`""`** — and GET returns `opts.get(key, field.default)` (`ha_rest_api.py:1220`), so the stored `""`
wins over the new default and the very next POST 400s on `coerce_value`. Every user who has ever
touched the solar or boiler form has these keys stored.

> **Scope, and it is deliberately narrow.** This is **not** Plan 4's migration. Plan 4 owns dead-key
> deletion, `_MODULE_CONFIG_FIELDS` removal and the bundled dataset. This is **three keys, one shot,
> `"" → the new default`, nothing else** — it exists here only because Steps 3–4 create the bug class,
> and a plan that creates a migration and hands it to the next plan has shipped a regression. Do **not**
> generalise it over the registry, do **not** touch any other key.

- [ ] **Step 6: Write the failing tests**

```python
# tests/test_promote_defaults.py
"""The one-shot promote for the three keys whose default Task 1 changed.

NOT a general migration (that is Plan 4's). Three keys, one shot, "" -> default.
"""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from custom_components.oig_cloud.config.promote_defaults import (
    PROMOTED_DEFAULTS,
    promote_blank_enum_defaults,
)


def _entry(options):
    return SimpleNamespace(entry_id="e1", options=dict(options))


def _hass():
    return SimpleNamespace(
        config_entries=SimpleNamespace(async_update_entry=MagicMock()))


def test_promotes_exactly_the_three_keys_task_1_re_defaulted():
    """A fourth key here means someone widened this into Plan 4's migration."""
    assert PROMOTED_DEFAULTS == {
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_mode": "daily_optimized",
        "boiler_alt_source_type": "gas",
    }


@pytest.mark.parametrize("key,expected", [
    ("solar_forecast_provider", "forecast_solar"),
    ("solar_forecast_mode", "daily_optimized"),
    ("boiler_alt_source_type", "gas"),
])
def test_blank_is_promoted_to_the_new_default(key, expected):
    entry = _entry({key: ""})
    hass = _hass()
    assert promote_blank_enum_defaults(hass, entry) is True
    hass.config_entries.async_update_entry.assert_called_once()
    _, kw = hass.config_entries.async_update_entry.call_args
    assert kw["options"][key] == expected


def test_a_real_user_value_is_never_overwritten():
    """The user chose Solcast. One shot must not un-choose it."""
    entry = _entry({"solar_forecast_provider": "solcast",
                    "solcast_api_key": "k", "solcast_site_id": "s"})
    hass = _hass()
    assert promote_blank_enum_defaults(hass, entry) is False
    hass.config_entries.async_update_entry.assert_not_called()


def test_an_absent_key_is_left_absent_not_materialised():
    """Absent already resolves to the new default via GET's field.default
    fallback (ha_rest_api.py:1220) — writing it would be gratuitous churn."""
    entry = _entry({"charge_rate_kw": 2.8})
    hass = _hass()
    assert promote_blank_enum_defaults(hass, entry) is False
    hass.config_entries.async_update_entry.assert_not_called()


def test_promote_is_idempotent_a_second_run_writes_nothing():
    """'One shot' must hold even though this runs on every setup."""
    entry = _entry({"solar_forecast_provider": ""})
    hass = _hass()
    assert promote_blank_enum_defaults(hass, entry) is True
    entry.options = hass.config_entries.async_update_entry.call_args[1]["options"]
    hass.config_entries.async_update_entry.reset_mock()
    assert promote_blank_enum_defaults(hass, entry) is False
    hass.config_entries.async_update_entry.assert_not_called()


def test_untouched_keys_survive_the_promote():
    entry = _entry({"solar_forecast_provider": "", "charge_rate_kw": 2.8,
                    "solcast_site_id": "keep-me"})
    hass = _hass()
    promote_blank_enum_defaults(hass, entry)
    opts = hass.config_entries.async_update_entry.call_args[1]["options"]
    assert opts["charge_rate_kw"] == 2.8
    assert opts["solcast_site_id"] == "keep-me"


def test_every_promoted_value_is_legal_for_its_own_field():
    """Ties the promote to the registry — if Task 1's default moves, this fails."""
    from custom_components.oig_cloud.config_registry import FIELD_REGISTRY, coerce_value
    for key, value in PROMOTED_DEFAULTS.items():
        f = FIELD_REGISTRY[key]
        assert coerce_value(f, value) == value
        assert value == f.default, f"{key}: promote disagrees with the registry default"
```

- [ ] **Step 7: Run — verify FAIL** (`ModuleNotFoundError: ...config.promote_defaults`)

- [ ] **Step 8: Implement + wire it in**

```python
# custom_components/oig_cloud/config/promote_defaults.py
"""One-shot promote of the three blank enum defaults F1 Plan 3 Task 1 changed.

Task 1 re-defaulted solar_forecast_provider, solar_forecast_mode and
boiler_alt_source_type away from "" (which their own coerce_value rejects,
config_registry.py:74-75). A stored "" survives that change — GET returns
opts.get(key, field.default) (ha_rest_api.py:1220), so the stored blank wins
and the next POST 400s. This promotes exactly those three.

DELIBERATELY NOT a general migration: Plan 4 owns dead keys, _MODULE_CONFIG_FIELDS
removal and the bundled dataset. Three keys. One shot. Nothing else.
"""
from __future__ import annotations

import logging
from typing import Any, Dict

_LOGGER = logging.getLogger(__name__)

# key -> the default Task 1 gave it in config_registry.py. Keep in sync with the
# registry; tests/test_promote_defaults.py pins them to each other.
PROMOTED_DEFAULTS: Dict[str, str] = {
    "solar_forecast_provider": "forecast_solar",
    "solar_forecast_mode": "daily_optimized",
    "boiler_alt_source_type": "gas",
}


def promote_blank_enum_defaults(hass: Any, entry: Any) -> bool:
    """Replace a STORED "" with the field's new default. Returns True if written.

    Only "" is touched: an absent key already resolves to the new default, and a
    real user value is never overwritten. Idempotent — after one run there is no
    "" left, so a second run writes nothing.
    """
    options = dict(entry.options)
    promoted = {k: v for k, v in PROMOTED_DEFAULTS.items() if options.get(k) == ""}
    if not promoted:
        return False

    options.update(promoted)
    hass.config_entries.async_update_entry(entry, options=options)
    _LOGGER.info(
        "Promoted blank config defaults for %s: %s", entry.entry_id, promoted,
    )
    return True
```

Call it from `async_setup_entry` (`__init__.py`) **before** the platform forward at `:1650`, so the
first read after an upgrade already sees a legal value. It is cheap, idempotent and returns `False` on
every subsequent start.

> **Why not a `Store` flag / entry version bump?** Both are heavier than the problem. The promote is
> self-limiting: it only ever matches `""`, which is not reachable once Task 1 lands (`coerce_value`
> rejects it on write). Reaching for HA's migration machinery here would pull in the version/rollback
> surface Plan 4 owns.

- [ ] **Step 9: Run — PASS, then lint + commit**

Run: `PYTHONPATH=$PWD /repos/oig-cloud/.venv/bin/python -m pytest -q tests/test_config_registry.py tests/test_promote_defaults.py tests/test_config_merge.py`

```bash
/repos/oig-cloud/.venv/bin/python -m flake8 --max-line-length=120 custom_components/oig_cloud/config_registry.py custom_components/oig_cloud/config/promote_defaults.py custom_components/oig_cloud/__init__.py tests/test_config_registry.py tests/test_promote_defaults.py
git add custom_components/oig_cloud/config_registry.py custom_components/oig_cloud/config/promote_defaults.py custom_components/oig_cloud/__init__.py tests/test_config_registry.py tests/test_promote_defaults.py
git commit -m "feat(registry): show_if + render metadata; fix 3 non-round-trippable enum defaults + promote the stored blanks (U1/U2/U7/U9)"
```

---

### Task 2: Shared solar cross-field validator (REST + options flow) & one azimuth convention

**Files:**
- Create: `custom_components/oig_cloud/config/solar_rules.py`
- Modify: `custom_components/oig_cloud/api/ha_rest_api.py` (POST, `:1224-1279`; per-field loop `:1252-1265`)
- Modify: `custom_components/oig_cloud/config/steps.py` (`_validate_solar_provider` `:1606-1622`; `_validate_solar_strings` `:1637-1649`, `no_strings_enabled` `:1643`; `_validate_solar_string1` `:1651`, azim check `:1662`; `_validate_solar_string2` `:1668`, azim check `:1679`)
- Test: `tests/test_solar_rules.py` (new), `tests/test_ha_rest_api_views.py` (append)

Closes U3 (REST saves an incomplete provider switch silently, with a green "✓ Uloženo" toast at
`settings/index.ts:534`) and U6 (the same key validated `0..360` in the flow and `-180..180` in the
registry — a silently rotated roof). One rule set, two callers.

> **"One rule set" is a claim this task has to actually earn — twice over.** Both halves were missed on
> the first pass and both are verified live at `a5ef87a74`:
> - **Every** solar cross-field rule must move into the shared validator, not just the provider one.
>   `no_strings_enabled` lives at `steps.py:1643`, inside `_validate_solar_strings` (`:1637`, called at
>   `:1558`) — a *different* function from `_validate_solar_provider` (`:1606`). Mirror only the latter
>   and a POST with both strings disabled passes REST while the flow rejects it: the same drift this
>   task exists to end, just moved one function over.
> - **Both** surfaces must normalise azimuth. `normalize_azimuth` in the flow only (`:1662`/`:1679`)
>   leaves the REST POST coercing the raw value against the registry's `-180..180` (`:1261` vs
>   `config_registry.py:166`), so a stored legacy `270` 400s on the next save.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_solar_rules.py
"""U3/U6: ONE set of solar cross-field rules, shared by REST and the options flow."""
from __future__ import annotations

import pytest

from custom_components.oig_cloud.config.solar_rules import (
    normalize_azimuth,
    validate_solar_effective,
)


def _opts(**over):
    base = {
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_mode": "daily_optimized",
        "solar_forecast_api_key": "",
        "solcast_api_key": "",
        "solcast_site_id": "",
        # string1 on: the no_strings_enabled rule (steps.py:1643) is part of the
        # shared rule set, so a valid fixture must satisfy it.
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string2_enabled": False,
    }
    base.update(over)
    return base


def test_forecast_solar_daily_needs_no_key():
    assert validate_solar_effective(_opts()) == {}


def test_both_strings_disabled_is_rejected():
    """M1: no_strings_enabled lived ONLY in the flow (_validate_solar_strings,
    steps.py:1637-1643) — REST happily saved a panel-less solar config."""
    errors = validate_solar_effective(
        _opts(solar_forecast_string1_enabled=False,
              solar_forecast_string2_enabled=False))
    assert errors == {"base": "no_strings_enabled"}


def test_either_string_alone_satisfies_the_rule():
    for on in ("solar_forecast_string1_enabled", "solar_forecast_string2_enabled"):
        opts = _opts(solar_forecast_string1_enabled=False,
                     solar_forecast_string2_enabled=False, **{on: True})
        assert "base" not in validate_solar_effective(opts)


def test_forecast_solar_fast_mode_requires_its_own_key():
    errors = validate_solar_effective(_opts(solar_forecast_mode="hourly"))
    assert errors == {"solar_forecast_mode": "api_key_required_for_frequent_updates"}
    assert validate_solar_effective(
        _opts(solar_forecast_mode="hourly", solar_forecast_api_key="k")) == {}


def test_solcast_requires_key_and_site():
    errors = validate_solar_effective(_opts(solar_forecast_provider="solcast"))
    assert errors == {
        "solcast_api_key": "solcast_api_key_required",
        "solcast_site_id": "solcast_site_id_required",
    }


def test_switching_to_solcast_without_credentials_is_rejected():
    """The exact live bug: provider switch saved with blank Solcast fields."""
    stored = _opts(solar_forecast_api_key="fs-key")
    incoming = {"solar_forecast_provider": "solcast"}
    errors = validate_solar_effective({**stored, **incoming})
    assert "solcast_api_key" in errors and "solcast_site_id" in errors


@pytest.mark.parametrize("raw,expected", [
    (0, 0), (90, 90), (-90, -90), (180, 180),
    (270, -90),    # legacy unsigned west
    (360, 0),      # legacy unsigned north
    (181, -179),
])
def test_normalize_azimuth_maps_legacy_unsigned_to_signed(raw, expected):
    assert normalize_azimuth(raw) == expected
```

- [ ] **Step 2: Run — verify FAIL** (`ModuleNotFoundError: ...config.solar_rules`)

- [ ] **Step 3: Implement the shared rules**

```python
# custom_components/oig_cloud/config/solar_rules.py
"""Solar cross-field rules — the SINGLE source for provider/mode/key dependencies.

Called by BOTH the dashboard REST POST and the HA options flow, so a provider
switch can never persist a configuration the other surface would reject
(UX-AUDIT U3). Azimuth is normalised to ONE signed convention (U6).

Pure functions, no Home Assistant imports: importable from tests and from the
REST layer alike.
"""
from __future__ import annotations

from typing import Any, Dict

_FAST_MODES = ("hourly", "every_4h")


def normalize_azimuth(value: Any) -> int:
    """Normalise any azimuth to the signed -180..180 convention (0 = south).

    The registry and the dashboard already use signed (config_registry.py
    string1/2_azimuth min=-180 max=180; settings/index.ts:92 "0 = jih"); the
    options flow historically accepted unsigned 0..360 (steps.py:1662, :1679).
    Legacy stored values are mapped, not rejected.
    """
    azim = int(value)
    azim = ((azim + 180) % 360) - 180
    return azim


def validate_solar_effective(effective: Dict[str, Any]) -> Dict[str, str]:
    """Validate the EFFECTIVE (stored ∪ incoming) solar config.

    Returns {field_key: i18n_error_key}. This is the WHOLE solar cross-field rule
    set — every rule the options flow applies, so the two surfaces cannot drift:

    - provider/mode/key   (was ConfigFlow._validate_solar_provider, steps.py:1606-1622)
    - no_strings_enabled  (was ConfigFlow._validate_solar_strings,  steps.py:1637-1643)

    Per-string geometry (kwp/declination bounds, steps.py:1651-1683) stays in the
    flow: the registry already pins those bounds (config_registry.py:163-171) and
    REST enforces them per-field via coerce_value. Only CROSS-field rules live here.
    """
    errors: Dict[str, str] = {}
    provider = effective.get("solar_forecast_provider", "forecast_solar")

    if provider == "forecast_solar":
        mode = effective.get("solar_forecast_mode", "daily_optimized")
        api_key = str(effective.get("solar_forecast_api_key") or "").strip()
        if mode in _FAST_MODES and not api_key:
            errors["solar_forecast_mode"] = "api_key_required_for_frequent_updates"
    else:
        if not str(effective.get("solcast_api_key") or "").strip():
            errors["solcast_api_key"] = "solcast_api_key_required"
        if not str(effective.get("solcast_site_id") or "").strip():
            errors["solcast_site_id"] = "solcast_site_id_required"

    # M1: a solar config with no panels is meaningless on EITHER surface.
    if not effective.get("solar_forecast_string1_enabled") and not effective.get(
        "solar_forecast_string2_enabled"
    ):
        errors["base"] = "no_strings_enabled"
    return errors
```

- [ ] **Step 4: Wire both callers**

**REST POST** (`ha_rest_api.py`) — **two** wirings, and the azimuth one is easy to miss:

*(a) Normalise azimuth BEFORE `coerce_value`.* The registry pins `string1/2_azimuth` to
`min=-180, max=180` (`config_registry.py:166`, `:171`) and the POST loop coerces the **raw** value
(`:1261`). An existing user whose stored azimuth is a legacy unsigned `270` therefore gets a 400 on
their next solar save — the flow's normalisation at `:1662`/`:1679` never runs on this path. Inside the
per-field loop (`:1252-1265`), before `coerce_value`:

```python
            if key in ("solar_forecast_string1_azimuth", "solar_forecast_string2_azimuth"):
                try:
                    value = normalize_azimuth(value)
                except (TypeError, ValueError):
                    errors[key] = "invalid_azimuth"
                    continue
```

*(b) Cross-field rules,* after the loop ends at `:1265`, **before** the `if errors:` return at `:1267`.
The validator must see the **effective** config — stored options merged with the incoming updates —
otherwise "blank secret = keep current" (`:1258-1259`) makes a half-finished switch look valid:

```python
        if section == "solar" and not errors:
            effective = {**dict(entry.options), **updates}
            errors.update(validate_solar_effective(effective))
```

The `{"error": "validation", "fields": errors}` shape at `:1267-1268` is unchanged, so the FE renders
these with no change (`settings/index.ts:501-505`).

**Options flow** (`steps.py`): make **both** solar cross-field validators delegate, so neither rule can
drift from REST. `_validate_solar_provider` (`:1606-1622`) and the `no_strings_enabled` half of
`_validate_solar_strings` (`:1637-1643`) both collapse into the shared call:

```python
    def _validate_solar_provider(self, user_input: Dict[str, Any]) -> Dict[str, str]:
        return validate_solar_effective(user_input)

    def _validate_solar_strings(self, user_input: Dict[str, Any]) -> Dict[str, str]:
        # no_strings_enabled now comes from validate_solar_effective (via
        # _validate_solar_provider, called at :1556). Only per-string geometry
        # stays here.
        errors: Dict[str, str] = {}
        if user_input.get(CONF_SOLAR_FORECAST_STRING1_ENABLED):
            errors.update(self._validate_solar_string1(user_input))
        if user_input.get("solar_forecast_string2_enabled"):
            errors.update(self._validate_solar_string2(user_input))
        return errors
```

> **Watch the call order at `:1556-1558`.** `_validate_solar_provider` and `_validate_solar_strings`
> both `errors.update(...)` into one dict, and both can now write `"base"`. Since `no_strings_enabled`
> moves into the shared validator (called first, `:1556`), and the geometry paths write
> `"base": "invalid_string1_params"` only when that string is enabled, the two cannot both fire — but
> keep the shared call first so a panel-less config reports `no_strings_enabled` rather than a
> geometry error.

For the azimuth checks in `_validate_solar_string1`/`_validate_solar_string2`, replace the
`if not (0 <= azim1 <= 360)` guard (`:1662`, `:1679`) with `azim1 = normalize_azimuth(azim1)` and store
the normalised value back into `user_input`, so what is persisted matches the registry's `-180..180`
bounds.

Append the REST regression tests to `tests/test_ha_rest_api_views.py`, reusing that file's existing
`DummyJsonRequest` / `DummyEntry` / `DummyHass` / `DummyConfigEntries` fixtures (`:15-87`; note
`DummyRequest.__init__` already sets `hass_user` admin at `:17`, so the POST's admin gate at
`:1228-1230` passes) — open the file and copy the arrange/act pattern of the neighbouring view tests:

```python
def _solar_entry(**options):
    base = {
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_api_key": "fs-key",
        "solar_forecast_string1_enabled": True,
    }
    base.update(options)
    return DummyEntry("e1", options=base)


@pytest.mark.asyncio
async def test_module_config_post_rejects_incomplete_provider_switch(monkeypatch):
    """U3: switching to Solcast with blank credentials must NOT save."""
    entry = _solar_entry()
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    view = api_module.OIGCloudModuleConfigView()
    req = DummyJsonRequest(hass, payload={
        "section": "solar", "values": {"solar_forecast_provider": "solcast"}})

    resp = await view.post(req, "box1")

    assert resp.status == 400
    body = json.loads(resp.text)
    assert body["error"] == "validation"
    assert "solcast_api_key" in body["fields"]
    assert entry.options["solar_forecast_provider"] == "forecast_solar"  # not written


@pytest.mark.asyncio
async def test_module_config_post_rejects_disabling_every_string(monkeypatch):
    """M1: no_strings_enabled must bind REST too — it used to be flow-only
    (steps.py:1643), so this POST silently saved a panel-less solar config."""
    entry = _solar_entry()
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    view = api_module.OIGCloudModuleConfigView()
    req = DummyJsonRequest(hass, payload={"section": "solar", "values": {
        "solar_forecast_string1_enabled": False,
        "solar_forecast_string2_enabled": False}})

    resp = await view.post(req, "box1")

    assert resp.status == 400
    assert json.loads(resp.text)["fields"]["base"] == "no_strings_enabled"
    assert entry.options["solar_forecast_string1_enabled"] is True  # not written


@pytest.mark.asyncio
async def test_module_config_post_normalises_a_legacy_unsigned_azimuth(monkeypatch):
    """M2: the registry pins azimuth to -180..180 (config_registry.py:166) but the
    flow's normalisation (steps.py:1662) never ran on the REST path — a stored
    legacy 270 used to 400 on the next save."""
    entry = _solar_entry()
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    view = api_module.OIGCloudModuleConfigView()
    req = DummyJsonRequest(hass, payload={
        "section": "solar", "values": {"solar_forecast_string1_azimuth": 270}})

    resp = await view.post(req, "box1")

    assert resp.status == 200
    assert entry.options["solar_forecast_string1_azimuth"] == -90


@pytest.mark.asyncio
async def test_rest_and_flow_reject_the_same_panel_less_config(monkeypatch):
    """The claim this task exists to make true: ONE rule set, two surfaces.
    Same input, same verdict — asserted, not asserted-about."""
    from custom_components.oig_cloud.config.solar_rules import validate_solar_effective

    panel_less = {
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_mode": "daily_optimized",
        "solar_forecast_api_key": "fs-key",
        "solar_forecast_string1_enabled": False,
        "solar_forecast_string2_enabled": False,
    }
    # flow surface (the shared validator IS the flow's rule after Step 4)
    assert validate_solar_effective(panel_less) == {"base": "no_strings_enabled"}

    # REST surface, same input
    entry = DummyEntry("e1", options=dict(panel_less))
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    view = api_module.OIGCloudModuleConfigView()
    req = DummyJsonRequest(hass, payload={
        "section": "solar", "values": {"solar_forecast_string1_enabled": False}})

    resp = await view.post(req, "box1")
    assert resp.status == 400
    assert json.loads(resp.text)["fields"]["base"] == "no_strings_enabled"
```

- [ ] **Step 5: Run + lint + commit**

Run: `PYTHONPATH=$PWD /repos/oig-cloud/.venv/bin/python -m pytest -q tests/test_solar_rules.py tests/test_ha_rest_api_views.py tests/test_config_steps_flow.py`

```bash
git add custom_components/oig_cloud/config/solar_rules.py custom_components/oig_cloud/api/ha_rest_api.py custom_components/oig_cloud/config/steps.py tests/test_solar_rules.py tests/test_ha_rest_api_views.py
git commit -m "fix(solar): shared provider/mode/key validator on REST+options flow; one signed azimuth convention (U3/U6)"
```

---

### Task 3: FE fetches `/config_registry` and builds field lists from it

**Files:**
- Create: `custom_components/oig_cloud/www_v2/src/data/registry-data.ts`
- Create: `custom_components/oig_cloud/www_v2/src/i18n/fields.ts`
- Test: `custom_components/oig_cloud/www_v2/src/__tests__/registry-data.test.ts`

The endpoint has existed since Plan 1 (`ha_rest_api.py:1282-1297`, registered `:1339`) and **nothing
has ever called it** (verified: 0 hits for `config_registry` in `www_v2/src`). This task adds the client
and the label catalog; Task 4 makes the cards use it.

> **The i18n trap — verified, and it will show raw keys if ignored:** the registry auto-derives
> `label = "field.<key>.label"` (`config_registry.py:32-36`) and `registry_as_api_dict` emits those keys
> verbatim (`:102-103`). **No translation file defines a single `field.*` key** (`grep '"field\.'` over
> `strings.json` + `translations/*.json` → 0 hits), and there is no general FE i18n layer — only
> `i18n/boiler.ts` with its own `t()` (`:525`). Rendering `spec.label` directly would print
> `field.charge_rate_kw.label` on screen. So the catalog below is **required**, and it is seeded by
> harvesting the existing Czech copy from `settings/index.ts:62-145` — no new copywriting, no lost hints.

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/registry-data.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/data/ha-client', () => ({ haClient: { fetchOIGAPI: vi.fn() } }));
import { haClient } from '@/data/ha-client';
import { loadFieldRegistry, fieldsFromRegistry, isVisible } from '@/data/registry-data';
import { fieldLabel, fieldHint } from '@/i18n/fields';

const mockFetch = haClient.fetchOIGAPI as ReturnType<typeof vi.fn>;

const REGISTRY = {
  fields: {
    solar_forecast_provider: {
      section: 'solar', type: 'str', scope: 'premium',
      label: 'field.solar_forecast_provider.label', hint: 'field.solar_forecast_provider.hint',
      default: 'forecast_solar', enum: ['forecast_solar', 'solcast'],
    },
    solcast_api_key: {
      section: 'solar', type: 'str', scope: 'premium', secret: true,
      label: 'field.solcast_api_key.label', hint: 'field.solcast_api_key.hint',
      show_if: { field: 'solar_forecast_provider', in: ['solcast'] },
    },
    solar_forecast_api_key: {
      section: 'solar', type: 'str', scope: 'premium', secret: true, optional: true,
      label: 'field.solar_forecast_api_key.label', hint: 'field.solar_forecast_api_key.hint',
      show_if: { field: 'solar_forecast_provider', in: ['forecast_solar'] },
    },
    expensive_percentile: {
      section: 'battery', type: 'float', scope: 'premium', default: 0.7,
      min: 0.5, max: 0.95, scale: 100,
      label: 'field.expensive_percentile.label', hint: 'field.expensive_percentile.hint',
    },
  },
  sections: ['battery', 'solar'],
};

beforeEach(() => mockFetch.mockReset());

describe('loadFieldRegistry', () => {
  it('returns null (never throws) when the endpoint errors', async () => {
    mockFetch.mockResolvedValue({ error: 'Box not found' });
    expect(await loadFieldRegistry()).toBeNull();
  });

  it('parses fields + sections', async () => {
    mockFetch.mockResolvedValue(REGISTRY);
    const reg = await loadFieldRegistry();
    expect(reg!.fields.solcast_api_key.secret).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/config_registry'));
  });
});

describe('fieldsFromRegistry', () => {
  it('builds typed FieldDefs for one section, carrying showIf/scale/secret', () => {
    const defs = fieldsFromRegistry(REGISTRY as any, 'solar');
    const provider = defs.find((d) => d.key === 'solar_forecast_provider')!;
    expect(provider.type).toBe('select');
    expect(provider.options).toEqual([['forecast_solar', 'forecast_solar'], ['solcast', 'solcast']]);
    const solcastKey = defs.find((d) => d.key === 'solcast_api_key')!;
    expect(solcastKey.showIf).toEqual({ field: 'solar_forecast_provider', in: ['solcast'] });
    expect(solcastKey.secret).toBe(true);
    expect(defs.every((d) => d.key !== 'expensive_percentile')).toBe(true); // section filter
  });

  it('maps registry numeric types + scale onto the number widget', () => {
    const [pct] = fieldsFromRegistry(REGISTRY as any, 'battery');
    expect(pct.type).toBe('number');
    expect(pct.scale).toBe(100);
    expect(pct.min).toBe(0.5);
  });

  it('resolves i18n keys to Czech copy — never renders a raw key', () => {
    const defs = fieldsFromRegistry(REGISTRY as any, 'solar');
    for (const d of defs) {
      expect(d.label).not.toMatch(/^field\./);
      expect(d.label.length).toBeGreaterThan(0);
    }
  });
});

describe('isVisible', () => {
  const defs = fieldsFromRegistry(REGISTRY as any, 'solar');
  const solcastKey = defs.find((d) => d.key === 'solcast_api_key')!;
  const fsKey = defs.find((d) => d.key === 'solar_forecast_api_key')!;

  it('hides a field whose showIf predicate is unsatisfied', () => {
    const get = (k: string) => (k === 'solar_forecast_provider' ? 'forecast_solar' : undefined);
    expect(isVisible(solcastKey, get)).toBe(false);
    expect(isVisible(fsKey, get)).toBe(true);
  });

  it('reveals the matching provider key on switch', () => {
    const get = (k: string) => (k === 'solar_forecast_provider' ? 'solcast' : undefined);
    expect(isVisible(solcastKey, get)).toBe(true);
    expect(isVisible(fsKey, get)).toBe(false);
  });

  it('treats a field with no showIf as always visible', () => {
    const provider = defs.find((d) => d.key === 'solar_forecast_provider')!;
    expect(isVisible(provider, () => undefined)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

Run: `npm --prefix custom_components/oig_cloud/www_v2 run test:unit -- registry-data`
Expected: FAIL — cannot resolve `@/data/registry-data`.

- [ ] **Step 3: Implement the client + catalog**

`src/data/registry-data.ts` — mirror the shape of `settings-data.ts` (`:13` for `INVERTER_SN`,
`:101-110` for the `fetchOIGAPI` + error-guard pattern):

```ts
import { haClient } from '@/data/ha-client';
import type { FieldDef } from '@/ui/features/settings';
import { fieldLabel, fieldHint } from '@/i18n/fields';

const params = new URLSearchParams(window.location.search);
const INVERTER_SN = params.get('sn') || params.get('inverter_sn') || '';

export interface RegistrySpec {
  section: string; type: 'bool' | 'int' | 'float' | 'str'; scope: string;
  label: string; hint: string; default?: unknown;
  min?: number; max?: number; step?: number; enum?: string[];
  secret?: boolean; reload_on_change?: boolean;
  show_if?: { field: string; in: unknown[] };
  widget?: string; scale?: number; optional?: boolean; entity_domain?: string;
}
export interface FieldRegistry { fields: Record<string, RegistrySpec>; sections: string[]; }

export async function loadFieldRegistry(): Promise<FieldRegistry | null> {
  const data = await haClient.fetchOIGAPI<FieldRegistry | { error?: string }>(
    `/${INVERTER_SN}/config_registry`,
  );
  if (!data || (data as any).error || !(data as any).fields) return null;
  return data as FieldRegistry;
}

function widgetFor(spec: RegistrySpec): FieldDef['type'] {
  if (spec.widget) return spec.widget as FieldDef['type'];
  if (spec.type === 'bool') return 'bool';
  if (spec.enum) return 'select';
  if (spec.type === 'int' || spec.type === 'float') return 'number';
  return 'text';
}

export function fieldsFromRegistry(reg: FieldRegistry, section: string): FieldDef[] {
  return Object.entries(reg.fields)
    .filter(([, spec]) => spec.section === section)
    .map(([key, spec]) => ({
      key,
      label: fieldLabel(key, spec.label),
      hint: fieldHint(key, spec.hint),
      type: widgetFor(spec),
      min: spec.min, max: spec.max, step: spec.step,
      options: spec.enum?.map((v) => [v, v] as [string, string]),
      scale: spec.scale,
      optional: spec.optional,
      secret: spec.secret,
      showIf: spec.show_if,
      entity: spec.entity_domain ? { domain: spec.entity_domain } : undefined,
    }));
}

/** U1: a field is rendered only when its showIf predicate holds. */
export function isVisible(f: FieldDef, get: (key: string) => unknown): boolean {
  if (!f.showIf) return true;
  return f.showIf.in.some((v) => v === get(f.showIf!.field));
}
```

`src/i18n/fields.ts` — a `field.<key>.label` → Czech catalog. **Seed it by transcribing the existing
labels/hints** from `settings/index.ts:62-145` (`MODULE_FIELDS` `:62-70`, `BATTERY_FIELDS` `:72-81`,
`SOLAR_FIELDS` `:83-97`, `BOILER_FIELDS_ALL` `:112-145`) — do not invent copy:

```ts
const CS_LABELS: Record<string, string> = {
  'field.solar_forecast_provider.label': 'Poskytovatel',
  'field.solcast_site_id.label': 'Solcast site ID',
  'field.charge_rate_kw.label': 'Nabíjecí výkon ze sítě (kW)',
  // …transcribe every key from settings/index.ts:62-145…
  // NEW (U2 — no live copy exists, these two were never rendered):
  'field.solar_forecast_api_key.label': 'forecast.solar API klíč',
  'field.solar_forecast_mode.label': 'Frekvence aktualizace',
  'field.solar_forecast_mode.hint': 'Hodinově a po 4 h vyžaduje API klíč forecast.solar',
};
const CS_HINTS: Record<string, string> = { /* …same, for .hint keys… */ };

/** Falls back to a humanised key — never returns a raw i18n key. */
export function fieldLabel(key: string, i18nKey: string): string {
  return CS_LABELS[i18nKey] ?? key.replace(/_/g, ' ');
}
export function fieldHint(key: string, i18nKey: string): string | undefined {
  return CS_HINTS[i18nKey];
}
```

Add `showIf`, `secret` and `scale` to the `FieldDef` interface (`settings/index.ts:34-49`) —
`scale`/`optional`/`entity` already exist (`:44`, `:46`, `:48`):

```ts
  /** Registry-driven conditional visibility (UX-AUDIT U1). */
  showIf?: { field: string; in: unknown[] };
  /** Registry `secret` flag — replaces the endsWith('api_key') sniff at :627. */
  secret?: boolean;
```

- [ ] **Step 4: Run tests — PASS**

Run: `npm --prefix custom_components/oig_cloud/www_v2 run test:unit -- registry-data && npm --prefix custom_components/oig_cloud/www_v2 run typecheck`

- [ ] **Step 5: Commit**

```bash
git add custom_components/oig_cloud/www_v2/src/data/registry-data.ts custom_components/oig_cloud/www_v2/src/i18n/fields.ts custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts custom_components/oig_cloud/www_v2/src/__tests__/registry-data.test.ts
git commit -m "feat(settings): fetch /config_registry + field label catalog (P5 — FE stops owning field lists)"
```

---

### Task 4: Solar card renders from the registry, with conditional visibility

**Files:**
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts` (`SOLAR_FIELDS` `:83-97` → derived; `renderField` `:555`; `renderCard` `:641-648`; `refresh` `:463-468`)
- Test: `custom_components/oig_cloud/www_v2/src/__tests__/settings-solar-conditional.test.ts`

**This is the fix for the headline live gap.** Codex's testability verdict noted there is currently
**no** frontend test touching `SOLAR_FIELDS`/`solar_forecast_api_key` — so the defect is unguarded.
That ends here.

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/settings-solar-conditional.test.ts
import { describe, it, expect } from 'vitest';
import { fieldsFromRegistry, isVisible } from '@/data/registry-data';
import { REGISTRY_FIXTURE } from './fixtures/registry-fixture';  // trimmed real /config_registry body

describe('solar card — provider→key wiring (UX-AUDIT U1/U2)', () => {
  const defs = fieldsFromRegistry(REGISTRY_FIXTURE, 'solar');
  const keys = defs.map((d) => d.key);
  const visibleFor = (provider: string) =>
    defs.filter((d) => isVisible(d, (k) =>
      k === 'solar_forecast_provider' ? provider : undefined)).map((d) => d.key);

  it('exposes forecast.solar key + mode at all (U2 — they were absent from the form)', () => {
    expect(keys).toContain('solar_forecast_api_key');
    expect(keys).toContain('solar_forecast_mode');
  });

  it('shows ONLY forecast.solar credentials when provider=forecast_solar', () => {
    const shown = visibleFor('forecast_solar');
    expect(shown).toContain('solar_forecast_api_key');
    expect(shown).toContain('solar_forecast_mode');
    expect(shown).not.toContain('solcast_api_key');
    expect(shown).not.toContain('solcast_site_id');
  });

  it('shows ONLY Solcast credentials when provider=solcast', () => {
    const shown = visibleFor('solcast');
    expect(shown).toContain('solcast_api_key');
    expect(shown).toContain('solcast_site_id');
    expect(shown).not.toContain('solar_forecast_api_key');
    expect(shown).not.toContain('solar_forecast_mode');
  });

  it('provider select is always visible', () => {
    expect(visibleFor('solcast')).toContain('solar_forecast_provider');
  });
});
```

- [ ] **Step 2: Run — verify FAIL** (fixture + derivation absent)

- [ ] **Step 3: Make the cards registry-driven**

- Load the registry in `refresh()` (`:463-468`) alongside `loadModuleConfig()`:
  ```ts
  private async refresh(): Promise<void> {
    this.loading = true;
    const [config, registry] = await Promise.all([loadModuleConfig(), loadFieldRegistry()]);
    this.config = config;
    this.registry = registry;   // @state() private registry: FieldRegistry | null = null;
    this.pending = {};
    this.loading = false;
  }
  ```
- Replace the module-level `MODULE_FIELDS` (`:62-70`), `BATTERY_FIELDS` (`:72-81`) and `SOLAR_FIELDS`
  (`:83-97`) reads with a getter:
  ```ts
  private fieldsFor(section: SettingsSection): FieldDef[] {
    return this.registry ? fieldsFromRegistry(this.registry, section) : [];
  }
  ```
- In `renderCard` (`:641-648`), filter by the predicate before mapping — this is the U1 fix, and it
  reuses `current()` (`:470-475`), which already prefers pending over saved, so the reveal happens on
  the *pending* provider value the instant the select changes (`:580-583`):
  ```ts
        ${fields
          .filter((f) => isVisible(f, (k) => this.current(section, k)))
          .map((f) => this.renderField(section, f))}
  ```

> **Fallback (must not regress a live dashboard):** if `loadFieldRegistry()` returns `null` (old
> backend, 404 during a reload window — the case `waitForModuleConfigAfterReload` at
> `settings-data.ts:123` already exists for), the card must fall back to the current static lists rather
> than rendering an empty form. Keep them as the fallback source for one release and warn via `oigLog`
> (`core/logger.ts:19`) — note it is **not** currently imported into `settings/index.ts`, only into
> `settings-data.ts:10`, so add the import. Deleting the lists is **Plan 4's**
> (`_MODULE_CONFIG_FIELDS` carries the same "removed in Plan 4" marker).

- [ ] **Step 4: Run tests — PASS**

Run: `npm --prefix custom_components/oig_cloud/www_v2 run test:unit && npm --prefix custom_components/oig_cloud/www_v2 run typecheck && npm --prefix custom_components/oig_cloud/www_v2 run lint`

- [ ] **Step 5: Commit**

```bash
git add custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts custom_components/oig_cloud/www_v2/src/__tests__/settings-solar-conditional.test.ts custom_components/oig_cloud/www_v2/src/__tests__/fixtures/registry-fixture.ts
git commit -m "fix(settings): provider-conditional solar fields driven by the registry (U1/U2/U7)"
```

---

### Task 5: Readable dropdowns (U4) + masked secrets (U5)

**Files:**
- Modify: `custom_components/oig_cloud/www_v2/src/ui/theme.ts` (`DARK_THEME` `:31-44`, `LIGHT_THEME` `:46-59`, `applyTheme` `:95-108`)
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts` (CSS `:289-299`; text/secret renderer `:626-638`)
- Test: `custom_components/oig_cloud/www_v2/src/__tests__/settings-theme-secrets.test.ts`

The second confirmed live gap. **Verified root cause:** the CSS at `:289-299` styles the *closed*
`<select>` box only; the option **popover is painted by the OS/browser**, no `option{}` rule exists
anywhere, and `applyTheme` (`:95-108`) exports every CSS var but **never `color-scheme`** — the page
only declares a static `<meta name="color-scheme" content="light dark">` (`index.html:6`). On HA-dark
over an OS-light host the browser paints the option list light/transparent over a dark card.

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/settings-theme-secrets.test.ts
import { describe, it, expect } from 'vitest';
import { DARK_THEME, LIGHT_THEME, applyTheme } from '@/ui/theme';
import { OigSettings } from '@/ui/features/settings';

describe('U4 — dropdown readability', () => {
  it('each theme declares an explicit color-scheme', () => {
    expect(DARK_THEME['color-scheme']).toBe('dark');
    expect(LIGHT_THEME['color-scheme']).toBe('light');
  });

  it('applyTheme exports color-scheme to the document root', () => {
    applyTheme(true);
    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('dark');
    applyTheme(false);
    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('light');
  });

  it('settings CSS gives select options a solid themed background', () => {
    const css = (OigSettings as any).styles.cssText as string;
    expect(css).toMatch(/select option\s*{/);
    expect(css).toMatch(/select option[^}]*background/);
  });
});

describe('U5 — secrets are masked', () => {
  it('secret fields render as a password input, driven by the registry flag', () => {
    const css = (OigSettings as any).styles.cssText as string;
    expect(css).toBeDefined();
    // behavioural assertion lives in the render test below
  });
});
```

- [ ] **Step 2: Run — verify FAIL** (`color-scheme` undefined; no `select option` rule)

- [ ] **Step 3: Implement both layers**

1. **`theme.ts`** — one line per theme; `applyTheme`'s existing loop (`:99-101`) exports it via
   `root.style.setProperty`, which works for standard properties, not just custom ones:
   ```ts
   export const DARK_THEME: Record<string, string> = {
     'color-scheme': 'dark',        // U4: native controls (option popovers) follow the app theme
     '--primary-background-color': '#111936',
     // …
   };
   export const LIGHT_THEME: Record<string, string> = {
     'color-scheme': 'light',
     // …
   };
   ```
2. **`settings/index.ts` CSS** (after `:299`) — the cross-renderer belt-and-braces layer, because some
   Linux/WebView renderers ignore `color-scheme` for option lists:
   ```ts
       select option {
         background: ${u(CSS_VARS.bgSecondary)};
         color: ${u(CSS_VARS.textPrimary)};
       }
   ```
3. **Secrets** (`:626-638`) — drive off the registry flag, not the name sniff at `:627`
   (`f.key.endsWith('api_key')` would miss any future secret whose name does not end that way, exactly
   as codex flagged). Keep the "blank = keep current" semantics the POST relies on (`:1258-1259`) and
   the existing placeholder copy (`:635`):
   ```ts
       const isSecret = f.secret ?? f.key.endsWith('api_key');   // registry first, sniff as fallback
       // …
           <input type=${isSecret ? 'password' : 'text'} autocomplete=${isSecret ? 'off' : nothing}
             class=${dirty ? 'dirty' : ''} .value=${val}
   ```

- [ ] **Step 4: Run tests — PASS**

Run: `npm --prefix custom_components/oig_cloud/www_v2 run test:unit && npm --prefix custom_components/oig_cloud/www_v2 run typecheck`

- [ ] **Step 5: Commit**

```bash
git add custom_components/oig_cloud/www_v2/src/ui/theme.ts custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts custom_components/oig_cloud/www_v2/src/__tests__/settings-theme-secrets.test.ts
git commit -m "fix(settings): solid themed dropdowns via color-scheme + option CSS; mask secrets (U4/U5)"
```

---

### Task 6: `ai/key_store.py` — the key lives in `.storage`, never in options, never in logs

**Files:**
- Create: `custom_components/oig_cloud/ai/__init__.py`, `custom_components/oig_cloud/ai/key_store.py`
- Test: `tests/test_ai_key_store.py`

DECISIONS P2 + SCOPE-REVISION #9. **No `ai_task` import** → runs on the current CI harness.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_ai_key_store.py
"""P2: the AI key lives in .storage — never in options, never in a log line."""
from __future__ import annotations

import logging
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from custom_components.oig_cloud.ai.key_store import AiKeyStore, redact_key

_SECRET = "gsk_ThisIsARealLookingSecretKey0123456789"


class _MemStore:
    """Stand-in for homeassistant.helpers.storage.Store."""
    def __init__(self, *_a, **_kw):
        self.saved = None

    async def async_load(self):
        return self.saved

    async def async_save(self, data):
        self.saved = data


@pytest.fixture
def store(monkeypatch):
    monkeypatch.setattr("custom_components.oig_cloud.ai.key_store.Store", _MemStore)
    return AiKeyStore(SimpleNamespace(), "entry1")


@pytest.mark.parametrize("raw,expected", [
    ("gsk_abcdefghijklmnop", "gsk_…mnop"),
    ("nvapi-abcdefghijklmnop", "nvapi-…mnop"),
    ("short", "…"),
    ("", "…"),
    (None, "…"),
])
def test_redact_key_never_reveals_the_secret(raw, expected):
    assert redact_key(raw) == expected


@pytest.mark.asyncio
async def test_round_trip_key_and_provider(store):
    await store.async_set_key("groq", _SECRET)
    assert await store.async_get_key() == _SECRET
    assert (await store.async_get_provider()) == "groq"


@pytest.mark.asyncio
async def test_api_state_never_exposes_the_key(store):
    """REST may only ever learn {provider, key_set, verified} (F1-DESIGN §3)."""
    await store.async_set_key("nvidia", _SECRET)
    state = await store.async_api_state()
    assert state == {"provider": "nvidia", "key_set": True, "verified": False}
    assert _SECRET not in str(state)


@pytest.mark.asyncio
async def test_key_never_reaches_config_entry_options(store):
    """The bug class this whole design exists to avoid."""
    entry = SimpleNamespace(entry_id="entry1", options={"charge_rate_kw": 2.8})
    hass = SimpleNamespace(config_entries=SimpleNamespace(async_update_entry=MagicMock()))
    await store.async_set_key("groq", _SECRET)
    # storing a key must not touch the entry at all
    hass.config_entries.async_update_entry.assert_not_called()
    assert _SECRET not in str(entry.options)


@pytest.mark.asyncio
async def test_setting_a_key_logs_only_a_redacted_fingerprint(store, caplog):
    with caplog.at_level(logging.DEBUG):
        await store.async_set_key("groq", _SECRET)
    assert _SECRET not in caplog.text
    assert "gsk_…6789" in caplog.text
```

- [ ] **Step 2: Run — verify FAIL** (`ModuleNotFoundError: ...ai.key_store`)

- [ ] **Step 3: Implement**

```python
# custom_components/oig_cloud/ai/key_store.py
"""AI provider key storage (F1 DECISIONS P2, SCOPE-REVISION #9).

The key lives in `.storage/oig_cloud.ai_<entry_id>` and NOWHERE else:
never in config-entry options (which are in the diagnostics export and were
historically full-replaced), and never in a log line — only a redacted
fingerprint. The REST surface may only ever learn {provider, key_set, verified}.
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional

from homeassistant.helpers.storage import Store

_LOGGER = logging.getLogger(__name__)

STORAGE_VERSION = 1


def redact_key(raw: Optional[str]) -> str:
    """Fingerprint for logs: keep the provider prefix + last 4 chars only."""
    if not raw or len(raw) < 8:
        return "…"
    prefix, _, _ = raw.partition("_")
    if raw.startswith("nvapi-"):
        prefix = "nvapi-"
        return f"{prefix}…{raw[-4:]}"
    return f"{prefix}_…{raw[-4:]}" if _ else f"…{raw[-4:]}"


class AiKeyStore:
    """Per-entry AI credential store."""

    def __init__(self, hass: Any, entry_id: str) -> None:
        self._store = Store(hass, STORAGE_VERSION, f"oig_cloud.ai_{entry_id}", private=True)
        self._data: Optional[Dict[str, Any]] = None

    async def _async_data(self) -> Dict[str, Any]:
        if self._data is None:
            self._data = (await self._store.async_load()) or {}
        return self._data

    async def async_set_key(self, provider: str, api_key: str) -> None:
        data = await self._async_data()
        data.update({"provider": provider, "api_key": api_key, "verified_at": None})
        await self._store.async_save(data)
        _LOGGER.debug("AI key stored for provider %s (%s)", provider, redact_key(api_key))

    async def async_get_key(self) -> Optional[str]:
        return (await self._async_data()).get("api_key")

    async def async_get_provider(self) -> Optional[str]:
        return (await self._async_data()).get("provider")

    async def async_mark_verified(self, verified_at: str) -> None:
        data = await self._async_data()
        data["verified_at"] = verified_at
        await self._store.async_save(data)

    async def async_api_state(self) -> Dict[str, Any]:
        """The ONLY shape the REST layer may return."""
        data = await self._async_data()
        return {
            "provider": data.get("provider"),
            "key_set": bool(data.get("api_key")),
            "verified": bool(data.get("verified_at")),
        }
```

Note `redact_key` must satisfy the parametrised cases above — write it to the test, not from memory.

- [ ] **Step 4: Run — PASS**

Run: `PYTHONPATH=$PWD /repos/oig-cloud/.venv/bin/python -m pytest -q tests/test_ai_key_store.py`

- [ ] **Step 5: Lint + commit**

```bash
/repos/oig-cloud/.venv/bin/python -m flake8 --max-line-length=120 custom_components/oig_cloud/ai tests/test_ai_key_store.py
git add custom_components/oig_cloud/ai/__init__.py custom_components/oig_cloud/ai/key_store.py tests/test_ai_key_store.py
git commit -m "feat(ai): key_store — provider key in .storage, redacted in logs, never in options (P2)"
```

---

### Task 7: `ai/backends.py` — `OpenAiCompatBackend` (Groq / NVIDIA) + prompt anonymity

**Files:**
- Create: `custom_components/oig_cloud/ai/backends.py`
- Test: `tests/test_ai_backends.py`

SCOPE-REVISION #9: OIG calls the provider **directly** with the user's key. **No `ai_task` import** —
this module is the whole AI capability and it is testable on the current harness.

> **Prompt anonymity is an ALLOW-LIST (K2b) — do not implement it as a deny-list.** A deny-list of
> identifying keys (`{"latitude","longitude","box_id","email",…}`) that interpolates everything else is
> an allow-list's name on a deny-list's semantics: it is correct only for the fields its author happened
> to think of. Add `phone`, `installation_name` or `customer_id` to the codebase a year from now and it
> ships them to Groq, while a test asserting on a handful of hard-coded PII strings stays green. The
> allow-list inverts the default: unknown ⇒ dropped. `test_an_unknown_field_is_DROPPED_not_sent` is the
> test that distinguishes the two, and it is the reason the assertion is on the **set of keys in the
> prompt body**, not on a list of forbidden substrings.

> **Base URLs — NOT verifiable from this repo (see "Could not establish").** They are `Field`-backed
> config (SCOPE-REVISION #9 requires a config-flow `base_url` anyway), and the per-provider values below
> are **defaults to confirm against the providers' own docs at implementation time**, not facts this plan
> established.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_ai_backends.py
"""SCOPE-REVISION #9: OIG's own OpenAI-compatible backend. K2b: prompts carry no PII."""
from __future__ import annotations

import json

import pytest

from custom_components.oig_cloud.ai.backends import (
    PROMPT_ALLOWED_FIELDS,
    PROVIDERS,
    OpenAiCompatBackend,
    build_anonymous_prompt,
)


class _Resp:
    def __init__(self, status=200, payload=None):
        self.status = status
        self._payload = payload or {}

    async def json(self):
        return self._payload

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_):
        return False


class _Session:
    """Captures the outgoing request so tests can assert on the real body."""
    def __init__(self, resp):
        self._resp = resp
        self.calls = []

    def post(self, url, **kw):
        self.calls.append(("POST", url, kw))
        return self._resp

    def get(self, url, **kw):
        self.calls.append(("GET", url, kw))
        return self._resp


def _backend(session, provider="groq", key="gsk_secret0000000000"):
    return OpenAiCompatBackend(
        session=session, base_url=PROVIDERS[provider]["base_url"],
        api_key=key, model="test-model",
    )


def test_providers_are_co_equal_with_no_recommended_default():
    """SCOPE-REVISION #8: Groq restricted a legitimate account — no hard default."""
    assert set(PROVIDERS) == {"groq", "nvidia"}
    for spec in PROVIDERS.values():
        assert "base_url" in spec and "key_prefix" in spec
        assert "recommended" not in spec and "default" not in spec


def test_key_prefixes_match_scope_revision_7():
    assert PROVIDERS["groq"]["key_prefix"] == "gsk_"
    assert PROVIDERS["nvidia"]["key_prefix"] == "nvapi-"


@pytest.mark.asyncio
async def test_generate_data_sends_key_as_bearer_and_returns_parsed_json():
    resp = _Resp(200, {"choices": [{"message": {"content": '{"ok": true}'}}]})
    session = _Session(resp)
    out = await _backend(session).async_generate_data("instructions", {"type": "object"})
    assert out == {"ok": True}
    _, _, kw = session.calls[0]
    assert kw["headers"]["Authorization"] == "Bearer gsk_secret0000000000"


@pytest.mark.asyncio
async def test_invalid_json_from_model_raises_not_returns_garbage():
    resp = _Resp(200, {"choices": [{"message": {"content": "I am not JSON"}}]})
    with pytest.raises(ValueError):
        await _backend(_Session(resp)).async_generate_data("i", {"type": "object"})


@pytest.mark.asyncio
async def test_http_error_is_surfaced_as_a_soft_failure():
    with pytest.raises(RuntimeError):
        await _backend(_Session(_Resp(401, {}))).async_generate_data("i", {"type": "object"})


@pytest.mark.asyncio
async def test_verify_key_probes_models_endpoint():
    session = _Session(_Resp(200, {"data": [{"id": "test-model"}]}))
    assert await _backend(session).async_verify_key() is True
    method, url, _ = session.calls[0]
    assert method == "GET" and url.endswith("/models")


# --- K2b: anonymity is an ALLOW-LIST, asserted against the OUTGOING BODY ------

_INSTALL = {
    "latitude": 50.1219800, "longitude": 13.9373742,
    "box_id": "2206237016", "email": "martin@example.com",
    "entity_id": "sensor.oig_2206237016_batt_batt_comp_p",
    "kwp": 5.4, "capacity_kwh": 15.36, "declination": 10, "azimuth": 138,
}


def _prompt_keys(prompt: str) -> set:
    """The keys actually interpolated into the prompt body."""
    return {
        line.split("=", 1)[0]
        for line in prompt.splitlines()
        if "=" in line and not line.startswith("task=")
    }


def test_every_key_in_the_prompt_is_on_the_allow_list():
    """K2b, the STRUCTURAL assertion: the prompt cannot contain a key nobody
    approved. A denylist would pass a hard-coded-PII test while leaking any
    field added later; this cannot."""
    prompt = build_anonymous_prompt("validate_config", _INSTALL)
    assert _prompt_keys(prompt) <= PROMPT_ALLOWED_FIELDS
    assert _prompt_keys(prompt)  # …and it is not vacuously empty


def test_an_unknown_field_is_DROPPED_not_sent():
    """The regression a denylist cannot catch: a field invented after this code
    was written. 'phone' is on no denylist anywhere — it must still not ship."""
    leaky = dict(_INSTALL, phone="+420777123456",
                 installation_name="Chata Krkonose", customer_id="CUST-99")
    prompt = build_anonymous_prompt("validate_config", leaky)
    assert _prompt_keys(prompt) <= PROMPT_ALLOWED_FIELDS
    for leaked in ("phone", "installation_name", "customer_id",
                   "+420777123456", "Chata Krkonose", "CUST-99"):
        assert leaked not in prompt


def test_the_allow_list_itself_carries_nothing_identifying():
    """Guards the allow-list against a careless future addition."""
    for banned in ("latitude", "longitude", "box_id", "email", "entity_id",
                   "name", "address", "phone", "customer_id"):
        assert banned not in PROMPT_ALLOWED_FIELDS


def test_anonymous_prompt_keeps_the_numbers_and_drops_the_identity():
    prompt = build_anonymous_prompt("validate_config", _INSTALL)
    # the ratios the task actually needs survive…
    assert "5.4" in prompt and "15.36" in prompt
    # …every identifying value is gone (K2b: real values from the fixture)
    for pii in ("50.1219800", "13.9373742", "50.12198", "2206237016",
                "martin@example.com", "sensor.oig_"):
        assert pii not in prompt


@pytest.mark.asyncio
async def test_no_pii_reaches_the_wire():
    """Assert on the REAL request body — F1-DESIGN §10 / codex 'anonymity' finding.

    Structural, not a PII spot-check: every key on the wire is allow-listed.
    """
    resp = _Resp(200, {"choices": [{"message": {"content": "{}"}}]})
    session = _Session(resp)
    leaky = dict(_INSTALL, phone="+420777123456", customer_id="CUST-99")
    prompt = build_anonymous_prompt("validate_config", leaky)
    await _backend(session).async_generate_data(prompt, {"type": "object"})
    _, _, kw = session.calls[0]
    body = json.dumps(kw["json"])

    sent = kw["json"]["messages"][0]["content"]
    assert _prompt_keys(sent) <= PROMPT_ALLOWED_FIELDS

    for pii in ("50.1219800", "13.9373742", "2206237016", "martin@example.com",
                "sensor.oig_", "+420777123456", "CUST-99"):
        assert pii not in body
```

- [ ] **Step 2: Run — verify FAIL** (`ModuleNotFoundError: ...ai.backends`)

- [ ] **Step 3: Implement**

```python
# custom_components/oig_cloud/ai/backends.py
"""OIG's own OpenAI-compatible AI backend (SCOPE-REVISION #9).

Calls Groq / NVIDIA DIRECTLY with the user's key. No HACS plugin, no
homeassistant.components.ai_task import — this module must stay importable and
testable on any HA version (the dev harness is currently 2025.1.4, which has no
ai_task at all).

PRIVACY (DECISIONS K2b, O2 — binding): prompts carry ONLY anonymous numbers,
enforced by an ALLOW-LIST (PROMPT_ALLOWED_FIELDS). A field that is not explicitly
allowed is not sent — no coordinates, box id, e-mail, entity id, or any future
field somebody forgot to think about.
"""
from __future__ import annotations

import json
import logging
from typing import Any, Dict, Mapping

_LOGGER = logging.getLogger(__name__)

DEFAULT_TIMEOUT_S = 30

# Provider is a CO-EQUAL choice (SCOPE-REVISION #8). Deliberately NO "recommended"
# and NO ordering semantics: Groq restricted even a legitimate account, so a hard
# default is fragile. base_url is overridable from the config flow.
PROVIDERS: Dict[str, Dict[str, str]] = {
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",   # CONFIRM against provider docs
        "key_prefix": "gsk_",
    },
    "nvidia": {
        "base_url": "https://integrate.api.nvidia.com/v1",  # CONFIRM against provider docs
        "key_prefix": "nvapi-",
    },
}

# The ONLY keys that may ever be interpolated into a prompt (K2b, binding).
#
# This is an ALLOW-LIST and the distinction is the whole point. A deny-list of
# identifying fields leaks by omission: every field added to the codebase after
# this line was written ships to a third-party LLM until somebody remembers to
# deny it. Here, a new field is dropped until somebody deliberately allows it —
# the failure mode is a missing number in a prompt, not a customer's phone number
# on Groq's servers.
#
# Membership rule: an anonymous SCALAR that a task's numeric reasoning needs, and
# which cannot identify an installation on its own or in combination. Nothing
# spatial (SCOPE-REVISION #5: "validate_config … BEZ lokace"), nothing naming,
# nothing that is an id.
PROMPT_ALLOWED_FIELDS = frozenset({
    # solar geometry — shape of the array, not where it is
    "kwp", "declination", "azimuth",
    # battery sizing + planner ratios
    "capacity_kwh", "battery_comfort_soc_percent", "auto_mode_switch_enabled",
    "balancing_enabled", "balancing_interval_days", "balancing_hold_hours",
    "cheap_window_percentile", "expensive_percentile", "charge_rate_kw",
})


def build_anonymous_prompt(task: str, install: Mapping[str, Any]) -> str:
    """Render a task prompt from allow-listed anonymous numbers only.

    Anything not in PROMPT_ALLOWED_FIELDS is DROPPED — silently and by default.
    Adding a field to a prompt is therefore a deliberate, reviewable act.
    """
    safe = {k: v for k, v in install.items() if k in PROMPT_ALLOWED_FIELDS}
    dropped = sorted(set(install) - set(safe))
    if dropped:
        # Names only — a dropped field's VALUE is exactly what must not be logged.
        _LOGGER.debug("Prompt %s: dropped non-allow-listed fields %s", task, dropped)
    lines = [f"{k}={v}" for k, v in sorted(safe.items())]
    return f"task={task}\n" + "\n".join(lines)


class OpenAiCompatBackend:
    """Minimal OpenAI-compatible client (chat/completions + models probe)."""

    def __init__(self, session: Any, base_url: str, api_key: str, model: str) -> None:
        self._session = session
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._model = model

    @property
    def _headers(self) -> Dict[str, str]:
        return {"Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json"}

    async def async_verify_key(self) -> bool:
        async with self._session.get(
            f"{self._base_url}/models", headers=self._headers,
            timeout=DEFAULT_TIMEOUT_S,
        ) as resp:
            return resp.status == 200

    async def async_generate_data(self, instructions: str, schema: Dict[str, Any]) -> Any:
        payload = {
            "model": self._model,
            "messages": [{"role": "user", "content": instructions}],
            "response_format": {"type": "json_object"},
            "temperature": 0,
        }
        async with self._session.post(
            f"{self._base_url}/chat/completions", headers=self._headers,
            json=payload, timeout=DEFAULT_TIMEOUT_S,
        ) as resp:
            if resp.status != 200:
                raise RuntimeError(f"AI backend HTTP {resp.status}")
            body = await resp.json()
        content = body["choices"][0]["message"]["content"]
        try:
            return json.loads(content)
        except (TypeError, ValueError) as err:
            raise ValueError("AI backend returned non-JSON content") from err
```

> `schema` is accepted now and enforced at the call site; wiring it into the provider's structured
> output (`response_format: json_schema`) is a follow-up, not this plan's small surface.

- [ ] **Step 4: Run — PASS**

Run: `PYTHONPATH=$PWD /repos/oig-cloud/.venv/bin/python -m pytest -q tests/test_ai_backends.py tests/test_ai_key_store.py`

- [ ] **Step 5: Lint + commit**

```bash
git add custom_components/oig_cloud/ai/backends.py tests/test_ai_backends.py
git commit -m "feat(ai): OpenAiCompatBackend for Groq/NVIDIA (co-equal), anonymous prompts (SCOPE-REVISION #8/#9, K2b)"
```

---

### Task 8: Config-flow AI step — provider + `base_url` + key (co-equal, optional)

**Files:**
- Modify: `custom_components/oig_cloud/config/steps.py` (options-flow step; register alongside existing steps — grep `async_step_` for the menu wiring)
- Modify: `custom_components/oig_cloud/config_registry.py` (new `ai` section: `ai_provider`, `ai_base_url`, `ai_model` — **NOT the key**)
- Modify: `custom_components/oig_cloud/strings.json`, `translations/cs.json`, `translations/en.json`
- Test: `tests/test_ai_config_flow.py`

**The key is NOT a registry field and NOT an options key** — it goes to `AiKeyStore` (Task 6). Only
non-secret provider selection lives in options.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_ai_config_flow.py
"""SCOPE-REVISION #8/#9: provider is a co-equal choice; the key never lands in options."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from custom_components.oig_cloud.config.steps import OigCloudOptionsFlowHandler
from custom_components.oig_cloud.config_registry import FIELD_REGISTRY, fields_for_section


def test_ai_section_exists_and_holds_no_secret():
    ai = fields_for_section("ai")
    assert {"ai_provider", "ai_base_url", "ai_model"} <= set(ai)
    assert all(not f.secret for f in ai.values()), "the AI key must live in .storage, not options"
    assert "ai_api_key" not in FIELD_REGISTRY


def test_provider_enum_is_co_equal_and_unset_by_default():
    """No hard default (SCOPE-REVISION #8) and AI is optional (#5)."""
    provider = FIELD_REGISTRY["ai_provider"]
    assert set(provider.enum) == {"ai_task", "groq", "nvidia"}
    assert provider.default in ("", None), "no provider may be pre-selected"


def test_ai_is_optional_everywhere():
    """#5: AI is never a condition for the dashboard."""
    for key in ("ai_provider", "ai_base_url", "ai_model"):
        assert FIELD_REGISTRY[key].optional is True


_SECRET = "gsk_ThisIsARealLookingSecretKey0123456789"


class _SpyKeyStore:
    """Captures what the flow step routes out of band."""

    instances = []

    def __init__(self, hass, entry_id):
        self.entry_id = entry_id
        self.calls = []
        _SpyKeyStore.instances.append(self)

    async def async_set_key(self, provider, api_key):
        self.calls.append((provider, api_key))


@pytest.fixture
def spy_key_store(monkeypatch):
    _SpyKeyStore.instances = []
    monkeypatch.setattr(
        "custom_components.oig_cloud.config.steps.AiKeyStore", _SpyKeyStore)
    return _SpyKeyStore


@pytest.mark.asyncio
async def test_ai_step_stores_key_out_of_band(spy_key_store):
    """Submitting the AI step must write the key to AiKeyStore, never to options.

    Arrange the options flow exactly as the neighbouring tests in
    tests/test_config_options_flow.py do — copy their entry/hass fixture setup.
    """
    entry = SimpleNamespace(entry_id="e1", options={"charge_rate_kw": 2.8}, data={})
    hass = SimpleNamespace(
        config_entries=SimpleNamespace(async_update_entry=MagicMock()))

    flow = OigCloudOptionsFlowHandler(entry)
    flow.hass = hass

    result = await flow.async_step_ai(
        {"ai_provider": "groq", "ai_base_url": "", "ai_model": "",
         "ai_api_key": _SECRET})

    # 1. the key went to .storage, exactly once
    store = spy_key_store.instances[-1]
    assert store.calls == [("groq", _SECRET)]

    # 2. …and NOWHERE near the entry options
    _, kw = hass.config_entries.async_update_entry.call_args
    options = kw["options"]
    assert options["ai_provider"] == "groq"
    assert "ai_api_key" not in options
    assert _SECRET not in str(options)
    assert "gsk_" not in str(options)

    # 3. the step completes — AI is optional, never a wall (#5)
    assert result["type"] in ("create_entry", "form")


@pytest.mark.asyncio
async def test_ai_step_with_no_key_is_a_valid_submission(spy_key_store):
    """#5: a user may configure a provider later, or never. Submitting the step
    blank must not error and must not write an empty key over a stored one."""
    entry = SimpleNamespace(entry_id="e1", options={}, data={})
    hass = SimpleNamespace(
        config_entries=SimpleNamespace(async_update_entry=MagicMock()))
    flow = OigCloudOptionsFlowHandler(entry)
    flow.hass = hass

    await flow.async_step_ai(
        {"ai_provider": "", "ai_base_url": "", "ai_model": "", "ai_api_key": ""})

    assert all(not s.calls for s in spy_key_store.instances)
```

> **`OigCloudOptionsFlowHandler` is verified** — `config/steps.py:3378`, `class OigCloudOptionsFlowHandler(WizardMixin,
> config_entries.OptionsFlow)`; the config flow proper is `ConfigFlow` at `:3105`. **`async_step_ai` is the name
> this plan proposes, not an existing one** — grep the file's `async_step_*` convention and the menu wiring
> before writing it. The three assertions (key to the store, key not in options, step optional) are what must
> survive whatever the step ends up being called.

- [ ] **Step 2: Run — verify FAIL** (`fields_for_section("ai")` is empty)

- [ ] **Step 3: Implement**

Register the `ai` section in `config_registry.py` (append after the boiler block, `:219`):

```python
# --- section: ai ------------------------------------------------------------
# SCOPE-REVISION #8: co-equal choice, NO hard default, NO "recommended".
# SCOPE-REVISION #9: OIG supplies its own backend; base_url is user-overridable.
# The API KEY IS DELIBERATELY ABSENT — it belongs to AiKeyStore (.storage), P2.
_register(
    Field("ai_provider", "ai", str, default="", optional=True,
          enum=("ai_task", "groq", "nvidia")),
    Field("ai_base_url", "ai", str, default="", optional=True),
    Field("ai_model", "ai", str, default="", optional=True),
)
```

> Adding a 5th section means `ha_rest_api.py:1214`'s hard-coded tuple
> `("modules", "battery", "solar", "boiler")` will **not** expose it. Leave that tuple alone here —
> Plan 2 is already refactoring that GET, and `ai` state is served by its own endpoint (Task 10) which
> returns `{provider, key_set, verified}` and never the key. **Add a test asserting the `ai` section is
> NOT in the `module_config` GET body**, so the key/provider surface can't drift into it by accident.

In the flow step: take `ai_api_key` from `user_input`, `pop` it before building the options payload,
and hand it to `AiKeyStore.async_set_key(provider, key)`. The step is reachable from the menu but
**never required to finish setup** (#5).

- [ ] **Step 4: Run — PASS**

Run: `PYTHONPATH=$PWD /repos/oig-cloud/.venv/bin/python -m pytest -q tests/test_ai_config_flow.py tests/test_config_options_flow.py tests/test_config_registry.py`

- [ ] **Step 5: Lint + commit**

```bash
git add custom_components/oig_cloud/config_registry.py custom_components/oig_cloud/config/steps.py custom_components/oig_cloud/strings.json custom_components/oig_cloud/translations/cs.json custom_components/oig_cloud/translations/en.json tests/test_ai_config_flow.py
git commit -m "feat(ai): config-flow provider/base_url/model (co-equal, optional); key routed to .storage"
```

---

### Task 9: OIG's own `AITaskEntity` (guarded) + raise the dev/CI harness

**Files:**
- Create: `custom_components/oig_cloud/ai_task.py` (HA platform module — name is fixed by HA)
- Modify: `custom_components/oig_cloud/__init__.py` (`PLATFORMS` `:63`; forward at `:1650`)
- Modify: `requirements-dev.in` (`:5`), `requirements-dev.txt`, `hacs.json`
- Test: `tests/test_ai_task_entity.py`

**Read the Task-0 finding first:** the dev/CI harness is **HA 2025.1.4** and has **no `ai_task`**. This
task is where that is confronted.

- [ ] **Step 1: Write the failing tests (skip-guarded)**

```python
# tests/test_ai_task_entity.py
"""SCOPE-REVISION #9: OIG supplies its OWN AITaskEntity — no HACS plugin."""
from __future__ import annotations

from types import SimpleNamespace

import pytest

ai_task = pytest.importorskip(
    "homeassistant.components.ai_task",
    reason="HA in this env predates ai_task (2025.7+); see Plan 3 Task 9",
)


def test_entity_declares_generate_data_feature():
    from custom_components.oig_cloud.ai_task import OigAiTaskEntity
    assert ai_task.AITaskEntityFeature.GENERATE_DATA in OigAiTaskEntity._attr_supported_features


def test_entity_implements_the_generate_data_hook():
    from custom_components.oig_cloud.ai_task import OigAiTaskEntity
    assert hasattr(OigAiTaskEntity, "_async_generate_data")


class _StubBackend:
    """Records whether the OIG backend was called, and with what."""

    def __init__(self, result=None):
        self.result = result if result is not None else {"ok": True}
        self.calls = []

    async def async_generate_data(self, instructions, structure):
        self.calls.append((instructions, structure))
        return self.result


def _entity(provider, backend):
    """An OigAiTaskEntity with its collaborators injected, no HA plumbing."""
    from custom_components.oig_cloud.ai_task import OigAiTaskEntity

    ent = OigAiTaskEntity.__new__(OigAiTaskEntity)   # bypass HA entity __init__
    ent._provider = provider
    ent._backend = backend
    return ent


def _task(instructions="validate", structure=None):
    return SimpleNamespace(
        instructions=instructions, structure=structure or {"type": "object"})


def _chat_log():
    return SimpleNamespace(conversation_id="conv-1")


@pytest.mark.asyncio
@pytest.mark.parametrize("provider", ["groq", "nvidia"])
async def test_generate_data_delegates_to_the_openai_compat_backend(provider):
    """The entity is a thin adapter: all real work is in ai/backends.py."""
    backend = _StubBackend({"ok": True})
    result = await _entity(provider, backend)._async_generate_data(
        _task("validate", {"type": "object"}), _chat_log())

    assert backend.calls == [("validate", {"type": "object"})]
    assert result.data == {"ok": True}
    assert result.conversation_id == "conv-1"


@pytest.mark.asyncio
async def test_ai_task_provider_does_NOT_call_the_oig_backend(monkeypatch):
    """M4 / SCOPE-REVISION #8: the three providers are CO-EQUAL. A user who
    picked 'use the AI already in my HA' must not have their prompts shipped to
    Groq — the branch that prevents it is the whole point of this test."""
    backend = _StubBackend({"ok": "from-groq"})
    ent = _entity("ai_task", backend)

    delegated = []

    async def _fake_delegate(task):
        delegated.append(task.instructions)
        return {"ok": "from-host"}

    monkeypatch.setattr(ent, "_async_delegate_to_host_ai_task", _fake_delegate)

    result = await ent._async_generate_data(_task("validate"), _chat_log())

    assert backend.calls == [], "OIG backend called for provider=ai_task"
    assert delegated == ["validate"]
    assert result.data == {"ok": "from-host"}
```

> `_entity()` bypasses `AITaskEntity.__init__` deliberately — this asserts the **dispatch decision**,
> which is the security-relevant behaviour, without standing up HA's entity platform. Once Task 9 Step 3 sub-step 1
> pins an `ai_task`-capable HA, add one integration-level test that goes through the real platform.

And guard tests that run on **every** harness, including today's:

```python
# tests/test_ai_optional.py
"""SCOPE-REVISION #5: AI is optional. These MUST pass on an HA with no ai_task."""
from __future__ import annotations

import builtins
import importlib
import inspect

import pytest


def test_integration_imports_without_ai_task(monkeypatch):
    """Importing the integration must not require ai_task — asserted by making
    the import genuinely fail, not by importing on a box that happens to have it.

    (`assert oig` after a successful import is vacuous: it can only fail by
    raising, and it passes trivially on any harness that HAS ai_task.)
    """
    real_import = builtins.__import__

    def _no_ai_task(name, *args, **kwargs):
        if name.startswith("homeassistant.components.ai_task"):
            raise ModuleNotFoundError(f"No module named {name!r}")
        return real_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", _no_ai_task)

    import custom_components.oig_cloud as oig
    importlib.reload(oig)

    assert oig.PLATFORMS, "setup must still declare its non-AI platforms"
    assert all("ai_task" not in str(p).lower() for p in oig.PLATFORMS), \
        "AI_TASK platform must not be forwarded on an HA without ai_task"


def test_ai_task_platform_is_added_only_when_the_constant_exists():
    """The guard at __init__.py:63 keys off hasattr(Platform, 'AI_TASK')."""
    from homeassistant.const import Platform

    import custom_components.oig_cloud as oig
    importlib.reload(oig)

    expected = hasattr(Platform, "AI_TASK")
    got = any("ai_task" in str(p).lower() for p in oig.PLATFORMS)
    assert got is expected


def test_ai_backend_module_has_no_ai_task_dependency():
    """The security-critical code must stay testable on any HA."""
    from custom_components.oig_cloud.ai import backends, key_store
    for mod in (backends, key_store):
        assert "ai_task" not in inspect.getsource(mod)
```

- [ ] **Step 2: Run — verify the skip is real**

Run: `PYTHONPATH=$PWD /repos/oig-cloud/.venv/bin/python -m pytest -q tests/test_ai_task_entity.py tests/test_ai_optional.py`
Expected **today**: `test_ai_task_entity.py` **skipped** (`ai_task` absent), `test_ai_optional.py` PASS.
That skip is the bug this task fixes — it is not an acceptable end state.

- [ ] **Step 3: Raise the harness, then implement the entity**

1. **Harness:** bump `pytest-homeassistant-custom-component` (`requirements-dev.in:5`) to a release
   whose pinned `homeassistant` is **≥ 2025.8** (`requirements-dev.txt:1075` currently pins
   `homeassistant==2025.1.4`), then recompile `requirements-dev.txt`. **The exact version is NOT
   established by this plan** — resolve it from the package index at implementation time and confirm
   with:
   ```bash
   /repos/oig-cloud/.venv/bin/python -c "import homeassistant.const as c; print(c.__version__)"
   /repos/oig-cloud/.venv/bin/python -c "import homeassistant.components.ai_task as t; print(t.AITaskEntityFeature.GENERATE_DATA)"
   ```
   Expect fallout: a jump of ~7 HA minor versions across a 261-file suite is its own risk. **If the
   bump reds the suite, STOP and report** — do not paper over it; the entity can ship skipped while the
   backend (Tasks 6–7) carries the feature.
2. **Declare the minimum HA** (K2c, codex MINOR): add `"homeassistant": "2025.8.0"` to `hacs.json`
   (currently the file has no such key — verified `a5ef87a74`).
   **Note:** HA's `manifest.json` schema has **no** minimum-HA-version key, so K2c's "manifest.json +
   hacs.json dostanou minimální verzi HA" is only half-implementable — `hacs.json` is the real
   mechanism. Record that rather than inventing a manifest field `hassfest` would reject.
   **Residual risk, and it is real:** the `hacs.json` minimum only binds HACS *at install/update time*.
   It does nothing for a user **already on** HA 2025.1 with the integration installed — for them the only
   protection is the "AI is optional" import guard (point 4 below, `test_ai_optional.py`). That guard is
   therefore load-bearing, not belt-and-braces: if it regresses, those users lose the whole integration,
   not just AI.
3. **Entity** — a thin adapter over Task 7:

```python
# custom_components/oig_cloud/ai_task.py
"""OIG's own AI Task entity (SCOPE-REVISION #9).

ai_task cannot be installed standalone, and no HACS plugin does AI Task +
custom endpoint reliably — so OIG ships the entity itself. This module is a
THIN adapter: the provider call lives in ai/backends.py, which imports nothing
from Home Assistant and is testable on any HA version.
"""
from __future__ import annotations

from homeassistant.components.ai_task import (
    AITaskEntity,
    AITaskEntityFeature,
    GenDataTask,
    GenDataTaskResult,
)
from homeassistant.components.conversation import ChatLog


class OigAiTaskEntity(AITaskEntity):
    """Generates structured data via the user's chosen provider.

    THREE co-equal providers (SCOPE-REVISION #8), and 'ai_task' is one of them:
    the user asked for the AI they already run in their own HA. Dispatch MUST
    branch on it — falling through to the OIG backend would send that user's
    prompts to Groq/NVIDIA, which is precisely the choice they declined.
    """

    _attr_supported_features = AITaskEntityFeature.GENERATE_DATA

    async def _async_generate_data(
        self, task: GenDataTask, chat_log: ChatLog
    ) -> GenDataTaskResult:
        if self._provider == "ai_task":
            # Delegate to the host HA's own AI Task entity. The OIG backend is
            # NOT constructed and NOT called on this path. See the note below —
            # the exact delegation call is NOT established by this plan.
            data = await self._async_delegate_to_host_ai_task(task)
        else:
            data = await self._backend.async_generate_data(
                task.instructions, task.structure)
        return GenDataTaskResult(conversation_id=chat_log.conversation_id, data=data)
```

> **The import names/signature above come from SCOPE-REVISION #9, not from code this plan could read**
> (`ai_task` is absent from the installed HA). **Confirm every symbol against the HA version you pin**
> before writing the implementation, and correct this task if they differ.

4. **The `ai_task` delegation path** — `_async_delegate_to_host_ai_task`, the branch that makes
   "co-equal" true. `ai_provider.enum` is `("ai_task", "groq", "nvidia")` (Task 8) and SCOPE-REVISION #8
   makes the three **co-equal**. `ai_task` means *"use the AI I already have configured in Home
   Assistant"* — SCOPE-REVISION #9 records that Martin's HA has the `ai_task` service but no LLM behind
   it, which is why the direct key is the *primary* path; that is **not** a reason to quietly substitute
   Groq for a user who chose `ai_task`.

   > **NOT ESTABLISHED — do not invent the call signature.** How an integration delegates a
   > `GenDataTask` to the *host's* AI Task entity (`ai_task.generate_data` service call vs. a helper vs.
   > resolving `entity_id=None` to the user's preferred entity, and what it returns) **cannot be
   > confirmed from this repo**: `ai_task` is absent at HA 2025.1.4 (see the Task-0 finding).
   > F1-DESIGN §2's "`has_service("ai_task","generate_data")`, `entity_id=None` → preferovaná entita
   > uživatele" (`F1-DESIGN.md:46-48`) is a *design note*, not a read API. Once sub-step 1 pins an
   > `ai_task`-capable HA, **read the real module and write the method against it.** If a custom
   > `AITaskEntity` turns out not to be able to delegate to another one cleanly, **stop and report** —
   > the honest fallback is to drop `"ai_task"` from `ai_provider.enum` and say so, not to route the
   > user to Groq behind their back. Either way the "co-equal" claim must be true in code, or withdrawn
   > from the doc. `test_ai_task_provider_does_NOT_call_the_oig_backend` (Step 1) is what holds this.

5. **Platform wiring** — `Platform.AI_TASK` does not exist on old HA either, so guard the constant, not
   just the import (`__init__.py:63`):
   ```python
   PLATFORMS = [Platform.SENSOR, Platform.SWITCH]
   if hasattr(Platform, "AI_TASK"):        # HA >= 2025.8; AI is optional (SCOPE-REVISION #5)
       PLATFORMS.append(Platform.AI_TASK)
   ```

- [ ] **Step 4: Run — PASS (un-skipped)**

Run: `PYTHONPATH=$PWD /repos/oig-cloud/.venv/bin/python -m pytest -q tests/test_ai_task_entity.py tests/test_ai_optional.py`

- [ ] **Step 5: Lint + commit**

```bash
git add custom_components/oig_cloud/ai_task.py custom_components/oig_cloud/__init__.py requirements-dev.in requirements-dev.txt hacs.json tests/test_ai_task_entity.py tests/test_ai_optional.py
git commit -m "feat(ai): OIG's own AITaskEntity (GENERATE_DATA); raise test harness to an ai_task-capable HA"
```

---

### Task 10: REST `/ai/state` + `/ai/verify_key` — admin only

**Files:**
- Modify: `custom_components/oig_cloud/api/ha_rest_api.py` (new view; register in the block at `:1333-1343`)
- Test: `tests/test_ai_rest.py`

Codex's CRITICAL #2 fix, applied where this plan actually owns the surface: **every new endpoint is
admin-gated and fails closed**, mirroring the POST gate at `:1228-1230` (GET `module_config`'s missing
gate is the separately-approved standalone fix in SCOPE-REVISION "DŮSLEDKY" — not this plan's).

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_ai_rest.py
"""Codex CRITICAL #2: every endpoint this plan ADDS is admin-gated and fails closed."""
from __future__ import annotations

import json
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.api import ha_rest_api as api_module

_SECRET = "gsk_ThisIsARealLookingSecretKey0123456789"


# --- arrangement: reuse tests/test_ha_rest_api_views.py's fixtures (:15-87) ---
# DummyRequest already sets hass_user admin=True at :17; DummyJsonRequest (:78-87)
# adds the json() payload. Import them rather than re-declaring a second set that
# can drift from the originals. `tests/` IS a package (tests/__init__.py exists,
# verified 2026-07-17) and the house convention is the absolute form — see
# tests/test_simulate_interval_new.py:18 `from tests.simulate_interval_standalone
# import …`.
from tests.test_ha_rest_api_views import (      # noqa: E402
    DummyConfigEntries,
    DummyEntry,
    DummyHass,
    DummyJsonRequest,
    DummyRequest,
)


class _MemStore:
    """Stand-in for AiKeyStore's Store — same pattern as tests/test_ai_key_store.py."""

    def __init__(self, *_a, **_kw):
        self.saved = None

    async def async_load(self):
        return self.saved

    async def async_save(self, data):
        self.saved = data


@pytest.fixture
def ai_env(monkeypatch):
    """One arranged (view, hass, entry) triple + the admin-request helpers."""
    entry = DummyEntry("e1", options={})
    hass = DummyHass(DummyConfigEntries([entry]))
    monkeypatch.setattr(api_module, "_find_entry_for_box", lambda h, b: entry)
    monkeypatch.setattr(
        "custom_components.oig_cloud.ai.key_store.Store", _MemStore)
    return SimpleNamespace(
        view=api_module.OIGCloudAiView(), hass=hass, entry=entry)


def admin_req(env):
    """A GET request from an admin."""
    return DummyRequest(env.hass)


def admin_req_with(env, payload):
    """A POST request from an admin carrying `payload`."""
    return DummyJsonRequest(env.hass, payload=payload)


def non_admin_req(env):
    req = DummyRequest(env.hass)
    req.app["hass_user"] = SimpleNamespace(is_admin=False)
    return req


# --- tests --------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ai_state_requires_admin(ai_env):
    """Fail closed: key presence/provider is not for every authenticated user."""
    resp = await ai_env.view.get(non_admin_req(ai_env), "box1")
    assert resp.status == 403


@pytest.mark.asyncio
async def test_ai_post_requires_admin(ai_env):
    """The write surface fails closed too — mirrors module_config POST (:1228-1230)."""
    req = admin_req_with(ai_env, {"provider": "groq", "api_key": _SECRET})
    req.app["hass_user"] = SimpleNamespace(is_admin=False)
    resp = await ai_env.view.post(req, "box1")
    assert resp.status == 403


@pytest.mark.asyncio
async def test_ai_state_never_returns_the_key(ai_env, monkeypatch):
    async def _fake_verify(self):
        return True

    monkeypatch.setattr(
        api_module.OpenAiCompatBackend, "async_verify_key", _fake_verify)

    await ai_env.view.post(
        admin_req_with(ai_env, {"provider": "groq", "api_key": _SECRET}), "box1")
    resp = await ai_env.view.get(admin_req(ai_env), "box1")

    body = json.loads(resp.text)
    assert set(body) == {"provider", "key_set", "verified"}
    assert body["provider"] == "groq" and body["key_set"] is True
    assert "api_key" not in resp.text
    assert _SECRET not in resp.text and "gsk_" not in resp.text


@pytest.mark.asyncio
async def test_verify_key_rejects_a_wrong_prefix_without_calling_out(ai_env, monkeypatch):
    """Cheap local check first — SCOPE-REVISION #7 documents the prefixes."""
    called = []

    async def _boom(self):
        called.append(1)
        return True

    monkeypatch.setattr(api_module.OpenAiCompatBackend, "async_verify_key", _boom)

    resp = await ai_env.view.post(
        admin_req_with(ai_env, {"provider": "groq", "api_key": "nvapi-x"}), "box1")

    assert resp.status == 400
    assert "prefix" in json.loads(resp.text)["error"]
    assert called == [], "a malformed key must not reach the provider"


@pytest.mark.asyncio
async def test_ai_key_never_lands_in_entry_options(ai_env, monkeypatch):
    """P2, at the REST boundary: the write path must not leak into options."""
    async def _ok(self):
        return True

    monkeypatch.setattr(api_module.OpenAiCompatBackend, "async_verify_key", _ok)

    await ai_env.view.post(
        admin_req_with(ai_env, {"provider": "groq", "api_key": _SECRET}), "box1")

    assert _SECRET not in str(ai_env.entry.options)
    assert "gsk_" not in str(ai_env.entry.options)
```

> **Do not copy the `Dummy*` classes into this file.** A second copy drifts from the original the first
> time one of them changes, and the copy is the one that keeps passing. `tests/__init__.py` and
> `tests/conftest.py` both exist (verified `a5ef87a74`), so the import above works as written. If the
> shared set grows past what an import can carry cleanly, promote them to `conftest.py` fixtures —
> never fork them.

- [ ] **Step 2: Run — verify FAIL** (no `OIGCloudAiView`)

- [ ] **Step 3: Implement** the view mirroring `OIGCloudConfigRegistryView`'s shape (`:1282-1297`) —
`url = f"{API_BASE}/{{box_id}}/ai"`, `requires_auth = True`, plus the explicit `is_admin` gate on
**both** `get` and `post`. `post` stores via `AiKeyStore` and probes with
`OpenAiCompatBackend.async_verify_key()` using `aiohttp_client.async_get_clientsession(hass)` (the
convention already used at `entities/chmu_sensor.py:199`). Register it in the block at `:1333-1343`
and add its line to the log summary at `:1345-1356`.

- [ ] **Step 4: Run — PASS.** `PYTHONPATH=$PWD /repos/oig-cloud/.venv/bin/python -m pytest -q tests/test_ai_rest.py tests/test_ha_rest_api_views.py`

- [ ] **Step 5: Commit**

```bash
git add custom_components/oig_cloud/api/ha_rest_api.py tests/test_ai_rest.py
git commit -m "feat(rest): admin-gated /ai state + key verification; never echoes the key"
```

---

### Task 11: Onboarding state — versioned store + REST (soft by construction)

**Files:**
- Create: `custom_components/oig_cloud/onboarding/__init__.py`, `custom_components/oig_cloud/onboarding/state.py`
- Modify: `custom_components/oig_cloud/api/ha_rest_api.py` (new view + registration `:1333-1343`)
- Test: `tests/test_onboarding_state.py`

K2f: versioned state (`schema_version` + timestamps + provider). **SCOPE-REVISION #6: there is no
`locked` concept and no endpoint may imply one.**

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_onboarding_state.py
"""SCOPE-REVISION #6: onboarding is a SOFT guide. Nothing here may lock a dashboard."""
from __future__ import annotations

import pytest

from custom_components.oig_cloud.onboarding.state import (
    SCHEMA_VERSION,
    OnboardingState,
    is_grandfathered,
)


@pytest.mark.asyncio
async def test_fresh_state_is_versioned_and_all_steps_pending(store):
    state = await store.async_get()
    assert state["schema_version"] == SCHEMA_VERSION
    assert state["steps"] == {"ai": "pending", "solar": "pending", "pricing": "pending"}


@pytest.mark.asyncio
async def test_state_carries_no_lock_or_gate_concept():
    """The K1 hard gate is DROPPED — the API must not even express it."""
    state = await store.async_get()
    for banned in ("locked", "gate", "dashboard_locked", "complete_required"):
        assert banned not in state


@pytest.mark.asyncio
async def test_completing_a_step_stamps_it(store):
    await store.async_complete_step("solar")
    state = await store.async_get()
    assert state["steps"]["solar"] == "done"
    assert state["timestamps"]["solar"]


@pytest.mark.asyncio
async def test_steps_are_independent_no_ordering_enforced(store):
    """A user may do ③ before ① — AI is optional (#5)."""
    await store.async_complete_step("pricing")
    state = await store.async_get()
    assert state["steps"]["pricing"] == "done"
    assert state["steps"]["ai"] == "pending"


def test_configured_entry_is_grandfathered_not_gated():
    """D11 as narrowed by #6: an existing user sees a banner, never a wall."""
    assert is_grandfathered({"solar_forecast_provider": "solcast",
                             "solcast_api_key": "k", "solcast_site_id": "s"}) is True
    assert is_grandfathered({}) is False
```

- [ ] **Step 2: Run — verify FAIL**

- [ ] **Step 3: Implement** `OnboardingState` over
`Store(hass, 1, f"oig_cloud.onboarding_{entry_id}", private=True)` (convention:
`battery_forecast/balancing/core.py:79-84`), holding
`{schema_version, steps: {ai, solar, pricing}, timestamps: {...}, provider}`. Add the REST view
(`GET`/`POST /api/oig_cloud/{box_id}/onboarding`, **admin-gated** like Task 10) and register it at
`:1333-1343`.

- [ ] **Step 4–5: Run, lint, commit**

```bash
git add custom_components/oig_cloud/onboarding tests/test_onboarding_state.py custom_components/oig_cloud/api/ha_rest_api.py
git commit -m "feat(onboarding): versioned soft-guide state + admin-gated REST (no gate concept — SCOPE-REVISION #6)"
```

---

### Task 12: Onboarding wizard shell + step ① AI (registration links verbatim)

**Files:**
- Create: `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts`, `.../step-ai.ts`, `.../onboarding-data.ts`
- Test: `custom_components/oig_cloud/www_v2/src/__tests__/onboarding-step-ai.test.ts`

The copy below is **verbatim from SCOPE-REVISION #7** — it is a decision record, not a draft. Do not
paraphrase it, do not add "doporučeno" to either provider (#8).

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/onboarding-step-ai.test.ts
import { describe, it, expect } from 'vitest';
import { PROVIDER_GUIDES, keyPrefixFor, validateKeyShape } from '@/ui/features/onboarding/step-ai';

describe('step ① — provider guides (SCOPE-REVISION #7)', () => {
  it('offers Groq, NVIDIA and the user’s own HA ai_task as co-equal options (#8)', () => {
    expect(Object.keys(PROVIDER_GUIDES).sort()).toEqual(['ai_task', 'groq', 'nvidia']);
    for (const g of Object.values(PROVIDER_GUIDES)) {
      expect(g.label).not.toMatch(/doporučen|recommended/i);
      expect(g.recommended).toBeUndefined();
    }
  });

  it('carries the direct registration links verbatim', () => {
    expect(PROVIDER_GUIDES.groq.registerUrl).toBe('https://console.groq.com');
    expect(PROVIDER_GUIDES.groq.keysUrl).toBe('https://console.groq.com/keys');
    expect(PROVIDER_GUIDES.nvidia.registerUrl).toBe('https://build.nvidia.com');
    expect(PROVIDER_GUIDES.nvidia.keysUrl).toBe('https://build.nvidia.com/settings/api-keys');
  });

  it('carries numbered key-setup steps and the free-tier facts', () => {
    expect(PROVIDER_GUIDES.groq.steps.length).toBeGreaterThanOrEqual(4);
    expect(PROVIDER_GUIDES.groq.steps[0]).toMatch(/console\.groq\.com/);
    expect(PROVIDER_GUIDES.groq.freeTier).toBe('30k TPM / 30 RPM / 14400 RPD');
    expect(PROVIDER_GUIDES.nvidia.freeTier).toMatch(/1000 kreditů/);
    expect(PROVIDER_GUIDES.groq.steps.join(' ')).toMatch(/jen jednou/); // "zkopíruj (jen jednou)"
  });

  it('states the key prefixes', () => {
    expect(keyPrefixFor('groq')).toBe('gsk_');
    expect(keyPrefixFor('nvidia')).toBe('nvapi-');
  });

  it('validates the pasted key’s shape locally before [Ověřit] calls out', () => {
    expect(validateKeyShape('groq', 'gsk_abc123def456')).toEqual({ ok: true });
    expect(validateKeyShape('groq', 'nvapi-abc').ok).toBe(false);
    expect(validateKeyShape('nvidia', 'nvapi-abc123def456')).toEqual({ ok: true });
  });

  it('step ① is skippable — AI is optional (#5)', async () => {
    const { STEP_AI } = await import('@/ui/features/onboarding/step-ai');
    expect(STEP_AI.skippable).toBe(true);
    expect(STEP_AI.blocksDashboard).toBe(false);
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

- [ ] **Step 3: Implement** `step-ai.ts`:

```ts
export interface ProviderGuide {
  label: string;
  registerUrl?: string;
  keysUrl?: string;
  steps: string[];
  keyPrefix?: string;
  freeTier?: string;
}

/** Verbatim from SCOPE-REVISION #7 (ověřeno 2026-07-17). Co-equal — no ranking (#8). */
export const PROVIDER_GUIDES: Record<string, ProviderGuide> = {
  ai_task: {
    label: 'Moje vlastní AI v Home Assistantu (ai_task)',
    steps: ['Použije se AI, kterou už máš v HA nastavenou.'],
  },
  groq: {
    label: 'Groq',
    registerUrl: 'https://console.groq.com',
    keysUrl: 'https://console.groq.com/keys',
    keyPrefix: 'gsk_',
    freeTier: '30k TPM / 30 RPM / 14400 RPD',
    steps: [
      'Otevři console.groq.com a zaregistruj se (email/Google/GitHub, bez karty).',
      'Přejdi na console.groq.com/keys.',
      'Klikni na [Create API Key].',
      'Zkopíruj klíč (zobrazí se jen jednou) a vlož ho níže.',
    ],
  },
  nvidia: {
    label: 'NVIDIA',
    registerUrl: 'https://build.nvidia.com',
    keysUrl: 'https://build.nvidia.com/settings/api-keys',
    keyPrefix: 'nvapi-',
    freeTier: '1000 kreditů (až 5000 na požádání), 40 RPM',
    steps: [
      'Otevři build.nvidia.com a zaregistruj se (bez karty).',
      'Přejdi na build.nvidia.com/settings/api-keys.',
      'Klikni na [Generate API Key].',
      'Zkopíruj klíč a vlož ho níže.',
    ],
  },
};

export const STEP_AI = { id: 'ai', skippable: true, blocksDashboard: false } as const;
```

The rendered step = provider chooser (three co-equal cards) → numbered steps + links → paste field
(`type="password"`, per Task 5) → **[Ověřit]** → POST `/ai` (Task 10). A failed/rate-limited verify
stores the key `unverified` and **still lets the user continue** (#5/#6).

- [ ] **Step 4–5: Run, commit**

```bash
git add custom_components/oig_cloud/www_v2/src/ui/features/onboarding custom_components/oig_cloud/www_v2/src/__tests__/onboarding-step-ai.test.ts
git commit -m "feat(onboarding): step ① AI — co-equal providers, verbatim registration guides (#7/#8)"
```

---

### Task 13: Onboarding steps ② Solár and ③ Ceny — registry-driven, soft

**Files:**
- Create: `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/step-solar.ts`, `.../step-pricing.ts`
- Test: `custom_components/oig_cloud/www_v2/src/__tests__/onboarding-steps.test.ts`

Both steps render **the same registry-driven fields with the same `showIf` predicate** as the settings
tab (Tasks 3–4) — the wizard must not grow a second field list (P5).

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/onboarding-steps.test.ts
import { describe, it, expect } from 'vitest';
import { fieldsFromRegistry } from '@/data/registry-data';
import { STEP_SOLAR } from '@/ui/features/onboarding/step-solar';
import { STEP_PRICING } from '@/ui/features/onboarding/step-pricing';
import { REGISTRY_FIXTURE } from './fixtures/registry-fixture';

describe('step ② solar (P3, as narrowed by SCOPE-REVISION #6)', () => {
  it('renders solar fields from the registry, not a local list', () => {
    expect(STEP_SOLAR.fields(REGISTRY_FIXTURE).map((f) => f.key))
      .toEqual(fieldsFromRegistry(REGISTRY_FIXTURE, 'solar').map((f) => f.key));
  });

  it('applies the same provider→key conditional as the settings tab', () => {
    const shown = STEP_SOLAR.visibleFields(REGISTRY_FIXTURE, { solar_forecast_provider: 'solcast' });
    expect(shown.map((f) => f.key)).toContain('solcast_api_key');
    expect(shown.map((f) => f.key)).not.toContain('solar_forecast_api_key');
  });

  it('[Otestovat] gates only the STEP, never the dashboard (#6)', () => {
    expect(STEP_SOLAR.blocksDashboard).toBe(false);
    expect(STEP_SOLAR.skippable).toBe(true);
  });
});

describe('step ③ pricing', () => {
  it('is reachable without a verified AI (#5)', () => {
    expect(STEP_PRICING.requiresAi).toBe(false);
  });

  it('AI cross-verification is an optional helper button, not a precondition', () => {
    expect(STEP_PRICING.aiVerify.optional).toBe(true);
  });
});
```

- [ ] **Step 2: Run — verify FAIL** (cannot resolve `@/ui/features/onboarding/step-solar`)

- [ ] **Step 3: Implement — define the step objects the tests above assert against**

The tests reference `STEP_SOLAR.fields(...)`, `.visibleFields(...)`, `.blocksDashboard`, `.skippable`
and `STEP_PRICING.requiresAi`, `.aiVerify.optional`. **Define them explicitly**, mirroring the shape
Task 12 gives `STEP_AI` (`step-ai.ts`) — a step is a plain data object plus two pure derivations, so the
wizard cannot grow a second field list (P5):

```ts
// src/ui/features/onboarding/step-solar.ts
import { fieldsFromRegistry, isVisible } from '@/data/registry-data';
import type { FieldRegistry } from '@/data/registry-data';
import type { FieldDef } from '@/ui/features/settings';

/** The shape every wizard step shares. STEP_AI (step-ai.ts) is the same contract. */
export interface WizardStep {
  id: string;
  /** #6: NO step may gate the dashboard. Pinned to false, asserted in tests. */
  blocksDashboard: false;
  /** #5/#6: every step may be skipped. */
  skippable: boolean;
}

export interface RegistryStep extends WizardStep {
  section: string;
  fields(reg: FieldRegistry): FieldDef[];
  visibleFields(reg: FieldRegistry, values: Record<string, unknown>): FieldDef[];
}

export const STEP_SOLAR: RegistryStep = {
  id: 'solar',
  section: 'solar',
  blocksDashboard: false,   // [Otestovat] gates the STEP, never the dashboard (#6)
  skippable: true,
  // P5: the SAME derivation the settings tab uses (Tasks 3-4). Not a copy.
  fields: (reg) => fieldsFromRegistry(reg, 'solar'),
  // U1: the SAME predicate as the settings card. Not a second implementation.
  visibleFields: (reg, values) =>
    fieldsFromRegistry(reg, 'solar').filter((f) => isVisible(f, (k) => values[k])),
};
```

```ts
// src/ui/features/onboarding/step-pricing.ts
import type { WizardStep } from '@/ui/features/onboarding/step-solar';

export interface PricingStep extends WizardStep {
  /** #5: AI is optional — pricing must never require a verified provider. */
  requiresAi: false;
  /** The AI cross-check is a helper button, not a precondition. */
  aiVerify: { optional: true; enabledWhenAiVerified: boolean };
}

export const STEP_PRICING: PricingStep = {
  id: 'pricing',
  blocksDashboard: false,
  skippable: true,
  requiresAi: false,
  aiVerify: { optional: true, enabledWhenAiVerified: false },
};
```

> **`blocksDashboard: false` and `requiresAi: false` are typed as the literal `false`, not `boolean`.**
> That is deliberate: SCOPE-REVISION #6 and #5 then hold at compile time, and a future edit that tries to
> gate the dashboard fails `tsc` rather than a test somebody might delete. The runtime assertions in Step
> 1 stay anyway — they are what a reviewer reads.

Step ② keeps P3's `[Otestovat]` (a real forecast fetch + tomorrow's graph) as the **step's**
completion criterion — never the dashboard's. Step ③ pre-fills from whatever pricing source Plan 4's
bundled dataset provides; **until Plan 4 lands there is no dataset**, so step ③ in this plan is a manual
confirm form with the AI cross-check button disabled when AI is unverified (`aiVerify
.enabledWhenAiVerified`). State that on screen rather than hiding it.

> **Scope boundary — do not cross it:** the `pricelists`/`ai_models` **bundled dataset is Plan 4's**
> (SCOPE-REVISION "DŮSLEDKY PRO PLÁNY" → Plan 4). Do not add a fetch of any kind (#2/#4).

- [ ] **Step 4–5: Run, commit**

```bash
git add custom_components/oig_cloud/www_v2/src/ui/features/onboarding custom_components/oig_cloud/www_v2/src/__tests__/onboarding-steps.test.ts
git commit -m "feat(onboarding): steps ② solar + ③ pricing — registry-driven, skippable, never gating"
```

---

### Task 14: Wire the soft guide into the app — banner + launcher, **no lock**

**Files:**
- Modify: `custom_components/oig_cloud/www_v2/src/ui/app.ts` (tabs `:55-58`; `activeTab` `:66`; render `:1295-1299`; settings mount `:1397-1398`)
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts` (add the launcher)
- Test: `custom_components/oig_cloud/www_v2/src/__tests__/onboarding-soft-gate.test.ts`

**This is the task most likely to be got wrong**, because `F1-DESIGN.md:103-110` explicitly specifies
the opposite ("panel renderuje POUZE onboarding UI"). **SCOPE-REVISION #6 overrides it.** The dashboard
renders. Always. Including for a brand-new install.

- [ ] **Step 1: Write the failing tests — these are the anti-regression net**

```ts
describe('SCOPE-REVISION #6 — the guide is SOFT', () => {
  it('renders the normal tabs for a brand-new install with nothing configured', async () => {
    const el = await fixture(html`<oig-app></oig-app>`);
    (el as any).onboarding = { steps: { ai: 'pending', solar: 'pending', pricing: 'pending' } };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('oig-tabs')).toBeTruthy();
    expect(el.shadowRoot!.textContent).not.toMatch(/dokončit nastavení, než/i);
  });

  it('never replaces the dashboard with the wizard', async () => {
    // the K1 lockout this design deliberately dropped
    expect(el.shadowRoot!.querySelector('.tab-content')).toBeTruthy();
    expect((el as any).activeTab).toBe('flow');   // app.ts:66 default is preserved
  });

  it('shows a dismissible banner while setup is unfinished', async () => {
    const banner = el.shadowRoot!.querySelector('oig-onboarding-banner');
    expect(banner).toBeTruthy();
    expect(banner!.getAttribute('role')).toBe('status');   // not 'alertdialog'
  });

  it('hides the banner once every step is done', async () => {
    (el as any).onboarding = { steps: { ai: 'done', solar: 'done', pricing: 'done' } };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('oig-onboarding-banner')).toBeNull();
  });

  it('a grandfathered entry gets no banner and no wizard (D11 × #6)', async () => {
    (el as any).onboarding = { grandfathered: true, steps: { ai: 'pending', solar: 'done', pricing: 'done' } };
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('oig-onboarding-banner')).toBeNull();
  });

  it('the wizard is launchable from Settings, per step', async () => {
    const settings = await fixture(html`<oig-settings></oig-settings>`);
    expect(settings.shadowRoot!.querySelector('[data-testid="launch-onboarding"]')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — verify FAIL**

- [ ] **Step 3: Implement**
- `app.ts`: load onboarding state next to the other loads; render `<oig-onboarding-banner>` **above**
  `<oig-grid>` when any step is pending and not grandfathered. **Do not touch** the `activeTab` default
  (`:66`) and **do not** add any early-return before the tab render at `:1295-1299`.
- The wizard opens as an overlay/route from the banner's CTA or the Settings launcher; closing it
  returns to the dashboard with no penalty.
- `settings/index.ts`: a "Spustit průvodce nastavením" button (`data-testid="launch-onboarding"`) plus
  a per-step re-run affordance (F1-DESIGN §5 "Wizard lze kdykoli znovu spustit z Nastavení" — the one
  part of §5 that SCOPE-REVISION keeps).

- [ ] **Step 4: Run the full FE suite — PASS**

Run: `npm --prefix custom_components/oig_cloud/www_v2 run test:unit && npm --prefix custom_components/oig_cloud/www_v2 run typecheck && npm --prefix custom_components/oig_cloud/www_v2 run lint`

- [ ] **Step 5: Commit**

```bash
git add custom_components/oig_cloud/www_v2/src/ui/app.ts custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts custom_components/oig_cloud/www_v2/src/ui/features/onboarding custom_components/oig_cloud/www_v2/src/__tests__/onboarding-soft-gate.test.ts
git commit -m "feat(onboarding): soft banner + Settings launcher — dashboard always renders (SCOPE-REVISION #6)"
```

---

### Task 15: Full gate + integration sanity

- [ ] **Step 1: Backend gate**

```bash
cd <your-worktree>
/repos/oig-cloud/.venv/bin/python -m flake8 --max-line-length=120 custom_components/oig_cloud tests
/repos/oig-cloud/.venv/bin/python -m mypy --ignore-missing-imports --explicit-package-bases custom_components/oig_cloud/ai custom_components/oig_cloud/onboarding custom_components/oig_cloud/config_registry.py custom_components/oig_cloud/config/solar_rules.py custom_components/oig_cloud/api/ha_rest_api.py
PYTHONPATH=$PWD /repos/oig-cloud/.venv/bin/python -m pytest -q tests/
```

- [ ] **Step 2: Frontend gate**

```bash
npm --prefix custom_components/oig_cloud/www_v2 run typecheck
npm --prefix custom_components/oig_cloud/www_v2 run lint
npm --prefix custom_components/oig_cloud/www_v2 run test:unit
npm --prefix custom_components/oig_cloud/www_v2 run build
```

- [ ] **Step 3: Prove green means green.** Per the workbench rule, a count is not a result: run the
**same broad selector** on a scratch worktree at the merge-base and on your tree, and diff the failing
sets. The Task-9 harness bump makes this **mandatory**, not optional — it moves HA by ~7 minor versions
under a 261-file suite, so a base-vs-change diff is the only way to tell your regression from its.

```bash
git worktree add /tmp/scratch-p3-base <merge-base-sha>
cd /tmp/scratch-p3-base && PYTHONPATH=$PWD /repos/oig-cloud/.venv/bin/python -m pytest -q tests/ 2>&1 | tail -40
```

Report the **diff of failing tests**, not a pass count.

- [ ] **Step 4: Final commit**

```bash
git add -u && git commit -m "test(f1-plan3): full gate green — onboarding + AI backend + registry-driven forms"
```

---

## What this plan does NOT fix

Stated plainly, so nobody reads Plan 3 as closing more than it does:

- **The boiler card stays hand-rolled.** `renderBoilerCard` (`settings/index.ts:688-821`) has bespoke
  grouping, badges (`sourceSectionBadge` `:169`, `circulationSectionBadge` `:194`,
  `legionellaSectionBadge` `:201`) and inline conditionals (`:741`, `:756`, `:763`, `:769-770`).
  Tasks 3–4 make **modules / battery / solar** registry-driven; the boiler's `show_if` metadata is
  registered (Task 1) but its card still renders from `BOILER_FIELDS_ALL` (`:112-145`), which
  `settings-boiler.test.ts` asserts against. Converting it is a mechanical follow-up — **U9 is
  therefore only partly closed by this plan.**
- **The FE static lists survive** as the `registry === null` fallback (Task 4). Their deletion — like
  `_MODULE_CONFIG_FIELDS`'s, already marked "removed in Plan 4" — is **Plan 4's**.
- **GET `module_config` remains non-admin** (`ha_rest_api.py:1206-1222`). SCOPE-REVISION books that as
  a *"malý samostatný fix"* of its own. This plan admin-gates only the endpoints it adds (Tasks 10–11).
- **No fallback chain, no `oig_ai_status` sensor, no `no_credits` state machine.** The brief scopes
  Plan 3 to the **small surface** (`_async_generate_data` + `GENERATE_DATA` + `base_url` + key). The
  chain/backoff/circuit-breaker design codex's "AI availability contract" finding asks for is not in
  this plan — and with `ai_models` now bundled (#3) it belongs with Plan 4's dataset.
- **`extract_pricelist` is not implemented.** Step ③ confirms prices manually; the AI cross-check needs
  Plan 4's bundled dataset to have something to cross-check against.
- **Plan 2's OQ-5/OQ-6 stay open.** Task 1 deliberately does not touch
  `enable_statistics`/`enable_extended_sensors` (OQ-5) or `data_source_mode` (OQ-6). Task 1 *does*
  resolve the three blank-enum defaults (`solar_forecast_provider`, `solar_forecast_mode`,
  `boiler_alt_source_type`), because there it is not a product question — the registry's own default is
  rejected by its own validator, which is simply a bug.
- **Migration, EXCEPT the three keys this plan itself breaks.** Plan 4 owns dead-key deletion,
  `_MODULE_CONFIG_FIELDS` removal, author defaults and the bundled dataset. Task 1 Steps 6–9 carry the
  **only** migration in this plan: a one-shot `"" →` new-default promote for exactly the three keys Task
  1 re-defaults. It is scoped here because Task 1 creates the problem — a stored `""` survives a default
  change (GET reads `opts.get(key, field.default)`, `ha_rest_api.py:1220`) and 400s on the next save.
  **Do not widen it** into Plan 4's migration; `test_promotes_exactly_the_three_keys_task_1_re_defaulted`
  fails if someone tries.
- **Per-string solar geometry stays flow-only.** Task 2 shares the *cross-field* rules (provider/mode/key,
  `no_strings_enabled`). The per-string kwp/declination bounds (`steps.py:1651-1683`) are not duplicated
  into the shared validator: the registry already pins them (`config_registry.py:163-171`) and REST
  enforces them per-field through `coerce_value`. If a cross-field *geometry* rule ever appears, it
  belongs in `solar_rules.py`, not in `steps.py`.

## Could NOT establish — do not treat these as verified

The brief's rule is that an unverifiable reference is declared, not guessed. These are the five:

1. **The HA `ai_task` API surface.** `AITaskEntity`, `AITaskEntityFeature.GENERATE_DATA`,
   `GenDataTask`, `GenDataTaskResult`, `ChatLog` and the `_async_generate_data(task, chat_log)`
   signature come from **SCOPE-REVISION #9 and DECISIONS O1** — *not* from code. The installed HA is
   **2025.1.4** and has no `ai_task` module, so nothing in this repo could confirm them. Task 9 pins an
   `ai_task`-capable HA and confirms every symbol **before** implementing.
2. **How to DELEGATE to the host's own `ai_task` entity** (Task 9 Step 3, sub-step 4) — the `provider ==
   "ai_task"` branch. Whether it is an `ai_task.generate_data` service call, a helper, or resolving
   `entity_id=None` to the user's preferred entity — and what it returns, and whether a custom
   `AITaskEntity` may delegate to another one at all — **cannot be established from this repo**, for the
   same reason as #1. `F1-DESIGN.md:46-48` sketches it (`has_service("ai_task","generate_data")`,
   `entity_id=None`) but that is a design note, not a read API. Task 9 resolves it against the pinned HA.
   **If it cannot be made to work, drop `"ai_task"` from `ai_provider.enum` and say so** — the one
   outcome that is not acceptable is silently sending an `ai_task` user's prompts to Groq.
3. **The `pytest-homeassistant-custom-component` version that carries HA ≥ 2025.8.** Resolvable only
   from the package index. Task 9 resolves it and verifies with an explicit version print.
4. **Provider base URLs** (`https://api.groq.com/openai/v1`, `https://integrate.api.nvidia.com/v1`) and
   the `/v1/models`-probe semantics. SCOPE-REVISION #7 documents the **console** URLs, the key prefixes
   and the free-tier limits — it does **not** document API base URLs. They are config-flow fields with
   the above as defaults-to-confirm.
5. **Whether HA's `manifest.json` accepts a minimum-HA-version key.** K2c says manifest **and**
   `hacs.json` "get a minimum HA version"; to my knowledge the manifest schema has no such field and
   `hassfest` would reject it, so Task 9 puts the constraint in `hacs.json` and flags the discrepancy
   rather than inventing a key. **This is about `manifest.json` only** — that `hacs.json` itself accepts
   a `homeassistant` minimum-version key is documented by HACS and is *not* in doubt; the residual risk
   there is scope (it binds HACS at install time, not a user already on an old HA — Task 9 Step 3, sub-step 2).

Additionally, **`F1-BACKLOG.md` disagrees with `DECISIONS.md` on the D/P numbering** (it maps "P8" to
"V2 settings provider/key UX wiring" and "P9" to the dropdown issue, whereas DECISIONS P8 is
*de-hardcode* and P9 is *the 3-phase scope*; it also files the AI runtime as "F3 … outside the current
F1 slice", which SCOPE-REVISION #9 contradicts by assigning it to Plan 3). Per the brief, **SCOPE-REVISION
wins**; this plan cites DECISIONS' own numbering and ignores the backlog's.

## Self-review notes

- **SCOPE-REVISION coverage:** #5 AI optional → T8 (`optional=True`, no default), T9 (`test_ai_optional`,
  which now proves it by *making the import fail*), T12/T13 (skippable, `requiresAi:false`); #6 soft
  guide → T11 (no lock concept in state), T13 (`blocksDashboard` typed as literal `false`), T14 (the
  whole anti-regression suite); #7 verbatim links/steps → T12; #8 co-equal provider → T7
  (`test_providers_are_co_equal_with_no_recommended_default`), T8 (no default), T9
  (`test_ai_task_provider_does_NOT_call_the_oig_backend` — co-equality enforced in *dispatch*, not just
  in the enum), T12 (no "doporučeno"); #9 own backend, no HACS → T6/T7/T9; key in `.storage` never in
  options/logs → T6, T8 (`test_ai_step_stores_key_out_of_band`), T10 (`test_ai_key_never_lands_in_entry_
  options`); prompt anonymity → T7 (an **allow-list**, asserted on the **outgoing body**'s key set).
- **Both live UX gaps land:** provider→key → T1 (`show_if`) + T2 (validation) + T3/T4 (render);
  transparent dropdowns → T5.
- **No forbidden work:** no remote fetch/tuning (T13 says so explicitly), no hard gate (T14 tests
  *against* one), no HACS dependency (T9 ships the entity), no Plan-2 re-planning (the `basic` section
  and `_build_base_options` are untouched; OQ-5/OQ-6 left open), no Plan-4 work — with **one bounded
  exception, declared**: T1 Steps 6–9 promote the stored `""` for exactly the three keys T1 itself
  re-defaults. That migration exists here because *this plan creates that bug class*; shipping the
  default change and handing its migration to Plan 4 would ship a regression. Three keys, one shot,
  pinned by `test_promotes_exactly_the_three_keys_task_1_re_defaulted`. Plan 4's dead-key/
  `_MODULE_CONFIG_FIELDS`/dataset scope is untouched.
- **Every `file:line` in this document was re-verified at `a5ef87a74` on 2026-07-17**, twice — once when
  writing it and once on revision — see the facts table. Several contradicted inputs I was handed, which
  is exactly why the rule exists: Plan 2's self-review line numbers had already rotted, and the
  registry's blank enum defaults are a live round-trip bug that no document mentions (proven by
  executing `coerce_value` against them).
- **The headline bug was under-counted on the first pass, and that is the lesson.** It was framed as a
  *solar* bug and fixed in two places; it is an **enum-field-with-blank-default** bug and there were
  three (`boiler_alt_source_type`, `config_registry.py:193-194`). `test_no_enum_field_defaults_outside_
  its_own_enum` now asserts the *class*, not the instances — the same move as inverting the prompt
  deny-list into an allow-list (T7) and as folding `no_strings_enabled` into the shared validator (T2).
  Where this plan enumerates, it now also states the rule.
