import pytest
from unittest.mock import Mock, AsyncMock, MagicMock
from typing import Dict, Any, Optional
import sys
import types
from datetime import datetime, timedelta

# NOVÉ: Mock homeassistant modules before they are imported
mock_modules = [
    "homeassistant",
    "homeassistant.core",
    "homeassistant.config_entries",
    "homeassistant.const",
    "homeassistant.exceptions",
    "homeassistant.helpers.device_registry",
    "homeassistant.helpers.entity_registry",
    "homeassistant.helpers.entity",
    "homeassistant.helpers.entity_platform",
    "homeassistant.util",
    "homeassistant.util.dt",
    "aiohttp",
]

for module in mock_modules:
    if module not in sys.modules:
        sys.modules[module] = MagicMock()


def _create_module(name: str) -> types.ModuleType:
    module = types.ModuleType(name)
    module.__file__ = f"{name}.py"
    return module


# homeassistant.const – EntityCategory placeholder
const_module = _create_module("homeassistant.const")


class EntityCategory:
    CONFIG = "config"
    DIAGNOSTIC = "diagnostic"


const_module.EntityCategory = EntityCategory
const_module.CONF_PASSWORD = "password"
const_module.CONF_USERNAME = "username"
class Platform:
    SENSOR = "sensor"
    BINARY_SENSOR = "binary_sensor"

const_module.Platform = Platform
sys.modules["homeassistant.const"] = const_module

# homeassistant.helpers package + storage/restore_state submodules
helpers_module = _create_module("homeassistant.helpers")
helpers_module.__path__ = []
sys.modules["homeassistant.helpers"] = helpers_module

storage_module = _create_module("homeassistant.helpers.storage")


class Store:
    def __init__(self, hass: Any, version: int, key: str) -> None:
        self.hass = hass
        self.version = version
        self.key = key
        self._data: Optional[Dict[str, Any]] = None

    async def async_load(self) -> Optional[Dict[str, Any]]:
        return self._data

    async def async_save(self, data: Dict[str, Any]) -> None:
        self._data = data


storage_module.Store = Store
sys.modules["homeassistant.helpers.storage"] = storage_module
helpers_module.storage = storage_module

aiohttp_client_module = _create_module("homeassistant.helpers.aiohttp_client")

async def async_get_clientsession(hass: Any) -> Any:
    return MagicMock()

aiohttp_client_module.async_get_clientsession = async_get_clientsession
sys.modules["homeassistant.helpers.aiohttp_client"] = aiohttp_client_module
helpers_module.aiohttp_client = aiohttp_client_module

restore_state_module = _create_module("homeassistant.helpers.restore_state")


class RestoreEntity:
    """Minimal HA RestoreEntity placeholder."""

    async def async_added_to_hass(self) -> None:
        return None


restore_state_module.RestoreEntity = RestoreEntity
sys.modules["homeassistant.helpers.restore_state"] = restore_state_module
helpers_module.restore_state = restore_state_module

# homeassistant.components.sensor placeholders
sensor_module = _create_module("homeassistant.components.sensor")


class SensorEntity:
    """Basic SensorEntity stand-in."""

    def __init__(self, coordinator: Optional[Any] = None) -> None:
        self.coordinator = coordinator


class SensorDeviceClass:
    ENERGY_STORAGE = "energy_storage"


class SensorStateClass:
    TOTAL_INCREASING = "total_increasing"


sensor_module.SensorEntity = SensorEntity
sensor_module.SensorDeviceClass = SensorDeviceClass
sensor_module.SensorStateClass = SensorStateClass
sys.modules["homeassistant.components.sensor"] = sensor_module

# homeassistant.helpers.update_coordinator placeholders
helpers_update_module = _create_module("homeassistant.helpers.update_coordinator")
helpers_update_module.__path__ = []
sys.modules["homeassistant.helpers.update_coordinator"] = helpers_update_module


class CoordinatorEntity:
    """Basic CoordinatorEntity placeholder."""

    def __init__(self, coordinator: Optional[Any] = None) -> None:
        self.coordinator = coordinator


helpers_update_module.CoordinatorEntity = CoordinatorEntity

# NOVÉ: Mock specific classes that are commonly used
sys.modules["homeassistant.core"].HomeAssistant = Mock
sys.modules["homeassistant.config_entries"].ConfigEntry = Mock
sys.modules["homeassistant.exceptions"].ConfigEntryNotReady = Exception
sys.modules["homeassistant.exceptions"].ConfigEntryAuthFailed = Exception
sys.modules["homeassistant.helpers.update_coordinator"].UpdateFailed = Exception


# OPRAVA: Mock DataUpdateCoordinator jako skutečnou třídu
class MockDataUpdateCoordinator:
    def __init__(
        self,
        hass: Any,
        logger: Any,
        *,
        name: str,
        update_interval: Any,
        config_entry: Optional[Any] = None,  # NOVÉ: Přidán config_entry parametr
        **kwargs: Any  # NOVÉ: Přidán **kwargs pro další parametry
    ) -> None:
        self.hass = hass
        self.logger = logger
        self.name = name
        self.update_interval = update_interval
        self.config_entry = config_entry  # NOVÉ: Uložení config_entry
        self.data: Optional[Dict[str, Any]] = None

    async def async_config_entry_first_refresh(self) -> None:
        pass

    async def async_request_refresh(self) -> None:
        pass


helpers_update_module.DataUpdateCoordinator = MockDataUpdateCoordinator
helpers_update_module.UpdateFailed = Exception

# NOVÉ: Mock datetime utilities
sys.modules["homeassistant.util.dt"].now = lambda: datetime.now()
sys.modules["homeassistant.util.dt"].utcnow = lambda: datetime.utcnow()


@pytest.fixture
def mock_api() -> Mock:
    """Create a mock API instance."""
    api: Mock = Mock()  # Bez spec omezení

    # Mock pouze skutečné metody z OigCloudApi s odpovídajícími signaturami
    api.get_stats = AsyncMock(return_value={"device1": {"box_prms": {"mode": 1}}})

    # get_extended_stats očekává 3 parametry: name, from_date, to_date
    async def mock_get_extended_stats(
        name: str, from_date: str, to_date: str
    ) -> Dict[str, Any]:
        return {}

    api.get_extended_stats = AsyncMock(side_effect=mock_get_extended_stats)

    # get_notifications očekává optional device_id
    async def mock_get_notifications(device_id: Optional[str] = None) -> Dict[str, Any]:
        return {"status": "success", "content": ""}

    api.get_notifications = AsyncMock(side_effect=mock_get_notifications)
    api.authenticate = AsyncMock(return_value=True)
    api.get_session = Mock(return_value=Mock())

    # set_box_params_internal očekává 3 parametry: table, column, value
    async def mock_set_box_params_internal(table: str, column: str, value: str) -> bool:
        return True

    api.set_box_params_internal = AsyncMock(side_effect=mock_set_box_params_internal)

    # Přidáme další metody s typovými signaturami
    api.set_box_mode = AsyncMock(return_value=True)
    api.set_grid_delivery_limit = AsyncMock(return_value=True)
    api.set_boiler_mode = AsyncMock(return_value=True)
    api.set_ssr_rele_1 = AsyncMock(return_value=True)
    api.set_ssr_rele_2 = AsyncMock(return_value=True)
    api.set_ssr_rele_3 = AsyncMock(return_value=True)
    api.set_grid_delivery = AsyncMock(return_value=True)
    api.set_battery_formating = AsyncMock(return_value=True)

    # Přidáme atributy API
    api.box_id = "test_device_id"
    api.last_state = None
    api.last_parsed_state = None

    return api
