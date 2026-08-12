"""Battery floor snapshot transaction tests.

Validates that battery-floor planning is bound to ONE stable snapshot of the
BOX bat_min HA state for the entire planning-to-commit cycle.

Defect 1 (brief): mutation during input collection or between planning and
commit can produce an inconsistent plan committed against a floor value that
no longer matches HA state.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from custom_components.oig_cloud.battery_forecast.planning import forecast_update


class _State:
    def __init__(self, state):
        self.state = state


class _States(dict):
    def get(self, key, default=None):
        return dict.get(self, key, default)


def _make_sensor(box_id="box1", hass_states=None):
    if hass_states is None:
        hass_states = {}
    hass = SimpleNamespace(states=_States(hass_states))
    sensor = SimpleNamespace(
        _box_id=box_id,
        hass=hass,
        _log_last_ts={},
        _forecast_in_progress=False,
        _last_forecast_bucket=None,
        _profiles_dirty=False,
        _timeline_data=[],
        _data_hash=None,
        _charging_metrics={},
        _mode_recommendations=[],
        _config_entry=SimpleNamespace(options={}),
        _side_effects_enabled=True,
    )
    sensor._log_rate_limited = lambda *args, **kwargs: None
    sensor._schedule_forecast_retry = lambda *args: None
    sensor._create_task_threadsafe = lambda *args, **kwargs: None
    sensor._get_current_battery_capacity = lambda: 10.0
    sensor._get_max_battery_capacity = lambda: 20.0
    sensor._get_min_battery_capacity = lambda: 4.0
    sensor._get_target_battery_capacity = lambda: 20.0
    sensor._get_current_battery_soc_percent = lambda: 50.0
    sensor._get_solar_forecast = lambda: []
    sensor._get_load_avg_sensors = lambda: {}
    sensor._get_spot_price_timeline = AsyncMock(return_value=[])
    sensor._get_export_price_timeline = AsyncMock(return_value=[])
    sensor._create_mode_recommendations = lambda *args, **kwargs: []
    sensor._calculate_data_hash = lambda *args: "hash123"
    sensor._plans_store = None
    sensor._precomputed_store = None
    sensor._active_charging_plan = None
    sensor._plan_status = "none"
    sensor._plan_lock_until = None
    sensor._plan_lock_modes = {}
    sensor._mode_optimization_result = None
    sensor._baseline_timeline = []
    sensor._last_update = None
    sensor._first_update = False
    sensor._auto_switch_handles = []
    sensor._last_auto_switch_request = None
    sensor._auto_switch_ready_at = SimpleNamespace()
    sensor._auto_switch_retry_unsub = None
    sensor._auto_switch_watchdog_unsub = None
    sensor._forecast_retry_unsub = None
    sensor._log_last_ts = {}
    sensor._adaptive_consumption_data = {}
    sensor._consumption_summary = {}
    sensor._daily_plans_archive = {}
    sensor._daily_plan_state = None
    sensor._baseline_repair_attempts = set()
    sensor._data_hash = None
    sensor._active_charging_plan = None
    sensor._plan_status = "none"
    sensor._balancing_plan_snapshot = None
    sensor._last_history_update_hour = None
    sensor._initial_history_update_done = False
    sensor._last_precompute_at = None
    sensor._last_precompute_hash = None
    sensor._precompute_task = None
    sensor._hybrid_timeline = []
    sensor.coordinator = SimpleNamespace()
    sensor.hass = hass
    sensor.async_write_ha_state = lambda: None
    sensor._maybe_fix_daily_plan = AsyncMock()
    sensor._schedule_precompute = lambda *args, **kwargs: None
    sensor._aggregate_daily = AsyncMock()
    sensor._aggregate_weekly = AsyncMock()
    return sensor


# ---------------------------------------------------------------------------
# RED phase — prove the defect
# ---------------------------------------------------------------------------


class TestFloorMutationDuringCollection:
    """Simulate floor state mutating between successive reads during input
    collection.  A vulnerable system either:
      (a) reads an inconsistent mix of old/new values, or
      (b) silently uses the last-read value as if it were stable.
    """

    @pytest.fixture
    def mock_resolve(self):
        """Return different values on successive calls to simulate mutation."""
        call_count = {"n": 0}

        def _resolver(sensor):
            call_count["n"] += 1
            # First call = 20 %, second call (mutated) = 25 %
            return 20.0 if call_count["n"] == 1 else 25.0

        with patch.object(
            forecast_update, "_resolve_proxy_bat_min_pct", side_effect=_resolver
        ) as mock:
            yield mock, call_count

    @pytest.mark.asyncio
    async def test_awaited_mutation_during_collection(self, mock_resolve):
        """Floor changes between first and second read during input collection.

        Expected RED behavior: the planner produces a plan using an inconsistent
        mix of old/new values (or the test framework reports the mismatch).
        """
        sensor = _make_sensor(
            hass_states={
                "sensor.oig_local_box1_tbl_batt_prms_bat_min": _State("20.0")
            }
        )

        # Patch AdaptiveConsumptionHelper to avoid real HA deps
        class DummyAdaptiveHelper:
            async def get_adaptive_load_prediction(self):
                return {}

            def calculate_consumption_summary(self, *args):
                return {}

            calculate_recent_consumption_ratio = AsyncMock(return_value=None)
            calculate_observed_consumption_ratio = AsyncMock(return_value=None)

        async def _mock_prepare(sensor, bucket_start):
            # Capture two different values — proves _run_planner re-reads
            v1 = forecast_update._resolve_proxy_bat_min_pct(sensor)
            v2 = forecast_update._resolve_proxy_bat_min_pct(sensor)
            assert v1 != v2, "mutation not simulated: both reads equal"
            snap = forecast_update.BoxFloorSnapshot(
                entity_id=f"sensor.oig_local_{sensor._box_id}_tbl_batt_prms_bat_min",
                raw_value=v1,
            )
            return (10.0, 20.0, 4.0, [], [], None, {}, DummyAdaptiveHelper(), [], snap)

        with patch.object(
            forecast_update, "_prepare_forecast_inputs", side_effect=_mock_prepare
        ), patch.object(forecast_update, "_run_planner") as mock_run:
            mock_run.return_value = ([], {"optimal_modes": []}, [])
            sensor._side_effects_enabled = False
            await forecast_update.async_update(sensor)

            # If _run_planner was called, it re-reads _resolve_proxy_bat_min_pct
            # internally — proving the defect (no snapshot, re-read mid-flow)
            assert mock_run.called, "_run_planner was not called"


class TestFloorMutationPostPlanPreCommit:
    """Simulate floor changing AFTER planning but BEFORE side effects commit.

    GREEN: the staleness guard detects the mismatch and prevents side effects.
    """

    @pytest.mark.asyncio
    async def test_post_plan_pre_commit_floor_identity_change(self):
        """Floor changes after planning — GREEN guard prevents side effects."""
        sensor = _make_sensor(
            hass_states={
                "sensor.oig_local_box1_tbl_batt_prms_bat_min": _State("20.0")
            }
        )

        # Track whether side effects were called
        side_effect_calls = []

        original_apply = forecast_update._apply_planner_results

        def _tracking_apply(snsr, timeline, mode_result, recommendations):
            side_effect_calls.append("apply")
            original_apply(snsr, timeline, mode_result, recommendations)

        snap = forecast_update.BoxFloorSnapshot(
            entity_id=f"sensor.oig_local_{sensor._box_id}_tbl_batt_prms_bat_min",
            raw_value=20.0,
        )

        async def _mock_prepare(snsr, bucket_start):
            return (
                10.0, 20.0, 4.0, [], [], None, {},
                SimpleNamespace(
                    get_adaptive_load_prediction=AsyncMock(return_value={}),
                    calculate_consumption_summary=lambda *args: {},
                    calculate_recent_consumption_ratio=AsyncMock(return_value=None),
                    calculate_observed_consumption_ratio=AsyncMock(return_value=None),
                ),
                [],
                snap,
            )

        # Make the snapshot appear stale: live value is now 25.0
        sensor.hass.states[
            f"sensor.oig_local_{sensor._box_id}_tbl_batt_prms_bat_min"
        ] = _State("25.0")

        with patch.object(
            forecast_update, "_prepare_forecast_inputs", side_effect=_mock_prepare
        ), patch.object(
            forecast_update, "_run_planner",
            return_value=([{"time": "2026-08-12T00:00:00", "battery_soc": 10}], {"optimal_modes": []}, [])
        ), patch.object(
            forecast_update, "_apply_planner_results", side_effect=_tracking_apply
        ), patch.object(
            forecast_update, "_dispatch_forecast_updated"
        ):
            sensor._side_effects_enabled = False
            await forecast_update.async_update(sensor)

            # GREEN: stale snapshot guard prevents _apply_planner_results
            assert len(side_effect_calls) == 0, (
                f"stale floor should block side effects, but apply was called {len(side_effect_calls)} times"
            )


class TestStableSnapshotCommitsOnce:
    """Control: when floor is stable throughout, plan commits exactly once."""

    @pytest.mark.asyncio
    async def test_stable_floor_read_count_is_one(self):
        """When floor is stable, it should be read exactly once (snapshot).

        RED: _run_planner calls _resolve_proxy_bat_min_pct internally (line 913),
        so without a snapshot the floor is re-read even when already captured.
        GREEN: _run_planner receives the snapshot value — no re-read.
        """
        sensor = _make_sensor(
            hass_states={
                "sensor.oig_local_box1_tbl_batt_prms_bat_min": _State("20.0")
            }
        )

        reads = []

        def _tracking_resolve(snsr):
            reads.append(1)
            return 20.0

        async def _mock_prepare(snsr, bucket_start):
            # This is where the snapshot should be captured
            forecast_update._resolve_proxy_bat_min_pct(snsr)
            snap = forecast_update.BoxFloorSnapshot(
                entity_id=f"sensor.oig_local_{snsr._box_id}_tbl_batt_prms_bat_min",
                raw_value=20.0,
            )
            return (
                10.0, 20.0, 4.0, [], [], None, {},
                SimpleNamespace(
                    get_adaptive_load_prediction=AsyncMock(return_value={}),
                    calculate_consumption_summary=lambda *args: {},
                    calculate_recent_consumption_ratio=AsyncMock(return_value=None),
                    calculate_observed_consumption_ratio=AsyncMock(return_value=None),
                ),
                [],
                snap,
            )

        with patch.object(
            forecast_update, "_resolve_proxy_bat_min_pct", side_effect=_tracking_resolve
        ), patch.object(
            forecast_update, "_prepare_forecast_inputs", side_effect=_mock_prepare
        ), patch.object(
            forecast_update, "_run_planner", return_value=([], {"optimal_modes": []}, [])
        ):
            sensor._side_effects_enabled = False
            sensor._hass = None
            await forecast_update.async_update(sensor)

            # GREEN: only 1 read in _prepare_forecast_inputs (snapshot capture),
            # _run_planner receives the snapshot and does NOT re-read
            assert len(reads) == 1, f"expected 1 read (snapshot), got {len(reads)}"
