"""Služby pro integraci OIG Cloud."""

import asyncio
import logging
from typing import Any, Awaitable, Callable, Dict, List, Optional

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import Context, HomeAssistant, ServiceCall, callback
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry as dr
from opentelemetry import trace

from ..const import DOMAIN
from ..lib.oig_cloud_client.api.oig_cloud_api import OigCloudApi

_LOGGER = logging.getLogger(__name__)

HOME_1 = "Home 1"
HOME_2 = "Home 2"
HOME_3 = "Home 3"
HOME_UPS = "Home UPS"
HOME_5 = "Home 5"
HOME_6 = "Home 6"
HOME_MODE_LABELS = (HOME_1, HOME_2, HOME_3, HOME_UPS, HOME_5, HOME_6)

GRID_OFF_LABEL = "Vypnuto / Off"
GRID_ON_LABEL = "Zapnuto / On"
GRID_LIMITED_LABEL = "S omezením / Limited"
GRID_DELIVERY_LABELS = (GRID_OFF_LABEL, GRID_ON_LABEL, GRID_LIMITED_LABEL)

BOILER_CBB_LABEL = "CBB"
BOILER_MANUAL_LABEL = "Manual"
BOILER_MODE_LABELS = (BOILER_CBB_LABEL, BOILER_MANUAL_LABEL)

FORMAT_NO_CHARGE_LABEL = "Nenabíjet"
FORMAT_CHARGE_LABEL = "Nabíjet"
FORMAT_BATTERY_LABELS = (FORMAT_NO_CHARGE_LABEL, FORMAT_CHARGE_LABEL)

SET_BOX_MODE_SCHEMA = vol.Schema(
    {
        vol.Optional("device_id"): cv.string,
        vol.Required("mode"): vol.In(HOME_MODE_LABELS),
        vol.Required("acknowledgement"): vol.In([True]),
    }
)
SET_GRID_DELIVERY_SCHEMA = vol.Schema(
    {
        vol.Optional("device_id"): cv.string,
        "mode": vol.Any(None, vol.In(GRID_DELIVERY_LABELS)),
        "limit": vol.Any(None, vol.Coerce(int)),
        vol.Required("acknowledgement"): vol.In([True]),
        vol.Required("warning"): vol.In([True]),
    }
)
SET_BOILER_MODE_SCHEMA = vol.Schema(
    {
        vol.Optional("device_id"): cv.string,
        vol.Required("mode"): vol.In(BOILER_MODE_LABELS),
        vol.Required("acknowledgement"): vol.In([True]),
    }
)
SET_FORMATING_MODE_SCHEMA = vol.Schema(
    {
        vol.Optional("device_id"): cv.string,
        vol.Required("mode"): vol.In(FORMAT_BATTERY_LABELS),
        vol.Required("acknowledgement"): vol.In([True]),
        "limit": vol.Any(None, vol.Coerce(int)),
    }
)


def _box_id_from_entry(
    hass: HomeAssistant, coordinator: Any, entry_id: str
) -> Optional[str]:
    try:
        entry = getattr(coordinator, "config_entry", None) or hass.config_entries.async_get_entry(
            entry_id
        )
        if not entry:
            return None
        val = (
            entry.options.get("box_id")
            or entry.data.get("box_id")
            or entry.data.get("inverter_sn")
        )
        if isinstance(val, str) and val.isdigit():
            return val
    except Exception:
        return None
    return None


def _box_id_from_coordinator(coordinator: Any) -> Optional[str]:
    try:
        data = getattr(coordinator, "data", None)
        if isinstance(data, dict) and data:
            return next((str(k) for k in data.keys() if str(k).isdigit()), None)
    except Exception:
        return None
    return None


def _strip_identifier_suffix(identifier_value: str) -> str:
    return identifier_value.replace("_shield", "").replace("_analytics", "")


def _extract_box_id_from_device(device: dr.DeviceEntry, device_id: str) -> Optional[str]:
    for identifier in device.identifiers:
        if identifier[0] != DOMAIN:
            continue
        identifier_value = identifier[1]
        box_id = _strip_identifier_suffix(identifier_value)
        if isinstance(box_id, str) and box_id.isdigit():
            _LOGGER.debug(
                "Found box_id %s from device %s (identifier: %s)",
                box_id,
                device_id,
                identifier_value,
            )
            return box_id
    return None


def _register_service_if_missing(
    hass: HomeAssistant,
    name: str,
    handler: Callable[[ServiceCall], Awaitable[Any]],
    schema: vol.Schema,
    supports_response: bool = False,
) -> bool:
    if hass.services.has_service(DOMAIN, name):
        return False
    hass.services.async_register(
        DOMAIN, name, handler, schema=schema, supports_response=supports_response
    )
    return True


def _get_entry_client(hass: HomeAssistant, entry: ConfigEntry) -> OigCloudApi:
    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    return coordinator.api


def _resolve_box_id_from_service(
    hass: HomeAssistant,
    entry: ConfigEntry,
    service_data: Dict[str, Any],
    service_name: str,
) -> Optional[str]:
    device_id: Optional[str] = service_data.get("device_id")
    box_id = get_box_id_from_device(hass, device_id, entry.entry_id)
    if not box_id:
        _LOGGER.error("Cannot determine box_id for %s", service_name)
        return None
    return box_id


def _validate_grid_delivery_inputs(grid_mode: Optional[str], limit: Optional[int]) -> None:
    if (grid_mode is None and limit is None) or (
        grid_mode is not None and limit is not None
    ):
        raise vol.Invalid("Musí být nastaven právě jeden parametr (Režim nebo Limit)")
    if limit is not None and (limit > 9999 or limit < 1):
        raise vol.Invalid("Limit musí být v rozmezí 1–9999")


def _acknowledged(service_data: Dict[str, Any], service_name: str) -> bool:
    if service_data.get("acknowledgement", False):
        return True
    _LOGGER.error("Služba %s vyžaduje potvrzení (acknowledgement)", service_name)
    return False


def get_box_id_from_device(
    hass: HomeAssistant, device_id: Optional[str], entry_id: str
) -> Optional[str]:
    """
    Extrahuje box_id z device_id nebo vrátí první dostupný box_id.

    Args:
        hass: HomeAssistant instance
        device_id: ID zařízení z service call (může být None)
        entry_id: Config entry ID

    Returns:
        box_id (str) nebo None pokud nenalezen
    """
    coordinator = hass.data[DOMAIN][entry_id]["coordinator"]

    # Pokud není device_id, použij první dostupný box_id
    if not device_id:
        # Preferovat persistované box_id z config entry (funguje i v local_only režimu)
        if entry_box_id := _box_id_from_entry(hass, coordinator, entry_id):
            return entry_box_id

        # Fallback: numerický klíč v coordinator.data (cloud režim)
        if coord_box_id := _box_id_from_coordinator(coordinator):
            return coord_box_id

        _LOGGER.warning("No device_id provided and no box_id could be resolved")
        return None

    # Máme device_id, najdi odpovídající box_id
    device_registry = dr.async_get(hass)
    device = device_registry.async_get(device_id)

    if not device:
        _LOGGER.warning("Device %s not found in registry", device_id)
        return _box_id_from_entry(hass, coordinator, entry_id) or _box_id_from_coordinator(
            coordinator
        )

    # Extrahuj box_id z device identifiers
    # Identifiers mají formát: {(DOMAIN, identifier_value), ...}
    # identifier_value může být:
    #   - "2206237016" (hlavní zařízení)
    #   - "2206237016_shield" (shield)
    #   - "2206237016_analytics" (analytics)
    if device_box_id := _extract_box_id_from_device(device, device_id):
        return device_box_id

    _LOGGER.warning("Could not extract box_id from device %s", device_id)
    return _box_id_from_entry(hass, coordinator, entry_id) or _box_id_from_coordinator(
        coordinator
    )


# Schema pro update solární předpovědi
SOLAR_FORECAST_UPDATE_SCHEMA = vol.Schema({})
CHECK_BALANCING_SCHEMA = vol.Schema(
    {
        vol.Optional("box_id"): cv.string,
        vol.Optional("force"): cv.boolean,
    }
)

# Konstanty pro služby
MODES: Dict[str, str] = {
    "home_1": "0",
    "home_2": "1",
    "home_3": "2",
    "home_ups": "3",
    "home_5": "4",
    "home_6": "5",
    # Alternate slug variants (legacy docs)
    "home1": "0",
    "home2": "1",
    "home3": "2",
    "homeups": "3",
    "home5": "4",
    "home6": "5",
    # Backward-compatible labels (legacy automations)
    HOME_1: "0",
    HOME_2: "1",
    HOME_3: "2",
    HOME_UPS: "3",
    HOME_5: "4",
    HOME_6: "5",
}

GRID_DELIVERY = {
    "off": 0,
    "on": 1,
    "limited": 1,
    # Backward-compatible labels
    GRID_OFF_LABEL: 0,
    GRID_ON_LABEL: 1,
    GRID_LIMITED_LABEL: 1,
}
BOILER_MODE = {
    "cbb": 0,
    "manual": 1,
    # Backward-compatible labels
    BOILER_CBB_LABEL: 0,
    BOILER_MANUAL_LABEL: 1,
}
FORMAT_BATTERY = {
    "no_charge": 0,
    "charge": 1,
    # Backward-compatible labels
    FORMAT_NO_CHARGE_LABEL: 0,
    FORMAT_CHARGE_LABEL: 1,
}

tracer = trace.get_tracer(__name__)

# Storage key pro dashboard tiles
STORAGE_KEY_DASHBOARD_TILES = "oig_dashboard_tiles"


async def async_setup_services(hass: HomeAssistant) -> None:  # noqa: C901
    """Nastavení základních služeb pro OIG Cloud."""
    await asyncio.sleep(0)

    async def handle_update_solar_forecast(call: ServiceCall) -> None:
        """Zpracování služby pro manuální aktualizaci solární předpovědi."""
        # Procházíme všechny config entries
        for entry_id in hass.data.get(DOMAIN, {}):
            entry_data = hass.data[DOMAIN][entry_id]
            if not isinstance(entry_data, dict):
                continue

            # Kontrolujeme, zda má coordinator a solar_forecast
            if "coordinator" in entry_data and hasattr(
                entry_data["coordinator"], "solar_forecast"
            ):
                try:
                    solar_forecast = entry_data["coordinator"].solar_forecast
                    # Spustit update
                    await solar_forecast.async_update()
                    _LOGGER.info(
                        f"Manuálně aktualizována solární předpověď pro {entry_id}"
                    )
                except Exception as e:
                    _LOGGER.error(f"Chyba při aktualizaci solární předpovědi: {e}")
            else:
                _LOGGER.debug(f"Config entry {entry_id} nemá solární předpověď")

    async def handle_save_dashboard_tiles(call: ServiceCall) -> None:
        """Zpracování služby pro uložení konfigurace dashboard tiles."""
        await _save_dashboard_tiles_config(hass, call.data.get("config"))

    async def handle_get_dashboard_tiles(call: ServiceCall) -> dict:
        """Služba pro načtení konfigurace dashboard tiles."""
        return await _load_dashboard_tiles_config(hass)

    async def handle_check_balancing(call: ServiceCall) -> dict:
        """Manuálně spustí balancing kontrolu přes BalancingManager."""
        return await _run_manual_balancing_checks(hass, call)

    if _register_service_if_missing(
        hass,
        "update_solar_forecast",
        handle_update_solar_forecast,
        SOLAR_FORECAST_UPDATE_SCHEMA,
    ):
        _LOGGER.debug("Zaregistrovány základní služby pro %s", DOMAIN)

    if _register_service_if_missing(
        hass,
        "save_dashboard_tiles",
        handle_save_dashboard_tiles,
        vol.Schema({vol.Required("config"): cv.string}),
    ):
        _LOGGER.debug("Registered save_dashboard_tiles service")

    if _register_service_if_missing(
        hass,
        "get_dashboard_tiles",
        handle_get_dashboard_tiles,
        vol.Schema({}),
        supports_response=True,
    ):
        _LOGGER.debug("Registered get_dashboard_tiles service")

    if _register_service_if_missing(
        hass,
        "check_balancing",
        handle_check_balancing,
        CHECK_BALANCING_SCHEMA,
        supports_response=True,
    ):
        _LOGGER.debug("Registered check_balancing service")


async def async_setup_entry_services_with_shield(
    hass: HomeAssistant, entry: ConfigEntry, shield: Any
) -> None:
    """Setup entry-specific services with shield protection - direct shield parameter."""
    _LOGGER.debug(f"Setting up entry services for {entry.entry_id} with shield")
    _LOGGER.debug(f"Shield object: {shield}")
    _LOGGER.debug(f"Shield type: {type(shield)}")

    if not shield:
        _LOGGER.debug("ServiceShield not provided, falling back to regular setup")
        await async_setup_entry_services_fallback(hass, entry)
        return

    def wrap_with_shield(
        service_name: str,
        handler_func: Callable[
            [str, str, Dict[str, Any], bool, Optional[Context]], Awaitable[None]
        ],
    ) -> Callable[[ServiceCall], Awaitable[None]]:
        async def wrapper(call: ServiceCall) -> None:
            data: Dict[str, Any] = dict(call.data)
            await shield.intercept_service_call(
                DOMAIN,
                service_name,
                {"params": data},
                handler_func,
                blocking=False,
                context=call.context,
            )

        return wrapper

    @callback
    async def real_call_set_box_mode(
        domain: str,
        service: str,
        service_data: Dict[str, Any],
        blocking: bool,
        context: Optional[Context],
    ) -> None:
        with tracer.start_as_current_span("async_set_box_mode"):
            client = _get_entry_client(hass, entry)
            box_id = _resolve_box_id_from_service(
                hass, entry, service_data, "set_box_mode"
            )
            if not box_id:
                return

            mode: Optional[str] = service_data.get("mode")
            mode_value: Optional[str] = MODES.get(mode) if mode else None

            _LOGGER.info(
                f"[SHIELD] Setting box mode for device {box_id} to {mode} (value: {mode_value})"
            )

            await client.set_box_mode(mode_value)

    @callback
    async def real_call_set_grid_delivery(
        domain: str,
        service: str,
        service_data: Dict[str, Any],
        blocking: bool,
        context: Optional[Context],
    ) -> None:
        grid_mode: Optional[str] = service_data.get("mode")
        limit: Optional[int] = service_data.get("limit")
        _validate_grid_delivery_inputs(grid_mode, limit)

        with tracer.start_as_current_span("async_set_grid_delivery"):
            client = _get_entry_client(hass, entry)
            box_id = _resolve_box_id_from_service(
                hass, entry, service_data, "set_grid_delivery"
            )
            if not box_id:
                return

            _LOGGER.info(
                f"[SHIELD] Setting grid delivery for device {box_id}: mode={grid_mode}, limit={limit}"
            )

            if grid_mode is not None:
                mode: Optional[int] = GRID_DELIVERY.get(grid_mode)
                await client.set_grid_delivery(mode)
            if limit is not None:
                success: bool = await client.set_grid_delivery_limit(int(limit))
                if not success:
                    raise vol.Invalid("Limit se nepodařilo nastavit.")

    @callback
    async def real_call_set_boiler_mode(
        domain: str,
        service: str,
        service_data: Dict[str, Any],
        blocking: bool,
        context: Optional[Context],
    ) -> None:
        with tracer.start_as_current_span("async_set_boiler_mode"):
            client = _get_entry_client(hass, entry)
            box_id = _resolve_box_id_from_service(
                hass, entry, service_data, "set_boiler_mode"
            )
            if not box_id:
                return

            mode: Optional[str] = service_data.get("mode")
            mode_value: Optional[int] = BOILER_MODE.get(mode) if mode else None

            _LOGGER.info(
                f"[SHIELD] Setting boiler mode for device {box_id} to {mode} (value: {mode_value})"
            )

            await client.set_boiler_mode(mode_value)

    @callback
    async def real_call_set_formating_mode(
        domain: str,
        service: str,
        service_data: Dict[str, Any],
        blocking: bool,
        context: Optional[Context],
    ) -> None:
        with tracer.start_as_current_span("async_set_formating_mode"):
            client = _get_entry_client(hass, entry)
            box_id = _resolve_box_id_from_service(
                hass, entry, service_data, "set_formating_mode"
            )
            if not box_id:
                return

            mode: Optional[str] = service_data.get("mode")
            limit: Optional[int] = service_data.get("limit")

            _LOGGER.info(
                f"[SHIELD] Setting formating mode for device {box_id}: mode={mode}, limit={limit}"
            )

            if not _acknowledged(service_data, "set_formating_mode"):
                return

            # OPRAVA: Podle původní logiky - použij limit pokud je zadán, jinak mode_value
            if limit is not None:
                await client.set_formating_mode(str(limit))
            else:
                mode_value: Optional[int] = FORMAT_BATTERY.get(mode) if mode else None
                if mode_value is not None:
                    await client.set_formating_mode(str(mode_value))

    # Kontrola, zda služby již nejsou registrované (kvůli vícenásobným entries)
    if not hass.services.has_service(DOMAIN, "set_box_mode"):
        _LOGGER.debug("Registering all entry services with shield protection")

        # Registrace VŠECH služeb se shield ochranou
        hass.services.async_register(
            DOMAIN,
            "set_box_mode",
            wrap_with_shield("set_box_mode", real_call_set_box_mode),
            schema=SET_BOX_MODE_SCHEMA,
        )
        _LOGGER.debug("Registered set_box_mode")

        hass.services.async_register(
            DOMAIN,
            "set_grid_delivery",
            wrap_with_shield("set_grid_delivery", real_call_set_grid_delivery),
            schema=SET_GRID_DELIVERY_SCHEMA,
        )
        _LOGGER.debug("Registered set_grid_delivery")

        hass.services.async_register(
            DOMAIN,
            "set_boiler_mode",
            wrap_with_shield("set_boiler_mode", real_call_set_boiler_mode),
            schema=SET_BOILER_MODE_SCHEMA,
        )
        _LOGGER.debug("Registered set_boiler_mode")

        hass.services.async_register(
            DOMAIN,
            "set_formating_mode",
            wrap_with_shield("set_formating_mode", real_call_set_formating_mode),
            schema=SET_FORMATING_MODE_SCHEMA,
        )
        _LOGGER.debug("Registered set_formating_mode")

        # Setup Boiler services if enabled
        boiler_coordinator = (
            hass.data[DOMAIN].get(entry.entry_id, {}).get("boiler_coordinator")
        )
        if boiler_coordinator:
            try:
                from .boiler import setup_boiler_services

                setup_boiler_services(hass, boiler_coordinator)
                _LOGGER.info("Boiler services registered")
            except Exception as e:
                _LOGGER.error(f"Failed to register boiler services: {e}", exc_info=True)

        _LOGGER.info("All entry services registered with shield protection")
    else:
        _LOGGER.debug("Entry services already registered, skipping")


async def async_setup_entry_services(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Setup entry-specific services with optional shield protection."""
    _LOGGER.debug(f"Setting up entry services for {entry.entry_id}")
    shield = hass.data[DOMAIN].get("shield")

    if shield:
        _LOGGER.debug("Using shield protection for services")
        await async_setup_entry_services_with_shield(hass, entry, shield)
    else:
        _LOGGER.debug("Shield not available, using fallback services")
        await async_setup_entry_services_fallback(hass, entry)


async def async_setup_entry_services_fallback(
    hass: HomeAssistant, entry: ConfigEntry
) -> None:
    """Setup entry-specific services WITHOUT shield protection as fallback."""
    await asyncio.sleep(0)
    _LOGGER.info(f"Registering fallback services for entry {entry.entry_id}")

    async def handle_set_box_mode(call: ServiceCall) -> None:
        client = _get_entry_client(hass, entry)
        box_id = _resolve_box_id_from_service(
            hass, entry, call.data, "set_box_mode"
        )
        if not box_id:
            return

        mode: Optional[str] = call.data.get("mode")
        mode_value: Optional[str] = MODES.get(mode) if mode else None

        _LOGGER.info(
            f"Setting box mode for device {box_id} to {mode} (value: {mode_value})"
        )

        # DOČASNĚ: API nemá box_id parametr, použij původní metodu
        # NOTE: Update API to accept box_id.
        await client.set_box_mode(mode_value)

    async def handle_set_boiler_mode(call: ServiceCall) -> None:
        client = _get_entry_client(hass, entry)
        box_id = _resolve_box_id_from_service(
            hass, entry, call.data, "set_boiler_mode"
        )
        if not box_id:
            return

        mode: Optional[str] = call.data.get("mode")
        mode_value: Optional[int] = BOILER_MODE.get(mode) if mode else None

        _LOGGER.info(
            f"Setting boiler mode for device {box_id} to {mode} (value: {mode_value})"
        )

        # DOČASNĚ: API nemá box_id parametr
        await client.set_boiler_mode(mode_value)

    async def handle_set_grid_delivery(call: ServiceCall) -> None:
        grid_mode: Optional[str] = call.data.get("mode")
        limit: Optional[int] = call.data.get("limit")
        _validate_grid_delivery_inputs(grid_mode, limit)

        client = _get_entry_client(hass, entry)
        box_id = _resolve_box_id_from_service(
            hass, entry, call.data, "set_grid_delivery"
        )
        if not box_id:
            return

        _LOGGER.info(
            f"Setting grid delivery for device {box_id}: mode={grid_mode}, limit={limit}"
        )

        if grid_mode is not None:
            mode: Optional[int] = GRID_DELIVERY.get(grid_mode)
            await client.set_grid_delivery(mode)
        if limit is not None:
            await client.set_grid_delivery_limit(int(limit))

    async def handle_set_formating_mode(call: ServiceCall) -> None:
        client = _get_entry_client(hass, entry)
        box_id = _resolve_box_id_from_service(
            hass, entry, call.data, "set_formating_mode"
        )
        if not box_id:
            return

        mode: Optional[str] = call.data.get("mode")
        limit: Optional[int] = call.data.get("limit")

        _LOGGER.info(
            f"Setting formating mode for device {box_id}: mode={mode}, limit={limit}"
        )

        if not _acknowledged(call.data, "set_formating_mode"):
            return

        # OPRAVA: Podle původní logiky - použij limit pokud je zadán, jinak mode_value
        if limit is not None:
            await client.set_formating_mode(str(limit))
        else:
            mode_value: Optional[int] = FORMAT_BATTERY.get(mode) if mode else None
            if mode_value is not None:
                await client.set_formating_mode(str(mode_value))

    # Kontrola, zda služby již nejsou registrované
    if not hass.services.has_service(DOMAIN, "set_box_mode"):
        _LOGGER.info("No existing services found, registering all fallback services")

        # Registrace bez shield ochrany
        services_to_register = [
            ("set_box_mode", handle_set_box_mode, SET_BOX_MODE_SCHEMA),
            ("set_boiler_mode", handle_set_boiler_mode, SET_BOILER_MODE_SCHEMA),
            ("set_grid_delivery", handle_set_grid_delivery, SET_GRID_DELIVERY_SCHEMA),
            ("set_formating_mode", handle_set_formating_mode, SET_FORMATING_MODE_SCHEMA),
        ]

        for service_name, handler, schema in services_to_register:
            try:
                hass.services.async_register(
                    DOMAIN, service_name, handler, schema=schema
                )
                _LOGGER.info(
                    f"Successfully registered fallback service: {service_name}"
                )
            except Exception as e:
                _LOGGER.error(f"Failed to register service {service_name}: {e}")

        _LOGGER.info("All fallback services registration completed")
    else:
        _LOGGER.info("Services already registered, skipping fallback registration")


async def _save_dashboard_tiles_config(
    hass: HomeAssistant, config_str: Optional[str]
) -> None:
    import json

    if not config_str:
        _LOGGER.error("Dashboard tiles config is empty")
        return

    try:
        config = json.loads(config_str)
        _validate_dashboard_tiles_config(config)

        from homeassistant.helpers.storage import Store

        store = Store(hass, version=1, key=STORAGE_KEY_DASHBOARD_TILES)
        await store.async_save(config)

        _LOGGER.info(
            "Dashboard tiles config saved successfully: %s left, %s right",
            len(config.get("tiles_left", [])),
            len(config.get("tiles_right", [])),
        )

    except json.JSONDecodeError as e:
        _LOGGER.error(f"Invalid JSON in dashboard tiles config: {e}")
    except ValueError as e:
        _LOGGER.error(f"Invalid dashboard tiles config structure: {e}")
    except Exception as e:
        _LOGGER.error(f"Failed to save dashboard tiles config: {e}")


async def _load_dashboard_tiles_config(hass: HomeAssistant) -> dict:
    try:
        from homeassistant.helpers.storage import Store

        store = Store(hass, version=1, key=STORAGE_KEY_DASHBOARD_TILES)
        config = await store.async_load()
        if config:
            _LOGGER.info("Dashboard tiles config loaded from storage")
            return {"config": config}
        _LOGGER.info("No dashboard tiles config found in storage")
        return {"config": None}

    except Exception as e:
        _LOGGER.error(f"Failed to load dashboard tiles config: {e}")
        return {"config": None}


def _validate_dashboard_tiles_config(config: Any) -> None:
    if not isinstance(config, dict):
        raise ValueError("Config must be a JSON object")
    required_keys = ["tiles_left", "tiles_right", "version"]
    for key in required_keys:
        if key not in config:
            raise ValueError(f"Missing required key: {key}")


def _serialize_dt(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _iter_balancing_managers(
    hass: HomeAssistant, requested_box: Optional[str]
) -> List[tuple[str, Any, Optional[str]]]:
    managers: List[tuple[str, Any, Optional[str]]] = []
    domain_data = hass.data.get(DOMAIN, {})

    for entry_id, entry_data in domain_data.items():
        if not isinstance(entry_data, dict) or entry_id == "shield":
            continue
        balancing_manager = entry_data.get("balancing_manager")
        if not balancing_manager:
            continue
        manager_box_id = getattr(balancing_manager, "box_id", None)
        if requested_box and manager_box_id != requested_box:
            continue
        managers.append((entry_id, balancing_manager, manager_box_id))
    return managers


def _build_balancing_plan_result(
    entry_id: str, manager_box_id: Optional[str], plan: Any
) -> Dict[str, Any]:
    return {
        "entry_id": entry_id,
        "box_id": manager_box_id,
        "plan_mode": plan.mode.value,
        "reason": plan.reason,
        "holding_start": _serialize_dt(plan.holding_start),
        "holding_end": _serialize_dt(plan.holding_end),
        "priority": plan.priority.value,
    }


def _build_no_plan_result(entry_id: str, manager_box_id: Optional[str]) -> Dict[str, Any]:
    return {
        "entry_id": entry_id,
        "box_id": manager_box_id,
        "plan_mode": None,
        "reason": "no_plan_needed",
    }


def _build_error_result(
    entry_id: str, manager_box_id: Optional[str], err: Exception
) -> Dict[str, Any]:
    return {
        "entry_id": entry_id,
        "box_id": manager_box_id,
        "error": str(err),
    }


async def _run_manual_balancing_checks(
    hass: HomeAssistant, call: ServiceCall
) -> dict:
    requested_box = call.data.get("box_id")
    force_balancing = call.data.get("force", False)
    results: List[Dict[str, Any]] = []

    for entry_id, balancing_manager, manager_box_id in _iter_balancing_managers(
        hass, requested_box
    ):
        try:
            plan = await balancing_manager.check_balancing(force=force_balancing)
            if plan:
                results.append(_build_balancing_plan_result(entry_id, manager_box_id, plan))
                _LOGGER.info(
                    "Manual balancing check created %s plan for box %s (%s)",
                    plan.mode.value,
                    manager_box_id,
                    plan.reason,
                )
            else:
                results.append(_build_no_plan_result(entry_id, manager_box_id))
                _LOGGER.info(
                    "Manual balancing check executed for box %s - no plan needed",
                    manager_box_id,
                )
        except Exception as err:
            _LOGGER.error(
                "Manual balancing check failed for box %s: %s",
                manager_box_id or "unknown",
                err,
                exc_info=True,
            )
            results.append(_build_error_result(entry_id, manager_box_id, err))

    if not results:
        _LOGGER.warning(
            "Manual balancing check: no BalancingManager instances matched box_id=%s",
            requested_box or "any",
        )

    return {
        "requested_box_id": requested_box,
        "processed_entries": len(results),
        "results": results,
    }


async def async_unload_services(hass: HomeAssistant) -> None:
    """Odregistrace služeb při unload integrace."""
    await asyncio.sleep(0)
    services_to_remove = [
        "update_solar_forecast",
        "save_dashboard_tiles",
        "set_box_mode",
        "set_grid_delivery",
        "set_boiler_mode",
        "set_formating_mode",
    ]

    for service in services_to_remove:
        if hass.services.has_service(DOMAIN, service):
            hass.services.async_remove(DOMAIN, service)
    _LOGGER.debug("All services unloaded")
