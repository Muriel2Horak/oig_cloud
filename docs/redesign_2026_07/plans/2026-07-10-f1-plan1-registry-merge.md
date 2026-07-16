# F1 Plan 1/4 — Config Field Registry + Shared Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One canonical registry of all configuration fields (P5) + one shared merge-save path that ends the silent data-loss bug (options-flow full-replace vs REST merge).

**Architecture:** New `config_registry.py` holds every field definition once (type, bounds, section, scope, i18n keys, secret/mirror/reload flags). New `config_merge.py` is the ONLY way options get written (merge, never replace). REST `module_config` GET/POST re-wired to the registry; new `GET /config_registry` endpoint serves field definitions to the FE; options-flow save switched from full-replace to merge.

**Tech Stack:** Python 3.12, Home Assistant custom integration, pytest (existing harness: `.venv/bin/python -m pytest`), flake8 (max-line-length=120), mypy (`--ignore-missing-imports --explicit-package-bases`).

**Spec:** `docs/redesign_2026_07/F1-DESIGN.md` §6 + DECISIONS P5, K2f. Do NOT delete any existing field/key in this plan (deletion = Plan 4).

**Worklog convention:** commit after every task; all commits end with:
```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

---

### Task 1: `Field` dataclass + registry core + coercion

**Files:**
- Create: `custom_components/oig_cloud/config_registry.py`
- Test: `tests/test_config_registry.py`

- [x] **Step 1: Write the failing tests**

```python
# tests/test_config_registry.py
"""P5 field registry: one canonical definition per config field."""
from __future__ import annotations

import pytest

from custom_components.oig_cloud.config_registry import (
    FIELD_REGISTRY,
    Field,
    coerce_value,
    fields_for_section,
    registry_as_api_dict,
)


def test_field_defaults_are_sane():
    f = Field(key="x", section="battery", type=float, default=1.0, min=0.0, max=10.0)
    assert f.scope == "premium"
    assert f.secret is False
    assert f.mirror is None
    assert f.label == "field.x.label"  # auto-derived i18n key
    assert f.hint == "field.x.hint"


def test_coerce_bool():
    f = Field(key="b", section="modules", type=bool, default=False)
    assert coerce_value(f, True) is True
    assert coerce_value(f, "true") is True
    assert coerce_value(f, "off") is False
    with pytest.raises(ValueError):
        coerce_value(f, "banana")


def test_coerce_float_bounds():
    f = Field(key="r", section="battery", type=float, default=2.8, min=0.5, max=10.0)
    assert coerce_value(f, "3.5") == 3.5
    with pytest.raises(ValueError):
        coerce_value(f, 0.1)   # below min
    with pytest.raises(ValueError):
        coerce_value(f, 11)    # above max


def test_coerce_enum():
    f = Field(key="p", section="solar", type=str, enum=("forecast_solar", "solcast"))
    assert coerce_value(f, "solcast") == "solcast"
    with pytest.raises(ValueError):
        coerce_value(f, "nasa")


def test_registry_keys_match_field_keys():
    for key, field in FIELD_REGISTRY.items():
        assert key == field.key
        assert field.section in ("modules", "battery", "solar", "boiler", "basic")


def test_fields_for_section_filters():
    battery = fields_for_section("battery")
    assert battery and all(f.section == "battery" for f in battery.values())


def test_api_dict_never_leaks_secret_defaults():
    api = registry_as_api_dict()
    for key, spec in api.items():
        if spec.get("secret"):
            assert "default" not in spec or spec["default"] in (None, "")
        assert "label" in spec and "section" in spec and "type" in spec
```

- [x] **Step 2: Run tests to verify they fail**

Run: `cd /repos/oig-cloud && .venv/bin/python -m pytest -q tests/test_config_registry.py`
Expected: FAIL with `ModuleNotFoundError: ... config_registry`

- [x] **Step 3: Implement `config_registry.py` (core only — fields land in Tasks 2–3)**

```python
# custom_components/oig_cloud/config_registry.py
"""Canonical registry of all configuration fields (F1 P5).

Every user-configurable option is defined here EXACTLY ONCE. The REST API,
the dashboard forms (served via /config_registry) and the HA options flow
all derive validation and rendering from this registry — never from local
field lists.
"""
from __future__ import annotations

from dataclasses import dataclass, field as dc_field
from typing import Any, Dict, Optional, Tuple

_TRUE = {"true", "1", "on", "yes"}
_FALSE = {"false", "0", "off", "no"}


@dataclass(frozen=True)
class Field:
    key: str
    section: str                       # basic|modules|battery|solar|boiler
    type: type                         # bool|int|float|str
    default: Any = None
    min: Optional[float] = None
    max: Optional[float] = None
    step: Optional[float] = None
    enum: Optional[Tuple[str, ...]] = None
    scope: str = "premium"             # basic|premium|advanced
    secret: bool = False               # write-only via API; never echoed
    mirror: Optional[str] = None       # legacy alias key kept in sync on write
    reload_on_change: bool = False     # entry reload required (e.g. boiler)
    label: str = ""                    # i18n key (K2f: keys, not _cs strings)
    hint: str = ""                     # i18n key

    def __post_init__(self) -> None:
        if not self.label:
            object.__setattr__(self, "label", f"field.{self.key}.label")
        if not self.hint:
            object.__setattr__(self, "hint", f"field.{self.key}.hint")


def coerce_value(f: Field, raw: Any) -> Any:
    """Coerce+validate a raw (possibly string) value against a Field."""
    if f.type is bool:
        if isinstance(raw, bool):
            return raw
        if isinstance(raw, str):
            low = raw.strip().lower()
            if low in _TRUE:
                return True
            if low in _FALSE:
                return False
        raise ValueError(f"{f.key}: expected boolean")
    if f.type in (int, float):
        try:
            value = f.type(float(raw))
        except (TypeError, ValueError) as err:
            raise ValueError(f"{f.key}: expected {f.type.__name__}") from err
        if f.min is not None and value < f.min:
            raise ValueError(f"{f.key}: below minimum {f.min}")
        if f.max is not None and value > f.max:
            raise ValueError(f"{f.key}: above maximum {f.max}")
        return value
    # str
    value = "" if raw is None else str(raw)
    if f.enum is not None and value not in f.enum:
        raise ValueError(f"{f.key}: must be one of {f.enum}")
    return value


# Populated by _build_registry() below; Tasks 2-3 add the actual fields.
FIELD_REGISTRY: Dict[str, Field] = {}


def _register(*fields: Field) -> None:
    for f in fields:
        if f.key in FIELD_REGISTRY:
            raise RuntimeError(f"duplicate registry key {f.key}")
        FIELD_REGISTRY[f.key] = f


def fields_for_section(section: str) -> Dict[str, Field]:
    return {k: f for k, f in FIELD_REGISTRY.items() if f.section == section}


def registry_as_api_dict() -> Dict[str, Dict[str, Any]]:
    """Serializable field definitions for the FE (no secret defaults)."""
    out: Dict[str, Dict[str, Any]] = {}
    for key, f in FIELD_REGISTRY.items():
        spec: Dict[str, Any] = {
            "section": f.section,
            "type": f.type.__name__,
            "scope": f.scope,
            "label": f.label,
            "hint": f.hint,
        }
        if f.secret:
            spec["secret"] = True
        else:
            spec["default"] = f.default
        for attr in ("min", "max", "step"):
            if getattr(f, attr) is not None:
                spec[attr] = getattr(f, attr)
        if f.enum is not None:
            spec["enum"] = list(f.enum)
        if f.reload_on_change:
            spec["reload_on_change"] = True
        out[key] = spec
    return out
```

- [x] **Step 4: Run tests**

Run: `.venv/bin/python -m pytest -q tests/test_config_registry.py`
Expected: `test_registry_keys_match_field_keys` and `test_fields_for_section_filters` FAIL
(empty registry) — the rest PASS. That is correct for this task; mark the two with
`@pytest.mark.skipif(not FIELD_REGISTRY, reason="fields land in Task 2")` so the suite is green:

```python
requires_fields = pytest.mark.skipif(not FIELD_REGISTRY, reason="fields land in Task 2")

@requires_fields
def test_registry_keys_match_field_keys(): ...

@requires_fields
def test_fields_for_section_filters(): ...
```

Run again — Expected: PASS (2 skipped).

- [x] **Step 5: Lint + commit**

Run: `.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/config_registry.py tests/test_config_registry.py && .venv/bin/mypy --ignore-missing-imports --explicit-package-bases custom_components/oig_cloud/config_registry.py`

```bash
git add custom_components/oig_cloud/config_registry.py tests/test_config_registry.py
git commit -m "feat(registry): Field dataclass, coercion and registry core (F1 P5)"
```

---

### Task 2: Port `modules` + `battery` sections into the registry

**Files:**
- Modify: `custom_components/oig_cloud/config_registry.py` (append at end)
- Reference (read-only, source of truth being ported): `custom_components/oig_cloud/api/ha_rest_api.py` — `_MODULE_CONFIG_FIELDS` dict around line 1070–1093 and `_MODULE_CONFIG_MIRRORS` (`{"charge_rate_kw": "home_charge_rate"}`)
- Test: `tests/test_config_registry.py` (append)

- [x] **Step 1: Write the failing test**

```python
def test_modules_and_battery_sections_ported():
    modules = fields_for_section("modules")
    battery = fields_for_section("battery")
    # parity with the legacy _MODULE_CONFIG_FIELDS whitelist
    assert set(modules) == {
        "enable_solar_forecast", "enable_battery_prediction", "enable_pricing",
        "enable_boiler", "enable_statistics", "enable_extended_sensors",
        "enable_chmu_warnings",
    }
    assert {"charge_rate_kw", "expensive_percentile", "battery_comfort_soc_percent",
            "balancing_enabled", "cheap_window_percentile"} <= set(battery)
    assert battery["charge_rate_kw"].mirror == "home_charge_rate"
    assert battery["charge_rate_kw"].min == 0.5 and battery["charge_rate_kw"].max == 10.0
    assert battery["expensive_percentile"].min == 0.5 and battery["expensive_percentile"].max == 0.95
    assert battery["battery_comfort_soc_percent"].min == 0.0 and battery["battery_comfort_soc_percent"].max == 95.0
```

- [x] **Step 2: Run test — verify FAIL** (`assert set(modules) == ...` with empty set)

- [x] **Step 3: Append field definitions**

```python
# --- section: modules -------------------------------------------------------
_register(
    Field("enable_solar_forecast", "modules", bool, default=False),
    Field("enable_battery_prediction", "modules", bool, default=False),
    Field("enable_pricing", "modules", bool, default=False),
    Field("enable_boiler", "modules", bool, default=False),
    Field("enable_statistics", "modules", bool, default=True),
    Field("enable_extended_sensors", "modules", bool, default=True),
    Field("enable_chmu_warnings", "modules", bool, default=False),
)

# --- section: battery -------------------------------------------------------
_register(
    Field("auto_mode_switch_enabled", "battery", bool, default=False),
    Field("charge_rate_kw", "battery", float, default=2.8, min=0.5, max=10.0,
          step=0.1, mirror="home_charge_rate"),
    Field("expensive_percentile", "battery", float, default=0.70, min=0.5, max=0.95),
    Field("battery_comfort_soc_percent", "battery", float, default=50.0, min=0.0,
          max=95.0, step=5.0),
    Field("balancing_enabled", "battery", bool, default=True),
    Field("balancing_interval_days", "battery", int, default=7, min=3, max=30),
    Field("balancing_hold_hours", "battery", int, default=3, min=1, max=12),
    Field("balancing_opportunistic_threshold", "battery", float, default=1.1,
          min=0.5, max=5.0),
    Field("balancing_economic_threshold", "battery", float, default=2.5,
          min=0.5, max=10.0),
    Field("cheap_window_percentile", "battery", int, default=30, min=5, max=80),
)
```

Note: positional args order is `key, section, type` (matches the dataclass); everything else keyword.

- [x] **Step 4: Run the whole registry test file — PASS.** Also remove the `skipif` markers added in Task 1 (registry is non-empty now) and re-run: PASS.

- [x] **Step 5: Lint + commit**

```bash
git add -u && git commit -m "feat(registry): port modules + battery sections from _MODULE_CONFIG_FIELDS"
```

---

### Task 3: Port `solar` + `boiler` sections into the registry

**Files:**
- Modify: `custom_components/oig_cloud/config_registry.py` (append)
- Reference: `_MODULE_CONFIG_FIELDS` sections `solar` (line ~1094) and `boiler` in `api/ha_rest_api.py`; `_SECRET_FIELDS` set (grep for it — contains `solar_forecast_api_key`, `solcast_api_key`)
- Test: `tests/test_config_registry.py` (append)

- [x] **Step 1: Write the failing test**

```python
def test_solar_and_boiler_sections_ported():
    solar = fields_for_section("solar")
    boiler = fields_for_section("boiler")
    assert solar["solar_forecast_provider"].enum == ("forecast_solar", "solcast")
    assert solar["solar_forecast_api_key"].secret is True
    assert solar["solcast_api_key"].secret is True
    assert solar["solar_forecast_latitude"].min == -90.0
    assert solar["solar_forecast_string1_azimuth"].min == -180
    # boiler: parity spot-checks (full parity asserted in Task 4 REST test)
    assert "boiler_target_temp_c" in boiler
    assert boiler["boiler_volume_l"].reload_on_change is True
```

- [x] **Step 2: Run — verify FAIL** (KeyError `solar_forecast_provider`)

- [x] **Step 3: Append definitions.** Port EVERY key from `_MODULE_CONFIG_FIELDS["solar"]` and `_MODULE_CONFIG_FIELDS["boiler"]` 1:1 (same types/ranges/enums — open the file and transcribe; do not invent). Mark `solar_forecast_api_key`, `solcast_api_key` with `secret=True`. Mark ALL boiler fields `reload_on_change=True` (the existing POST handler reloads the entry for the whole boiler section — preserve that behavior per-field).

```python
# --- section: solar ---------------------------------------------------------
_register(
    Field("solar_forecast_provider", "solar", str, default="forecast_solar",
          enum=("forecast_solar", "solcast")),
    Field("solar_forecast_mode", "solar", str, default="daily_optimized",
          enum=("hourly", "every_4h", "daily_optimized")),
    Field("solar_forecast_api_key", "solar", str, default="", secret=True),
    Field("solcast_api_key", "solar", str, default="", secret=True),
    Field("solcast_site_id", "solar", str, default=""),
    Field("solar_forecast_latitude", "solar", float, min=-90.0, max=90.0, step=0.0001),
    Field("solar_forecast_longitude", "solar", float, min=-180.0, max=180.0, step=0.0001),
    Field("solar_forecast_string1_enabled", "solar", bool, default=True),
    Field("solar_forecast_string1_kwp", "solar", float, default=5.0, min=0.1, max=50.0, step=0.1),
    Field("solar_forecast_string1_declination", "solar", int, default=35, min=0, max=90),
    Field("solar_forecast_string1_azimuth", "solar", int, default=0, min=-180, max=180),
    Field("solar_forecast_string2_enabled", "solar", bool, default=False),
    Field("solar_forecast_string2_kwp", "solar", float, default=5.0, min=0.1, max=50.0, step=0.1),
    Field("solar_forecast_string2_declination", "solar", int, default=35, min=0, max=90),
    Field("solar_forecast_string2_azimuth", "solar", int, default=180, min=-180, max=180),
)

# --- section: boiler --------------------------------------------------------
# Transcribe EVERY key from _MODULE_CONFIG_FIELDS["boiler"] with reload_on_change=True.
# (List in the source is authoritative; includes boiler_volume_l, boiler_target_temp_c,
# boiler_deadline_time, boiler_temp_sensor_top/bottom, boiler_thermal_arbitrage_enabled,
# boiler_max_temp_c, boiler_alt_power_kw, circulation and legionella fields, …)
```

- [x] **Step 4: Run test file — PASS.** Add a parity guard test so nothing was missed:

```python
def test_registry_covers_legacy_whitelist():
    from custom_components.oig_cloud.api.ha_rest_api import _MODULE_CONFIG_FIELDS
    for section, fields in _MODULE_CONFIG_FIELDS.items():
        for key in fields:
            assert key in FIELD_REGISTRY, f"missing {section}.{key} in registry"
```

Run: PASS (fix any missing keys it reports).

- [x] **Step 5: Lint + commit**

```bash
git add -u && git commit -m "feat(registry): port solar + boiler sections (parity-guarded against legacy whitelist)"
```

---

### Task 4: Shared merge helper `config_merge.py`

**Files:**
- Create: `custom_components/oig_cloud/config_merge.py`
- Test: `tests/test_config_merge.py`

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_config_merge.py
"""K2f: ONE merge path for all option writes. Never full-replace."""
from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

from custom_components.oig_cloud.config_merge import merge_entry_options


def _entry(options):
    return SimpleNamespace(entry_id="e1", options=options)


def _hass():
    hass = SimpleNamespace(config_entries=SimpleNamespace(async_update_entry=MagicMock()))
    return hass


def test_merge_preserves_foreign_keys():
    """REGRESSION for the full-replace bug: dashboard-only keys must survive."""
    hass = _hass()
    entry = _entry({
        "boiler_thermal_arbitrage_enabled": True,   # dashboard-only orphan
        "box_id": "2206237016",                     # migration-written orphan
        "charge_rate_kw": 2.8,
    })
    merge_entry_options(hass, entry, {"charge_rate_kw": 2.6})
    (_, ), kwargs = hass.config_entries.async_update_entry.call_args
    new = kwargs["options"]
    assert new["boiler_thermal_arbitrage_enabled"] is True
    assert new["box_id"] == "2206237016"
    assert new["charge_rate_kw"] == 2.6


def test_merge_applies_registry_mirrors():
    hass = _hass()
    entry = _entry({"home_charge_rate": 2.8, "charge_rate_kw": 2.8})
    merge_entry_options(hass, entry, {"charge_rate_kw": 3.0})
    new = hass.config_entries.async_update_entry.call_args.kwargs["options"]
    assert new["home_charge_rate"] == 3.0  # mirror kept in sync


def test_merge_reload_flag():
    hass = _hass()
    entry = _entry({})
    merge_entry_options(hass, entry, {"boiler_target_temp_c": 55.0})
    new = hass.config_entries.async_update_entry.call_args.kwargs["options"]
    assert new["_needs_reload"] is True  # boiler field => reload requested


def test_merge_no_updates_is_noop():
    hass = _hass()
    entry = _entry({"a": 1})
    merge_entry_options(hass, entry, {})
    hass.config_entries.async_update_entry.assert_not_called()
```

- [ ] **Step 2: Run — verify FAIL** (`ModuleNotFoundError: config_merge`)

- [ ] **Step 3: Implement**

```python
# custom_components/oig_cloud/config_merge.py
"""The ONLY sanctioned way to write config-entry options (F1 K2f).

Merges updates into the existing options dict — NEVER replaces it — so values
written by other surfaces (dashboard REST, migrations, runtime flags) survive
every save. Applies registry mirrors and per-field reload flags.
"""
from __future__ import annotations

import logging
from typing import Any, Dict

from .config_registry import FIELD_REGISTRY

_LOGGER = logging.getLogger(__name__)


def merge_entry_options(hass: Any, entry: Any, updates: Dict[str, Any]) -> bool:
    """Merge `updates` into entry.options. Returns True if a write happened."""
    if not updates:
        return False
    new_options: Dict[str, Any] = dict(entry.options)
    new_options.update(updates)
    needs_reload = False
    for key, value in updates.items():
        field = FIELD_REGISTRY.get(key)
        if field is None:
            continue
        if field.mirror:
            new_options[field.mirror] = value
        if field.reload_on_change:
            needs_reload = True
    if needs_reload:
        new_options["_needs_reload"] = True
    hass.config_entries.async_update_entry(entry, options=new_options)
    _LOGGER.debug("merge_entry_options: merged %s keys", len(updates))
    return True
```

- [ ] **Step 4: Run tests — PASS**

Run: `.venv/bin/python -m pytest -q tests/test_config_merge.py tests/test_config_registry.py`

- [ ] **Step 5: Lint + commit**

```bash
git add custom_components/oig_cloud/config_merge.py tests/test_config_merge.py
git commit -m "feat(config): shared merge_entry_options helper — never full-replace (K2f)"
```

---

### Task 5: Rewire REST `module_config` GET/POST to registry + merge

**Files:**
- Modify: `custom_components/oig_cloud/api/ha_rest_api.py` — the `module_config` view (`get` ~line 1199, `post` ~line 1222; `_MODULE_CONFIG_FIELDS`, `_coerce_module_value`, `_SECRET_FIELDS`, `_MODULE_CONFIG_MIRRORS`)
- Test: existing `tests/test_ha_rest_api_views.py` (module_config tests must keep passing) + append new regression test

- [ ] **Step 1: Add failing regression test** (in `tests/test_ha_rest_api_views.py`, mirror the style of the existing module_config POST test there — reuse its fixtures/mocks):

```python
async def test_module_config_post_uses_shared_merge(hass_client_fixture_as_in_file):
    """POST must go through merge_entry_options (single write path)."""
    # arrange entry with a dashboard-orphan key, POST a battery update,
    # assert orphan survives AND home_charge_rate mirror follows charge_rate_kw.
```

Write it concretely against the file's existing test helpers (open the file first; copy the arrange/act pattern of `test_module_config_post_*`).

- [ ] **Step 2: Run — verify it fails** (POST path doesn't use the helper yet; mirror works but write path differs — assert via monkeypatching `config_merge.merge_entry_options` and checking it was called).

- [ ] **Step 3: Rewire the view.**
  - `get()`: replace iteration over `_MODULE_CONFIG_FIELDS` with `config_registry.fields_for_section(section)`; keep the `*_set` masking for `secret` fields (`sec[f"{key}_set"] = bool(opts.get(key))`).
  - `post()`: validate via `coerce_value(FIELD_REGISTRY[key], value)` (unknown key → same "unknown field" error), keep empty-secret-keeps-current rule, then REPLACE the manual `new_options = dict(entry.options); new_options.update(...)` + mirror + `_needs_reload` block with:

```python
from ..config_merge import merge_entry_options
from ..config_registry import FIELD_REGISTRY, coerce_value, fields_for_section
...
        wrote = merge_entry_options(hass, entry, updates)
        return web.json_response({"updated": wrote, "keys": sorted(updates)})
```

  - Keep `_MODULE_CONFIG_FIELDS`/`_MODULE_CONFIG_MIRRORS`/`_coerce_module_value` in place for now but mark with `# LEGACY — superseded by config_registry; removed in Plan 4` (the parity test from Task 3 still imports it).

- [ ] **Step 4: Run REST tests**

Run: `.venv/bin/python -m pytest -q tests/test_ha_rest_api_views.py tests/test_ha_rest_api_more.py tests/test_ha_rest_api_helpers.py`
Expected: PASS (98+ tests, incl. the new regression).

- [ ] **Step 5: Lint + mypy on the file, commit**

```bash
git add -u && git commit -m "refactor(rest): module_config GET/POST driven by field registry + shared merge"
```

---

### Task 6: New `GET /api/oig_cloud/{box_id}/config_registry` endpoint

**Files:**
- Modify: `custom_components/oig_cloud/api/ha_rest_api.py` (new view class + registration — find where existing views are registered, grep `async_register_view|app.router.add`)
- Test: `tests/test_ha_rest_api_views.py` (append)

- [ ] **Step 1: Failing test** — GET returns `{fields: {...}, sections: [...]}`, contains `charge_rate_kw` with `min/max/label/section`, secret fields have `secret: true` and NO `default`, requires auth like the sibling views.

- [ ] **Step 2: Run — 404/AttributeError expected.**

- [ ] **Step 3: Implement view** (mirror the shape of the `module_config` view class in the same file):

```python
class OIGCloudConfigRegistryView(HomeAssistantView):
    url = f"{API_BASE}/{{box_id}}/config_registry"
    name = "api:oig_cloud:config_registry"
    requires_auth = True

    async def get(self, request: web.Request, box_id: str) -> web.Response:
        hass: HomeAssistant = request.app["hass"]
        entry = _find_entry_for_box(hass, box_id)
        if not entry:
            return web.json_response({"error": "Box not found"}, status=404)
        fields = registry_as_api_dict()
        sections = sorted({spec["section"] for spec in fields.values()})
        return web.json_response({"fields": fields, "sections": sections})
```

Register it alongside the other views (same place `module_config` view is registered).

- [ ] **Step 4: Run tests — PASS.**

- [ ] **Step 5: Lint + commit**

```bash
git add -u && git commit -m "feat(rest): /config_registry endpoint — FE renders forms from BE registry (P5)"
```

---

### Task 7: Options-flow save → merge (kill the full-replace)

**Files:**
- Modify: `custom_components/oig_cloud/config/steps.py` — options-flow `wizard_summary` write at lines ~3552–3568 (`new_options = self._build_options_payload(...)` → `async_update_entry(entry, options=new_options)`); ALSO the second write site at line ~3332 (initial-flow variant stays as-is — it CREATES options; only the OPTIONS-flow update switches to merge)
- Test: `tests/` — find the existing options-flow summary test (grep `wizard_summary` in tests/) and append a regression

- [ ] **Step 1: Failing regression test** (place next to existing options-flow tests; reuse their MockConfigEntry harness):

```python
async def test_options_flow_save_preserves_dashboard_only_keys(hass):
    """K2f: saving HA options must not erase keys the wizard doesn't know."""
    # arrange: MockConfigEntry with options containing the wizard-known key
    # charge_rate_kw=2.8 AND orphans boiler_thermal_arbitrage_enabled=True,
    # box_id="X", startup_grace_seconds=15
    # act: drive options flow to wizard_summary and submit (same driving code
    # as the neighbouring test)
    # assert: entry.options still contains ALL three orphans, and the edited
    # wizard value is updated.
```

- [ ] **Step 2: Run — verify FAIL** (orphans erased by full replace).

- [ ] **Step 3: Switch the write to merge.** In the options-flow branch of `wizard_summary`:

```python
from ..config_merge import merge_entry_options
...
            payload = self._build_options_payload(self._wizard_data)
            merge_entry_options(self.hass, existing_entry, payload)
```

(Replace the direct `async_update_entry(entry, options=new_options)` call. Keep the
surrounding boiler CONFIG_UPDATE enqueue + reload logic untouched.)

- [ ] **Step 4: Run the options-flow test module + the new regression — PASS.**

Run: `.venv/bin/python -m pytest -q tests/ -k "options or wizard or steps"`

- [ ] **Step 5: Lint + commit**

```bash
git add -u && git commit -m "fix(options-flow): merge instead of full-replace — dashboard-set values survive HA saves (K2f)"
```

---

### Task 8: Full gate + integration sanity

- [ ] **Step 1: Run the full backend gate**

Run:
```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/config_registry.py custom_components/oig_cloud/config_merge.py custom_components/oig_cloud/api/ha_rest_api.py custom_components/oig_cloud/config/steps.py
.venv/bin/mypy --ignore-missing-imports --explicit-package-bases custom_components/oig_cloud/config_registry.py custom_components/oig_cloud/config_merge.py custom_components/oig_cloud/api/ha_rest_api.py
.venv/bin/python -m pytest -q tests/
```
Expected: all green (full suite ~4200 tests).

- [ ] **Step 2: Commit any straggler fixes; final commit**

```bash
git add -u && git commit -m "test(registry): full gate green for Plan 1 (registry + merge)"
```

---

## Self-review notes (already applied)

- Spec coverage: P5 (registry, FE-from-API, merge) ✔; K2f merge-first ✔; i18n keys not `_cs` ✔; deletion of legacy lists deferred to Plan 4 per K2f ("merge helper BEFORE deleting fields") ✔.
- FE consumption of `/config_registry` is Plan 3 (wizard/settings rewrite) — this plan only serves it.
- Existing tests must keep passing at every task — no behavior change other than the merge fix.
