All code should use types in function calls and signatures. Untyped parameters and return values are not allowed.

## Home Assistant Environment

- **HA Server**: Remote server at `10.0.0.143:8123` (NOT local)
- **Config file**: `.ha_config` contains HA_HOST, HA_TOKEN, HA_URL, BOX_ID
- **Storage path**: `/config/.storage/oig_cloud_daily_plans/` on the remote HA server
- **SSH access**: Use `ssh ha` to connect to the server
- **Box ID**: 2206237016

When analyzing data or logs, always use remote server paths and API access.
