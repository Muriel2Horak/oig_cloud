"""ČHMÚ weather warning sensors pro OIG Cloud integraci."""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers import aiohttp_client
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.helpers.storage import Store

from .base_sensor import OigCloudSensor

_LOGGER = logging.getLogger(__name__)

CHMU_CAP_FEED_SOURCE = "ČHMÚ CAP Feed"
CHMU_NONE_LABEL = "Žádné"


class OigCloudChmuSensor(OigCloudSensor):
    """Senzor pro ČHMÚ meteorologická varování."""

    def __getattribute__(self, name: str) -> Any:
        if name == "icon":
            return object.__getattribute__(self, "_icon_for_severity")(
                object.__getattribute__(self, "_compute_severity")()
            )
        if name in {"state", "native_value", "extra_state_attributes"}:
            object.__getattribute__(self, "_refresh_entity_state")()
            object.__getattribute__(self, "__dict__").pop(name, None)
        return super().__getattribute__(name)

    def __init__(
        self,
        coordinator: Any,
        sensor_type: str,
        config_entry: ConfigEntry,
        device_info: DeviceInfo,
    ) -> None:
        super().__init__(coordinator, sensor_type)
        self._config_entry = config_entry
        self._device_info = device_info
        self._attr_device_info = device_info

        # Nastavit název podle name_cs
        from ..sensors.SENSOR_TYPES_CHMU import SENSOR_TYPES_CHMU

        sensor_config = SENSOR_TYPES_CHMU.get(sensor_type, {})
        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")

        self._attr_name = name_cs or name_en or sensor_type

        self._last_warning_data: Optional[Dict[str, Any]] = None
        self._last_api_call: float = 0
        self._update_interval_remover: Optional[Any] = None

        # Storage key pro persistentní uložení
        self._storage_key = f"oig_chmu_warnings_{self._box_id}"

        self._refresh_entity_state()

    async def async_added_to_hass(self) -> None:
        """Při přidání do HA - nastavit periodické aktualizace."""
        await super().async_added_to_hass()

        # Načtení dat z persistentního úložiště
        await self._load_persistent_data()

        # Nastavit hodinové aktualizace (60 minut)
        interval = timedelta(hours=1)
        self._update_interval_remover = async_track_time_interval(
            self.hass, self._periodic_update, interval
        )
        _LOGGER.debug("🌦️ ČHMÚ warnings periodic updates enabled (60 min)")

        # Okamžitá inicializace dat při startu - pouze pro hlavní senzor
        if self._sensor_type == "chmu_warning_level" and self._should_fetch_data():
            _LOGGER.debug(
                f"🌦️ Data is outdated (last call: {datetime.fromtimestamp(self._last_api_call).strftime('%Y-%m-%d %H:%M:%S') if self._last_api_call else 'never'}), triggering immediate fetch"
            )
            # Spustíme úlohu na pozadí s malým zpožděním
            self.hass.async_create_task(self._delayed_initial_fetch())
        else:
            # Pokud máme načtená data z úložiště, sdílíme je s koordinátorem
            if self._last_warning_data:
                setattr(self.coordinator, "chmu_warning_data", self._last_warning_data)
            self._refresh_entity_state()
            _LOGGER.debug(
                f"🌦️ Loaded warning data from storage (last call: {datetime.fromtimestamp(self._last_api_call).strftime('%Y-%m-%d %H:%M:%S')}), skipping immediate fetch"
            )

    async def _load_persistent_data(self) -> None:
        """Načte data z persistentního úložiště."""
        try:
            store: Store[Dict[str, Any]] = Store(
                self.hass,
                version=1,
                key=self._storage_key,
            )
            data = await store.async_load()

            if data:
                # Načtení času posledního API volání
                if isinstance(data.get("last_api_call"), (int, float)):
                    self._last_api_call = float(data["last_api_call"])
                    _LOGGER.debug(
                        f"🌦️ Loaded last API call time: {datetime.fromtimestamp(self._last_api_call).strftime('%Y-%m-%d %H:%M:%S')}"
                    )

                # Načtení warning dat
                if isinstance(data.get("warning_data"), dict):
                    self._last_warning_data = data["warning_data"]
                    _LOGGER.debug("🌦️ Loaded warning data from storage")
                else:
                    _LOGGER.debug("🌦️ No warning data found in storage")
            else:
                _LOGGER.debug("🌦️ No previous data found in storage")

            self._refresh_entity_state()

        except Exception as e:
            _LOGGER.warning(f"🌦️ Failed to load persistent data: {e}")
            self._last_api_call = 0
            self._last_warning_data = None
            self._refresh_entity_state()

    async def _save_persistent_data(self) -> None:
        """Uloží data do persistentního úložiště."""
        try:
            store: Store[Dict[str, Any]] = Store(
                self.hass,
                version=1,
                key=self._storage_key,
            )

            save_data = {
                "last_api_call": self._last_api_call,
                "warning_data": self._last_warning_data,
                "saved_at": datetime.now().isoformat(),
            }

            await store.async_save(save_data)
            _LOGGER.debug(
                f"🌦️ Saved persistent data: API call time {datetime.fromtimestamp(self._last_api_call).strftime('%Y-%m-%d %H:%M:%S')}"
            )
        except Exception as e:
            _LOGGER.warning(f"🌦️ Failed to save persistent data: {e}")

    def _should_fetch_data(self) -> bool:
        """Rozhodne zda je potřeba načíst nová data."""
        current_time = time.time()

        # Pokud nemáme žádná data
        if not self._last_api_call:
            return True

        time_since_last = current_time - self._last_api_call

        # Fetch pokud už uplynula hodina (3600 sekund)
        return time_since_last >= 3600

    async def _delayed_initial_fetch(self) -> None:
        """Zpožděné počáteční stažení dat."""
        # Počkat 5 sekund na inicializaci HA
        await asyncio.sleep(5)
        await self._fetch_warning_data()

    async def _periodic_update(self, now: datetime) -> None:
        """Periodická aktualizace dat."""
        if self._sensor_type == "chmu_warning_level":
            await self._fetch_warning_data()

    async def _fetch_warning_data(self) -> None:
        """Stažení dat z ČHMÚ API."""
        try:
            _LOGGER.debug("🌦️ Fetching ČHMÚ warning data")

            # Získat GPS souřadnice
            latitude, longitude = self._get_gps_coordinates()

            if latitude is None or longitude is None:
                _LOGGER.error("🌦️ No GPS coordinates available, cannot fetch warnings")
                self._attr_available = False
                return

            # Získat ČHMÚ API klienta z coordinatoru
            chmu_api = getattr(self.coordinator, "chmu_api", None)
            if not chmu_api:
                _LOGGER.error("🌦️ ČHMÚ API not initialized in coordinator")
                self._attr_available = False
                self._refresh_entity_state()
                return

            # Fetch data pomocí aiohttp session z HA
            session = aiohttp_client.async_get_clientsession(self.hass)

            warning_data = await chmu_api.get_warnings(latitude, longitude, session)

            # Uložit data
            self._last_warning_data = warning_data
            self._last_api_call = time.time()

            # Sdílet data s koordinátorem
            setattr(self.coordinator, "chmu_warning_data", warning_data)

            # Uložit do persistentního úložiště
            await self._save_persistent_data()

            # Označit jako dostupný
            self._attr_available = True
            self._refresh_entity_state()

            _LOGGER.debug(
                f"🌦️ ČHMÚ warnings updated: "
                f"{warning_data['all_warnings_count']} total, "
                f"{warning_data['local_warnings_count']} local, "
                f"severity={warning_data['severity_level']}"
            )

        except Exception as e:
            # ChmuApiError (including HTTP 404) is expected when endpoint changes; don't spam tracebacks.
            try:
                from ..api.api_chmu import ChmuApiError

                if isinstance(e, ChmuApiError):
                    _LOGGER.warning("🌦️ ČHMÚ API error: %s", e)
                else:
                    raise
            except Exception:
                _LOGGER.error(f"🌦️ Error fetching ČHMÚ warning data: {e}", exc_info=True)
            # DŮLEŽITÉ: Při chybě API zachováváme stará data místo jejich mazání!
            if self._last_warning_data:
                _LOGGER.warning(
                    f"🌦️ ČHMÚ API nedostupné - používám cached data z {self._last_warning_data.get('last_update', 'unknown')}"
                )
                # Ponecháváme self._attr_available = True, protože máme stará platná data
            else:
                # Nemáme žádná data - označíme jako nedostupný
                self._attr_available = False
            self._refresh_entity_state()

    def _refresh_entity_state(self) -> None:
        warning_data = self._get_warning_data()
        severity = self._compute_severity()
        self._attr_native_value = severity
        self._attr_icon = self._icon_for_severity(severity)
        if not warning_data:
            self._attr_extra_state_attributes = _empty_warning_attrs()
            return

        severity_distribution = self._get_severity_distribution()
        if self._sensor_type == "chmu_warning_level_global":
            self._attr_extra_state_attributes = _build_global_warning_attrs(
                warning_data, severity_distribution
            )
            return

        self._attr_extra_state_attributes = _build_local_warning_attrs(
            warning_data, severity_distribution
        )

    @staticmethod
    def _icon_for_severity(severity: int) -> str:
        if severity >= 4:
            return "mdi:alert-octagon"
        if severity >= 3:
            return "mdi:alert"
        if severity >= 2:
            return "mdi:alert-circle"
        if severity >= 1:
            return "mdi:alert-circle-outline"
        return "mdi:check-circle-outline"

    def _handle_coordinator_update(self) -> None:
        self._refresh_entity_state()
        super()._handle_coordinator_update()

    def _get_gps_coordinates(self) -> tuple[Optional[float], Optional[float]]:
        """
        Získá GPS souřadnice v pořadí priority:
        1. Solar Forecast config
        2. HA General Settings
        3. Praha default
        """
        # 1. Solar Forecast config
        if self._config_entry.options.get("enable_solar_forecast", False):
            lat = self._config_entry.options.get("solar_forecast_latitude")
            lon = self._config_entry.options.get("solar_forecast_longitude")
            if lat is not None and lon is not None:
                _LOGGER.debug(f"🌦️ Using GPS from Solar Forecast: {lat}, {lon}")
                return (float(lat), float(lon))

        # 2. HA General Settings
        if hasattr(self.hass.config, "latitude") and hasattr(
            self.hass.config, "longitude"
        ):
            lat = self.hass.config.latitude
            lon = self.hass.config.longitude
            if lat is not None and lon is not None:
                _LOGGER.debug(f"🌦️ Using GPS from HA config: {lat}, {lon}")
                return (float(lat), float(lon))

        # 3. Praha default
        _LOGGER.warning("🌦️ No GPS configured, using Praha default")
        return (50.0875, 14.4213)

    def _get_warning_data(self) -> Optional[Dict[str, Any]]:
        if self._last_warning_data:
            return self._last_warning_data
        if hasattr(self.coordinator, "chmu_warning_data"):
            data = getattr(self.coordinator, "chmu_warning_data", None)
            if isinstance(data, dict):
                self._last_warning_data = data
                return data
        return None

    @property
    def available(self) -> bool:
        """ČHMÚ warnings are available when we have cached data (even if coordinator isn't ready yet)."""
        if self._get_warning_data():
            return True
        return super().available

    @property
    def device_info(self) -> Any:
        return self._device_info

    def _compute_severity(self) -> int:
        """Compute severity level (0-4)."""
        data = self._get_warning_data()
        if not data:
            return 0

        if self._sensor_type == "chmu_warning_level_global":
            return int(data.get("highest_severity_cz", 0) or 0)

        # Local sensor - only treat as warning if there is at least 1 real alert
        top = data.get("top_local_warning") or {}
        event = (top.get("event") or "").strip()
        if not event or event.startswith("Žádná") or event.startswith("Žádný"):
            return 0
        return int(data.get("severity_level", 0) or 0)

    def _get_severity_distribution(self) -> Dict[str, int]:
        """Vrátí rozdělení severity pro všechna varování."""
        if not self._last_warning_data:
            return {"Minor": 0, "Moderate": 0, "Severe": 0, "Extreme": 0}

        all_warnings = self._last_warning_data.get("all_warnings", [])
        distribution = {"Minor": 0, "Moderate": 0, "Severe": 0, "Extreme": 0}

        for warning in all_warnings:
            severity = warning.get("severity", "Unknown")
            if severity in distribution:
                distribution[severity] += 1

        return distribution


def _empty_warning_attrs() -> Dict[str, Any]:
    return {
        "warnings_count": 0,
        "last_update": None,
        "source": CHMU_CAP_FEED_SOURCE,
        "all_warnings_details": [],
    }


def _build_global_warning_attrs(
    data: Dict[str, Any], severity_distribution: Dict[str, int]
) -> Dict[str, Any]:
    all_warnings_raw = data.get("all_warnings", [])
    all_warnings_limited = [_short_warning(w) for w in all_warnings_raw[:5]]
    return {
        "warnings_count": data.get("all_warnings_count", 0),
        "all_warnings": all_warnings_limited,
        "all_warnings_details": all_warnings_limited,
        "warnings_truncated": len(all_warnings_raw) > 5,
        "highest_severity": data.get("highest_severity_cz", 0),
        "severity_distribution": severity_distribution,
        "last_update": data.get("last_update"),
        "source": data.get("source", CHMU_CAP_FEED_SOURCE),
    }


def _short_warning(warning: Dict[str, Any]) -> Dict[str, Any]:
    desc = warning.get("description", "")
    return {
        "event": warning.get("event", ""),
        "severity": warning.get("severity", 0),
        "onset": warning.get("onset", ""),
        "expires": warning.get("expires", ""),
        "description": desc[:117] + "..." if len(desc) > 120 else desc,
    }


def _build_local_warning_attrs(
    data: Dict[str, Any], severity_distribution: Dict[str, int]
) -> Dict[str, Any]:
    top_warning = data.get("top_local_warning")
    if not top_warning:
        return _no_local_warning_attrs(data)

    all_local_events, all_warnings_details = _collect_local_warning_details(data)
    desc = _trim_text(top_warning.get("description", ""), limit=300)
    instr = _trim_text(top_warning.get("instruction", ""), limit=300)

    return {
        "event_type": top_warning.get("event", CHMU_NONE_LABEL),
        "severity": top_warning.get("severity", CHMU_NONE_LABEL),
        "onset": top_warning.get("onset"),
        "expires": top_warning.get("expires"),
        "eta_hours": top_warning.get("eta_hours", 0),
        "description": desc,
        "instruction": instr,
        "warnings_count": len(all_local_events),
        "all_warnings": all_local_events[:5],
        "all_warnings_details": all_warnings_details,
        "last_update": data.get("last_update"),
        "severity_distribution": severity_distribution,
        "source": data.get("source", CHMU_CAP_FEED_SOURCE),
    }


def _no_local_warning_attrs(data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "event_type": CHMU_NONE_LABEL,
        "severity": CHMU_NONE_LABEL,
        "onset": None,
        "expires": None,
        "eta_hours": 0,
        "description": "",
        "instruction": "",
        "warnings_count": 0,
        "all_warnings": [],
        "all_warnings_details": [],
        "last_update": data.get("last_update"),
        "source": data.get("source", CHMU_CAP_FEED_SOURCE),
    }


def _collect_local_warning_details(
    data: Dict[str, Any],
) -> tuple[list[str], list[dict[str, Any]]]:
    all_local_events: list[str] = []
    all_warnings_details: list[dict[str, Any]] = []
    for warning in data.get("local_warnings", []):
        event = warning.get("event", "")
        if event.startswith("Žádná") or event.startswith("Žádný"):
            continue
        all_local_events.append(event)
        if len(all_warnings_details) < 5:
            all_warnings_details.append(
                {
                    "event": event,
                    "severity": warning.get("severity", ""),
                    "onset": warning.get("onset"),
                    "expires": warning.get("expires"),
                    "regions": _regions_from_warning(warning),
                    "description": _trim_text(warning.get("description", "")),
                    "instruction": _trim_text(warning.get("instruction", "")),
                }
            )
    return all_local_events, all_warnings_details


def _regions_from_warning(warning: Dict[str, Any]) -> list[str]:
    regions: list[str] = []
    try:
        for area in warning.get("areas") or []:
            desc = (area or {}).get("description")
            if isinstance(desc, str) and desc.strip():
                regions.append(desc.strip())
    except Exception:
        regions = []
    out: list[str] = []
    for region in regions:
        if region not in out:
            out.append(region)
        if len(out) >= 8:
            break
    return out


def _trim_text(value: Any, limit: int = 220) -> str:
    text = value if isinstance(value, str) else ""
    text = text.strip()
    if len(text) > limit:
        return text[: limit - 3] + "..."
    return text
