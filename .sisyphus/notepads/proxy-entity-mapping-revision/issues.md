
2026-04-15: data_source.py alphanumeric device ID fix
- _coerce_box_id_str now uses re.match(r"^\w+$", s) instead of s.isdigit()
- _get_latest_local_entity_update now uses re.match(r"^\w+$", box_id) instead of box_id.isdigit()
- _LOCAL_ENTITY_RE now uses ([a-zA-Z0-9]+) instead of (\d+) to match alphanumeric IDs like dev01
- Full test suite passes (3375 passed, 27 skipped)

## 2026-04-15: data_source normalization boundary fix

### Problem
`_LOCAL_ENTITY_RE` used `([a-zA-Z0-9]+)` but `_coerce_box_id_str` / `_get_latest_local_entity_update` accept `\w+` (includes underscores). More importantly, malformed entity IDs like `sensor.oig_local_123_` or `sensor.oig_local_123_bad` could pass prefix/regex checks and incorrectly refresh the local-mode freshness timer.

### Solution
- Updated `_LOCAL_ENTITY_RE` to `([a-zA-Z0-9][a-zA-Z0-9_]*)_` to align with `\w+` while avoiding empty box_id matches.
- Added `normalize_proxy_entity_id` import from `.local_mapper`.
- `_iter_local_entities` now filters via `normalize_proxy_entity_id(st.entity_id, box_id)`.
- `_on_any_state_change` now validates against `expected_box_id` (or `proxy_box_id` fallback) using `normalize_proxy_entity_id` instead of relying solely on regex extraction, which eliminates ambiguity when box_ids contain underscores.

### Gotcha
Simply changing the regex to `([a-zA-Z0-9_]+)` caused greedy matching issues: for `sensor.oig_local_123_ac_out`, the regex captured `123_ac` as the box_id instead of `123`. This broke downstream box_id comparisons. The fix was to bypass regex extraction for validation and use `normalize_proxy_entity_id` directly with the known configured/proxy box_id.


## 2026-04-15: F1/F2 blocker fix — tighten contract boundary

### Problem
- `normalize_proxy_entity_id` had a generic `else` fallback that accepted arbitrary suffixes (e.g. `ac_out`), violating the audited proxy contract.
- `data_source.py` retained dead code (`_LOCAL_ENTITY_RE` and `_poke_coordinator`) with no production callers.
- `telemetry_store.py` seeded from existing local states without validating entity IDs through the normalization boundary.
- `data_sensor.py` built local entity ID candidates manually and returned them even when no HA state existed and the suffix was non-contract.

### Solution
- Replaced the `else` fallback in `normalize_proxy_entity_id` with `return None`; only `tbl_*` and `proxy_control_*` suffixes are accepted.
- Removed `_LOCAL_ENTITY_RE` and `_poke_coordinator` from `DataSourceController`.
- Added `normalize_proxy_entity_id` call inside `telemetry_store.seed_from_existing_local_states`.
- Routed `data_sensor.py` `_get_local_entity_id_for_config` through `normalize_proxy_entity_id`, requiring both contract compliance and an existing HA state.
- Updated all affected tests to use contract-compliant suffixes (`tbl_actual_aci_wr`, `tbl_box_prms_mode`, etc.).
- Deleted tests for the removed dead code.

### Result
Full test suite: 3377 passed, 27 skipped, 0 failures.
