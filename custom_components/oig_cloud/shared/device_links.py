"""Parent/child links in the device registry.

HA 2026.8 removed ``via_device`` from :class:`DeviceInfo` in favour of
``via_device_id``. A ``DeviceInfo`` dict that still carries ``via_device``
reaches ``device_registry.async_get_or_create`` as the deprecated parameter,
and because the registry call happens on a pure-core stack (HA reads the
entity's ``device_info`` property, so no integration frame is on it) the
deprecation reporter raises ``MissingIntegrationFrame`` instead of warning —
which aborts adding the entity. On the owner's box that killed 53 entities
(boiler, CHMU, computed, shield) in a single restart on 2026-09-05.

``via_device_id`` needs the PARENT's registry id, which does not exist while an
entity builds its own ``device_info``. So the child devices declare only their
identifiers, and the parent link is attached here once, after setup, from our
own frame.
"""

from __future__ import annotations

import logging
from typing import Any, Iterable

from homeassistant.helpers import device_registry as dr

from ..const import DOMAIN

_LOGGER = logging.getLogger(__name__)

# Child devices created by this integration, as identifier suffixes.
CHILD_DEVICE_SUFFIXES: tuple[str, ...] = ("_analytics", "_boiler", "_shield")


def _resolve_parent_id(registry: Any, box_id: str) -> str | None:
    parent = registry.async_get_device(identifiers={(DOMAIN, box_id)})
    return getattr(parent, "id", None) if parent else None


def async_link_child_devices(
    hass: Any,
    box_id: str,
    suffixes: Iterable[str] = CHILD_DEVICE_SUFFIXES,
) -> int:
    """Point every child device at the box device. Returns how many were linked.

    Safe to call repeatedly: a child already pointing at the right parent is
    left alone, and a missing parent or child is skipped rather than raised —
    setup order is not guaranteed and a missing link must never break startup.
    """
    if not box_id:
        return 0
    try:
        registry = dr.async_get(hass)
    except Exception as err:  # noqa: BLE001 - registry unavailable in tests/stubs
        _LOGGER.debug("Device registry unavailable, skipping child links: %s", err)
        return 0

    parent_id = _resolve_parent_id(registry, box_id)
    if not parent_id:
        _LOGGER.debug("Box device %s not in registry yet; child links skipped", box_id)
        return 0

    linked = 0
    for suffix in suffixes:
        child = registry.async_get_device(identifiers={(DOMAIN, f"{box_id}{suffix}")})
        if child is None or getattr(child, "via_device_id", None) == parent_id:
            continue
        try:
            registry.async_update_device(child.id, via_device_id=parent_id)
            linked += 1
        except Exception as err:  # noqa: BLE001 - never break setup over a cosmetic link
            _LOGGER.debug("Could not link %s%s to the box device: %s", box_id, suffix, err)
    if linked:
        _LOGGER.debug("Linked %s child device(s) to box %s", linked, box_id)
    return linked
