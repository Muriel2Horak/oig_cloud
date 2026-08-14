from __future__ import annotations

import asyncio
from copy import deepcopy
import importlib
import json
from types import SimpleNamespace
from typing import Any

import pytest

from tests.test_solar_test_view import DOMAIN, _ADMIN_USER, _forecast_payload, api_module
from custom_components.oig_cloud.forecast import solar_test_limiter


class _MemStore:
    bucket: dict[str, Any] = {}

    def __init__(self, _hass: Any, _version: int, key: str, **_kwargs: Any) -> None:
        self.key = key

    async def async_load(self) -> Any:
        return _MemStore.bucket.get(self.key)

    async def async_save(self, data: Any) -> None:
        _MemStore.bucket[self.key] = data

    async def async_remove(self) -> None:
        _MemStore.bucket.pop(self.key, None)


class DummyEntry:
    def __init__(self, entry_id: str = "entry1", options: dict[str, Any] | None = None) -> None:
        self.entry_id = entry_id
        self.domain = DOMAIN
        self.options = options or {}
        self.data: dict[str, Any] = {}


class DummyConfigEntries:
    def __init__(self, entries: list[Any]) -> None:
        self._entries = entries
        self.updated: list[Any] = []
        self.reload_calls = 0
        self.reload_failures = 0

    def async_entries(self, domain: str) -> list[Any]:
        return self._entries if domain == DOMAIN else []

    def async_update_entry(self, entry: Any, options: dict[str, Any] | None = None) -> None:
        entry.options = options or {}
        self.updated.append(entry)

    async def async_reload(self, _entry_id: str) -> None:
        self.reload_calls += 1
        if self.reload_failures:
            self.reload_failures -= 1
            raise RuntimeError("injected reload failure")


class DummyHass:
    def __init__(self, entry: DummyEntry, box_id: str = "box1") -> None:
        self.config_entries = DummyConfigEntries([entry])
        self.data = {
            DOMAIN: {
                entry.entry_id: {
                    "coordinator": SimpleNamespace(data={box_id: {}}),
                }
            }
        }


class DummyJsonRequest:
    def __init__(self, hass: DummyHass, payload: dict[str, Any] | None = None) -> None:
        self.app = {"hass": hass}
        self._payload = payload or {}

    def get(self, key: str, default: Any = None) -> Any:
        if key == "hass_user":
            return _ADMIN_USER
        return default

    async def json(self) -> dict[str, Any]:
        return self._payload


@pytest.fixture(autouse=True)
def solar_store(monkeypatch: pytest.MonkeyPatch) -> None:
    _MemStore.bucket = {}
    solar_key_store_module = importlib.import_module(
        "custom_components.oig_cloud.config.solar_key_store"
    )
    monkeypatch.setattr(solar_key_store_module, "Store", _MemStore)


def _solar_draft_values(**overrides: Any) -> dict[str, Any]:
    values: dict[str, Any] = {
        "solar_forecast_provider": "forecast_solar",
        "solar_forecast_mode": "daily_optimized",
        "solar_forecast_latitude": 50.12,
        "solar_forecast_longitude": 13.94,
        "solar_forecast_string1_enabled": True,
        "solar_forecast_string1_kwp": 5.5,
        "solar_forecast_string1_declination": 35,
        "solar_forecast_string1_azimuth": 180,
        "solar_forecast_string2_enabled": False,
    }
    values.update(overrides)
    return values


def test_solar_non_secret_draft_values_save_through_module_config() -> None:
    async def _run() -> None:
        entry = DummyEntry()
        hass = DummyHass(entry)
        view = api_module.OIGCloudModuleConfigView()

        response = await view.post(
            DummyJsonRequest(
                hass,
                {"section": "solar", "values": _solar_draft_values()},
            ),
            "box1",
        )

        assert response.status == 200
        for key, value in _solar_draft_values().items():
            assert entry.options[key] == value
        assert "solar_forecast_api_key" not in entry.options
        assert "solcast_api_key" not in entry.options
        assert "solcast_site_id" not in entry.options

    asyncio.run(_run())


def test_solar_module_config_keeps_private_credentials_out_of_rest_and_options() -> None:
    async def _run() -> None:
        entry = DummyEntry()
        hass = DummyHass(entry)
        view = api_module.OIGCloudModuleConfigView()
        values = _solar_draft_values(
            solar_forecast_api_key="fs_secret_123456789",
        )

        response = await view.post(
            DummyJsonRequest(hass, {"section": "solar", "values": values}),
            "box1",
        )

        assert response.status == 200
        combined_options = json.dumps(entry.options, sort_keys=True)
        assert "fs_secret_123456789" not in combined_options
        assert "sc_secret_123456789" not in combined_options
        assert "site_secret_123456789" not in combined_options
        assert "solar_forecast_api_key" not in entry.options
        assert "solcast_api_key" not in entry.options
        assert "solcast_site_id" not in entry.options

        store = api_module.SolarKeyStore(hass, entry.entry_id)
        assert await store.async_get_active("forecast_solar") == {
            "solar_forecast_api_key": "fs_secret_123456789"
        }
        assert await store.async_get_candidate("forecast_solar") is None
        assert await store.async_get_active("solcast") is None

        get_response = await view.get(DummyJsonRequest(hass), "box1")
        body = json.loads(get_response.text)
        combined_rest = json.dumps(body, sort_keys=True)
        assert "fs_secret_123456789" not in combined_rest
        assert "sc_secret_123456789" not in combined_rest
        assert "site_secret_123456789" not in combined_rest
        assert body["solar"]["solar_forecast_api_key_set"] is True
        assert body["solar"]["solcast_api_key_set"] is False
        assert body["solar"]["solcast_site_id_set"] is False
        assert body["solar"]["solar_forecast_latitude"] == 50.12
        assert body["solar"]["solar_forecast_string1_kwp"] == 5.5

    asyncio.run(_run())


def test_legacy_option_secret_is_adopted_on_next_explicit_solar_save() -> None:
    async def _run() -> None:
        entry = DummyEntry(
            options=_solar_draft_values(
                solar_forecast_mode="hourly",
                solar_forecast_api_key="legacy-options-secret",
            )
        )
        hass = DummyHass(entry)

        response = await api_module.OIGCloudModuleConfigView().post(
            DummyJsonRequest(
                hass,
                {
                    "section": "solar",
                    "values": {"solar_forecast_string1_kwp": 6.0},
                },
            ),
            "box1",
        )

        assert response.status == 200
        assert entry.options["solar_forecast_string1_kwp"] == 6.0
        assert "solar_forecast_api_key" not in entry.options
        store = api_module.SolarKeyStore(hass, entry.entry_id)
        assert await store.async_get_active("forecast_solar") == {
            "solar_forecast_api_key": "legacy-options-secret"
        }

    asyncio.run(_run())


def test_solar_module_config_provider_switch_without_key_clears_inactive_store() -> None:
    async def _run() -> None:
        entry = DummyEntry(
            options=_solar_draft_values(solar_forecast_provider="solcast")
        )
        hass = DummyHass(entry)
        store = api_module.SolarKeyStore(hass, entry.entry_id)
        await store.async_set_candidate(
            "solcast",
            {
                "solcast_api_key": "sc_secret_123456789",
                "solcast_site_id": "site_secret_123456789",
            },
        )
        await store.async_promote_candidate("solcast", "2026-07-22T00:00:00+00:00")
        view = api_module.OIGCloudModuleConfigView()

        response = await view.post(
            DummyJsonRequest(
                hass,
                {
                    "section": "solar",
                    "values": {"solar_forecast_provider": "forecast_solar"},
                },
            ),
            "box1",
        )

        assert response.status == 200
        assert entry.options["solar_forecast_provider"] == "forecast_solar"
        assert entry.options["solar_forecast_latitude"] == 50.12
        assert entry.options["solar_forecast_string1_declination"] == 35
        assert entry.options["solar_forecast_string1_azimuth"] == 180
        reloaded = api_module.SolarKeyStore(hass, entry.entry_id)
        assert await reloaded.async_get_active("solcast") is None
        assert await reloaded.async_get_candidate("solcast") is None
        combined_options = json.dumps(entry.options, sort_keys=True)
        assert "solcast_api_key" not in entry.options
        assert "solcast_site_id" not in entry.options
        assert "sc_secret_123456789" not in combined_options
        assert "site_secret_123456789" not in combined_options

    asyncio.run(_run())


def test_save_without_proof_activates_unverified_and_failed_test_is_side_effect_free(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _run() -> None:
        entry = DummyEntry(
            options=_solar_draft_values(
                solar_forecast_api_key="",
                solar_forecast_string1_enabled=True,
            )
        )
        hass = DummyHass(entry)
        store = api_module.SolarKeyStore(hass, entry.entry_id)
        await store.async_set_candidate(
            "forecast_solar",
            {"solar_forecast_api_key": "fs_old_verified_secret"},
        )
        await store.async_promote_candidate("forecast_solar", "2026-07-22T00:00:00+00:00")
        view = api_module.OIGCloudModuleConfigView()
        candidate_response = await view.post(
            DummyJsonRequest(
                hass,
                {
                    "section": "solar",
                    "values": {"solar_forecast_api_key": "fs_bad_replacement_secret"},
                },
            ),
            "box1",
        )
        assert candidate_response.status == 200
        assert await store.async_get_active("forecast_solar") == {
            "solar_forecast_api_key": "fs_bad_replacement_secret"
        }
        state_after_save = await store.async_api_state()
        assert state_after_save["verified"] is False
        before_options = dict(entry.options)
        before_store = deepcopy(_MemStore.bucket)

        async def _auth_failure(*_args: Any, **_kwargs: Any) -> dict[str, Any]:
            return {"ok": False, "code": "auth"}

        monkeypatch.setattr(
            api_module.aiohttp_client,
            "async_get_clientsession",
            lambda _hass: object(),
        )
        monkeypatch.setattr(api_module, "run_solar_candidate_test", _auth_failure)

        solar_response = await api_module.OIGCloudSolarTestView().post(
            DummyJsonRequest(
                hass,
                _forecast_payload(solar_forecast_api_key="fs_bad_replacement_secret"),
            ),
            "box1",
        )

        assert solar_response.status == 502
        assert await store.async_get_active("forecast_solar") == {
            "solar_forecast_api_key": "fs_bad_replacement_secret"
        }
        assert entry.options == before_options
        assert _MemStore.bucket == before_store
        assert "fs_bad_replacement_secret" not in json.dumps(entry.options, sort_keys=True)

    asyncio.run(_run())


async def _successful_proof(
    monkeypatch: pytest.MonkeyPatch,
    hass: DummyHass,
    payload: dict[str, Any],
) -> str:
    hass.data[DOMAIN].pop(solar_test_limiter.HASS_DATA_KEY, None)
    monkeypatch.setattr(
        api_module.aiohttp_client,
        "async_get_clientsession",
        lambda _hass: object(),
    )

    async def _success(*_args: Any, **_kwargs: Any) -> dict[str, Any]:
        return {"tomorrow_total_kwh": 4.2, "forecast_covers_tomorrow": True}

    monkeypatch.setattr(api_module, "run_solar_candidate_test", _success)
    response = await api_module.OIGCloudSolarTestView().post(
        DummyJsonRequest(hass, payload), "box1"
    )
    assert response.status == 200
    body = json.loads(response.text)
    assert set(body) == {
        "tomorrow_total_kwh",
        "forecast_covers_tomorrow",
        "proof",
    }
    assert isinstance(body["proof"], str)
    return body["proof"]


def test_successful_test_proof_activates_verified_once_on_explicit_save(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _run() -> None:
        entry = DummyEntry(options=_solar_draft_values())
        hass = DummyHass(entry)
        store = api_module.SolarKeyStore(hass, entry.entry_id)
        await store.async_set_candidate(
            "forecast_solar", {"solar_forecast_api_key": "old-secret"}
        )
        await store.async_promote_candidate(
            "forecast_solar", "2026-08-10T00:00:00+00:00"
        )
        before_options = deepcopy(entry.options)
        before_store = deepcopy(_MemStore.bucket)

        candidate_payload = _forecast_payload(
            solar_forecast_api_key="new-secret",
            solar_forecast_string1_kwp=6.0,
        )
        proof = await _successful_proof(monkeypatch, hass, candidate_payload)
        assert entry.options == before_options
        assert _MemStore.bucket == before_store

        save_payload = {
            "section": "solar",
            "values": {
                "solar_forecast_api_key": "new-secret",
                "solar_forecast_string1_kwp": 6.0,
            },
            "solar_test_proof": proof,
        }
        response = await api_module.OIGCloudModuleConfigView().post(
            DummyJsonRequest(hass, save_payload), "box1"
        )
        assert response.status == 200
        body = json.loads(response.text)
        assert body["verified"] is True
        assert body["revision"] == 2
        assert await store.async_get_active("forecast_solar") == {
            "solar_forecast_api_key": "new-secret"
        }
        assert entry.options["solar_forecast_string1_kwp"] == 6.0

        before_replay = deepcopy((_MemStore.bucket, entry.options))
        replay = await api_module.OIGCloudModuleConfigView().post(
            DummyJsonRequest(hass, save_payload), "box1"
        )
        assert replay.status == 400
        assert deepcopy((_MemStore.bucket, entry.options)) == before_replay

    asyncio.run(_run())


def test_mismatched_proof_and_concurrent_replay_mutate_exactly_once(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _run() -> None:
        entry = DummyEntry(options=_solar_draft_values())
        hass = DummyHass(entry)
        proof = await _successful_proof(monkeypatch, hass, _forecast_payload())
        mismatched = await api_module.OIGCloudModuleConfigView().post(
            DummyJsonRequest(
                hass,
                {
                    "section": "solar",
                    "values": {"solar_forecast_string1_kwp": 6.0},
                    "solar_test_proof": proof,
                },
            ),
            "box1",
        )
        assert mismatched.status == 400
        assert entry.options["solar_forecast_string1_kwp"] == 5.5

        proof = await _successful_proof(monkeypatch, hass, _forecast_payload())
        request_payload = {
            "section": "solar",
            "values": {"solar_forecast_api_key": "fs_valid_secret"},
            "solar_test_proof": proof,
        }
        responses = await asyncio.gather(
            *(
                api_module.OIGCloudModuleConfigView().post(
                    DummyJsonRequest(hass, request_payload), "box1"
                )
                for _ in range(2)
            )
        )
        assert sorted(response.status for response in responses) == [200, 400]
        state = await api_module.SolarKeyStore(hass, entry.entry_id).async_api_state()
        assert state["revision"] == 1

    asyncio.run(_run())


def test_reload_rollback_restores_state_but_consumes_claimed_proof(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def _run() -> None:
        entry = DummyEntry(options=_solar_draft_values())
        hass = DummyHass(entry)
        store = api_module.SolarKeyStore(hass, entry.entry_id)
        await store.async_set_candidate(
            "forecast_solar", {"solar_forecast_api_key": "old-secret"}
        )
        await store.async_promote_candidate(
            "forecast_solar", "2026-08-10T00:00:00+00:00"
        )
        proof = await _successful_proof(
            monkeypatch,
            hass,
            _forecast_payload(solar_forecast_api_key="new-secret"),
        )
        before = deepcopy((_MemStore.bucket, entry.options))
        save_payload = {
            "section": "solar",
            "values": {"solar_forecast_api_key": "new-secret"},
            "solar_test_proof": proof,
        }
        hass.config_entries.reload_failures = 1
        failed = await api_module.OIGCloudModuleConfigView().post(
            DummyJsonRequest(hass, save_payload), "box1"
        )
        assert failed.status == 500
        assert deepcopy((_MemStore.bucket, entry.options)) == before

        replay = await api_module.OIGCloudModuleConfigView().post(
            DummyJsonRequest(hass, save_payload), "box1"
        )
        assert replay.status == 400
        assert deepcopy((_MemStore.bucket, entry.options)) == before

    asyncio.run(_run())
