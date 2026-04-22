"""Shield cloud telemetry helpers."""

from __future__ import annotations

import hashlib
import json
import logging
from pathlib import Path
from typing import Any, Mapping

from homeassistant.util.dt import now as dt_now

from ..shared.cloud_contract import build_producer_event, resolve_telemetry_device_id


_LOGGER = logging.getLogger(__name__)
_MANIFEST_PATH = Path(__file__).resolve().parents[1] / "manifest.json"
_SHIELD_RUN_ID = "na"
_DEFAULT_TIMEOUT_MINUTES = 15
_FORMATTING_TIMEOUT_MINUTES = 2
_FORMATTING_SERVICE = "oig_cloud.set_formating_mode"


def _load_integration_version() -> str:
    try:
        return str(json.loads(_MANIFEST_PATH.read_text(encoding="utf-8"))["version"])
    except Exception:
        return "unknown"


_INTEGRATION_VERSION = _load_integration_version()


def render_shield_log_marker(level: str, correlation_id: str | None, message: str) -> str:
    corr = correlation_id if isinstance(correlation_id, str) and correlation_id else "na"
    return f"[OIG_CLOUD_{level}][component=shield][corr={corr}][run=na] {message}"


def _resolve_timeout_minutes(service_name: str) -> int:
    if service_name == _FORMATTING_SERVICE:
        return _FORMATTING_TIMEOUT_MINUTES
    return _DEFAULT_TIMEOUT_MINUTES


def _resolve_install_id_hash(shield: Any) -> str | None:
    hass_data = getattr(getattr(shield, "hass", None), "data", {}) or {}
    core_uuid = str(hass_data.get("core.uuid", "")).strip()
    if not core_uuid:
        _LOGGER.debug("Shield cloud telemetry skipped because core.uuid is unavailable")
        return None
    return hashlib.sha256(core_uuid.encode("utf-8")).hexdigest()


def _build_shield_diagnostics(
    shield: Any,
    *,
    service_name: str,
    expected_entities: Mapping[str, str] | None,
    detail_result_reason: str | None,
    detail_duplicate_location: str | None,
) -> dict[str, Any]:
    entities = dict(expected_entities or {})
    diagnostics: dict[str, Any] = {
        "metric_timeout_minutes": _resolve_timeout_minutes(service_name),
        "metric_entity_count": len(entities),
        "metric_expected_change_count": len(entities),
        "metric_queue_depth": len(getattr(shield, "queue", [])),
        "metric_guard_active": bool(entities),
        "detail_service_name": service_name,
    }
    if detail_result_reason:
        diagnostics["detail_result_reason"] = detail_result_reason
    if detail_duplicate_location:
        diagnostics["detail_duplicate_location"] = detail_duplicate_location
    return diagnostics


async def emit_shield_decision_event(
    shield: Any,
    *,
    event_name: str,
    service_name: str,
    correlation_id: str | None,
    expected_entities: Mapping[str, str] | None,
    detail_result_reason: str | None = None,
    detail_duplicate_location: str | None = None,
) -> bool:
    emitter = getattr(shield, "_telemetry_emitter", None)
    if emitter is None:
        return False

    device_id = resolve_telemetry_device_id(getattr(shield, "entry", None))
    if device_id is None:
        return False

    install_id_hash = _resolve_install_id_hash(shield)
    if install_id_hash is None:
        return False

    try:
        event = build_producer_event(
            event_name=event_name,
            occurred_at=dt_now().isoformat(),
            device_id=device_id,
            install_id_hash=install_id_hash,
            integration_version=_INTEGRATION_VERSION,
            run_id=_SHIELD_RUN_ID,
            correlation_id=correlation_id or "na",
            diagnostics=_build_shield_diagnostics(
                shield,
                service_name=service_name,
                expected_entities=expected_entities,
                detail_result_reason=detail_result_reason,
                detail_duplicate_location=detail_duplicate_location,
            ),
        )
        return bool(await emitter.emit_cloud_event(event))
    except Exception as err:
        _LOGGER.warning(
            render_shield_log_marker(
                "WARNING",
                correlation_id,
                f"Shield decision telemetry emit failed: {err.__class__.__name__}",
            )
        )
        return False
