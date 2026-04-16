# Proxy Entity Mapping Revision - Learnings

## Task 3: Normalization Boundary

### What was built
- `ProxyEntityDescriptor` dataclass (frozen, slots) in `core/local_mapper.py`
  - Fields: domain, device_id, table, key, is_control, raw_suffix
  - `raw_suffix` retained for SENSOR_TYPES suffix lookups in downstream Tasks 4-6
- `normalize_proxy_entity_id(entity_id, expected_device_id) -> Optional[ProxyEntityDescriptor]`
  - Central, reusable normalization helper for local/proxy entity IDs
  - Placed in `local_mapper.py` so `data_source.py` and `data_sensor.py` can both import it

### Key parsing logic
Pattern: `{domain}.oig_local_{device_id}_{table}_{key}[_cfg]`

Three-table prefix cases (`tbl_*`):
- `tbl_actual_aci_wr` → table=`tbl_actual_aci`, key=`wr`
- `tbl_invertor_prms_to_grid` → table=`tbl_invertor_prms`, key=`to_grid`
- `tbl_batt_prms_bat_min_cfg` → table=`tbl_batt_prms`, key=`bat_min`, is_control=True
- `tbl_box_prms_mode_cfg` → table=`tbl_box_prms`, key=`mode`, is_control=True

Special case for `proxy_control_*` prefix (no `tbl_`):
- `proxy_control_proxy_mode_cfg` → table=`proxy_control`, key=`proxy_mode`, is_control=True

Algorithm:
1. Check domain is in SUPPORTED_DOMAINS
2. Verify prefix matches `.{domain}.oig_local_{expected_device_id}_`
3. Extract raw_suffix after the prefix
4. If `raw_suffix.endswith("_cfg")`, strip and set is_control=True
5. For `tbl_*` keys: split at SECOND underscore to get table
6. For `proxy_control_*` keys: table is hardcoded `proxy_control`
7. For non-tbl keys: use last underscore as split point

### Test coverage
- 40 tests in `tests/test_proxy_normalization.py`
- All audited examples: sensor, binary_sensor, switch, number, select
- Positive cases for table/key parsing and _cfg detection
- Negative cases: non-string, malformed prefix, wrong device_id, unsupported domain, legacy tlb_ prefix, missing oig_local_, no dot, empty suffix, no underscore separator, empty table/key
- Determinism verified

### Noteworthy
- `test_proxy_entity_contract.py` still shows 4 failures against the OLD `_parse_local_entity_id` (which only supports sensor/binary_sensor). This is expected — those tests are for Task 4 integration.
- The `ProxyEntityDescriptor` docstring is necessary: it documents the contract for downstream consumers (Tasks 4-6) who will consume this type.
- `re` import was removed when cleaning up — `normalize_proxy_entity_id` uses only string methods.

### Decisions made
- table/key split uses SECOND underscore for `tbl_*` patterns (e.g., `tbl_actual_aci_wr` splits at the `aci_` underscore)
- `proxy_control_*` is handled as a special literal table name
- Empty table or key after split causes immediate return of None (no fallback)

### Remaining work
- Task 4: Update local_mapper ingestion to use `normalize_proxy_entity_id` and replace `_parse_local_entity_id`
- Task 5: Update data_source discovery
- Task 6: Update data_sensor helpers
## Task 4: Local Mapper Ingestion Refactor

### What was changed
- `LocalUpdateApplier.apply_state` now calls `normalize_proxy_entity_id()` instead of the old `_parse_local_entity_id()`
- Uses `descriptor.raw_suffix` for `_SUFFIX_UPDATES` dictionary lookup
- Uses `descriptor.domain` for domain validation against `suffix_cfg.domains`
- Removed `_parse_local_entity_id` completely (no longer used anywhere)

### `_SUFFIX_UPDATES` enhancement
- `_build_suffix_updates()` now auto-generates `{suffix}_cfg` variants for every suffix
- `_cfg` variants use `SUPPORTED_DOMAINS` (all 5 domains) since control entities can be `switch`, `number`, or `select`
- Plain suffix variants keep their original domain restrictions (typically `sensor`/`binary_sensor`)
- This means control entities like `switch.oig_local_*_tbl_invertor_prms_to_grid_cfg` now correctly map to the same node updates as their read-only counterparts

### `_normalize_domains` update
- Extended to accept all 5 domains: `sensor`, `binary_sensor`, `switch`, `number`, `select`
- Required so that `local_entity_domains` configs can include control domains if explicitly specified

### Test updates
- `test_proxy_entity_contract.py`: switched from `_parse_local_entity_id` to `normalize_proxy_entity_id`, updated assertions to check `descriptor.domain` and `descriptor.raw_suffix`, added `is_control` assertions
- `test_local_mapper.py`: added coverage for all 5 domains in `_normalize_domains`
- `test_local_mapper_more.py`: fixed monkeypatched tests to use valid suffixes with underscores (`tbl_test_key` instead of `suffix`) since `normalize_proxy_entity_id` enforces table/key structure; added 3 new tests proving `switch`, `number`, and `select` control entities can successfully update payload

### Verification
- 74 tests pass (0 failures)
- All changed files have clean LSP diagnostics

### Key insight
`normalize_proxy_entity_id` is stricter than the old parser: it requires the suffix to have a valid `table_key` structure. Tests using unrealistic suffixes like `"suffix"` (no underscore) had to be updated to use realistic suffixes like `"tbl_test_key"`.

## Task 5: Local Data-Source Discovery Update

### What was changed
- `data_source.py`:
  - Imported `SUPPORTED_DOMAINS` from `.local_mapper` (no circular dependency)
  - `_iter_local_entities` now iterates over all 5 audited domains instead of hardcoded `("sensor", "binary_sensor")`
  - `_LOCAL_ENTITY_RE` expanded to match `sensor|binary_sensor|switch|number|select`
  - `_on_any_state_change` prefix filter replaced hardcoded `sensor.oig_local_` / `binary_sensor.oig_local_` checks with `any(entity_id.startswith(f"{domain}.oig_local_") for domain in SUPPORTED_DOMAINS)`
- `telemetry_store.py`:
  - `seed_from_existing_local_states` now iterates over `SUPPORTED_DOMAINS` instead of hardcoded `("sensor", "binary_sensor")`

### Test updates
- `test_data_source_helpers.py`:
  - Added `test_iter_local_entities_covers_all_domains` — verifies all 5 domain entities are yielded and foreign box IDs are excluded
  - Added `test_get_latest_local_entity_update_includes_control_domains` — proves `switch` entities contribute to freshness evaluation
- `test_data_source_controller.py`:
  - Added `test_local_entity_re_matches_all_audited_domains` — regex positive/negative cases for all 5 domains
  - Added parametrized `test_on_any_state_change_tracks_control_domains` for `switch`, `number`, `select`

### Verification
- 63 tests pass (0 failures) in `tests/test_data_source*.py`
- LSP diagnostics clean on all modified files
- Proxy status exceptions (`sensor.oig_local_oig_proxy_*`) remain discoverable and explicit
- Cloud-only mode, stale-local detection, and box mismatch protections behaviorally unchanged

### Key insight
Using `SUPPORTED_DOMAINS` from `local_mapper.py` as the single canonical source eliminates drift between the proxy contract and local discovery logic. The regex still requires a numeric box_id (`\d+`) after `oig_local_`, which preserves the existing device-scoping behavior.

## Task 6: Local Sensor Helpers Update

### What was changed
- `data_sensor.py`:
  - Imported `SUPPORTED_DOMAINS` from `core/local_mapper`
  - `_get_local_entity_id_for_config` now defaults to `SUPPORTED_DOMAINS` instead of `["sensor"]` when no `local_entity_domains` are specified
  - Added `_cfg` suffix fallback: after trying the raw suffix across primary domains, it tries `{suffix}_cfg` across all `SUPPORTED_DOMAINS`
  - Backward compatibility: explicit `local_entity_domains` are still respected for the first pass, but `_cfg` fallback uses all supported domains

### Why this matters
- Proxy control entities append `_cfg` to their suffix (e.g., `switch.oig_local_*_tbl_invertor_prms_to_grid_cfg`), but SENSOR_TYPES configs often omit `_cfg`
- Grid-delivery local fallback (`_get_local_grid_mode`) now correctly resolves control-domain inputs like `switch.oig_local_*_tbl_box_prms_crct_cfg` and `number.oig_local_*_tbl_invertor_prm1_p_max_feed_grid_cfg`
- The canonical resolver `resolve_grid_delivery_live_state` itself was unchanged; only the local input feeding into it was fixed

### Test coverage
- 5 new tests in `tests/test_data_sensor_more.py` covering:
  - Default domain list uses `SUPPORTED_DOMAINS`
  - `_cfg` suffix discovery for control entities
  - Explicit domains preferred over `_cfg` fallback
  - `_get_local_value_for_sensor_type` reading from control entities
  - `_get_local_grid_mode` resolving from control-domain local entities

### Verification
- 66 tests pass (0 failures) in `tests/test_data_sensor*.py`
- LSP diagnostics clean on all modified files


## Task 7: Proxy-Sensitive Semantics End-to-End Regression

### What was built
- New regression test file: `tests/test_proxy_semantics_regression.py`
  - `TestGridDeliveryProxySemantics`: 3 end-to-end tests proving canonical grid-delivery resolution from proxy control entities
  - `TestNonGridProxySemantics`: 1 end-to-end test proving non-grid proxy control (`tbl_box_prms_mode_cfg`) correctly updates the canonical payload

### Grid-delivery coverage
Uses the real `LocalUpdateApplier` (no monkeypatching) with audited `_cfg` entity IDs:
- `switch.oig_local_{box_id}_tbl_invertor_prms_to_grid_cfg` → maps via `local_value_map` (`on`→1, `off`→0) to `invertor_prms.to_grid`
- `number.oig_local_{box_id}_tbl_invertor_prm1_p_max_feed_grid_cfg` → maps to `invertor_prm1.p_max_feed_grid`
- `switch.oig_local_{box_id}_tbl_box_prms_crct_cfg` → maps to `box_prms.crct`

Scenarios tested:
- `off`: to_grid=off, crct=1, p_max_feed_grid=10000
- `on`: to_grid=on, crct=1, p_max_feed_grid=10000
- `limited`: to_grid=on, crct=1, p_max_feed_grid=5000

All assertions use `resolve_grid_delivery_live_state(payload[box_id])` to prove the canonical resolver consumes the locally-built payload correctly.

### Non-grid coverage
- `select.oig_local_{box_id}_tbl_box_prms_mode_cfg` → `box_prms.mode`
- `_apply_node_update` normalizes "Home 2" → `1` via `_normalize_box_mode`

### Verification
- 4/4 new tests pass
- 76/76 related existing tests pass (local_mapper + data_sensor suites)
- LSP diagnostics clean on the new file
- Evidence files created: `.sisyphus/evidence/task-7-grid-delivery.txt`, `.sisyphus/evidence/task-7-non-grid.txt`

### Key insight
Because `_build_suffix_updates()` auto-generates `_cfg` variants for every `local_entity_suffix`, the end-to-end path from proxy control entity ID → payload node → canonical resolver works out-of-the-box for both grid and non-grid semantics. No monkeypatching was required in the regression tests, which proves the production wiring is correct.

## Task 8: Release-Safe Verification & Docs Finalization

### What was done
- Updated `docs/user/DATA_SOURCE.md` to accurately describe the supported local/proxy contract:
  - All 5 domains explicitly listed: `sensor`, `binary_sensor`, `switch`, `number`, `select`
  - Object ID pattern: `{domain}.oig_local_<box_id>_<table>_<key>` with `_cfg` suffix for controls
  - Explicit rejection of legacy non-contract aliases (`tlb_`, missing `oig_local_`)
  - How normalization works (single boundary in `core/local_mapper.py`)
  - Control entities (`_cfg`) map to same canonical payload nodes as read-only counterparts

### Key changes to DATA_SOURCE.md
- Line 19: Replaced stale `sensor.oig_local_<box_id>_*` with full domain enumeration and `_cfg` example
- Line 26: Replaced `sensor.oig_local_<box_id>_*` with `{domain}.oig_local_<box_id>_<table>_<key>` across all 5 domains
- Line 31: The existing contract callout was already correct; verified it mentions all 5 domains, `_cfg` suffix, and legacy alias rejection
- Line 68: Replaced `sensor.oig_local_*` with `{domain}.oig_local_*` for recommended-setup check

### Verification results
- oig-cloud full suite: 3372 passed, 27 skipped in ~105s
- Upstream proxy contract: 42 passed, 2 failed (async test infrastructure issue, NOT contract failures)
  - test_entity_id_compatibility.py: all passing
  - test_mqtt/test_client.py: 40 passed, 2 failed (health_check_loop async tests - missing pytest-asyncio plugin)

### Evidence files
- `.sisyphus/evidence/task-8-oig-cloud-verify.txt`
- `.sisyphus/evidence/task-8-oig-proxy-contract.txt`

### Key insight
The proxy contract documentation in DATA_SOURCE.md was already partially updated in prior tasks, but the Local only mode description (line 19) still showed the old `sensor.oig_local_<box_id>_*` pattern. This was the only remaining stale reference that needed fixing. All contract details (5 domains, _cfg suffix, legacy alias rejection) were already correctly documented in the "Co je potřeba pro Local režim" section.
