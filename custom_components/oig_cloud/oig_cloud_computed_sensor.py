"""Computed sensor implementation for OIG Cloud integration."""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union

from homeassistant.helpers.event import async_track_time_change, async_track_state_change_event
from homeassistant.helpers.restore_state import RestoreEntity
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util
from .oig_cloud_sensor import OigCloudSensor
from .sensor_types import SENSOR_TYPES

_LOGGER = logging.getLogger(__name__)

# Shared storage for all energy sensors per box
# Key: oig_cloud.energy_data_{box_id}
# Structure: {"energy": {...}, "last_save": "ISO timestamp", "version": 1}
ENERGY_STORAGE_VERSION = 1
_energy_stores: Dict[str, Store] = {}
_energy_data_cache: Dict[str, Dict[str, float]] = {}

_LANGS: Dict[str, Dict[str, str]] = {
    "on": {"en": "On", "cs": "Zapnuto"},
    "off": {"en": "Vypnuto", "cs": "Vypnuto"},
    "unknown": {"en": "Unknown", "cs": "Neznámý"},
    "changing": {"en": "Changing in progress", "cs": "Probíhá změna"},
}


class OigCloudComputedSensor(OigCloudSensor, RestoreEntity):
    def __init__(self, coordinator: Any, sensor_type: str) -> None:
        super().__init__(coordinator, sensor_type)

        sensor_config = SENSOR_TYPES.get(sensor_type, {})

        name_cs = sensor_config.get("name_cs")
        name_en = sensor_config.get("name")

        # Preferujeme český název, fallback na anglický, fallback na sensor_type
        self._attr_name = name_cs or name_en or sensor_type

        self._last_update: Optional[datetime] = None
        self._attr_extra_state_attributes: Dict[str, Any] = {}

        self._energy: Dict[str, float] = {
            "charge_today": 0.0,
            "charge_month": 0.0,
            "charge_year": 0.0,
            "discharge_today": 0.0,
            "discharge_month": 0.0,
            "discharge_year": 0.0,
            "charge_fve_today": 0.0,
            "charge_fve_month": 0.0,
            "charge_fve_year": 0.0,
            "charge_grid_today": 0.0,
            "charge_grid_month": 0.0,
            "charge_grid_year": 0.0,
        }

        self._last_update_time: Optional[datetime] = None
        self._monitored_sensors: Dict[str, Any] = {}

        # Persistent storage flag - will save periodically
        self._last_storage_save: Optional[datetime] = None
        self._storage_save_interval = timedelta(minutes=5)

        # Speciální handling pro real_data_update senzor
        if sensor_type == "real_data_update":
            self._is_real_update_sensor = True
            self._initialize_monitored_sensors()
        else:
            self._is_real_update_sensor = False

        # State-change listeners for HA entity dependencies
        self._local_dependencies: list[str] = []
        self._dep_unsub = None

    def _get_local_number(self, entity_id: str) -> Optional[float]:
        """Read numeric value from HA state, returning None if missing/invalid."""
        if not getattr(self, "hass", None):
            return None
        st = self.hass.states.get(entity_id)
        if not st or st.state in (None, "unknown", "unavailable", ""):
            return None
        try:
            return float(st.state)
        except (ValueError, TypeError):
            return None

    def _get_local_datetime(self, entity_id: str) -> Optional[datetime]:
        """Read datetime-ish value from HA state, returning UTC datetime if parseable."""
        if not getattr(self, "hass", None):
            return None
        st = self.hass.states.get(entity_id)
        if not st or st.state in (None, "unknown", "unavailable", ""):
            return None

        value: Any = st.state
        try:
            if isinstance(value, (int, float)):
                ts = float(value)
                if ts > 1_000_000_000_000:  # ms epoch
                    ts = ts / 1000.0
                return dt_util.dt.datetime.fromtimestamp(ts, tz=dt_util.UTC)
            if isinstance(value, str):
                s = value.strip()
                if s.isdigit():
                    ts = float(s)
                    if ts > 1_000_000_000_000:  # ms epoch
                        ts = ts / 1000.0
                    return dt_util.dt.datetime.fromtimestamp(ts, tz=dt_util.UTC)
                dt = dt_util.parse_datetime(s)
                if dt is None:
                    dt = dt_util.dt.datetime.fromisoformat(s)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=dt_util.DEFAULT_TIME_ZONE)
                return dt_util.as_utc(dt)
        except Exception:
            return None
        return None

    def _get_local_value_for_sensor_type(self, sensor_type: str) -> Optional[float]:
        """Get value from HA based on sensor definition (uses local_entity_id/suffix)."""
        try:
            cfg = SENSOR_TYPES.get(sensor_type)
            if not cfg:
                return None

            entity_id = cfg.get("local_entity_id")
            if not entity_id:
                suffix = cfg.get("local_entity_suffix")
                if suffix and self._box_id and self._box_id != "unknown":
                    entity_id = f"sensor.oig_local_{self._box_id}_{suffix}"

            if not entity_id:
                return None

            return self._get_local_number(entity_id)
        except Exception:
            return None

    def _build_local_dependencies(self) -> list[str]:
        """Return list of entity_ids this computed sensor depends on."""
        deps: list[str] = []
        st = self._sensor_type
        box: Optional[str] = self._box_id if self._box_id and self._box_id != "unknown" else None

        # Direct mapping from SENSOR_TYPES (local_entity_id/suffix)
        try:
            from .sensor_types import SENSOR_TYPES

            cfg = SENSOR_TYPES.get(st, {})
            ent = cfg.get("local_entity_id")
            if not ent:
                suffix = cfg.get("local_entity_suffix")
                if suffix and box:
                    ent = f"sensor.oig_local_{box}_{suffix}"
            if ent:
                deps.append(ent)
        except Exception:
            pass

        # Special sums
        if st == "ac_in_aci_wtotal":
            if not box:
                return sorted(set(d for d in deps if d))
            base = f"sensor.oig_local_{box}_tbl_ac_in_aci_w"
            deps += [f"{base}r", f"{base}s", f"{base}t"]
        if st == "actual_aci_wtotal":
            if not box:
                return sorted(set(d for d in deps if d))
            base = f"sensor.oig_local_{box}_tbl_actual_aci_w"
            deps += [f"{base}r", f"{base}s", f"{base}t"]
        if st == "actual_fv_total":
            if not box:
                return sorted(set(d for d in deps if d))
            deps += [
                f"sensor.oig_local_{box}_tbl_actual_fv_p1",
                f"sensor.oig_local_{box}_tbl_actual_fv_p2",
            ]
        if st == "dc_in_fv_total":
            if not box:
                return sorted(set(d for d in deps if d))
            deps += [
                f"sensor.oig_local_{box}_tbl_dc_in_fv_p1",
                f"sensor.oig_local_{box}_tbl_dc_in_fv_p2",
            ]
        if st in ("batt_batt_comp_p_charge", "batt_batt_comp_p_discharge"):
            if not box:
                return sorted(set(d for d in deps if d))
            deps.append(f"sensor.oig_local_{box}_tbl_actual_bat_p")

        # Battery capacity helpers
        if st in ("usable_battery_capacity", "missing_battery_kwh", "remaining_usable_capacity"):
            if not box:
                return sorted(set(d for d in deps if d))
            deps.append(f"sensor.oig_local_{box}_tbl_actual_bat_c")
            deps.append(f"sensor.oig_local_{box}_tbl_batt_prms_bat_min")

        # Time to full/empty uses bat_p and bat_c
        if st in ("time_to_full", "time_to_empty"):
            if not box:
                return sorted(set(d for d in deps if d))
            deps.append(f"sensor.oig_local_{box}_tbl_actual_bat_c")
            deps.append(f"sensor.oig_local_{box}_tbl_actual_bat_p")

        # Deduplicate
        return sorted(set(d for d in deps if d))

    def _get_energy_store(self) -> Optional[Store]:
        """Get or create the shared energy store for this box."""
        if self._box_id not in _energy_stores and hasattr(self, "hass") and self.hass:
            _energy_stores[self._box_id] = Store(
                self.hass,
                version=ENERGY_STORAGE_VERSION,
                key=f"oig_cloud.energy_data_{self._box_id}",
            )
            _LOGGER.debug(
                f"✅ Initialized Energy Storage: oig_cloud.energy_data_{self._box_id}"
            )
        return _energy_stores.get(self._box_id)

    async def _load_energy_from_storage(self) -> bool:
        """Load energy data from persistent storage. Returns True if data was loaded."""
        # Already loaded for this box?
        if self._box_id in _energy_data_cache:
            cached = _energy_data_cache[self._box_id]
            for key in self._energy:
                if key in cached:
                    self._energy[key] = cached[key]
            _LOGGER.debug(f"[{self.entity_id}] ✅ Loaded energy from cache")
            return True

        store = self._get_energy_store()
        if not store:
            return False

        try:
            data = await store.async_load()
            if data and "energy" in data:
                stored_energy = data["energy"]
                for key in self._energy:
                    if key in stored_energy:
                        self._energy[key] = float(stored_energy[key])

                # Cache for other sensors
                _energy_data_cache[self._box_id] = stored_energy.copy()

                last_save = data.get("last_save", "unknown")
                _LOGGER.info(
                    f"[{self.entity_id}] ✅ Loaded energy from storage (saved: {last_save}): "
                    f"charge_month={stored_energy.get('charge_month', 0):.0f} Wh"
                )
                return True
        except Exception as e:
            _LOGGER.error(f"[{self.entity_id}] Error loading energy from storage: {e}")
        return False

    async def _save_energy_to_storage(self, force: bool = False) -> None:
        """Save energy data to persistent storage (throttled to every 5 min unless forced)."""
        now = datetime.utcnow()

        # Throttle saves unless forced
        if not force and self._last_storage_save:
            elapsed = now - self._last_storage_save
            if elapsed < self._storage_save_interval:
                return

        store = self._get_energy_store()
        if not store:
            return

        try:
            # Update cache
            _energy_data_cache[self._box_id] = self._energy.copy()

            data = {
                "version": ENERGY_STORAGE_VERSION,
                "energy": self._energy.copy(),
                "last_save": now.isoformat(),
            }
            await store.async_save(data)
            self._last_storage_save = now
            _LOGGER.debug(
                f"[{self.entity_id}] 💾 Saved energy to storage: "
                f"charge_month={self._energy.get('charge_month', 0):.0f} Wh"
            )
        except Exception as e:
            _LOGGER.error(f"[{self.entity_id}] Error saving energy to storage: {e}")

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        async_track_time_change(
            self.hass, self._reset_daily, hour=0, minute=0, second=0
        )

        # Priority 1: Load from persistent storage (more reliable than restore_state)
        loaded_from_storage = await self._load_energy_from_storage()

        # Priority 2: Fallback to restore_state if storage was empty
        if not loaded_from_storage:
            old_state = await self.async_get_last_state()
            if old_state and old_state.attributes:
                # Check if restore_state has valid data (not zeroed)
                restore_charge_month = old_state.attributes.get("charge_month", 0)
                if restore_charge_month and float(restore_charge_month) > 1000:
                    _LOGGER.info(
                        f"[{self.entity_id}] 📥 Restoring from HA state (storage empty): "
                        f"charge_month={restore_charge_month}"
                    )
                    for key in self._energy:
                        if key in old_state.attributes:
                            self._energy[key] = float(old_state.attributes[key])
                    # Save to storage for future
                    await self._save_energy_to_storage(force=True)
                else:
                    _LOGGER.warning(
                        f"[{self.entity_id}] ⚠️ Restore state has zeroed/invalid data "
                        f"(charge_month={restore_charge_month}), keeping defaults"
                    )

        # Nastavit listener na změny lokálních entit, které ovlivňují computed senzor
        if not self._local_dependencies:
            self._local_dependencies = self._build_local_dependencies()
        if self._local_dependencies:
            deps = self._local_dependencies

            async def _on_dep_change(event):
                # Přepočítat stav ihned po změně závislosti
                self.async_write_ha_state()

            self._dep_unsub = async_track_state_change_event(
                self.hass, deps, _on_dep_change
            )
            # Po registraci listenerů hned přepiš stav, aby byl čerstvý
            self.async_write_ha_state()

    async def _reset_daily(self, *_: Any) -> None:
        now = datetime.utcnow()
        _LOGGER.debug(f"[{self.entity_id}] Resetting daily energy")
        for key in self._energy:
            if key.endswith("today"):
                self._energy[key] = 0.0

        if now.day == 1:
            _LOGGER.debug(f"[{self.entity_id}] Resetting monthly energy")
            for key in self._energy:
                if key.endswith("month"):
                    self._energy[key] = 0.0

        if now.month == 1 and now.day == 1:
            _LOGGER.debug(f"[{self.entity_id}] Resetting yearly energy")
            for key in self._energy:
                if key.endswith("year"):
                    self._energy[key] = 0.0

        # Force save after reset
        await self._save_energy_to_storage(force=True)

    @property
    def state(self) -> Optional[Union[float, str]]:  # noqa: C901
        if self.coordinator.data is None:
            return None

        data = self.coordinator.data
        pv_data = list(data.values())[0]

        # OPRAVA: Kontrola existence "actual" dat pouze tam kde jsou potřeba
        if (
            self._sensor_type
            in [
                "time_to_empty",
                "time_to_full",
                "usable_battery_capacity",
                "missing_battery_kwh",
                "remaining_usable_capacity",
            ]
            and "actual" not in pv_data
        ):
            _LOGGER.warning(
                f"[{self.entity_id}] Live Data nejsou zapnutá v OIG aplikaci. "
                f"Zapněte Live Data v mobilní aplikaci OIG pro správnou funkci computed senzorů."
            )
            return None

        # Speciální handling pro real_data_update senzor
        if self._sensor_type == "real_data_update":
            # If local/hybrid mode is enabled, prefer the proxy "last data" timestamp.
            try:
                from .data_source import DATA_SOURCE_CLOUD_ONLY, get_effective_mode

                entry = getattr(self.coordinator, "config_entry", None)
                if entry is not None and get_effective_mode(self.hass, entry.entry_id) != DATA_SOURCE_CLOUD_ONLY:
                    cfg = SENSOR_TYPES.get("real_data_update", {})
                    ent = cfg.get("local_entity_id")
                    if isinstance(ent, str):
                        local_dt = self._get_local_datetime(ent)
                        if local_dt is not None:
                            self._last_update_time = dt_util.as_local(local_dt)
                            return self._last_update_time.isoformat()
            except Exception:
                pass

            if self._check_for_real_data_changes(pv_data):
                # Používáme lokální čas místo UTC
                self._last_update_time = dt_util.now()
                _LOGGER.debug(
                    f"[{self.entity_id}] Real data update detected at {self._last_update_time}"
                )

            return (
                self._last_update_time.isoformat() if self._last_update_time else None
            )

        # Obecný fallback: pokud máme lokální entitu pro computed senzor, vezmeme její hodnotu
        local_direct = self._get_local_value_for_sensor_type(self._sensor_type)
        if local_direct is not None:
            return local_direct

        if self._sensor_type == "ac_in_aci_wtotal":
            # Preferuj lokální fáze AC_IN
            if self._box_id and self._box_id != "unknown":
                base = f"sensor.oig_local_{self._box_id}_tbl_ac_in_aci_w"
                wr = self._get_local_number(f"{base}r")
                ws = self._get_local_number(f"{base}s")
                wt = self._get_local_number(f"{base}t")
                if wr is not None and ws is not None and wt is not None:
                    return float(wr + ws + wt)
            return float(
                pv_data["ac_in"]["aci_wr"]
                + pv_data["ac_in"]["aci_ws"]
                + pv_data["ac_in"]["aci_wt"]
            )
        if self._sensor_type == "actual_aci_wtotal":
            # Nejprve zkusíme poskládat hodnotu přímo z HA entit (lokální senzory)
            if self._box_id and self._box_id != "unknown":
                base = f"sensor.oig_local_{self._box_id}_tbl_actual_aci_w"
                wr = self._get_local_number(f"{base}r")
                ws = self._get_local_number(f"{base}s")
                wt = self._get_local_number(f"{base}t")
                if wr is not None and ws is not None and wt is not None:
                    return float(wr + ws + wt)

            # Fallback na data v koordinatoru
            if "actual" not in pv_data:
                return 0.0
            return float(
                pv_data["actual"]["aci_wr"]
                + pv_data["actual"]["aci_ws"]
                + pv_data["actual"]["aci_wt"]
            )
        if self._sensor_type == "dc_in_fv_total":
            if self._box_id and self._box_id != "unknown":
                p1 = self._get_local_number(
                    f"sensor.oig_local_{self._box_id}_tbl_dc_in_fv_p1"
                )
                p2 = self._get_local_number(
                    f"sensor.oig_local_{self._box_id}_tbl_dc_in_fv_p2"
                )
                if p1 is not None and p2 is not None:
                    return float(p1 + p2)
            return float(pv_data["dc_in"]["fv_p1"] + pv_data["dc_in"]["fv_p2"])
        if self._sensor_type == "actual_fv_total":
            if self._box_id and self._box_id != "unknown":
                p1 = self._get_local_number(
                    f"sensor.oig_local_{self._box_id}_tbl_actual_fv_p1"
                )
                p2 = self._get_local_number(
                    f"sensor.oig_local_{self._box_id}_tbl_actual_fv_p2"
                )
                if p1 is not None and p2 is not None:
                    return float(p1 + p2)

            if "actual" not in pv_data:
                return 0.0
            return float(pv_data["actual"]["fv_p1"] + pv_data["actual"]["fv_p2"])

        if self._node_id == "boiler" or self._sensor_type == "boiler_current_w":
            return self._get_boiler_consumption(pv_data)

        if self._sensor_type == "batt_batt_comp_p_charge":
            # Preferuj lokální hodnotu bat_p
            p_bat = self._get_local_value_for_sensor_type("batt_batt_comp_p")
            if p_bat is not None:
                return self._get_batt_power_charge({"actual": {"bat_p": p_bat}})
            return self._get_batt_power_charge(pv_data)
        if self._sensor_type == "batt_batt_comp_p_discharge":
            p_bat = self._get_local_value_for_sensor_type("batt_batt_comp_p")
            if p_bat is not None:
                return self._get_batt_power_discharge({"actual": {"bat_p": p_bat}})
            return self._get_batt_power_discharge(pv_data)

        if self._sensor_type.startswith("computed_batt_"):
            return self._accumulate_energy(pv_data)

        if self._sensor_type == "extended_fve_current_1":
            return self._get_extended_fve_current_1(self.coordinator)

        if self._sensor_type == "extended_fve_current_2":
            return self._get_extended_fve_current_2(self.coordinator)

        try:
            bat_p = float(pv_data["box_prms"]["p_bat"])

            # Získat bat_min z batt_prms (minimální nabití v %)
            bat_min_percent = float(pv_data.get("batt_prms", {}).get("bat_min", 20))
            # Využitelná kapacita = 100% - bat_min%
            usable_percent = (100 - bat_min_percent) / 100

            # OPRAVA: Kontrola actual pouze pro tyto hodnoty
            if "actual" not in pv_data:
                _LOGGER.warning(
                    f"[{self.entity_id}] Live Data nejsou zapnutá v OIG aplikaci. "
                    f"Zapněte Live Data v mobilní aplikaci OIG pro správnou funkci computed senzorů."
                )
                return None

            bat_c = float(pv_data["actual"]["bat_c"])  # Battery charge percentage
            bat_power = float(pv_data["actual"]["bat_p"])  # Battery power

            # 1. Využitelná kapacita baterie
            if self._sensor_type == "usable_battery_capacity":
                value = round((bat_p * usable_percent) / 1000, 2)
                return value

            # 2. Kolik kWh chybí do 100%
            if self._sensor_type == "missing_battery_kwh":
                value = round((bat_p * (1 - bat_c / 100)) / 1000, 2)
                return value
            # 3. Zbývající využitelná kapacita
            if self._sensor_type == "remaining_usable_capacity":
                usable = bat_p * usable_percent
                missing = bat_p * (1 - bat_c / 100)
                value = round((usable - missing) / 1000, 2)
                return value

            # 4. Doba do nabití
            if self._sensor_type == "time_to_full":
                missing = bat_p * (1 - bat_c / 100)
                if bat_power > 0:
                    return self._format_time(missing / bat_power)
                elif missing == 0:
                    return "Nabito"
                else:
                    return "Vybíjí se"

            # 5. Doba do vybití
            if self._sensor_type == "time_to_empty":
                usable = bat_p * usable_percent
                missing = bat_p * (1 - bat_c / 100)
                remaining = usable - missing

                # OPRAVA: Kontrola na plně nabitou baterii (100%)
                if bat_c >= 100:
                    return "Nabito"
                elif bat_power < 0:
                    return self._format_time(remaining / abs(bat_power))
                elif remaining == 0:
                    return "Vybito"
                else:
                    return "Nabíjí se"

        except Exception as e:
            _LOGGER.error(
                f"[{{self.entity_id}}] Error computing value: {e}", exc_info=True
            )

        return None

    def _accumulate_energy(self, pv_data: Dict[str, Any]) -> Optional[float]:
        # Pokud existuje lokální entita pro konkrétní computed energii, použij ji přímo
        direct_local = self._get_local_value_for_sensor_type(self._sensor_type)
        if direct_local is not None:
            return direct_local

        try:
            # OPRAVA: Kontrola existence "actual" dat
            if "actual" not in pv_data:
                _LOGGER.warning(
                    f"[{self.entity_id}] Live Data nejsou zapnutá v OIG aplikaci. "
                    f"Energy tracking senzory potřebují Live Data pro správnou funkci. "
                    f"Zapněte Live Data v mobilní aplikaci OIG."
                )
                return None

            now = datetime.utcnow()

            bat_power = float(pv_data["actual"]["bat_p"])
            fv_power = float(pv_data["actual"]["fv_p1"]) + float(
                pv_data["actual"]["fv_p2"]
            )

            if self._last_update is not None:
                delta_seconds = (now - self._last_update).total_seconds()
                wh_increment = (abs(bat_power) * delta_seconds) / 3600.0

                if bat_power > 0:
                    self._energy["charge_today"] += wh_increment
                    self._energy["charge_month"] += wh_increment
                    self._energy["charge_year"] += wh_increment

                    if fv_power > 50:
                        from_fve = min(bat_power, fv_power)
                        from_grid = bat_power - from_fve
                    else:
                        from_fve = 0
                        from_grid = bat_power

                    wh_increment_fve = (from_fve * delta_seconds) / 3600.0
                    wh_increment_grid = (from_grid * delta_seconds) / 3600.0

                    self._energy["charge_fve_today"] += wh_increment_fve
                    self._energy["charge_fve_month"] += wh_increment_fve
                    self._energy["charge_fve_year"] += wh_increment_fve

                    self._energy["charge_grid_today"] += wh_increment_grid
                    self._energy["charge_grid_month"] += wh_increment_grid
                    self._energy["charge_grid_year"] += wh_increment_grid

                elif bat_power < 0:
                    self._energy["discharge_today"] += wh_increment
                    self._energy["discharge_month"] += wh_increment
                    self._energy["discharge_year"] += wh_increment

                _LOGGER.debug(
                    f"[{self.entity_id}] Δt={delta_seconds:.1f}s bat={bat_power:.1f}W fv={fv_power:.1f}W -> ΔWh={wh_increment:.4f}"
                )

            self._last_update = now
            self._attr_extra_state_attributes = {
                k: round(v, 3) for k, v in self._energy.items()
            }

            # Periodic save to persistent storage (throttled)
            if hasattr(self, "hass") and self.hass:
                self.hass.async_create_task(self._save_energy_to_storage())

            return self._get_energy_value()

        except Exception as e:
            _LOGGER.error(f"Error calculating energy: {e}", exc_info=True)
            return None

    def _get_energy_value(self) -> Optional[float]:
        sensor_map = {
            "computed_batt_charge_energy_today": "charge_today",
            "computed_batt_discharge_energy_today": "discharge_today",
            "computed_batt_charge_energy_month": "charge_month",
            "computed_batt_discharge_energy_month": "discharge_month",
            "computed_batt_charge_energy_year": "charge_year",
            "computed_batt_discharge_energy_year": "discharge_year",
            "computed_batt_charge_fve_energy_today": "charge_fve_today",
            "computed_batt_charge_fve_energy_month": "charge_fve_month",
            "computed_batt_charge_fve_energy_year": "charge_fve_year",
            "computed_batt_charge_grid_energy_today": "charge_grid_today",
            "computed_batt_charge_grid_energy_month": "charge_grid_month",
            "computed_batt_charge_grid_energy_year": "charge_grid_year",
        }
        energy_key = sensor_map.get(self._sensor_type)
        if energy_key:
            return round(self._energy[energy_key], 3)
        return None

    def _get_boiler_consumption(self, pv_data: Dict[str, Any]) -> Optional[float]:
        if self._sensor_type != "boiler_current_w":
            return None

        try:
            # OPRAVA: Kontrola existence "actual" dat
            if "actual" not in pv_data:
                _LOGGER.warning(
                    f"[{self.entity_id}] Live Data nejsou zapnutá - nelze vypočítat spotřebu bojleru. "
                    f"Zapněte Live Data v OIG aplikaci."
                )
                return None

            fv_power = float(pv_data["actual"]["fv_p1"]) + float(
                pv_data["actual"]["fv_p2"]
            )
            load_power = float(pv_data["actual"]["aco_p"])
            export_power = (
                float(pv_data["actual"]["aci_wr"])
                + float(pv_data["actual"]["aci_ws"])
                + float(pv_data["actual"]["aci_wt"])
            )
            boiler_p_set = float(pv_data["boiler_prms"].get("p_set", 0))
            boiler_manual = pv_data["boiler_prms"].get("manual", 0) == 1
            bat_power = float(pv_data["actual"]["bat_p"])

            if boiler_manual:
                boiler_power = boiler_p_set
            else:
                if bat_power <= 0:
                    available_power = fv_power - load_power - export_power
                    boiler_power = min(max(available_power, 0), boiler_p_set)
                else:
                    boiler_power = 0

            boiler_power = max(boiler_power, 0)

            _LOGGER.debug(
                f"[{self.entity_id}] Estimated boiler power: FVE={fv_power}W, Load={load_power}W, Export={export_power}W, Set={boiler_p_set}W, Manual={boiler_manual}, Bat_P={bat_power}W => Boiler={boiler_power}W"
            )

            return round(boiler_power, 2)

        except Exception as e:
            _LOGGER.error(f"Error calculating boiler consumption: {e}", exc_info=True)
            return None

    def _get_batt_power_charge(self, pv_data: Dict[str, Any]) -> float:
        if "actual" not in pv_data:
            return 0.0
        return max(float(pv_data["actual"]["bat_p"]), 0)

    def _get_batt_power_discharge(self, pv_data: Dict[str, Any]) -> float:
        if "actual" not in pv_data:
            return 0.0
        return max(-float(pv_data["actual"]["bat_p"]), 0)

    def _get_extended_fve_current_1(self, coordinator: Any) -> Optional[float]:
        try:
            power = float(coordinator.data["extended_fve_power_1"])
            voltage = float(coordinator.data["extended_fve_voltage_1"])
            if voltage != 0:
                return power / voltage
            else:
                return 0.0
        except (KeyError, TypeError, ZeroDivisionError) as e:
            _LOGGER.error(f"Error getting extended_fve_current_1: {e}", exc_info=True)
            return None

    def _get_extended_fve_current_2(self, coordinator: Any) -> Optional[float]:
        try:
            power = float(coordinator.data["extended_fve_power_2"])
            voltage = float(coordinator.data["extended_fve_voltage_2"])
            if voltage != 0:
                return power / voltage
            else:
                return 0.0
        except (KeyError, TypeError, ZeroDivisionError) as e:
            _LOGGER.error(f"Error getting extended_fve_current_2: {e}", exc_info=True)
            return None

    async def async_update(self) -> None:
        await self.coordinator.async_request_refresh()

    def _format_time(self, hours: float) -> str:
        if hours <= 0:
            return "N/A"

        minutes = int(hours * 60)
        days, remainder = divmod(minutes, 1440)
        hrs, mins = divmod(remainder, 60)

        self._attr_extra_state_attributes = {
            "days": days,
            "hours": hrs,
            "minutes": mins,
        }

        if days >= 1:
            if days == 1:
                return f"{days} den {hrs} hodin {mins} minut"
            elif days in [2, 3, 4]:
                return f"{days} dny {hrs} hodin {mins} minut"
            else:
                return f"{days} dnů {hrs} hodin {mins} minut"
        elif hrs >= 1:
            return f"{hrs} hodin {mins} minut"
        else:
            return f"{mins} minut"

    @property
    def extra_state_attributes(self) -> Dict[str, Any]:
        return getattr(self, "_attr_extra_state_attributes", {})

    def _initialize_monitored_sensors(self) -> None:
        """Inicializuje sledované senzory pro real data update."""
        # Klíčové senzory pro sledování změn
        self._key_sensors = [
            "bat_p",
            "bat_c",
            "fv_p1",
            "fv_p2",
            "aco_p",
            "aci_wr",
            "aci_ws",
            "aci_wt",
        ]

    def _check_for_real_data_changes(self, pv_data: Dict[str, Any]) -> bool:
        """Zkontroluje, zda došlo ke skutečné změně v datech."""
        try:
            # OPRAVA: Kontrola existence "actual" dat
            if "actual" not in pv_data:
                _LOGGER.warning(
                    f"[{self.entity_id}] Live Data nejsou zapnutá - real data update nefunguje. "
                    f"Zapněte Live Data v OIG aplikaci."
                )
                return False

            current_values = {}

            # Získej aktuální hodnoty klíčových senzorů
            for sensor_key in self._key_sensors:
                if sensor_key.startswith(("bat_", "fv_", "aco_", "aci_")):
                    current_values[sensor_key] = pv_data["actual"].get(sensor_key, 0)

            # Porovnej s předchozími hodnotami
            has_changes = False
            for key, current_value in current_values.items():
                previous_value = self._monitored_sensors.get(key)
                if (
                    previous_value is None
                    or abs(float(current_value) - float(previous_value)) > 0.1
                ):
                    has_changes = True
                    _LOGGER.debug(
                        f"[{self.entity_id}] Real data change detected: {key} {previous_value} -> {current_value}"
                    )

            # Ulož aktuální hodnoty pro příští porovnání
            self._monitored_sensors = current_values.copy()

            return has_changes

        except Exception as e:
            _LOGGER.error(f"[{self.entity_id}] Error checking data changes: {e}")
            return False

    async def async_will_remove_from_hass(self) -> None:
        await super().async_will_remove_from_hass()
        self._cancel_reset()
        if self._dep_unsub:
            try:
                self._dep_unsub()
            except Exception:
                pass
