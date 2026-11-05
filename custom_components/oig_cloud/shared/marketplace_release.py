"""Stop other Marketplace records from claiming the oig_cloud folder.

HA 2026.11 replaced HACS with the built-in Marketplace and took over the HACS
records. Users who once installed ``psimsa/oig_cloud`` and later switched to
``Muriel2Horak/oig_cloud`` end up with both records marked installed for the
domain ``oig_cloud``. The Marketplace then refuses every install and update
("The oig_cloud directory belongs to psimsa/oig_cloud"), and uninstalling the
old record deletes the shared folder, so the user cannot fix it from the UI
(home-assistant/core#190454).

This code is what runs from that folder, so any other record is stale. It is
released the way the Marketplace uninstalls a repository, minus removing the
files: the installed flag and version are cleared, its update entity and device
are removed, and the Marketplace data is saved. The Marketplace is internal to
Home Assistant, so every step is optional and a failure is only logged.
"""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers import entity_registry as er

from ..const import DOMAIN
from .background import start_background

_LOGGER = logging.getLogger(__name__)

MARKETPLACE_DOMAIN = "marketplace"
OWN_REPOSITORY = "muriel2horak/oig_cloud"
OWN_REPOSITORY_ID = "1133009999"
# psimsa/oig_cloud: once it is released the Marketplace may not know it until
# its catalog loads, so its GitHub id is known here.
KNOWN_FOREIGN_REPOSITORY_IDS = frozenset({"658267172"})
_SCHEDULED_KEY = f"{DOMAIN}_marketplace_release_scheduled"


def _claims_our_domain(repository: Any) -> bool:
    data = getattr(repository, "data", None)
    if data is None:
        return False
    if str(getattr(data, "category", "")) != "integration":
        return False
    if getattr(data, "domain", None) != DOMAIN:
        return False
    return str(getattr(data, "full_name", "")).lower() != OWN_REPOSITORY


def _is_foreign_record(repository: Any) -> bool:
    data = getattr(repository, "data", None)
    return bool(getattr(data, "installed", False)) and _claims_our_domain(repository)


async def _async_release(repository: Any) -> None:
    data = repository.data
    data.installed = False
    data.installed_version = None
    data.installed_commit = None
    dispatch = getattr(repository, "async_dispatch_changed", None)
    if callable(dispatch):
        dispatch("uninstall")
    remove_entity = getattr(repository, "async_remove_entity_device", None)
    if callable(remove_entity):
        await remove_entity()


async def async_release_foreign_records(hass: Any) -> list[str]:
    """Release installed Marketplace records of other repositories for our domain."""
    released: list[str] = []
    try:
        entries = hass.config_entries.async_entries(MARKETPLACE_DOMAIN)
    except Exception as err:  # noqa: BLE001 - the Marketplace is optional
        _LOGGER.debug("Marketplace not available: %s", err)
        return released

    for entry in entries:
        manager: Any = getattr(entry, "runtime_data", None)
        try:
            installed = list(manager.repositories.list_installed)
        except Exception as err:  # noqa: BLE001 - internal API may change
            _LOGGER.debug("Marketplace repositories not readable: %s", err)
            continue

        released_here = []
        for repository in installed:
            if not _is_foreign_record(repository):
                continue
            name = str(repository.data.full_name)
            if getattr(repository, "installing", False):
                _LOGGER.info("Marketplace is installing %s, not releasing it now", name)
                continue
            try:
                await _async_release(repository)
            except Exception as err:  # noqa: BLE001 - never break our setup
                _LOGGER.warning("Could not release Marketplace record %s: %s", name, err)
                continue
            released_here.append(name)

        if not released_here:
            continue
        released.extend(released_here)
        _LOGGER.warning(
            "Released the stale Marketplace record %s: it claimed the %s folder, "
            "which runs %s. Nothing on disk was changed",
            ", ".join(released_here),
            DOMAIN,
            OWN_REPOSITORY,
        )
        try:
            await manager.data.async_write()
        except Exception as err:  # noqa: BLE001 - saved again on the next change
            _LOGGER.warning("Could not save the Marketplace data: %s", err)

    return released


async def async_remove_orphaned_entities(hass: Any) -> list[str]:
    """Remove update entities left behind by foreign records no longer installed.

    A record released by hand (File editor or terminal) keeps its update entity
    as unavailable, and with an area set it raises the "area but no name"
    repair. The Marketplace only removes the entity when it uninstalls.
    """
    removed: list[str] = []
    try:
        entries = hass.config_entries.async_entries(MARKETPLACE_DOMAIN)
    except Exception as err:  # noqa: BLE001 - the Marketplace is optional
        _LOGGER.debug("Marketplace not available: %s", err)
        return removed

    for entry in entries:
        manager: Any = getattr(entry, "runtime_data", None)
        try:
            installed_ids = {
                str(repo.data.id) for repo in manager.repositories.list_installed
            }
            foreign_ids = set(KNOWN_FOREIGN_REPOSITORY_IDS) | {
                str(repo.data.id)
                for repo in getattr(manager.repositories, "list_all", [])
                if _claims_our_domain(repo)
            }
            entity_registry = er.async_get(hass)
            device_registry = dr.async_get(hass)
            entities = er.async_entries_for_config_entry(entity_registry, entry.entry_id)
        except Exception as err:  # noqa: BLE001 - internal API may change
            _LOGGER.debug("Marketplace entities not readable: %s", err)
            continue

        foreign_ids -= installed_ids | {OWN_REPOSITORY_ID}
        for entity in entities:
            if entity.domain != "update" or str(entity.unique_id) not in foreign_ids:
                continue
            try:
                if entity.device_id:
                    # The record's own device; removing it removes the entity too
                    device_registry.async_remove_device(entity.device_id)
                else:
                    entity_registry.async_remove(entity.entity_id)
            except Exception as err:  # noqa: BLE001 - never break our setup
                _LOGGER.warning("Could not remove %s: %s", entity.entity_id, err)
                continue
            removed.append(entity.entity_id)

    if removed:
        _LOGGER.warning(
            "Removed %s, left behind by a Marketplace record that no longer claims "
            "the %s folder",
            ", ".join(removed),
            DOMAIN,
        )
    return removed


async def async_run_cleanup(hass: Any) -> None:
    """Release foreign records, then remove what released records left behind."""
    await async_release_foreign_records(hass)
    await async_remove_orphaned_entities(hass)


def async_schedule_release(hass: Any) -> None:
    """Release stale records once, after the Marketplace restored its data."""
    if hass.data.get(_SCHEDULED_KEY):
        return
    hass.data[_SCHEDULED_KEY] = True

    # Without @callback the bus runs the listener in an executor thread, and the
    # task it starts there is destroyed while still pending.
    @callback
    def _start(_event: Any = None) -> None:
        start_background(hass, async_run_cleanup(hass), "oig_cloud_marketplace_release")

    if hass.is_running:
        _start()
    else:
        hass.bus.async_listen_once("homeassistant_started", _start)
