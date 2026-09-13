"""Contract tests for the progress block on the canonical boiler API.

Exposes plan-versus-actual so the boiler tab has something to render. The
block is built from the day record persisted by another slice and from the
existing energy tracking already on the canonical payload.

Contract (CONTRACT.md, fixed by orchestrator):
    "progress": {
        "date": "2026-09-08",
        "slots": [ 96 x {time, status, planned, actual, source_match, delta_kwh} ],
        "completed_slots": 47,
        "adherence_pct": 72.3,                  # null when not computable
        "energy": {"planned_kwh","actual_kwh","delta_kwh"},
        "eod": {"actual_so_far_kwh","remaining_planned_kwh",
                "estimated_total_kwh","planned_total_kwh"},
        "unattributed_kwh": 0.533,              # electric gap — separate from totals
        "alt_kwh": 2.68,                        # gas — never summed into electric
        "yesterday": { same shape, or null when no archive }
    }

Hard constraints from the brief:
- unattributed and alt are reported SEPARATELY — they must NOT appear in
  the planned/actual totals (otherwise the tab would inflate "followed the
  plan" to 100% by hiding a real gap inside the electric total).
- Every percentage/delta is null when not computable.
- Missing or empty store → empty progress block (96 unmeasured slots,
  null aggregates), never a 500 and never a fabricated day.
- yesterday comes from archive; null when absent.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timezone
from types import SimpleNamespace
from typing import Any, Optional
from unittest.mock import MagicMock

import pytest

from custom_components.oig_cloud.boiler import api_views as module
from custom_components.oig_cloud.boiler import day_record as day_record_module
from custom_components.oig_cloud.const import DOMAIN, KEY_BOILER_RUNTIMES


# ============================================================================
# DUMMY HELPERS (mirrors the pattern in test_boiler_task10_canonical_api.py)
# ============================================================================


class DummyRequest:
    def __init__(self, hass, query=None):
        self.app = {"hass": hass, "hass_user": SimpleNamespace(is_admin=True)}
        self.query = query or {}


class DummyHass:
    def __init__(self, config_entries=None, states=None, data=None):
        self.config_entries = config_entries or DummyConfigEntries()
        self.states = states or DummyStates()
        self.data = data or {}


class DummyConfigEntries:
    def __init__(self, entries=None):
        self._entries = entries or []

    def async_entries(self, _domain):
        return self._entries


class DummyStates:
    def __init__(self, state_map=None):
        self._map = state_map or {}

    def get(self, entity_id):
        return self._map.get(entity_id)


class DummyEntry:
    def __init__(self, entry_id, options=None, data=None, domain=DOMAIN):
        self.entry_id = entry_id
        self.options = options or {}
        self.data = data or {}
        self.domain = domain


class DummyActivityDTO:
    def __init__(self, state="standby", source="grid", trend=None, fill=0.5):
        self.state = state
        self.source = source
        self.temperature_trend_c_per_min = trend
        self.fill_level_pct = fill
        self.aura_max_temp_c = 80.0
        self.stale_flags = []
        self.active_segment_hint = None
        self.heater_states = {}


class DummyBoilerPlan:
    def __init__(self):
        self.created_at = datetime(2026, 4, 26, 10, 0, tzinfo=timezone.utc)
        self.valid_until = datetime(2026, 4, 27, 10, 0, tzinfo=timezone.utc)
        self.slots = []
        self.total_consumption_kwh = 0.0
        self.estimated_cost_czk = 0.0
        self.fve_kwh = 0.0
        self.grid_kwh = 0.0
        self.alt_kwh = 0.0


class DummyBoilerProfile:
    def __init__(self):
        self.category = "workday_summer"
        self.hourly_avg = {8: 1.5, 9: 2.0}
        self.confidence = {8: 0.9, 9: 0.85}
        self.sample_count = {8: 10, 9: 12}
        self.last_updated = datetime(2026, 4, 26, 0, 0, tzinfo=timezone.utc)


class DummyPlanResult:
    def __init__(self):
        self.selected_source = SimpleNamespace(value="fve")
        self.actuated_source = SimpleNamespace(value="fve")
        self.comfort_status = SimpleNamespace(value="comfort_satisfied")
        self.comfort_satisfied = True
        self.reason_codes = []
        self.degraded = False
        self.temperature_at_deadline_c = 58.5
        self.unsatisfied_comfort_gap_c = 0.0


class DummyActuatorSerializer:
    def __init__(self):
        self.state = SimpleNamespace(value="running")
        self._last_actuated_source = "fve"
        self._override_state = None
        self._reason_codes = []

    @property
    def last_actuated_source(self):
        return self._last_actuated_source

    @property
    def override_state(self):
        return self._override_state

    @property
    def reason_codes(self):
        return self._reason_codes


class DummyBoilerRuntime:
    def __init__(
        self,
        hass,
        coordinator,
        box_id="123",
        entry_id="entry1",
        activity=None,
        timeline=None,
        segments=None,
        sparklines=None,
        daily_source_kwh=None,
        daily_source_cost_czk=None,
    ):
        self.hass = hass
        self.coordinator = coordinator
        self.box_id = box_id
        self.entry_id = entry_id
        self._current_plan = DummyBoilerPlan()
        self._current_profile = DummyBoilerProfile()
        self.last_plan_result = DummyPlanResult()
        self.actuator = MagicMock()
        self.actuator.last_actuated_source = "fve"
        self.actuator.override_state = None
        self.actuator.reason_codes = []
        self._serializer = DummyActuatorSerializer()
        self._activity = activity
        self._timeline = timeline or []
        self._segments = segments or []
        self._sparklines = sparklines or {}
        self._daily_source_kwh: dict = (
            daily_source_kwh if daily_source_kwh is not None
            else {"fve": 0.0, "grid": 0.0, "alternative": 0.0}
        )
        self._daily_source_cost_czk: dict = (
            daily_source_cost_czk if daily_source_cost_czk is not None
            else {"grid": 0.0}
        )
        self._reseed_called_with: list = []

    def get_current_plan(self):
        return self._current_plan

    def get_current_profile(self):
        return self._current_profile

    @property
    def current_activity(self):
        return self._activity

    @property
    def timeline_buffer(self):
        return self._timeline

    @property
    def source_segments(self):
        return self._segments

    @property
    def sparklines(self):
        return self._sparklines

    def get_daily_source_kwh(self) -> dict:
        return dict(self._daily_source_kwh)

    def get_daily_source_cost_czk(self) -> dict:
        return dict(self._daily_source_cost_czk)

    def reseed_daily_source_kwh(self, total_kwh: float) -> None:
        self._reseed_called_with.append(total_kwh)


class DummyBoilerCoordinator:
    def __init__(self, config=None, box_id="123"):
        self.config = config or {
            "boiler_volume_l": 200,
            "boiler_target_temp_c": 60.0,
            "boiler_temp_sensor_top": "sensor.temp_top",
            "boiler_temp_sensor_bottom": "sensor.temp_bottom",
            "boiler_cold_inlet_temp_c": 10.0,
        }
        self.box_id = box_id
        self.entry_id = "entry1"
        self.hass: Any = None


class DummyStore:
    """In-memory Store. Tests set .data to the day record dict (or None)."""

    _registry: dict[str, "DummyStore"] = {}

    def __init__(self, hass, version, key):
        self.hass = hass
        self.version = version
        self.key = key
        # Preserve a data attribute the test pre-seeded so the API call sees it
        self.data: Any = DummyStore._registry.get(key, {}).get("data")
        DummyStore._registry[key] = self

    async def async_load(self):
        return self.data

    async def async_save(self, data):
        self.data = data

    @classmethod
    def preset(cls, key: str, data: Any) -> None:
        """Set the data that the next Store(key) will hand back."""
        cls._registry[key] = {"data": data}


def _install_store(monkeypatch):
    monkeypatch.setattr(module, "Store", DummyStore)
    DummyStore._registry.clear()
    return DummyStore


def _seed_day(key: str, payload: Any) -> None:
    DummyStore.preset(key, payload)


def _install_wired_hass(
    entry_id="entry1",
    box_id="123",
    *,
    states=None,
    daily_source_kwh=None,
    daily_source_cost_czk=None,
):
    """Return (hass, runtime) already wired into hass.data for canonical API calls."""
    entry = DummyEntry(entry_id=entry_id, options={"box_id": box_id})
    coordinator = DummyBoilerCoordinator(box_id=box_id)
    hass = DummyHass(
        config_entries=DummyConfigEntries([entry]),
        states=states or DummyStates(),
    )
    runtime = DummyBoilerRuntime(
        hass=hass,
        coordinator=coordinator,
        box_id=box_id,
        entry_id=entry_id,
        daily_source_kwh=daily_source_kwh,
        daily_source_cost_czk=daily_source_cost_czk,
    )
    hass.data[DOMAIN] = {entry_id: {KEY_BOILER_RUNTIMES: {box_id: runtime}}}
    coordinator.hass = hass
    return hass, runtime


# ============================================================================
# Helpers for building stored day-record payloads (writer-slice contract)
# ============================================================================


def _stored_plan(day: date, slot_overrides: dict[int, tuple[float, str]]) -> list[dict]:
    """A 96-slot baseline for `day` with values only on the listed slots."""
    plan = [
        {
            "time": day_record_module.slot_time(i),
            "heating_kwh": None,
            "source": None,
            "cost_czk": None,
            "predicted_top_temp_c": None,
        }
        for i in range(96)
    ]
    for slot_idx, (kwh, src) in slot_overrides.items():
        plan[slot_idx]["heating_kwh"] = kwh
        plan[slot_idx]["source"] = src
    return plan


def _stored_actual(slot_overrides: dict[int, tuple[float, Optional[str]]]) -> list[dict]:
    actual = day_record_module.empty_actual()
    for slot_idx, (kwh, src) in slot_overrides.items():
        actual[slot_idx]["heating_kwh"] = kwh
        actual[slot_idx]["source"] = src
    return actual


# ============================================================================
# PROGRESS BLOCK CONTRACT TESTS
# ============================================================================


@pytest.mark.asyncio
async def test_progress_block_present_when_store_has_stored_day(monkeypatch):
    """When the store holds a day record, progress carries 96 slots."""
    _install_store(monkeypatch)

    hass, runtime = _install_wired_hass()
    today = date(2026, 9, 8)
    plan = _stored_plan(today, {57: (0.5, "fve"), 58: (0.5, "fve")})
    actual = _stored_actual({57: (0.5, "fve")})
    _seed_day(
        "oig_cloud.boiler_day_entry1_123",
        {
            "date": today.isoformat(),
            "plan": plan,
            "plan_created_at": "2026-09-08T11:55:00+02:00",
            "actual": actual,
            "locked": False,
            "archive": {},
        },
    )

    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200, payload
    assert "progress" in payload, "progress block missing from canonical payload"

    progress = payload["progress"]
    assert progress["date"] == today.isoformat()
    assert len(progress["slots"]) == 96
    assert all(
        set(s) >= {"time", "status", "planned", "actual", "source_match", "delta_kwh"}
        for s in progress["slots"]
    )


@pytest.mark.asyncio
async def test_progress_adherence_and_deltas_null_when_nothing_comparable(monkeypatch):
    """Empty plan and empty actual → adherence_pct, source_match, delta_kwh all null."""
    _install_store(monkeypatch)

    hass, runtime = _install_wired_hass()
    today = date(2026, 9, 8)
    plan = _stored_plan(today, {})  # no planned heating
    actual = day_record_module.empty_actual()  # no measurements
    _seed_day(
        "oig_cloud.boiler_day_entry1_123",
        {
            "date": today.isoformat(),
            "plan": plan,
            "plan_created_at": "2026-09-08T11:55:00+02:00",
            "actual": actual,
            "locked": False,
            "archive": {},
        },
    )

    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "123")
    progress = json.loads(response.text)["progress"]

    assert progress["adherence_pct"] is None
    for slot in progress["slots"]:
        assert slot["source_match"] is None
        assert slot["delta_kwh"] is None
    assert progress["energy"]["planned_kwh"] == 0.0
    assert progress["energy"]["actual_kwh"] == 0.0
    assert progress["energy"]["delta_kwh"] == 0.0


@pytest.mark.asyncio
async def test_progress_reports_unattributed_and_alt_separately(monkeypatch):
    """unattributed_kwh and alt_kwh appear in progress but NEVER inside energy totals."""
    _install_store(monkeypatch)

    states = DummyStates({
        "sensor.oig_123_boiler_day_w": SimpleNamespace(state="0"),
    })
    hass, runtime = _install_wired_hass(
        states=states,
        daily_source_kwh={"fve": 1.2, "grid": 0.3, "alternative": 0.0},
    )

    today = date(2026, 9, 8)
    plan = _stored_plan(today, {57: (0.5, "fve"), 58: (0.5, "grid")})
    actual = _stored_actual({57: (0.5, "fve"), 58: (0.3, "grid")})
    _seed_day(
        "oig_cloud.boiler_day_entry1_123",
        {
            "date": today.isoformat(),
            "plan": plan,
            "plan_created_at": "2026-09-08T11:55:00+02:00",
            "actual": actual,
            "locked": False,
            "archive": {},
        },
    )

    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "123")
    progress = json.loads(response.text)["progress"]

    # Both reported, distinct from the energy totals
    assert "unattributed_kwh" in progress
    assert "alt_kwh" in progress

    energy = progress["energy"]
    # Day record's planned/actual totals come ONLY from the electric slot heating.
    # Gas (alt) lives outside this sum — the brief calls hiding it inside the
    # total "the defect, not the fix".
    assert energy["planned_kwh"] == pytest.approx(1.0)
    assert energy["actual_kwh"] == pytest.approx(0.8)
    assert energy["delta_kwh"] == pytest.approx(-0.2)
    assert energy != {"planned_kwh": None, "actual_kwh": None, "delta_kwh": None}

    # Sanity: the energy totals are bounded above by what the slot heating
    # sums to — adding alt or unattributed would push them past the slot sum.
    slot_heating_total = sum(
        s["planned"].get("heating_kwh") or 0.0
        for s in progress["slots"]
    )
    assert energy["planned_kwh"] == pytest.approx(slot_heating_total)
    # alt and unattributed are surfaced on their own keys, NOT inside energy.
    assert progress["alt_kwh"] != energy["planned_kwh"]
    assert progress["alt_kwh"] != energy["actual_kwh"]


@pytest.mark.asyncio
async def test_progress_missing_store_yields_empty_block_not_error(monkeypatch):
    """No stored day → progress with 96 unmeasured slots and null aggregates; no 500."""
    _install_store(monkeypatch)

    hass, runtime = _install_wired_hass()
    # Leave DummyStore.data = None

    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200, payload
    progress = payload["progress"]

    assert progress["date"]  # always present, even empty
    assert len(progress["slots"]) == 96
    # All slots unmeasured/planned
    assert all(s["status"] == "planned" for s in progress["slots"])
    assert all(s["actual"] is None for s in progress["slots"])
    assert all(s["delta_kwh"] is None for s in progress["slots"])
    assert progress["completed_slots"] == 0
    assert progress["adherence_pct"] is None
    assert progress["energy"]["planned_kwh"] is None
    assert progress["energy"]["actual_kwh"] is None
    assert progress["energy"]["delta_kwh"] is None
    # EOD nulls when there is nothing to estimate
    assert progress["eod"]["actual_so_far_kwh"] is None
    assert progress["eod"]["remaining_planned_kwh"] is None
    assert progress["eod"]["estimated_total_kwh"] is None
    assert progress["eod"]["planned_total_kwh"] is None
    # unattributed/alt still come from energy tracking (which may be 0.0)
    assert "unattributed_kwh" in progress
    assert "alt_kwh" in progress
    # No archive → yesterday is null
    assert progress["yesterday"] is None


@pytest.mark.asyncio
async def test_progress_store_load_failure_yields_empty_block_not_500(monkeypatch):
    """A Store that throws must be caught — the API still returns 200 with empty progress."""
    _install_store(monkeypatch)

    hass, runtime = _install_wired_hass()

    class BoomStore:
        def __init__(self, *_a, **_k):
            pass

        async def async_load(self):
            raise RuntimeError("store unavailable")

    monkeypatch.setattr(module, "Store", BoomStore)

    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "123")
    payload = json.loads(response.text)

    assert response.status == 200, payload
    progress = payload["progress"]
    assert len(progress["slots"]) == 96
    assert progress["completed_slots"] == 0


@pytest.mark.asyncio
async def test_progress_yesterday_populated_from_archive(monkeypatch):
    """Archive with the prior day → progress.yesterday carries the same shape."""
    _install_store(monkeypatch)

    hass, runtime = _install_wired_hass()
    today = date(2026, 9, 8)
    yesterday_d = date(2026, 9, 7)

    today_plan = _stored_plan(today, {57: (0.5, "fve")})
    today_actual = _stored_actual({57: (0.5, "fve")})

    yday_plan = _stored_plan(yesterday_d, {30: (0.4, "grid"), 31: (0.4, "grid")})
    yday_actual = _stored_actual({30: (0.4, "grid"), 31: (0.4, "grid")})

    _seed_day(
        "oig_cloud.boiler_day_entry1_123",
        {
            "date": today.isoformat(),
            "plan": today_plan,
            "plan_created_at": "2026-09-08T11:55:00+02:00",
            "actual": today_actual,
            "locked": False,
            "archive": {
                yesterday_d.isoformat(): {
                    "date": yesterday_d.isoformat(),
                    "plan": yday_plan,
                    "actual": yday_actual,
                    "locked": True,
                    "created_at": "2026-09-08T00:01:00+02:00",
                }
            },
        },
    )

    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "123")
    progress = json.loads(response.text)["progress"]

    assert progress["yesterday"] is not None
    yday = progress["yesterday"]
    assert yday["date"] == yesterday_d.isoformat()
    assert len(yday["slots"]) == 96
    # Same shape, same key set
    assert set(yday) >= {
        "date", "slots", "completed_slots", "adherence_pct",
        "energy", "eod",
    }
    # Both archived slots heated on grid → 100% adherence (only those were relevant)
    assert yday["adherence_pct"] == pytest.approx(100.0)
    assert yday["completed_slots"] == 2


@pytest.mark.asyncio
async def test_progress_yesterday_null_without_archive(monkeypatch):
    """No archive key → progress.yesterday is null."""
    _install_store(monkeypatch)

    hass, runtime = _install_wired_hass()
    today = date(2026, 9, 8)
    _seed_day(
        "oig_cloud.boiler_day_entry1_123",
        {
            "date": today.isoformat(),
            "plan": _stored_plan(today, {}),
            "plan_created_at": "2026-09-08T11:55:00+02:00",
            "actual": day_record_module.empty_actual(),
            "locked": False,
            "archive": {},
        },
    )

    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "123")
    progress = json.loads(response.text)["progress"]

    assert progress["yesterday"] is None


@pytest.mark.asyncio
async def test_progress_adherence_counts_only_meaningful_slots(monkeypatch):
    """Idle slots matching idle slots are NOT counted as 100% adherence.

    If only two slots in the plan had heating and both ran with the same
    source, adherence is 100.0.  If 90 idle slots match 90 idle slots they
    must not pull adherence above the meaningful 2/2 result.
    """
    _install_store(monkeypatch)

    hass, runtime = _install_wired_hass()
    today = date(2026, 9, 8)

    plan = _stored_plan(today, {57: (0.5, "fve"), 58: (0.5, "grid")})
    actual = _stored_actual({57: (0.5, "fve"), 58: (0.5, "fve")})

    _seed_day(
        "oig_cloud.boiler_day_entry1_123",
        {
            "date": today.isoformat(),
            "plan": plan,
            "plan_created_at": "2026-09-08T11:55:00+02:00",
            "actual": actual,
            "locked": False,
            "archive": {},
        },
    )

    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "123")
    progress = json.loads(response.text)["progress"]

    # slot 57 matches (fve==fve), slot 58 mismatches (planned grid, actual fve)
    assert progress["adherence_pct"] == pytest.approx(50.0)
    assert progress["completed_slots"] == 2


@pytest.mark.asyncio
async def test_progress_eod_includes_remaining_and_estimated(monkeypatch):
    """eod carries what-already-ran + what-the-plan-still-says + planned total."""
    _install_store(monkeypatch)

    hass, runtime = _install_wired_hass()
    today = date(2026, 9, 8)

    plan = _stored_plan(today, {57: (0.5, "fve"), 80: (0.5, "fve")})
    actual = _stored_actual({57: (0.6, "fve")})

    _seed_day(
        "oig_cloud.boiler_day_entry1_123",
        {
            "date": today.isoformat(),
            "plan": plan,
            "plan_created_at": "2026-09-08T11:55:00+02:00",
            "actual": actual,
            "locked": False,
            "archive": {},
        },
    )

    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "123")
    eod = json.loads(response.text)["progress"]["eod"]

    assert eod["actual_so_far_kwh"] == pytest.approx(0.6)
    assert eod["planned_total_kwh"] == pytest.approx(1.0)
    assert eod["estimated_total_kwh"] == pytest.approx(eod["actual_so_far_kwh"] + eod["remaining_planned_kwh"])


@pytest.mark.asyncio
async def test_progress_existing_keys_unchanged(monkeypatch):
    """Adding progress must not touch any of the existing canonical top-level keys."""
    _install_store(monkeypatch)

    hass, runtime = _install_wired_hass()
    _seed_day("oig_cloud.boiler_day_entry1_123", None)

    view = module.BoilerCanonicalView(hass)
    response = await view.get(DummyRequest(hass), "entry1", "123")
    payload = json.loads(response.text)

    # Existing keys must still be present
    for key in (
        "entry_id", "box_id", "current_state", "comfort_status",
        "selected_source", "actuated_source", "plan_slots", "reason_codes",
        "freshness", "degraded_flags", "manual_override", "activity", "aura",
        "source_segments", "timeline", "sparklines",
    ):
        assert key in payload, f"missing existing key {key}"
    # And progress is now added
    assert "progress" in payload
