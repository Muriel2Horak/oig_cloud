"""Cloud telemetry event contract for oig_cloud."""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from enum import Enum
from typing import Any, Mapping


_LOGGER = logging.getLogger(__name__)

SCHEMA_VERSION = "1"
SOURCE_PRODUCT = "oig_cloud"
MAX_DETAILS_JSON_BYTES = 2048

PRODUCER_COMMON_FIELDS = (
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
SINK_COMMON_FIELDS = (*PRODUCER_COMMON_FIELDS, "transport")

CONTRACT_STAGES = {
    "producer": {
        "transport_present": False,
        "description": "Emitter-facing event before sink fan-out",
    },
    "sink": {
        "transport_present": True,
        "description": "Sink payload with transport injected by shared emitter",
    },
}

PUBLISHER_FLATTENING_RULE = {
    "shape": "single_flat_top_level_object",
    "publisher_behavior": "allowlisted_scalar_keys_only",
    "nested_objects_allowed": False,
    "arrays_allowed": False,
}

DEVICE_ID_RULE = {
    "meaning": "numeric_oig_box_id",
    "source": 'entry.options.get("box_id")',
    "publish_when": "non_empty",
    "missing_behavior": "drop_with_debug_log",
    "placeholder_allowed": False,
    "fallback_allowed": False,
    "topic_placeholder_allowed": False,
}

ID_OWNERSHIP_RULES = {
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

FORBIDDEN_TOP_LEVEL_KEYS = frozenset(
    {
        "params",
        "entities",
        "expected_entities",
        "label",
        "labels",
        "entity_id",
        "entity_ids",
        "exception",
        "exception_blob",
        "traceback",
        "state",
        "states",
        "state_dump",
        "raw_exception",
        "window_metrics",
    }
)

_CLASS_NAME_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
_HEX_64_RE = re.compile(r"^[0-9a-f]{64}$")
_DIGITS_RE = re.compile(r"^[0-9]+$")
_DETAILS_KEY_RE = re.compile(r"^[a-z][a-z0-9_]{0,63}$")
_DETAILS_TOKEN_RE = re.compile(
    r"\b(?=[a-z0-9]{20,}\b)(?=[a-z0-9]*[a-z])(?=[a-z0-9]*\d)[a-z0-9]+\b",
    re.IGNORECASE,
)
_DETAILS_SECRET_RE = re.compile(
    r"\b(?:authorization|api_key|password|cookie|secret|bearer)\b",
    re.IGNORECASE,
)
_ENTITY_ID_RE = re.compile(r"^[a-z_]+\.[a-z0-9_]+$")

MAX_DETAILS_JSON_DEPTH = 4
MAX_DETAIL_STRING_LENGTH = 120

FORBIDDEN_DETAILS_JSON_KEYS = frozenset(
    {
        *FORBIDDEN_TOP_LEVEL_KEYS,
        "friendly_name",
        "entity_name",
        "display_name",
        "name",
        "title",
    }
)


class CloudContractError(ValueError):
    """Raised when telemetry payload violates the frozen contract."""


class EventClass(str, Enum):
    PLANNER = "planner"
    SHIELD = "shield"
    INCIDENT = "incident"


class EventName(str, Enum):
    PLANNER_RUN_COMPLETED = "planner_run_completed"
    PLANNER_RUN_EMPTY = "planner_run_empty"
    PLANNER_RUN_FAILED = "planner_run_failed"
    SHIELD_CALL_ALLOWED = "shield_call_allowed"
    SHIELD_CALL_BLOCKED = "shield_call_blocked"
    SHIELD_CALL_TIMEOUT = "shield_call_timeout"
    SHIELD_GUARDRAIL_TRIGGERED = "shield_guardrail_triggered"
    SHIELD_OVERRIDE_APPLIED = "shield_override_applied"
    SHIELD_DUPLICATE_BLOCKED = "shield_duplicate_blocked"
    INCIDENT_AUTH_FAILED = "incident_auth_failed"
    INCIDENT_RETRY_EXHAUSTED = "incident_retry_exhausted"
    INCIDENT_FALLBACK_CLOUD_TO_LOCAL = "incident_fallback_cloud_to_local"
    INCIDENT_FALLBACK_LOCAL_TO_CLOUD = "incident_fallback_local_to_cloud"


class Result(str, Enum):
    SUCCESS = "success"
    EMPTY = "empty"
    FAILED = "failed"
    ALLOWED = "allowed"
    BLOCKED = "blocked"
    TIMEOUT = "timeout"
    GUARDRAIL = "guardrail"
    OVERRIDE = "override"
    DUPLICATE = "duplicate"
    FALLBACK = "fallback"
    RECOVERY = "recovery"


class Severity(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"


class Transport(str, Enum):
    MQTT = "mqtt"


@dataclass(frozen=True)
class EventSpec:
    event_class: EventClass
    result: Result
    severity: Severity


EVENT_TAXONOMY = {
    EventName.PLANNER_RUN_COMPLETED.value: EventSpec(
        event_class=EventClass.PLANNER,
        result=Result.SUCCESS,
        severity=Severity.INFO,
    ),
    EventName.PLANNER_RUN_EMPTY.value: EventSpec(
        event_class=EventClass.PLANNER,
        result=Result.EMPTY,
        severity=Severity.WARNING,
    ),
    EventName.PLANNER_RUN_FAILED.value: EventSpec(
        event_class=EventClass.PLANNER,
        result=Result.FAILED,
        severity=Severity.ERROR,
    ),
    EventName.SHIELD_CALL_ALLOWED.value: EventSpec(
        event_class=EventClass.SHIELD,
        result=Result.ALLOWED,
        severity=Severity.INFO,
    ),
    EventName.SHIELD_CALL_BLOCKED.value: EventSpec(
        event_class=EventClass.SHIELD,
        result=Result.BLOCKED,
        severity=Severity.WARNING,
    ),
    EventName.SHIELD_CALL_TIMEOUT.value: EventSpec(
        event_class=EventClass.SHIELD,
        result=Result.TIMEOUT,
        severity=Severity.WARNING,
    ),
    EventName.SHIELD_GUARDRAIL_TRIGGERED.value: EventSpec(
        event_class=EventClass.SHIELD,
        result=Result.GUARDRAIL,
        severity=Severity.WARNING,
    ),
    EventName.SHIELD_OVERRIDE_APPLIED.value: EventSpec(
        event_class=EventClass.SHIELD,
        result=Result.OVERRIDE,
        severity=Severity.INFO,
    ),
    EventName.SHIELD_DUPLICATE_BLOCKED.value: EventSpec(
        event_class=EventClass.SHIELD,
        result=Result.DUPLICATE,
        severity=Severity.INFO,
    ),
    EventName.INCIDENT_AUTH_FAILED.value: EventSpec(
        event_class=EventClass.INCIDENT,
        result=Result.FAILED,
        severity=Severity.ERROR,
    ),
    EventName.INCIDENT_RETRY_EXHAUSTED.value: EventSpec(
        event_class=EventClass.INCIDENT,
        result=Result.FAILED,
        severity=Severity.ERROR,
    ),
    EventName.INCIDENT_FALLBACK_CLOUD_TO_LOCAL.value: EventSpec(
        event_class=EventClass.INCIDENT,
        result=Result.FALLBACK,
        severity=Severity.WARNING,
    ),
    EventName.INCIDENT_FALLBACK_LOCAL_TO_CLOUD.value: EventSpec(
        event_class=EventClass.INCIDENT,
        result=Result.RECOVERY,
        severity=Severity.INFO,
    ),
}

ALLOWLISTED_KEYS_BY_EVENT_CLASS = {
    EventClass.PLANNER.value: frozenset(
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
    EventClass.SHIELD.value: frozenset(
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
    EventClass.INCIDENT.value: frozenset(
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

DETAIL_ENUMS = {
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

ALLOWED_SERVICE_NAMES = frozenset(
    {
        "oig_cloud.set_box_mode",
        "oig_cloud.set_grid_delivery",
        "oig_cloud.set_boiler_mode",
        "oig_cloud.set_formating_mode",
        "oig_cloud.update_solar_forecast",
        "oig_cloud.save_dashboard_tiles",
        "oig_cloud.get_dashboard_tiles",
        "oig_cloud.plan_boiler_heating",
        "oig_cloud.apply_boiler_plan",
        "oig_cloud.cancel_boiler_plan",
    }
)

TELEGRAF_JSON_V2_FIELD_UNION = {
    "common": frozenset({*SINK_COMMON_FIELDS, "details_json"}),
    "planner": frozenset(ALLOWLISTED_KEYS_BY_EVENT_CLASS[EventClass.PLANNER.value]),
    "shield": frozenset(ALLOWLISTED_KEYS_BY_EVENT_CLASS[EventClass.SHIELD.value]),
    "incident": frozenset(ALLOWLISTED_KEYS_BY_EVENT_CLASS[EventClass.INCIDENT.value]),
}


def build_failure_summary(exception_class_name: str, _raw_message: str | None = None) -> str:
    """Build a bounded planner failure summary from class name only."""
    validated_class_name = _validate_exception_class_name(
        "detail_failure_class", exception_class_name
    )
    return f"failure_class={validated_class_name}"


def build_error_summary(exception_class_name: str, _raw_message: str | None = None) -> str:
    """Build a bounded incident error summary from class name only."""
    validated_class_name = _validate_exception_class_name(
        "detail_error_class", exception_class_name
    )
    return f"error_class={validated_class_name}"


def resolve_telemetry_device_id(entry: Any) -> str | None:
    """Resolve telemetry device_id from the persisted box_id option only."""
    options = getattr(entry, "options", {}) or {}
    value = options.get("box_id")
    if isinstance(value, str):
        stripped_value = value.strip()
        if stripped_value:
            if _DIGITS_RE.fullmatch(stripped_value):
                return stripped_value
            _LOGGER.debug(
                "Cloud telemetry skipped because entry.options['box_id'] is not numeric"
            )
            return None
    elif value is not None:
        coerced_value = str(value).strip()
        if coerced_value:
            if _DIGITS_RE.fullmatch(coerced_value):
                return coerced_value
            _LOGGER.debug(
                "Cloud telemetry skipped because entry.options['box_id'] is not numeric"
            )
            return None

    _LOGGER.debug("Cloud telemetry skipped because entry.options['box_id'] is not set")
    return None


def build_producer_event(
    *,
    event_name: str | EventName,
    occurred_at: str,
    device_id: str,
    install_id_hash: str,
    integration_version: str,
    run_id: str,
    correlation_id: str,
    diagnostics: Mapping[str, Any] | None = None,
) -> dict[str, str | int | float | bool]:
    """Build and validate a producer event (without transport)."""
    event_name_value = _coerce_event_name(event_name)
    event_spec = _get_event_spec(event_name_value)

    event: dict[str, Any] = {
        "schema_version": SCHEMA_VERSION,
        "source_product": SOURCE_PRODUCT,
        "event_class": event_spec.event_class.value,
        "event_name": event_name_value,
        "occurred_at": occurred_at,
        "device_id": device_id,
        "install_id_hash": install_id_hash,
        "integration_version": integration_version,
        "run_id": run_id,
        "correlation_id": correlation_id,
        "result": event_spec.result.value,
        "severity": event_spec.severity.value,
    }
    if diagnostics:
        event.update(dict(diagnostics))

    return validate_producer_event(event)


def validate_producer_event(
    event: Mapping[str, Any],
) -> dict[str, str | int | float | bool]:
    """Validate a producer event strictly against the contract."""
    return _normalize_event(event, strict_unknown_keys=True)


def build_sink_payload(
    event: Mapping[str, Any], transport: str | Transport
) -> dict[str, str | int | float | bool]:
    """Build a sink payload by dropping unknown keys and injecting transport."""
    payload = _normalize_event(event, strict_unknown_keys=False)
    payload["transport"] = _coerce_transport(transport)
    return payload


def _normalize_event(  # NOSONAR
    event: Mapping[str, Any], *, strict_unknown_keys: bool
) -> dict[str, str | int | float | bool]:
    if "transport" in event:
        raise CloudContractError("Producer events must not set transport")

    for forbidden_key in FORBIDDEN_TOP_LEVEL_KEYS:
        if forbidden_key in event:
            raise CloudContractError(f"Forbidden telemetry key: {forbidden_key}")

    event_name = _coerce_required_string(event, "event_name")
    event_spec = _get_event_spec(event_name)
    event_class = event_spec.event_class.value
    allowed_keys = set(PRODUCER_COMMON_FIELDS)
    allowed_keys.update(ALLOWLISTED_KEYS_BY_EVENT_CLASS[event_class])
    allowed_keys.add("details_json")

    normalized: dict[str, str | int | float | bool] = {}
    normalized["schema_version"] = _require_fixed_string(
        event, "schema_version", SCHEMA_VERSION
    )
    normalized["source_product"] = _require_fixed_string(
        event, "source_product", SOURCE_PRODUCT
    )
    normalized["event_class"] = _require_matching_string(
        event, "event_class", event_class
    )
    normalized["event_name"] = event_name
    normalized["occurred_at"] = _coerce_required_string(event, "occurred_at")
    normalized["device_id"] = _validate_device_id(_coerce_required_string(event, "device_id"))
    normalized["install_id_hash"] = _validate_install_id_hash(
        _coerce_required_string(event, "install_id_hash")
    )
    normalized["integration_version"] = _coerce_required_string(
        event, "integration_version"
    )
    normalized["run_id"] = _coerce_required_string(event, "run_id")
    normalized["correlation_id"] = _coerce_required_string(event, "correlation_id")
    normalized["result"] = _require_matching_string(
        event, "result", event_spec.result.value
    )
    normalized["severity"] = _require_matching_string(
        event, "severity", event_spec.severity.value
    )

    for key, value in event.items():
        if key in PRODUCER_COMMON_FIELDS or key == "transport":
            continue
        if key not in allowed_keys:
            if strict_unknown_keys:
                raise CloudContractError(f"Unknown telemetry key: {key}")
            continue

        if key == "details_json":
            normalized[key] = _validate_details_json(value)
            continue
        if key.startswith("metric_"):
            normalized[key] = _validate_metric_value(key, value)
            continue
        if key.startswith("detail_"):
            normalized[key] = _validate_detail_value(key, value)
            continue
        raise CloudContractError(f"Unsupported telemetry key: {key}")

    if "detail_failure_class" in normalized:
        raw_summary = event.get("detail_failure_summary")
        normalized["detail_failure_summary"] = build_failure_summary(
            str(normalized["detail_failure_class"]),
            raw_summary if isinstance(raw_summary, str) else None,
        )
    elif "detail_failure_summary" in normalized:
        raise CloudContractError(
            "detail_failure_summary requires detail_failure_class"
        )

    if "detail_error_class" in normalized:
        raw_summary = event.get("detail_error_summary")
        normalized["detail_error_summary"] = build_error_summary(
            str(normalized["detail_error_class"]),
            raw_summary if isinstance(raw_summary, str) else None,
        )
    elif "detail_error_summary" in normalized:
        raise CloudContractError("detail_error_summary requires detail_error_class")

    return normalized


def _coerce_event_name(event_name: str | EventName) -> str:
    if isinstance(event_name, EventName):
        return event_name.value
    if not isinstance(event_name, str) or not event_name.strip():
        raise CloudContractError("event_name must be a non-empty string")
    return event_name.strip()


def _coerce_transport(transport: str | Transport) -> str:
    value = transport.value if isinstance(transport, Transport) else str(transport).strip()
    if value not in {item.value for item in Transport}:
        raise CloudContractError(f"Unsupported transport: {transport}")
    return value


def _get_event_spec(event_name: str) -> EventSpec:
    try:
        return EVENT_TAXONOMY[event_name]
    except KeyError as err:
        raise CloudContractError(f"Unknown event_name: {event_name}") from err


def _coerce_required_string(event: Mapping[str, Any], key: str) -> str:
    value = event.get(key)
    if not isinstance(value, str) or not value.strip():
        raise CloudContractError(f"{key} must be a non-empty string")
    return value.strip()


def _require_fixed_string(event: Mapping[str, Any], key: str, expected_value: str) -> str:
    value = _coerce_required_string(event, key)
    if value != expected_value:
        raise CloudContractError(f"{key} must equal {expected_value}")
    return value


def _require_matching_string(event: Mapping[str, Any], key: str, expected_value: str) -> str:
    value = _coerce_required_string(event, key)
    if value != expected_value:
        raise CloudContractError(f"{key} must equal {expected_value}")
    return value


def _validate_device_id(value: str) -> str:
    if not _DIGITS_RE.fullmatch(value):
        raise CloudContractError("device_id must be a numeric box_id string")
    return value


def _validate_install_id_hash(value: str) -> str:
    if not _HEX_64_RE.fullmatch(value):
        raise CloudContractError(
            "install_id_hash must be a lowercase sha256 hex string"
        )
    return value


def _validate_metric_value(key: str, value: Any) -> int | float | bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value
    raise CloudContractError(f"{key} must be numeric or boolean")


def _validate_detail_value(key: str, value: Any) -> str:
    if not isinstance(value, str) or not value.strip():
        raise CloudContractError(f"{key} must be a non-empty string")
    normalized_value = value.strip()

    if key in DETAIL_ENUMS and normalized_value not in DETAIL_ENUMS[key]:
        raise CloudContractError(f"{key} must use a frozen enum value")
    if key == "detail_service_name" and normalized_value not in ALLOWED_SERVICE_NAMES:
        raise CloudContractError(f"{key} must use a bounded domain.service constant")
    if key in {"detail_failure_class", "detail_error_class"}:
        return _validate_exception_class_name(key, normalized_value)
    return normalized_value


def _validate_exception_class_name(key: str, value: str) -> str:
    if not _CLASS_NAME_RE.fullmatch(value):
        raise CloudContractError(f"{key} must be a Python exception class name")
    return value


def _validate_details_json(value: Any) -> str:
    if isinstance(value, str):
        normalized_value = _sanitize_details_json_string(value)
    else:
        normalized_value = json.dumps(
            _sanitize_details_json_value(value, depth=0),
            separators=(",", ":"),
            sort_keys=True,
        )

    if len(normalized_value.encode("utf-8")) > MAX_DETAILS_JSON_BYTES:
        raise CloudContractError("details_json must be <= 2 KiB")
    return normalized_value


def _sanitize_details_json_value(value: Any, *, depth: int) -> Any:
    if depth > MAX_DETAILS_JSON_DEPTH:
        raise CloudContractError("details_json must not exceed 4 nested levels")
    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return _sanitize_details_json_string(value)
    if isinstance(value, Mapping):
        return _sanitize_details_json_mapping(value, depth=depth)
    raise CloudContractError(
        "details_json must contain only nested objects with scalar values"
    )


def _sanitize_details_json_mapping(value: Mapping[str, Any], *, depth: int) -> dict[str, Any]:
    if _looks_like_home_assistant_state_payload(value):
        raise CloudContractError("details_json must not contain Home Assistant state payloads")

    sanitized: dict[str, Any] = {}
    for raw_key, raw_value in value.items():
        key = _normalize_details_json_key(raw_key)
        if key in FORBIDDEN_DETAILS_JSON_KEYS:
            continue
        sanitized[key] = _sanitize_details_json_value(raw_value, depth=depth + 1)

    return sanitized


def _normalize_details_json_key(value: Any) -> str:
    if not isinstance(value, str):
        raise CloudContractError("details_json keys must be strings")
    normalized_value = value.strip()
    if not normalized_value or not _DETAILS_KEY_RE.fullmatch(normalized_value):
        raise CloudContractError("details_json keys must use bounded snake_case names")
    return normalized_value


def _sanitize_details_json_string(value: str) -> str:
    normalized_value = value.strip()
    if _DETAILS_TOKEN_RE.search(normalized_value) or _DETAILS_SECRET_RE.search(
        normalized_value
    ):
        return "***REDACTED***"
    if _ENTITY_ID_RE.fullmatch(normalized_value):
        return "***REDACTED***"
    if len(normalized_value) > MAX_DETAIL_STRING_LENGTH:
        return f"{normalized_value[:MAX_DETAIL_STRING_LENGTH]}..."
    return normalized_value


def _looks_like_home_assistant_state_payload(value: Mapping[str, Any]) -> bool:
    keys = {key for key in value if isinstance(key, str)}
    return (
        {"entity_id", "state"}.issubset(keys)
        or {"entity_id", "attributes"}.issubset(keys)
        or {"state", "last_changed", "last_updated"}.issubset(keys)
    )


CANONICAL_MQTT_PAYLOAD_EXAMPLE = build_sink_payload(
    build_producer_event(
        event_name=EventName.PLANNER_RUN_COMPLETED,
        occurred_at="2026-04-20T12:00:00Z",
        device_id="12345",
        install_id_hash="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
        integration_version="2.3.35",
        run_id="12345:2026-04-20T12:00:00+00:00",
        correlation_id="12345:2026-04-20T12:00:00+00:00",
        diagnostics={
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
        },
    ),
    transport=Transport.MQTT,
)
