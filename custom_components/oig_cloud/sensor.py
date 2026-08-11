"""Platform pro OIG Cloud senzory."""

import asyncio
import logging
from typing import Any, Callable, Dict, List, Optional, cast

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .entities.ai_eval_sensor import OigCloudAiEvalSensor
from .entities.ai_status_sensor import OigCloudAiStatusSensor
from .entities.base_sensor import resolve_box_id
from .entities.data_source_sensor import OigCloudDataSourceSensor

_LOGGER = logging.getLogger(__name__)

try:
    _LOGGER.debug("Attempting to import SENSOR_TYPES from sensor_types.py")
    from .sensor_types import SENSOR_TYPES

    _LOGGER.debug(
        "Successfully imported SENSOR_TYPES with %s sensor types", len(SENSOR_TYPES)
    )

    # Debug informace o obsahu
    for sensor_type, config in SENSOR_TYPES.items():
        _LOGGER.debug(
            "Sensor type: %s, category: %s",
            sensor_type,
            config.get("sensor_type_category", "unknown"),
        )

except ImportError as e:
    _LOGGER.error("Failed to import sensor_types.py: %s", e)
    _LOGGER.error("This is a critical error - sensor_types.py must exist and be valid")
    raise
except AttributeError as e:
    _LOGGER.error("SENSOR_TYPES not found in sensor_types.py: %s", e)
    raise
except Exception as e:
    _LOGGER.error("Unexpected error importing sensor_types.py: %s", e)
    raise


# ============================================================================
# HELPER FUNCTIONS - Sensor Registry
# ============================================================================


def _get_expected_sensor_types(hass: HomeAssistant, entry: ConfigEntry) -> set[str]:
    """
    Vrátí set všech sensor_types které by měly být registrované
    podle aktuální konfigurace entry.

    Používá se pro cleanup - senzory které nejsou v tomto setu jsou osiřelé.
    """
    expected = {"data_source"}

    # Získáme statistics_enabled z hass.data
    statistics_enabled = hass.data[DOMAIN][entry.entry_id].get(
        "statistics_enabled", False
    )

    always_enabled_categories = {"data", "computed", "shield", "notification"}
    category_to_option_key: dict[str, str] = {
        "extended": "enable_extended_sensors",
        "solar_forecast": "enable_solar_forecast",
        "pricing": "enable_pricing",
        "chmu_warnings": "enable_chmu_warnings",
    }
    battery_prediction_enabled = entry.options.get("enable_battery_prediction", False)

    if battery_prediction_enabled:
        expected.add("battery_health")

    for sensor_type, config in SENSOR_TYPES.items():
        category = config.get("sensor_type_category")

        # Základní kategorie (vždy aktivní)
        if category in always_enabled_categories:
            expected.add(sensor_type)
            continue

        # Statistics sensors (volitelné)
        if category == "statistics" and statistics_enabled:
            expected.add(sensor_type)
            continue

        # Battery-related sensors (volitelné, společně s battery_prediction)
        if (
            category
            in {
                "battery_prediction",
                "battery_balancing",
                "grid_charging_plan",
                "battery_efficiency",
                "planner_status",
                "adaptive_profiles",
            }
            and battery_prediction_enabled
        ):
            expected.add(sensor_type)
            continue

        # Grid cost sensors — require BOTH pricing AND battery_prediction
        if category == "grid_cost_computed" and (
            entry.options.get("enable_pricing", False)
            and entry.options.get("enable_battery_prediction", False)
        ):
            expected.add(sensor_type)
            continue

        option_key = category_to_option_key.get(str(category))
        if option_key and entry.options.get(option_key, False):
            expected.add(sensor_type)

    _LOGGER.debug("Expected %s sensor types based on configuration", len(expected))
    return expected


async def _cleanup_renamed_sensors(
    entity_reg,
    entry: ConfigEntry,
    expected_sensor_types: set[str],
    boiler_enabled: bool = True,
) -> int:
    """
    Smaže senzory které už nejsou v konfiguraci (přejmenované/odstraněné/vypnuté modulem).

    Args:
        entity_reg: Entity registry z HA
        entry: Config entry
        expected_sensor_types: Set očekávaných sensor_types
        boiler_enabled: Aktuální stav `enable_boiler` flagu. Bojlerové senzory z modulu
            `boiler/sensors.py` nejsou vedené v SENSOR_TYPES, takže je expected_sensor_types
            nepokrývá — gatujeme je zvlášť tímto flagem. Legacy `boiler_*` klíče, které v
            SENSOR_TYPES JSOU (kategorie data/computed, vždy aktivní), touto větví neprojdou.

    Returns:
        Počet odstraněných senzorů
    """
    await asyncio.sleep(0)
    removed = 0

    deprecated_patterns = [
        "_battery_prediction_",  # nahrazeno battery_forecast
        "_old_",  # obecný pattern pro staré
    ]

    from homeassistant.helpers import entity_registry as er

    entries = er.async_entries_for_config_entry(entity_reg, entry.entry_id)

    for entity_entry in entries:
        entity_id = entity_entry.entity_id
        if not _is_oig_sensor_entity(entity_id):
            continue

        sensor_type = _extract_sensor_type(entity_id)
        if not sensor_type:
            continue

        if _is_boiler_entity(entity_id, sensor_type):
            if sensor_type in SENSOR_TYPES or boiler_enabled:
                continue
            removed += _remove_entity_entry(entity_reg, entity_entry, sensor_type)
            continue

        if _should_remove_sensor(
            entity_id, sensor_type, expected_sensor_types, deprecated_patterns
        ):
            removed += _remove_entity_entry(entity_reg, entity_entry, sensor_type)

    return removed


def _is_oig_sensor_entity(entity_id: str) -> bool:
    return entity_id.startswith("sensor.oig_") and len(entity_id.split("_")) >= 3


def _is_boiler_entity(entity_id: str, sensor_type: str) -> bool:
    """Boiler identity by catalog, not substring.

    ``sensor_type`` is authoritative: every real boiler sensor_type is
    prefixed ``boiler_`` -- the legacy `SENSOR_TYPES_BOILER` catalog keys
    (sensors/SENSOR_TYPES_BOILER.py) and the module sensors from
    `boiler/sensors.py get_boiler_sensors()` (unique_id_suffix always
    rendered as ``boiler_<suffix>`` by BoilerSensorBase). A loose substring
    match on entity_id (former `"_boiler_" in entity_id`) also caught
    non-boiler entities that merely mention boiler, e.g. the statistics
    sensor `hourly_real_boiler_kwh`.
    """
    return entity_id.startswith("sensor.oig_bojler") or sensor_type.startswith(
        "boiler_"
    )


def _extract_sensor_type(entity_id: str) -> Optional[str]:
    prefix = "sensor.oig_"
    if not entity_id.startswith(prefix):
        return None
    after_prefix = entity_id[len(prefix) :]
    parts_after = after_prefix.split("_", 1)
    if len(parts_after) > 1:
        return parts_after[1]
    return None


def _should_remove_sensor(
    entity_id: str,
    sensor_type: str,
    expected_sensor_types: set[str],
    deprecated_patterns: List[str],
) -> bool:
    is_deprecated = any(pattern in entity_id for pattern in deprecated_patterns)
    is_expected = sensor_type in expected_sensor_types
    return is_deprecated or not is_expected


def _remove_entity_entry(entity_reg, entity_entry, sensor_type: str) -> int:
    try:
        _LOGGER.info(
            "🗑️ Removing deprecated/renamed sensor: %s (type: %s)",
            entity_entry.entity_id,
            sensor_type,
        )
        entity_reg.async_remove(entity_entry.entity_id)
        return 1
    except Exception as e:
        _LOGGER.error("Failed to remove sensor %s: %s", entity_entry.entity_id, e)
        return 0


async def _cleanup_removed_devices(
    device_reg, entity_reg, entry: ConfigEntry, coordinator
) -> int:
    """
    Smaže zařízení pro Battery Boxy které už neexistují v coordinator.data.

    Args:
        device_reg: Device registry z HA
        entity_reg: Entity registry z HA
        entry: Config entry
        coordinator: Data coordinator

    Returns:
        Počet odstraněných zařízení
    """
    await asyncio.sleep(0)
    if not coordinator or not coordinator.data:
        return 0

    removed = 0
    current_box_ids = set(coordinator.data.keys())

    from homeassistant.helpers import device_registry as dr

    devices = dr.async_entries_for_config_entry(device_reg, entry.entry_id)

    for device in devices:
        device_box_id = _extract_device_box_id(device)
        if not device_box_id or device_box_id in current_box_ids:
            continue
        if _remove_device_and_entities(device_reg, entity_reg, device, device_box_id):
            removed += 1

    return removed


def _extract_device_box_id(device) -> Optional[str]:
    for identifier in device.identifiers:
        if identifier[0] not in [DOMAIN, "oig_cloud_analytics", "oig_cloud_shield"]:
            continue
        identifier_value = identifier[1]
        if _is_special_device_identifier(identifier_value):
            return None
        return (
            identifier_value.replace("_shield", "")
            .replace("_analytics", "")
            .replace("_boiler", "")
        )
    return None


def _is_special_device_identifier(identifier_value: str) -> bool:
    return any(
        marker in identifier_value for marker in ("_analytics", "_shield", "_boiler")
    )


def _remove_device_and_entities(
    device_reg, entity_reg, device, device_box_id: str
) -> bool:
    try:
        _LOGGER.warning(
            "🗑️ Removing device for non-existent box: %s (box_id: %s)",
            device.name,
            device_box_id,
        )

        from homeassistant.helpers import entity_registry as er

        entities = er.async_entries_for_device(entity_reg, device.id)
        for entity in entities:
            entity_reg.async_remove(entity.entity_id)
            _LOGGER.debug("  Removed entity: %s", entity.entity_id)

        device_reg.async_remove_device(device.id)
        return True
    except Exception as e:
        _LOGGER.error("Failed to remove device %s: %s", device.name, e)
        return False


async def _cleanup_empty_devices_internal(
    device_reg, entity_reg, entry: ConfigEntry
) -> int:
    """
    Smaže zařízení která nemají žádné entity.

    Args:
        device_reg: Device registry z HA
        entity_reg: Entity registry z HA
        entry: Config entry

    Returns:
        Počet odstraněných zařízení
    """
    await asyncio.sleep(0)
    removed = 0

    from homeassistant.helpers import device_registry as dr
    from homeassistant.helpers import entity_registry as er

    devices = dr.async_entries_for_config_entry(device_reg, entry.entry_id)

    for device in devices:
        entities = er.async_entries_for_device(entity_reg, device.id)

        if not entities:
            try:
                _LOGGER.info("🗑️ Removing empty device: %s", device.name)
                device_reg.async_remove_device(device.id)
                removed += 1
            except Exception as e:
                _LOGGER.error("Failed to remove empty device %s: %s", device.name, e)

    return removed


async def _cleanup_all_orphaned_entities(
    hass: HomeAssistant,
    entry: ConfigEntry,
    coordinator,
    expected_sensor_types: set[str],
) -> int:
    """
    Univerzální cleanup pro všechny typy osiřelých entit.
    Sjednocuje 3 stávající cleanup funkce.

    Args:
        hass: Home Assistant instance
        entry: Config entry
        coordinator: Data coordinator
        expected_sensor_types: Set očekávaných sensor_types podle konfigurace

    Returns:
        Celkový počet odstraněných položek (sensors + devices)
    """
    from homeassistant.helpers import device_registry as dr
    from homeassistant.helpers import entity_registry as er

    _LOGGER.info("🧹 Starting comprehensive cleanup of orphaned entities")

    entity_reg = er.async_get(hass)
    device_reg = dr.async_get(hass)

    # 1. Cleanup starých/přejmenovaných senzorů
    removed_sensors = await _cleanup_renamed_sensors(
        entity_reg, entry, expected_sensor_types
    )

    # 2. Cleanup osiřelých zařízení (neexistující Battery Boxy)
    removed_devices = await _cleanup_removed_devices(
        device_reg, entity_reg, entry, coordinator
    )

    # 3. Cleanup prázdných zařízení (bez entit)
    removed_empty = await _cleanup_empty_devices_internal(device_reg, entity_reg, entry)

    total_removed = removed_sensors + removed_devices + removed_empty

    _LOGGER.info(
        "✅ Cleanup completed: %s deprecated sensors, %s orphaned devices, %s empty devices (total: %s items removed)",
        removed_sensors,
        removed_devices,
        removed_empty,
        total_removed,
    )

    return total_removed


def get_device_info_for_sensor(
    sensor_config: Dict[str, Any],
    box_id: str,
    main_device_info: Dict[str, Any],
    analytics_device_info: Dict[str, Any],
    shield_device_info: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Vrací správný device_info pro senzor podle device_mapping.

    Args:
        sensor_config: Konfigurace senzoru obsahující device_mapping
        box_id: ID Battery Boxu
        main_device_info: Device info pro hlavní OIG zařízení
        analytics_device_info: Device info pro Analytics & Predictions
        shield_device_info: Device info pro ServiceShield

    Returns:
        Device info dictionary pro senzor
    """
    _ = box_id
    device_mapping = sensor_config.get("device_mapping", "main")

    if device_mapping == "analytics":
        return analytics_device_info
    elif device_mapping == "shield":
        return shield_device_info
    else:  # "main" nebo jiná hodnota (fallback na main)
        return main_device_info


def _log_coordinator_data_status(coordinator: Any) -> None:
    # Do not block platform setup waiting for coordinator refresh.
    # HA will warn if setup exceeds 10s; sensors can be registered immediately and will
    # populate when coordinator/local entities become available.
    if coordinator.data is None:
        _LOGGER.debug(
            "Coordinator data not ready during sensor setup; registering entities anyway"
        )
        return
    try:
        _LOGGER.debug(
            "Setting up sensors with coordinator data: %s devices",
            len(coordinator.data),
        )
    except Exception:
        _LOGGER.debug(
            "Setting up sensors with coordinator data (device count unavailable)"
        )


def _resolve_box_id_and_store(
    hass: HomeAssistant, entry: ConfigEntry, coordinator: Any
) -> Optional[str]:
    inverter_sn = resolve_box_id(coordinator)

    if inverter_sn == "unknown":
        from_title = None
        try:
            import re

            m = re.search(r"(\\d{6,})", entry.title or "")
            if m:
                from_title = m.group(1)
        except Exception:
            from_title = None

        if from_title:
            inverter_sn = from_title
            new_opts = dict(entry.options)
            if new_opts.get("box_id") != inverter_sn:
                new_opts["box_id"] = inverter_sn
                hass.config_entries.async_update_entry(entry, options=new_opts)
                _LOGGER.info(
                    "Stored box_id=%s from title into entry options", inverter_sn
                )

    if inverter_sn == "unknown":
        _LOGGER.error("No valid box_id/inverter_sn resolved, skipping sensor setup")
        return None

    if entry.options.get("box_id") != inverter_sn:
        new_opts = dict(entry.options)
        new_opts["box_id"] = inverter_sn
        hass.config_entries.async_update_entry(entry, options=new_opts)
        _LOGGER.info("Stored box_id=%s into entry options", inverter_sn)

    try:
        setattr(coordinator, "forced_box_id", inverter_sn)
    except Exception:
        _LOGGER.debug("Could not set forced_box_id on coordinator")

    return inverter_sn


def _get_analytics_device_info(
    hass: HomeAssistant, entry: ConfigEntry, inverter_sn: str
) -> Dict[str, Any]:
    return hass.data.get(DOMAIN, {}).get(entry.entry_id, {}).get(
        "analytics_device_info"
    ) or {
        "identifiers": {(DOMAIN, f"{inverter_sn}_analytics")},
        "name": f"Analytics & Predictions {inverter_sn}",
        "manufacturer": "OIG",
        "model": "Analytics Module",
        "via_device": (DOMAIN, inverter_sn),
        "entry_type": "service",
    }


def _register_data_source_sensor(
    hass: HomeAssistant, coordinator: Any, entry: ConfigEntry
) -> List[Any]:
    sensors: List[Any] = []
    try:
        data_source_sensor = OigCloudDataSourceSensor(hass, coordinator, entry)
        sensors.append(data_source_sensor)
        _LOGGER.info("Registered data source state sensor")
    except Exception as e:
        _LOGGER.error("Error creating data source sensor: %s", e, exc_info=True)
    return sensors


def _register_ai_status_sensor(
    hass: HomeAssistant, coordinator: Any, entry: ConfigEntry
) -> List[Any]:
    sensors: List[Any] = []
    try:
        box_id = resolve_box_id(coordinator)
        sensors.append(OigCloudAiStatusSensor(hass, entry, box_id))
        _LOGGER.info("Registered AI status sensor")
    except Exception as e:
        _LOGGER.error("Error creating AI status sensor: %s", e, exc_info=True)
    return sensors


def _register_ai_eval_sensor(
    hass: HomeAssistant, coordinator: Any, entry: ConfigEntry
) -> List[Any]:
    sensors: List[Any] = []
    try:
        box_id = resolve_box_id(coordinator)
        sensors.append(OigCloudAiEvalSensor(hass, entry, box_id))
        _LOGGER.info("Registered AI eval sensor")
    except Exception as e:
        _LOGGER.error("Error creating AI eval sensor: %s", e, exc_info=True)
    return sensors


# Sensor types owned by a dedicated entity class (registered via their own
# ``_register_*`` helper below). They are present in ``SENSOR_TYPES`` so the
# entity-registry cleanup treats them as expected (never orphaned), but the
# generic data-sensor factory must NOT also build them -- doing so registers
# the same unique_id/entity_id twice and Home Assistant drops one entity.
_DEDICATED_DATA_SENSOR_TYPES: frozenset = frozenset({"ai_eval"})


def _create_basic_sensors(coordinator: Any) -> List[Any]:
    basic_sensors: List[Any] = []
    try:
        data_sensors = {
            k: v
            for k, v in SENSOR_TYPES.items()
            if v.get("sensor_type_category") == "data"
            and k not in _DEDICATED_DATA_SENSOR_TYPES
        }
        _LOGGER.debug("Found %s data sensors to create", len(data_sensors))

        for sensor_type, config in data_sensors.items():
            try:
                from .entities.data_sensor import OigCloudDataSensor

                sensor = OigCloudDataSensor(coordinator, sensor_type)

                if hasattr(sensor, "device_info") and sensor.device_info is not None:
                    if not isinstance(sensor.device_info, dict):
                        _LOGGER.error(
                            "Sensor %s has invalid device_info type: %s",
                            sensor_type,
                            type(sensor.device_info),
                        )
                        continue

                basic_sensors.append(sensor)
                _LOGGER.debug("Created data sensor: %s", sensor_type)
            except ImportError as e:
                _LOGGER.error(
                    "OigCloudDataSensor not available for %s: %s", sensor_type, e
                )
                continue
            except Exception as e:
                _LOGGER.error("Error creating data sensor %s: %s", sensor_type, e)
                continue

        if basic_sensors:
            _LOGGER.info("Registering %s basic sensors", len(basic_sensors))
        else:
            _LOGGER.warning("No basic sensors could be created")
    except Exception as e:
        _LOGGER.error("Error initializing basic sensors: %s", e, exc_info=True)
    return basic_sensors


def _create_computed_sensors(coordinator: Any) -> List[Any]:
    computed_sensors: List[Any] = []
    try:
        if coordinator.data is None:
            _LOGGER.debug("Coordinator data is None, skipping computed sensors")
            return computed_sensors

        computed_sensor_types = {
            k: v
            for k, v in SENSOR_TYPES.items()
            if v.get("sensor_type_category") == "computed"
        }
        _LOGGER.debug("Found %s computed sensors to create", len(computed_sensor_types))

        for sensor_type, config in computed_sensor_types.items():
            try:
                from .entities.computed_sensor import OigCloudComputedSensor

                sensor = OigCloudComputedSensor(coordinator, sensor_type)

                sensor_device_info = getattr(sensor, "device_info", None)
                if sensor_device_info is not None:
                    if not isinstance(sensor_device_info, dict):
                        _LOGGER.error(
                            "Computed sensor %s has invalid device_info type: %s",
                            sensor_type,
                            type(sensor_device_info),
                        )
                        continue

                computed_sensors.append(sensor)
                _LOGGER.debug("Created computed sensor: %s", sensor_type)
            except ImportError as e:
                _LOGGER.error(
                    "OigCloudComputedSensor not available for %s: %s", sensor_type, e
                )
                continue
            except Exception as e:
                _LOGGER.error("Error creating computed sensor %s: %s", sensor_type, e)
                continue

        if computed_sensors:
            _LOGGER.info("Registering %s computed sensors", len(computed_sensors))
        else:
            _LOGGER.debug("No computed sensors found")
    except Exception as e:
        _LOGGER.error("Error initializing computed sensors: %s", e, exc_info=True)
    return computed_sensors


def _create_extended_sensors(coordinator: Any, entry: ConfigEntry) -> List[Any]:
    extended_sensors: List[Any] = []
    extended_sensors_enabled = entry.options.get("enable_extended_sensors", False)
    _LOGGER.debug("Extended sensors enabled from options: %s", extended_sensors_enabled)

    if extended_sensors_enabled is not True:
        _LOGGER.info("Extended sensors disabled - skipping creation")
        return extended_sensors

    try:
        if coordinator.data is None:
            _LOGGER.debug("Coordinator data is None, skipping extended sensors")
            return extended_sensors

        extended_sensor_types = {
            k: v
            for k, v in SENSOR_TYPES.items()
            if v.get("sensor_type_category") == "extended"
        }
        _LOGGER.debug("Found %s extended sensors to create", len(extended_sensor_types))

        for sensor_type, config in extended_sensor_types.items():
            try:
                from .entities.data_sensor import OigCloudDataSensor

                extended_sensor = OigCloudDataSensor(
                    coordinator, sensor_type, extended=True
                )
                extended_sensors.append(extended_sensor)
                _LOGGER.debug("Created extended sensor: %s", sensor_type)
            except ImportError as e:
                _LOGGER.error(
                    "OigCloudDataSensor not available for %s: %s", sensor_type, e
                )
                continue
            except Exception as e:
                _LOGGER.error("Error creating extended sensor %s: %s", sensor_type, e)
                continue

        if extended_sensors:
            _LOGGER.info("Registering %s extended sensors", len(extended_sensors))
        else:
            _LOGGER.debug("No extended sensors found")
    except Exception as e:
        _LOGGER.error("Error initializing extended sensors: %s", e, exc_info=True)
    return extended_sensors


def _create_statistics_sensors(
    hass: HomeAssistant,
    coordinator: Any,
    entry: ConfigEntry,
    analytics_device_info: Dict[str, Any],
) -> List[Any]:
    statistics_sensors: List[Any] = []
    statistics_enabled = hass.data[DOMAIN][entry.entry_id].get(
        "statistics_enabled", False
    )
    statistics_option = entry.options.get("enable_statistics", True)
    _LOGGER.info(
        "Statistics check: option=%s, hass.data=%s",
        statistics_option,
        statistics_enabled,
    )

    if not statistics_enabled:
        _LOGGER.info("Statistics sensors disabled - skipping creation")
        return statistics_sensors

    try:
        if coordinator.data is None or not SENSOR_TYPES:
            _LOGGER.debug(
                "Coordinator data is None or SENSOR_TYPES empty, skipping statistics sensors"
            )
            return statistics_sensors

        from .entities.statistics_sensor import OigCloudStatisticsSensor

        for sensor_type, config in SENSOR_TYPES.items():
            if config.get("sensor_type_category") != "statistics":
                continue
            try:
                _LOGGER.debug("Creating statistics sensor: %s", sensor_type)
                sensor = OigCloudStatisticsSensor(
                    coordinator, sensor_type, analytics_device_info
                )
                statistics_sensors.append(sensor)
                _LOGGER.debug("Successfully created statistics sensor: %s", sensor_type)
            except Exception as e:
                _LOGGER.error(
                    "Error creating statistics sensor %s: %s",
                    sensor_type,
                    e,
                    exc_info=True,
                )
                continue

        if statistics_sensors:
            _LOGGER.info("Registering %s statistics sensors", len(statistics_sensors))
        else:
            _LOGGER.debug("No statistics sensors found")
    except Exception as e:
        _LOGGER.error("Error initializing statistics sensors: %s", e, exc_info=True)
    return statistics_sensors


def _create_solar_forecast_sensors(
    hass: HomeAssistant,
    coordinator: Any,
    entry: ConfigEntry,
    analytics_device_info: Dict[str, Any],
) -> List[Any]:
    if not entry.options.get("enable_solar_forecast", False):
        return []
    solar_sensors: List[Any] = []
    try:
        from .entities.solar_forecast_sensor import OigCloudSolarForecastSensor

        solar_sensors = _build_solar_forecast_sensors(
            coordinator,
            entry,
            analytics_device_info,
            OigCloudSolarForecastSensor,
        )
        _register_solar_forecast_sensors(hass, entry, solar_sensors)
    except ImportError as e:
        _LOGGER.warning("Solar forecast sensors not available: %s", e)
        return []
    except Exception as e:
        _LOGGER.error("Error initializing solar forecast sensors: %s", e)
        return []
    return solar_sensors


def _build_solar_forecast_sensors(
    coordinator: Any,
    entry: ConfigEntry,
    analytics_device_info: Dict[str, Any],
    sensor_cls: Any,
) -> List[Any]:
    solar_sensors: List[Any] = []
    if not SENSOR_TYPES:
        return solar_sensors
    for sensor_type, config in SENSOR_TYPES.items():
        if config.get("sensor_type_category") != "solar_forecast":
            continue
        solar_sensors.append(
            sensor_cls(coordinator, sensor_type, entry, analytics_device_info)
        )
    return solar_sensors


def _register_solar_forecast_sensors(
    hass: HomeAssistant, entry: ConfigEntry, solar_sensors: List[Any]
) -> None:
    if solar_sensors:
        _LOGGER.debug("Registering %d solar forecast sensors", len(solar_sensors))
        hass.data[DOMAIN][entry.entry_id]["solar_forecast_sensors"] = solar_sensors
        _LOGGER.debug("Solar forecast sensors stored for service access")
        return
    _LOGGER.debug("No solar forecast sensors found - this is normal if not configured")


def _create_shield_sensors(coordinator: Any) -> List[Any]:
    try:
        from .entities.shield_sensor import OigCloudShieldSensor

        return _create_category_sensors(
            coordinator=coordinator,
            category="shield",
            sensor_cls=OigCloudShieldSensor,
            log_label="ServiceShield",
        )
    except Exception as e:
        _LOGGER.error("Error initializing ServiceShield sensors: %s", e)
        return []


def _create_notification_sensors(coordinator: Any) -> List[Any]:
    try:
        from .entities.data_sensor import OigCloudDataSensor

        return _create_category_sensors(
            coordinator=coordinator,
            category="notification",
            sensor_cls=lambda coord, sensor_type: OigCloudDataSensor(
                coord, sensor_type, notification=True
            ),
            log_label="notification",
            log_info=True,
        )
    except Exception as e:
        _LOGGER.error("Error initializing notification sensors: %s", e)
        return []


def _create_category_sensors(
    *,
    coordinator: Any,
    category: str,
    sensor_cls: Any,
    log_label: str,
    log_info: bool = False,
) -> List[Any]:
    if coordinator.data is None or not SENSOR_TYPES:
        _LOGGER.debug(
            "Coordinator data is None or SENSOR_TYPES empty, skipping %s sensors",
            log_label,
        )
        return []

    sensors = _build_category_sensors(
        coordinator=coordinator,
        category=category,
        sensor_cls=sensor_cls,
        log_label=log_label,
    )
    _log_category_sensor_registration(sensors, log_label, log_info)
    return sensors


def _build_category_sensors(
    *,
    coordinator: Any,
    category: str,
    sensor_cls: Any,
    log_label: str,
) -> List[Any]:
    sensors: List[Any] = []
    for sensor_type in _iter_category_sensor_types(category):
        sensor = _try_create_category_sensor(
            coordinator=coordinator,
            sensor_type=sensor_type,
            sensor_cls=sensor_cls,
            log_label=log_label,
        )
        if sensor is not None:
            sensors.append(sensor)
    return sensors


def _iter_category_sensor_types(category: str):
    for sensor_type, config in SENSOR_TYPES.items():
        if config.get("sensor_type_category") == category:
            yield sensor_type


def _try_create_category_sensor(
    *,
    coordinator: Any,
    sensor_type: str,
    sensor_cls: Any,
    log_label: str,
) -> Optional[Any]:
    try:
        sensor = sensor_cls(coordinator, sensor_type)
    except Exception as e:
        _LOGGER.error("Error creating %s sensor %s: %s", log_label, sensor_type, e)
        return None
    if not _is_sensor_device_info_valid(sensor, log_label, sensor_type):
        return None
    _LOGGER.debug("Created %s sensor: %s", log_label, sensor_type)
    return sensor


def _is_sensor_device_info_valid(sensor: Any, log_label: str, sensor_type: str) -> bool:
    if not hasattr(sensor, "device_info") or sensor.device_info is None:
        return True
    if isinstance(sensor.device_info, dict):
        return True
    _LOGGER.error(
        "%s sensor %s has invalid device_info type: %s",
        log_label,
        sensor_type,
        type(sensor.device_info),
    )
    return False


def _log_category_sensor_registration(
    sensors: List[Any], log_label: str, log_info: bool
) -> None:
    if sensors:
        log = _LOGGER.info if log_info else _LOGGER.debug
        log("Registering %d %s sensors", len(sensors), log_label)
    else:
        _LOGGER.debug("No %s sensors found", log_label)


def _create_battery_prediction_sensors(
    hass: HomeAssistant,
    coordinator: Any,
    entry: ConfigEntry,
    analytics_device_info: Dict[str, Any],
) -> List[Any]:
    battery_prediction_enabled = entry.options.get("enable_battery_prediction", False)
    _LOGGER.info("Battery prediction enabled: %s", battery_prediction_enabled)
    if not battery_prediction_enabled:
        _LOGGER.info("Battery prediction sensors disabled - skipping creation")
        if DOMAIN in hass.data and entry.entry_id in hass.data[DOMAIN]:
            hass.data[DOMAIN][entry.entry_id]["battery_forecast_sensors"] = []
        return []

    try:
        from .battery_forecast.sensors.ha_sensor import OigCloudBatteryForecastSensor
    except ImportError as e:
        _LOGGER.warning("Battery prediction sensors not available: %s", e)
        return []

    try:
        return _init_battery_prediction_sensors(
            hass,
            coordinator,
            entry,
            analytics_device_info,
            OigCloudBatteryForecastSensor,
        )
    except Exception as e:
        _LOGGER.error("Error initializing battery prediction sensors: %s", e)
        return []


def _init_battery_prediction_sensors(
    hass: HomeAssistant,
    coordinator: Any,
    entry: ConfigEntry,
    analytics_device_info: Dict[str, Any],
    sensor_cls: Any,
) -> List[Any]:
    battery_forecast_sensors = _build_battery_prediction_sensors(
        coordinator,
        entry,
        analytics_device_info,
        hass,
        sensor_cls,
    )
    if not battery_forecast_sensors:
        _LOGGER.debug("No battery prediction sensors found")
        return []

    _LOGGER.info(
        "Registering %d battery prediction sensors",
        len(battery_forecast_sensors),
    )
    _connect_balancing_manager(hass, entry, coordinator, battery_forecast_sensors)
    extra_sensors = _create_battery_support_sensors(
        hass, coordinator, entry, analytics_device_info
    )
    return battery_forecast_sensors + extra_sensors


def _build_battery_prediction_sensors(
    coordinator: Any,
    entry: ConfigEntry,
    analytics_device_info: Dict[str, Any],
    hass: HomeAssistant,
    sensor_cls: Any,
) -> List[Any]:
    sensors: List[Any] = []
    if not SENSOR_TYPES:
        return sensors
    for sensor_type, config in SENSOR_TYPES.items():
        if config.get("sensor_type_category") != "battery_prediction":
            continue
        try:
            sensor = sensor_cls(
                coordinator,
                sensor_type,
                entry,
                analytics_device_info,
                hass,
            )
            sensors.append(sensor)
            _LOGGER.debug("Created battery prediction sensor: %s", sensor_type)
        except ValueError as e:
            _LOGGER.warning("Skipping battery prediction sensor %s: %s", sensor_type, e)
        except Exception as e:
            _LOGGER.error(
                "Error creating battery prediction sensor %s: %s", sensor_type, e
            )
    return sensors


def _connect_balancing_manager(
    hass: HomeAssistant,
    entry: ConfigEntry,
    coordinator: Any,
    battery_forecast_sensors: List[Any],
) -> None:
    if DOMAIN not in hass.data or entry.entry_id not in hass.data[DOMAIN]:
        return
    if not battery_forecast_sensors:
        return
    try:
        balancing_manager = hass.data[DOMAIN][entry.entry_id].get("balancing_manager")
        hass.data[DOMAIN][entry.entry_id][
            "battery_forecast_sensors"
        ] = battery_forecast_sensors
        if balancing_manager:
            forecast_sensor = battery_forecast_sensors[0]
            balancing_manager.set_forecast_sensor(forecast_sensor)
            balancing_manager.set_coordinator(coordinator)
            _LOGGER.info(
                "✅ Connected BalancingManager to forecast sensor and coordinator"
            )
    except Exception as e:
        _LOGGER.debug("Could not set forecast sensor in BalancingManager: %s", e)


def _create_battery_support_sensors(
    hass: HomeAssistant,
    coordinator: Any,
    entry: ConfigEntry,
    analytics_device_info: Dict[str, Any],
) -> List[Any]:
    sensors: List[Any] = []

    sensors.extend(
        _create_battery_health_sensor(coordinator, entry, analytics_device_info, hass)
    )
    sensors.extend(
        _create_battery_balancing_sensors(
            coordinator, entry, analytics_device_info, hass
        )
    )

    sensors.extend(
        _create_grid_charging_plan_sensors(coordinator, analytics_device_info)
    )
    sensors.extend(
        _create_battery_efficiency_sensors(
            coordinator, entry, analytics_device_info, hass
        )
    )
    sensors.extend(
        _create_planner_status_sensors(coordinator, entry, analytics_device_info, hass)
    )
    sensors.extend(
        _create_adaptive_profiles_sensors(
            coordinator, entry, analytics_device_info, hass
        )
    )

    return sensors


def _create_battery_health_sensor(
    coordinator: Any,
    entry: ConfigEntry,
    analytics_device_info: Dict[str, Any],
    hass: HomeAssistant,
) -> List[Any]:
    try:
        from .entities.battery_health_sensor import BatteryHealthSensor

        health_sensor = BatteryHealthSensor(
            coordinator,
            "battery_health",
            entry,
            cast(DeviceInfo, analytics_device_info),
            hass,
        )
        _LOGGER.info("✅ Registered Battery Health sensor")
        return [health_sensor]
    except Exception as e:
        _LOGGER.error("Failed to create Battery Health sensor: %s", e)
        return []


def _create_battery_balancing_sensors(
    coordinator: Any,
    entry: ConfigEntry,
    analytics_device_info: Dict[str, Any],
    hass: HomeAssistant,
) -> List[Any]:
    try:
        from .entities.battery_balancing_sensor import OigCloudBatteryBalancingSensor
    except Exception as e:
        _LOGGER.error("Error creating battery balancing sensors: %s", e)
        return []

    balancing_sensors: List[Any] = []
    for sensor_type, config in SENSOR_TYPES.items():
        if config.get("sensor_type_category") != "battery_balancing":
            continue
        sensor = OigCloudBatteryBalancingSensor(
            coordinator,
            sensor_type,
            entry,
            cast(DeviceInfo, analytics_device_info),
            hass,
        )
        balancing_sensors.append(sensor)
        _LOGGER.debug("Created battery balancing sensor: %s", sensor_type)

    if balancing_sensors:
        _LOGGER.info("Registering %d battery balancing sensors", len(balancing_sensors))
    return balancing_sensors


def _create_grid_charging_plan_sensors(
    coordinator: Any,
    analytics_device_info: Dict[str, Any],
) -> List[Any]:
    try:
        from .battery_forecast.sensors.grid_charging_sensor import (
            OigCloudGridChargingPlanSensor,
        )
    except Exception as e:
        _LOGGER.error("Error creating grid charging plan sensors: %s", e)
        return []

    grid_charging_sensors: List[Any] = []
    for sensor_type, config in SENSOR_TYPES.items():
        if config.get("sensor_type_category") != "grid_charging_plan":
            continue
        sensor = OigCloudGridChargingPlanSensor(
            coordinator, sensor_type, cast(DeviceInfo, analytics_device_info)
        )
        grid_charging_sensors.append(sensor)
        _LOGGER.debug("Created grid charging plan sensor: %s", sensor_type)

    if grid_charging_sensors:
        _LOGGER.info(
            "Registering %d grid charging plan sensors",
            len(grid_charging_sensors),
        )
    return grid_charging_sensors


def _create_battery_efficiency_sensors(
    coordinator: Any,
    entry: ConfigEntry,
    analytics_device_info: Dict[str, Any],
    hass: HomeAssistant,
) -> List[Any]:
    try:
        from .battery_forecast.sensors.efficiency_sensor import (
            OigCloudBatteryEfficiencySensor,
        )
    except Exception as e:
        _LOGGER.error("Error creating battery efficiency sensors: %s", e)
        return []

    efficiency_sensors: List[Any] = []
    for sensor_type, config in SENSOR_TYPES.items():
        if config.get("sensor_type_category") != "battery_efficiency":
            continue
        sensor = OigCloudBatteryEfficiencySensor(
            coordinator,
            sensor_type,
            entry,
            analytics_device_info,
            hass,
        )
        efficiency_sensors.append(sensor)
        _LOGGER.debug("Created battery efficiency sensor: %s", sensor_type)

    if efficiency_sensors:
        _LOGGER.info(
            "Registering %d battery efficiency sensors", len(efficiency_sensors)
        )
    return efficiency_sensors


def _create_planner_status_sensors(
    coordinator: Any,
    entry: ConfigEntry,
    analytics_device_info: Dict[str, Any],
    hass: HomeAssistant,
) -> List[Any]:
    try:
        from .battery_forecast.sensors.recommended_sensor import (
            OigCloudPlannerRecommendedModeSensor,
        )
    except Exception as e:
        _LOGGER.error("Error creating planner status sensors: %s", e)
        return []

    planner_status_sensors: List[Any] = []
    for sensor_type, config in SENSOR_TYPES.items():
        if config.get("sensor_type_category") != "planner_status":
            continue
        sensor = OigCloudPlannerRecommendedModeSensor(
            coordinator,
            sensor_type,
            entry,
            cast(DeviceInfo, analytics_device_info),
            hass,
        )
        planner_status_sensors.append(sensor)
        _LOGGER.debug("Created planner status sensor: %s", sensor_type)

    if planner_status_sensors:
        _LOGGER.info(
            "Registering %d planner status sensors", len(planner_status_sensors)
        )
    return planner_status_sensors


def _create_adaptive_profiles_sensors(
    coordinator: Any,
    entry: ConfigEntry,
    analytics_device_info: Dict[str, Any],
    hass: HomeAssistant,
) -> List[Any]:
    try:
        from .entities.adaptive_load_profiles_sensor import (
            OigCloudAdaptiveLoadProfilesSensor,
        )
    except Exception as e:
        _LOGGER.error("Error creating adaptive load profiles sensors: %s", e)
        return []

    adaptive_sensors: List[Any] = []
    for sensor_type, config in SENSOR_TYPES.items():
        if config.get("sensor_type_category") != "adaptive_profiles":
            continue
        sensor = OigCloudAdaptiveLoadProfilesSensor(
            coordinator,
            sensor_type,
            entry,
            analytics_device_info,
            hass,
        )
        adaptive_sensors.append(sensor)
        _LOGGER.debug("Created adaptive load profiles sensor: %s", sensor_type)

    if adaptive_sensors:
        _LOGGER.info(
            "Registering %d adaptive load profiles sensors", len(adaptive_sensors)
        )
    return adaptive_sensors


def _create_pricing_sensors(
    coordinator: Any,
    entry: ConfigEntry,
    analytics_device_info: Dict[str, Any],
) -> List[Any]:
    pricing_enabled = entry.options.get("enable_pricing", False)
    _LOGGER.info("Pricing and spot prices enabled: %s", pricing_enabled)
    if not pricing_enabled:
        _LOGGER.info("💰 Pricing disabled - skipping pricing and spot price sensors")
        return []

    try:
        _LOGGER.info("💰 Creating analytics sensors for pricing and spot prices")

        from .entities.analytics_sensor import OigCloudAnalyticsSensor
        from .pricing.spot_price_sensor import (
            ExportPrice15MinSensor,
            SpotPrice15MinSensor,
        )
        from .sensors.SENSOR_TYPES_SPOT import SENSOR_TYPES_SPOT

        analytics_sensors: List[Any] = []

        pricing_sensors = {
            k: v
            for k, v in SENSOR_TYPES_SPOT.items()
            if v.get("sensor_type_category") == "pricing"
        }

        _LOGGER.debug("Found %s pricing sensors to create", len(pricing_sensors))

        for sensor_type, config in pricing_sensors.items():
            try:
                sensor: Any
                _LOGGER.debug("Creating analytics sensor: %s", sensor_type)

                if sensor_type == "spot_price_current_15min":
                    sensor = SpotPrice15MinSensor(
                        coordinator,
                        entry,
                        sensor_type,
                        cast(DeviceInfo, analytics_device_info),
                    )
                    _LOGGER.debug("Created 15min spot price sensor: %s", sensor_type)
                elif sensor_type == "export_price_current_15min":
                    sensor = ExportPrice15MinSensor(
                        coordinator,
                        entry,
                        sensor_type,
                        cast(DeviceInfo, analytics_device_info),
                    )
                    _LOGGER.debug("Created 15min export price sensor: %s", sensor_type)
                else:
                    sensor = OigCloudAnalyticsSensor(
                        coordinator, sensor_type, entry, analytics_device_info
                    )
                    _LOGGER.debug("Created analytics sensor: %s", sensor_type)

                analytics_sensors.append(sensor)
                _LOGGER.debug("Successfully created analytics sensor: %s", sensor_type)
            except Exception as e:
                _LOGGER.error(
                    "Failed to create analytics sensor %s: %s",
                    sensor_type,
                    e,
                    exc_info=True,
                )
                continue

        if analytics_sensors:
            _LOGGER.info("Registering %s analytics sensors", len(analytics_sensors))
            _LOGGER.info(
                "Successfully registered %s analytics sensors", len(analytics_sensors)
            )

            for sensor in analytics_sensors:
                _LOGGER.debug(
                    "💰 Registered analytics sensor: %s (unique_id: %s)",
                    sensor.entity_id,
                    sensor.unique_id,
                )
        else:
            _LOGGER.warning("No analytics sensors could be created")

        return analytics_sensors
    except ImportError as e:
        _LOGGER.error("OigCloudAnalyticsSensor not available: %s", e)
    except Exception as e:
        _LOGGER.error("Error initializing analytics sensors: %s", e, exc_info=True)
    return []


def _create_chmu_sensors(
    coordinator: Any,
    entry: ConfigEntry,
    analytics_device_info: Dict[str, Any],
) -> List[Any]:
    chmu_enabled = entry.options.get("enable_chmu_warnings", False)
    _LOGGER.info("ČHMÚ weather warnings enabled: %s", chmu_enabled)
    if not chmu_enabled:
        _LOGGER.info("🌦️ ČHMÚ warnings disabled - skipping weather warning sensors")
        return []

    try:
        _LOGGER.info("🌦️ Creating ČHMÚ weather warning sensors")

        from .entities.chmu_sensor import OigCloudChmuSensor
        from .sensors.SENSOR_TYPES_CHMU import SENSOR_TYPES_CHMU

        chmu_sensors: List[Any] = []

        chmu_sensor_types = {
            k: v
            for k, v in SENSOR_TYPES_CHMU.items()
            if v.get("sensor_type_category") == "chmu_warnings"
        }

        _LOGGER.debug("Found %s ČHMÚ sensors to create", len(chmu_sensor_types))

        for sensor_type, config in chmu_sensor_types.items():
            try:
                _LOGGER.debug("Creating ČHMÚ sensor: %s", sensor_type)

                sensor = OigCloudChmuSensor(
                    coordinator,
                    sensor_type,
                    entry,
                    cast(DeviceInfo, analytics_device_info),
                )
                chmu_sensors.append(sensor)
                _LOGGER.debug("Created ČHMÚ sensor: %s", sensor_type)

            except Exception as e:
                _LOGGER.error(
                    "Failed to create ČHMÚ sensor %s: %s",
                    sensor_type,
                    e,
                    exc_info=True,
                )
                continue

        if chmu_sensors:
            _LOGGER.info("Registering %s ČHMÚ sensors", len(chmu_sensors))
            _LOGGER.info("Successfully registered %s ČHMÚ sensors", len(chmu_sensors))

            for sensor in chmu_sensors:
                _LOGGER.debug(
                    "🌦️ Registered ČHMÚ sensor: %s (unique_id: %s)",
                    sensor.entity_id,
                    sensor.unique_id,
                )
        else:
            _LOGGER.warning("No ČHMÚ sensors could be created")

        return chmu_sensors

    except ImportError as e:
        _LOGGER.error("OigCloudChmuSensor not available: %s", e)
    except Exception as e:
        _LOGGER.error("Error initializing ČHMÚ sensors: %s", e, exc_info=True)
    return []


def _create_grid_cost_sensors(
    coordinator: Any,
    entry: ConfigEntry,
) -> List[Any]:
    """Create per-phase grid cost/earnings computed sensors.

    GATED: only created when BOTH enable_pricing AND enable_battery_prediction
    are enabled in the config entry options.  The sensors use the shared energy
    cache from OigCloudComputedSensor (same storage file, same restore path).
    """
    pricing_on = entry.options.get("enable_pricing", False)
    prediction_on = entry.options.get("enable_battery_prediction", False)
    if not pricing_on or not prediction_on:
        _LOGGER.info(
            "Grid cost sensors skipped (enable_pricing=%s, enable_battery_prediction=%s)",
            pricing_on,
            prediction_on,
        )
        return []

    sensors: List[Any] = []
    try:
        from .entities.computed_sensor import OigCloudComputedSensor
        from .sensors.SENSOR_TYPES_GRID_COST import SENSOR_TYPES_GRID_COST

        for sensor_type in SENSOR_TYPES_GRID_COST:
            try:
                sensor = OigCloudComputedSensor(coordinator, sensor_type)
                sensors.append(sensor)
                _LOGGER.debug("Created grid cost sensor: %s", sensor_type)
            except Exception as e:
                _LOGGER.error("Error creating grid cost sensor %s: %s", sensor_type, e)
    except Exception as e:
        _LOGGER.error("Error initialising grid cost sensors: %s", e, exc_info=True)

    if sensors:
        _LOGGER.info("Registering %d grid cost sensors", len(sensors))
    return sensors


def _create_boiler_sensors(hass: HomeAssistant, entry: ConfigEntry) -> List[Any]:
    boiler_enabled = entry.options.get("enable_boiler", False)
    _LOGGER.info("Boiler module enabled: %s", boiler_enabled)
    if not boiler_enabled:
        _LOGGER.info("🔥 Boiler module disabled - skipping boiler sensors")
        return []

    try:
        boiler_coordinator = hass.data[DOMAIN][entry.entry_id].get("boiler_coordinator")

        if boiler_coordinator is None:
            _LOGGER.warning(
                "Boiler coordinator not found in hass.data - skipping boiler sensors"
            )
            return []

        _LOGGER.info("🔥 Creating boiler sensors")

        from .boiler.runtime import get_boiler_runtime
        from .boiler.sensors import get_boiler_sensors

        box_id = entry.options.get("box_id")
        if not (isinstance(box_id, str) and box_id.isdigit()):
            box_id = getattr(boiler_coordinator, "box_id", None)
        runtime = get_boiler_runtime(hass, entry.entry_id, box_id) if box_id else None

        boiler_sensors = get_boiler_sensors(boiler_coordinator, runtime=runtime)

        if boiler_sensors:
            _LOGGER.info("Registering %s boiler sensors", len(boiler_sensors))
            _LOGGER.info(
                "Successfully registered %s boiler sensors", len(boiler_sensors)
            )

            for sensor in boiler_sensors:
                _LOGGER.debug(
                    "🔥 Registered boiler sensor: %s (unique_id: %s)",
                    sensor.entity_id,
                    sensor.unique_id,
                )
        else:
            _LOGGER.warning("No boiler sensors could be created")

        return boiler_sensors

    except ImportError as e:
        _LOGGER.error("Boiler sensors not available: %s", e)
    except Exception as e:
        _LOGGER.error("Error initializing boiler sensors: %s", e, exc_info=True)
    return []


def _register_all_sensors(
    async_add_entities: AddEntitiesCallback, all_sensors: List[Any]
) -> None:
    if all_sensors:
        _apply_legacy_entity_naming(all_sensors)
        _LOGGER.info(
            "🚀 Registering %s sensors in one batch (PERFORMANCE OPTIMIZATION)",
            len(all_sensors),
        )
        async_add_entities(all_sensors, False)
        _LOGGER.info("✅ All %s sensors registered successfully", len(all_sensors))
    else:
        _LOGGER.warning("⚠️ No sensors were created during setup")


def _schedule_deferred_sensor_registration(
    hass: HomeAssistant,
    async_add_entities: AddEntitiesCallback,
    deferred_factories: List[Callable[[], List[Any]]],
) -> None:
    if not deferred_factories:
        return

    async def _register_later() -> None:
        await asyncio.sleep(0)
        deferred_sensors: List[Any] = []
        for factory in deferred_factories:
            deferred_sensors.extend(factory())
            await asyncio.sleep(0)
        _register_all_sensors(async_add_entities, deferred_sensors)

    if getattr(hass, "loop", None) is None:
        deferred_sensors: List[Any] = []
        for factory in deferred_factories:
            deferred_sensors.extend(factory())
        _register_all_sensors(async_add_entities, deferred_sensors)
        return

    hass.async_create_task(_register_later())


def _apply_legacy_entity_naming(entities: List[Any]) -> None:
    for entity in entities:
        try:
            setattr(entity, "_attr_has_entity_name", False)
        except Exception:
            _LOGGER.debug(
                "Could not enforce legacy naming for entity %s",
                getattr(entity, "entity_id", "unknown"),
            )


async def async_setup_entry(  # noqa: C901
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    """Set up OIG Cloud sensors from a config entry."""
    await asyncio.sleep(0)
    _LOGGER.debug("Starting sensor setup with coordinator data")

    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]

    core_sensors: List[Any] = []
    deferred_factories: List[Callable[[], List[Any]]] = []

    _log_coordinator_data_status(coordinator)

    # === CLEANUP PŘED REGISTRACÍ ===
    # POZN: Plný _cleanup_all_orphaned_entities (renamed + removed-device + empty-device
    # sweep, 3 samostatné průchody registrem) byl vypnutý kvůli pomalému setupu (>10s).
    # Místo něj běží jen cílený per-entry sweep nad senzory TOHOTO config entry — nutný k
    # tomu, aby reload po vypnutí modulu (enable_pricing/statistics/boiler/...) skutečně
    # smazal osiřelé senzory z entity registry, ne jen přeskočil jejich znovuvytvoření.
    try:
        expected_sensor_types = _get_expected_sensor_types(hass, entry)
        boiler_enabled = entry.options.get("enable_boiler", False)

        from homeassistant.helpers import entity_registry as er

        entity_reg = er.async_get(hass)
        await _cleanup_renamed_sensors(
            entity_reg, entry, expected_sensor_types, boiler_enabled=boiler_enabled
        )
    except Exception as e:
        _LOGGER.error("Module-disable entity cleanup failed: %s", e, exc_info=True)

    inverter_sn = _resolve_box_id_and_store(hass, entry, coordinator)
    if inverter_sn is None:
        return

    # Main OIG Device

    # Analytics & Predictions Device (prefer definition from __init__.py for consistency)
    analytics_device_info = _get_analytics_device_info(hass, entry, inverter_sn)

    # ServiceShield Device

    _LOGGER.debug("Created device_info objects for box_id: %s", inverter_sn)

    # ================================================================
    # SECTION 0: DATA SOURCE STATE SENSOR (always on)
    # ================================================================
    core_sensors.extend(_register_data_source_sensor(hass, coordinator, entry))
    core_sensors.extend(_register_ai_status_sensor(hass, coordinator, entry))
    core_sensors.extend(_register_ai_eval_sensor(hass, coordinator, entry))

    await asyncio.sleep(0)

    # ================================================================
    # SECTION 1: BASIC DATA SENSORS (kategorie: "data")
    # ================================================================
    # Základní senzory s daty z API - vždy aktivní
    # Device: main_device_info (OIG Cloud {box_id})
    # Třída: OigCloudDataSensor
    # ================================================================
    core_sensors.extend(_create_basic_sensors(coordinator))
    await asyncio.sleep(0)

    # ================================================================
    # SECTION 2: COMPUTED SENSORS (kategorie: "computed")
    # ================================================================
    # Vypočítané hodnoty z existujících dat - vždy aktivní
    # Device: main_device_info (OIG Cloud {box_id})
    # Třída: OigCloudComputedSensor
    # ================================================================
    core_sensors.extend(_create_computed_sensors(coordinator))
    await asyncio.sleep(0)

    # ================================================================
    # SECTION 3: EXTENDED SENSORS (kategorie: "extended")
    # ================================================================
    # Rozšířené metriky - volitelné (enable_extended_sensors flag)
    # Device: main_device_info (OIG Cloud {box_id})
    # Třída: OigCloudDataSensor (s extended=True)
    # ================================================================
    deferred_factories.append(lambda: _create_extended_sensors(coordinator, entry))
    await asyncio.sleep(0)

    # ================================================================
    # SECTION 4: STATISTICS SENSORS (kategorie: "statistics")
    # ================================================================
    # Historická statistika - volitelné (enable_statistics flag)
    # Device: analytics_device_info (Analytics & Predictions {box_id})
    # Třída: OigCloudStatisticsSensor
    # ================================================================
    deferred_factories.append(
        lambda: _create_statistics_sensors(
            hass, coordinator, entry, analytics_device_info
        )
    )
    await asyncio.sleep(0)

    # ================================================================
    # SECTION 5: SOLAR FORECAST SENSORS (kategorie: "solar_forecast")
    # ================================================================
    # Solární předpovědi - volitelné (enable_solar_forecast flag)
    # Device: analytics_device_info (Analytics & Predictions {box_id})
    # Třída: OigCloudSolarForecastSensor
    # ================================================================
    deferred_factories.append(
        lambda: _create_solar_forecast_sensors(
            hass, coordinator, entry, analytics_device_info
        )
    )
    await asyncio.sleep(0)

    # ================================================================
    # SECTION 6: SERVICESHIELD SENSORS (kategorie: "shield")
    # ================================================================
    # ServiceShield monitoring - vždy aktivní (nativní součást)
    # Device: shield_device_info (ServiceShield {box_id})
    # Třída: OigCloudShieldSensor
    # ================================================================
    core_sensors.extend(_create_shield_sensors(coordinator))
    await asyncio.sleep(0)

    # ================================================================
    # SECTION 7: NOTIFICATION SENSORS (kategorie: "notification")
    # ================================================================
    # Systémové notifikace - vždy aktivní
    # Device: main_device_info (OIG Cloud {box_id})
    # Třída: OigCloudDataSensor (s notification=True)
    # ================================================================
    core_sensors.extend(_create_notification_sensors(coordinator))
    await asyncio.sleep(0)

    # ================================================================
    # SECTION 8: BATTERY PREDICTION SENSORS (kategorie: "battery_prediction")
    # ================================================================
    # Predikce baterie - volitelné (enable_battery_prediction flag)
    # Device: analytics_device_info (Analytics & Predictions {box_id})
    # Třída: OigCloudBatteryForecastSensor
    # ================================================================
    deferred_factories.append(
        lambda: _create_battery_prediction_sensors(
            hass, coordinator, entry, analytics_device_info
        )
    )
    await asyncio.sleep(0)

    # ================================================================
    # SECTION 9: PRICING & SPOT PRICE SENSORS (kategorie: "pricing")
    # ================================================================
    # Spotové ceny elektřiny - volitelné (enable_pricing flag)
    # Device: analytics_device_info (Analytics & Predictions {box_id})
    # Třídy: OigCloudAnalyticsSensor, SpotPrice15MinSensor, ExportPrice15MinSensor
    # ================================================================
    deferred_factories.append(
        lambda: _create_pricing_sensors(coordinator, entry, analytics_device_info)
    )
    await asyncio.sleep(0)

    # ================================================================
    # SECTION 9b: GRID COST / EARNINGS SENSORS (kategorie: "grid_cost_computed")
    # ================================================================
    # Per-phase grid cost and earnings — gated on enable_pricing AND
    # enable_battery_prediction both being True.
    # Device: analytics_device_info (Analytics & Predictions {box_id})
    # Třída: OigCloudComputedSensor (shared energy cache)
    # ================================================================
    deferred_factories.append(lambda: _create_grid_cost_sensors(coordinator, entry))
    await asyncio.sleep(0)

    # ================================================================
    # SECTION 10: ČHMÚ WEATHER WARNINGS (kategorie: "chmu_warnings")
    # ================================================================
    # Meteorologická varování ČHMÚ - volitelné (enable_chmu_warnings flag)
    # Device: analytics_device_info (Analytics & Predictions {box_id})
    # Třída: OigCloudChmuSensor
    # ================================================================
    deferred_factories.append(
        lambda: _create_chmu_sensors(coordinator, entry, analytics_device_info)
    )
    await asyncio.sleep(0)

    # ================================================================
    # SECTION 11: BOILER SENSORS (kategorie: "boiler")
    # ================================================================
    # Bojlerové senzory - volitelné (enable_boiler flag)
    # Device: OIG Bojler (samostatné zařízení)
    # Třída: BoilerSensor* (13 senzorů)
    # ================================================================
    deferred_factories.append(lambda: _create_boiler_sensors(hass, entry))

    # ================================================================
    # PERFORMANCE FIX: Register all sensors at once instead of 17 separate calls
    # ================================================================
    _register_all_sensors(async_add_entities, core_sensors)
    _schedule_deferred_sensor_registration(hass, async_add_entities, deferred_factories)

    _LOGGER.info("OIG Cloud sensor setup completed")


async def async_unload_entry(hass: HomeAssistant, config_entry: ConfigEntry) -> bool:
    """Unload a config entry and clean up empty devices."""
    try:
        # Zkontrolujeme, zda máme data pro tuto config entry
        if DOMAIN not in hass.data:
            _LOGGER.debug("Domain %s not found in hass.data during unload", DOMAIN)
            return True

        if config_entry.entry_id not in hass.data[DOMAIN]:
            _LOGGER.debug(
                "Config entry %s not found in domain data during unload",
                config_entry.entry_id,
            )
            return True

        domain_data = hass.data[DOMAIN][config_entry.entry_id]

        # Pokud máme coordinator, zastavíme ho
        if "coordinator" in domain_data:
            coordinator = domain_data["coordinator"]
            if hasattr(coordinator, "async_shutdown"):
                await coordinator.async_shutdown()
            _LOGGER.debug("Coordinator shut down for entry %s", config_entry.entry_id)

        # Vyčistíme data pro tuto config entry
        del hass.data[DOMAIN][config_entry.entry_id]

        # Pokud to byla poslední config entry, vyčistíme i domain
        if not hass.data[DOMAIN]:
            del hass.data[DOMAIN]

        _LOGGER.debug("Successfully unloaded config entry %s", config_entry.entry_id)
        return True
    except Exception as e:
        _LOGGER.error("Error unloading config entry %s: %s", config_entry.entry_id, e)
        return False


async def _cleanup_empty_devices(
    hass: HomeAssistant, config_entry: ConfigEntry
) -> None:
    """Clean up devices that have no entities, including service devices."""
    await asyncio.sleep(0)
    from homeassistant.helpers import device_registry as dr
    from homeassistant.helpers import entity_registry as er
    from homeassistant.helpers.device_registry import DeviceEntryType

    _LOGGER.info(
        "Starting cleanup of empty devices for config entry %s", config_entry.entry_id
    )

    device_reg = dr.async_get(hass)
    entity_reg = er.async_get(hass)

    # Najdeme všechna zařízení pro tuto config entry
    devices = dr.async_entries_for_config_entry(device_reg, config_entry.entry_id)
    _LOGGER.debug("Found %s devices for config entry", len(devices))

    removed_count = 0
    kept_count = 0

    for device in devices:
        # Najdeme všechny entity pro toto zařízení
        entities = er.async_entries_for_device(entity_reg, device.id)
        device_type = (
            "service" if device.entry_type == DeviceEntryType.SERVICE else "device"
        )

        _LOGGER.debug(
            "Checking %s: %s (ID: %s) - %s entities",
            device_type,
            device.name,
            device.id,
            len(entities),
        )

        # Pokud zařízení nemá žádné entity, smažeme ho
        if not entities:
            _LOGGER.warning(
                "Removing empty %s: %s (%s)", device_type, device.name, device.id
            )
            try:
                device_reg.async_remove_device(device.id)
                removed_count += 1
                _LOGGER.info(
                    "Successfully removed empty %s: %s", device_type, device.name
                )
            except Exception as e:
                _LOGGER.error("Failed to remove %s %s: %s", device_type, device.name, e)
        else:
            entity_names = [entity.entity_id for entity in entities]
            _LOGGER.debug(
                "Keeping %s %s with entities: %s",
                device_type,
                device.name,
                entity_names,
            )
            kept_count += 1

    _LOGGER.info(
        "Device cleanup completed: removed %s, kept %s devices",
        removed_count,
        kept_count,
    )


# ============================================================================
# DEPRECATED CLEANUP FUNCTIONS - Kept for reference, replaced by new system
# ============================================================================
# The following 3 functions have been replaced by:
#   - _cleanup_all_orphaned_entities()
#   - _cleanup_renamed_sensors()
#   - _cleanup_removed_devices()
#   - _cleanup_empty_devices_internal()
# ============================================================================
