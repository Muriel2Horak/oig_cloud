"""Tests for the OIG Cloud Data Update Coordinator."""

from datetime import timedelta
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
        "custom_components.oig_cloud.core.coordinator.OteApi", DummyOteApi
    )
    monkeypatch.setattr(
        OigCloudCoordinator, "_schedule_hourly_fallback", lambda self: None
    )
    monkeypatch.setattr(
        OigCloudCoordinator, "_schedule_spot_price_update", lambda self: None
    )
    monkeypatch.setattr(
        OigCloudCoordinator, "_update_spot_prices", AsyncMock()
    )

    coordinator = OigCloudCoordinator(hass, Mock(), config_entry=entry)

    assert coordinator.ote_api is not None
    await tasks[0]
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
        "custom_components.oig_cloud.core.coordinator.ChmuApi", DummyChmuApi
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
