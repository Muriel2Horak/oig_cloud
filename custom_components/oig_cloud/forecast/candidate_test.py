"""Side-effect-free solar provider candidate test helper."""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime
from typing import Any, Mapping, Sequence

from ..entities.solar_forecast_sensor import (
    FORECAST_SOLAR_API_URL,
    FORECAST_SOLAR_API_URL_WITH_KEY,
    SOLCAST_ROOFTOP_API_URL,
    _build_string_payload,
    _date_value_kwh,
    _extract_string_data,
    _get_today_tomorrow,
    _merge_totals,
    _normalize_hourly_keys,
)

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
    provider: str,
    credentials: Mapping[str, Any],
    gps: Mapping[str, float],
    strings: Sequence[Mapping[str, float]],
) -> dict[str, Any]:
    """Run a bounded, side-effect-free probe for unsaved solar settings."""
    try:
        return await asyncio.wait_for(
            _run_provider_candidate(session, provider, credentials, gps, strings),
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
    provider: str,
    credentials: Mapping[str, Any],
    gps: Mapping[str, float],
    strings: Sequence[Mapping[str, float]],
) -> dict[str, Any]:
    if provider == "forecast_solar":
        return await _run_forecast_solar(session, credentials, gps, strings)
    if provider == "solcast":
        return await _run_solcast(session, credentials, strings)
    raise ValueError("unknown provider")


async def _run_forecast_solar(
    session: Any,
    credentials: Mapping[str, Any],
    gps: Mapping[str, float],
    strings: Sequence[Mapping[str, float]],
) -> dict[str, Any]:
    if not strings:
        return {"tomorrow_total_kwh": 0.0, "forecast_covers_tomorrow": False}

    api_key = str(credentials.get("solar_forecast_api_key") or "").strip()
    lat = _float_required(gps.get("latitude"))
    lon = _float_required(gps.get("longitude"))
    per_string: list[dict[str, dict[str, float]]] = []
    raw_payloads: list[dict[str, Any] | None] = []

    for string in strings[:2]:
        url = _forecast_solar_url(
            api_key=api_key,
            lat=lat,
            lon=lon,
            declination=_float_required(string.get("declination")),
            azimuth=_float_required(string.get("azimuth")),
            kwp=_float_required(string.get("kwp")),
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
    credentials: Mapping[str, Any],
    strings: Sequence[Mapping[str, float]],
) -> dict[str, Any]:
    if not strings:
        return {"tomorrow_total_kwh": 0.0, "forecast_covers_tomorrow": False}

    api_key = str(credentials.get("solcast_api_key") or "").strip()
    site_id = str(credentials.get("solcast_site_id") or "").strip()
    kwp1 = _float_required(strings[0].get("kwp")) if len(strings) >= 1 else 0.0
    kwp2 = _float_required(strings[1].get("kwp")) if len(strings) >= 2 else 0.0
    total_kwp = kwp1 + kwp2
    if not api_key or not site_id or total_kwp <= 0:
        raise ValueError("invalid solcast request")

    url = (
        f"{SOLCAST_ROOFTOP_API_URL.format(site_id=site_id)}"
        f"?format=json&api_key={api_key}"
    )
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


def _forecast_solar_url(
    *,
    api_key: str,
    lat: float,
    lon: float,
    declination: float,
    azimuth: float,
    kwp: float,
) -> str:
    if api_key:
        return FORECAST_SOLAR_API_URL_WITH_KEY.format(
            api_key=api_key,
            lat=lat,
            lon=lon,
            declination=declination,
            azimuth=azimuth,
            kwp=kwp,
        )
    return FORECAST_SOLAR_API_URL.format(
        lat=lat,
        lon=lon,
        declination=declination,
        azimuth=azimuth,
        kwp=kwp,
    )


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
