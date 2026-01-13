from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.boiler import api_views as boiler_api
from custom_components.oig_cloud.boiler.models import BoilerPlan, BoilerProfile, BoilerSlot, EnergySource
from custom_components.oig_cloud.boiler.planner import BoilerPlanner
from custom_components.oig_cloud.config import schema as schema_module
from custom_components.oig_cloud.config import validation as validation_module
from custom_components.oig_cloud.core import local_mapper as local_mapper
from custom_components.oig_cloud.core.telemetry_store import TelemetryStore, _utcnow


def test_validate_tariff_hours_overlap_and_gaps():
    ok, err = schema_module.validate_tariff_hours("0,12", "0")
    assert ok is False
    assert err in ("tariff_gaps", "overlapping_tariffs")

    ok, err = schema_module.validate_tariff_hours("6", "x")
    assert ok is False
    assert err == "invalid_hour_format"

    ok, err = schema_module.validate_tariff_hours("", "", allow_single_tariff=False)
    assert ok is False
    assert err == "tariff_gaps"


@pytest.mark.asyncio
async def test_validate_input_paths(monkeypatch):
    class FakeApi:
        def __init__(self, *_a, **_k):
            self._stats = {}

        async def authenticate(self):
            return True

        async def get_stats(self):
            return self._stats

    monkeypatch.setattr(validation_module, "OigCloudApi", FakeApi)
    with pytest.raises(validation_module.CannotConnect):
        await validation_module.validate_input(None, {"username": "u", "password": "p"})

    api = FakeApi()
    api._stats = {"box": {"missing": True}}
    monkeypatch.setattr(validation_module, "OigCloudApi", lambda *_a, **_k: api)
    with pytest.raises(validation_module.LiveDataNotEnabled):
        await validation_module.validate_input(None, {"username": "u", "password": "p"})


@pytest.mark.asyncio
async def test_validate_solar_forecast_api_key(monkeypatch):
    class Response:
        def __init__(self, status):
            self.status = status

        async def text(self):
            return "err"

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_a):
            return None

    class Session:
        def __init__(self, status):
            self._status = status

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_a):
            return None

        def get(self, *_a, **_k):
            return Response(self._status)

    monkeypatch.setattr(validation_module.aiohttp, "ClientSession", lambda: Session(401))
    assert await validation_module.validate_solar_forecast_api_key("key") is False

    monkeypatch.setattr(validation_module.aiohttp, "ClientSession", lambda: Session(429))
    assert await validation_module.validate_solar_forecast_api_key("key") is True

    monkeypatch.setattr(validation_module.aiohttp, "ClientSession", lambda: Session(500))
    assert await validation_module.validate_solar_forecast_api_key("key") is False


def test_local_mapper_helpers():
    assert local_mapper._coerce_number("unknown") is None
    assert local_mapper._coerce_number("12.5") == 12.5
    assert local_mapper._normalize_box_mode("HOME UPS") == 3
    assert local_mapper._normalize_box_mode("neznamy") is None
    assert local_mapper._normalize_domains(["sensor", "binary_sensor", "bad"]) == ("sensor", "binary_sensor")
    assert local_mapper._normalize_domains("binary_sensor") == ("binary_sensor",)
    assert local_mapper._normalize_value_map({" On ": 1}) == {"on": 1}
    assert local_mapper._apply_value_map("on", {"on": 5}) == 5

    bad_dt = object()
    assert local_mapper._as_utc(bad_dt) is None


def test_telemetry_store_paths(monkeypatch):
    class Hass:
        def __init__(self):
            self.states = SimpleNamespace(get=lambda _eid: None, async_all=lambda _d: [])

    store = TelemetryStore(Hass(), box_id="123")
    store.set_cloud_payload("bad")
    snap = store.get_snapshot()
    assert snap.payload["123"] == {}

    store.set_cloud_payload({"other": 1})
    assert "123" in store.get_snapshot().payload

    assert store.apply_local_events(["sensor.oig_local_123_test"]) is False
    assert store.seed_from_existing_local_states() is False

    monkeypatch.setattr(local_mapper, "dt_util", SimpleNamespace(UTC=timezone.utc))
    assert isinstance(_utcnow(), datetime)


@pytest.mark.asyncio
async def test_boiler_api_views(monkeypatch):
    class Hass:
        def __init__(self):
            self.data = {}
            self.http = SimpleNamespace(registered=[])

            def _register(view):
                self.http.registered.append(view)

            self.http.register_view = _register

    hass = Hass()
    boiler_api.register_boiler_api_views(hass)
    assert len(hass.http.registered) == 2

    profile_view = boiler_api.BoilerProfileView(hass)
    response = await profile_view.get(None, "missing")
    assert response.status == 404

    plan_view = boiler_api.BoilerPlanView(hass)
    response = await plan_view.get(None, "missing")
    assert response.status == 404

    profile = BoilerProfile(category="c1", hourly_avg={0: 1.0}, confidence={0: 0.5}, sample_count={0: 1})
    coordinator = SimpleNamespace(
        profiler=SimpleNamespace(get_all_profiles=lambda: {"c1": profile}),
        _current_profile=profile,
        _current_plan=None,
    )
    hass.data = {"oig_cloud": {"entry": {"boiler_coordinator": coordinator}}}
    response = await profile_view.get(None, "entry")
    assert response.status == 200


def test_boiler_planner_helpers():
    planner = BoilerPlanner(hass=None, slot_minutes=30, alt_cost_kwh=2.0, has_alternative=True)
    now = datetime(2025, 1, 1, 12, 0, 0)
    assert planner._get_spot_price(now, {}) is None

    prices = {now.replace(minute=0, second=0, microsecond=0): 3.0}
    assert planner._get_spot_price(now, prices) == 3.0

    assert planner._recommend_source(True, None, 0.0) == EnergySource.FVE
    assert planner._recommend_source(False, None, 1.0) == EnergySource.ALTERNATIVE
    assert planner._recommend_source(False, 2.0, 1.0) == EnergySource.ALTERNATIVE

    plan = BoilerPlan(created_at=now, valid_until=now + timedelta(hours=1))
    slot = BoilerSlot(
        start=now,
        end=now + timedelta(minutes=30),
        avg_consumption_kwh=1.0,
        confidence=0.5,
        recommended_source=EnergySource.GRID,
        spot_price_kwh=2.0,
    )
    plan.slots = [slot]
    planner._calculate_plan_totals(plan)
    assert plan.grid_kwh == 1.0
