# Tuya Local Batch Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 12 allowlisted, reachable Tuya cloud devices to Home Assistant `tuya_local` without QR login, persisted secrets, cloud-entity changes, or consumer cutover.

**Architecture:** Split the operational tool into plan/orchestration, secret/cloud/LAN sources, and Home Assistant config-flow boundaries. Read official Tuya credentials from the existing HA SMB share, fetch local keys into memory, validate every device locally, then create and verify entries sequentially through HA APIs.

**Tech Stack:** Python 3.12+, Home Assistant REST/WebSocket APIs, `tuya-device-sharing-sdk`, `tinytuya`, `smbprotocol`, pytest, pytest-cov, flake8, mypy, pylint.

## Global Constraints

- Follow `docs/superpowers/specs/2026-08-06-tuya-local-batch-migration-design.md` exactly.
- Keep access tokens, refresh tokens, SMB credentials, and local keys in process memory only.
- Never include secrets in plans, logs, exceptions, fixtures, snapshots, or persisted JSON.
- Default every CLI command to dry-run; require explicit `--apply` for HA writes.
- Stop on the first failed device; retain already verified entries.
- Do not modify cloud entities, entity IDs, automations, scripts, dashboards, or Tuya account data.
- Preserve the user's unrelated `custom_components/oig_cloud/www_v2/dist/index.html` change.
- Run pytest, coverage at least 80%, flake8, mypy, and pylint before live apply.

---

## File Structure

- Create `scripts/tuya_local_batch.py`: plan models, validation, batch orchestration, result reporting, and CLI.
- Create `scripts/tuya_local_sources.py`: SMB credential reader, official Tuya cloud device source, and TinyTuya LAN probe.
- Create `scripts/tuya_local_ha_flow.py`: HA config-flow client, config-entry reload/state polling, and WebSocket entity verification.
- Create `tests/test_tuya_local_batch.py`: plan, orchestration, stop/resume, redaction, and CLI tests.
- Create `tests/test_tuya_local_sources.py`: credential, cloud-map, key handling, and LAN-probe tests.
- Create `tests/test_tuya_local_ha_flow.py`: stateful end-to-end config-flow and entity-verification tests.
- Create `.omx/research/tuya-local-batch.json`: non-secret 12-device allowlist.
- Modify `.omx/research/tuya-migration-inventory.md`: write live results only after independent readback.

---

### Task 1: Non-secret allowlist and plan validation

**Files:**
- Create: `.omx/research/tuya-local-batch.json`
- Create: `scripts/tuya_local_batch.py`
- Create: `tests/test_tuya_local_batch.py`

**Interfaces:**
- Produces: `DeviceTarget`, `BatchPlan`, `load_batch_plan(path)`, `validate_batch_plan(plan)`.
- `DeviceTarget`: `name`, `device_id`, `host`, `protocol_version`, `profile`, `title`, `primary_domains`.
- `BatchPlan`: immutable tuple of exactly 12 `DeviceTarget` values.

- [ ] **Step 1: Write failing plan tests**

```python
def test_load_batch_plan_contains_exact_allowlist(tmp_path):
    plan = batch.load_batch_plan(checked_plan_path)
    assert len(plan.devices) == 12
    assert {item.device_id for item in plan.devices} == EXPECTED_IDS

def test_plan_rejects_duplicate_id_ip_or_wrong_count():
    with pytest.raises(batch.BatchSafetyError):
        batch.validate_batch_plan(unsafe_plan)

def test_plan_repr_contains_no_secret_fields():
    assert "local_key" not in repr(checked_plan)
```

- [ ] **Step 2: Run the focused RED test**

Run: `.ha-env/bin/python -m pytest -q tests/test_tuya_local_batch.py`

Expected: FAIL because `scripts.tuya_local_batch` does not exist.

- [ ] **Step 3: Implement minimal immutable models and validation**

```python
@dataclass(frozen=True)
class DeviceTarget:
    name: str
    device_id: str
    host: str
    protocol_version: str
    profile: str
    title: str
    primary_domains: tuple[str, ...]

@dataclass(frozen=True)
class BatchPlan:
    devices: tuple[DeviceTarget, ...]

def validate_batch_plan(plan: BatchPlan) -> None:
    if len(plan.devices) != 12:
        raise BatchSafetyError("Batch plan must contain exactly 12 devices")
    # Validate unique IDs/IPs, IPv4 hosts, protocols 3.3/3.4/3.5, profiles,
    # titles, and non-empty primary domains.
```

- [ ] **Step 4: Populate exact JSON from the approved design**

Use the 12 rows from the design. Set titles to `<cloud name> - local` and primary domains as follows:

- `relay_switch_remote`: `switch`
- `smartplugv2_energyv2`: `switch`, `sensor`
- `quad_powerstrip_usb`: `switch`
- `rgbcw_lightbulb_xld_cl002`: `light`
- `snt957w_tde_temp`: `sensor`

- [ ] **Step 5: Run tests and static checks**

Run:

```bash
.ha-env/bin/python -m pytest -q tests/test_tuya_local_batch.py
.ha-env/bin/python -m flake8 scripts/tuya_local_batch.py
.ha-env/bin/python -m mypy --follow-imports=skip scripts/tuya_local_batch.py
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit Task 1**

```bash
git add -f .omx/research/tuya-local-batch.json scripts/tuya_local_batch.py tests/test_tuya_local_batch.py
git commit -m "feat: validate Tuya Local migration allowlist" -m "Add the exact non-secret 12-device plan and fail-closed validation. Tests: focused pytest, flake8, mypy."
```

---

### Task 2: In-memory official Tuya and LAN sources

**Files:**
- Create: `scripts/tuya_local_sources.py`
- Create: `tests/test_tuya_local_sources.py`
- Modify: `scripts/tuya_local_batch.py`

**Interfaces:**
- Produces: `OfficialTuyaCredentials`, `CloudDevice`, `LanStatus`.
- Produces protocols: `CredentialSource.load()`, `CloudSource.fetch(credentials)`, `LanProbe.status(target, local_key)`.
- Produces implementations: `SmbCredentialSource`, `TuyaSharingCloudSource`, `TinyTuyaLanProbe`.
- Secrets use `repr=False`; result/report models never contain credential or key fields.

- [ ] **Step 1: Write failing source tests with injected fakes**

```python
def test_smb_source_selects_only_official_tuya_entry_and_redacts_repr():
    credentials = source.load()
    assert credentials.user_code == "1234567"
    assert "access-token" not in repr(credentials)

def test_cloud_source_requires_all_allowlisted_devices_and_keys():
    devices = cloud.fetch(credentials)
    selected = batch.join_cloud_devices(plan, devices)
    assert len(selected) == 12
    assert all(item.local_key for item in selected)

def test_lan_probe_rejects_error_payload_or_wrong_id():
    with pytest.raises(batch.BatchSafetyError):
        probe.status(target, "in-memory-key")
```

- [ ] **Step 2: Run the focused RED tests**

Run: `.ha-env/bin/python -m pytest -q tests/test_tuya_local_sources.py`

Expected: FAIL because the source module and interfaces do not exist.

- [ ] **Step 3: Implement the SMB credential reader**

Read `\\<host>\config\.storage\core.config_entries` with `smbclient.open_file` inside the method. Select exactly one `domain == "tuya"` entry and validate `user_code`, `terminal_id`, `endpoint`, and all five `token_info` fields. Import `smbclient` lazily so unit tests and `--help` do not require the optional runtime dependency.

- [ ] **Step 4: Implement the official Tuya cloud source**

Construct `tuya_sharing.Manager` with client ID `HA_3y9q4ak7g4ephrvke`, call `update_device_cache()`, normalize metadata, and retain local keys only in private in-memory objects. Import `tuya_sharing` lazily. Reject cloud maps that omit an allowlisted ID, report an offline target, or return an empty local key.

- [ ] **Step 5: Implement the TinyTuya LAN probe**

Construct `tinytuya.Device(device_id, host, local_key)`, set the exact protocol, use a five-second socket timeout, and call `status()`. Reject error payloads and require at least one DPS value. Do not send control commands.

- [ ] **Step 6: Run source and regression tests**

Run:

```bash
.ha-env/bin/python -m pytest -q tests/test_tuya_local_sources.py tests/test_tuya_local_batch.py
.ha-env/bin/python -m flake8 scripts/tuya_local_sources.py scripts/tuya_local_batch.py
.ha-env/bin/python -m mypy --follow-imports=skip scripts/tuya_local_sources.py scripts/tuya_local_batch.py
```

Expected: all commands exit 0; output contains no fixture secrets.

- [ ] **Step 7: Commit Task 2**

```bash
git add scripts/tuya_local_sources.py scripts/tuya_local_batch.py tests/test_tuya_local_sources.py
git commit -m "feat: source Tuya keys in memory" -m "Read the authenticated HA Tuya entry, fetch allowlisted cloud devices, and validate local DPS without persisting secrets. Tests: focused pytest, flake8, mypy."
```

---

### Task 3: Stateful Home Assistant config-flow client

**Files:**
- Create: `scripts/tuya_local_ha_flow.py`
- Create: `tests/test_tuya_local_ha_flow.py`
- Modify: `scripts/tuya_local_batch.py`

**Interfaces:**
- Consumes: `DeviceTarget` and an in-memory local key.
- Produces: `CreatedEntry(entry_id, title, entity_ids)`.
- Produces: `HomeAssistantTuyaLocalClient.classify_existing(targets)`, `create_device(target, local_key)`, `reload_and_wait(entry_id)`, `verify_primary_entities(entry_id, domains)`.

- [ ] **Step 1: Write a stateful fake flow and RED tests**

```python
def test_create_device_completes_all_flow_steps_and_selects_exact_profile():
    created = client.create_device(target, "in-memory-key")
    assert created.entry_id == "new-entry"
    assert transport.submitted_profiles == ["smartplugv2_energyv2||Tuya||Plug"]

def test_create_device_deletes_flow_and_redacts_error_on_failure():
    with pytest.raises(flow.FlowSafetyError) as error:
        client.create_device(target, "in-memory-key")
    assert transport.deleted_flow_ids == ["flow-1"]
    assert "in-memory-key" not in str(error.value)

def test_verify_primary_entities_requires_loaded_available_domain():
    assert client.verify_primary_entities("new-entry", ("switch", "sensor"))
```

- [ ] **Step 2: Run focused RED tests**

Run: `.ha-env/bin/python -m pytest -q tests/test_tuya_local_ha_flow.py`

Expected: FAIL because `scripts.tuya_local_ha_flow` does not exist.

- [ ] **Step 3: Implement exact config-flow transitions**

Use `HomeAssistantHttpTransport` from `scripts.tuya_migration`.

```text
POST /api/config/config_entries/flow
POST /api/config/config_entries/flow/{flow_id}  setup_mode=manual
POST /api/config/config_entries/flow/{flow_id}  device settings
POST /api/config/config_entries/flow/{flow_id}  exact compound profile
POST /api/config/config_entries/flow/{flow_id}  name=<title>
```

Accept only documented step IDs: `user`, `local`, `select_type`, `select_type_auto_detected`, and `choose_entities`. Require final `type=create_entry`. Select a profile value whose prefix before `||` exactly equals `target.profile`; prefer the schema default when it has that prefix.

- [ ] **Step 4: Implement cleanup, duplicate checks, reload, and entity verification**

- Delete an unfinished flow in `finally`.
- Query existing Tuya Local identifiers through `config/device_registry/list`.
- Classify a planned ID as already completed only when its entry is `loaded`
  and its primary entities pass the same availability check; reject unhealthy
  or ambiguous collisions.
- Call `homeassistant.reload_config_entry`, then poll `/api/config/config_entries/entry` for `loaded` up to 30 seconds.
- Use `config/entity_registry/list` and REST states. Require at least one available entity for every target primary domain.
- Never toggle a switch, light, or other control entity.

- [ ] **Step 5: Run flow and regression tests**

Run:

```bash
.ha-env/bin/python -m pytest -q tests/test_tuya_local_ha_flow.py tests/test_tuya_local_batch.py
.ha-env/bin/python -m flake8 scripts/tuya_local_ha_flow.py
.ha-env/bin/python -m mypy --follow-imports=skip scripts/tuya_local_ha_flow.py
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit Task 3**

```bash
git add scripts/tuya_local_ha_flow.py scripts/tuya_local_batch.py tests/test_tuya_local_ha_flow.py
git commit -m "feat: automate Tuya Local config flows" -m "Create allowlisted entries through guarded HA flows, reload them, and verify primary entities. Tests: focused pytest, flake8, mypy."
```

---

### Task 4: Batch orchestration, CLI, and fail-closed reporting

**Files:**
- Modify: `scripts/tuya_local_batch.py`
- Modify: `tests/test_tuya_local_batch.py`

**Interfaces:**
- Produces: `BatchDeviceResult`, `BatchResult`, `run_batch(...)`, `build_parser()`, `main(argv=None)`.
- Dry-run result includes validated remaining targets, verified existing
  targets, and no newly created entry IDs.
- Apply result includes ordered completed entry IDs and stops at the first error.

- [ ] **Step 1: Write RED orchestration and CLI tests**

```python
def test_dry_run_validates_all_12_without_starting_ha_flow():
    result = batch.run_batch(plan, credentials, cloud, probe, hass, apply=False)
    assert len(result.validated) == 12
    assert hass.create_calls == []

def test_apply_stops_at_first_failure_and_keeps_completed_results():
    with pytest.raises(batch.BatchApplyError) as error:
        batch.run_batch(plan, credentials, cloud, probe, hass, apply=True)
    assert error.value.completed_entry_ids == ("entry-1", "entry-2")
    assert hass.create_calls == [first_id, second_id, failing_id]

def test_cli_defaults_to_dry_run_and_never_prints_secret(capsys):
    assert batch.main(valid_args) == 0
    captured = capsys.readouterr()
    assert "DRY-RUN" in captured.out
    assert "local-key" not in captured.out + captured.err
```

- [ ] **Step 2: Run focused RED tests**

Run: `.ha-env/bin/python -m pytest -q tests/test_tuya_local_batch.py`

Expected: FAIL on missing orchestration and CLI behavior.

- [ ] **Step 3: Implement dry-run-first orchestration**

Order operations as: plan validation, credential load, cloud allowlist join,
existing-entry classification, LAN probes for remaining targets, then return a
dry-run summary. In apply mode continue sequentially with create, reload,
entry-state readback, and primary-entity verification. Report exact verified
existing entries separately and never recreate them.

- [ ] **Step 4: Implement CLI**

Required arguments:

```text
--plan
--ha-url
--smb-host
--smb-share (default config)
--token-env (default HA_TOKEN)
--smb-user-env (default SMB_LOGIN)
--smb-password-env (default SMB_PASS)
--apply
```

Print only device name, ID, host, profile, flow/entry status, and entity IDs/states. Return 2 for guarded failures and 1 for unexpected errors after emitting a redacted message.

- [ ] **Step 5: Run the complete quality gate**

Run:

```bash
.ha-env/bin/python -m pytest -q \
  tests/test_tuya_migration.py \
  tests/test_tuya_local_batch.py \
  tests/test_tuya_local_sources.py \
  tests/test_tuya_local_ha_flow.py \
  --cov=scripts.tuya_migration \
  --cov=scripts.tuya_local_batch \
  --cov=scripts.tuya_local_sources \
  --cov=scripts.tuya_local_ha_flow \
  --cov-report=term-missing --cov-fail-under=80
.ha-env/bin/python -m flake8 \
  scripts/tuya_migration.py scripts/tuya_local_batch.py \
  scripts/tuya_local_sources.py scripts/tuya_local_ha_flow.py
.ha-env/bin/python -m mypy --follow-imports=skip \
  scripts/tuya_migration.py scripts/tuya_local_batch.py \
  scripts/tuya_local_sources.py scripts/tuya_local_ha_flow.py
.ha-env/bin/python -m pylint --rcfile=/dev/null --max-line-length=120 \
  --disable=fixme,no-member,protected-access,too-many-arguments,too-many-boolean-expressions,too-many-branches,too-many-locals,too-many-public-methods,too-many-return-statements,too-many-statements,too-few-public-methods,too-many-instance-attributes,duplicate-code,unnecessary-ellipsis \
  scripts/tuya_migration.py scripts/tuya_local_batch.py \
  scripts/tuya_local_sources.py scripts/tuya_local_ha_flow.py
```

Expected: all tests pass, combined coverage is at least 80%, flake8 and mypy report no issues, pylint rates the files 10.00/10.

- [ ] **Step 6: Commit Task 4**

```bash
git add scripts/tuya_local_batch.py tests/test_tuya_local_batch.py
git commit -m "feat: run guarded Tuya Local batches" -m "Add dry-run-first orchestration, fail-closed apply, redacted reporting, and CLI. Tests: full migration pytest, coverage >=80%, flake8, mypy, pylint."
```

---

### Task 5: Live dry-run, sequential apply, and independent verification

**Files:**
- Modify: `.omx/research/tuya-migration-inventory.md`

**Interfaces:**
- Consumes the tested CLI and existing `.ha_config` environment.
- Produces verified HA entry IDs and a non-secret inventory record.

- [ ] **Step 1: Prepare one temporary runtime without storing secrets**

Install `smbprotocol`, `tuya-device-sharing-sdk==0.2.14`, `tinytuya==1.20.0`, and `aiohttp` into a `mktemp -d` virtual environment. Source `.ha_config` only into the command environment. Do not create a credential file.

- [ ] **Step 2: Run live dry-run for all 12 devices**

```bash
python scripts/tuya_local_batch.py \
  --plan .omx/research/tuya-local-batch.json \
  --ha-url "http://${HA_HOST}:8123" \
  --smb-host "$HA_HOST"
```

Expected: `DRY-RUN: 12/12 validated`, zero new config entries, and no secret values in output.

- [ ] **Step 3: Snapshot current Tuya Local entry IDs**

Read `/api/config/config_entries/entry`; record only `entry_id`, title, state, reason, and domain. Expect seven pre-existing Tuya Local entries.

- [ ] **Step 4: Apply the batch sequentially**

Run the same CLI with `--apply`. Expect 12 ordered `loaded` results. On the first failure, stop and diagnose that device before resuming only the remaining allowlisted IDs.

- [ ] **Step 5: Perform independent HA readback**

- Confirm 19 total Tuya Local config entries: seven pre-existing plus 12 new.
- Confirm every new entry is `loaded` with no reason.
- Read device and entity registries by entry ID.
- Confirm every required primary domain has at least one entity whose state is neither `unknown` nor `unavailable`.
- Confirm the two known broken entries remain unchanged.

- [ ] **Step 6: Confirm cloud and consumer invariants**

- Confirm the official Tuya config entry remains `loaded`.
- Confirm no cloud config entry, cloud entity unique ID, automation, script, or dashboard file changed.
- Run `git diff -- custom_components/oig_cloud/www_v2/dist/index.html` only to verify the pre-existing user modification was not touched by this work.

- [ ] **Step 7: Update the non-secret inventory**

Use `apply_patch` to record the 12 new entry IDs, loaded status, primary verified entity IDs, timestamp, and any normal `unknown` configuration-only entities. Do not record local keys or tokens.

- [ ] **Step 8: Run final regression verification**

Repeat the complete Task 4 quality gate and rerun the CLI dry-run. Expected live result: zero remaining planned devices because all 12 unique IDs are already configured and verified.

- [ ] **Step 9: Commit the verified inventory**

```bash
git add -f .omx/research/tuya-migration-inventory.md
git commit -m "docs: record Tuya Local batch results" -m "Record the 12 verified local entries and live entity readback. Tests: full migration quality gate and live HA verification."
```
