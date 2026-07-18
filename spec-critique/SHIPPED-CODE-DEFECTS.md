# Shipped-code defects (need their own plan + operator GO)

## Shipped-code defects (need their own plan + operator GO)

- SEC-2 (`module_config` GET is not admin-gated)
  - Severity: **CRITICAL**
  - Location: `custom_components/oig_cloud/api/ha_rest_api.py:1213-1229`
  - What is wrong: `POST` is admin-only, but `GET /api/oig_cloud/{box_id}/module_config` currently accepts authenticated non-admins and returns location-related config fields.
  - Fix needed: add admin-only check for GET path (or explicit field redaction policy), align with POST behavior, and cover with regression test.

- AIK-1 (`AiKeyStore` cannot delete/clear keys)
  - Severity: **MAJOR**
  - Location: `custom_components/oig_cloud/ai/key_store.py:43-67`, `custom_components/oig_cloud/__init__.py:1932`
  - What is wrong: store supports set/get/mark/mark_unverified/state but no delete/clear; key stores survive entry cleanup paths.
  - Fix needed: add `async_clear` in `AiKeyStore`, call from DELETE or lifecycle cleanup, and assert storage file removal during integration removal flow.

- AIK-2 (rotation/provider mismatch leaves stale key state)
  - Severity: **MAJOR**
  - Location: `custom_components/oig_cloud/config/steps.py:3599-3612`
  - What is wrong: changing provider without a new key, or storing blank key, can leave stale values that do not match `ai_provider`.
  - Fix needed: reject/clear on provider mismatch and validate before write; ensure storage and options remain consistent.

- AIK-3 (`/ai` replacement stores before verify)
  - Severity: **MAJOR**
  - Location: `custom_components/oig_cloud/api/ha_rest_api.py:1394-1424`
  - What is wrong: key is written before verification result; temporary provider failures can replace a valid key with unverified material.
  - Fix needed: persist candidate key only in a verified path or mark separately and only promote on success.

- AIK-4 (raw exception detail can leak provider-level details)
  - Severity: **MINOR**
  - Location: `custom_components/oig_cloud/api/ha_rest_api.py:1411-1420`
  - What is wrong: REST error response includes `detail: str(err)` and may reflect sensitive context.
  - Fix needed: redact raw detail, return classified error code, and keep full trace only in logs.

- AIK-5 (`task` is free text inside prompt payload)
  - Severity: **MAJOR**
  - Location: `custom_components/oig_cloud/ai/backends.py:60-72`
  - What is wrong: raw user/provider-facing `task` text is concatenated into prompt text and can bypass allow-list boundaries.
  - Fix needed: require enum/constant task names and typed collectors only; reject unknown task strings.

- AIK-7 (AI task delegation path depends on unverified branch)
  - Severity: **MAJOR**
  - Location: `custom_components/oig_cloud/ai_task.py:108-138`
  - What is wrong: delegation branch is marked UNVERIFIED and can change wire contract silently under HA runtime upgrade.
  - Fix needed: add runtime verification matrix per HA version and pin tested behavior; block unknown branch usage until verified.
