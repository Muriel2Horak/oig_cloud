"""Senzory pro bojlerový modul."""

import logging
from typing import Any, Optional

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.const import (
    PERCENTAGE,
    EntityCategory,
    UnitOfEnergy,
    UnitOfTemperature,
)
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from ..const import (
    CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
    CONF_BOILER_HEATER_SWITCH_ENTITY,
    DOMAIN,
)
from .coordinator import BoilerCoordinator

_LOGGER = logging.getLogger(__name__)


def _read_energy_tracking(
    hass: Any, box_id: str, config: dict[str, Any], runtime: Any | None = None
) -> dict[str, Any]:
    """Module-level seam delegating to api_views._read_energy_tracking.
    Tests may monkeypatch this to inject fixtures without importing api_views.
    """
    from .api_views import _read_energy_tracking as _api_fn
    return _api_fn(hass, box_id, config, runtime=runtime)


def _coordinator_data(coordinator: BoilerCoordinator) -> dict[str, Any]:
    data = getattr(coordinator, "data", None)
    return data if isinstance(data, dict) else {}


class _SensorReadAdapter:
    """Read-model adapter that routes boiler sensor reads through runtime
    when available, with coordinator data as explicit compatibility fallback.
    """

    def __init__(
        self, coordinator: BoilerCoordinator, runtime: Any | None = None
    ) -> None:
        self._coordinator = coordinator
        self._runtime = runtime

    def _fallback_data(self) -> dict[str, Any]:
        """Explicit compatibility fallback to coordinator private data."""
        return _coordinator_data(self._coordinator)

    def get_temperatures(self) -> dict[str, Any]:
        return self._fallback_data().get("temperatures", {})

    def get_energy_state(self) -> dict[str, Any]:
        return self._fallback_data().get("energy_state", {})

    def get_energy_tracking(self) -> dict[str, Any]:
        coordinator = self._coordinator
        hass = getattr(coordinator, "hass", None)
        box_id = getattr(coordinator, "box_id", None)
        config = getattr(coordinator, "config", {}) or {}
        if hass is not None and box_id and box_id != "unknown":
            try:
                return _read_energy_tracking(hass, box_id, config, runtime=self._runtime)
            except (ImportError, AttributeError, TypeError, ValueError):
                pass
        return self._fallback_data().get("energy_tracking", {})

    def get_recommended_source(self) -> Any:
        return self._fallback_data().get("recommended_source")

    def get_charging_recommended(self) -> bool:
        return self._fallback_data().get("charging_recommended", False)

    def get_current_slot(self) -> Any:
        return self._fallback_data().get("current_slot")

    def get_circulation_recommended(self) -> bool:
        return self._fallback_data().get("circulation_recommended", False)

    def get_plan(self) -> Any:
        if self._runtime is not None:
            plan = self._runtime.get_current_plan()
            if plan is not None:
                return plan
        return self._fallback_data().get("plan")

    def get_profile(self) -> Any:
        if self._runtime is not None:
            profile = self._runtime.get_current_profile()
            if profile is not None:
                return profile
        return self._fallback_data().get("profile")


class BoilerSensorBase(CoordinatorEntity[BoilerCoordinator], SensorEntity):  # type: ignore[reportIncompatibleVariableOverride]
    """Základní třída pro bojlerové senzory."""

    _attr_has_entity_name = True

    def __init__(
        self,
        coordinator: BoilerCoordinator,
        unique_id_suffix: str,
        name: str,
        runtime: Any | None = None,
    ) -> None:
        """Inicializace senzoru."""
        super().__init__(coordinator)
        box_id = getattr(coordinator, "box_id", "unknown")
        if not box_id or box_id == "unknown":
            box_id = "unknown"

        self._runtime = runtime
        self._adapter = _SensorReadAdapter(coordinator, runtime)
        self._attr_unique_id = f"oig_cloud_{box_id}_boiler_{unique_id_suffix}"
        if box_id != "unknown":
            self.entity_id = f"sensor.oig_{box_id}_boiler_{unique_id_suffix}"
        self._attr_name = name
        name_box = box_id if box_id != "unknown" else "neznámý"
        if box_id != "unknown":
            self._attr_device_info = DeviceInfo(
                identifiers={(DOMAIN, f"{box_id}_boiler")},
                name=f"OIG Bojler {name_box}",
                manufacturer="OIG",
                model="Boiler Control",
                via_device=(DOMAIN, box_id),
            )
        else:
            self._attr_device_info = DeviceInfo(
                identifiers={(DOMAIN, f"{box_id}_boiler")},
                name=f"OIG Bojler {name_box}",
                manufacturer="OIG",
                model="Boiler Control",
            )


# ========== TEPLOTNÍ SENZORY ==========


class BoilerUpperZoneTempSensor(BoilerSensorBase):
    """Teplota horní zóny."""

    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:thermometer-high"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "upper_zone_temp", "Horní zóna teplota", runtime=runtime)

    @property
    def native_value(self) -> Optional[float]:  # type: ignore[override]
        """Vrátí teplotu horní zóny."""
        temps = self._adapter.get_temperatures()
        return temps.get("upper_zone")


class BoilerLowerZoneTempSensor(BoilerSensorBase):
    """Teplota dolní zóny."""

    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:thermometer-low"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "lower_zone_temp", "Dolní zóna teplota", runtime=runtime)

    @property
    def native_value(self) -> Optional[float]:  # type: ignore[override]
        """Vrátí teplotu dolní zóny."""
        temps = self._adapter.get_temperatures()
        return temps.get("lower_zone")


class BoilerAvgTempSensor(BoilerSensorBase):
    """Průměrná teplota bojleru."""

    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:thermometer"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "avg_temp", "Průměrná teplota", runtime=runtime)

    @property
    def native_value(self) -> Optional[float]:  # type: ignore[override]
        """Vrátí průměrnou teplotu."""
        energy_state = self._adapter.get_energy_state()
        return energy_state.get("avg_temp")


# ========== ENERGETICKÉ SENZORY ==========


class BoilerEnergyNeededSensor(BoilerSensorBase):
    """Energie potřebná k cílové teplotě."""

    _attr_device_class = SensorDeviceClass.ENERGY
    _attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
    _attr_icon = "mdi:flash"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "energy_needed", "Energie potřebná", runtime=runtime)

    @property
    def native_value(self) -> Optional[float]:  # type: ignore[override]
        """Vrátí energii potřebnou k ohřevu."""
        energy_state = self._adapter.get_energy_state()
        return energy_state.get("energy_needed_kwh")


class BoilerTotalEnergySensor(BoilerSensorBase):
    """Celková energie dnes."""

    _attr_device_class = SensorDeviceClass.ENERGY
    _attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_icon = "mdi:lightning-bolt"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "total_energy", "Celková energie dnes", runtime=runtime)

    @property
    def native_value(self) -> Optional[float]:  # type: ignore[override]
        """Vrátí celkovou energii."""
        tracking = self._adapter.get_energy_tracking()
        return tracking.get("total_kwh")


class BoilerFVEEnergySensor(BoilerSensorBase):
    """Energie z FVE dnes."""

    _attr_device_class = SensorDeviceClass.ENERGY
    _attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_icon = "mdi:solar-power"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "fve_energy", "Energie z FVE dnes", runtime=runtime)

    @property
    def native_value(self) -> Optional[float]:  # type: ignore[override]
        """Vrátí energii z FVE."""
        tracking = self._adapter.get_energy_tracking()
        return tracking.get("fve_kwh")


class BoilerGridEnergySensor(BoilerSensorBase):
    """Energie ze sítě dnes."""

    _attr_device_class = SensorDeviceClass.ENERGY
    _attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_icon = "mdi:transmission-tower"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "grid_energy", "Energie ze sítě dnes", runtime=runtime)

    @property
    def native_value(self) -> Optional[float]:  # type: ignore[override]
        """Vrátí energii ze sítě."""
        tracking = self._adapter.get_energy_tracking()
        return tracking.get("grid_kwh")


class BoilerAltEnergySensor(BoilerSensorBase):
    """Energie z alternativy dnes."""

    _attr_device_class = SensorDeviceClass.ENERGY
    _attr_native_unit_of_measurement = UnitOfEnergy.KILO_WATT_HOUR
    _attr_state_class = SensorStateClass.TOTAL_INCREASING
    _attr_icon = "mdi:fire"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "alt_energy", "Energie z alternativy dnes", runtime=runtime)

    @property
    def native_value(self) -> Optional[float]:  # type: ignore[override]
        """Vrátí alternativní energii."""
        tracking = self._adapter.get_energy_tracking()
        return tracking.get("alt_kwh")


class BoilerActuatedSourceSensor(BoilerSensorBase):
    """Aktuální zdroj energie (řízený)."""

    _attr_icon = "mdi:transmission-tower-import"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "actuated_source", "Aktuální zdroj (řízení)", runtime=runtime)

    @property
    def native_value(self) -> Optional[str]:  # type: ignore[override]
        """Vrátí aktuální zdroj."""
        tracking = self._adapter.get_energy_tracking()
        source = tracking.get("current_source")
        from .api_views import _normalize_runtime_source
        normalized = _normalize_runtime_source(source)

        source_map = {
            "fve": "FVE",
            "overflow": "Přetok",
            "grid": "Síť",
            "discharge": "Vybíjení",
            "alternative": "Alternativa",
        }
        if normalized is None:
            return "—"
        return source_map.get(normalized, normalized)

    @property
    def extra_state_attributes(self) -> dict[str, Any]:  # type: ignore[override]
        tracking = self._adapter.get_energy_tracking()
        source = tracking.get("current_source")
        from .api_views import _normalize_runtime_source
        normalized_source = _normalize_runtime_source(source)
        return {
            "source_key": normalized_source,
            "source_estimated": tracking.get("source_estimated", True),
        }


class BoilerTemperatureTrendSensor(BoilerSensorBase):
    """Trend teploty bojleru."""

    _attr_native_unit_of_measurement = "°C/min"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:trending-up"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "temperature_trend", "Trend teploty", runtime=runtime)

    @property
    def native_value(self) -> Optional[float]:  # type: ignore[override]
        """Vrátí trend teploty v °C/min."""
        runtime = self._runtime
        if runtime is not None:
            activity = getattr(runtime, "current_activity", None)
            if activity is not None:
                trend = getattr(activity, "temperature_trend_c_per_min", None)
                if trend is not None:
                    return round(trend, 4)
        return None


class BoilerHeaterMainStateSensor(BoilerSensorBase):
    """Stav hlavního topného tělesa."""

    _attr_icon = "mdi:radiator"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "heater_main_state", "Stav hlavního topení", runtime=runtime)

    @property
    def native_value(self) -> str:  # type: ignore[override]
        """Vrátí on/off/unavailable."""
        config = getattr(self.coordinator, "config", {}) or {}
        entity_id = config.get(CONF_BOILER_HEATER_SWITCH_ENTITY)
        if not entity_id:
            return "unavailable"
        runtime = self._runtime
        if runtime is not None:
            activity = getattr(runtime, "current_activity", None)
            if activity is not None:
                heater_states = getattr(activity, "heater_states", {})
                state = heater_states.get(entity_id)
                if state in ("on", "off"):
                    return state
                return "unavailable"
        return "unavailable"


class BoilerHeaterAltStateSensor(BoilerSensorBase):
    """Stav alternativního topného tělesa."""

    _attr_icon = "mdi:radiator-disabled"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "heater_alt_state", "Stav alternativního topení", runtime=runtime)

    @property
    def native_value(self) -> str:  # type: ignore[override]
        """Vrátí on/off/unavailable."""
        config = getattr(self.coordinator, "config", {}) or {}
        entity_id = config.get(CONF_BOILER_ALT_HEATER_SWITCH_ENTITY)
        if not entity_id:
            return "unavailable"
        runtime = self._runtime
        if runtime is not None:
            activity = getattr(runtime, "current_activity", None)
            if activity is not None:
                heater_states = getattr(activity, "heater_states", {})
                state = heater_states.get(entity_id)
                if state in ("on", "off"):
                    return state
                return "unavailable"
        return "unavailable"


class BoilerPlanComfortSatisfiedSensor(BoilerSensorBase):
    """Splnění komfortu pro nejbližší slot."""

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "plan_comfort_satisfied", "Komfort splněn", runtime=runtime)

    @property
    def native_value(self) -> str:  # type: ignore[override]
        """Vrátí yes/no/unknown."""
        plan = self._adapter.get_plan()
        if plan is None or not hasattr(plan, "slots"):
            return "unknown"

        from datetime import datetime, timezone as _tz
        now = datetime.now(_tz.utc)

        for slot in plan.slots:
            slot_end = getattr(slot, "end", None)
            if slot_end is not None:
                if getattr(slot_end, "tzinfo", None) is None:
                    slot_end = slot_end.replace(tzinfo=_tz.utc)
            if slot_end is not None and slot_end > now:
                comfort = getattr(slot, "comfort_satisfied", None)
                if comfort is True:
                    return "yes"
                if comfort is False:
                    return "no"
                return "unknown"
        return "unknown"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:  # type: ignore[override]
        """Atributy s boolean komfortu."""
        plan = self._adapter.get_plan()
        comfort = None
        if plan is not None and hasattr(plan, "slots"):
            from datetime import datetime, timezone as _tz
            now = datetime.now(_tz.utc)
            for slot in plan.slots:
                slot_end = getattr(slot, "end", None)
                if slot_end is not None:
                    if getattr(slot_end, "tzinfo", None) is None:
                        slot_end = slot_end.replace(tzinfo=_tz.utc)
                if slot_end is not None and slot_end > now:
                    comfort = getattr(slot, "comfort_satisfied", None)
                    break
        return {"comfort_satisfied": comfort}


# ========== PLÁNOVACÍ SENZORY ==========


class BoilerCurrentSourceSensor(BoilerSensorBase):
    """Aktuální zdroj energie."""

    _attr_icon = "mdi:power-plug"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "current_source", "Aktuální zdroj", runtime=runtime)

    @property
    def native_value(self) -> Optional[str]:  # type: ignore[override]
        """Vrátí aktuální zdroj."""
        tracking = self._adapter.get_energy_tracking()
        source = tracking.get("current_source")
        from .api_views import _normalize_runtime_source
        normalized = _normalize_runtime_source(source)

        source_map = {
            "fve": "FVE",
            "overflow": "Přetok",
            "grid": "Síť",
            "discharge": "Vybíjení",
            "alternative": "Alternativa",
        }
        if normalized is None:
            return "—"
        return source_map.get(normalized, normalized)


class BoilerRecommendedSourceSensor(BoilerSensorBase):
    """Doporučený zdroj energie."""

    _attr_icon = "mdi:lightbulb-on"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "recommended_source", "Doporučený zdroj", runtime=runtime)

    @property
    def native_value(self) -> Optional[str]:  # type: ignore[override]
        """Vrátí doporučený zdroj."""
        recommended = self._adapter.get_recommended_source()
        if not recommended:
            return None

        source_map = {
            "fve": "FVE",
            "grid": "Síť",
            "alternative": "Alternativa",
        }
        return source_map.get(recommended, recommended)


class BoilerChargingRecommendedSensor(BoilerSensorBase):
    """Je doporučeno ohřívat?"""

    _attr_icon = "mdi:fire-circle"
    _attr_device_class = None

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "charging_recommended", "Ohřev doporučen", runtime=runtime)

    @property
    def native_value(self) -> str:  # type: ignore[override]
        """Vrátí ano/ne."""
        recommended = self._adapter.get_charging_recommended()
        return "ano" if recommended else "ne"

    @property
    def extra_state_attributes(self) -> dict[str, Any]:  # type: ignore[override]
        """Atributy s detaily aktuálního slotu."""
        current_slot = self._adapter.get_current_slot()
        if not current_slot:
            return {}

        return {
            "start": current_slot.start.isoformat(),
            "end": current_slot.end.isoformat(),
            "consumption_kwh": round(current_slot.avg_consumption_kwh, 3),
            "confidence": round(current_slot.confidence, 2),
            "spot_price": current_slot.spot_price_kwh,
            "overflow_available": current_slot.overflow_available,
        }


class BoilerPlanEstimatedCostSensor(BoilerSensorBase):
    """Odhadovaná cena ohřevu dnes."""

    _attr_device_class = SensorDeviceClass.MONETARY
    _attr_native_unit_of_measurement = "CZK"
    _attr_state_class = SensorStateClass.TOTAL
    _attr_icon = "mdi:cash"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "estimated_cost", "Odhadovaná cena dnes", runtime=runtime)

    @property
    def native_value(self) -> Optional[float]:  # type: ignore[override]
        """Vrátí odhadovanou cenu."""
        plan = self._adapter.get_plan()
        if plan is not None and hasattr(plan, "estimated_cost_czk"):
            return round(plan.estimated_cost_czk, 2)
        return None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:  # type: ignore[override]
        """Atributy s rozpisem plánu."""
        plan = self._adapter.get_plan()
        if not plan:
            return {}

        return {
            "total_consumption_kwh": round(plan.total_consumption_kwh, 2),
            "fve_kwh": round(plan.fve_kwh, 2),
            "grid_kwh": round(plan.grid_kwh, 2),
            "alt_kwh": round(plan.alt_kwh, 2),
            "created_at": plan.created_at.isoformat(),
            "valid_until": plan.valid_until.isoformat(),
        }


class BoilerCirculationRecommendedSensor(BoilerSensorBase):
    """Doporučení oběhové cirkulace."""

    _attr_icon = "mdi:water-pump"

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        super().__init__(coordinator, "circulation_recommended", "Cirkulace doporučena", runtime=runtime)

    @property
    def native_value(self) -> str:  # type: ignore[override]
        recommended = self._adapter.get_circulation_recommended()
        return "ano" if recommended else "ne"


# ========== PROFILE SENSOR ==========


class BoilerProfileConfidenceSensor(BoilerSensorBase):
    """Kvalita profilu."""

    _attr_native_unit_of_measurement = PERCENTAGE
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_icon = "mdi:chart-line"
    _attr_entity_category = EntityCategory.DIAGNOSTIC

    def __init__(self, coordinator: BoilerCoordinator, runtime: Any | None = None) -> None:
        """Inicializace."""
        super().__init__(coordinator, "profile_confidence", "Kvalita profilu", runtime=runtime)

    @property
    def native_value(self) -> Optional[float]:  # type: ignore[override]
        """Vrátí průměrnou confidence profilu."""
        profile = self._adapter.get_profile()
        if profile is not None and hasattr(profile, "confidence") and profile.confidence:
            avg_conf = sum(profile.confidence.values()) / len(profile.confidence)
            return round(avg_conf * 100, 1)
        return None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:  # type: ignore[override]
        """Atributy profilu."""
        profile = self._adapter.get_profile()
        if not profile:
            return {}

        return {
            "category": profile.category,
            "hours_with_data": len(profile.hourly_avg),
            "total_samples": sum(profile.sample_count.values()),
            "last_updated": (
                profile.last_updated.isoformat() if profile.last_updated else None
            ),
        }


# ========== REGISTRACE SENZORŮ ==========


def get_boiler_sensors(coordinator: BoilerCoordinator, runtime: Any | None = None) -> list[SensorEntity]:
    """Vrátí všechny bojlerové senzory."""
    return [
        # Teploty
        BoilerUpperZoneTempSensor(coordinator, runtime=runtime),
        BoilerLowerZoneTempSensor(coordinator, runtime=runtime),
        BoilerAvgTempSensor(coordinator, runtime=runtime),
        # Energie
        BoilerEnergyNeededSensor(coordinator, runtime=runtime),
        BoilerTotalEnergySensor(coordinator, runtime=runtime),
        BoilerFVEEnergySensor(coordinator, runtime=runtime),
        BoilerGridEnergySensor(coordinator, runtime=runtime),
        BoilerAltEnergySensor(coordinator, runtime=runtime),
        # Zdroj / runtime
        BoilerActuatedSourceSensor(coordinator, runtime=runtime),
        BoilerTemperatureTrendSensor(coordinator, runtime=runtime),
        BoilerHeaterMainStateSensor(coordinator, runtime=runtime),
        BoilerHeaterAltStateSensor(coordinator, runtime=runtime),
        BoilerPlanComfortSatisfiedSensor(coordinator, runtime=runtime),
        # Plánování
        BoilerCurrentSourceSensor(coordinator, runtime=runtime),
        BoilerRecommendedSourceSensor(coordinator, runtime=runtime),
        BoilerChargingRecommendedSensor(coordinator, runtime=runtime),
        BoilerCirculationRecommendedSensor(coordinator, runtime=runtime),
        BoilerPlanEstimatedCostSensor(coordinator, runtime=runtime),
        # Diagnostika
        BoilerProfileConfidenceSensor(coordinator, runtime=runtime),
    ]
