"""Side-effect-free solar provider candidate test helper."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any, Mapping, Sequence

from ..entities.solar_forecast_sensor import (
    _build_string_payload,
    _date_value_kwh,
    _extract_string_data,
    _get_today_tomorrow,
    _merge_totals,
    _normalize_hourly_keys,
)
from .provider_contract import build_forecast_solar_url, build_solcast_url

_LOGGER = logging.getLogger(__name__)
_TIMEOUT_SECONDS = 10


class _ProviderHttpError(Exception):
    def __init__(self, status: int) -> None:
        super().__init__("provider_http_error")
        self.status = status


class _InvalidProviderResponse(Exception):
    pass


class _ProviderUnavailable(Exception):
    pass


async def run_solar_candidate_test(
    session: Any,
    dto_or_provider: Mapping[str, Any] | str,
    credentials: Mapping[str, Any] | None = None,
    gps: Mapping[str, float] | None = None,
    strings: Sequence[Mapping[str, float]] | None = None,
) -> dict[str, Any]:
    """Run a bounded, side-effect-free probe for unsaved solar settings."""
    dto = (
        dict(dto_or_provider)
        if isinstance(dto_or_provider, Mapping)
        else _legacy_candidate_dto(
            dto_or_provider,
            credentials or {},
            gps or {},
            strings or (),
        )
    )
    provider = str(dto.get("solar_forecast_provider", ""))
    try:
        return await asyncio.wait_for(
            _run_provider_candidate(session, dto),
            timeout=_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        code = "timeout"
    except _ProviderHttpError as err:
        code = _classify_http_status(err.status)
    except _InvalidProviderResponse:
        code = "invalid_response"
    except _ProviderUnavailable:
        code = "provider_unreachable"
    except (TypeError, ValueError, KeyError):
        code = "invalid_response"
    except Exception:  # noqa: BLE001
        code = "provider_unreachable"

    _LOGGER.warning(
        "Solar candidate test failed for provider %s: %s",
        _safe_provider(provider),
        code,
    )
    return {"ok": False, "code": code}


async def _run_provider_candidate(
    session: Any,
    dto: Mapping[str, Any],
) -> dict[str, Any]:
    provider = dto.get("solar_forecast_provider")
    if provider == "forecast_solar":
        return await _run_forecast_solar(session, dto)
    if provider == "solcast":
        return await _run_solcast(session, dto)
    raise ValueError("unknown provider")


async def _run_forecast_solar(
    session: Any,
    dto: Mapping[str, Any],
) -> dict[str, Any]:
    strings = _enabled_strings(dto)
    if not strings:
        return {"tomorrow_total_kwh": 0.0, "forecast_covers_tomorrow": False}

    api_key = str(dto.get("solar_forecast_api_key") or "").strip()
    lat = _float_required(dto.get("solar_forecast_latitude"))
    lon = _float_required(dto.get("solar_forecast_longitude"))
    per_string: list[dict[str, dict[str, float]]] = []
    raw_payloads: list[dict[str, Any] | None] = []

    for string in strings[:2]:
        url = build_forecast_solar_url(
            api_key=api_key,
            lat=lat,
            lon=lon,
            declination=int(_float_required(string.get("declination"))),
            compass_azimuth=int(_float_required(string.get("azimuth"))),
            kwp=_float_required(string.get("kwp")),
            legacy_provider_value=bool(string.get("legacy_provider_value", False)),
        )
        raw = await _fetch_json(session, url)
        raw_payloads.append(raw)
        per_string.append(
            _extract_string_data(
                raw,
                _normalize_hourly_keys,
                label=f"String{len(per_string) + 1}",
            )
        )

    while len(per_string) < 2:
        raw_payloads.append(None)
        per_string.append({"hourly": {}, "daily": {}})

    total_hourly, total_daily = _merge_totals(per_string[0], per_string[1])
    forecast_data: dict[str, Any] = {
        "response_time": datetime.now().isoformat(),
        "provider": "forecast_solar",
        "total_hourly": total_hourly,
        "total_daily": total_daily,
    }
    forecast_data.update(_build_string_payload("string1", raw_payloads[0], per_string[0]))
    forecast_data.update(_build_string_payload("string2", raw_payloads[1], per_string[1]))
    return _summary(forecast_data)


async def _run_solcast(
    session: Any,
    dto: Mapping[str, Any],
) -> dict[str, Any]:
    strings = _enabled_strings(dto)
    if not strings:
        return {"tomorrow_total_kwh": 0.0, "forecast_covers_tomorrow": False}

    api_key = str(dto.get("solcast_api_key") or "").strip()
    site_id = str(dto.get("solcast_site_id") or "").strip()
    kwp1 = _float_required(strings[0].get("kwp")) if len(strings) >= 1 else 0.0
    kwp2 = _float_required(strings[1].get("kwp")) if len(strings) >= 2 else 0.0
    total_kwp = kwp1 + kwp2
    if not api_key or not site_id or total_kwp <= 0:
        raise ValueError("invalid solcast request")

    url = build_solcast_url(api_key=api_key, site_id=site_id)
    payload = await _fetch_json(session, url)
    forecasts = payload.get("forecasts")
    if not isinstance(forecasts, list) or not forecasts:
        raise _InvalidProviderResponse()

    daily_kwh: dict[str, float] = {}
    for entry in forecasts:
        parsed = _parse_solcast_entry(entry, total_kwp)
        if parsed is None:
            continue
        period_end, pv_estimate_kw, period_hours = parsed
        day_key = period_end.split("T")[0]
        daily_kwh[day_key] = daily_kwh.get(day_key, 0.0) + (
            pv_estimate_kw * period_hours
        )
    if not daily_kwh:
        raise _InvalidProviderResponse()

    ratio1 = (kwp1 / total_kwp) if total_kwp else 0.0
    ratio2 = (kwp2 / total_kwp) if total_kwp else 0.0
    forecast_data = {
        "response_time": datetime.now().isoformat(),
        "provider": "solcast",
        "total_daily": daily_kwh,
        "string1_daily": {key: value * ratio1 for key, value in daily_kwh.items()},
        "string2_daily": {key: value * ratio2 for key, value in daily_kwh.items()},
    }
    return _summary(forecast_data)


async def _fetch_json(session: Any, url: str) -> dict[str, Any]:
    try:
        context = session.get(url)
    except Exception as err:  # noqa: BLE001
        raise _ProviderUnavailable() from err

    try:
        async with context as response:
            status = int(getattr(response, "status", 0))
            if status != 200:
                raise _ProviderHttpError(status)
            try:
                payload = await response.json()
            except Exception as err:  # noqa: BLE001
                raise _InvalidProviderResponse() from err
    except _ProviderHttpError:
        raise
    except _InvalidProviderResponse:
        raise
    except Exception as err:  # noqa: BLE001
        raise _ProviderUnavailable() from err

    if not isinstance(payload, dict):
        raise _InvalidProviderResponse()
    return payload


def _enabled_strings(dto: Mapping[str, Any]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for number in (1, 2):
        prefix = f"solar_forecast_string{number}"
        if not dto.get(f"{prefix}_enabled", False):
            continue
        string: dict[str, Any] = {"kwp": dto.get(f"{prefix}_kwp")}
        if dto.get("solar_forecast_provider") == "forecast_solar":
            string.update(
                {
                    "declination": dto.get(f"{prefix}_declination"),
                    "azimuth": dto.get(f"{prefix}_azimuth"),
                    "legacy_provider_value": dto.get(
                        f"{prefix}_azimuth_legacy_provider_value", False
                    ),
                }
            )
        result.append(string)
    return result


def _legacy_candidate_dto(
    provider: str,
    credentials: Mapping[str, Any],
    gps: Mapping[str, float],
    strings: Sequence[Mapping[str, float]],
) -> dict[str, Any]:
    """Adapt the pre-DTO internal call shape during the compatibility window."""
    dto: dict[str, Any] = {
        "solar_forecast_provider": provider,
        "solar_forecast_mode": "daily_optimized",
        **credentials,
        "solar_forecast_latitude": gps.get("latitude"),
        "solar_forecast_longitude": gps.get("longitude"),
    }
    for number in (1, 2):
        prefix = f"solar_forecast_string{number}"
        enabled = number <= len(strings)
        dto[f"{prefix}_enabled"] = enabled
        if not enabled:
            continue
        string = strings[number - 1]
        dto[f"{prefix}_kwp"] = string.get("kwp")
        dto[f"{prefix}_declination"] = string.get("declination")
        dto[f"{prefix}_azimuth"] = string.get("azimuth")
    return dto


def _summary(forecast_data: Mapping[str, Any]) -> dict[str, Any]:
    _today, tomorrow = _get_today_tomorrow()
    total_daily = forecast_data.get("total_daily", {})
    covers_tomorrow = (
        isinstance(total_daily, dict) and tomorrow.isoformat() in total_daily
    )
    return {
        "tomorrow_total_kwh": _date_value_kwh(
            dict(forecast_data), "total_daily", tomorrow
        ),
        "forecast_covers_tomorrow": covers_tomorrow,
    }


def _parse_solcast_entry(
    entry: Mapping[str, Any], total_kwp: float
) -> tuple[str, float, float] | None:
    period_end = entry.get("period_end")
    ghi = entry.get("ghi")
    pv_estimate = entry.get("pv_estimate")
    if not isinstance(period_end, str) or (ghi is None and pv_estimate is None):
        return None

    if pv_estimate is not None:
        pv_estimate_kw = _float_required(pv_estimate)
    else:
        pv_estimate_kw = total_kwp * (_float_required(ghi) / 1000.0)
    return period_end, pv_estimate_kw, _parse_solcast_period_hours(entry.get("period"))


def _parse_solcast_period_hours(period: Any) -> float:
    if not isinstance(period, str):
        return 0.5
    if period.startswith("PT") and period.endswith("M"):
        try:
            return float(period[2:-1]) / 60.0
        except ValueError:
            return 0.5
    if period.startswith("PT") and period.endswith("H"):
        try:
            return float(period[2:-1])
        except ValueError:
            return 0.5
    return 0.5


def _float_required(value: Any) -> float:
    if isinstance(value, bool):
        raise ValueError("expected number")
    if not isinstance(value, (int, float, str)):
        raise ValueError("expected number")
    return float(value)


def _classify_http_status(status: int) -> str:
    if status in (401, 403):
        return "auth"
    if status == 422:
        return "invalid_response"
    return "provider_unreachable"


def _safe_provider(provider: str) -> str:
    return provider if provider in {"forecast_solar", "solcast"} else "unknown"
