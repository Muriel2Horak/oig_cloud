# F1 Plan 2/4 — Basic fields → registry

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Narrow the F1 §6/P5 gap Plan 1 deferred: register every residual **basic** options-flow field in `FIELD_REGISTRY`, and make the basic options flow — including `_build_options_payload` / `_build_base_options` — read that registry instead of hard-coded literals. Two questions (OQ-5, OQ-6) must be answered before the gap is fully closed; the sub-tasks they block are marked. See *What this plan does NOT fix*.

**Architecture:** `config_registry.py` gains a new `basic` section with the 6 fields inside the F1 §7 fence. REST `module_config` GET/POST iterates the registry, so the new section is exposed automatically. `config/steps.py` derives the intervals step defaults, bounds, and the options payload from the registry. A parity test guarantees **zero behaviour change** versus today's `_build_base_options` output.

**Tech Stack:** Python 3.12, Home Assistant custom integration, pytest (existing harness: `.venv/bin/python -m pytest`), flake8 (max-line-length=120), mypy (`--ignore-missing-imports --explicit-package-bases`).

**Spec:** `docs/redesign_2026_07/F1-DESIGN.md` §6–§7 + DECISIONS P5, K2f. Do NOT delete any existing key in this plan (deletion = Plan 4). Do NOT resolve the open questions listed at the end — carry them forward and block the relevant sub-tasks.

**Worklog convention:** commit after every task; all commits end with:
```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

**Review status:** this plan was attacked by two independent adversarial critics (spec-fidelity/reference-rot
and feasibility/regression-coverage). Their blocking findings are incorporated below; every code citation was
re-verified by grep at tip `1177c9d9a` during incorporation. Where a finding required a **product** decision it
was NOT resolved — the affected sub-task is marked `BLOCKED` and the question is carried in *Open questions*.

---

### Task 1: Register the 6 basic fields in `FIELD_REGISTRY`

**Files:**
- Modify: `custom_components/oig_cloud/config_registry.py` (append a new `basic` section)
- Test: `tests/test_config_registry.py` (append)

Evidence base (verified at tip `1177c9d9a`):
- `FIELD_REGISTRY` has zero `basic` members; `_register()` is at `custom_components/oig_cloud/config_registry.py:74` and only registers `modules`/`battery`/`solar`/`boiler` (`RESEARCH-basic-field-inventory.md` H1).
- Flow defaults: `standard_scan_interval=30`, `extended_scan_interval=300`, `data_source_mode="cloud_only"`, `local_proxy_stale_minutes=10`, `local_event_debounce_ms=300`, `enable_dashboard=False` (`custom_components/oig_cloud/config/steps.py:368-385`, `:3276-3288`).
- Flow bounds: standard 30–300, extended 300–3600, proxy stale 1–120, debounce 0–5000 (`custom_components/oig_cloud/config/steps.py:1413-1431`).
- Legacy `data_source_mode="hybrid"` is mapped to `"local_only"` on read (`custom_components/oig_cloud/core/data_source.py:31`, `:95-100`); a naive `enum=` would reject it (`RESEARCH-basic-field-inventory.md` H5, OQ-6).

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_config_registry.py

def test_basic_section_has_six_fields():
    basic = fields_for_section("basic")
    assert set(basic) == {
        "standard_scan_interval",
        "extended_scan_interval",
        "data_source_mode",
        "local_proxy_stale_minutes",
        "local_event_debounce_ms",
        "enable_dashboard",
    }


def test_basic_field_metadata_matches_flow():
    basic = fields_for_section("basic")
    assert basic["standard_scan_interval"] == Field(
        "standard_scan_interval", "basic", int, default=30, min=30, max=300, step=1,
        scope="basic",
    )
    assert basic["extended_scan_interval"] == Field(
        "extended_scan_interval", "basic", int, default=300, min=300, max=3600, step=1,
        scope="basic",
    )
    assert basic["data_source_mode"] == Field(
        "data_source_mode", "basic", str, default="cloud_only",
        enum=("cloud_only", "local_only"), scope="basic",
    )
    assert basic["local_proxy_stale_minutes"] == Field(
        "local_proxy_stale_minutes", "basic", int, default=10, min=1, max=120, step=1,
        scope="basic",
    )
    assert basic["local_event_debounce_ms"] == Field(
        "local_event_debounce_ms", "basic", int, default=300, min=0, max=5000, step=1,
        scope="basic",
    )
    assert basic["enable_dashboard"] == Field(
        "enable_dashboard", "basic", bool, default=False, scope="basic",
    )


def test_basic_fields_scope_is_basic():
    for field in fields_for_section("basic").values():
        assert field.scope == "basic"
        assert field.secret is False
        assert field.mirror is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /repos/wt-plan2-author && .venv/bin/python -m pytest -q tests/test_config_registry.py::test_basic_section_has_six_fields tests/test_config_registry.py::test_basic_field_metadata_matches_flow tests/test_config_registry.py::test_basic_fields_scope_is_basic`

Expected: FAIL (`AssertionError` because `fields_for_section("basic")` is empty).

- [ ] **Step 3: Append the `basic` section to `config_registry.py`**

```python
# custom_components/oig_cloud/config_registry.py

# --- section: basic ---------------------------------------------------------
_register(
    Field("standard_scan_interval", "basic", int, default=30, min=30, max=300,
          step=1, scope="basic"),
    Field("extended_scan_interval", "basic", int, default=300, min=300, max=3600,
          step=1, scope="basic"),
    Field("data_source_mode", "basic", str, default="cloud_only",
          enum=("cloud_only", "local_only"), scope="basic"),
    Field("local_proxy_stale_minutes", "basic", int, default=10, min=1, max=120,
          step=1, scope="basic"),
    Field("local_event_debounce_ms", "basic", int, default=300, min=0, max=5000,
          step=1, scope="basic"),
    Field("enable_dashboard", "basic", bool, default=False, scope="basic"),
)
```

Note: `data_source_mode` is registered with only the supported values. Legacy `"hybrid"` is handled at the flow/REST boundary (Step 4 / Task 3) so existing entries are not rejected. See OQ-6.

- [ ] **Step 4: Run tests**

Run: `.venv/bin/python -m pytest -q tests/test_config_registry.py`

Expected: PASS.

- [ ] **Step 5: Lint + commit**

Run:
```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/config_registry.py tests/test_config_registry.py
.venv/bin/mypy --ignore-missing-imports --explicit-package-bases custom_components/oig_cloud/config_registry.py
```

```bash
git add custom_components/oig_cloud/config_registry.py tests/test_config_registry.py
git commit -m "feat(registry): register basic section with 6 F1 §7 fields (P5)"
```

---

### Task 2: REST `module_config` GET/POST exposes the `basic` section

**Files:**
- Modify: `custom_components/oig_cloud/api/ha_rest_api.py` — the section tuple at `custom_components/oig_cloud/api/ha_rest_api.py:1214`
- Test: `tests/test_ha_rest_api_views.py` (append)

- [ ] **Step 1: Write the failing tests**

> **Harness contract (verified — do not re-guess).** `_module_config_request` takes **two** arguments,
> `(hass, payload)` (`tests/test_ha_rest_api_views.py:440`), and the existing call sites pass both
> (`:479-481`, `:495-497`). `_make_hass_for_module_config` returns `(hass, entry)` where `entry` is a
> `DummyEntry` (`:455-460`) — `async_update_entry` is a **plain method, not a Mock**, so there is no
> `.call_args`. Assert persistence on **`entry.options[...]`**, exactly as `:487` and the finite-update
> test do. `pytest.ini` sets `asyncio_mode = auto`, so async tests need no `@pytest.mark.asyncio`.

```python
# tests/test_ha_rest_api_views.py

async def test_module_config_get_includes_basic_section():
    hass, entry = _make_hass_for_module_config("basicbox", {})
    view = api_module.OIGCloudModuleConfigView()
    request = _module_config_request(hass, {})
    response = await view.get(request, "basicbox")
    payload = json.loads(response.text)

    assert response.status == 200
    assert "basic" in payload
    basic = payload["basic"]
    assert basic["standard_scan_interval"] == 30
    assert basic["extended_scan_interval"] == 300
    assert basic["data_source_mode"] == "cloud_only"
    assert basic["local_proxy_stale_minutes"] == 10
    assert basic["local_event_debounce_ms"] == 300
    assert basic["enable_dashboard"] is False


async def test_module_config_post_basic_section_accepts_update():
    hass, entry = _make_hass_for_module_config("basicbox", {})
    view = api_module.OIGCloudModuleConfigView()
    request = _module_config_request(hass, {
        "section": "basic",
        "values": {"standard_scan_interval": 60, "enable_dashboard": True},
    })
    response = await view.post(request, "basicbox")
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload["updated"] is True
    assert "standard_scan_interval" in payload["keys"]
    assert entry.options["standard_scan_interval"] == 60
    assert entry.options["enable_dashboard"] is True


async def test_module_config_post_basic_rejects_unknown_field():
    hass, entry = _make_hass_for_module_config("basicbox", {})
    view = api_module.OIGCloudModuleConfigView()
    request = _module_config_request(hass, {
        "section": "basic",
        "values": {"phantom_key": 1},
    })
    response = await view.post(request, "basicbox")
    payload = json.loads(response.text)

    assert response.status == 400
    assert payload["error"] == "validation"
    assert payload["fields"]["phantom_key"] == "unknown field"


async def test_module_config_post_basic_rejects_out_of_bounds():
    """Registry bounds must be enforced on the REST path too, and nothing persisted."""
    hass, entry = _make_hass_for_module_config("basicbox", {"standard_scan_interval": 30})
    view = api_module.OIGCloudModuleConfigView()
    request = _module_config_request(hass, {
        "section": "basic",
        "values": {"standard_scan_interval": 5},  # below registry min 30
    })
    response = await view.post(request, "basicbox")
    payload = json.loads(response.text)

    assert response.status == 400
    assert "standard_scan_interval" in payload["fields"]
    assert entry.options["standard_scan_interval"] == 30  # unchanged


async def test_module_config_get_basic_defaults_when_unset():
    """An entry with no basic keys must GET the registry defaults, not omit the keys."""
    hass, entry = _make_hass_for_module_config("basicbox", {})
    view = api_module.OIGCloudModuleConfigView()
    request = _module_config_request(hass, {})
    response = await view.get(request, "basicbox")
    payload = json.loads(response.text)

    assert payload["basic"]["data_source_mode"] == "cloud_only"
```

- [ ] **Step 2: Run — verify FAIL**

Run: `.venv/bin/python -m pytest -q tests/test_ha_rest_api_views.py::test_module_config_get_includes_basic_section tests/test_ha_rest_api_views.py::test_module_config_post_basic_section_accepts_update tests/test_ha_rest_api_views.py::test_module_config_post_basic_rejects_unknown_field`

Expected: FAIL (GET returns no `basic` section because the section tuple omits it; POST rejects with "unknown field" at `custom_components/oig_cloud/api/ha_rest_api.py:1254-1255`).

- [ ] **Step 3: Add `basic` to the GET section tuple**

```python
# custom_components/oig_cloud/api/ha_rest_api.py:1214
        for section in ("basic", "modules", "battery", "solar", "boiler"):
```

POST needs no other change: it already validates against `fields_for_section(section)` (`custom_components/oig_cloud/api/ha_rest_api.py:1243`) and writes via `merge_entry_options` (`custom_components/oig_cloud/api/ha_rest_api.py:1270`).

> ### ⛔ BLOCKED on OQ-6 — `data_source_mode` at the REST boundary
>
> **Do not implement this sub-task until OQ-6 is decided.** Adding `basic` to the GET tuple exposes
> `data_source_mode` on the REST surface, and the legacy value `"hybrid"` is not round-trippable:
>
> - **GET** returns the raw stored option via `opts.get(key, field.default)`
>   (`custom_components/oig_cloud/api/ha_rest_api.py:1220`), so a stored `"hybrid"` is echoed **unsanitized** —
>   a value the registry itself calls invalid.
> - **POST** of that same value is rejected by `coerce_value`, because `"hybrid"` is not in the registered enum
>   (`custom_components/oig_cloud/config_registry.py:65-66`).
>
> So a client that GETs an old entry and PUTs it back unchanged gets a 400 on a value **we** gave it. That
> violates the P5 one-definition contract on the very field this plan introduces.
>
> **Note on evidence:** it is *not* established that any production entry actually stores `"hybrid"`. What is
> established is that the code supports it as a legacy value (`custom_components/oig_cloud/core/data_source.py:31`,
> `:95-100`). This is a possible-live defect, not a proven-live one — but it must be decided before the
> boundary is shipped, not after.
>
> The rest of Task 2 (the section tuple, the other five basic fields) is **not** blocked; only the
> `data_source_mode` exposure is. If OQ-6 must wait, ship Task 2 with `data_source_mode` filtered out of the
> `basic` GET/POST section and register it in Task 1 regardless.

- [ ] **Step 4: Run tests**

Run: `.venv/bin/python -m pytest -q tests/test_ha_rest_api_views.py`

Expected: PASS (including existing module_config tests).

- [ ] **Step 5: Lint + commit**

```bash
git add -u && git commit -m "feat(rest): expose basic section via module_config GET/POST (P5)"
```

---

### Task 3: Basic options step derives defaults and bounds from the registry

**Files:**
- Modify: `custom_components/oig_cloud/config/steps.py` — `_show_intervals_form` (`:1454`), `_validate_interval_values` (`:1405`), `_collect_interval_values` (`:1385`)
- Test: `tests/test_config_options_flow.py` (append)

> ### ⚠️ The key-dialect trap — read before writing any code here
>
> This step has one non-obvious way to go wrong, and it silently destroys user input.
>
> `_collect_interval_values` returns **short alias** keys — `"standard"`, `"extended"`, `"proxy_stale"`,
> `"debounce_ms"` (`custom_components/oig_cloud/config/steps.py:1385-1402`) — while the form, the registry, and
> `_wizard_data` all use **field-name** keys (`"standard_scan_interval"`, …). Today's error-path schema branch
> bridges the two by hand: it reads `values["standard"]` (`:1497`), and `_validate_interval_values` reads
> `values["standard"]` (`:1407-1411`).
>
> On the **error path**, `async_step_wizard_intervals` calls `_show_intervals_form(values, errors)` with that
> alias-keyed dict (`:1372-1375`). So a registry-driven schema that looks up `defaults.get("standard_scan_interval")`
> finds **nothing**, falls back to the registry default, and **re-renders the form with the user's just-typed value
> replaced by 30**. The user fixes one bad field and silently loses the other three. That is a real behaviour
> change in a plan whose whole promise is zero behaviour change — and no parity test in this plan would catch it,
> because the parity tests only cover `_build_base_options`.
>
> **Therefore: do not bridge the dialect — delete it.** Make `_collect_interval_values` return field-name keys and
> update its only two consumers. It has exactly one call site (`:1372`), and its output flows only to
> `_validate_interval_values` (`:1373`) and the error-path form (`:1375`) — nothing else reads those aliases, so
> the refactor is contained. `self._wizard_data.update(user_input)` (`:1377`) already uses field-name keys and is
> unaffected.

- [ ] **Step 1: Write the failing tests**

Add at the top of `tests/test_config_options_flow.py`:

```python
from custom_components.oig_cloud.config_registry import fields_for_section
```

Then append:

```python
# tests/test_config_options_flow.py

async def test_intervals_step_uses_registry_defaults():
    """Wizard interval defaults must come from FIELD_REGISTRY, not hard-coded literals."""
    entry = SimpleNamespace(
        entry_id="entry1", data={CONF_USERNAME: "demo"}, options={}
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._section = "intervals"
    flow._step_history = ["init"]

    result = await flow.async_step_wizard_intervals()
    schema = result["data_schema"].schema
    keys = {vol_marker.key: vol_marker for vol_marker in schema}

    basic = fields_for_section("basic")
    assert keys["standard_scan_interval"].default == basic["standard_scan_interval"].default
    assert keys["extended_scan_interval"].default == basic["extended_scan_interval"].default
    assert keys["local_proxy_stale_minutes"].default == basic["local_proxy_stale_minutes"].default
    assert keys["local_event_debounce_ms"].default == basic["local_event_debounce_ms"].default


async def test_intervals_validation_uses_registry_bounds():
    """Out-of-registry-bounds values must still be rejected after de-hardcoding."""
    entry = SimpleNamespace(
        entry_id="entry1", data={CONF_USERNAME: "demo"}, options={}
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._section = "intervals"
    flow._step_history = ["init"]
    flow._wizard_data["data_source_mode"] = "cloud_only"

    result = await flow.async_step_wizard_intervals({
        "standard_scan_interval": 5,      # below registry min 30
        "extended_scan_interval": 200,    # below registry min 300
        "local_proxy_stale_minutes": 0,   # below registry min 1
        "local_event_debounce_ms": 6000,  # above registry max 5000
        "data_source_mode": "cloud_only",
        "go_back": False,
    })
    assert result["errors"]["standard_scan_interval"] == "interval_too_short"
    assert result["errors"]["extended_scan_interval"] == "extended_interval_too_short"
    assert result["errors"]["local_proxy_stale_minutes"] == "interval_too_short"
    assert result["errors"]["local_event_debounce_ms"] == "interval_too_long"


async def test_intervals_error_path_repopulates_user_values():
    """REGRESSION (key-dialect trap): after a validation error the form must re-render the
    user's typed values, NOT registry defaults. Guards the alias/field-name bridge."""
    entry = SimpleNamespace(
        entry_id="entry1", data={CONF_USERNAME: "demo"}, options={}
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()
    flow._section = "intervals"
    flow._step_history = ["init"]
    flow._wizard_data["data_source_mode"] = "cloud_only"

    # extended_scan_interval is invalid; the other three are valid and must survive.
    result = await flow.async_step_wizard_intervals({
        "standard_scan_interval": 120,
        "extended_scan_interval": 200,    # below registry min 300 -> error
        "local_proxy_stale_minutes": 45,
        "local_event_debounce_ms": 900,
        "data_source_mode": "local_only",
        "go_back": False,
    })

    assert result["errors"]["extended_scan_interval"] == "extended_interval_too_short"
    keys = {m.key: m for m in result["data_schema"].schema}
    assert keys["standard_scan_interval"].default() == 120
    assert keys["local_proxy_stale_minutes"].default() == 45
    assert keys["local_event_debounce_ms"].default() == 900
    assert keys["data_source_mode"].default() == "local_only"
    # the rejected value is echoed back so the user can correct it, not silently reset
    assert keys["extended_scan_interval"].default() == 200
```

> **Note on `.default()`:** `vol.Optional(default=X)` wraps `X` in a callable, so the assertion calls it.
> If `DummyOptionsFlow` in this file stores schema markers differently, match the existing convention in
> `tests/test_config_options_flow.py` rather than this snippet — verify before assuming.

- [ ] **Step 2: Run — verify FAIL**

Run: `.venv/bin/python -m pytest -q tests/test_config_options_flow.py::test_intervals_step_uses_registry_defaults tests/test_config_options_flow.py::test_intervals_validation_uses_registry_bounds`

Expected: FAIL (`AttributeError` / assertion on schema defaults because `_show_intervals_form` still hard-codes them at `custom_components/oig_cloud/config/steps.py:1465-1489`).

- [ ] **Step 3: Refactor the intervals step to read the registry**

Introduce a helper that builds the intervals schema from `fields_for_section("basic")`. Keep the existing field types (`int` for numeric fields, `SelectSelector` for `data_source_mode`) so the UI does not change — only the defaults and enum options come from the registry.

```python
# custom_components/oig_cloud/config/steps.py (inside WizardMixin)

from ..config_registry import fields_for_section

@staticmethod
def _get_intervals_schema(defaults: Dict[str, Any]) -> vol.Schema:
    """Build the wizard_intervals schema from the basic FIELD_REGISTRY."""
    basic = fields_for_section("basic")

    data_mode = basic["data_source_mode"]
    current_mode = WizardMixin._sanitize_data_source_mode(
        defaults.get("data_source_mode", data_mode.default)
    )

    return vol.Schema(
        {
            vol.Optional(
                "standard_scan_interval",
                default=defaults.get("standard_scan_interval", basic["standard_scan_interval"].default),
            ): int,
            vol.Optional(
                "extended_scan_interval",
                default=defaults.get("extended_scan_interval", basic["extended_scan_interval"].default),
            ): int,
            vol.Optional(
                "data_source_mode", default=current_mode
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[
                        selector.SelectOptionDict(value=v, label=label)
                        for v, label in zip(
                            data_mode.enum,
                            (
                                "☁️ Cloud only",
                                "🏠 Local only (fallback na cloud při výpadku)",
                            ),
                        )
                    ],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            ),
            vol.Optional(
                "local_proxy_stale_minutes",
                default=defaults.get("local_proxy_stale_minutes", basic["local_proxy_stale_minutes"].default),
            ): int,
            vol.Optional(
                "local_event_debounce_ms",
                default=defaults.get("local_event_debounce_ms", basic["local_event_debounce_ms"].default),
            ): int,
            vol.Optional("go_back", default=False): bool,
        }
    )
```

Then replace **both** schema-building branches in `_show_intervals_form` (`:1459-1524`) with a single call:

```python
return self.async_show_form(
    step_id="wizard_intervals",
    data_schema=self._get_intervals_schema(values or self._wizard_data or {}),
    errors=errors,
    description_placeholders=self._get_step_placeholders("wizard_intervals"),
)
```

**This is only correct once `values` is field-name-keyed** — see the key-dialect trap above. Retire the aliases
in the same step:

```python
# custom_components/oig_cloud/config/steps.py:1385 — return field-name keys, not aliases
def _collect_interval_values(self, user_input: Dict[str, Any]) -> Dict[str, Any]:
    """Collect the intervals step's values, keyed by registry field name."""
    basic = fields_for_section("basic")
    values = {
        key: user_input.get(
            key, self._wizard_data.get(key, basic[key].default)
        )
        for key in (
            "standard_scan_interval",
            "extended_scan_interval",
            "local_proxy_stale_minutes",
            "local_event_debounce_ms",
        )
    }
    values["data_source_mode"] = self._sanitize_data_source_mode(
        user_input.get(
            "data_source_mode",
            self._wizard_data.get("data_source_mode", basic["data_source_mode"].default),
        )
    )
    return values
```

This also closes the gap the feasibility critic flagged: the old body hard-coded the very defaults
(`30`, `300`, `10`, `300`) this plan is meant to source from the registry, so listing it as a target while
leaving it untouched would have left a duplicate-default site behind — exactly what P5 forbids.

`_validate_interval_values` then reads the same field-name keys, with bounds from the registry instead of
literals:

```python
# custom_components/oig_cloud/config/steps.py:1405
def _validate_interval_values(self, values: Dict[str, Any]) -> Dict[str, str]:
    errors: Dict[str, str] = {}
    basic = fields_for_section("basic")

    # (key, error-key-below, error-key-above) — the i18n dialect is preserved verbatim (OQ-7)
    checks = (
        ("standard_scan_interval", "interval_too_short", "interval_too_long"),
        ("extended_scan_interval", "extended_interval_too_short", "extended_interval_too_long"),
        ("local_proxy_stale_minutes", "interval_too_short", "interval_too_long"),
        ("local_event_debounce_ms", "interval_too_short", "interval_too_long"),
    )
    for key, too_low, too_high in checks:
        field = basic[key]
        if values[key] < field.min:
            errors[key] = too_low
        elif values[key] > field.max:
            errors[key] = too_high
    return errors
```

**Preserve the existing i18n error keys exactly as listed** — `extended_scan_interval` uses its own
`extended_interval_*` pair while the other three share `interval_too_short`/`interval_too_long`
(`custom_components/oig_cloud/config/steps.py:1414-1431`). Changing them would break translations; unifying the
two validation dialects is OQ-7, not this task.

**OQ-6 note:** `_sanitize_data_source_mode` already maps `"hybrid"` → `"local_only"`. The schema is built from the registered enum (`cloud_only`, `local_only`), so the UI never offers `"hybrid"`. If OQ-6 decides to rewrite stored `"hybrid"` values instead, this helper remains valid.

- [ ] **Step 4: Run tests**

Run: `.venv/bin/python -m pytest -q tests/test_config_options_flow.py -k "intervals"`

Expected: PASS.

- [ ] **Step 5: Lint + commit**

```bash
git add -u && git commit -m "refactor(options-flow): intervals step derives defaults/bounds from registry"
```

---

### Task 4: `_build_base_options` derives from the registry

**Files:**
- Modify: `custom_components/oig_cloud/config/steps.py` — `_build_base_options` (`:366-386`)
- Test: `tests/test_config_options_flow.py` (append)

> ### ⛔ Step 3 is partly BLOCKED on OQ-5 — do not silently ship two answers
>
> `_build_base_options` hard-codes `enable_statistics=True` and `enable_extended_sensors=True`
> (`custom_components/oig_cloud/config/steps.py:377`, `:383`) while the registry declares **both** `False`
> (`custom_components/oig_cloud/config_registry.py:117-118`). Both keys are already registry members in the
> `modules` section, and F1 §7 keeps them in the basic flow (`docs/redesign_2026_07/F1-DESIGN.md:150-152`).
>
> That is precisely the duplicate-default state P5 prohibits — one field, two live defaults, and REST validation
> and the options flow disagreeing about which wins (`docs/redesign_2026_07/DECISIONS.md:91-95`). **An override
> comment does not satisfy P5.** Deciding which default is canonical is a product call (it changes behaviour for
> existing entries that never stored the key), so this plan does not make it: implement the four undisputed flags
> from the registry, and leave these two on their flow literals **with the sub-task marked blocked** until OQ-5 is
> answered.
>
> `enable_chmu_warnings` is **not** affected — registry and flow both say `False`
> (`config_registry.py:119`, `steps.py:384`), so it is safe to derive now. Verified during incorporation; the
> spec-fidelity critic grouped it with the other two.

- [ ] **Step 1: Write the failing tests**

Ensure the symbol under test is imported (the draft's Tasks 4–6 use `WizardMixin` without importing it —
add this once, near the top of the file, matching whatever import style the file already uses):

```python
from custom_components.oig_cloud.config.steps import WizardMixin
```

```python
# tests/test_config_options_flow.py

EMPTY_BASE_EXPECTED = {
    "standard_scan_interval": 30,
    "extended_scan_interval": 300,
    "data_source_mode": "cloud_only",
    "local_proxy_stale_minutes": 10,
    "local_event_debounce_ms": 300,
    "enable_statistics": True,
    "enable_solar_forecast": False,
    "enable_battery_prediction": False,
    "enable_pricing": False,
    "enable_extended_sensors": True,
    "enable_chmu_warnings": False,
    "enable_dashboard": False,
}

FULL_BASE_EXPECTED = {
    **EMPTY_BASE_EXPECTED,
    "standard_scan_interval": 45,
    "extended_scan_interval": 600,
    "data_source_mode": "local_only",
    "local_proxy_stale_minutes": 5,
    "local_event_debounce_ms": 100,
    "enable_statistics": False,
    "enable_solar_forecast": True,
    "enable_battery_prediction": True,
    "enable_pricing": True,
    "enable_extended_sensors": False,
    "enable_chmu_warnings": True,
    "enable_dashboard": True,
}


def test_build_base_options_empty_parity():
    assert WizardMixin._build_base_options({}) == EMPTY_BASE_EXPECTED


def test_build_base_options_full_parity():
    assert WizardMixin._build_base_options({
        "standard_scan_interval": 45,
        "extended_scan_interval": 600,
        "data_source_mode": "local_only",
        "local_proxy_stale_minutes": 5,
        "local_event_debounce_ms": 100,
        "enable_statistics": False,
        "enable_solar_forecast": True,
        "enable_battery_prediction": True,
        "enable_pricing": True,
        "enable_extended_sensors": False,
        "enable_chmu_warnings": True,
        "enable_dashboard": True,
    }) == FULL_BASE_EXPECTED


def test_build_base_options_hybrid_maps_to_local_only():
    """Legacy stored 'hybrid' must not be emitted in the payload."""
    payload = WizardMixin._build_base_options({"data_source_mode": "hybrid"})
    assert payload["data_source_mode"] == "local_only"


def test_build_base_options_uses_registry_defaults():
    """If registry defaults change, output must follow — guards against hard-coded literals returning."""
    basic = fields_for_section("basic")
    field = basic["standard_scan_interval"]
    # Temporarily patch the registry default
    object.__setattr__(field, "default", 99)
    try:
        payload = WizardMixin._build_base_options({})
        assert payload["standard_scan_interval"] == 99
    finally:
        object.__setattr__(field, "default", 30)
```

- [ ] **Step 2: Run — verify FAIL**

Run: `.venv/bin/python -m pytest -q tests/test_config_options_flow.py::test_build_base_options_empty_parity tests/test_config_options_flow.py::test_build_base_options_full_parity tests/test_config_options_flow.py::test_build_base_options_hybrid_maps_to_local_only tests/test_config_options_flow.py::test_build_base_options_uses_registry_defaults`

Expected: FAIL (`test_build_base_options_uses_registry_defaults` fails because `_build_base_options` still hard-codes `30` at `custom_components/oig_cloud/config/steps.py:368`).

- [ ] **Step 3: Rewrite `_build_base_options` to read the registry**

```python
# custom_components/oig_cloud/config/steps.py:366

@staticmethod
def _build_base_options(wizard_data: Dict[str, Any]) -> Dict[str, Any]:
    """Build basic options from FIELD_REGISTRY."""
    basic = fields_for_section("basic")
    options: Dict[str, Any] = {}
    for key, field in basic.items():
        value = wizard_data.get(key, field.default)
        if key == "data_source_mode":
            value = WizardMixin._sanitize_data_source_mode(value)
        options[key] = value

    # Module flags whose registry default already matches the flow: derive them.
    modules = fields_for_section("modules")
    for key in (
        "enable_solar_forecast",
        "enable_battery_prediction",
        "enable_pricing",
        "enable_chmu_warnings",
    ):
        options[key] = wizard_data.get(key, modules[key].default)

    # BLOCKED on OQ-5: registry says False, the flow has always said True. Flipping these
    # would turn statistics/extended sensors OFF for every existing entry that never stored
    # the key, so behaviour is preserved until a human picks the canonical default. This is a
    # known, deliberate P5 exception — the only one in this plan. Do not "clean it up".
    options["enable_statistics"] = wizard_data.get("enable_statistics", True)
    options["enable_extended_sensors"] = wizard_data.get("enable_extended_sensors", True)

    return options
```

**Divergence audit (verified at tip `1177c9d9a` — every `modules` flag, registry vs flow):**

| key | registry default | flow literal | derivable? |
|---|---|---|---|
| `enable_solar_forecast` | `False` (`config_registry.py:113`) | `False` (`steps.py:378`) | ✔ derive |
| `enable_battery_prediction` | `False` (`:114`) | `False` (`steps.py:379-381`) | ✔ derive |
| `enable_pricing` | `False` (`:115`) | `False` (`steps.py:382`) | ✔ derive |
| `enable_chmu_warnings` | `False` (`:119`) | `False` (`steps.py:384`) | ✔ derive |
| `enable_statistics` | `False` (`:117`) | **`True`** (`steps.py:377`) | ⛔ OQ-5 |
| `enable_extended_sensors` | `False` (`:118`) | **`True`** (`steps.py:383`) | ⛔ OQ-5 |
| `enable_boiler` | `False` (`:116`) | *not emitted* | — leave alone |

Only two keys diverge, and `enable_boiler` is a registry member that `_build_base_options` deliberately does not
emit — **do not** add it while "deriving from the registry"; emitting a new key here would change what a save
writes, which this plan forbids.

- [ ] **Step 4: Run tests**

Run: `.venv/bin/python -m pytest -q tests/test_config_options_flow.py -k "base_options"`

Expected: PASS.

- [ ] **Step 5: Lint + commit**

```bash
git add -u && git commit -m "refactor(options-flow): _build_base_options derives basic fields from registry"
```

---

### Task 5: `_build_options_payload` stays consistent with the registry-derived base

**Files:**
- Modify: none (already covered by Task 4)
- Test: `tests/test_config_options_flow.py` (append)

> **This task is a regression guard, not a red/green TDD slice.** Its test is expected to pass the moment it is
> written, because Task 4 already did the work. That is the point: it pins `_build_options_payload`'s base
> section so a later refactor cannot drift it. Do not try to make it fail first.
>
> **`_build_options_payload` is an instance method** (`custom_components/oig_cloud/config/steps.py:354`), unlike
> `_build_base_options`, which is a `@staticmethod` (`:365`). Calling `WizardMixin._build_options_payload({})`
> passes `{}` as `self` and raises `TypeError` — drive it through an instance.

- [ ] **Step 1: Write the regression test**

```python
# tests/test_config_options_flow.py

def test_build_options_payload_base_parity():
    """_build_options_payload must include the same base keys as before."""
    entry = SimpleNamespace(entry_id="entry1", data={CONF_USERNAME: "demo"}, options={})
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    payload = flow._build_options_payload({})
    for key in EMPTY_BASE_EXPECTED:
        assert payload[key] == EMPTY_BASE_EXPECTED[key]
```

If `DummyOptionsFlow` does not expose `WizardMixin`'s methods, use the same instantiation the other
options-flow tests in this file use — verify the harness rather than assuming this snippet.

- [ ] **Step 2: Run — verify it PASSES**

Run: `.venv/bin/python -m pytest -q tests/test_config_options_flow.py::test_build_options_payload_base_parity`

Expected: PASS immediately (the guard holds after Task 4).

If it fails, fix `_build_options_payload` so it calls the registry-derived `_build_base_options` unchanged.

- [ ] **Step 3: No code change required**

Confirm `_build_options_payload` at `custom_components/oig_cloud/config/steps.py:354-363` still calls `self._build_base_options(wizard_data)`.

- [ ] **Step 4: Run tests**

Run: `.venv/bin/python -m pytest -q tests/test_config_options_flow.py::test_build_options_payload_base_parity`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -u && git commit -m "test(options-flow): parity guard for _build_options_payload base section"
```

---

### Task 6: Legacy mirror-pair regression guard + migration notes

**Files:**
- Test: `tests/test_config_options_flow.py` (append)
- Docs: this plan (migration notes below)

Background (verified at tip):
- `charge_rate_kw` ↔ `home_charge_rate` is a registered mirror pair in the `battery` section (`custom_components/oig_cloud/config_registry.py:125-126`, `custom_components/oig_cloud/config_merge.py:32-33`).
- `min_capacity_percent` ↔ `planning_min_percent` is **not** registered anywhere (`RESEARCH-basic-field-inventory.md` H2).
- The round-2 review found that sparse options (e.g. only `home_charge_rate` present at flow open) still lose
  concurrent REST writes because `_build_options_payload` manufactures the missing alias and the delta filter
  treats it as user intent (`/repos/wt-oig-f1/brief-critique/REVIEW-terra-round2.md`, MAJOR "Sparse or
  legacy-mirror options").

  **That path is outside this repo** — it is a review artifact in a sibling worktree, not a tracked file, so it
  will not resolve for a reader of this plan alone. The reasoning below therefore does not depend on it; it
  stands on the code, which anyone can check:

  `_build_options_payload` emits a value for **every** basic key regardless of whether the entry had one, and
  the save-time delta filter (`custom_components/oig_cloud/config/steps.py:3564-3568`) treats
  `k not in self._options_at_open` as a user delta. So a key absent at flow open but written concurrently via
  REST is overwritten by a manufactured default. That is the bug class; the guard below is what stops it
  reaching the basic section.

Plan 2 must not introduce this bug class into the basic section. The fix is to pre-seed the basic keys into the `_options_at_open` snapshot in `OigCloudOptionsFlowHandler.__init__`, so a generated registry default for a key that already existed conceptually is not treated as a user delta.

- [ ] **Step 1: Write the failing/regression tests**

```python
# tests/test_config_options_flow.py

def test_build_base_options_excludes_battery_mirror_keys():
    """Basic payload must never emit battery/solar/pricing keys — those belong to other builders."""
    payload = WizardMixin._build_base_options({})
    assert "charge_rate_kw" not in payload
    assert "home_charge_rate" not in payload
    assert "min_capacity_percent" not in payload
    assert "planning_min_percent" not in payload
    assert "spot_pricing_model" not in payload
    assert "boiler_volume_l" not in payload


async def test_options_flow_save_does_not_restore_stale_basic_defaults():
    """REGRESSION for the sparse-mirror bug class applied to basic fields.

    If a basic key is absent from entry.options at flow open but was set by a
    concurrent REST write, saving an unrelated options section must not
    overwrite it with a registry default.
    """
    entry = SimpleNamespace(
        entry_id="entry1",
        data={CONF_USERNAME: "demo"},
        options={"standard_scan_interval": 30},  # no extended_scan_interval
    )
    flow = DummyOptionsFlow(entry)
    flow.hass = DummyHass()

    # Simulate a concurrent REST write adding the missing key
    entry.options = {
        **entry.options,
        "extended_scan_interval": 900,
    }

    flow._wizard_data["standard_scan_interval"] = 60
    flow._wizard_data["data_source_mode"] = "cloud_only"
    flow._wizard_data["local_proxy_stale_minutes"] = 10
    flow._wizard_data["local_event_debounce_ms"] = 300
    flow._wizard_data["enable_dashboard"] = False

    # Only standard_scan_interval changed; extended_scan_interval is absent
    # from entry.options at open but is conceptually present via registry default.
    # It must NOT be treated as a user delta.
    result = await flow.async_step_wizard_summary({})
    assert result["type"] == "abort"
    assert result["reason"] == "reconfigure_successful"
    options = flow.hass.config_entries.updated[0][1]
    assert options["standard_scan_interval"] == 60
    assert options["extended_scan_interval"] == 900
```

- [ ] **Step 2: Run — verify FAIL/PASS**

Run: `.venv/bin/python -m pytest -q tests/test_config_options_flow.py::test_build_base_options_excludes_battery_mirror_keys tests/test_config_options_flow.py::test_options_flow_save_does_not_restore_stale_basic_defaults`

Expected:
- `test_build_base_options_excludes_battery_mirror_keys` — PASS immediately.
- `test_options_flow_save_does_not_restore_stale_basic_defaults` — FAIL before the pre-seed fix because `_build_options_payload` emits `extended_scan_interval=300` and the delta filter (`custom_components/oig_cloud/config/steps.py:3564-3568`) treats the missing key as a new delta, overwriting the concurrent REST value `900`.

- [ ] **Step 3: Pre-seed basic keys into the options snapshot**

In `custom_components/oig_cloud/config/steps.py`, inside `OigCloudOptionsFlowHandler.__init__` (`custom_components/oig_cloud/config/steps.py:3371-3400`), after reading `backend_options` and before assigning `self._options_at_open` (`:3391`), add:

```python
# Pre-seed basic keys into the snapshot so that registry defaults are not
# treated as user deltas for keys that predate the registry.
basic = fields_for_section("basic")
for key, field in basic.items():
    backend_options.setdefault(key, field.default)
```

This changes only the in-memory snapshot; it does not persist anything until the user actually changes a value. The existing delta filter then works correctly for basic keys because `_options_at_open` contains the same registry default that `_build_base_options` will emit.

**Scope limit:** this only protects the basic section. The existing `charge_rate_kw`/`home_charge_rate` and `min_capacity_percent`/`planning_min_percent` mirror issues remain for Plan 3/4.

- [ ] **Step 4: Run tests**

Run: `.venv/bin/python -m pytest -q tests/test_config_options_flow.py -k "mirror or sparse or stale_basic"`

Expected: PASS.

- [ ] **Step 5: Lint + commit**

```bash
git add -u && git commit -m "fix(options-flow): pre-seed basic keys so registry defaults do not overwrite concurrent writes"
```

---

### Task 7: Full gate + integration sanity

- [ ] **Step 1: Run the full backend gate**

Run:
```bash
.venv/bin/flake8 --max-line-length=120 \
  custom_components/oig_cloud/config_registry.py \
  custom_components/oig_cloud/config_merge.py \
  custom_components/oig_cloud/api/ha_rest_api.py \
  custom_components/oig_cloud/config/steps.py

.venv/bin/mypy --ignore-missing-imports --explicit-package-bases \
  custom_components/oig_cloud/config_registry.py \
  custom_components/oig_cloud/config_merge.py \
  custom_components/oig_cloud/api/ha_rest_api.py \
  custom_components/oig_cloud/config/steps.py

.venv/bin/python -m pytest -q tests/
```

Expected: all green.

- [ ] **Step 2: Commit any straggler fixes; final commit**

```bash
git add -u && git commit -m "test(registry): full gate green for Plan 2 (basic fields in registry)"
```

---

## Migration notes

What happens to an entry that predates the new basic keys?

1. **Quick setup (`custom_components/oig_cloud/config/steps.py:3270-3294`)** already seeds all 6 basic keys with their flow defaults, so new entries are unaffected.
2. **Older entries** that lack one or more basic keys continue to work because runtime reads have fallbacks (`custom_components/oig_cloud/__init__.py:956-961`, `custom_components/oig_cloud/core/data_source.py:95-121`).
3. **First options-flow save** on an older entry writes the 6 basic keys via `merge_entry_options` with registry defaults (or the user's changed values). Because merge preserves foreign keys, no dashboard-only values are lost.
4. **REST `module_config` GET** now exposes the `basic` section. FE must tolerate a missing key by using the registry `default` (the endpoint already does this for other sections at `custom_components/oig_cloud/api/ha_rest_api.py:1220`).
5. **Legacy `data_source_mode="hybrid"`** is mapped to `"local_only"` by the flow (`custom_components/oig_cloud/config/steps.py:91-95`) and by runtime (`custom_components/oig_cloud/core/data_source.py:96-100`). Until OQ-6 is closed, consider a one-time migration in Plan 4 to rewrite stored `"hybrid"` values.
6. **Module flags** (`enable_statistics`, `enable_extended_sensors`) keep their current flow defaults (`True`) in `_build_base_options` even though the registry says `False`. This preserves behaviour for existing entries until OQ-5 is resolved.

## What this plan does NOT fix

Stated plainly so nobody reads Plan 2 as closing more than it does:

- **The `charge_rate_kw` ↔ `home_charge_rate` and `min_capacity_percent` ↔ `planning_min_percent` mirror
  data-loss paths stay open after Plan 2.** The Task 6 guard pre-seeds **basic** keys only. The battery mirror
  pair is registered (`custom_components/oig_cloud/config_registry.py:125-126`,
  `custom_components/oig_cloud/config_merge.py:32-33`) and the `min_capacity_percent` pair is registered nowhere
  at all — both remain exposed to the same sparse-options bug class this plan guards the basic section against.
  That is by design (Plan 3/4), not an oversight, but it means the sparse-mirror bug is **not** eliminated by
  Plan 2.
- **P5 is not fully satisfied for the module flags** — see OQ-5. Two keys keep a duplicate default.
- **`data_source_mode`'s REST boundary is unresolved** — see OQ-6.
- **No deletions.** Dead keys, `_MODULE_CONFIG_FIELDS`, and the FE `*_FIELDS` lists all survive Plan 2 by
  mandate; they are Plan 4's.

---

## Open questions for the human

These questions were intentionally **not** resolved in this plan. Where a task depends on one, the task/sub-task is marked above.

### OQ-1 — `enable_cloud_notifications`: basic field or dead key?
It is read at runtime with default `True` (`custom_components/oig_cloud/__init__.py:1128`, `custom_components/oig_cloud/coordinator.py:569`), written only by quick-setup (`custom_components/oig_cloud/config/steps.py:3278`), has full i18n strings (`custom_components/oig_cloud/strings.json:74`, `:84`, `custom_components/oig_cloud/translations/en.json:202`, `:212`), but is **not** in `_build_base_options` and has no form. Its i18n sibling `notifications_scan_interval` has zero readers (`RESEARCH-basic-field-inventory.md` H3, §4).

**Options:**
- Add it as a 7th basic field (i18n is already written).
- Remove both keys and their strings in Plan 4 (they appear to be leftovers from a removed form).

**Impact on this plan:** none, unless the human chooses to add it — then Task 1 expands by one field and Task 3/4 include it.

### OQ-2 — Do `username`/`password`/`box_id` belong in an options-keyed registry?
Credentials live in `entry.data` (`custom_components/oig_cloud/config/steps.py:3272-3273`) but are read from either store (`custom_components/oig_cloud/__init__.py:952-953`). `box_id` is machine-derived and self-healed by runtime (`custom_components/oig_cloud/sensor.py:442-443`, `custom_components/oig_cloud/switch.py:190-191`). The registry's read/write paths assume `entry.options` (`custom_components/oig_cloud/api/ha_rest_api.py:1212`, `config_merge.py`).

**The spec is genuinely ambiguous here — this plan does not settle it.** F1 §7's retained list opens with
"credentials+box" (`docs/redesign_2026_07/F1-DESIGN.md:150`), so they are explicitly **named** by §7 — an earlier
draft of this plan asserted they were "out of §7 scope", which is simply false. But §7's list says what the
**config flow** keeps, whereas §6's registry mandate is written for the **options flow** ("Options flow
(zbytkový basic) čte tentýž registr", `:143`). Credentials are written by the config flow into `entry.data`, are
never edited in the options flow, and the registry's read/write paths assume `entry.options`
(`custom_components/oig_cloud/api/ha_rest_api.py:1212`, `config_merge.py`). Whether P5's "all configuration
fields, one definition" reaches a field the options flow never touches is a question about intent, not code.

**Options:**
- Leave credentials out of the registry (current de-facto state, and what this plan assumes).
- Move credentials into options and mark `password` `secret=True` (needs a migration **and** a security review —
  a password on the `module_config` GET surface would be a disclosure, so this option is not free).
- Teach the registry about `entry.data` as a second backing store, keeping credentials out of the REST surface.

**Impact on this plan:** none as written — Plan 2 registers no credential field, so nothing here blocks. If the
answer is either of the latter two, that is a **new task in a later plan** (with the secret-non-disclosure test
it implies), not a change to Plan 2's six fields.

### OQ-3 — Confirm `live_data_enabled` is consent, not config
It is never persisted; it only gates the step at `custom_components/oig_cloud/config/steps.py:910` and setup re-verifies against the live API (`custom_components/oig_cloud/__init__.py:976`).

**Impact on this plan:** none; do not register it.

### OQ-4 — Pricing keys cannot get mechanical registry defaults
`_map_pricing_to_backend` (`custom_components/oig_cloud/config/steps.py:270-352`) writes a different key set per scenario. A flat `Field` cannot express conditional existence.

**Impact on this plan:** none; pricing is out of Plan 2 scope.

### OQ-5 — Which default wins for `enable_statistics` / `enable_extended_sensors`? ⛔ BLOCKS a Task 4 sub-step
Registry says `False` (`custom_components/oig_cloud/config_registry.py:117-118`); the flow and every runtime read
site say `True` (`custom_components/oig_cloud/config/steps.py:377`, `:383`). Adopting the registry default flips
statistics and extended sensors **off** for every existing entry that never stored the key — a silent
behaviour change for real users.

These are the only two divergent flags; the other four `modules` flags match and Task 4 derives them (see the
divergence audit there).

**Options:**
- **Registry follows the flow** — change the two registry defaults to `True`. One-line fix, no user-visible
  change, and P5 is satisfied immediately. *Recommended*, unless `False` was a deliberate choice.
- **Flow follows the registry** — needs a migration that writes `True` for existing entries first, or users lose
  sensors on upgrade.

**Impact on this plan:** Task 4 leaves these two on their flow literals behind a `BLOCKED on OQ-5` marker — a
deliberate, documented P5 exception rather than a silent one. Until OQ-5 is answered, Plan 2 **cannot** claim
the §6/P5 gap is fully closed; it closes it for the six basic fields and four of the six module flags.

### OQ-6 — Should `data_source_mode`'s registry enum include `hybrid`? ⛔ BLOCKS the Task 2 REST exposure
Entries may hold the legacy `"hybrid"` (`custom_components/oig_cloud/core/data_source.py:31`, `:96-100`), and
`coerce_value` rejects values outside `enum` (`custom_components/oig_cloud/config_registry.py:65-66`).

**Both directions of the REST surface are affected — this is not POST-only:**
- **GET** echoes the raw stored value (`custom_components/oig_cloud/api/ha_rest_api.py:1220`), so it would hand a
  client a `"hybrid"` the registry calls invalid.
- **POST** of that same value 400s. GET→POST round-trip is therefore broken for legacy entries.

*Not established:* whether any production entry actually stores `"hybrid"`. The code supports it; nobody has
queried real data. **That query is the cheapest way to close this** — if no entry holds it, option 3 is free.

**Options:**
- Keep enum `("cloud_only", "local_only")` and sanitize `"hybrid"` at the boundary, GET **and** POST — the UI
  already never offers it (`_sanitize_data_source_mode`, `custom_components/oig_cloud/config/steps.py:91-95`).
- Add `"hybrid"` to the enum and teach the UI never to offer it — keeps round-trip honest, but re-blesses a value
  the design wants gone.
- Migrate stored `"hybrid"` → `"local_only"` once, then keep the two-value enum. *Recommended if the data
  supports it* — it is the only option that leaves no legacy value anywhere.

**Impact on this plan:**
- Task 1 registers enum `("cloud_only", "local_only")` — unblocked either way.
- Task 2's `data_source_mode` REST exposure is **blocked**; ship the other five basic fields, or filter this one
  key out of the `basic` section, until this is answered.
- Task 3 relies on the existing `_sanitize_data_source_mode` in the flow — unaffected.

### OQ-7 — Bounds validation messages live in two dialects
The flow returns i18n error keys (`custom_components/oig_cloud/config/steps.py:1414-1431`); `coerce_value` raises English `ValueError` strings (`custom_components/oig_cloud/config_registry.py:56-59`).

**Impact on this plan:** Task 3 keeps the flow's i18n validators for the options path. REST POST continues to use `coerce_value` English messages. If OQ-7 decides to unify, add an `error_key` concept to `Field` in a later plan.

---

## Self-review notes

- Spec coverage: F1 §7 "intervaly, zdroj dat, checkbox enable_dashboard" ✔; K2f merge save ✔. **P5 single
  registry — partial**, deliberately: the six basic fields and four of the six module flags derive from the
  registry; `enable_statistics`/`enable_extended_sensors` keep a duplicate default pending OQ-5, and
  `data_source_mode`'s REST boundary pends OQ-6. Plan 2 narrows the §6/P5 gap; it does not close it while those
  two questions are open.
- No deletions: Plan 2 only adds the `basic` section and refactors derivation; dead keys stay for Plan 4 (`RESEARCH-basic-field-inventory.md` §4).
- No behaviour change: parity tests (`test_build_base_options_empty_parity`, `test_build_base_options_full_parity`) guard the exact `_build_base_options` output, and `test_intervals_error_path_repopulates_user_values` guards the intervals **error path** — the one place where the registry refactor could silently discard user input (see the key-dialect trap in Task 3).
- Legacy mirrors: basic section explicitly excludes battery/solar/pricing keys; sparse-options regression test prevents the round-2 bug class from recurring.
- Verified references (all re-checked at tip `1177c9d9a`):
  - `custom_components/oig_cloud/config_registry.py:16` (`Field`), `:39` (`coerce_value`), `:74` (`_register`), `:81` (`fields_for_section`), `:85` (`registry_as_api_dict`).
  - `custom_components/oig_cloud/api/ha_rest_api.py:1214` (GET section tuple), `:1220` (defaulting GET read), `:1243` (`section_fields`), `:1255` (unknown field error), `:1270` (`merge_entry_options`).
  - `custom_components/oig_cloud/config/steps.py:354` (`_build_options_payload`, **instance method**), `:365-366` (`_build_base_options`, **@staticmethod**), `:1385` (`_collect_interval_values`), `:1405` (`_validate_interval_values`), `:1454` (`_show_intervals_form`), `:3276-3290` (quick_setup defaults), `:3391` (`_options_at_open` snapshot), `:3564-3568` (delta filter).
  - `custom_components/oig_cloud/core/data_source.py:31` (`DATA_SOURCE_HYBRID`), `:95-100` (hybrid mapping).
  - `custom_components/oig_cloud/__init__.py:86-88` (backfill defaults), `:956-961` (interval reads with fallback).
