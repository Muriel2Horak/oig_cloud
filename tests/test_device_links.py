"""Device parent/child linking (HA 2026.8 via_device removal).

`DeviceInfo` lost `via_device` in HA 2026.8. Leaving it in a device_info dict
does not merely warn: the registry call runs on a pure-core stack, the
deprecation reporter cannot find an integration frame, and adding the entity
fails outright — 53 entities died on the owner's box on 2026-09-05.
"""

from __future__ import annotations

import re
from pathlib import Path

from custom_components.oig_cloud.shared.device_links import (
    CHILD_DEVICE_SUFFIXES,
    async_link_child_devices,
)

_COMPONENT_ROOT = (
    Path(__file__).resolve().parent.parent / "custom_components" / "oig_cloud"
)
# `via_device=` / `"via_device":`, but never `via_device_id`
_VIA_DEVICE = re.compile(r'(?:"via_device"\s*:|(?<![\w.])via_device\s*=)')


def test_no_source_file_passes_the_removed_via_device_key():
    offenders = []
    for path in _COMPONENT_ROOT.rglob("*.py"):
        for lineno, line in enumerate(
            path.read_text(encoding="utf-8").splitlines(), start=1
        ):
            if "via_device_id" in line:
                continue
            if _VIA_DEVICE.search(line):
                offenders.append(f"{path.relative_to(_COMPONENT_ROOT)}:{lineno}")
    assert not offenders, (
        "via_device was removed from DeviceInfo in HA 2026.8 and now breaks entity "
        "setup; use shared.device_links.async_link_child_devices instead. Found: "
        + ", ".join(offenders)
    )


class _Device:
    def __init__(self, device_id: str, via_device_id: str | None = None) -> None:
        self.id = device_id
        self.via_device_id = via_device_id


class _Registry:
    """Exposes only the non-deprecated lookup, so a regression to
    `async_get_device` (deprecated in HA 2026.8) fails loudly here."""

    def __init__(self, devices: dict[tuple[str, str], _Device]) -> None:
        self._devices = devices
        self.updates: list[tuple[str, str]] = []
        self.entry_ids: list[str] = []

    def async_get_device_by_identifier(self, identifier, config_entry_id):
        self.entry_ids.append(config_entry_id)
        return self._devices.get(identifier)

    def async_update_device(self, device_id, *, via_device_id):
        self.updates.append((device_id, via_device_id))


def _patch_registry(monkeypatch, registry):
    monkeypatch.setattr(
        "custom_components.oig_cloud.shared.device_links.dr.async_get",
        lambda hass: registry,
    )


def test_children_are_linked_to_the_box_device(monkeypatch):
    devices = {("oig_cloud", "2206237016"): _Device("box-dev")}
    for suffix in CHILD_DEVICE_SUFFIXES:
        devices[("oig_cloud", f"2206237016{suffix}")] = _Device(f"child{suffix}")
    registry = _Registry(devices)
    _patch_registry(monkeypatch, registry)

    linked = async_link_child_devices(object(), "2206237016", "entry-1")

    assert linked == len(CHILD_DEVICE_SUFFIXES)
    assert {device_id for device_id, _ in registry.updates} == {
        f"child{suffix}" for suffix in CHILD_DEVICE_SUFFIXES
    }
    assert {parent for _, parent in registry.updates} == {"box-dev"}
    assert set(registry.entry_ids) == {"entry-1"}


def test_already_linked_child_is_left_alone(monkeypatch):
    registry = _Registry(
        {
            ("oig_cloud", "2206237016"): _Device("box-dev"),
            ("oig_cloud", "2206237016_shield"): _Device("child", "box-dev"),
        }
    )
    _patch_registry(monkeypatch, registry)

    assert async_link_child_devices(object(), "2206237016", "entry-1") == 0
    assert registry.updates == []


def test_missing_box_device_is_not_an_error(monkeypatch):
    registry = _Registry({("oig_cloud", "2206237016_shield"): _Device("child")})
    _patch_registry(monkeypatch, registry)

    assert async_link_child_devices(object(), "2206237016", "entry-1") == 0
    assert registry.updates == []


def test_blank_box_id_is_a_no_op():
    assert async_link_child_devices(object(), "", "entry-1") == 0
