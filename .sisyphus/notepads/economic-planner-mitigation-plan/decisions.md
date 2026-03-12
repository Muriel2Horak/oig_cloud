## 2026-03-09 - DeviceInfo metadata scope decision

- Decision: keep battery state as separate sensor entities/attributes, not as `DeviceInfo` metadata.
- Rationale: `DeviceInfo` is limited to HA-supported registry fields; custom battery reference fields are invalid and break registration.
- Consequence: device registry stability is prioritized while battery metrics remain exposed via normal sensor entities.
