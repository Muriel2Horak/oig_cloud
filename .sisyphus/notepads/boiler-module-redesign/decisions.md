# Boiler Module Redesign - Architecture Decisions

Date: 2026-04-25

---

## Dec-001: Canonical Identity Shape

**Decision**: Use `entry_id + box_id` as the sole canonical external targeting shape for boiler queries and service writes. `device_id` is derived only for HA-facing device/service interactions.

**Rationale**: The plan explicitly forbids `device_id` as external planner/query identity. Multi-device support requires explicit targeting. HA's native `device_id` concept does not map cleanly to the `box_id` concept which is stored in entry data/options.

**Implication**: All boiler services must require both `entry_id` and `box_id` in their schemas. No fallback to first entry/box behavior.

---

## Dec-002: No Fallback Behavior for Missing Identity

**Decision**: When identity cannot be resolved from service call data, raise `ServiceValidationError` with explicit message. Never return `None` for implicit fallback.

**Rationale**: Plan lines 259-261: "if entry_id and box_id do not resolve to the same owned boiler instance, reject the operation". "external planner/query/service operations without explicit entry_id + box_id are invalid unless they pass through a deliberate legacy compatibility shim".

**Current Violation**: `get_box_id_from_device()` in services/__init__.py lines 302-337 falls back to first entry/box when device_id is missing or not found.

**Required Change**: Services must raise `ServiceValidationError` on missing/mismatched identity.

---

## Dec-003: Use HA Core's async_get_config_entry() Helper

**Decision**: Use `homeassistant.helpers.service.async_get_config_entry()` for config entry validation in boiler services.

**Rationale**: This is the canonical HA pattern (used by mealie, google_travel_time, velbus, etc.). It handles entry-not-found, wrong-domain, and not-loaded checks with proper `ServiceValidationError` and translation keys.

**Pattern**:
```python
from homeassistant.helpers import service

entry = service.async_get_config_entry(call.hass, DOMAIN, entry_id)
# Handles: not found, wrong domain, not loaded → raises ServiceValidationError
```

---

## Dec-004: box_id Ownership Validation

**Decision**: After validating entry, implement `_validate_box_ownership(entry, box_id)` to confirm the box belongs to the entry.

**Rationale**: `box_id` is not native to HA - it's stored in entry.data/options. Simply having a valid entry doesn't mean the box_id is owned by it.

**Method**: Check entry.options.get("box_id") or entry.data.get("box_id") or resolve from coordinator's known boxes.

---

## Dec-005: vol.Optional for Identity Fields is Forbidden

**Decision**: Service schemas must use `vol.Required()` for `entry_id` and `box_id`. Using `vol.Optional()` allows empty/implicit targeting which the plan forbids.

**Rationale**: Plan acceptance criteria line 354: "Boiler service payloads require canonical targeting instead of empty or implicit request bodies."

**Current Violation**: SET_GRID_DELIVERY_SCHEMA, SET_BOX_MODE_SCHEMA use `vol.Optional("device_id")`.

---

## Dec-006: ServiceValidationError over vol.Invalid for User Errors

**Decision**: Use `ServiceValidationError` with translation keys for user-input errors, not `vol.Invalid()` which is for schema validation only.

**Rationale**: HA docs on raising exceptions state: "Integrations should raise `ServiceValidationError` (instead of `ValueError`) in case when the user did something wrong." `vol.Invalid` is raised by schema validation before the handler is called; `ServiceValidationError` is raised within handlers for semantic errors.

**Current Violation**: `services/__init__.py` uses `vol.Invalid()` in `_validate_box_mode_payload()` which is not reachable from schema validation path in same way.

---

## Dec-007: Private Coordinator State Access is Forbidden

**Decision**: Services and new boiler modules must not access coordinator private state (prefixed with `_` or `__`). Use explicit interface methods.

**Rationale**: Plan line 41: "Remove direct reads/writes of boiler coordinator private fields from services and internal backend callers." Task 1 acceptance criteria line 416: "any coordinator method that computes planner outputs, reads thermal state directly, or applies actuator commands directly is a test failure."

**Current Violations**: `services/boiler.py` lines 36-39 access `coordinator._current_profile`, `coordinator._update_profile()`, `coordinator._current_plan`.

**Required Change**: Task 2 will define explicit runtime interfaces; Task 1 schemas should prepare for this by not using private state in new service patterns.

---

## Dec-008: Hardcoded box_id "2206237016" Must Be Removed

**Decision**: Remove all hardcoded box_id defaults, especially "2206237016" which appears in const.py and coordinator.py.

**Rationale**: Plan line 321: "Do not leave 2206237016 defaults, global captured coordinators, or cross-entry boiler routing assumptions alive anywhere."

**Current Violations**: 
- const.py line 77: `DEFAULT_BOILER_HEATER_POWER_KW_ENTITY = "sensor.oig_2206237016_boiler_install_power"`
- coordinator.py line 324: `return f"sensor.oig_2206237016_{suffix}"`

**Required Change**: These must use the resolved box_id, not hardcoded fallback.

---

## Dec-009: services.yaml Boiler Entries Need Canonical Fields

**Decision**: Update `services.yaml` boiler service entries to document `entry_id` (ATTR_CONFIG_ENTRY_ID) and `box_id` as required targeting fields, not `device_id` as optional.

**Rationale**: Plan line 355: "Boiler service entries in services.yaml expose canonical entry_id and box_id fields."

**Current State**: services.yaml lines 239-267 document `device_id` (optional) for boiler services. No `entry_id` or `box_id` fields.

---

## Dec-010: Schema Validation Uses vol.Required, Not cv.string

**Decision**: For string identity fields that are required, use `vol.Required(field_name): str` not `vol.Required(field_name): cv.string`.

**Rationale**: HA core patterns use plain `str` type after `vol.Required()`. `cv.string` is an alias but `str` is cleaner. The important part is using `vol.Required()` not `vol.Optional()`.

---
