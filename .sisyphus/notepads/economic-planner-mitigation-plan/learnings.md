## 2026-03-09 - DeviceInfo battery argument fix (sensor runtime)

- Home Assistant `DeviceInfo` does not support a `battery` keyword; passing it propagates to device registry create and raises `TypeError`.
- Removing the invalid keyword from `custom_components/oig_cloud/entities/sensor_runtime.py` restores entity creation for runtime sensors.
- Quick validation pattern for this class of issue: search all `DeviceInfo(` call sites and confirm only supported kwargs are used.
