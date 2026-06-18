# Final F4 Blocker Fix Evidence — 2026-04-26

## Scope

Fixed F4 blockers 1 and 3 only: migration source-capability safety plus boiler slot/horizon setup/docs copy.

## TDD RED evidence

- `pytest tests/test_boiler_task9_migration_repair.py::test_ambiguous_legacy_alternative_source_bool_is_not_safe_mapped_static_probe tests/test_boiler_task9_migration_repair.py::test_ambiguous_legacy_alternative_source_bool_forces_repair -q`
  - Failed because `_can_safe_map()` returned `True` and migration action was `safe_mapped` for `boiler_has_alternative_heating=True` with no explicit `boiler_alt_source_mode`.
- `pytest tests/test_config_flow_boiler_setup.py::test_boiler_expert_schema_hides_slot_size_tuning tests/test_config_flow_boiler_setup.py::test_boiler_options_fix_slot_size_and_clamp_horizon_contract tests/test_config_flow_boiler_setup.py::test_boiler_options_clamp_horizon_lower_bound tests/test_config_flow_entry.py::test_wizard_summary_defaults_for_boiler_fields -q`
  - Failed because expert schema exposed `boiler_plan_slot_minutes`, payload kept user slot `60`, lower horizon was not clamped, and default slot was `30`.
- `pytest tests/test_config_flow_boiler_setup.py::test_boiler_options_do_not_guess_alt_source_mode_from_legacy_bool -q`
  - Failed because legacy bool + alt switch was guessed as `controllable`.
- `pytest tests/test_config_flow_boiler_setup.py::test_boiler_expert_schema_uses_explicit_alt_source_mode -q`
  - Failed because expert schema exposed legacy `boiler_has_alternative_heating` and lacked `boiler_alt_source_mode`.

## Implementation evidence

- Migration now rejects ambiguous legacy alternative-source capability:
  - `boiler_has_alternative_heating=True` without `boiler_alt_source_mode` is not safe-mapped.
  - invalid source modes and `controllable` without a switch are not safe-mapped.
  - safe non-capability fields still safe-map.
- Config/options now:
  - fix `boiler_plan_slot_minutes` to `15`, ignoring stored/user tuning input;
  - hide `boiler_plan_slot_minutes` from expert schema;
  - clamp `boiler_planning_horizon_hours` to `12–48`;
  - expose explicit `boiler_alt_source_mode` in expert schema instead of legacy bool capability guessing.
- Docs/translations/services copy no longer describes configurable boiler slot size or cheapest-time-slots-only boiler planning.

## GREEN verification

- `pytest tests/test_boiler_task9_migration_repair.py tests/test_config_flow_boiler_setup.py tests/test_config_flow_entry.py -q`
  - Result: `62 passed, 7 warnings in 1.56s`.
- `python -c "import json, yaml; paths=['custom_components/oig_cloud/translations/en.json','custom_components/oig_cloud/translations/cs.json']; [json.load(open(p, encoding='utf-8')) for p in paths]; yaml.safe_load(open('custom_components/oig_cloud/services.yaml', encoding='utf-8')); print('json/yaml parse ok')"`
  - Result: `json/yaml parse ok`.
- LSP diagnostics:
  - `custom_components/oig_cloud/boiler/migration.py`: no diagnostics.
  - `custom_components/oig_cloud/config/steps.py`: no diagnostics.
  - `tests/test_boiler_task9_migration_repair.py`: no diagnostics.
  - `tests/test_config_flow_boiler_setup.py`: no diagnostics.
  - `tests/test_config_flow_entry.py`: no diagnostics.
  - `custom_components/oig_cloud/translations/en.json`: no diagnostics.
  - `custom_components/oig_cloud/translations/cs.json`: no diagnostics.
  - `custom_components/oig_cloud/services.yaml`: no diagnostics.
  - Markdown LSP unavailable: configured `marksman` binary is missing; Markdown files were edited with static copy checks instead.

## Static copy probes

- No matches remain in translations/docs for `boiler_plan_slot_minutes`, `Recommended 60`, `Doporučeno 60`, `15-60 minutes`, `15-60 minut`, or boiler slot labels.
- No matches remain in translations/services.yaml for stale `cheapest time slots` / `nejlevnější časové sloty` boiler planning copy.
- Translations now expose `boiler_alt_source_mode` labels/descriptions in EN and CS.
