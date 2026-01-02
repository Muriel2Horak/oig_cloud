"""Tests for the OIG Cloud Data Update Coordinator."""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from typing import Any, Dict
from unittest.mock import AsyncMock, Mock, patch

import pytest
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers import frame as frame_helper
from homeassistant.helpers.update_coordinator import UpdateFailed

from custom_components.oig_cloud.const import DEFAULT_UPDATE_INTERVAL, DOMAIN
from custom_components.oig_cloud.core.coordinator import OigCloudCoordinator
from custom_components.oig_cloud.lib.oig_cloud_client.api.oig_cloud_api import \
    OigCloudApiError


@pytest.fixture
def mock_config_entry() -> Mock:
    """Create a mock config entry."""
    mock_entry: Mock = Mock(spec=ConfigEntry)
    mock_entry.entry_id = "test_entry"
    mock_entry.data = {"inverter_sn": "test_sn_123"}
    mock_entry.options = {
        "enable_pricing": False,
        "enable_extended_sensors": False,
        "enable_cloud_notifications": False,
    }
    return mock_entry


@pytest.fixture
def mock_hass(hass, mock_config_entry):
    """Create a Home Assistant instance with frame helper set."""
    if hasattr(frame_helper, "async_setup"):
        frame_helper.async_setup(hass)
    elif hasattr(frame_helper, "setup"):
        frame_helper.setup(hass)
    elif hasattr(frame_helper, "async_setup_frame"):
        frame_helper.async_setup_frame(hass)

    hass.data.setdefault(DOMAIN, {})[mock_config_entry.entry_id] = {}
    return hass


@pytest.fixture
def coordinator(
    mock_hass: Mock, mock_api: Mock, mock_config_entry: Mock
) -> OigCloudCoordinator:
    """Create a coordinator with mock dependencies."""
    return OigCloudCoordinator(
        mock_hass,
        mock_api,
        standard_interval_seconds=DEFAULT_UPDATE_INTERVAL,
        config_entry=mock_config_entry,
    )


@pytest.mark.asyncio
async def test_coordinator_init_pricing_enables_ote(monkeypatch):
    class DummyOteApi:
        def __init__(self, cache_path=None):
            self.cache_path = cache_path
            self._last_data = {"hours_count": 2, "prices_czk_kwh": {"t": 1.0}}

        async def async_load_cached_spot_prices(self):
            return None

    tasks = []

    def _async_create_task(coro):
        tasks.append(coro)
        return coro

    hass = SimpleNamespace(
        config=SimpleNamespace(path=lambda *_a: "/tmp/ote_cache.json"),
        async_create_task=_async_create_task,
        loop=SimpleNamespace(call_later=lambda *_a, **_k: None),
    )

    entry = Mock(spec=ConfigEntry)
    entry.entry_id = "entry"
    entry.options = {"enable_pricing": True, "enable_chmu_warnings": False}

    monkeypatch.setattr(
        "homeassistant.helpers.frame.report_usage", lambda *_a, **_k: None
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.api.ote_api.OteApi", DummyOteApi
    )
    monkeypatch.setattr(
        OigCloudCoordinator, "_schedule_hourly_fallback", lambda self: None
    )
    monkeypatch.setattr(
        OigCloudCoordinator, "_schedule_spot_price_update", lambda self: None
    )
    async def _update_spot_prices(_self):
        return None

    monkeypatch.setattr(
        OigCloudCoordinator, "_update_spot_prices", _update_spot_prices
    )

    coordinator = OigCloudCoordinator(hass, Mock(), config_entry=entry)

    assert coordinator.ote_api is not None
    await tasks[0]
    for task in tasks[1:]:
        task.close()
    assert coordinator._spot_prices_cache == coordinator.ote_api._last_data


@pytest.mark.asyncio
async def test_coordinator_init_chmu_enabled(monkeypatch):
    class DummyChmuApi:
        pass

    hass = SimpleNamespace(
        config=SimpleNamespace(path=lambda *_a: "/tmp/ote_cache.json"),
        async_create_task=lambda coro: coro,
        loop=SimpleNamespace(call_later=lambda *_a, **_k: None),
    )

    entry = Mock(spec=ConfigEntry)
    entry.entry_id = "entry"
    entry.options = {"enable_pricing": False, "enable_chmu_warnings": True}

    monkeypatch.setattr(
        "homeassistant.helpers.frame.report_usage", lambda *_a, **_k: None
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.api.api_chmu.ChmuApi", DummyChmuApi
    )

    coordinator = OigCloudCoordinator(hass, Mock(), config_entry=entry)

    assert coordinator.chmu_api is not None


@pytest.mark.asyncio
async def test_coordinator_initialization(
    mock_hass: Mock, mock_api: Mock, mock_config_entry: Mock
) -> None:
    """Test coordinator initialization."""
    coordinator = OigCloudCoordinator(
        mock_hass,
        mock_api,
        standard_interval_seconds=DEFAULT_UPDATE_INTERVAL,
        config_entry=mock_config_entry,
    )

    assert coordinator.api == mock_api
    assert coordinator.update_interval == timedelta(seconds=DEFAULT_UPDATE_INTERVAL)


@pytest.mark.asyncio
async def test_async_update_data_success(
    coordinator: OigCloudCoordinator, mock_api: Mock
) -> None:
    """Test data update success."""
    mock_api.get_stats = AsyncMock(return_value={"device1": {"box_prms": {"mode": 1}}})

    coordinator._startup_grace_seconds = 0
    with patch(
        "custom_components.oig_cloud.core.coordinator.random.uniform", return_value=-1
    ):
        result: Dict[str, Any] = await coordinator._async_update_data()

    assert result == {"device1": {"box_prms": {"mode": 1}}}
    mock_api.get_stats.assert_called_once()


@pytest.mark.asyncio
async def test_async_update_data_empty_response(
    coordinator: OigCloudCoordinator, mock_api: Mock
) -> None:
    """Test handling of empty data response."""
    mock_api.get_stats = AsyncMock(return_value=None)

    coordinator._startup_grace_seconds = 0
    with patch(
        "custom_components.oig_cloud.core.coordinator.random.uniform", return_value=-1
    ):
        result: Dict[str, Any] = await coordinator._async_update_data()

    assert result == {}


@pytest.mark.asyncio
async def test_async_update_data_api_error(
    coordinator: OigCloudCoordinator, mock_api: Mock
) -> None:
    """Test handling of API errors."""
    mock_api.get_stats = AsyncMock(
        side_effect=OigCloudApiError("API connection failed")
    )

    coordinator._startup_grace_seconds = 0
    with patch(
        "custom_components.oig_cloud.core.coordinator.random.uniform", return_value=-1
    ):
        with pytest.raises(
            UpdateFailed, match="Error communicating with OIG API: API connection failed"
        ):
            await coordinator._async_update_data()


@pytest.mark.asyncio
async def test_extended_data_enabled(
    coordinator: OigCloudCoordinator, mock_api: Mock, mock_config_entry: Mock
) -> None:
    """Test that extended stats are included when enabled."""
    mock_config_entry.options["enable_extended_sensors"] = True
    mock_api.get_stats = AsyncMock(return_value={"device1": {"box_prms": {"mode": 1}}})

    coordinator._startup_grace_seconds = 0
    with patch(
        "custom_components.oig_cloud.core.coordinator.random.uniform", return_value=-1
    ):
        result: Dict[str, Any] = await coordinator._async_update_data()

    assert result.get("extended_batt") == {}
    assert result.get("extended_fve") == {}
    assert result.get("extended_grid") == {}
    assert result.get("extended_load") == {}


def _make_simple_hass():
    def _async_create_task(coro):
        if hasattr(coro, "close"):
            coro.close()
        return coro

    return SimpleNamespace(
        config=SimpleNamespace(path=lambda *_a: "/tmp/ote_cache.json"),
        async_create_task=_async_create_task,
        loop=SimpleNamespace(call_later=lambda *_a, **_k: None),
        data={},
    )


def test_schedule_spot_price_update_before_13(monkeypatch):
    hass = _make_simple_hass()
    entry = Mock(spec=ConfigEntry)
    entry.entry_id = "entry"
    entry.options = {"enable_pricing": False, "enable_chmu_warnings": False}

    monkeypatch.setattr(
        "homeassistant.helpers.frame.report_usage", lambda *_a, **_k: None
    )
    coordinator = OigCloudCoordinator(hass, Mock(), config_entry=entry)

    captured = {}

    def _track(_hass, _cb, when):
        captured["when"] = when

    monkeypatch.setattr(
        "custom_components.oig_cloud.core.coordinator.async_track_point_in_time",
        _track,
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.core.coordinator.dt_util.now",
        lambda: datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
    )

    coordinator._schedule_spot_price_update()

    assert captured["when"].hour == 13
    assert captured["when"].minute == 5
    assert captured["when"].day == 1


def test_schedule_spot_price_update_after_13(monkeypatch):
    hass = _make_simple_hass()
    entry = Mock(spec=ConfigEntry)
    entry.entry_id = "entry"
    entry.options = {"enable_pricing": False, "enable_chmu_warnings": False}

    monkeypatch.setattr(
        "homeassistant.helpers.frame.report_usage", lambda *_a, **_k: None
    )
    coordinator = OigCloudCoordinator(hass, Mock(), config_entry=entry)

    captured = {}

    def _track(_hass, _cb, when):
        captured["when"] = when

    monkeypatch.setattr(
        "custom_components.oig_cloud.core.coordinator.async_track_point_in_time",
        _track,
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.core.coordinator.dt_util.now",
        lambda: datetime(2025, 1, 1, 14, 0, tzinfo=timezone.utc),
    )

    coordinator._schedule_spot_price_update()

    assert captured["when"].day == 2
    assert captured["when"].hour == 13
    assert captured["when"].minute == 5


@pytest.mark.asyncio
async def test_hourly_fallback_updates_cache(monkeypatch):
    class DummyOteApi:
        async def get_spot_prices(self):
            return {"prices_czk_kwh": {"2025-01-01T00:00:00": 1.0}, "hours_count": 1}

    hass = _make_simple_hass()
    entry = Mock(spec=ConfigEntry)
    entry.entry_id = "entry"
    entry.options = {"enable_pricing": False, "enable_chmu_warnings": False}

    monkeypatch.setattr(
        "homeassistant.helpers.frame.report_usage", lambda *_a, **_k: None
    )
    coordinator = OigCloudCoordinator(hass, Mock(), config_entry=entry)
    coordinator.ote_api = DummyOteApi()
    coordinator.data = {"spot_prices": {"prices_czk_kwh": {}}}

    called = {"scheduled": 0}

    def _schedule():
        called["scheduled"] += 1

    monkeypatch.setattr(coordinator, "_schedule_hourly_fallback", _schedule)
    monkeypatch.setattr(
        "custom_components.oig_cloud.core.coordinator.dt_util.now",
        lambda: datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
    )

    await coordinator._hourly_fallback_check()

    assert coordinator._spot_prices_cache
    assert coordinator.data["spot_prices"]["prices_czk_kwh"]
    assert called["scheduled"] == 1


@pytest.mark.asyncio
async def test_update_spot_prices_success(monkeypatch):
    class DummyOteApi:
        async def get_spot_prices(self):
            return {"prices_czk_kwh": {"2025-01-01T00:00:00": 2.0}, "hours_count": 1}

    hass = _make_simple_hass()
    entry = Mock(spec=ConfigEntry)
    entry.entry_id = "entry"
    entry.options = {"enable_pricing": False, "enable_chmu_warnings": False}

    monkeypatch.setattr(
        "homeassistant.helpers.frame.report_usage", lambda *_a, **_k: None
    )
    coordinator = OigCloudCoordinator(hass, Mock(), config_entry=entry)
    coordinator.ote_api = DummyOteApi()
    coordinator.data = {}
    coordinator._spot_retry_count = 2
    coordinator._hourly_fallback_active = True

    scheduled = {"count": 0}

    def _schedule():
        scheduled["count"] += 1

    monkeypatch.setattr(coordinator, "_schedule_spot_price_update", _schedule)

    await coordinator._update_spot_prices()

    assert coordinator._spot_prices_cache
    assert coordinator._spot_retry_count == 0
    assert coordinator._hourly_fallback_active is False
    assert scheduled["count"] == 1


@pytest.mark.asyncio
async def test_update_spot_prices_failure_calls_retry(monkeypatch):
    class DummyOteApi:
        async def get_spot_prices(self):
            return {}

    hass = _make_simple_hass()
    entry = Mock(spec=ConfigEntry)
    entry.entry_id = "entry"
    entry.options = {"enable_pricing": False, "enable_chmu_warnings": False}

    monkeypatch.setattr(
        "homeassistant.helpers.frame.report_usage", lambda *_a, **_k: None
    )
    coordinator = OigCloudCoordinator(hass, Mock(), config_entry=entry)
    coordinator.ote_api = DummyOteApi()

    called = {"retry": 0}

    def _handle_retry():
        called["retry"] += 1

    monkeypatch.setattr(coordinator, "_handle_spot_retry", _handle_retry)

    await coordinator._update_spot_prices()

    assert called["retry"] == 1


def test_handle_spot_retry_outside_important(monkeypatch):
    hass = _make_simple_hass()
    entry = Mock(spec=ConfigEntry)
    entry.entry_id = "entry"
    entry.options = {"enable_pricing": False, "enable_chmu_warnings": False}

    monkeypatch.setattr(
        "homeassistant.helpers.frame.report_usage", lambda *_a, **_k: None
    )
    coordinator = OigCloudCoordinator(hass, Mock(), config_entry=entry)

    scheduled = {"count": 0}

    def _schedule():
        scheduled["count"] += 1

    monkeypatch.setattr(coordinator, "_schedule_spot_price_update", _schedule)
    monkeypatch.setattr(
        "custom_components.oig_cloud.core.coordinator.dt_util.now",
        lambda: datetime(2025, 1, 1, 10, 0, tzinfo=timezone.utc),
    )

    coordinator._spot_retry_count = 0
    coordinator._handle_spot_retry()

    assert coordinator._spot_retry_count == 0
    assert scheduled["count"] == 1


def test_handle_spot_retry_inside_important(monkeypatch):
    hass = _make_simple_hass()
    entry = Mock(spec=ConfigEntry)
    entry.entry_id = "entry"
    entry.options = {"enable_pricing": False, "enable_chmu_warnings": False}

    monkeypatch.setattr(
        "homeassistant.helpers.frame.report_usage", lambda *_a, **_k: None
    )
    coordinator = OigCloudCoordinator(hass, Mock(), config_entry=entry)

    created = {"count": 0}

    def _create_task(coro):
        created["count"] += 1
        if hasattr(coro, "close"):
            coro.close()
        return SimpleNamespace(done=lambda: False)

    monkeypatch.setattr(
        "custom_components.oig_cloud.core.coordinator.dt_util.now",
        lambda: datetime(2025, 1, 1, 13, 0, tzinfo=timezone.utc),
    )
    monkeypatch.setattr(
        "custom_components.oig_cloud.core.coordinator.asyncio.create_task",
        _create_task,
    )

    coordinator._spot_retry_count = 0
    coordinator._handle_spot_retry()

    assert created["count"] == 1
