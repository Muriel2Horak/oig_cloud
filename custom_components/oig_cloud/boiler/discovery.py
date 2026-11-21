"""Find the boiler's entities on any install, any integration.

Like ``ev.discovery`` for the car: nothing here knows a brand. Each setting is
matched on what Home Assistant says about an entity (domain, device class,
unit, value range), on words in its id and name (Czech, English, German) and
on the device it belongs to: a device that has a water temperature and a
heater switch, or is named like a boiler, is the boiler. The settings card
shows the best candidates with the reasons and the user confirms.
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional

from ..ev.discovery import Candidate, EntityInfo, _float, _has

ROLE_TEMP_TOP = "boiler_temp_sensor_top"
ROLE_TEMP_BOTTOM = "boiler_temp_sensor_bottom"
ROLE_POWER = "boiler_current_power_entity"
ROLE_ALT_ENERGY = "boiler_alt_energy_sensor"
ROLE_HEATER_SWITCH = "boiler_heater_switch_entity"
ROLE_ALT_SWITCH = "boiler_alt_heater_switch_entity"
ROLE_CIRCULATION = "boiler_circulation_pump_switch_entity"
ROLES = (
    ROLE_TEMP_TOP, ROLE_TEMP_BOTTOM, ROLE_POWER, ROLE_ALT_ENERGY,
    ROLE_HEATER_SWITCH, ROLE_ALT_SWITCH, ROLE_CIRCULATION,
)
MAX_CANDIDATES = 3

_BOILER = (
    "boiler", "bojler", "tuv", "zasobnik", "ohrivac", "water_heater", "hot_water",
    "warmwasser", "dhw", "tank", "nadrz", "teplavoda", "tepla_voda",
)
_TOP = ("top", "upper", "horni", "nahore", "oben", "high")
_BOTTOM = ("bottom", "lower", "dolni", "spodni", "dole", "unten", "low")
_HEATER = ("heater", "heating", "ohrev", "topeni", "patron", "tyc", "spiral", "element", "heizstab", "rele", "relay")
_ALT = ("gas", "plyn", "kotel", "boiler_gas", "alt", "krb", "fireplace", "heat_pump", "tepelne", "cerpadlo_tc")
_CIRC = ("circulation", "cirkulac", "zirkulation", "recirc")
_PUMP = ("pump", "cerpadlo", "pumpe")
# Switches that are settings of a device, not its power: never the heater.
_NOT_POWER_SWITCH = (
    "pre_release", "prerelease", "beta", "update", "firmware", "display", "led", "light", "indicator",
    "high_temperature", "low_temperature", "protection", "ochrana", "lock", "zamek", "child", "detsk",
    "overcharge", "overload", "eco", "schedule", "timer", "casovac",
)
_MAIN = ("main_switch", "main", "hlavni", "power", "napajeni")
_SOCKET = ("socket", "zasuvk", "plug", "outlet", "steckdose", "spinac", "switch_1", "relay", "rele")
_NOT_WATER = ("outdoor", "outside", "venkov", "room", "pokoj", "obyvak", "cpu", "battery", "baterie", "inverter",
              "stridac", "chip", "board", "car", "auto", "weather", "pocasi", "floor", "podlah")


def _boiler_devices(entities: Iterable[EntityInfo]) -> set[str]:
    """Devices that look like the boiler (named so, or water temp + heater)."""
    named: set[str] = set()
    temps: set[str] = set()
    heaters: set[str] = set()
    for e in entities:
        if not e.device_id:
            continue
        if _has(e.device_text, _BOILER):
            named.add(e.device_id)
        if e.domain == "sensor" and e.attributes.get("device_class") == "temperature" and _has(e.text, _BOILER):
            temps.add(e.device_id)
        if e.domain == "switch" and _has(e.text, _HEATER):
            heaters.add(e.device_id)
    return named | (temps & heaters)


def _water_temperature(e: EntityInfo) -> bool:
    if e.domain != "sensor":
        return False
    unit = str(e.attributes.get("unit_of_measurement") or "")
    if e.attributes.get("device_class") != "temperature" and unit not in ("°C", "C"):
        return False
    value = _float(e.state)
    return value is None or 0 <= value <= 100


def _score(role: str, e: EntityInfo, boiler_device: bool) -> Optional[Candidate]:
    text = e.text
    unit = str(e.attributes.get("unit_of_measurement") or "")
    cls = e.attributes.get("device_class")
    named = _has(text, _BOILER)
    reasons: List[str] = []
    score = 0.0

    def add(points: float, reason: str) -> None:
        nonlocal score
        score += points
        reasons.append(reason)

    if role in (ROLE_TEMP_TOP, ROLE_TEMP_BOTTOM):
        if not _water_temperature(e) or _has(text, _NOT_WATER):
            return None
        if not (named or boiler_device):
            return None
        add(2, "class_temperature")
        if named:
            add(3, "name_boiler")
        if boiler_device:
            add(3, "device_boiler")
        own, other = (_TOP, _BOTTOM) if role == ROLE_TEMP_TOP else (_BOTTOM, _TOP)
        if _has(text, own):
            add(3, "name_top" if role == ROLE_TEMP_TOP else "name_bottom")
        elif _has(text, other):
            score -= 4
    elif role == ROLE_POWER:
        if e.domain != "sensor" or unit not in ("W", "kW"):
            return None
        if not (named or boiler_device or _has(text, _HEATER)):
            return None
        if cls == "power":
            add(1, "class_power")
        if named:
            add(3, "name_boiler")
        if boiler_device:
            add(3, "device_boiler")
        if _has(text, _HEATER):
            add(2, "name_heater")
    elif role == ROLE_ALT_ENERGY:
        if e.domain != "sensor" or unit not in ("kWh", "Wh", "MWh"):
            return None
        if not (named or boiler_device):
            return None
        add(1, "class_energy")
        if named:
            add(2, "name_boiler")
        if boiler_device:
            add(2, "device_boiler")
        if _has(text, _ALT):
            add(3, "name_alt")
        else:
            return None
    elif role == ROLE_HEATER_SWITCH:
        if e.domain not in ("switch", "input_boolean"):
            return None
        if _has(text, _CIRC) or _has(text, _PUMP) or _has(text, _ALT) or _has(text, _NOT_POWER_SWITCH):
            return None
        if not (named or boiler_device):
            return None
        if named:
            add(3, "name_boiler")
        if boiler_device:
            add(3, "device_boiler")
        if _has(text, _HEATER):
            add(3, "name_heater")
        if _has(text, _MAIN):
            add(3, "name_main")
    elif role == ROLE_ALT_SWITCH:
        if e.domain not in ("switch", "input_boolean"):
            return None
        if _has(text, _NOT_POWER_SWITCH):
            return None
        if not _has(text, _ALT) or not (named or boiler_device):
            return None
        add(3, "name_alt")
        if named:
            add(2, "name_boiler")
        if boiler_device:
            add(2, "device_boiler")
    elif role == ROLE_CIRCULATION:
        if e.domain not in ("switch", "input_boolean"):
            return None
        if not _has(text, _CIRC) or _has(text, _NOT_POWER_SWITCH):
            return None
        add(4, "name_circulation")
        if _has(text, _PUMP):
            add(1, "name_pump")
        if _has(text, _SOCKET):
            add(1, "name_socket")
        if named or boiler_device:
            add(2, "device_boiler")
    else:
        return None

    if str(e.state) in ("unavailable", "unknown"):
        score -= 2
        reasons.append("unavailable")
    if score <= 0:
        return None
    return Candidate(e.entity_id, e.name or e.entity_id, e.device_name, score, reasons)


def discover_boiler(
    entities: Iterable[EntityInfo], *, own_prefix: str = "oig_", own_platform: str = "oig"
) -> Dict[str, Any]:
    """Best candidates per boiler setting."""
    usable = [
        e for e in entities
        if not e.entity_id.split(".", 1)[-1].startswith(own_prefix)
        and not e.platform.startswith(own_platform)
    ]
    devices = _boiler_devices(usable)
    roles: Dict[str, List[dict]] = {}
    for role in ROLES:
        found = [c for c in (_score(role, e, (e.device_id or "") in devices) for e in usable) if c]
        found.sort(key=lambda c: (-c.score, c.entity_id))
        roles[role] = [c.as_dict() for c in found[:MAX_CANDIDATES]]
    # One thermometer cannot be both the top and the bottom one.
    top = roles[ROLE_TEMP_TOP][0]["entity_id"] if roles[ROLE_TEMP_TOP] else None
    if top:
        roles[ROLE_TEMP_BOTTOM] = [c for c in roles[ROLE_TEMP_BOTTOM] if c["entity_id"] != top]
    return {"roles": roles}
