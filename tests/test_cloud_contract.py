from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "custom_components/oig_cloud/shared/cloud_contract.py"
INSTALL_ID_HASH = (
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
)


def load_contract_module():
    assert MODULE_PATH.exists(), "custom_components/oig_cloud/shared/cloud_contract.py must exist"

    spec = importlib.util.spec_from_file_location("cloud_contract_under_test", MODULE_PATH)
    assert spec is not None and spec.loader is not None

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def _value(value):
    return getattr(value, "value", value)


def _planner_diagnostics() -> dict[str, object]:
    return {
        "metric_target_soc_kwh": 8.4,
        "metric_planning_min_kwh": 3.2,
        "metric_total_cost_czk": 12.34,
        "metric_decisions_count": 1,
        "metric_home_i_count": 32,
        "metric_home_iii_count": 48,
        "metric_home_ups_count": 16,
        "metric_guard_override_count": 0,
        "metric_infeasible": False,
        "detail_strategy": "CHARGE_CHEAPEST",
        "detail_reason": "global_greedy",
    }


def _build_planner_event(module):
    return module.build_producer_event(
        event_name="planner_run_completed",
        occurred_at="2026-04-20T12:00:00Z",
        device_id="12345",
        install_id_hash=INSTALL_ID_HASH,
        integration_version="2.3.35",
        run_id="12345:2026-04-20T12:00:00+00:00",
        correlation_id="12345:2026-04-20T12:00:00+00:00",
        diagnostics=_planner_diagnostics(),
    )


def _build_shield_event(module, **diagnostic_overrides):
    diagnostics = {
        "metric_timeout_minutes": 15,
        "metric_entity_count": 2,
        "metric_expected_change_count": 1,
        "metric_queue_depth": 0,
        "metric_guard_active": True,
        "detail_service_name": "oig_cloud.set_box_mode",
        "detail_result_reason": "already_completed",
    }
    diagnostics.update(diagnostic_overrides)

    return module.build_producer_event(
        event_name="shield_call_allowed",
        occurred_at="2026-04-20T12:05:00Z",
        device_id="12345",
        install_id_hash=INSTALL_ID_HASH,
        integration_version="2.3.35",
        run_id="shield-run-1",
        correlation_id="trace-123",
        diagnostics=diagnostics,
    )


def _build_incident_event(module, **diagnostic_overrides):
    diagnostics = {
        "metric_retry_count": 3,
        "metric_http_status": 401,
        "metric_transition_count": 1,
        "detail_incident_reason": "auth_401",
        "detail_error_class": "ApiAuthError",
    }
    diagnostics.update(diagnostic_overrides)

    return module.build_producer_event(
        event_name="incident_auth_failed",
        occurred_at="2026-04-20T12:10:00Z",
        device_id="12345",
        install_id_hash=INSTALL_ID_HASH,
        integration_version="2.3.35",
        run_id="incident-run-1",
        correlation_id="incident-family-1",
        diagnostics=diagnostics,
    )


def test_contract_declares_explicit_common_fields_and_schema_version():
    module = load_contract_module()

    assert module.SCHEMA_VERSION == "1"
    assert module.SOURCE_PRODUCT == "oig_cloud"
    assert module.PRODUCER_COMMON_FIELDS == (
        "schema_version",
        "source_product",
        "event_class",
        "event_name",
        "occurred_at",
        "device_id",
        "install_id_hash",
        "integration_version",
        "run_id",
        "correlation_id",
        "result",
        "severity",
    )
    assert module.SINK_COMMON_FIELDS == (*module.PRODUCER_COMMON_FIELDS, "transport")
    assert "transport" not in module.PRODUCER_COMMON_FIELDS


def test_frozen_event_taxonomy_matches_plan_exactly():
    module = load_contract_module()

    expected_taxonomy = {
        "planner_run_completed": ("planner", "success", "info"),
        "planner_run_empty": ("planner", "empty", "warning"),
        "planner_run_failed": ("planner", "failed", "error"),
        "shield_call_allowed": ("shield", "allowed", "info"),
        "shield_call_blocked": ("shield", "blocked", "warning"),
        "shield_call_timeout": ("shield", "timeout", "warning"),
        "shield_guardrail_triggered": ("shield", "guardrail", "warning"),
        "shield_override_applied": ("shield", "override", "info"),
        "shield_duplicate_blocked": ("shield", "duplicate", "info"),
        "incident_auth_failed": ("incident", "failed", "error"),
        "incident_retry_exhausted": ("incident", "failed", "error"),
        "incident_fallback_cloud_to_local": ("incident", "fallback", "warning"),
        "incident_fallback_local_to_cloud": ("incident", "recovery", "info"),
    }

    assert {item.value for item in module.EventName} == set(expected_taxonomy)
    assert {item.value for item in module.Result} == {
        "success",
        "empty",
        "failed",
        "allowed",
        "blocked",
        "timeout",
        "guardrail",
        "override",
        "duplicate",
        "fallback",
        "recovery",
    }
    assert {item.value for item in module.Severity} == {"info", "warning", "error"}

    observed_taxonomy = {
        event_name: (
            _value(spec.event_class),
            _value(spec.result),
            _value(spec.severity),
        )
        for event_name, spec in module.EVENT_TAXONOMY.items()
    }
    assert observed_taxonomy == expected_taxonomy


def test_allowlisted_keys_and_detail_enums_are_frozen():
    module = load_contract_module()

    assert module.ALLOWLISTED_KEYS_BY_EVENT_CLASS == {
        "planner": frozenset(
            {
                "metric_target_soc_kwh",
                "metric_planning_min_kwh",
                "metric_total_cost_czk",
                "metric_decisions_count",
                "metric_home_i_count",
                "metric_home_iii_count",
                "metric_home_ups_count",
                "metric_guard_override_count",
                "metric_infeasible",
                "detail_strategy",
                "detail_reason",
                "detail_failure_class",
                "detail_failure_summary",
            }
        ),
        "shield": frozenset(
            {
                "metric_timeout_minutes",
                "metric_entity_count",
                "metric_expected_change_count",
                "metric_queue_depth",
                "metric_guard_active",
                "detail_service_name",
                "detail_result_reason",
                "detail_duplicate_location",
            }
        ),
        "incident": frozenset(
            {
                "metric_retry_count",
                "metric_stale_minutes",
                "metric_http_status",
                "metric_transition_count",
                "detail_incident_reason",
                "detail_data_source_from",
                "detail_data_source_to",
                "detail_error_class",
                "detail_error_summary",
            }
        ),
    }
    assert module.DETAIL_ENUMS == {
        "detail_strategy": frozenset({"CHARGE_CHEAPEST", "USE_BATTERY"}),
        "detail_reason": frozenset(
            {
                "global_greedy",
                "recovery_below_planning_min",
                "repair_planning_min_violation",
                "reach_target_soc",
                "negative_price_charge",
                "economic_charge_cheaper_future",
                "cost_aware_override",
                "hw_min_hold_limit",
                "price_band_extension",
                "balancing_plan",
                "blocked_by_balancing",
                "price_exceeds_max",
                "future_solar_will_fill",
                "would_waste_headroom",
                "price_band_continuation",
                "gap_fill",
                "unknown",
            }
        ),
        "detail_result_reason": frozenset(
            {
                "timeout_exceeded",
                "guardrail_triggered",
                "duplicate_in_queue",
                "duplicate_running",
                "entity_not_found",
                "external_change_detected",
                "override_applied",
                "service_failed",
                "already_completed",
            }
        ),
        "detail_duplicate_location": frozenset({"queue", "running"}),
        "detail_incident_reason": frozenset(
            {
                "auth_401",
                "auth_403",
                "retry_limit_reached",
                "source_timeout",
                "source_connection_error",
                "fallback_cloud_unreachable",
                "fallback_local_unreachable",
                "source_no_response",
            }
        ),
        "detail_data_source_from": frozenset({"cloud_only", "local_only"}),
        "detail_data_source_to": frozenset({"cloud_only", "local_only"}),
    }


def test_build_producer_event_returns_flat_validated_envelope_without_transport():
    module = load_contract_module()

    event = _build_planner_event(module)

    assert event == {
        "schema_version": "1",
        "source_product": "oig_cloud",
        "event_class": "planner",
        "event_name": "planner_run_completed",
        "occurred_at": "2026-04-20T12:00:00Z",
        "device_id": "12345",
        "install_id_hash": INSTALL_ID_HASH,
        "integration_version": "2.3.35",
        "run_id": "12345:2026-04-20T12:00:00+00:00",
        "correlation_id": "12345:2026-04-20T12:00:00+00:00",
        "result": "success",
        "severity": "info",
        **_planner_diagnostics(),
    }
    assert "transport" not in event
    assert all(not isinstance(value, (dict, list, tuple, set)) for value in event.values())


def test_validate_producer_event_rejects_transport_and_unknown_event_names():
    module = load_contract_module()

    producer_event = _build_planner_event(module)
    producer_event["transport"] = "mqtt"

    with pytest.raises(module.CloudContractError, match="transport"):
        module.validate_producer_event(producer_event)

    producer_event = _build_planner_event(module)
    producer_event["event_name"] = "planner_run_custom"

    with pytest.raises(module.CloudContractError, match="event_name"):
        module.validate_producer_event(producer_event)


def test_sink_payload_drops_unknown_keys_but_rejects_forbidden_content():
    module = load_contract_module()

    sink_payload = module.build_sink_payload(
        {
            **_build_planner_event(module),
            "metric_unknown": 999,
            "detail_unknown": "drop-me",
        },
        transport="mqtt",
    )

    assert sink_payload == module.CANONICAL_MQTT_PAYLOAD_EXAMPLE
    assert "metric_unknown" not in sink_payload
    assert "detail_unknown" not in sink_payload

    with pytest.raises(module.CloudContractError, match="params"):
        module.build_sink_payload(
            {**_build_planner_event(module), "params": {"mode": "home_1"}},
            transport="mqtt",
        )


def test_shield_service_names_are_bounded_and_reject_entity_ids():
    module = load_contract_module()

    event = _build_shield_event(module)
    assert event["detail_service_name"] == "oig_cloud.set_box_mode"

    with pytest.raises(module.CloudContractError, match="detail_service_name"):
        _build_shield_event(module, detail_service_name="sensor.raw_box_mode")


def test_failure_and_error_summaries_are_template_generated_not_pass_through():
    module = load_contract_module()

    assert module.build_failure_summary("TimeoutError", "timed out with token abc123") == (
        "failure_class=TimeoutError"
    )
    assert module.build_error_summary(
        "ApiAuthError", "401 for token abc123def456ghi789"
    ) == "error_class=ApiAuthError"

    event = _build_incident_event(
        module,
        detail_error_summary="401 for token abc123def456ghi789",
    )
    assert event["detail_error_summary"] == "error_class=ApiAuthError"
    assert "abc123def456ghi789" not in event["detail_error_summary"]


def test_device_id_and_id_ownership_rules_are_explicit():
    module = load_contract_module()

    assert module.DEVICE_ID_RULE == {
        "meaning": "numeric_oig_box_id",
        "source": 'entry.options.get("box_id")',
        "publish_when": "non_empty",
        "missing_behavior": "drop_with_debug_log",
        "placeholder_allowed": False,
        "fallback_allowed": False,
        "topic_placeholder_allowed": False,
    }
    assert module.resolve_telemetry_device_id(
        SimpleNamespace(options={"box_id": "12345"})
    ) == "12345"
    assert module.resolve_telemetry_device_id(SimpleNamespace(options={"box_id": ""})) is None
    assert module.resolve_telemetry_device_id(SimpleNamespace(options={})) is None

    assert module.ID_OWNERSHIP_RULES == {
        "planner": {
            "run_id": "planner_execution",
            "correlation_id": "same_as_run_id",
        },
        "shield": {
            "run_id": "emitter_scoped",
            "correlation_id": "trace_id",
        },
        "incident": {
            "run_id": "emitter_scoped",
            "correlation_id": "state_transition_family",
        },
    }


def test_details_json_is_string_only_and_bounded_to_two_kib():
    module = load_contract_module()

    event = module.build_producer_event(
        event_name="planner_run_failed",
        occurred_at="2026-04-20T12:15:00Z",
        device_id="12345",
        install_id_hash=INSTALL_ID_HASH,
        integration_version="2.3.35",
        run_id="planner-run-2",
        correlation_id="planner-run-2",
        diagnostics={
            "metric_infeasible": True,
            "detail_failure_class": "TimeoutError",
            "details_json": '{"summary":"already redacted"}',
        },
    )
    assert event["details_json"] == '{"summary":"already redacted"}'

    # String values are sanitized and truncated by _sanitize_details_json_string(),
    # so an oversized string is ACCEPTED (truncated to 120 chars + "...") rather than rejected.
    event = module.build_producer_event(
        event_name="planner_run_failed",
        occurred_at="2026-04-20T12:15:00Z",
        device_id="12345",
        install_id_hash=INSTALL_ID_HASH,
        integration_version="2.3.35",
        run_id="planner-run-2",
        correlation_id="planner-run-2",
        diagnostics={
            "metric_infeasible": True,
            "detail_failure_class": "TimeoutError",
            "details_json": "x" * 2049,
        },
    )
    # Sanitized and truncated to 120 + "..."
    assert event["details_json"] == "x" * 120 + "..."

    # Non-string values are JSON-serialized WITHOUT truncation, so oversized
    # dicts still raise CloudContractError.
    with pytest.raises(module.CloudContractError, match="details_json"):
        module.build_producer_event(
            event_name="planner_run_failed",
            occurred_at="2026-04-20T12:15:00Z",
            device_id="12345",
            install_id_hash=INSTALL_ID_HASH,
        integration_version="2.3.35",
            run_id="planner-run-2",
            correlation_id="planner-run-2",
            diagnostics={
                "metric_infeasible": True,
                "detail_failure_class": "TimeoutError",
                "details_json": {f"key{i}": "x" * 100 for i in range(20)},
            },
        )
