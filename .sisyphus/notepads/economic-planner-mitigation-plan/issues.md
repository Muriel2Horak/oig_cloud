## 2026-03-09 - Runtime DeviceInfo TypeError

- Symptom: HA raised `TypeError` (`unexpected keyword argument 'battery'`) during device registration and skipped runtime sensors.
- Impact observed before fix: runtime entity creation failed for battery forecast-related sensors.
- Resolution: removed unsupported `battery` kwarg from `DeviceInfo` in sensor runtime entity.
