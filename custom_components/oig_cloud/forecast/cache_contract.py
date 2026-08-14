"""Validation and provenance helpers for durable solar forecast snapshots."""

from __future__ import annotations

import copy
import hashlib
import json
import math
from datetime import date, datetime, timedelta
from typing import Any, Mapping

from .refresh_result import RETRYABLE_CODES

SCHEMA_VERSION = 2
_PROVENANCE_KEYS = (
    "entry_id",
    "provider",
    "config_fingerprint",
    "credential_revision",
)


def _canonical_config_value(value: Any) -> Any:
    if value is None or isinstance(value, (str, bool, int)):
        return value
    if isinstance(value, float):
        if not math.isfinite(value):
            return {"invalid_float": repr(value)}
        return int(value) if value.is_integer() else value
    return {"invalid_type": type(value).__name__}


def build_cache_provenance(
    entry_id: str, options: Mapping[str, Any], credential_revision: int
) -> dict[str, Any]:
    """Build non-secret cache identity from effective runtime inputs."""
    provider = str(options.get("solar_forecast_provider", "forecast_solar"))
    fields = [
        "solar_forecast_provider",
        "solar_forecast_mode",
        "solar_forecast_string1_enabled",
        "solar_forecast_string1_kwp",
        "solar_forecast_string2_enabled",
        "solar_forecast_string2_kwp",
    ]
    if provider == "forecast_solar":
        fields.extend(
            [
                "solar_forecast_latitude",
                "solar_forecast_longitude",
                "solar_forecast_string1_declination",
                "solar_forecast_string1_azimuth",
                "solar_forecast_string2_declination",
                "solar_forecast_string2_azimuth",
            ]
        )
    normalized = {
        key: _canonical_config_value(options.get(key)) for key in sorted(fields)
    }
    serialized = json.dumps(
        normalized, sort_keys=True, separators=(",", ":"), ensure_ascii=True
    ).encode("ascii")
    return {
        "entry_id": entry_id,
        "provider": provider,
        "config_fingerprint": hashlib.sha256(serialized).hexdigest(),
        "credential_revision": int(credential_revision),
    }


def build_cache_envelope(
    *,
    provenance: Mapping[str, Any],
    forecast_data: Mapping[str, Any],
    last_accepted_time: datetime | None,
    saved_at: datetime,
    retry_state: Mapping[str, Any] | None = None,
) -> dict[str, Any]:
    """Create a schema-2 entry-specific cache envelope."""
    envelope = {
        "schema": SCHEMA_VERSION,
        **{key: copy.deepcopy(provenance.get(key)) for key in _PROVENANCE_KEYS},
        "last_accepted_time": (
            last_accepted_time.isoformat() if last_accepted_time is not None else None
        ),
        "forecast_data": copy.deepcopy(dict(forecast_data)),
        "saved_at": saved_at.isoformat(),
    }
    if retry_state is not None:
        envelope["retry_state"] = copy.deepcopy(dict(retry_state))
    return envelope


def cache_provenance_matches(
    envelope: Mapping[str, Any], provenance: Mapping[str, Any]
) -> bool:
    """Return whether every non-secret provenance identity field matches."""
    return envelope.get("schema") == SCHEMA_VERSION and all(
        envelope.get(key) == provenance.get(key) for key in _PROVENANCE_KEYS
    )


def build_occurrence_id(
    entry_id: str, mode: str, scheduled_local: datetime
) -> str:
    """Build restart-stable scheduled identity including the local UTC offset."""
    source = json.dumps(
        [entry_id, mode, scheduled_local.isoformat()],
        separators=(",", ":"),
        ensure_ascii=True,
    ).encode("ascii")
    return hashlib.sha256(source).hexdigest()


def build_retry_state(
    *,
    occurrence_id: str,
    scheduled_local: datetime,
    completed_attempt_index: int,
    next_at: datetime,
    code: str,
    provenance: Mapping[str, Any],
) -> dict[str, Any]:
    """Create persisted bounded retry recovery state."""
    return {
        "occurrence_id": occurrence_id,
        "scheduled_local": scheduled_local.isoformat(),
        "completed_attempt_index": completed_attempt_index,
        "next_at": next_at.isoformat(),
        "code": code,
        **{key: copy.deepcopy(provenance.get(key)) for key in _PROVENANCE_KEYS},
    }


def _parse_aware_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo is not None else None


def validate_retry_state(
    state: Mapping[str, Any] | None,
    *,
    provenance: Mapping[str, Any],
    entry_id: str,
    mode: str,
    now: datetime,
) -> dict[str, Any] | None:
    """Return a restorable retry record, or clear unsafe/exhausted state."""
    if not isinstance(state, Mapping):
        return None
    if any(state.get(key) != provenance.get(key) for key in _PROVENANCE_KEYS):
        return None
    code = state.get("code")
    completed = state.get("completed_attempt_index")
    scheduled = _parse_aware_datetime(state.get("scheduled_local"))
    next_at = _parse_aware_datetime(state.get("next_at"))
    if (
        code not in RETRYABLE_CODES
        or isinstance(completed, bool)
        or completed not in (0, 1)
        or scheduled is None
        or next_at is None
    ):
        return None
    expected_id = build_occurrence_id(entry_id, mode, scheduled)
    expected_next = scheduled + timedelta(minutes=15 if completed == 0 else 45)
    horizon = scheduled + timedelta(minutes=45)
    if (
        state.get("occurrence_id") != expected_id
        or next_at != expected_next
        or now > horizon
    ):
        return None
    return copy.deepcopy(dict(state))


class CandidateValidationError(ValueError):
    """Raised when provider output is not a complete publishable snapshot."""


def _parse_response_time(value: Any) -> datetime:
    if not isinstance(value, str) or not value:
        raise CandidateValidationError("response_time must be parseable")
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as err:
        raise CandidateValidationError("response_time must be parseable") from err


def _validate_numeric(value: Any, *, field: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise CandidateValidationError(f"{field} must be numeric")
    number = float(value)
    if not math.isfinite(number):
        raise CandidateValidationError(f"{field} must be finite")
    if number < 0:
        raise CandidateValidationError(f"{field} must be non-negative")
    return number


def _validate_series(name: str, value: Any) -> None:
    if not isinstance(value, Mapping):
        raise CandidateValidationError(f"{name} must be a mapping")
    for key, number in value.items():
        if not isinstance(key, str):
            raise CandidateValidationError(f"{name} date/hour key is invalid")
        try:
            if name.endswith("_daily"):
                date.fromisoformat(key)
            else:
                datetime.fromisoformat(key.replace("Z", "+00:00"))
        except ValueError as err:
            unit = "date" if name.endswith("_daily") else "hour"
            raise CandidateValidationError(f"{name} has malformed {unit}") from err
        _validate_numeric(number, field=f"{name}[{key}]")


def _require_coverage(
    daily: Mapping[str, Any], *, name: str, today: date, tomorrow: date
) -> None:
    if today.isoformat() not in daily:
        raise CandidateValidationError(f"{name} must cover today")
    if tomorrow.isoformat() not in daily:
        raise CandidateValidationError(f"{name} must cover tomorrow")


def _validate_solcast_ratios(
    candidate: Mapping[str, Any],
    *,
    string1_enabled: bool,
    string2_enabled: bool,
    string1_kwp: float,
    string2_kwp: float,
    today: date,
    tomorrow: date,
) -> None:
    enabled_kwp = (string1_kwp if string1_enabled else 0.0) + (
        string2_kwp if string2_enabled else 0.0
    )
    if enabled_kwp <= 0:
        raise CandidateValidationError("Solcast enabled string ratio requires positive kWp")
    total_daily = candidate["total_daily"]
    for prefix, enabled, kwp in (
        ("string1", string1_enabled, string1_kwp),
        ("string2", string2_enabled, string2_kwp),
    ):
        if not enabled:
            continue
        ratio = kwp / enabled_kwp
        daily = candidate[f"{prefix}_daily"]
        for target in (today, tomorrow):
            key = target.isoformat()
            expected = float(total_daily[key]) * ratio
            if not math.isclose(
                float(daily[key]), expected, rel_tol=1e-7, abs_tol=1e-7
            ):
                raise CandidateValidationError(
                    f"Solcast {prefix} daily value violates configured kWp ratio"
                )


def validate_forecast_candidate(
    candidate: Mapping[str, Any] | None,
    *,
    provider: str,
    string1_enabled: bool,
    string2_enabled: bool,
    string1_kwp: float,
    string2_kwp: float,
    now: datetime,
) -> dict[str, Any]:
    """Return an independent complete snapshot or reject provider output."""
    if not isinstance(candidate, Mapping):
        raise CandidateValidationError("candidate must be a mapping")
    if not candidate:
        raise CandidateValidationError("candidate must not be empty")
    if candidate.get("error"):
        raise CandidateValidationError("candidate contains an error")
    _parse_response_time(candidate.get("response_time"))
    candidate_provider = candidate.get("provider")
    if candidate_provider is not None and candidate_provider != provider:
        raise CandidateValidationError("candidate provider does not match configuration")

    series_names = (
        "string1_hourly",
        "string1_daily",
        "string2_hourly",
        "string2_daily",
        "total_hourly",
        "total_daily",
    )
    for name in series_names:
        _validate_series(name, candidate.get(name))
    for name in (
        "string1_today_kwh",
        "string1_tomorrow_kwh",
        "string2_today_kwh",
        "string2_tomorrow_kwh",
        "total_today_kwh",
        "total_tomorrow_kwh",
    ):
        _validate_numeric(candidate.get(name), field=name)

    local_today = now.date()
    local_tomorrow = local_today + timedelta(days=1)
    _require_coverage(
        candidate["total_daily"],
        name="aggregate daily forecast",
        today=local_today,
        tomorrow=local_tomorrow,
    )
    for prefix, enabled in (
        ("string1", string1_enabled),
        ("string2", string2_enabled),
    ):
        if enabled:
            _require_coverage(
                candidate[f"{prefix}_daily"],
                name=f"enabled {prefix} daily forecast",
                today=local_today,
                tomorrow=local_tomorrow,
            )

    if provider == "solcast":
        _validate_solcast_ratios(
            candidate,
            string1_enabled=string1_enabled,
            string2_enabled=string2_enabled,
            string1_kwp=string1_kwp,
            string2_kwp=string2_kwp,
            today=local_today,
            tomorrow=local_tomorrow,
        )
    elif provider != "forecast_solar":
        raise CandidateValidationError("candidate provider is unsupported")

    return copy.deepcopy(dict(candidate))
