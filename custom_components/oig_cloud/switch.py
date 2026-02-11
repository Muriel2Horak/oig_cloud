"""Platform for OIG Cloud boiler wrapper switches."""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any, Optional

from homeassistant.components.switch import SwitchEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import STATE_ON
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import (
    CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
    CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
    CONF_BOILER_HEATER_SWITCH_ENTITY,
    CONF_ENABLE_BOILER,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)


@dataclass
class BoilerSwitchDefinition:
    name: str
    entity_suffix: str
    config_key: str


BOILER_SWITCH_DEFINITIONS = (
    BoilerSwitchDefinition(
        name="Bojler top",
        entity_suffix="bojler_top",
        config_key=CONF_BOILER_HEATER_SWITCH_ENTITY,
    ),
    BoilerSwitchDefinition(
        name="Bojler alternativa",
        entity_suffix="bojler_alt",
        config_key=CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
    ),
    BoilerSwitchDefinition(
        name="Bojler cirkulace",
        entity_suffix="bojler_cirkulace",
        config_key=CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    if not entry.options.get(CONF_ENABLE_BOILER, False):
        _LOGGER.debug("Boiler module disabled - skipping boiler switches")
        return

    box_id = _resolve_box_id(hass, entry)
    if not box_id:
        _LOGGER.warning("No box_id resolved for boiler switches")
        return

    config = {**entry.data, **entry.options}
    switches: list[BoilerWrapperSwitch] = []

    for definition in BOILER_SWITCH_DEFINITIONS:
        target_entity = config.get(definition.config_key)
        if not target_entity:
            continue
        switches.append(
            BoilerWrapperSwitch(
                hass=hass,
                box_id=box_id,
                name=definition.name,
                entity_suffix=definition.entity_suffix,
                target_entity_id=target_entity,
            )
        )

    if not switches:
        _LOGGER.info("No boiler wrapper switches configured")
        return

    async_add_entities(switches)
    _LOGGER.info("Registered %d boiler wrapper switches", len(switches))


class BoilerWrapperSwitch(SwitchEntity):
    """Wrapper switch delegating to a configured target entity."""

    _attr_has_entity_name = True

    def __init__(
        self,
        *,
        hass: HomeAssistant,
        box_id: str,
        name: str,
        entity_suffix: str,
        target_entity_id: str,
    ) -> None:
        self.hass = hass
        self._target_entity_id = target_entity_id
        self._attr_name = name
        self._attr_unique_id = f"oig_cloud_{box_id}_boiler_{entity_suffix}"
        self.entity_id = f"switch.oig_{box_id}_{entity_suffix}"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"{box_id}_boiler")},
            name=f"OIG Bojler {box_id}",
            manufacturer="OIG",
            model="Boiler Control",
            via_device=(DOMAIN, box_id),
        )

    @property
    def available(self) -> bool:
        return self.hass.states.get(self._target_entity_id) is not None

    @property
    def is_on(self) -> Optional[bool]:
        state = self.hass.states.get(self._target_entity_id)
        if state is None:
            return None
        return state.state == STATE_ON

    async def async_turn_on(self, **_kwargs: Any) -> None:
        await self.hass.services.async_call(
            "switch",
            "turn_on",
            {"entity_id": self._target_entity_id},
            blocking=False,
        )

    async def async_turn_off(self, **_kwargs: Any) -> None:
        await self.hass.services.async_call(
            "switch",
            "turn_off",
            {"entity_id": self._target_entity_id},
            blocking=False,
        )


def _resolve_box_id(hass: HomeAssistant, entry: ConfigEntry) -> Optional[str]:
    for key in ("box_id", "inverter_sn"):
        value = entry.options.get(key)
        if _is_valid_box_id(value):
            return value
        value = entry.data.get(key)
        if _is_valid_box_id(value):
            return value

    extracted = _extract_digits(entry.title)
    if extracted:
        options = dict(entry.options)
        if options.get("box_id") != extracted:
            options["box_id"] = extracted
            hass.config_entries.async_update_entry(entry, options=options)
        return extracted

    return None


def _extract_digits(text: str | None) -> Optional[str]:
    if not text:
        return None
    match = re.search(r"(\d{6,})", text)
    return match.group(1) if match else None


def _is_valid_box_id(value: Any) -> bool:
    return isinstance(value, str) and value.isdigit()
