"""Home Assistant must not wait for this integration's slow startup work.

Regression: HA took 507 s to initialize and its second stage timed out waiting for
tracked tasks of this integration, mainly ten statistics sensors each reading 30 days
of history. Work that outlives setup must run as a background task.
"""

from __future__ import annotations

import ast
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

import pytest

from custom_components.oig_cloud.entities import statistics_sensor as stats_module
from custom_components.oig_cloud.shared.background import start_background

ROOT = Path(__file__).resolve().parents[1] / "custom_components" / "oig_cloud"

STARTUP_MODULES = (
    "sensor.py",
    "battery_forecast/sensors/ha_sensor.py",
    "battery_forecast/sensors/grid_charging_sensor.py",
    "battery_forecast/sensors/recommended_sensor.py",
    "pricing/spot_price_15min_base.py",
    "pricing/spot_price_hourly.py",
    "pricing/spot_price_shared.py",
    "entities/solar_forecast_sensor.py",
    "entities/battery_health_sensor.py",
    "ai_eval/coordinator.py",
    "shield/core.py",
)


async def _noop() -> None:
    return None


def test_prefers_a_task_startup_does_not_wait_for():
    calls = []
    coro = _noop()
    hass = SimpleNamespace(
        async_create_background_task=lambda task, name: calls.append(name) or task.close(),
        async_create_task=lambda _task: pytest.fail("startup would wait for this task"),
    )

    start_background(hass, coro, "job")

    assert calls == ["job"]


def test_falls_back_where_background_tasks_do_not_exist():
    coro = _noop()
    calls = []
    hass = SimpleNamespace(async_create_task=lambda task: calls.append(task) or task.close())

    start_background(hass, coro, "job")

    assert calls == [coro]


@pytest.mark.parametrize("module", STARTUP_MODULES)
def test_startup_modules_do_not_create_tracked_tasks(module):
    tree = ast.parse((ROOT / module).read_text(encoding="utf-8"))
    tracked = [
        node.lineno
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "async_create_task"
    ]

    assert tracked == [], f"{module} creates tracked tasks at lines {tracked}"


@pytest.mark.asyncio
async def test_statistics_restart_skips_history_when_today_is_done():
    """A restart must not repeat a 30 day history read that already ran today."""
    sensor = SimpleNamespace(
        _time_range="6-8",
        _interval_data={datetime.now().strftime("%Y-%m-%d"): [500.0]},
    )
    read = []

    async def _update(_now):
        read.append(True)

    sensor._daily_statistics_update = _update

    await stats_module.OigCloudStatisticsSensor._startup_statistics_update(sensor)

    assert read == []


@pytest.mark.asyncio
async def test_statistics_restart_reads_history_when_today_is_missing():
    sensor = SimpleNamespace(_time_range="6-8", _interval_data={})
    read = []

    async def _update(_now):
        read.append(True)

    sensor._daily_statistics_update = _update

    await stats_module.OigCloudStatisticsSensor._startup_statistics_update(sensor)

    assert read == [True]


def test_coordinator_startup_fetches_do_not_hold_startup():
    source = (ROOT / "core" / "coordinator.py").read_text(encoding="utf-8")

    assert "async_create_task(self._update_spot_prices" not in source
    assert "async_create_task(_async_load_ote_cache" not in source
    assert "async_create_task(\n                self._update_battery_forecast" not in source
