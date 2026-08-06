# Tuya Local Batch Migration Design

## Goal

Add the 12 currently reachable Tuya cloud devices to the Home Assistant
`tuya_local` integration. Reuse the authenticated official Tuya config entry,
keep secrets in memory, and leave cloud entities and consumers unchanged.

## Acceptance Criteria

- Create exactly the 12 entries listed below; reject any unplanned device.
- Use the verified device ID, IP address, protocol, and Tuya Local profile.
- Require each new config entry to reach `loaded` before continuing.
- Require primary state or telemetry entities to be present and not
  `unknown` or `unavailable`.
- Stop at the first failed connection, profile selection, entry setup, or
  verification.
- Keep previously completed entries when a later entry fails.
- Do not rename, disable, or delete cloud entities.
- Do not change entity IDs, automations, scripts, or dashboards.
- Never print or persist Tuya access tokens, refresh tokens, or local keys.

## Migration Set

| Cloud name | Device ID | IP | Protocol | Tuya Local profile |
|---|---|---:|---:|---|
| CBB spinac | `bf40ddc9afb54dc4bfvsel` | `192.168.0.54` | 3.4 | `relay_switch_remote` |
| Podlaha - koupelna | `bf01e8a72081c399fcym2y` | `192.168.0.22` | 3.4 | `relay_switch_remote` |
| Pracka | `bf13d9f71df9a17eadlvr5` | `192.168.0.215` | 3.4 | `smartplugv2_energyv2` |
| Vrata | `bf825d7a34b720a395fjps` | `192.168.0.189` | 3.4 | `relay_switch_remote` |
| Mycka | `bf89fb0a0465941c010zu5` | `192.168.0.112` | 3.4 | `smartplugv2_energyv2` |
| Cirkulace | `bf2e46d20eb7a8006bbeuk` | `192.168.0.27` | 3.4 | `smartplugv2_energyv2` |
| ANTELA Power Strip | `bfda586c30242a9577fxbo` | `192.168.0.185` | 3.4 | `quad_powerstrip_usb` |
| A60 Smart Bulb RGBCW WiFi 2 | `bf9954154818b5f39cjesv` | `192.168.0.94` | 3.4 | `rgbcw_lightbulb_xld_cl002` |
| A60 Smart Bulb RGBCW WiFi 4 | `bfe3c762e4f336782ezrll` | `192.168.0.140` | 3.4 | `rgbcw_lightbulb_xld_cl002` |
| A60 Smart Bulb RGBCW WiFi 5 | `bf12307f95b745f73etyvb` | `192.168.0.139` | 3.4 | `rgbcw_lightbulb_xld_cl002` |
| Bazen | `bf274083695118ef4cwgvo` | `192.168.0.128` | 3.3 | `snt957w_tde_temp` |
| Susicka | `bf702eb8e512529835lt7k` | `192.168.0.141` | 3.4 | `smartplugv2_energyv2` |

Entry titles retain the cloud display name and append ` - local`.

## Architecture

### Credential boundary

- Read the official `tuya` config entry from the existing Home Assistant SMB
  config share.
- Pass `user_code`, terminal ID, endpoint, and token information directly to
  the installed `tuya-device-sharing-sdk` client.
- Fetch the current 33-device cloud map and select only the 12 allowlisted
  device IDs.
- Keep all cloud credentials and local keys in process memory.
- Emit only device metadata and irreversible key fingerprints in diagnostic
  output.

### Plan boundary

- Store names, IDs, IPs, protocols, and profiles in a non-secret JSON plan.
- Validate exact device-set equality, unique IDs, unique IPs, valid IPv4
  addresses, supported protocol values, and non-empty profiles before any HA
  write.
- Cross-check each plan device against both the cloud map and the latest LAN
  discovery result.
- Classify an exact already-configured, `loaded`, and entity-verified ID as
  completed so interrupted batches can resume safely.
- Reject missing keys, offline devices, mismatched IDs/IPs, and conflicting
  or unhealthy duplicate entries.

### Home Assistant flow boundary

For each planned device, in order:

1. Start a `tuya_local` config flow.
2. Select manual setup mode; this avoids a separate Tuya Local cloud login.
3. Submit device ID, IP, in-memory local key, protocol, `poll_only=false`, and
   no child-device CID.
4. Require the connection test to advance to `select_type` or
   `select_type_auto_detected`.
5. Select the exact allowlisted profile, including its returned compound
   manufacturer/model value when present.
6. Submit the entry title at `choose_entities`.
7. Require a `create_entry` result and capture the new entry ID.
8. Reload the new entry and poll until its state is `loaded`.
9. Query the entity registry and current states. Require the primary profile
   state or telemetry to be available before advancing.

Always delete an incomplete transient flow. Do not delete a created entry
automatically when verification fails; stop and preserve evidence for repair.

## Failure Handling

- Dry-run is the CLI default and performs credential, cloud-map, LAN, plan,
  duplicate, and profile checks without creating config entries.
- Apply mode is explicitly gated by `--apply`.
- Stop the batch on the first error and report the device name, completed
  entry IDs, flow step, and redacted error.
- Treat Home Assistant `abort` for an existing unique ID as an unexpected
  collision because exact completed IDs must be classified during preflight.
- Never retry a rejected local key or profile with guessed values.
- Resume by re-reading HA state and planning only the remaining devices.

## Verification

- Unit tests cover plan validation, credential redaction, cloud-map selection,
  every config-flow transition, compound profile selection, duplicate abort,
  flow cleanup, stop-on-first-failure, entry reload, and entity-state checks.
- Stateful fake transports cover the complete dry-run and apply sequence.
- Quality gates: pytest, coverage at least 80%, flake8, mypy, and pylint.
- Live verification sequence: dry-run all 12, apply sequentially, read back all
  config entries, then read primary entity states independently.
- Update the migration inventory with entry IDs and verified status only after
  successful readback.

## Out of Scope

- Migrating the two offline/bad-address existing entries.
- Adding currently undiscoverable or hub-dependent devices.
- Cloud-to-local entity-ID cutover.
- Editing automations, scripts, dashboards, or Tuya cloud account data.
