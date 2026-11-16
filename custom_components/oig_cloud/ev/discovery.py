"""Find the car's and the charger's entities on any install, any integration.

Nothing here knows a brand. Each role (SoC, plug, limit, switch, ...) is
matched on what Home Assistant says about an entity: its domain, device class,
unit, value range and words in its id and name (Czech, English, German), plus
the device it belongs to: a device with a plug sensor or a range is a car, a
device with a charging power and a current setting is a charger. The setup
wizard shows the best candidates per role with the reasons, and the user
confirms; nothing is saved here.
"""

from __future__ import annotations

import math
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence

ROLE_SOC = "ev_soc_entity"
ROLE_PLUGGED = "ev_plugged_entity"
ROLE_LIMIT = "ev_charge_limit_entity"
ROLE_POWER = "ev_charger_power_entity"
ROLE_SWITCH = "ev_switch_entity"
ROLE_CURRENT = "ev_current_entity"
ROLE_CLIMATE = "ev_climate_entity"
ROLE_WINDOW = "ev_window_heating_entity"
ROLE_OUTSIDE = "ev_outside_temp_entity"
ROLES = (
    ROLE_SOC, ROLE_PLUGGED, ROLE_LIMIT, ROLE_POWER, ROLE_SWITCH,
    ROLE_CURRENT, ROLE_CLIMATE, ROLE_WINDOW, ROLE_OUTSIDE,
)
MAX_CANDIDATES = 3

_CAR = ("car", "vehicle", "auto", "vozidl", "fahrzeug", "range", "dojezd", "odometer", "najeto", "mileage")
_CHARGER = ("charger", "wallbox", "evse", "nabijeck", "nabijec", "wallbe", "ocpp", "laden", "wall_box", "charge_point", "chargepoint")
_CHARGE = ("charg", "nabij", "laden", "lade")
_PAUSE = ("pause", "resume", "pozastav", "pokrac", "stop", "start", "enable", "allow", "povol")
_LIMIT = ("limit", "target", "cil", "max_soc", "ziel", "charge_level")
_CURRENT = ("current", "proud", "amp", "strom")
_WINDOW = ("window", "okn", "defrost", "scheiben", "rozmraz")
_OUTSIDE = ("outdoor", "outside", "venkov", "aussen", "exterior", "ambient")
_SOC = ("soc", "battery", "baterie", "akku", "state_of_charge", "stav_nabiti", "level")
_PLUG = ("plug", "cable", "kabel", "pripoj", "connected", "stecker")


def _norm(text: Any) -> str:
    raw = unicodedata.normalize("NFKD", str(text or "").lower())
    return re.sub(r"[^a-z0-9]+", "_", "".join(c for c in raw if not unicodedata.combining(c)))


def _has(text: str, words: Sequence[str]) -> bool:
    return any(w in text for w in words)


def _float(value: Any) -> Optional[float]:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return None if math.isnan(number) else number


@dataclass(frozen=True)
class EntityInfo:
    entity_id: str
    state: Any
    attributes: Mapping[str, Any]
    name: str = ""
    device_id: Optional[str] = None
    device_name: str = ""
    platform: str = ""

    @property
    def domain(self) -> str:
        return self.entity_id.split(".", 1)[0]

    @property
    def text(self) -> str:
        return _norm(f"{self.entity_id} {self.name}")

    @property
    def device_text(self) -> str:
        return _norm(f"{self.device_name} {self.platform}")


@dataclass
class Candidate:
    entity_id: str
    name: str
    device: str
    score: float
    reasons: List[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "entity_id": self.entity_id,
            "name": self.name,
            "device": self.device,
            "score": round(self.score, 1),
            "reasons": list(self.reasons),
        }


def _device_kinds(entities: Sequence[EntityInfo]) -> Dict[str, str]:
    """``car`` / ``charger`` per device id, from what the device's entities are."""
    car: Dict[str, float] = {}
    charger: Dict[str, float] = {}
    for e in entities:
        if not e.device_id:
            continue
        cls = e.attributes.get("device_class")
        unit = str(e.attributes.get("unit_of_measurement") or "")
        text = e.text + "_" + e.device_text
        if e.domain == "binary_sensor" and cls == "plug":
            car[e.device_id] = car.get(e.device_id, 0) + 2
        if cls == "distance" or _has(text, ("range", "dojezd", "odometer", "najeto")):
            car[e.device_id] = car.get(e.device_id, 0) + 2
        if e.domain in ("lock", "device_tracker") and _has(text, _CAR):
            car[e.device_id] = car.get(e.device_id, 0) + 1
        if e.domain == "climate" and _has(e.device_text, _CAR):
            car[e.device_id] = car.get(e.device_id, 0) + 1
        if e.domain == "number" and unit == "A" and _has(text, _CURRENT):
            charger[e.device_id] = charger.get(e.device_id, 0) + 2
        if _has(e.device_text, _CHARGER):
            charger[e.device_id] = charger.get(e.device_id, 0) + 3
    kinds: Dict[str, str] = {}
    for device in set(car) | set(charger):
        kinds[device] = "car" if car.get(device, 0) > charger.get(device, 0) else "charger"
    return kinds


def _score(role: str, e: EntityInfo, kind: Optional[str]) -> Optional[Candidate]:
    attrs = e.attributes
    cls = attrs.get("device_class")
    unit = str(attrs.get("unit_of_measurement") or "")
    text = e.text
    reasons: List[str] = []
    score = 0.0

    def add(points: float, reason: str) -> None:
        nonlocal score
        score += points
        reasons.append(reason)

    if role == ROLE_SOC:
        if e.domain != "sensor" or unit != "%":
            return None
        value = _float(e.state)
        if value is not None and not 0 <= value <= 100:
            return None
        if cls == "battery":
            add(3, "device class battery")
        if _has(text, _SOC):
            add(2, "named like a state of charge")
        if _has(text, _LIMIT) or _has(text, ("fuel", "palivo", "tank")):
            return None
        if kind == "car":
            add(4, "belongs to a car")
        elif kind == "charger":
            add(1, "belongs to a charger")
    elif role == ROLE_PLUGGED:
        if e.domain != "binary_sensor":
            return None
        if cls == "plug":
            add(4, "device class plug")
        if _has(text, _PLUG):
            add(2, "named like a cable or plug")
        if kind == "car":
            add(2, "belongs to a car")
        elif kind == "charger":
            add(2, "belongs to a charger")
    elif role == ROLE_LIMIT:
        if e.domain != "number":
            return None
        high = _float(attrs.get("max"))
        if unit != "%" or (high is not None and high > 100):
            return None
        if _has(text, _LIMIT) or _has(text, _CHARGE):
            add(3, "named like a charge limit")
        if cls == "battery":
            add(1, "device class battery")
        if kind == "car":
            add(3, "belongs to a car")
    elif role == ROLE_POWER:
        if e.domain != "sensor" or unit not in ("kW", "W"):
            return None
        if cls == "power":
            add(1, "device class power")
        if _has(text, _CHARGE):
            add(2, "named like charging power")
        if kind == "charger":
            add(4, "belongs to a charger")
        elif kind == "car":
            add(2, "belongs to a car")
        if _has(text, ("max", "available", "dostup", "offered")):
            score -= 3
        if _has(text, ("export", "discharg", "vybit")):
            score -= 2
    elif role == ROLE_SWITCH:
        if e.domain not in ("switch", "input_boolean"):
            return None
        if not _has(text, _CHARGE) and not _has(text, _PAUSE):
            return None
        if _has(text, _CHARGE):
            add(2, "named like charging")
        if _has(text, _PAUSE):
            add(2, "named like pause or resume")
        if _has(text, ("unlock", "odemkn", "reduced", "snizen", "lock", "timer", "casov", "schedule",
                       "pre_release", "beta", "update")):
            return None
        if _has(text, ("availab", "dostupn")):
            score -= 1.5  # takes the whole charger out of service, not just the charge
        if kind == "charger":
            add(4, "belongs to a charger (answers quickly)")
        elif kind == "car":
            add(2, "belongs to the car (vendor cloud)")
    elif role == ROLE_CURRENT:
        if e.domain != "number" or unit != "A":
            return None
        high = _float(attrs.get("max"))
        if high is not None and not 6 <= high <= 80:
            return None
        if _has(text, _CURRENT) or _has(text, _CHARGE):
            add(2, "named like charging current")
        if _has(text, ("icp", "breaker", "jistic", "main", "household")):
            return None
        if kind == "charger":
            add(4, "belongs to a charger")
    elif role == ROLE_CLIMATE:
        if e.domain != "climate":
            return None
        if kind == "car":
            add(5, "belongs to a car")
        elif _has(text, _CAR) or _has(e.device_text, _CAR):
            add(2, "named like a car")
        else:
            return None
    elif role == ROLE_WINDOW:
        if e.domain != "switch" or not _has(text, _WINDOW):
            return None
        add(3, "named like window heating")
        if kind == "car":
            add(3, "belongs to a car")
    elif role == ROLE_OUTSIDE:
        if e.domain == "weather":
            if _float(attrs.get("temperature")) is None:
                return None
            add(2, "weather forecast temperature")
        elif e.domain == "sensor" and cls == "temperature":
            if not _has(text, _OUTSIDE):
                return None
            add(4, "outdoor temperature")
            if kind == "car":
                score -= 1  # the car's own reading is warm in a garage
        else:
            return None
    else:
        return None

    if str(e.state) in ("unavailable", "unknown") and role not in (ROLE_CLIMATE,):
        score -= 2
        reasons.append("currently unavailable")
    if score <= 0:
        return None
    return Candidate(e.entity_id, e.name or e.entity_id, e.device_name, score, reasons)


def discover(
    entities: Iterable[EntityInfo], *, own_prefix: str = "oig_", own_platform: str = "oig_cloud"
) -> Dict[str, Any]:
    """Best candidates per role and a suggested control mode."""
    usable = [
        e for e in entities
        if not e.entity_id.split(".", 1)[-1].startswith(own_prefix) and not e.platform.startswith(own_platform.split("_")[0])
    ]
    kinds = _device_kinds(usable)
    roles: Dict[str, List[dict]] = {}
    for role in ROLES:
        found = [
            c for c in (_score(role, e, kinds.get(e.device_id or "")) for e in usable) if c
        ]
        found.sort(key=lambda c: (-c.score, c.entity_id))
        roles[role] = [c.as_dict() for c in found[:MAX_CANDIDATES]]
    switch = roles[ROLE_SWITCH][0] if roles[ROLE_SWITCH] else None
    mode = "none"
    if switch is not None:
        switch_info = next((e for e in usable if e.entity_id == switch["entity_id"]), None)
        kind = kinds.get(switch_info.device_id or "") if switch_info else None
        mode = "car" if kind == "car" else "wallbox"
    switch_id = _norm(switch["entity_id"]) if switch is not None else ""
    inverted = _has(switch_id, ("pause", "pozastav")) and not _has(switch_id, ("resume", "pokrac"))
    return {"roles": roles, "control_mode": mode, "switch_inverted": inverted}


def entities_from_hass(hass: Any) -> List[EntityInfo]:
    """Every state with its registry name and device (none without registry)."""
    ent_reg: Any = None
    dev_reg: Any = None
    try:
        from homeassistant.helpers import device_registry as dr
        from homeassistant.helpers import entity_registry as er

        ent_reg = er.async_get(hass)
        dev_reg = dr.async_get(hass)
    except Exception:  # pragma: no cover - registry always present in HA
        ent_reg = dev_reg = None
    result: List[EntityInfo] = []
    for state in hass.states.async_all():
        entry = ent_reg.async_get(state.entity_id) if ent_reg is not None else None
        device = dev_reg.async_get(entry.device_id) if entry is not None and entry.device_id and dev_reg else None
        result.append(
            EntityInfo(
                entity_id=state.entity_id,
                state=state.state,
                attributes=dict(state.attributes),
                name=str(state.attributes.get("friendly_name") or ""),
                device_id=entry.device_id if entry is not None else None,
                device_name=str((device.name_by_user or device.name) if device else ""),
                platform=str(entry.platform if entry is not None else ""),
            )
        )
    return result
