"""HA 2026.11 turned DeviceInfo from a TypedDict into a dataclass.

The dataclass keeps dict-style access (``keys``, ``get``, ``[]``) but is no
longer a ``dict``.  Sensor setup used to drop every sensor whose device_info
failed ``isinstance(..., dict)``: on 2026.11 that removed 85 sensors on the
owner's box, among them the grid power the shield's power monitor needs.
"""

from __future__ import annotations

from dataclasses import KW_ONLY, dataclass, fields
from types import SimpleNamespace
from typing import Any

from custom_components.oig_cloud import sensor as sensor_module


@dataclass(eq=False, slots=True)
class DataclassDeviceInfo:
    """The shape of HA 2026.11's DeviceInfo: mapping access, not a dict."""

    _: KW_ONLY
    identifiers: Any = None
    name: Any = None
    manufacturer: Any = None

    __iter__ = None

    def keys(self) -> tuple[str, ...]:
        return tuple(f.name for f in fields(self) if getattr(self, f.name) is not None)

    def get(self, key: str, default: Any = None) -> Any:
        value = getattr(self, key, None)
        return default if value is None else value

    def __getitem__(self, key: str) -> Any:
        value = getattr(self, key, None)
        if value is None:
            raise KeyError(key)
        return value


def _device_info() -> DataclassDeviceInfo:
    return DataclassDeviceInfo(identifiers={("oig_cloud", "123")}, name="OIG 123")


class _Sensor:
    def __init__(self, _coordinator: Any, _sensor_type: str) -> None:
        self.device_info = _device_info()


def test_dataclass_device_info_is_not_a_dict() -> None:
    assert not isinstance(_device_info(), dict)


def test_valid_check_accepts_dataclass_device_info() -> None:
    sensor = SimpleNamespace(device_info=_device_info())
    assert sensor_module._is_sensor_device_info_valid(sensor, "label", "x") is True


def test_valid_check_still_rejects_garbage() -> None:
    sensor = SimpleNamespace(device_info="not a device")
    assert sensor_module._is_sensor_device_info_valid(sensor, "label", "x") is False


def test_basic_sensors_keep_dataclass_device_info(monkeypatch) -> None:
    from custom_components.oig_cloud.entities import data_sensor

    monkeypatch.setattr(data_sensor, "OigCloudDataSensor", _Sensor)
    monkeypatch.setattr(
        sensor_module,
        "SENSOR_TYPES",
        {"actual_aci_wr": {"sensor_type_category": "data"}},
    )
    coordinator = SimpleNamespace(data={"123": {}})

    assert len(sensor_module._create_basic_sensors(coordinator)) == 1


def test_computed_sensors_keep_dataclass_device_info(monkeypatch) -> None:
    from custom_components.oig_cloud.entities import computed_sensor

    monkeypatch.setattr(computed_sensor, "OigCloudComputedSensor", _Sensor)
    monkeypatch.setattr(
        sensor_module,
        "SENSOR_TYPES",
        {"actual_aci_wtotal": {"sensor_type_category": "computed"}},
    )
    coordinator = SimpleNamespace(data={"123": {}})

    assert len(sensor_module._create_computed_sensors(coordinator)) == 1
