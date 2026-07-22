from __future__ import annotations

import asyncio
import importlib
import json
import sys
import types
from datetime import timedelta
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest


try:
    from homeassistant.util import dt as dt_util
except ModuleNotFoundError:
    homeassistant = types.ModuleType("homeassistant")
    config_entries = types.ModuleType("homeassistant.config_entries")
    core = types.ModuleType("homeassistant.core")
    helpers = types.ModuleType("homeassistant.helpers")
    aiohttp_client = types.ModuleType("homeassistant.helpers.aiohttp_client")
    entity_component = types.ModuleType("homeassistant.helpers.entity_component")
    device_registry = types.ModuleType("homeassistant.helpers.device_registry")
    entity_registry = types.ModuleType("homeassistant.helpers.entity_registry")
    event = types.ModuleType("homeassistant.helpers.event")
    http = types.ModuleType("homeassistant.helpers.http")
    storage = types.ModuleType("homeassistant.helpers.storage")
    util = types.ModuleType("homeassistant.util")
    dt_util = types.ModuleType("homeassistant.util.dt")
    aiohttp = types.ModuleType("aiohttp")
    aiohttp_web = types.ModuleType("aiohttp.web")

    class _HomeAssistantView:
        requires_auth = False

    def _callback(func: Any) -> Any:
        return func

    def _missing_clientsession(_hass: Any) -> Any:
        raise RuntimeError("async_get_clientsession not patched")

    class _Store:
        def __init__(self, *_args: Any, **_kwargs: Any) -> None:
            self._data = None

        async def async_load(self) -> Any:
            return self._data

        async def async_save(self, data: Any) -> None:
            self._data = data

    class _OigCloudSensor:
        pass

    class _JsonResponse:
        def __init__(self, data: Any, status: int = 200) -> None:
            self.status = status
            self.text = json.dumps(data)

    def _json_response(data: Any, *, status: int = 200, **_kwargs: Any) -> _JsonResponse:
        return _JsonResponse(data, status=status)

    config_entries.ConfigEntry = object
    core.HomeAssistant = object
    core.callback = _callback
    aiohttp_client.async_get_clientsession = _missing_clientsession
    entity_component.EntityComponent = object
    event.async_track_time_interval = lambda *_args, **_kwargs: None
    http.HomeAssistantView = _HomeAssistantView
    storage.Store = _Store
    dt_util.now = __import__("datetime").datetime.now
    dt_util.utcnow = __import__("datetime").datetime.utcnow
    dt_util.as_local = lambda value: value
    aiohttp.ClientSession = object
    aiohttp.ClientTimeout = lambda **_kwargs: None
    aiohttp.web = aiohttp_web
    aiohttp_web.Response = _JsonResponse
    aiohttp_web.Request = object
    aiohttp_web.json_response = _json_response
    homeassistant.config_entries = config_entries
    homeassistant.core = core
    homeassistant.helpers = helpers
    homeassistant.util = util
    helpers.aiohttp_client = aiohttp_client
    helpers.device_registry = device_registry
    helpers.entity_component = entity_component
    helpers.entity_registry = entity_registry
    helpers.event = event
    helpers.http = http
    helpers.storage = storage
    util.dt = dt_util

    root = Path(__file__).resolve().parents[1]
    oig_pkg = types.ModuleType("custom_components.oig_cloud")
    oig_pkg.__path__ = [str(root / "custom_components" / "oig_cloud")]
    entities_pkg = types.ModuleType("custom_components.oig_cloud.entities")
    entities_pkg.__path__ = [str(root / "custom_components" / "oig_cloud" / "entities")]
    base_sensor = types.ModuleType("custom_components.oig_cloud.entities.base_sensor")
    base_sensor.OigCloudSensor = _OigCloudSensor
    api_pkg = types.ModuleType("custom_components.oig_cloud.api")
    api_pkg.__path__ = [str(root / "custom_components" / "oig_cloud" / "api")]

    sys.modules.setdefault("aiohttp", aiohttp)
    sys.modules.setdefault("aiohttp.web", aiohttp_web)
    sys.modules.setdefault("homeassistant", homeassistant)
    sys.modules.setdefault("homeassistant.config_entries", config_entries)
    sys.modules.setdefault("homeassistant.core", core)
    sys.modules.setdefault("homeassistant.helpers", helpers)
    sys.modules.setdefault("homeassistant.helpers.aiohttp_client", aiohttp_client)
    sys.modules.setdefault("homeassistant.helpers.device_registry", device_registry)
    sys.modules.setdefault("homeassistant.helpers.entity_component", entity_component)
    sys.modules.setdefault("homeassistant.helpers.entity_registry", entity_registry)
    sys.modules.setdefault("homeassistant.helpers.event", event)
    sys.modules.setdefault("homeassistant.helpers.http", http)
    sys.modules.setdefault("homeassistant.helpers.storage", storage)
    sys.modules.setdefault("homeassistant.util", util)
    sys.modules.setdefault("homeassistant.util.dt", dt_util)
    sys.modules.setdefault("custom_components.oig_cloud", oig_pkg)
    sys.modules.setdefault("custom_components.oig_cloud.api", api_pkg)
    sys.modules.setdefault("custom_components.oig_cloud.entities", entities_pkg)
    sys.modules.setdefault("custom_components.oig_cloud.entities.base_sensor", base_sensor)

from custom_components.oig_cloud.api import ha_rest_api as api_module
from custom_components.oig_cloud.const import DOMAIN


_ADMIN_USER = SimpleNamespace(is_admin=True)
_NON_ADMIN_USER = SimpleNamespace(is_admin=False)


class DummyConfigEntries:
    def __init__(self, entries: list[Any]) -> None:
        self._entries = entries

    def async_entries(self, domain: str) -> list[Any]:
        return self._entries if domain == DOMAIN else []


class DummyHass:
    def __init__(self, entry: Any, box_id: str = "box1") -> None:
        self.config_entries = DummyConfigEntries([entry])
        self.data = {
            DOMAIN: {
                entry.entry_id: {
                    "coordinator": SimpleNamespace(data={box_id: {}}),
                }
            }
        }


class DummyJsonRequest:
    def __init__(
        self,
        hass: DummyHass,
        payload: dict[str, Any] | None = None,
        *,
        user: Any = _ADMIN_USER,
    ) -> None:
        self.app = {"hass": hass}
        self._mapping = {"hass_user": user}
        self._payload = payload or {}

    def get(self, key: str, default: Any = None) -> Any:
        return self._mapping.get(key, default)

    async def json(self) -> dict[str, Any]:
        return self._payload


class _Resp:
    def __init__(self, status: int = 200, payload: dict[str, Any] | None = None) -> None:
        self.status = status
        self._payload = payload or {}

    async def json(self) -> dict[str, Any]:
        return self._payload

    async def text(self) -> str:
        return json.dumps(self._payload)

    async def __aenter__(self) -> "_Resp":
        return self

    async def __aexit__(self, *_exc: Any) -> bool:
        return False


class _Session:
    def __init__(self, resp: _Resp | None = None, exc_text: str | None = None) -> None:
        self._resp = resp or _Resp()
        self._exc_text = exc_text
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def get(self, url: str, **kwargs: Any) -> _Resp:
        self.calls.append((url, kwargs))
        if self._exc_text:
            raise RuntimeError(self._exc_text)
        return self._resp


def _entry() -> Any:
    return SimpleNamespace(entry_id="entry1", domain=DOMAIN, options={}, data={})


def _hass(box_id: str = "box1") -> tuple[DummyHass, Any]:
    entry = _entry()
    return DummyHass(entry, box_id), entry


def _solar_view() -> Any:
    view_cls = getattr(api_module, "OIGCloudSolarTestView", None)
    assert view_cls is not None, "OIGCloudSolarTestView is not implemented"
    return view_cls()


def _candidate_module() -> Any:
    try:
        return importlib.import_module("custom_components.oig_cloud.forecast.candidate_test")
    except ModuleNotFoundError as exc:
        pytest.fail(f"candidate_test module is not implemented: {exc}")


def _forecast_payload(**overrides: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "provider": "forecast_solar",
        "solar_forecast_api_key": "fs_valid_secret",
        "solar_forecast_latitude": 50.12,
        "solar_forecast_longitude": 13.94,
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string1_kwp": 5.5,
        "solar_forecast_string1_declination": 35,
        "solar_forecast_string1_azimuth": 180,
        "solar_forecast_string2_enabled": False,
    }
    payload.update(overrides)
    return payload


def _solcast_payload(**overrides: Any) -> dict[str, Any]:
    payload = _forecast_payload(
        provider="solcast",
        solcast_api_key="sc_valid_secret",
        solcast_site_id="site-123",
    )
    payload.pop("solar_forecast_api_key")
    payload.update(overrides)
    return payload


def test_solar_test_non_admin_fails_before_outbound(monkeypatch: pytest.MonkeyPatch) -> None:
    hass, _ = _hass()
    calls: list[Any] = []

    async def _stub(*args: Any, **kwargs: Any) -> dict[str, Any]:
        calls.append((args, kwargs))
        return {"tomorrow_total_kwh": 1.0, "forecast_covers_tomorrow": True}

    monkeypatch.setattr(api_module, "run_solar_candidate_test", _stub, raising=False)

    response = asyncio.run(
        _solar_view().post(
            DummyJsonRequest(hass, _forecast_payload(), user=_NON_ADMIN_USER),
            "box1",
        )
    )

    assert response.status == 403
    assert calls == []


@pytest.mark.parametrize(
    "payload",
    [
        _forecast_payload(provider="unknown"),
        _forecast_payload(latitude=50.12),
        _forecast_payload(solar_panel_power_kwp=5.5),
    ],
)
def test_solar_test_rejects_unknown_provider_or_extra_key_before_outbound(
    payload: dict[str, Any], monkeypatch: pytest.MonkeyPatch
) -> None:
    hass, _ = _hass()
    calls: list[Any] = []

    async def _stub(*args: Any, **kwargs: Any) -> dict[str, Any]:
        calls.append((args, kwargs))
        return {"tomorrow_total_kwh": 1.0, "forecast_covers_tomorrow": True}

    monkeypatch.setattr(api_module, "run_solar_candidate_test", _stub, raising=False)

    response = asyncio.run(_solar_view().post(DummyJsonRequest(hass, payload), "box1"))

    assert response.status == 400
    assert calls == []


def test_solar_test_success_uses_shared_session_and_returns_shape(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    hass, _ = _hass()
    shared_session = object()
    calls: list[tuple[Any, str, dict[str, Any], dict[str, float], list[dict[str, Any]]]] = []

    async def _stub(
        session: Any,
        provider: str,
        credentials: dict[str, Any],
        gps: dict[str, float],
        strings: list[dict[str, Any]],
    ) -> dict[str, Any]:
        calls.append((session, provider, credentials, gps, strings))
        return {"tomorrow_total_kwh": 4.25, "forecast_covers_tomorrow": True}

    monkeypatch.setattr(
        api_module.aiohttp_client,
        "async_get_clientsession",
        lambda _hass: shared_session,
    )
    monkeypatch.setattr(api_module, "run_solar_candidate_test", _stub, raising=False)

    response = asyncio.run(
        _solar_view().post(DummyJsonRequest(hass, _forecast_payload()), "box1")
    )
    payload = json.loads(response.text)

    assert response.status == 200
    assert payload == {"tomorrow_total_kwh": 4.25, "forecast_covers_tomorrow": True}
    assert calls[0][0] is shared_session
    assert calls[0][1] == "forecast_solar"
    assert calls[0][2] == {"solar_forecast_api_key": "fs_valid_secret"}
    assert calls[0][3] == {"latitude": 50.12, "longitude": 13.94}
    assert calls[0][4] == [
        {"kwp": 5.5, "declination": 35.0, "azimuth": 180.0},
    ]


def test_candidate_helper_wraps_outbound_call_at_ten_seconds(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    candidate = _candidate_module()
    observed_timeouts: list[float] = []

    async def _fake_wait_for(awaitable: Any, *, timeout: float) -> Any:
        observed_timeouts.append(timeout)
        if hasattr(awaitable, "close"):
            awaitable.close()
        raise TimeoutError("verbose upstream timeout with fs_secret_123456789")

    monkeypatch.setattr(candidate.asyncio, "wait_for", _fake_wait_for)

    result = asyncio.run(
        candidate.run_solar_candidate_test(
            _Session(),
            "forecast_solar",
            {"solar_forecast_api_key": "fs_secret_123456789"},
            {"latitude": 50.12, "longitude": 13.94},
            [{"kwp": 5.5, "declination": 35.0, "azimuth": 180.0}],
        )
    )

    assert observed_timeouts == [10]
    assert result["code"] == "timeout"
    assert "fs_secret" not in json.dumps(result)
    assert "verbose upstream timeout" not in json.dumps(result)


def test_candidate_helper_redacts_forecast_solar_and_solcast_failures(
    caplog: pytest.LogCaptureFixture,
) -> None:
    candidate = _candidate_module()

    cases = [
        (
            "forecast_solar",
            {"solar_forecast_api_key": "fs_secret_123456789"},
            "https://api.forecast.solar/fs_secret_123456789/estimate",
            "verbose upstream forecast solar exception",
        ),
        (
            "solcast",
            {"solcast_api_key": "sc_secret_123456789", "solcast_site_id": "site-123"},
            "https://api.solcast.com.au/rooftop_sites/site-123/forecasts",
            "verbose upstream solcast exception",
        ),
    ]

    for provider, credentials, url, exc_text in cases:
        caplog.clear()
        result = asyncio.run(
            candidate.run_solar_candidate_test(
                _Session(exc_text=f"{exc_text}: {url}"),
                provider,
                credentials,
                {"latitude": 50.12, "longitude": 13.94},
                [{"kwp": 5.5, "declination": 35.0, "azimuth": 180.0}],
            )
        )
        combined = json.dumps(result, sort_keys=True) + caplog.text

        assert result["code"] in {"auth", "provider_unreachable", "invalid_response"}
        assert "fs_secret_123456789" not in combined
        assert "sc_secret_123456789" not in combined
        assert "fs_secret" not in combined
        assert "sc_secret" not in combined
        assert "api.forecast.solar" not in combined
        assert "api.solcast.com.au" not in combined
        assert "verbose upstream" not in combined


def test_candidate_helper_forecast_solar_success_shape() -> None:
    candidate = _candidate_module()
    tomorrow = (dt_util.now().date() + timedelta(days=1)).isoformat()
    session = _Session(
        _Resp(
            200,
            {
                "result": {
                    "watts": {f"{tomorrow}T10:00:00+00:00": 1000},
                    "watt_hours_day": {tomorrow: 5500},
                }
            },
        )
    )

    result = asyncio.run(
        candidate.run_solar_candidate_test(
            session,
            "forecast_solar",
            {"solar_forecast_api_key": "fs_valid_secret"},
            {"latitude": 50.12, "longitude": 13.94},
            [{"kwp": 5.5, "declination": 35.0, "azimuth": 180.0}],
        )
    )

    assert result == {"tomorrow_total_kwh": 5.5, "forecast_covers_tomorrow": True}


def test_solar_test_registration_and_post_only() -> None:
    registered: list[Any] = []

    class DummyHttp:
        def register_view(self, view: Any) -> None:
            registered.append(view)

    api_module.setup_api_endpoints(SimpleNamespace(http=DummyHttp()))

    solar_views = [view for view in registered if type(view).__name__ == "OIGCloudSolarTestView"]
    assert len(solar_views) == 1
    assert solar_views[0].url == f"{api_module.API_BASE}/{{box_id}}/solar_test"
    assert "post" in api_module.OIGCloudSolarTestView.__dict__
    assert "get" not in api_module.OIGCloudSolarTestView.__dict__
