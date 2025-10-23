"""The OIG Cloud integration."""

from __future__ import annotations

import asyncio
import logging
import hashlib
import re
from typing import Any, Dict

from homeassistant import config_entries, core
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_PASSWORD, CONF_USERNAME, Platform
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import ConfigEntryNotReady

from .lib.oig_cloud_client.api.oig_cloud_api import OigCloudApi
from .const import (
    CONF_NO_TELEMETRY,
    CONF_USERNAME,
    CONF_PASSWORD,
    DOMAIN,
    DEFAULT_NAME,
    CONF_STANDARD_SCAN_INTERVAL,
    CONF_EXTENDED_SCAN_INTERVAL,
)
from .oig_cloud_coordinator import OigCloudCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = [Platform.SENSOR]

# **OPRAVA: Globální analytics_device_info pro statistické senzory**
analytics_device_info: Dict[str, Any] = {
    "identifiers": {(DOMAIN, "analytics")},
    "name": "Analytics & Predictions",
    "manufacturer": "OIG Cloud",
    "model": "Analytics Module",
    "sw_version": "1.0",
}

# OPRAVA: Definujeme všechny možné box modes pro konzistenci
ALL_BOX_MODES = ["Home 1", "Home 2", "Home 3", "Home UPS", "Home 5", "Home 6"]


async def async_setup(hass: HomeAssistant, config: Dict[str, Any]) -> bool:
    """Set up OIG Cloud integration."""
    # OPRAVA: Debug setup telemetrie
    print("[OIG SETUP] Starting OIG Cloud setup")

    # OPRAVA: Odstraníme neexistující import setup_telemetry
    # Initialize telemetry - telemetrie se inicializuje přímo v ServiceShield
    print("[OIG SETUP] Telemetry will be initialized in ServiceShield")

    # OPRAVA: ServiceShield se inicializuje pouze v async_setup_entry, ne zde
    # V async_setup pouze připravíme globální strukturu
    hass.data.setdefault(DOMAIN, {})
    print("[OIG SETUP] Global data structure prepared")

    # OPRAVA: Univerzální registrace statických cest pro všechny verze HA
    await _register_static_paths(hass)

    # OPRAVA: Odstranění volání _setup_frontend_panel z async_setup
    # Panel se registruje až v async_setup_entry kde máme přístup k entry
    # await _setup_frontend_panel(hass)  # ODSTRANĚNO

    print("[OIG SETUP] OIG Cloud setup completed")
    return True


async def _register_static_paths(hass: HomeAssistant) -> None:
    """Registrace statických cest pro HA 2024.5+."""
    static_path = "/oig_cloud_static"
    directory = hass.config.path("custom_components/oig_cloud/www")

    _LOGGER.info(f"Registering static path: {static_path} -> {directory}")

    # OPRAVA: Pouze moderní metoda
    from homeassistant.components.http import StaticPathConfig

    static_config = StaticPathConfig(static_path, directory, cache_headers=False)
    await hass.http.async_register_static_paths([static_config])
    _LOGGER.info("✅ Static paths registered successfully")


async def _setup_frontend_panel(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Nastavení frontend panelu (pouze když je povolen)."""
    try:
        # Unikátní ID panelu pro tuto instanci
        panel_id = f"oig_cloud_dashboard_{entry.entry_id}"

        # OPRAVA: Získání inverter_sn přímo z coordinator.data
        inverter_sn = "unknown"
        coordinator_data = hass.data[DOMAIN][entry.entry_id].get("coordinator")
        if coordinator_data and coordinator_data.data:
            inverter_sn = next(iter(coordinator_data.data.keys()), "unknown")
            _LOGGER.info(f"Dashboard setup: Found inverter_sn = {inverter_sn}")
        else:
            _LOGGER.warning("Dashboard setup: No coordinator data available")

        panel_title = (
            f"OIG Dashboard ({inverter_sn})"
            if inverter_sn != "unknown"
            else "OIG Cloud Dashboard"
        )

        # Cache-busting: Přidat verzi + timestamp k URL pro vymazání browseru cache
        import os
        import json
        import time

        manifest_path = os.path.join(os.path.dirname(__file__), "manifest.json")
        version = "unknown"
        try:
            with open(manifest_path, "r") as f:
                manifest = json.load(f)
                version = manifest.get("version", "unknown")
        except Exception as e:
            _LOGGER.warning(f"Could not load version from manifest: {e}")

        # Přidat timestamp pro cache-busting při každém restartu
        cache_bust = int(time.time())

        # OPRAVA: Přidat parametry včetně v= a t= pro cache-busting
        dashboard_url = f"/oig_cloud_static/dashboard.html?entry_id={entry.entry_id}&inverter_sn={inverter_sn}&v={version}&t={cache_bust}"

        _LOGGER.info(f"Dashboard URL: {dashboard_url}")

        from homeassistant.components import frontend

        # OPRAVA: Kontrola existence funkce a její volání bez await pokud vrací None
        if hasattr(frontend, "async_register_built_in_panel"):
            register_func = getattr(frontend, "async_register_built_in_panel")
            if callable(register_func):
                try:
                    result = register_func(
                        hass,
                        "iframe",
                        panel_title,
                        "mdi:solar-power",
                        panel_id,
                        {"url": dashboard_url},
                        require_admin=False,
                    )

                    # Pokud funkce vrací coroutine, await it
                    if hasattr(result, "__await__"):
                        await result

                    _LOGGER.info(f"✅ Panel '{panel_title}' registered successfully")
                except Exception as reg_error:
                    _LOGGER.error(f"Error during panel registration: {reg_error}")
                    raise
            else:
                _LOGGER.warning("async_register_built_in_panel is not callable")
        else:
            _LOGGER.warning("Frontend async_register_built_in_panel not available")

        # OPRAVA: Debug logování dostupných entit
        coordinator = hass.data[DOMAIN][entry.entry_id].get("coordinator")
        if coordinator and coordinator.data:
            entity_count = len(
                [
                    k
                    for k in hass.states.async_entity_ids()
                    if k.startswith(f"sensor.oig_{inverter_sn}")
                ]
            )
            _LOGGER.info(
                f"Dashboard: Found {entity_count} OIG entities for inverter {inverter_sn}"
            )

            # Kontrola klíčových entit (pouze pokud jsou zapnuté v konfiguraci)
            key_entities = [
                f"sensor.oig_{inverter_sn}_remaining_usable_capacity",  # vždy
            ]

            # Přidat solar_forecast pouze pokud je zapnutý
            if entry.options.get("enable_solar_forecast", False):
                key_entities.append(f"sensor.oig_{inverter_sn}_solar_forecast")

            # Přidat battery_forecast pouze pokud je zapnutý
            if entry.options.get("enable_battery_prediction", False):
                key_entities.append(f"sensor.oig_{inverter_sn}_battery_forecast")

            for entity_id in key_entities:
                entity_state = hass.states.get(entity_id)
                if entity_state:
                    _LOGGER.debug(
                        f"Dashboard entity check: {entity_id} = {entity_state.state}"
                    )
                else:
                    # DEBUG místo WARNING - entity může chybět při startu (timing issue)
                    _LOGGER.debug(f"Dashboard entity not yet available: {entity_id}")
        else:
            _LOGGER.warning("Dashboard: No coordinator data for entity checking")

    except Exception as e:
        _LOGGER.error(f"Failed to setup frontend panel: {e}")


async def _remove_frontend_panel(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Odebrání frontend panelu."""
    try:
        panel_id = f"oig_cloud_dashboard_{entry.entry_id}"

        from homeassistant.components import frontend

        # OPRAVA: Důkladnější kontrola existence panelu
        panels_exist = False
        try:
            # Zkusíme získat přístup k registrovaným panelům
            if hasattr(hass, "components") and "frontend" in hass.components:
                frontend_component = hass.components.frontend
                if hasattr(frontend_component, "async_register_built_in_panel"):
                    # Panel systém je dostupný
                    panels_exist = True
        except Exception:
            pass

        if not panels_exist:
            _LOGGER.debug(
                f"Frontend panel system not available, skipping removal of {panel_id}"
            )
            return

        # OPRAVA: Kontrola existence panelu před odstraněním
        try:
            # Pokusíme se získat informace o panelu před jeho odstraněním
            # Tím ověříme, že skutečně existuje
            panel_exists = False

            if hasattr(hass.data.get("frontend_panels", {}), panel_id):
                panel_exists = True
            elif hasattr(hass.data.get("frontend", {}), "panels"):
                existing_panels = hass.data["frontend"].panels
                panel_exists = panel_id in existing_panels

            if not panel_exists:
                _LOGGER.debug(f"Panel {panel_id} doesn't exist, nothing to remove")
                return
        except Exception as check_error:
            _LOGGER.debug(
                f"Cannot check panel existence, proceeding with removal attempt: {check_error}"
            )

        # Pokus o odebrání panelu
        if hasattr(frontend, "async_remove_panel") and callable(
            getattr(frontend, "async_remove_panel")
        ):
            try:
                await frontend.async_remove_panel(hass, panel_id)
                _LOGGER.info(f"✅ Panel removed: {panel_id}")
            except ValueError as ve:
                if "unknown panel" in str(ve).lower():
                    _LOGGER.debug(
                        f"Panel {panel_id} was already removed or never existed"
                    )
                else:
                    _LOGGER.warning(f"Error removing panel {panel_id}: {ve}")
            except Exception as re:
                _LOGGER.debug(f"Panel removal handled (panel may not exist): {re}")
        else:
            _LOGGER.debug("async_remove_panel not available")

    except Exception as e:
        # OPRAVA: Všechny chyby logujeme jako debug, protože jsou očekávané
        _LOGGER.debug(f"Panel removal handled gracefully: {e}")


async def _migrate_entity_unique_ids(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Migrace unique_id a cleanup duplicitních entit s _2, _3, atd."""
    _LOGGER.info("🔍 Starting _migrate_entity_unique_ids function...")
    from homeassistant.helpers import entity_registry as er
    from homeassistant.helpers.recorder import get_instance
    import re

    entity_registry = er.async_get(hass)

    # Najdeme všechny OIG entity pro tento config entry
    entities = er.async_entries_for_config_entry(entity_registry, entry.entry_id)
    _LOGGER.info(f"📊 Found {len(entities)} entities for config entry")

    # Fáze 1: Cleanup duplicitních entit
    entities_by_base = {}  # base_entity_id -> [entities]
    duplicate_pattern = re.compile(r"^(.+?)(_\d+)$")

    for entity in entities:
        entity_id = entity.entity_id
        match = duplicate_pattern.match(entity_id)

        if match:
            # Má příponu _2, _3, atd.
            base_id = match.group(1)
            entities_by_base.setdefault(base_id, []).append(entity)
        else:
            # Základní entity bez přípony
            entities_by_base.setdefault(entity_id, []).append(entity)

    disabled_count = 0

    # Zpracujeme duplicity
    for base_id, entity_list in entities_by_base.items():
        if len(entity_list) <= 1:
            continue

        # Najdeme základní entitu (bez přípony)
        base_entity = None
        duplicates = []

        for e in entity_list:
            if e.entity_id == base_id:
                base_entity = e
            else:
                duplicates.append(e)

        # Pokud existuje základní entita, deaktivujeme duplicity
        if base_entity and duplicates:
            for dup in duplicates:
                try:
                    # Disable duplicitu (zachování dat)
                    if not dup.disabled_by:
                        entity_registry.async_update_entity(
                            dup.entity_id,
                            disabled_by=er.RegistryEntryDisabler.INTEGRATION,
                        )
                        disabled_count += 1
                        _LOGGER.info(
                            f"⏸️ Disabled duplicate entity: {dup.entity_id} (base: {base_id})"
                        )
                except Exception as e:
                    _LOGGER.warning(
                        f"⚠️ Failed to disable duplicate {dup.entity_id}: {e}"
                    )

    # Fáze 2: Migrace unique_id
    # Znovu načteme entity po cleanup
    entities = er.async_entries_for_config_entry(entity_registry, entry.entry_id)

    migrated_count = 0
    skipped_count = 0

    for entity in entities:
        old_unique_id = entity.unique_id

        # Přeskočíme entity, které už mají správný formát
        if old_unique_id.startswith("oig_cloud_"):
            skipped_count += 1
            continue

        # Migrace formátů unique_id
        if old_unique_id.startswith("oig_") and not old_unique_id.startswith(
            "oig_cloud_"
        ):
            # Formát oig_{boxId}_{sensor} -> oig_cloud_{boxId}_{sensor}
            new_unique_id = f"oig_cloud_{old_unique_id[4:]}"
        else:
            # Formát {boxId}_{sensor} -> oig_cloud_{boxId}_{sensor}
            new_unique_id = f"oig_cloud_{old_unique_id}"

        try:
            entity_registry.async_update_entity(
                entity.entity_id, new_unique_id=new_unique_id
            )
            migrated_count += 1
            _LOGGER.info(
                f"✅ Migrated entity {entity.entity_id}: {old_unique_id} -> {new_unique_id}"
            )
        except Exception as e:
            _LOGGER.warning(f"⚠️ Failed to migrate {entity.entity_id}: {e}")

    # Summary
    if disabled_count > 0:
        message_parts = [
            f"**Deaktivováno {disabled_count} duplicitních entit** (s příponami _2, _3, atd.)\n\n"
            f"**Co to znamená:**\n"
            f"- Duplicity jsou vypnuté, ale jejich data zůstávají\n"
            f"- Aktivní zůstaly pouze základní entity (bez přípony)\n"
            f"- Za pár dní se stará data automaticky rotují\n\n"
            f"**Co můžete udělat:**\n"
            f"1. Nic - duplicity časem zastarají (doporučeno)\n"
            f"2. Smazat je v Nastavení → Zařízení & Služby → Entity (zapnout 'Zobrazit zakázané')\n"
            f"3. Pokud má duplicita důležitá data, můžete ji znovu povolit\n\n"
            f"Toto je jednorázová migrace po aktualizaci integrace."
        ]

        await hass.services.async_call(
            "persistent_notification",
            "create",
            {
                "title": "OIG Cloud: Duplicitní entity deaktivovány",
                "message": "".join(message_parts),
                "notification_id": "oig_cloud_duplicate_cleanup",
            },
        )

        _LOGGER.warning(
            f"⏸️ Disabled {disabled_count} duplicate entities. "
            f"Check persistent notification for details."
        )
    if migrated_count > 0:
        _LOGGER.info(f"🔄 Migrated {migrated_count} entities to new unique_id format")
    if skipped_count > 0:
        _LOGGER.debug(f"⏭️ Skipped {skipped_count} entities (already in correct format)")


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up OIG Cloud from a config entry."""
    _LOGGER.info("[OIG SETUP] Starting OIG Cloud setup")
    _LOGGER.info(f"Setting up OIG Cloud entry: {entry.title}")
    _LOGGER.debug(f"Config data keys: {list(entry.data.keys())}")
    _LOGGER.debug(f"Config options keys: {list(entry.options.keys())}")

    # MIGRACE 1: enable_spot_prices -> enable_pricing
    if "enable_spot_prices" in entry.options:
        _LOGGER.info("🔄 Migrating enable_spot_prices to enable_pricing")
        new_options = dict(entry.options)

        # Pokud enable_spot_prices byl True, zapneme enable_pricing
        if new_options.get("enable_spot_prices", False):
            new_options["enable_pricing"] = True
            _LOGGER.info("✅ Migrated: enable_spot_prices=True -> enable_pricing=True")

        # Odstraníme starý flag
        new_options.pop("enable_spot_prices", None)

        # Aktualizujeme entry
        hass.config_entries.async_update_entry(entry, options=new_options)
        _LOGGER.info("✅ Migration completed - enable_spot_prices removed from config")

    # MIGRACE 2: Unique ID formát pro všechny entity
    _LOGGER.info("🔄 Starting entity unique_id migration...")
    try:
        await _migrate_entity_unique_ids(hass, entry)
        _LOGGER.info("✅ Entity unique_id migration completed")
    except Exception as e:
        _LOGGER.error(f"❌ Entity unique_id migration failed: {e}", exc_info=True)

    # Inicializace hass.data struktury pro tento entry PŘED použitím
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN].setdefault(entry.entry_id, {})

    # OPRAVA: Inicializujeme service_shield jako None před try blokem
    service_shield = None

    try:
        # Inicializujeme ServiceShield s entry parametrem
        from .service_shield import ServiceShield

        service_shield = ServiceShield(hass, entry)
        await service_shield.start()

        hass.data[DOMAIN][entry.entry_id]["service_shield"] = service_shield

        _LOGGER.info("ServiceShield inicializován a spuštěn")
    except Exception as e:
        _LOGGER.error(f"ServiceShield není dostupný - obecná chyba: {e}")
        # Pokračujeme bez ServiceShield
        hass.data[DOMAIN][entry.entry_id]["service_shield"] = None
        # OPRAVA: Ujistíme se, že service_shield je None
        service_shield = None

    try:
        # Načtení konfigurace z entry.data nebo entry.options
        username = entry.data.get(CONF_USERNAME) or entry.options.get(CONF_USERNAME)
        password = entry.data.get(CONF_PASSWORD) or entry.options.get(CONF_PASSWORD)

        # Debug log pro diagnostiku
        _LOGGER.debug(f"Username: {'***' if username else 'MISSING'}")
        _LOGGER.debug(f"Password: {'***' if password else 'MISSING'}")

        if not username or not password:
            _LOGGER.error("Username or password is missing from configuration")
            return False

        no_telemetry = entry.data.get(CONF_NO_TELEMETRY, False) or entry.options.get(
            CONF_NO_TELEMETRY, False
        )

        # OPRAVA: Preferuj options před data, jen pokud options neexistují, použij data nebo default
        standard_scan_interval = entry.options.get(
            "standard_scan_interval"
        ) or entry.data.get(CONF_STANDARD_SCAN_INTERVAL, 30)
        extended_scan_interval = entry.options.get(
            "extended_scan_interval"
        ) or entry.data.get(CONF_EXTENDED_SCAN_INTERVAL, 300)

        _LOGGER.debug(
            f"Using intervals: standard={standard_scan_interval}s, extended={extended_scan_interval}s"
        )

        # DEBUG: DOČASNĚ ZAKÁZAT telemetrii kvůli problémům s výkonem
        # OPRAVA: Telemetrie způsobovala nekonečnou smyčku
        # if not no_telemetry:
        #     _LOGGER.debug("Telemetry enabled, setting up...")
        #     await _setup_telemetry(hass, username)
        # else:
        #     _LOGGER.debug("Telemetry disabled by configuration")

        _LOGGER.debug("Telemetry handled only by ServiceShield, not main module")

        # NOVÉ: Vytvoření OigCloudApi a zabalení do SessionManageru
        oig_api = OigCloudApi(username, password, no_telemetry)

        _LOGGER.debug("Creating session manager wrapper")
        from .api.oig_cloud_session_manager import OigCloudSessionManager

        session_manager = OigCloudSessionManager(oig_api)

        _LOGGER.debug("Initial authentication via session manager")
        # Session manager zavolá authenticate() při prvním požadavku,
        # ale provedeme to i zde pro kontrolu přihlašovacích údajů
        await session_manager._ensure_auth()

        # CRITICAL: Check if live data is enabled (actual element present in API response)
        # Stats structure: { "box_id": { "actual": {...}, "settings": {...} } }
        _LOGGER.debug("Kontrola, zda jsou v aplikaci OIG Cloud zapnutá 'Živá data'...")
        try:
            test_stats = await oig_api.get_stats()
            if test_stats:
                # Get first device data
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
        except Exception as e:
            _LOGGER.warning(f"Nelze ověřit stav živých dat: {e}")
            # Pokračujeme i tak - může jít o dočasný problém s API

        # Inicializace koordinátoru - použijeme session_manager.api (wrapper)
        coordinator = OigCloudCoordinator(
            hass, session_manager, standard_scan_interval, extended_scan_interval, entry
        )

        # OPRAVA: Počkej na první data před vytvořením senzorů
        _LOGGER.debug("Waiting for initial coordinator data...")
        await coordinator.async_config_entry_first_refresh()

        if coordinator.data is None:
            _LOGGER.error("Failed to get initial data from coordinator")
            raise ConfigEntryNotReady("No data received from OIG Cloud API")

        _LOGGER.debug(f"Coordinator data received: {len(coordinator.data)} devices")

        # OPRAVA: Inicializace notification manageru se správným error handling
        notification_manager = None
        try:
            _LOGGER.debug("Initializing notification manager...")
            from .oig_cloud_notification import OigNotificationManager

            # PROBLÉM: Ověříme, že používáme správný objekt
            _LOGGER.debug(f"Using API object: {type(oig_api)}")
            _LOGGER.debug(
                f"API has get_notifications: {hasattr(oig_api, 'get_notifications')}"
            )

            # OPRAVA: Použít oig_api objekt (OigCloudApi) místo jakéhokoliv jiného
            # NOVÉ: Použít session_manager.api pro přístup k underlying API
            notification_manager = OigNotificationManager(
                hass, session_manager.api, "https://www.oigpower.cz/cez/"
            )

            # Nastavíme device_id z prvního dostupného zařízení v coordinator.data
            if coordinator.data:
                device_id = next(iter(coordinator.data.keys()))
                notification_manager.set_device_id(device_id)
                _LOGGER.debug(f"Set notification manager device_id to: {device_id}")

                # OPRAVA: Použít nový API přístup místo fetch_notifications_and_status
                try:
                    await notification_manager.update_from_api()
                    _LOGGER.debug("Initial notification data loaded successfully")
                except Exception as fetch_error:
                    _LOGGER.warning(
                        f"Failed to fetch initial notifications (API endpoint may not exist): {fetch_error}"
                    )
                    # Pokračujeme bez počátečních notifikací - API endpoint možná neexistuje

                # Připoj notification manager ke koordinátoru i když fetch selhal
                # Manager může fungovat později pokud se API opraví
                coordinator.notification_manager = notification_manager
                _LOGGER.info(
                    "Notification manager created and attached to coordinator (may not have data yet)"
                )
            else:
                _LOGGER.warning(
                    "No device data available, notification manager not initialized"
                )
                notification_manager = None

        except Exception as e:
            _LOGGER.warning(
                f"Failed to setup notification manager (API may not be available): {e}"
            )
            # Pokračujeme bez notification manageru - API endpoint možná neexistuje nebo je nedostupný
            notification_manager = None

        # Inicializace solar forecast (pokud je povolená)
        solar_forecast = None
        if entry.options.get("enable_solar_forecast", False):
            try:
                _LOGGER.debug("Initializing solar forecast functionality")
                # Solar forecast se inicializuje přímo v sensorech, ne zde
                solar_forecast = {"enabled": True, "config": entry.options}
            except Exception as e:
                _LOGGER.error("Chyba při inicializaci solární předpovědi: %s", e)
                solar_forecast = {"enabled": False, "error": str(e)}

        # **OPRAVA: Správné nastavení statistics pro reload**
        statistics_enabled = entry.options.get("enable_statistics", True)
        _LOGGER.debug(f"Statistics enabled: {statistics_enabled}")

        # **OPRAVA: Přidání analytics_device_info pro statistické senzory**
        analytics_device_info = {
            "identifiers": {(DOMAIN, f"{entry.entry_id}_analytics")},
            "name": "Analytics & Predictions",
            "manufacturer": "OIG Cloud",
            "model": "Analytics Module",
            "sw_version": "1.0",
        }

        # NOVÉ: Podpora pro OTE API a spotové ceny
        ote_api = None
        if entry.options.get("enable_pricing", False):
            try:
                _LOGGER.debug("Initializing OTE API for spot prices")
                from .api.ote_api import OteApi

                ote_api = OteApi()
                # OPRAVA: Odstraněno volání fetch_spot_prices - data už jsou v coordinatoru
                _LOGGER.info("OTE API successfully initialized")
            except Exception as e:
                _LOGGER.error(f"Failed to initialize OTE API: {e}")
                if ote_api:
                    await ote_api.close()
                ote_api = None
        else:
            _LOGGER.debug("Pricing disabled - skipping OTE API initialization")

        # NOVÉ: Podmíněné nastavení dashboard podle konfigurace
        dashboard_enabled = entry.options.get(
            "enable_dashboard", False
        )  # OPRAVA: default False místo True
        # OPRAVA: Dashboard registrujeme AŽ PO vytvoření senzorů

        # Uložení dat do hass.data
        hass.data[DOMAIN][entry.entry_id] = {
            "coordinator": coordinator,
            "session_manager": session_manager,  # NOVÉ: Uložit session manager
            "notification_manager": notification_manager,
            "solar_forecast": solar_forecast,
            "statistics_enabled": statistics_enabled,
            "analytics_device_info": analytics_device_info,
            "service_shield": service_shield,
            "ote_api": ote_api,
            "dashboard_enabled": dashboard_enabled,  # NOVÉ: stav dashboard
            "config": {
                "enable_statistics": statistics_enabled,
                "enable_pricing": entry.options.get("enable_pricing", False),
                "enable_dashboard": dashboard_enabled,  # NOVÉ
            },
        }

        # OPRAVA: Přidání ServiceShield dat do globálního úložiště pro senzory
        if service_shield:
            # Vytvoříme globální odkaz na ServiceShield pro senzory
            hass.data[DOMAIN]["shield"] = service_shield

            # Vytvoříme device info pro ServiceShield
            shield_device_info = {
                "identifiers": {(DOMAIN, f"{entry.entry_id}_shield")},
                "name": "ServiceShield",
                "manufacturer": "OIG Cloud",
                "model": "Service Protection",
                "sw_version": "2.0",
            }
            hass.data[DOMAIN][entry.entry_id]["shield_device_info"] = shield_device_info

            _LOGGER.debug("ServiceShield data prepared for sensors")

            # OPRAVA: Přidání debug logování pro ServiceShield stav
            _LOGGER.info(f"ServiceShield status: {service_shield.get_shield_status()}")
            _LOGGER.info(f"ServiceShield queue info: {service_shield.get_queue_info()}")

        # Vyčištění starých/nepoužívaných zařízení před registrací nových
        await _cleanup_unused_devices(hass, entry)

        # Vždy registrovat sensor platform
        await hass.config_entries.async_forward_entry_setups(entry, ["sensor"])

        # OPRAVA: Dashboard registrujeme až TERAZ - po vytvoření všech senzorů A POUZE pokud je enabled
        if dashboard_enabled:
            await _setup_frontend_panel(hass, entry)
            _LOGGER.info("OIG Cloud Dashboard panel enabled and registered")
        else:
            await _remove_frontend_panel(hass, entry)
            _LOGGER.info(
                "OIG Cloud Dashboard panel disabled - panel not registered"
            )  # OPRAVA: lepší log message

        # Přidáme listener pro změny konfigurace - OPRAVEN callback na async funkci
        entry.async_on_unload(entry.add_update_listener(async_update_options))

        # Async importy pro vyhnání se blokování event loopu
        from .services import (
            async_setup_services,
            async_setup_entry_services_with_shield,
        )

        # Setup základních služeb (pouze jednou pro celou integraci)
        if len([k for k in hass.data[DOMAIN].keys() if k != "shield"]) == 1:
            await async_setup_services(hass)

        # Setup entry-specific služeb s shield ochranou
        # OPRAVA: Předání service_shield přímo, ne z hass.data
        await async_setup_entry_services_with_shield(hass, entry, service_shield)

        # OPRAVA: Zajistit, že ServiceShield je připojený k volání služeb
        if service_shield:
            _LOGGER.info(
                "ServiceShield je aktivní a připravený na interceptování služeb"
            )
            # Test interceptu - simulace volání pro debug
            _LOGGER.debug(f"ServiceShield pending: {len(service_shield.pending)}")
            _LOGGER.debug(f"ServiceShield queue: {len(service_shield.queue)}")
            _LOGGER.debug(f"ServiceShield running: {service_shield.running}")

            # OPRAVA: Explicitní spuštění monitorování
            _LOGGER.debug("Ověřuji, že ServiceShield monitoring běží...")

            # Přidáme test callback pro ověření funkčnosti
            async def test_shield_monitoring(_now: Any) -> None:
                status = service_shield.get_shield_status()
                queue_info = service_shield.get_queue_info()
                _LOGGER.debug(
                    f"[OIG Shield] Test monitoring tick - pending: {len(service_shield.pending)}, queue: {len(service_shield.queue)}, running: {service_shield.running}"
                )
                _LOGGER.debug(f"[OIG Shield] Status: {status}")
                _LOGGER.debug(f"[OIG Shield] Queue info: {queue_info}")

                # OPRAVA: Debug telemetrie - ukážeme co by se odesílalo
                if service_shield.telemetry_handler:
                    _LOGGER.debug("[OIG Shield] Telemetry handler je aktivní")
                    if hasattr(service_shield, "_log_telemetry"):
                        _LOGGER.debug(
                            "[OIG Shield] Telemetry logging metoda je dostupná"
                        )
                else:
                    _LOGGER.debug("[OIG Shield] Telemetry handler není aktivní")

            # Registrujeme test callback na kratší interval pro debug
            from homeassistant.helpers.event import async_track_time_interval
            from datetime import timedelta

            entry.async_on_unload(
                async_track_time_interval(
                    hass, test_shield_monitoring, timedelta(seconds=30)
                )
            )

        else:
            _LOGGER.warning("ServiceShield není dostupný - služby nebudou chráněny")

        # OPRAVA: ODSTRANĚNÍ duplicitní registrace služeb - způsobovala přepsání správného schématu
        # Služby se už registrovaly výše v async_setup_entry_services_with_shield
        # await services.async_setup_services(hass)  # ODSTRANĚNO
        # await services.async_setup_entry_services(hass, entry)  # ODSTRANĚNO

        _LOGGER.debug("OIG Cloud integration setup complete")
        return True

    except Exception as e:
        _LOGGER.error(f"Error initializing OIG Cloud: {e}", exc_info=True)
        raise ConfigEntryNotReady(f"Error initializing OIG Cloud: {e}") from e


async def _setup_telemetry(hass: core.HomeAssistant, username: str) -> None:
    """Setup telemetry if enabled."""
    try:
        _LOGGER.debug("Starting telemetry setup...")

        email_hash = hashlib.sha256(username.encode("utf-8")).hexdigest()
        hass_id = hashlib.sha256(hass.data["core.uuid"].encode("utf-8")).hexdigest()

        _LOGGER.debug(
            f"Telemetry identifiers - Email hash: {email_hash[:16]}..., HASS ID: {hass_id[:16]}..."
        )

        # Přesuneme import do async executor aby neblokoval event loop
        def _import_and_setup_telemetry() -> Any:
            try:
                _LOGGER.debug("Importing REST telemetry modules...")
                from .shared.logging import setup_otel_logging

                _LOGGER.debug("Setting up REST telemetry logging...")
                handler = setup_otel_logging(email_hash, hass_id)

                # Přidáme handler do root loggeru pro OIG Cloud
                oig_logger = logging.getLogger("custom_components.oig_cloud")
                oig_logger.addHandler(handler)
                oig_logger.setLevel(logging.DEBUG)

                _LOGGER.debug(
                    f"Telemetry handler attached to logger: {oig_logger.name}"
                )
                _LOGGER.info("REST telemetry successfully initialized")

                return handler
            except Exception as e:
                _LOGGER.error(f"Error in telemetry setup executor: {e}", exc_info=True)
                raise

        handler = await hass.async_add_executor_job(_import_and_setup_telemetry)
        _LOGGER.debug("REST telemetry setup completed via executor")

        # Test log pro ověření funkčnosti
        _LOGGER.info("TEST: Telemetry test message - this should appear in New Relic")

    except Exception as e:
        _LOGGER.warning(f"Failed to setup telemetry: {e}", exc_info=True)
        # Pokračujeme bez telemetrie


async def async_unload_entry(
    hass: HomeAssistant, entry: config_entries.ConfigEntry
) -> bool:
    """Unload a config entry."""
    # Odebrání dashboard panelu při unload
    await _remove_frontend_panel(hass, entry)

    # NOVÉ: Cleanup session manageru
    if DOMAIN in hass.data and entry.entry_id in hass.data[DOMAIN]:
        session_manager = hass.data[DOMAIN][entry.entry_id].get("session_manager")
        if session_manager:
            _LOGGER.debug("Closing session manager")
            await session_manager.close()

    unload_ok = await hass.config_entries.async_unload_platforms(entry, ["sensor"])
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id, None)
    return unload_ok


async def async_reload_entry(config_entry: config_entries.ConfigEntry) -> None:
    """Reload config entry."""
    hass = config_entry.hass
    await async_unload_entry(hass, config_entry)
    await async_setup_entry(hass, config_entry)


async def async_update_options(
    hass: HomeAssistant, config_entry: config_entries.ConfigEntry
) -> None:
    """Update options with dashboard management."""
    old_options = config_entry.options
    new_options = dict(config_entry.options)

    # Kontrola změny dashboard nastavení
    old_dashboard_enabled = old_options.get("enable_dashboard", False)
    new_dashboard_enabled = new_options.get("enable_dashboard", False)

    _LOGGER.debug(
        f"Dashboard options update: old={old_dashboard_enabled}, new={new_dashboard_enabled}"
    )

    if old_dashboard_enabled != new_dashboard_enabled:
        _LOGGER.info(
            f"Dashboard setting changed: {old_dashboard_enabled} -> {new_dashboard_enabled}"
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


async def _cleanup_unused_devices(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Vyčištění nepoužívaných zařízení."""
    try:
        from homeassistant.helpers import device_registry as dr
        from homeassistant.helpers import entity_registry as er

        device_registry = dr.async_get(hass)
        entity_registry = er.async_get(hass)

        # Najdeme všechna zařízení pro tuto integraci
        devices = dr.async_entries_for_config_entry(device_registry, entry.entry_id)

        devices_to_remove = []
        for device in devices:
            device_name = device.name or ""
            should_keep = True

            # Definujeme pravidla pro zachování zařízení
            keep_patterns = [
                "OIG.*Statistics",  # Staré statistiky (regex pattern)
                "ČEZ Battery Box",
                "OIG Cloud Home",
                "Analytics & Predictions",
                "ServiceShield",
            ]
            for pattern in keep_patterns:
                if pattern in device_name:
                    should_keep = True
                    break
            else:
                # Pokud neodpovídá keep patterns, zkontrolujeme remove patterns
                remove_patterns = [
                    "OIG Cloud Shield",  # Staré duplicity
                    "OIG.*Statistics",  # Staré statistiky (regex pattern)
                ]

                # Zkontrolujeme, jestli zařízení odpovídá keep patterns
                for pattern in keep_patterns:
                    if re.search(pattern, device_name):
                        should_keep = False
                        break
                else:
                    # Pokud nemá žádné entity, můžeme smazat
                    device_entities = er.async_entries_for_device(
                        entity_registry, device.id
                    )
                    if not device_entities:
                        should_keep = False

            if not should_keep:
                devices_to_remove.append(device)
                _LOGGER.info(
                    f"Marking device for removal: {device.name} (ID: {device.id})"
                )
            else:
                _LOGGER.debug(f"Keeping device: {device.name} (ID: {device.id})")

        # Smažeme nepoužívaná zařízení
        for device in devices_to_remove:
            try:
                _LOGGER.info(f"Removing unused device: {device.name} (ID: {device.id})")
                device_registry.async_remove_device(device.id)
            except Exception as e:
                _LOGGER.warning(f"Error removing device {device.id}: {e}")

        if devices_to_remove:
            _LOGGER.info(f"Removed {len(devices_to_remove)} unused devices")
        else:
            _LOGGER.debug("No unused devices found to remove")
    except Exception as e:
        _LOGGER.warning(f"Error cleaning up devices: {e}")
