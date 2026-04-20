## 2026-04-20 - Task 0
- `ssh docker-vm` lands on host `docker` (10.0.0.161) with confirmed write access to both `/srv/control-stack/oig-telemetry` and `/volume1/docker/grafana/telemetry`.
- `ssh ha` lands in the HA SSH add-on environment (`a0d7b954-ssh`); a direct Python socket probe from there to `10.0.0.161:1883` succeeds.
- Grafana is reachable from the agent at `http://10.0.0.161:3000/login`; the `docker-vm` hostname itself is not browser-resolvable from this environment.
- `promtail-config-haos.yml` already contains the intended HA syslog job with `job=homeassistant` and `host=haos` labels.
