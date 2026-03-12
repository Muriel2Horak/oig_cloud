"""The OIG Cloud integration."""

from __future__ import annotations

import asyncio
import hashlib
import logging
import re
from typing import Any, Dict

try:
    from homeassistant import config_entries, core
    from homeassistant.config_entries import ConfigEntry, ConfigEntryState
    from homeassistant.const import Platform
    from homeassistant.core import HomeAssistant
    from homeassistant.exceptions import ConfigEntryAuthFailed, ConfigEntryNotReady
    from homeassistant.helpers import config_validation as cv
except ModuleNotFoundError:  # pragma: no cover
    # Allow importing submodules (e.g., planner) outside a Home Assistant runtime.
    config_entries = None  # type: ignore[assignment]
    core = None  # type: ignore[assignment]
    ConfigEntry = Any  # type: ignore[misc,assignment]
    ConfigEntryState = Any  # type: ignore[misc,assignment]
    Platform = Any  # type: ignore[misc,assignment]
    HomeAssistant = Any  # type: ignore[misc,assignment]
    ConfigEntryNotReady = Exception  # type: ignore[assignment]
    ConfigEntryAuthFailed = Exception  # type: ignore[assignment]

    class _CvStub:  # pragma: no cover - only used outside HA
        @staticmethod
        def config_entry_only_config_schema(_domain: str) -> object:
            return object()

    cv = _CvStub()  # type: ignore[assignment]

try:
    from .lib.oig_cloud_client.api.oig_cloud_api import OigCloudApi, OigCloudAuthError
except ModuleNotFoundError:  # pragma: no cover
    # Allow importing submodules outside HA / without runtime deps.
    OigCloudApi = Any  # type: ignore[misc,assignment]
    OigCloudAuthError = Exception  # type: ignore[misc,assignment]
from .const import (
    CONF_AUTO_MODE_SWITCH,
    CONF_CHARGE_RATE_KW,
    CONF_EXTENDED_SCAN_INTERVAL,
    CONF_NO_TELEMETRY,
    CONF_PASSWORD,
    CONF_PLANNING_MIN_PERCENT,
    CONF_STANDARD_SCAN_INTERVAL,
    CONF_USERNAME,
    DEFAULT_CHARGE_RATE_KW,
    DEFAULT_PLANNING_MIN_PERCENT,
    DOMAIN,
)

try:
    from .core.coordinator import OigCloudCoordinator
    from .core.data_source import (
        DATA_SOURCE_CLOUD_ONLY,
        DEFAULT_DATA_SOURCE_MODE,
        DEFAULT_LOCAL_EVENT_DEBOUNCE_MS,
        DEFAULT_PROXY_STALE_MINUTES,
        DataSourceController,
        get_data_source_state,
        init_data_source_state,
    )
except ModuleNotFoundError:  # pragma: no cover
    OigCloudCoordinator = Any  # type: ignore[misc,assignment]
    DataSourceController = Any  # type: ignore[misc,assignment]
    DATA_SOURCE_CLOUD_ONLY = "cloud_only"
    DEFAULT_DATA_SOURCE_MODE = "cloud_only"
    DEFAULT_PROXY_STALE_MINUTES = 15
    DEFAULT_LOCAL_EVENT_DEBOUNCE_MS = 250

    def get_data_source_state(*_args: Any, **_kwargs: Any) -> Any:  # type: ignore[misc]
        return None

    def init_data_source_state(*_args: Any, **_kwargs: Any) -> Any:  # type: ignore[misc]
        return None


# OPRAVA: Bezpečný import BalancingManager s try/except
try:
    from .battery_forecast.balancing import BalancingManager

    _LOGGER_TEMP = logging.getLogger(__name__)
    _LOGGER_TEMP.debug("oig_cloud: BalancingManager import OK")
except Exception as err:
    BalancingManager = None
    _LOGGER_TEMP = logging.getLogger(__name__)
    _LOGGER_TEMP.error(
        "oig_cloud: Failed to import BalancingManager: %s", err, exc_info=True
    )

_LOGGER = logging.getLogger(__name__)

if config_entries is None:  # pragma: no cover
    PLATFORMS = []
else:
    PLATFORMS = [Platform.SENSOR, Platform.SWITCH]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

# OPRAVA: Definujeme všechny možné box modes pro konzistenci
ALL_BOX_MODES = ["Home 1", "Home 2", "Home 3", "Home UPS", "Home 5", "Home 6"]


def _read_manifest_file(path: str) -> str:
    with open(path, "r", encoding="utf-8") as handle:
        return handle.read()


def _ensure_data_source_option_defaults(
    hass: HomeAssistant, entry: ConfigEntry
) -> None:
    defaults = {
        "data_source_mode": DEFAULT_DATA_SOURCE_MODE,
        "local_proxy_stale_minutes": DEFAULT_PROXY_STALE_MINUTES,
        "local_event_debounce_ms": DEFAULT_LOCAL_EVENT_DEBOUNCE_MS,
    }

    options = dict(entry.options)
    updated = False
    for key, default in defaults.items():
        if options.get(key) is None:
            options[key] = default
            updated = True

    if updated:
        hass.config_entries.async_update_entry(entry, options=options)


def _infer_box_id_from_local_entities(hass: HomeAssistant) -> str | None:
    """Best-effort inference of box_id from existing oig_local entity_ids.

    Expected local entity_id pattern: sensor.oig_local_<box_id>_<suffix>
    """
    try:
        from homeassistant.helpers import entity_registry as er

        reg = er.async_get(hass)
        ids: set[str] = set()
        pat = re.compile(r"^sensor\\.oig_local_(\\d+)_")
        for ent in reg.entities.values():
            m = pat.match(ent.entity_id)
            if m:
                ids.add(m.group(1))
        if len(ids) == 1:
            return next(iter(ids))
        return None
    except Exception as err:
        _LOGGER.debug("Failed to infer local box_id: %s", err, exc_info=True)
        return None


def _get_planner_defaults() -> dict[str, Any]:
    """Return default planner options."""
    return {
        CONF_AUTO_MODE_SWITCH: False,
        "min_capacity_percent": DEFAULT_PLANNING_MIN_PERCENT,
        CONF_PLANNING_MIN_PERCENT: DEFAULT_PLANNING_MIN_PERCENT,
        "target_capacity_percent": 80.0,
        "disable_planning_min_guard": False,
        "max_ups_price_czk": 10.0,
        "price_hysteresis_czk": 0.01,
        "hw_min_hold_hours": 6.0,
        "home_charge_rate": DEFAULT_CHARGE_RATE_KW,
        CONF_CHARGE_RATE_KW: DEFAULT_CHARGE_RATE_KW,
        "cheap_window_percentile": 30,
    }


def _migrate_legacy_planner_options(options: dict[str, Any]) -> None:
    """Migrate legacy planner options to new format."""
    if options.get(CONF_PLANNING_MIN_PERCENT) is None:
        legacy_min = options.get("min_capacity_percent")
        options[CONF_PLANNING_MIN_PERCENT] = (
            legacy_min if isinstance(legacy_min, (int, float)) else DEFAULT_PLANNING_MIN_PERCENT
        )
    if options.get(CONF_CHARGE_RATE_KW) is None:
        legacy_rate = options.get("home_charge_rate")
        options[CONF_CHARGE_RATE_KW] = (
            legacy_rate if isinstance(legacy_rate, (int, float)) else DEFAULT_CHARGE_RATE_KW
        )

    if "max_price_conf" in options and "max_ups_price_czk" not in options:
        try:
            options["max_ups_price_czk"] = float(options.get("max_price_conf", 10.0))
        except (TypeError, ValueError) as err:
            _LOGGER.debug("Planner option conversion failed: %s", err, exc_info=True)
            options["max_ups_price_czk"] = 10.0
        options.pop("max_price_conf", None)


def _purge_obsolete_planner_options(options: dict[str, Any]) -> list[str]:
    """Remove obsolete planner options and return list of removed keys."""
    obsolete_keys = {
        "enable_cheap_window_ups",
        "cheap_window_max_intervals",
        "cheap_window_soc_guard_kwh",
        "enable_economic_charging",
        "min_savings_margin",
        "safety_margin_percent",
        "percentile_conf",
    }
    removed = [k for k in options if k in obsolete_keys]
    for k in removed:
        options.pop(k, None)
    return removed


def _apply_planner_defaults(entry: ConfigEntry, options: dict[str, Any], defaults: dict[str, Any]) -> tuple[bool, list[str]]:
    """Apply default values to missing options. Returns (updated, missing_keys)."""
    missing_keys = [key for key in defaults.keys() if entry.options.get(key) is None]
    updated = False
    for key, default in defaults.items():
        if options.get(key) is None:
            options[key] = default
            updated = True
    return updated, missing_keys


def _ensure_planner_option_defaults(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Ensure planner-related options exist on legacy config entries."""
    defaults = _get_planner_defaults()
    options = dict(entry.options)

    _migrate_legacy_planner_options(options)
    removed = _purge_obsolete_planner_options(options)
    updated, missing_keys = _apply_planner_defaults(entry, options, defaults)

    if updated or removed:
        _LOGGER.info(
            "🔧 Injecting missing planner options for entry %s: %s",
            entry.entry_id,
            ", ".join(missing_keys) if missing_keys else "none",
        )
        hass.config_entries.async_update_entry(entry, options=options)


async def async_setup(hass: HomeAssistant, config: Dict[str, Any]) -> bool:
    """Set up OIG Cloud integration."""
    _ = config
    _LOGGER.debug("OIG Cloud setup: starting")

    # OPRAVA: Odstraníme neexistující import setup_telemetry
    # Initialize telemetry - telemetrie se inicializuje přímo v ServiceShield
    _LOGGER.debug("OIG Cloud setup: telemetry will be initialized in ServiceShield")

    # OPRAVA: ServiceShield se inicializuje pouze v async_setup_entry, ne zde
    # V async_setup pouze připravíme globální strukturu
    hass.data.setdefault(DOMAIN, {})
    _LOGGER.debug("OIG Cloud setup: global data structure prepared")

    # OPRAVA: Univerzální registrace statických cest pro všechny verze HA
    await _register_static_paths(hass)

    # OPRAVA: Odstranění volání _setup_frontend_panel z async_setup
    # Panel se registruje až v async_setup_entry kde máme přístup k entry
    # await _setup_frontend_panel(hass)  # ODSTRANĚNO

    _LOGGER.debug("OIG Cloud setup: completed")
    return True


async def _register_static_paths(hass: HomeAssistant) -> None:
    """Registrace statických cest pro HA 2024.5+."""
    from homeassistant.components.http import StaticPathConfig

    # V1 static path
    v1_path = "/oig_cloud_static"
    v1_dir = hass.config.path("custom_components/oig_cloud/www")

    # V2 static path - keep same path name, just ensure it points to dist/
    v2_path = "/oig_cloud_static_v2"
    v2_dir = hass.config.path("custom_components/oig_cloud/www_v2/dist")

    _LOGGER.info("Registering static paths:")
    _LOGGER.info("  V1: %s -> %s", v1_path, v1_dir)
    _LOGGER.info("  V2: %s -> %s", v2_path, v2_dir)

    paths = [StaticPathConfig(v1_path, v1_dir, cache_headers=False)]

    # Add V2 if dist directory exists
    import os
    if os.path.isdir(v2_dir):
        paths.append(StaticPathConfig(v2_path, v2_dir, cache_headers=False))
        _LOGGER.info("  V2 dist found, registering")
    else:
        _LOGGER.warning("  V2 dist not found: %s", v2_dir)

    await hass.http.async_register_static_paths(paths)
    _LOGGER.info("✅ Static paths registered successfully")


def _resolve_inverter_sn(hass: HomeAssistant, entry: ConfigEntry) -> str | None:
    inverter_sn = None
    opt_box = entry.options.get("box_id")
    if isinstance(opt_box, str) and opt_box.isdigit():
        return opt_box

    coordinator_data = (
        hass.data.get(DOMAIN, {}).get(entry.entry_id, {}).get("coordinator")
    )
    if not coordinator_data:
        return None

    try:
        from .entities.base_sensor import resolve_box_id

        resolved = resolve_box_id(coordinator_data)
        if isinstance(resolved, str) and resolved.isdigit():
            inverter_sn = resolved
    except Exception as err:
        _LOGGER.debug("Failed to resolve inverter_sn: %s", err, exc_info=True)
        return None
    return inverter_sn


def _panel_title_for_inverter(inverter_sn: str) -> str:
    return (
        f"OIG Dashboard ({inverter_sn})"
        if inverter_sn != "unknown"
        else "OIG Cloud Dashboard"
    )


async def _load_manifest_version(hass: HomeAssistant) -> str:
    import json
    import os

    manifest_path = os.path.join(os.path.dirname(__file__), "manifest.json")
    try:
        manifest_data = await hass.async_add_executor_job(
            _read_manifest_file, manifest_path
        )
        manifest = json.loads(manifest_data)
        return manifest.get("version", "unknown")
    except Exception as exc:
        _LOGGER.warning("Could not load version from manifest: %s", exc)
        return "unknown"


def _build_dashboard_url(
    entry_id: str, inverter_sn: str, version: str, cache_bust: int
) -> str:
    return (
        "/oig_cloud_static/dashboard.html"
        f"?entry_id={entry_id}&inverter_sn={inverter_sn}&v={version}&t={cache_bust}"
    )


def _remove_existing_panel(hass: HomeAssistant, panel_id: str) -> None:
    from homeassistant.components import frontend

    if not hasattr(frontend, "async_remove_panel") or not callable(
        getattr(frontend, "async_remove_panel")
    ):
        return

    try:
        frontend.async_remove_panel(hass, panel_id, warn_if_unknown=False)
    except Exception as err:
        try:
            frontend.async_remove_panel(hass, panel_id)
        except Exception as fallback_err:
            _LOGGER.debug(
                "Failed to remove panel %s: %s (fallback: %s)",
                panel_id,
                err,
                fallback_err,
            )


def _register_frontend_panel(
    hass: HomeAssistant, panel_id: str, panel_title: str, dashboard_url: str
) -> None:
    from homeassistant.components import frontend

    if not hasattr(frontend, "async_register_built_in_panel"):
        _LOGGER.warning("Frontend async_register_built_in_panel not available")
        return

    register_func = getattr(frontend, "async_register_built_in_panel")
    if not callable(register_func):
        _LOGGER.warning("async_register_built_in_panel is not callable")
        return

    result = register_func(
        hass,
        "iframe",
        sidebar_title=panel_title,
        sidebar_icon="mdi:solar-power",
        frontend_url_path=panel_id,
        config={"url": dashboard_url},
        require_admin=False,
    )

    if hasattr(result, "__await__"):
        hass.async_create_task(result)

    _LOGGER.info("✅ Panel '%s' registered successfully", panel_title)


def _log_dashboard_entities(
    hass: HomeAssistant, entry: ConfigEntry, inverter_sn: str
) -> None:
    coordinator = hass.data[DOMAIN][entry.entry_id].get("coordinator")
    if not coordinator or not coordinator.data:
        _LOGGER.warning("Dashboard: No coordinator data for entity checking")
        return

    entity_count = len(
        [
            k
            for k in hass.states.async_entity_ids()
            if k.startswith(f"sensor.oig_{inverter_sn}")
        ]
    )
    _LOGGER.info(
        "Dashboard: Found %s OIG entities for inverter %s",
        entity_count,
        inverter_sn,
    )

    key_entities = [
        f"sensor.oig_{inverter_sn}_remaining_usable_capacity",
    ]
    if entry.options.get("enable_solar_forecast", False):
        key_entities.append(f"sensor.oig_{inverter_sn}_solar_forecast")
    if entry.options.get("enable_battery_prediction", False):
        key_entities.append(f"sensor.oig_{inverter_sn}_battery_forecast")

    for entity_id in key_entities:
        entity_state = hass.states.get(entity_id)
        if entity_state:
            _LOGGER.debug(
                "Dashboard entity check: %s = %s", entity_id, entity_state.state
            )
        else:
            _LOGGER.debug("Dashboard entity not yet available: %s", entity_id)


async def _setup_frontend_panel(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Nastavení frontend panelu (pouze když je povolen)."""
    try:
        # Unikátní ID panelu pro tuto instanci
        panel_id = f"oig_cloud_dashboard_{entry.entry_id}"

        # OPRAVA: inverter_sn musí být numerické box_id (nikdy ne helper klíče jako "spot_prices")
        inverter_sn = _resolve_inverter_sn(hass, entry)

        if inverter_sn is None:
            inverter_sn = "unknown"
            _LOGGER.warning(
                "Dashboard setup: Unable to resolve numeric inverter_sn/box_id, using 'unknown'"
            )
        else:
            _LOGGER.info("Dashboard setup: Using inverter_sn = %s", inverter_sn)

        panel_title = _panel_title_for_inverter(inverter_sn)

        # Cache-busting: Přidat verzi + timestamp k URL pro vymazání browseru cache
        import time

        version = await _load_manifest_version(hass)

        # Přidat timestamp pro cache-busting při každém restartu
        cache_bust = int(time.time())

        # OPRAVA: Přidat parametry včetně v= a t= pro cache-busting
        dashboard_url = _build_dashboard_url(
            entry.entry_id, inverter_sn, version, cache_bust
        )

        _LOGGER.info("Dashboard URL: %s", dashboard_url)

        # Prevent reload errors ("Overwriting panel ...") by removing any existing panel first.
        _remove_existing_panel(hass, panel_id)
        _register_frontend_panel(hass, panel_id, panel_title, dashboard_url)

        # Register V2 panel (parallel run)
        v2_panel_id = f"{panel_id}_v2"
        v2_panel_title = f"{panel_title} V2 (BETA)"
        # Use same path as before but with cache busting params
        v2_dashboard_url = f"/oig_cloud_static_v2/index.html?v={version}&t={cache_bust}&sn={inverter_sn}&entry_id={entry.entry_id}"
        _remove_existing_panel(hass, v2_panel_id)
        _register_frontend_panel(hass, v2_panel_id, v2_panel_title, v2_dashboard_url)
        _LOGGER.info("V2 Panel URL: %s", v2_dashboard_url)

        _log_dashboard_entities(hass, entry, inverter_sn)

    except Exception as e:
        _LOGGER.error("Failed to setup frontend panel: %s", e)


async def _remove_frontend_panel(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Odebrání frontend panelu."""
    await asyncio.sleep(0)
    try:
        panel_id = f"oig_cloud_dashboard_{entry.entry_id}"

        from homeassistant.components import frontend

        # Pokus o odebrání panelu
        if hasattr(frontend, "async_remove_panel") and callable(
            getattr(frontend, "async_remove_panel")
        ):
            try:
                frontend.async_remove_panel(hass, panel_id, warn_if_unknown=False)
                _LOGGER.info("✅ Panel removed: %s", panel_id)
            except ValueError as ve:
                if "unknown panel" in str(ve).lower():
                    _LOGGER.debug(
                        "Panel %s was already removed or never existed", panel_id
                    )
                else:
                    _LOGGER.warning("Error removing panel %s: %s", panel_id, ve)
            except Exception as remove_err:
                try:
                    frontend.async_remove_panel(hass, panel_id)
                except Exception:
                    _LOGGER.debug(
                        "Panel removal handled (panel may not exist): %s", remove_err
                    )
        else:
            _LOGGER.debug("async_remove_panel not available")

    except Exception as e:
        # OPRAVA: Všechny chyby logujeme jako debug, protože jsou očekávané
        _LOGGER.debug("Panel removal handled gracefully: %s", e)


def _is_boiler_unique_id(unique_id: str) -> bool:
    return "_boiler_" in unique_id


def _migrate_boiler_entities(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Deprecated: no boiler entity migration (OIG Box sensors stay in base module)."""
    pass


def _maybe_rename_entity_id(
    entity_registry: Any,
    entity_id: str,
    unique_id: str,
    duplicate_pattern: re.Pattern[str],
) -> tuple[str, bool]:
    entity_id_match = duplicate_pattern.match(entity_id)
    if not entity_id_match:
        return entity_id, False

    suffix = entity_id_match.group(2)
    base_entity_id = entity_id_match.group(1)

    if unique_id.endswith(suffix):
        return entity_id, False

    try:
        entity_registry.async_update_entity(entity_id, new_entity_id=base_entity_id)
        _LOGGER.info("🔄 Renamed entity: %s -> %s", entity_id, base_entity_id)
        return base_entity_id, True
    except Exception as err:
        _LOGGER.warning("⚠️ Failed to rename %s: %s", entity_id, err)
        return entity_id, False


def _maybe_enable_entity(entity_registry: Any, entity_id: str, entity: Any) -> bool:
    from homeassistant.helpers import entity_registry as er

    if entity.disabled_by != er.RegistryEntryDisabler.INTEGRATION:
        return False

    try:
        entity_registry.async_update_entity(entity_id, disabled_by=None)
        _LOGGER.info("✅ Re-enabled correct entity: %s", entity_id)
        return True
    except Exception as err:
        _LOGGER.warning("⚠️ Failed to enable %s: %s", entity_id, err)
        return False


def _is_duplicate_entity(
    entity_id: str, unique_id: str, duplicate_pattern: re.Pattern[str]
) -> bool:
    entity_id_match = duplicate_pattern.match(entity_id)
    if not entity_id_match:
        return False

    suffix = entity_id_match.group(2)
    return not unique_id.endswith(suffix)


def _build_new_unique_id(old_unique_id: str) -> str:
    if old_unique_id.startswith("oig_") and not old_unique_id.startswith(
        "oig_cloud_"
    ):
        return f"oig_cloud_{old_unique_id[4:]}"
    return f"oig_cloud_{old_unique_id}"


def _process_entity_unique_id(
    entity_registry: Any,
    entity: Any,
    duplicate_pattern: re.Pattern[str],
) -> dict[str, int]:
    old_unique_id = entity.unique_id
    entity_id = entity.entity_id

    if _is_boiler_unique_id(old_unique_id):
        _LOGGER.debug("Skipping boiler sensor (correct format): %s", entity_id)
        return {"skipped": 1}

    if old_unique_id.startswith("oig_cloud_"):
        updated_entity_id, renamed = _maybe_rename_entity_id(
            entity_registry, entity_id, old_unique_id, duplicate_pattern
        )
        enabled = _maybe_enable_entity(entity_registry, updated_entity_id, entity)
        return {
            "skipped": 1,
            "renamed": int(renamed),
            "enabled": int(enabled),
        }

    if _is_duplicate_entity(entity_id, old_unique_id, duplicate_pattern):
        try:
            entity_registry.async_remove(entity_id)
            _LOGGER.info(
                "🗑️ Removed duplicate entity: %s (unique_id=%s doesn't match entity_id suffix)",
                entity_id,
                old_unique_id,
            )
            return {"removed": 1}
        except Exception as err:
            _LOGGER.warning("⚠️ Failed to remove %s: %s", entity_id, err)
            return {}

    new_unique_id = _build_new_unique_id(old_unique_id)
    try:
        entity_registry.async_update_entity(entity_id, new_unique_id=new_unique_id)
        _LOGGER.info(
            "✅ Migrated entity %s: %s -> %s",
            entity_id,
            old_unique_id,
            new_unique_id,
        )
        return {"migrated": 1}
    except Exception as err:
        _LOGGER.warning("⚠️ Failed to migrate %s: %s", entity_id, err)
        return {}


def _apply_migration_deltas(counts: dict[str, int], deltas: dict[str, int]) -> None:
    for key, value in deltas.items():
        counts[key] = counts.get(key, 0) + value


def _build_migration_notification(
    renamed_count: int,
    removed_count: int,
    migrated_count: int,
    enabled_count: int,
) -> str:
    message_parts: list[str] = []

    if renamed_count > 0:
        message_parts.append(
            f"**Přejmenováno {renamed_count} entit**\n"
            "Entity s příponami (_2, _3) byly přejmenovány na správné názvy.\n\n"
        )

    if removed_count > 0:
        message_parts.append(
            f"**Odstraněno {removed_count} duplicitních entit**\n"
            "Byly to staré kolize s nesprávným unique_id.\n\n"
        )

    if migrated_count > 0:
        message_parts.append(
            f"**Migrováno {migrated_count} entit na nový formát unique_id**\n"
            "Všechny OIG entity nyní používají standardní formát `oig_cloud_*`.\n\n"
        )

    if enabled_count > 0:
        message_parts.append(
            f"**Povoleno {enabled_count} správných entit**\n"
            "Entity s novým formátem byly znovu aktivovány.\n\n"
        )

    message_parts.append(
        "**Co se stalo:**\n"
        "- Staré entity se přeregistrovaly s novým unique_id\n"
        "- Duplicity byly odstraněny\n"
        "- Všechny entity by měly fungovat normálně\n\n"
        "**Pokud něco nefunguje:**\n"
        "Reload integrace v Nastavení → Zařízení & Služby → OIG Cloud\n\n"
        "Toto je jednorázová migrace po aktualizaci integrace."
    )

    return "".join(message_parts)


def _strip_known_suffixes(value: str) -> str:
    for suffix in ("_analytics", "_shield"):
        if value.endswith(suffix):
            return value[: -len(suffix)]
    return value


def _extract_device_bases(device: Any) -> set[str]:
    id_values = [
        identifier[1]
        for identifier in device.identifiers
        if identifier and identifier[0] == DOMAIN and len(identifier) > 1
    ]
    return {
        _strip_known_suffixes(v) for v in id_values if isinstance(v, str) and v
    }


def _device_has_entities(entity_registry: Any, device_id: str) -> bool:
    from homeassistant.helpers import entity_registry as er

    return bool(er.async_entries_for_device(entity_registry, device_id))


def _is_valid_device_base(bases: set[str], allowlisted_bases: set[str]) -> bool:
    if not bases:
        return True
    if any(base in allowlisted_bases for base in bases):
        return True
    return all(base.isdigit() for base in bases)


async def _migrate_entity_unique_ids(
    hass: HomeAssistant, entry: ConfigEntry
) -> None:  # noqa: C901
    """Migrace unique_id a cleanup duplicitních entit s _2, _3, atd."""
    _LOGGER.info("🔍 Starting _migrate_entity_unique_ids function...")
    from homeassistant.helpers import entity_registry as er

    entity_registry = er.async_get(hass)

    # Najdeme všechny OIG entity pro tento config entry
    entities = er.async_entries_for_config_entry(entity_registry, entry.entry_id)
    _LOGGER.info("📊 Found %s entities for config entry", len(entities))

    counts: dict[str, int] = {
        "migrated": 0,
        "skipped": 0,
        "removed": 0,
        "enabled": 0,
        "renamed": 0,
    }
    duplicate_pattern = re.compile(r"^(.+?)(_\d+)$")

    # Projdeme všechny entity a upravíme je
    for entity in entities:
        deltas = _process_entity_unique_id(entity_registry, entity, duplicate_pattern)
        _apply_migration_deltas(counts, deltas)

    # Summary
    _LOGGER.info(
        "📊 Migration summary: migrated=%s, removed=%s, renamed=%s, enabled=%s, skipped=%s",
        counts["migrated"],
        counts["removed"],
        counts["renamed"],
        counts["enabled"],
        counts["skipped"],
    )

    if counts["removed"] > 0 or counts["migrated"] > 0 or counts["renamed"] > 0:
        await hass.services.async_call(
            "persistent_notification",
            "create",
            {
                "title": "OIG Cloud: Migrace entit dokončena",
                "message": _build_migration_notification(
                    counts["renamed"],
                    counts["removed"],
                    counts["migrated"],
                    counts["enabled"],
                ),
                "notification_id": "oig_cloud_migration_complete",
            },
        )

    if counts["renamed"] > 0:
        _LOGGER.info("🔄 Renamed %s entities to correct entity_id", counts["renamed"])
    if counts["migrated"] > 0:
        _LOGGER.info(
            "🔄 Migrated %s entities to new unique_id format", counts["migrated"]
        )
    if counts["removed"] > 0:
        _LOGGER.warning("🗑️ Removed %s duplicate entities", counts["removed"])
    if counts["enabled"] > 0:
        _LOGGER.info("✅ Re-enabled %s correct entities", counts["enabled"])
    if counts["skipped"] > 0:
        _LOGGER.debug(
            "⏭️ Skipped %s entities (already in correct format)", counts["skipped"]
        )


async def _cleanup_invalid_empty_devices(
    hass: HomeAssistant, entry: ConfigEntry
) -> None:
    """Remove clearly-invalid devices (e.g., 'spot_prices', 'unknown') with no entities.

    This is a targeted/safe cleanup to get rid of stale registry entries created by
    older versions when box_id resolution was unstable.
    """
    await asyncio.sleep(0)
    try:
        from homeassistant.helpers import device_registry as dr

        device_registry = dr.async_get(hass)
        from homeassistant.helpers import entity_registry as er

        entity_registry = er.async_get(hass)

        # Non-numeric identifiers used by this integration that are still valid.
        allowlisted_bases = {"oig_bojler", "boiler"}

        devices = dr.async_entries_for_config_entry(device_registry, entry.entry_id)
        removed: list[str] = []

        for device in devices:
            # Never remove devices that still have entities.
            if _device_has_entities(entity_registry, device.id):
                continue

            bases = _extract_device_bases(device)
            if _is_valid_device_base(bases, allowlisted_bases):
                continue

            device_registry.async_remove_device(device.id)
            removed.append(device.name or device.id)

        if removed:
            _LOGGER.info(
                "Removed %d stale OIG devices without entities: %s",
                len(removed),
                ", ".join(removed),
            )
    except Exception as err:
        _LOGGER.debug("Device registry cleanup failed (non-critical): %s", err)


def _migrate_enable_spot_prices_option(hass: HomeAssistant, entry: ConfigEntry) -> None:
    if "enable_spot_prices" not in entry.options:
        return

    _LOGGER.info("🔄 Migrating enable_spot_prices to enable_pricing")
    new_options = dict(entry.options)
    if new_options.get("enable_spot_prices", False):
        new_options["enable_pricing"] = True
        _LOGGER.info("✅ Migrated: enable_spot_prices=True -> enable_pricing=True")
    new_options.pop("enable_spot_prices", None)
    hass.config_entries.async_update_entry(entry, options=new_options)
    _LOGGER.info("✅ Migration completed - enable_spot_prices removed from config")


def _init_entry_storage(hass: HomeAssistant, entry: ConfigEntry) -> None:
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN].setdefault(entry.entry_id, {})


def _maybe_persist_box_id_from_proxy_or_local(
    hass: HomeAssistant, entry: ConfigEntry
) -> None:
    try:
        options = dict(entry.options)
        if options.get("box_id"):
            return

        proxy_box = hass.states.get(
            "sensor.oig_local_oig_proxy_proxy_status_box_device_id"
        )
        if proxy_box and isinstance(proxy_box.state, str) and proxy_box.state.isdigit():
            options["box_id"] = proxy_box.state
            hass.config_entries.async_update_entry(entry, options=options)
            _LOGGER.info("Inferred box_id=%s from proxy sensor", proxy_box.state)
            return

        inferred = _infer_box_id_from_local_entities(hass)
        if inferred:
            options["box_id"] = inferred
            hass.config_entries.async_update_entry(entry, options=options)
            _LOGGER.info("Inferred box_id=%s from local entities", inferred)
    except Exception as err:
        _LOGGER.debug(
            "Inferring box_id from local entities failed (non-critical): %s", err
        )


async def _start_service_shield(
    hass: HomeAssistant, entry: ConfigEntry
) -> Any | None:
    service_shield = None
    try:
        from .shield.core import ServiceShield

        service_shield = ServiceShield(hass, entry)
        await service_shield.start()
        _LOGGER.info("ServiceShield inicializován a spuštěn")
    except Exception as err:
        _LOGGER.error("ServiceShield není dostupný - obecná chyba: %s", err)
        service_shield = None

    hass.data[DOMAIN][entry.entry_id]["service_shield"] = service_shield
    return service_shield


def _migrate_legacy_credentials_from_options(
    hass: HomeAssistant, entry: ConfigEntry
) -> None:
    updated_data = dict(entry.data)
    changed = False

    if not updated_data.get(CONF_USERNAME):
        legacy_username = entry.options.get(CONF_USERNAME)
        if isinstance(legacy_username, str) and legacy_username.strip():
            updated_data[CONF_USERNAME] = legacy_username
            changed = True

    if not updated_data.get(CONF_PASSWORD):
        legacy_password = entry.options.get(CONF_PASSWORD)
        if isinstance(legacy_password, str) and legacy_password:
            updated_data[CONF_PASSWORD] = legacy_password
            changed = True

    if changed:
        hass.config_entries.async_update_entry(entry, data=updated_data)
        _LOGGER.info("Migrated legacy credentials from options to entry.data")


def _load_entry_auth_config(
    entry: ConfigEntry,
) -> tuple[str | None, str | None, bool, int, int]:
    username = entry.data.get(CONF_USERNAME) or entry.options.get(CONF_USERNAME)
    password = entry.data.get(CONF_PASSWORD) or entry.options.get(CONF_PASSWORD)

    _LOGGER.debug("Username: %s", "***" if username else "MISSING")
    _LOGGER.debug("Password: %s", "***" if password else "MISSING")

    no_telemetry = entry.data.get(CONF_NO_TELEMETRY, False) or entry.options.get(
        CONF_NO_TELEMETRY, False
    )
    standard_scan_interval = entry.options.get("standard_scan_interval") or entry.data.get(
        CONF_STANDARD_SCAN_INTERVAL, 30
    )
    extended_scan_interval = entry.options.get("extended_scan_interval") or entry.data.get(
        CONF_EXTENDED_SCAN_INTERVAL, 300
    )
    _LOGGER.debug(
        "Using intervals: standard=%ss, extended=%ss",
        standard_scan_interval,
        extended_scan_interval,
    )
    return (
        username,
        password,
        no_telemetry,
        standard_scan_interval,
        extended_scan_interval,
    )


async def _ensure_live_data_enabled(
    oig_api: OigCloudApi,
) -> None:
    _LOGGER.debug("Kontrola, zda jsou v aplikaci OIG Cloud zapnutá 'Živá data'...")
    try:
        test_stats = await oig_api.get_stats()
        if test_stats:
            first_device = next(iter(test_stats.values())) if test_stats else None
            if not first_device or "actual" not in first_device:
                _LOGGER.error(
                    "❌ KRITICKÁ CHYBA: V aplikaci OIG Cloud nejsou zapnutá 'Živá data'! "
                    "API odpověď neobsahuje element 'actual'. "
                    "Uživatel musí v mobilní aplikaci zapnout: Nastavení → Přístup k datům → Živá data"
                )
                raise ConfigEntryNotReady(
                    "V aplikaci OIG Cloud nejsou zapnutá 'Živá data'. "
                    "Zapněte je v mobilní aplikaci OIG Cloud (Nastavení → Přístup k datům → Živá data) "
                    "a restartujte Home Assistant."
                )
            _LOGGER.info(
                "✅ Kontrola živých dat úspěšná - element 'actual' nalezen v API odpovědi"
            )
        else:
            _LOGGER.warning(
                "API vrátilo prázdnou odpověď, přeskakuji kontrolu živých dat"
            )
    except ConfigEntryNotReady:
        raise
    except Exception as err:
        _LOGGER.warning("Nelze ověřit stav živých dat: %s", err)


async def _init_session_manager_and_coordinator(
    hass: HomeAssistant,
    entry: ConfigEntry,
    username: str,
    password: str,
    no_telemetry: bool,
    standard_scan_interval: int,
    extended_scan_interval: int,
) -> tuple[OigCloudCoordinator, Any]:
    oig_api = OigCloudApi(username, password, no_telemetry)

    from .api.oig_cloud_session_manager import OigCloudSessionManager

    session_manager = OigCloudSessionManager(oig_api)

    state = get_data_source_state(hass, entry.entry_id)
    should_check_cloud_now = state.effective_mode == DATA_SOURCE_CLOUD_ONLY
    if should_check_cloud_now:
        _LOGGER.debug("Initial authentication via session manager")
        await session_manager._ensure_auth()
        await _ensure_live_data_enabled(oig_api)
    else:
        _LOGGER.info(
            "Local telemetry mode active (configured=%s, local_ok=%s) – skipping initial cloud authentication and live-data check",
            state.configured_mode,
            state.local_available,
        )

    coordinator = OigCloudCoordinator(
        hass, session_manager, standard_scan_interval, extended_scan_interval, entry
    )
    _LOGGER.debug("Waiting for initial coordinator data...")
    entry_state = getattr(entry, "state", None)
    if entry_state == ConfigEntryState.SETUP_IN_PROGRESS:
        await coordinator.async_config_entry_first_refresh()
    elif hasattr(coordinator, "async_refresh"):
        await coordinator.async_refresh()
    else:
        await coordinator.async_config_entry_first_refresh()
    if coordinator.data is None:
        _LOGGER.error("Failed to get initial data from coordinator")
        raise ConfigEntryNotReady("No data received from OIG Cloud API")
    _LOGGER.debug("Coordinator data received: %s devices", len(coordinator.data))

    try:
        options = dict(entry.options)
        if not options.get("box_id") and coordinator.data:
            box_id = next(
                (str(k) for k in coordinator.data.keys() if str(k).isdigit()),
                None,
            )
            if box_id:
                options["box_id"] = box_id
                hass.config_entries.async_update_entry(entry, options=options)
                _LOGGER.info("Persisted box_id=%s into config entry options", box_id)
    except Exception as err:
        _LOGGER.debug("Persisting box_id failed (non-critical): %s", err)

    return coordinator, session_manager


def _resolve_entry_box_id(entry: ConfigEntry, coordinator: OigCloudCoordinator | None) -> str | None:
    try:
        opt_box = entry.options.get("box_id")
        if isinstance(opt_box, str) and opt_box.isdigit():
            return opt_box
    except Exception:
        pass

    if coordinator and coordinator.data and isinstance(coordinator.data, dict):
        return next(
            (str(k) for k in coordinator.data.keys() if str(k).isdigit()),
            None,
        )
    return None


async def _init_notification_manager(
    hass: HomeAssistant,
    entry: ConfigEntry,
    coordinator: OigCloudCoordinator,
    session_manager: Any,
    service_shield: Any,
) -> Any | None:
    enable_cloud_notifications = entry.options.get("enable_cloud_notifications", True)
    cloud_active = (
        get_data_source_state(hass, entry.entry_id).effective_mode
        == DATA_SOURCE_CLOUD_ONLY
    )
    if not enable_cloud_notifications or not cloud_active:
        _LOGGER.debug(
            "Cloud notifications disabled or cloud not active - skipping notification manager"
        )
        return None

    try:
        _LOGGER.debug("Initializing notification manager...")
        from .core.oig_cloud_notification import OigNotificationManager

        _LOGGER.debug("Using API object: %s", type(session_manager.api))
        _LOGGER.debug(
            "API has get_notifications: %s",
            hasattr(session_manager.api, "get_notifications"),
        )

        manager = OigNotificationManager(
            hass, session_manager.api, "https://portal.oigpower.cz/"
        )

        device_id = _resolve_entry_box_id(entry, coordinator)
        if not device_id:
            _LOGGER.warning(
                "No device data available, notification manager not initialized"
            )
            return None

        manager.set_device_id(device_id)
        _LOGGER.debug("Set notification manager device_id to: %s", device_id)

        if service_shield:
            try:
                from .shield.core import ModeTransitionTracker

                service_shield.mode_tracker = ModeTransitionTracker(hass, device_id)
                await service_shield.mode_tracker.async_setup()
                _LOGGER.info(
                    "Mode Transition Tracker inicializován pro box %s", device_id
                )
            except Exception as tracker_error:
                _LOGGER.warning(
                    "Failed to initialize Mode Transition Tracker: %s", tracker_error
                )

        try:
            await manager.update_from_api()
            _LOGGER.debug("Initial notification data loaded successfully")
        except Exception as fetch_error:
            _LOGGER.warning(
                "Failed to fetch initial notifications (API endpoint may not exist): %s",
                fetch_error,
            )

        coordinator.notification_manager = manager
        _LOGGER.info(
            "Notification manager created and attached to coordinator (may not have data yet)"
        )
        return manager
    except Exception as err:
        _LOGGER.warning(
            "Failed to setup notification manager (API may not be available): %s", err
        )
        return None


def _init_solar_forecast(entry: ConfigEntry) -> Any | None:
    if not entry.options.get("enable_solar_forecast", False):
        return None

    try:
        _LOGGER.debug("Initializing solar forecast functionality")
        return {"enabled": True, "config": entry.options}
    except Exception as err:
        _LOGGER.error("Chyba při inicializaci solární předpovědi: %s", err)
        return {"enabled": False, "error": str(err)}


def _build_analytics_device_info(
    entry: ConfigEntry, coordinator: OigCloudCoordinator
) -> Dict[str, Any]:
    try:
        from .entities.base_sensor import resolve_box_id

        box_id_for_devices = resolve_box_id(coordinator)
    except Exception:
        box_id_for_devices = entry.options.get("box_id")
    if not (isinstance(box_id_for_devices, str) and box_id_for_devices.isdigit()):
        box_id_for_devices = "unknown"

    return {
        "identifiers": {(DOMAIN, f"{box_id_for_devices}_analytics")},
        "name": f"Analytics & Predictions {box_id_for_devices}",
        "manufacturer": "OIG",
        "model": "Analytics Module",
        "via_device": (DOMAIN, box_id_for_devices),
        "entry_type": "service",
    }


def _init_ote_api(entry: ConfigEntry) -> Any | None:
    if not entry.options.get("enable_pricing", False):
        _LOGGER.debug("Pricing disabled - skipping OTE API initialization")
        return None

    try:
        _LOGGER.debug("Initializing OTE API for spot prices")
        from .api.ote_api import OteApi

        ote_api = OteApi()
        _LOGGER.info("OTE API successfully initialized")
        return ote_api
    except Exception as err:
        _LOGGER.error("Failed to initialize OTE API: %s", err)
        return None


async def _init_boiler_coordinator(
    hass: HomeAssistant, entry: ConfigEntry
) -> Any | None:
    if not entry.options.get("enable_boiler", False):
        _LOGGER.debug("Boiler module disabled")
        return None

    try:
        _LOGGER.debug("Initializing Boiler module")
        from .boiler.coordinator import BoilerCoordinator

        boiler_config = {**entry.data, **entry.options}
        box_id = entry.options.get("box_id")
        if isinstance(box_id, str) and box_id.isdigit():
            boiler_config["box_id"] = box_id
        coordinator = BoilerCoordinator(hass, boiler_config)
        await coordinator.async_config_entry_first_refresh()
        _LOGGER.info("Boiler coordinator successfully initialized")
        return coordinator
    except Exception as err:
        _LOGGER.error("Failed to initialize Boiler coordinator: %s", err)
        return None


async def _init_balancing_manager(
    hass: HomeAssistant,
    entry: ConfigEntry,
    coordinator: OigCloudCoordinator,
    battery_prediction_enabled: bool,
) -> Any | None:
    balancing_enabled = entry.options.get("balancing_enabled", True)
    if balancing_enabled and not battery_prediction_enabled:
        _LOGGER.info("oig_cloud: balancing disabled because battery prediction is off")
        balancing_enabled = False
    _LOGGER.info("oig_cloud: balancing_enabled=%s", balancing_enabled)

    if not balancing_enabled:
        _LOGGER.info("oig_cloud: BalancingManager disabled via config options")
        return None
    if BalancingManager is None:
        _LOGGER.warning("oig_cloud: BalancingManager not available (import failed)")
        return None

    try:
        _LOGGER.info("oig_cloud: Initializing BalancingManager")
        box_id = _resolve_entry_box_id(entry, coordinator)
        if not box_id:
            _LOGGER.warning("oig_cloud: No box_id available for BalancingManager")

        storage_path = hass.config.path(".storage")
        balancing_manager = BalancingManager(hass, box_id, storage_path, entry)
        await balancing_manager.async_setup()
        _LOGGER.info("oig_cloud: BalancingManager successfully initialized")

        from datetime import timedelta
        from homeassistant.helpers.event import async_call_later, async_track_time_interval

        async def update_balancing(_now: Any) -> None:
            _LOGGER.debug("BalancingManager: periodic check_balancing()")
            try:
                await balancing_manager.check_balancing()
            except Exception as err:
                _LOGGER.error("Error checking balancing: %s", err, exc_info=True)

        entry.async_on_unload(
            async_track_time_interval(
                hass, update_balancing, timedelta(minutes=30)
            )
        )

        async def initial_balancing_check(_now: Any) -> None:
            _LOGGER.debug("BalancingManager: initial check_balancing()")
            try:
                result = await balancing_manager.check_balancing()
                if result:
                    _LOGGER.info("✅ Initial check created plan: %s", result.mode.name)
                else:
                    _LOGGER.debug("Initial check: no plan needed yet")
            except Exception as err:
                _LOGGER.error(
                    "Error in initial balancing check: %s", err, exc_info=True
                )

        async_call_later(hass, 120, initial_balancing_check)
        return balancing_manager
    except Exception as err:
        _LOGGER.error(
            "oig_cloud: Failed to initialize BalancingManager: %s",
            err,
            exc_info=True,
        )
        return None


def _init_telemetry_store(
    hass: HomeAssistant, entry: ConfigEntry, coordinator: OigCloudCoordinator
) -> Any | None:
    try:
        from .core.telemetry_store import TelemetryStore
        from .entities.base_sensor import resolve_box_id

        store_box_id = entry.options.get("box_id") or entry.data.get("box_id")
        if not (isinstance(store_box_id, str) and store_box_id.isdigit()):
            store_box_id = resolve_box_id(coordinator)
        if isinstance(store_box_id, str) and store_box_id.isdigit():
            telemetry_store = TelemetryStore(hass, box_id=store_box_id)
            setattr(coordinator, "telemetry_store", telemetry_store)
            return telemetry_store
    except Exception:
        return None
    return None


async def _start_data_source_controller(
    hass: HomeAssistant,
    entry: ConfigEntry,
    coordinator: OigCloudCoordinator,
    telemetry_store: Any | None,
) -> Any | None:
    try:
        data_source_controller = DataSourceController(
            hass,
            entry,
            coordinator,
            telemetry_store=telemetry_store,
        )
        await data_source_controller.async_start()
        return data_source_controller
    except Exception as err:
        _LOGGER.warning("DataSourceController start failed (non-critical): %s", err)
        return None


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry
) -> bool:  # noqa: C901
    """Set up OIG Cloud from a config entry."""
    _LOGGER.info("oig_cloud: async_setup_entry started for entry_id=%s", entry.entry_id)
    _LOGGER.info("Setting up OIG Cloud entry: %s", entry.title)
    _LOGGER.debug("Config data keys: %s", list(entry.data.keys()))
    _LOGGER.debug("Config options keys: %s", list(entry.options.keys()))

    # Inject defaults for new planner/autonomy options so legacy setups keep working
    _ensure_planner_option_defaults(hass, entry)
    _ensure_data_source_option_defaults(hass, entry)
    _migrate_enable_spot_prices_option(hass, entry)

    # POZN: Automatická migrace entity/device registry při startu je riziková (může mazat/rozbíjet entity).
    # Pokud je potřeba cleanup/migrace, dělejme ji explicitně (script / servis), ne automaticky v setupu.

    # Initialize data source state early so coordinator setup can respect local/hybrid modes.
    # Also try to infer box_id from local entities so local mapping works without cloud.
    _init_entry_storage(hass, entry)
    init_data_source_state(hass, entry)
    _maybe_persist_box_id_from_proxy_or_local(hass, entry)
    _migrate_legacy_credentials_from_options(hass, entry)

    service_shield = await _start_service_shield(hass, entry)

    try:
        (
            username,
            password,
            no_telemetry,
            standard_scan_interval,
            extended_scan_interval,
        ) = _load_entry_auth_config(entry)

        if not username or not password:
            _LOGGER.error("Username or password is missing from configuration")
            raise ConfigEntryAuthFailed("Missing credentials")

        _LOGGER.debug("Telemetry handled only by ServiceShield, not main module")

        coordinator, session_manager = await _init_session_manager_and_coordinator(
            hass,
            entry,
            username,
            password,
            no_telemetry,
            standard_scan_interval,
            extended_scan_interval,
        )

        notification_manager = await _init_notification_manager(
            hass, entry, coordinator, session_manager, service_shield
        )

        solar_forecast = _init_solar_forecast(entry)

        # **OPRAVA: Správné nastavení statistics pro reload**
        statistics_enabled = entry.options.get("enable_statistics", True)
        _LOGGER.debug("Statistics enabled: %s", statistics_enabled)

        analytics_device_info = _build_analytics_device_info(entry, coordinator)

        ote_api = _init_ote_api(entry)
        boiler_coordinator = await _init_boiler_coordinator(hass, entry)

        # NOVÉ: Podmíněné nastavení dashboard podle konfigurace
        dashboard_enabled = entry.options.get(
            "enable_dashboard", False
        )  # OPRAVA: default False místo True
        # OPRAVA: Dashboard registrujeme AŽ PO vytvoření senzorů

        battery_prediction_enabled = entry.options.get(
            "enable_battery_prediction", False
        )
        balancing_manager = await _init_balancing_manager(
            hass, entry, coordinator, battery_prediction_enabled
        )

        telemetry_store = _init_telemetry_store(hass, entry, coordinator)

        hass.data[DOMAIN][entry.entry_id] = {
            "coordinator": coordinator,
            "session_manager": session_manager,  # NOVÉ: Uložit session manager
            "notification_manager": notification_manager,
            "data_source_controller": None,
            "data_source_state": get_data_source_state(hass, entry.entry_id),
            "telemetry_store": telemetry_store,
            "solar_forecast": solar_forecast,
            "statistics_enabled": statistics_enabled,
            "analytics_device_info": analytics_device_info,
            "service_shield": service_shield,
            "ote_api": ote_api,
            "boiler_coordinator": boiler_coordinator,  # NOVÉ: Boiler coordinator
            "balancing_manager": balancing_manager,  # PHASE 3: Refactored Balancing Manager
            "dashboard_enabled": dashboard_enabled,  # NOVÉ: stav dashboard
            "config": {
                "enable_statistics": statistics_enabled,
                "enable_pricing": entry.options.get("enable_pricing", False),
                "enable_boiler": entry.options.get("enable_boiler", False),  # NOVÉ
                "enable_dashboard": dashboard_enabled,  # NOVÉ
            },
        }

        data_source_controller = await _start_data_source_controller(
            hass, entry, coordinator, telemetry_store
        )
        if data_source_controller:
            hass.data[DOMAIN][entry.entry_id][
                "data_source_controller"
            ] = data_source_controller

        _setup_service_shield_data(hass, entry, coordinator, service_shield)

        # POZN: Plná migrace/cleanup device registry je riziková (může rozbít entity).
        # Děláme jen bezpečný úklid prázdných zařízení s neplatným box_id (např. spot_prices/unknown).

        # Vždy registrovat sensor + switch platform
        await hass.config_entries.async_forward_entry_setups(
            entry, ["sensor", "switch"]
        )

        # Targeted cleanup for stale/invalid devices (e.g., 'spot_prices', 'unknown')
        # that can be left behind after unique_id/device_id stabilization.
        await _cleanup_invalid_empty_devices(hass, entry)

        await _sync_dashboard_panel(hass, entry, dashboard_enabled)

        # Přidáme listener pro změny konfigurace - OPRAVEN callback na async funkci
        entry.async_on_unload(entry.add_update_listener(async_update_options))

        await _register_entry_services(hass, entry, service_shield)
        _register_api_endpoints(hass, boiler_coordinator)

        _setup_service_shield_monitoring(hass, entry, service_shield)

        # OPRAVA: ODSTRANĚNÍ duplicitní registrace služeb - způsobovala přepsání správného schématu
        # Služby se už registrovaly výše v async_setup_entry_services_with_shield
        # await services.async_setup_services(hass)  # ODSTRANĚNO
        # await services.async_setup_entry_services(hass, entry)  # ODSTRANĚNO

        _LOGGER.debug("OIG Cloud integration setup complete")
        return True

    except OigCloudAuthError as e:
        _LOGGER.error("Authentication failed during OIG Cloud setup: %s", e)
        raise ConfigEntryAuthFailed("Authentication failed") from e
    except ConfigEntryAuthFailed:
        raise
    except Exception as e:
        _LOGGER.error("Error initializing OIG Cloud: %s", e, exc_info=True)
        raise ConfigEntryNotReady(f"Error initializing OIG Cloud: {e}") from e


def _setup_service_shield_data(
    hass: HomeAssistant,
    entry: ConfigEntry,
    coordinator: OigCloudCoordinator,
    service_shield: Any | None,
) -> None:
    if not service_shield:
        return
    # Vytvoříme globální odkaz na ServiceShield pro senzory
    hass.data[DOMAIN]["shield"] = service_shield

    # Vytvoříme device info pro ServiceShield (per-box service device)
    try:
        from .entities.base_sensor import resolve_box_id

        shield_box_id = resolve_box_id(coordinator)
    except Exception:
        shield_box_id = entry.options.get("box_id")
    if not (isinstance(shield_box_id, str) and shield_box_id.isdigit()):
        shield_box_id = "unknown"
    shield_device_info = {
        "identifiers": {(DOMAIN, f"{shield_box_id}_shield")},
        "name": f"ServiceShield {shield_box_id}",
        "manufacturer": "OIG",
        "model": "Shield",
        "via_device": (DOMAIN, shield_box_id),
        "entry_type": "service",
    }
    hass.data[DOMAIN][entry.entry_id]["shield_device_info"] = shield_device_info

    _LOGGER.debug("ServiceShield data prepared for sensors")
    _LOGGER.info("ServiceShield status: %s", service_shield.get_shield_status())
    _LOGGER.info("ServiceShield queue info: %s", service_shield.get_queue_info())


async def _sync_dashboard_panel(
    hass: HomeAssistant, entry: ConfigEntry, enabled: bool
) -> None:
    if enabled:
        await _setup_frontend_panel(hass, entry)
        _LOGGER.info("OIG Cloud Dashboard panel enabled and registered")
    else:
        await _remove_frontend_panel(hass, entry)
        _LOGGER.info("OIG Cloud Dashboard panel disabled - panel not registered")


async def _register_entry_services(
    hass: HomeAssistant, entry: ConfigEntry, service_shield: Any | None
) -> None:
    # Async importy pro vyhnání se blokování event loopu
    from .services import (
        async_setup_entry_services_with_shield,
        async_setup_services,
    )

    # Setup základních služeb (pouze jednou pro celou integraci)
    if len([k for k in hass.data[DOMAIN].keys() if k != "shield"]) == 1:
        await async_setup_services(hass)

    # Setup entry-specific služeb s shield ochranou
    await async_setup_entry_services_with_shield(hass, entry, service_shield)


def _register_api_endpoints(hass: HomeAssistant, boiler_coordinator: Any | None) -> None:
    # NOVÉ: Registrace HTTP API endpointů pro boiler
    if boiler_coordinator:
        from .boiler.api_views import register_boiler_api_views

        register_boiler_api_views(hass)
        _LOGGER.info("Boiler API endpoints registered")

    # NOVÉ: Registrace Planning API endpointů
    from .api.planning_api import setup_planning_api_views

    setup_planning_api_views(hass)
    _LOGGER.info("Planning API endpoints registered")

    # NOVÉ: Registrace OIG Cloud REST API endpointů pro heavy data
    # (timeline, spot prices, analytics)
    try:
        from .api.ha_rest_api import setup_api_endpoints

        setup_api_endpoints(hass)
        _LOGGER.info("✅ OIG Cloud REST API endpoints registered successfully")
    except Exception as e:
        _LOGGER.error(
            "Failed to register OIG Cloud REST API endpoints: %s",
            e,
            exc_info=True,
        )
        # Pokračujeme i bez API - senzory budou fungovat s attributes


def _setup_service_shield_monitoring(
    hass: HomeAssistant, entry: ConfigEntry, service_shield: Any | None
) -> None:
    if not service_shield:
        _LOGGER.warning("ServiceShield není dostupný - služby nebudou chráněny")
        return

    _LOGGER.info("ServiceShield je aktivní a připravený na interceptování služeb")
    _LOGGER.debug("ServiceShield pending: %s", len(service_shield.pending))
    _LOGGER.debug("ServiceShield queue: %s", len(service_shield.queue))
    _LOGGER.debug("ServiceShield running: %s", service_shield.running)
    _LOGGER.debug("Ověřuji, že ServiceShield monitoring běží...")

    async def test_shield_monitoring(_now: Any) -> None:
        await asyncio.sleep(0)
        status = service_shield.get_shield_status()
        queue_info = service_shield.get_queue_info()
        _LOGGER.debug(
            "[OIG Shield] Test monitoring tick - pending: %s, queue: %s, running: %s",
            len(service_shield.pending),
            len(service_shield.queue),
            service_shield.running,
        )
        _LOGGER.debug("[OIG Shield] Status: %s", status)
        _LOGGER.debug("[OIG Shield] Queue info: %s", queue_info)

        if service_shield.telemetry_handler:
            _LOGGER.debug("[OIG Shield] Telemetry handler je aktivní")
            if hasattr(service_shield, "_log_telemetry"):
                _LOGGER.debug("[OIG Shield] Telemetry logging metoda je dostupná")
        else:
            _LOGGER.debug("[OIG Shield] Telemetry handler není aktivní")

    from datetime import timedelta

    from homeassistant.helpers.event import async_track_time_interval

    entry.async_on_unload(
        async_track_time_interval(hass, test_shield_monitoring, timedelta(seconds=30))
    )

    # StatisticsStore periodic flush (low-power optimalization)
    async def flush_statistics_store(_now: Any) -> None:
        await asyncio.sleep(0)
        try:
            from .shared.statistics_storage import StatisticsStore
            stats_store = StatisticsStore.get_instance(hass)
            if stats_store:
                await stats_store.save_all()
                _LOGGER.debug("[STATS] Periodic flush completed")
        except Exception as err:
            _LOGGER.debug("StatisticsStore periodic flush failed: %s", err)

    entry.async_on_unload(
        async_track_time_interval(hass, flush_statistics_store, timedelta(minutes=10))
    )


async def _setup_telemetry(hass: core.HomeAssistant, username: str) -> None:
    """Setup telemetry if enabled."""
    await asyncio.sleep(0)
    try:
        _LOGGER.debug("Starting telemetry setup...")

        email_hash = hashlib.sha256(username.encode("utf-8")).hexdigest()
        hass_id = hashlib.sha256(hass.data["core.uuid"].encode("utf-8")).hexdigest()

        _LOGGER.debug(
            "Telemetry identifiers - Email hash: %s..., HASS ID: %s...",
            email_hash[:16],
            hass_id[:16],
        )

        from .shared.logging import setup_simple_telemetry

        telemetry = setup_simple_telemetry(email_hash, hass_id)
        if telemetry:
            hass.data.setdefault(DOMAIN, {})["telemetry"] = telemetry
            _LOGGER.info("Telemetry initialized (simple mode)")
        else:
            _LOGGER.debug("Telemetry initialization skipped (no handler)")

    except Exception as e:
        _LOGGER.warning("Failed to setup telemetry: %s", e, exc_info=True)
        # Pokračujeme bez telemetrie


async def async_unload_entry(
    hass: HomeAssistant, entry: config_entries.ConfigEntry
) -> bool:
    """Unload a config entry."""
    # Odebrání dashboard panelu při unload
    await _remove_frontend_panel(hass, entry)

    # Flush StatisticsStore data before unload (low-power optimalization)
    try:
        from .shared.statistics_storage import StatisticsStore
        stats_store = StatisticsStore.get_instance(hass)
        if stats_store:
            await stats_store.save_all()
            _LOGGER.debug(f"[UNLOAD] Flushed StatisticsStore for entry {entry.entry_id}")
    except Exception as err:
        _LOGGER.debug("StatisticsStore flush failed: %s", err)

    # PHASE 3: Cleanup Balancing Manager (no async_shutdown needed - just storage)

    # NOVÉ: Cleanup session manageru
    if DOMAIN in hass.data and entry.entry_id in hass.data[DOMAIN]:
        data_source_controller = hass.data[DOMAIN][entry.entry_id].get(
            "data_source_controller"
        )
        if data_source_controller:
            try:
                await data_source_controller.async_stop()
            except Exception as err:
                _LOGGER.debug("DataSourceController stop failed: %s", err)

        session_manager = hass.data[DOMAIN][entry.entry_id].get("session_manager")
        if session_manager:
            _LOGGER.debug("Closing session manager")
            await session_manager.close()

    unload_ok = await hass.config_entries.async_unload_platforms(entry, ["sensor"])
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok


async def async_remove_config_entry_device(
    hass: HomeAssistant, config_entry: ConfigEntry, device_entry: Any
) -> bool:
    """Allow removing stale devices created by this integration.

    Home Assistant calls this when the user tries to delete a device from the UI.
    We only allow removing devices that have no entities.
    """
    _ = config_entry
    await asyncio.sleep(0)
    try:
        from homeassistant.helpers import entity_registry as er

        entity_registry = er.async_get(hass)
        if er.async_entries_for_device(entity_registry, device_entry.id):
            return False
        # Allow removal for both current and legacy identifier domains.
        # Legacy versions used separate identifier domains:
        # - "oig_cloud_analytics"
        # - "oig_cloud_shield"
        allowed_domains = {DOMAIN, f"{DOMAIN}_analytics", f"{DOMAIN}_shield"}
        return any(
            identifier[0] in allowed_domains for identifier in device_entry.identifiers
        )
    except Exception as err:
        _LOGGER.debug("Failed to evaluate device removal: %s", err, exc_info=True)
        return False


async def async_reload_entry(config_entry: config_entries.ConfigEntry) -> None:
    """Reload config entry."""
    hass = config_entry.hass
    await async_unload_entry(hass, config_entry)
    await async_setup_entry(hass, config_entry)


async def async_update_options(
    hass: HomeAssistant, config_entry: config_entries.ConfigEntry
) -> None:
    """Update options with dashboard management."""
    hass_data = hass.data.get(DOMAIN, {}).get(config_entry.entry_id, {})
    old_options = hass_data.get("config", {}) or config_entry.options
    new_options = dict(config_entry.options)

    # Kontrola změny dashboard nastavení
    old_dashboard_enabled = old_options.get("enable_dashboard", False)
    new_dashboard_enabled = new_options.get("enable_dashboard", False)

    _LOGGER.debug(
        "Dashboard options update: old=%s, new=%s",
        old_dashboard_enabled,
        new_dashboard_enabled,
    )

    if old_dashboard_enabled != new_dashboard_enabled:
        _LOGGER.info(
            "Dashboard setting changed: %s -> %s",
            old_dashboard_enabled,
            new_dashboard_enabled,
        )

        if new_dashboard_enabled:
            # Zapnutí dashboard
            await _setup_frontend_panel(hass, config_entry)
            _LOGGER.info("Dashboard panel enabled")
        else:
            # Vypnutí dashboard
            await _remove_frontend_panel(hass, config_entry)
            _LOGGER.info("Dashboard panel disabled")

        # Aktualizace dat v hass.data
        if DOMAIN in hass.data and config_entry.entry_id in hass.data[DOMAIN]:
            hass.data[DOMAIN][config_entry.entry_id][
                "dashboard_enabled"
            ] = new_dashboard_enabled
            hass.data[DOMAIN][config_entry.entry_id]["config"][
                "enable_dashboard"
            ] = new_dashboard_enabled
    else:
        # PŘIDÁNO: I když se hodnota nezměnila, ujistíme se že panel není registrován pokud je disabled
        if not new_dashboard_enabled:
            await _remove_frontend_panel(hass, config_entry)
            _LOGGER.debug("Ensuring dashboard panel is not registered (disabled)")

    # Pokud byla označena potřeba reload, proveď ho
    if new_options.get("_needs_reload"):
        new_options.pop("_needs_reload", None)
        hass.config_entries.async_update_entry(config_entry, options=new_options)
        hass.async_create_task(hass.config_entries.async_reload(config_entry.entry_id))
    else:
        hass.config_entries.async_update_entry(config_entry, options=new_options)


def _keep_device_patterns() -> list[str]:
    return [
        "OIG.*Statistics",
        "ČEZ Battery Box",
        "OIG Cloud Home",
        "Analytics & Predictions",
        "ServiceShield",
    ]


def _device_matches_keep_patterns(device_name: str, keep_patterns: list[str]) -> bool:
    if not device_name:
        return False
    return any(pattern in device_name for pattern in keep_patterns)


def _device_matches_remove_regex(device_name: str, keep_patterns: list[str]) -> bool:
    if not device_name:
        return False
    return any(re.search(pattern, device_name) for pattern in keep_patterns)


def _should_keep_device(device: Any, entity_registry: Any, keep_patterns: list[str]) -> bool:
    if _device_matches_keep_patterns(device.name or "", keep_patterns):
        return True
    if _device_matches_remove_regex(device.name or "", keep_patterns):
        return False
    return _device_has_entities(entity_registry, device.id)


async def _cleanup_unused_devices(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Vyčištění nepoužívaných zařízení."""
    await asyncio.sleep(0)
    try:
        from homeassistant.helpers import device_registry as dr
        from homeassistant.helpers import entity_registry as er

        device_registry = dr.async_get(hass)
        entity_registry = er.async_get(hass)

        # Najdeme všechna zařízení pro tuto integraci
        devices = dr.async_entries_for_config_entry(device_registry, entry.entry_id)

        devices_to_remove = []
        keep_patterns = _keep_device_patterns()
        for device in devices:
            should_keep = _should_keep_device(device, entity_registry, keep_patterns)

            if not should_keep:
                devices_to_remove.append(device)
                _LOGGER.info(
                    "Marking device for removal: %s (ID: %s)",
                    device.name,
                    device.id,
                )
            else:
                _LOGGER.debug(
                    "Keeping device: %s (ID: %s)", device.name, device.id
                )

        # Smažeme nepoužívaná zařízení
        for device in devices_to_remove:
            try:
                _LOGGER.info(
                    "Removing unused device: %s (ID: %s)", device.name, device.id
                )
                device_registry.async_remove_device(device.id)
            except Exception as e:
                _LOGGER.warning("Error removing device %s: %s", device.id, e)

        if devices_to_remove:
            _LOGGER.info("Removed %s unused devices", len(devices_to_remove))
        else:
            _LOGGER.debug("No unused devices found to remove")
    except Exception as e:
        _LOGGER.warning("Error cleaning up devices: %s", e)
