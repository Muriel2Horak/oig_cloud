# Economic Battery Planner - Issues & Blockers

## Active Issues
None yet - work just started.

## Resolved Issues
None yet.

## Potential Risks
- SSH access to HA instance may require setup
- MySQL access credentials needed
- JSON data format may vary from expected structure
- Existing planner code may need careful integration

## 2026-03-06 - Wave 0 Task 0.1 Findings
- SSH connectivity works (`ssh ha` responds), but `/config/.storage/oig_cloud/battery_forecast/` does not exist on current HA instance.
- MySQL CLI from HA shell is reachable, but direct query with `homeassistant` user is blocked (`ERROR 1045 Access denied`) and default `mysql` invocation warns/deprecates + fails with SSL mode mismatch.
- Data extraction is blocked until correct storage path mapping and DB credentials/access method are provided.
