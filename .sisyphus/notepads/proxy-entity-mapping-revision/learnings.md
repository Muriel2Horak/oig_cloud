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
