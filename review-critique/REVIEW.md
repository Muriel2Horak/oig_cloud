# Plan 3 Tasks 8–14 — security-focused review

## Review basis

- Binding specification: `SCOPE-REVISION.md`.
- Reviewed commit range: `b0ebf983b..99d5a0a6c` (seven commits, Tasks 8–14).
- The launched checkout `/repos/wt-p3-review` is actually the unrelated `agent-ops` repository at `d2e3053`; it does not contain either review boundary. The exact requested branch tip (`codex/f1-plan3-impl` at `99d5a0a6c`) was therefore read from `/repos/wt-oig-p3impl`. This report is written here only because the fleet brief requires `review-critique/REVIEW.md` relative to the launched checkout.
- `git -C /repos/wt-oig-p3impl diff --check b0ebf983b..HEAD -- custom_components/ tests/ hacs.json` was clean. No broad green test claim is made: the review found integration paths that the added tests do not exercise.

## Commit ledger

| Task | Commit | Verdict | Evidence |
|---|---|---|---|
| T8 | `355305316` | **FLAG** | The key is correctly popped before options are updated (`custom_components/oig_cloud/config/steps.py:3596-3612`) and the registry excludes it (`custom_components/oig_cloud/config_registry.py:256-265`). However, the claimed “config-flow AI step” exists only on `OigCloudOptionsFlowHandler` (`custom_components/oig_cloud/config/steps.py:3381`, `:3540-3617`), not the initial `ConfigFlow` (`:3108-3153`), so a new-install config flow cannot reach it. |
| T9 | `31a0a489d` | **FLAG** | `hacs.json:8` sets HA 2025.8 and `__init__.py:63-65` conditionally forwards `Platform.AI_TASK`, but `ai_task.py` contains no platform `async_setup_entry`, never constructs `OigAiTaskEntity`, and never initializes `_provider`/`_backend`. Its host delegation also submits the wrong HA service payload (`ai_task.py:75-85`), and the Groq/NVIDIA branch bypasses the anonymity builder (`ai_task.py:51-52`). |
| T10 | `e4b7e3295` | **FLAG** | The endpoint, local prefix check, `.storage` write, verification probe, and restricted response shape exist (`ha_rest_api.py:1321-1420`), but the admin guard reads `request.app["hass_user"]` (`:1334-1342`). HA 2025.8 auth middleware writes the authenticated user to the request mapping, so real admins are rejected before the endpoint can work. |
| T11 | `14ffe2f81` | **FLAG** | Versioned soft state and REST methods exist and contain no lock concept (`onboarding/state.py:30-37`, `ha_rest_api.py:1423-1488`). The REST guard repeats T10’s wrong user lookup (`ha_rest_api.py:1440-1446`), and `is_grandfathered()` is never called, so no API response can contain the `grandfathered` value consumed by the frontend. |
| T12 | `8345a7180` | **FLAG** | Provider guides, key-shape validation, and an AI card component exist (`www_v2/src/ui/features/onboarding/step-ai.ts:27-94`, `onboarding/index.ts:78-214`), but this is not a working wizard shell: it has no step navigation, complete/skip action, or explicit `[Ověřit]` button, and the component is never mounted by the final app. |
| T13 | `cded22ffc` | **FLAG** | Solar/pricing files are typed descriptors only (`step-solar.ts:19-29`, `step-pricing.ts:9-15`). `git grep STEP_SOLAR/STEP_PRICING` finds production definitions but no renderer/consumer, so steps ②/③ are not implemented as user-facing wizard steps. |
| T14 | `99d5a0a6c` | **FLAG** | The dashboard is not hard-gated and the status banner/settings button render (`app.ts:1297-1331`, `settings/index.ts:915-940`). Both launch paths only bubble another `launch-onboarding` event (`app.ts:968-974`); no code imports/renders the wizard or handles that event by opening one. The “grandfathered gets no banner” branch checks a property the backend never supplies (`app.ts:1298-1300`). |

## Defects

### 1. AI Task platform forwards a module that never registers an entity

- **Severity:** High (core advertised feature is absent; can also prevent/poison platform setup depending on HA’s platform-loader handling).
- **Location:** `custom_components/oig_cloud/__init__.py:63-65`; `custom_components/oig_cloud/ai_task.py:30-85`.
- **Scenario:** On HA >= 2025.8, config-entry setup forwards `Platform.AI_TASK`. The platform module has no `async_setup_entry(hass, entry, async_add_entities)` and no other construction site for `OigAiTaskEntity`; a user selecting any AI provider gets no OIG AI Task entity. A repository-wide search also finds `ai_provider`, `ai_base_url`, and `ai_model` only in registry/form code, never in runtime initialization.
- **Required repair:** Add the platform setup entry point, load provider/key/config, construct the correct backend, initialize stable entity identity/attributes, and add the entity through `async_add_entities`. Exercise this on an ai_task-capable HA harness rather than skipping the entire runtime path.

### 2. `provider="ai_task"` calls Home Assistant with an invalid service schema

- **Severity:** High (the co-equal host-AI provider path always fails).
- **Location:** `custom_components/oig_cloud/ai_task.py:55-85`.
- **Scenario:** Even if the entity is manually wired, selecting `ai_task` calls `ai_task.generate_data` with `{"task": GenDataTask(...)}`. HA 2025.8’s service requires `task_name` and `instructions` (plus optional `entity_id`, `structure`, and `attachments`); it has no `task` field. Service validation rejects the call before any configured host AI runs. The added test monkeypatches this method (`tests/test_ai_task_entity.py:68-88`), so it proves only branch selection, not delegation.
- **Required repair:** Call the supported AI Task API with the documented fields/result shape (or call the component helper directly), and integration-test against HA >= 2025.8.

### 3. The outgoing Groq/NVIDIA request bypasses the prompt allow-list

- **Severity:** High (privacy/data-exposure requirement).
- **Location:** `custom_components/oig_cloud/ai_task.py:49-53`; `custom_components/oig_cloud/ai/backends.py:59-71`, `:95-105`.
- **Scenario:** The entity passes `task.instructions` directly to `OpenAiCompatBackend.async_generate_data`, which places that string unchanged in `messages[0].content`. `build_anonymous_prompt()` is not called anywhere in production (`git grep build_anonymous_prompt` finds only its definition and tests). Therefore instructions containing an email, entity ID, box ID, or coordinates are sent verbatim to Groq/NVIDIA once the entity wiring is repaired. `tests/test_ai_backends.py:153-172` pre-sanitizes the test input before invoking the backend and therefore does not prove enforcement at the outgoing boundary.
- **Required repair:** Make the outbound API boundary accept structured task data and build the prompt internally through the allow-list; do not accept an already-rendered arbitrary string from callers. Assert against a deliberately leaky input passed through the same production entry point used by the entity.

### 4. Both new admin endpoints read the authenticated user from the wrong place

- **Severity:** High (both new REST surfaces are unusable in real HA).
- **Location:** `custom_components/oig_cloud/api/ha_rest_api.py:1334-1342`, `:1440-1446`.
- **Scenario:** HA 2025.8 auth middleware sets `request[KEY_HASS_USER]`; it does not put the user in `request.app`. A real authenticated admin therefore reaches `_require_admin()` with no `request.app["hass_user"]` and receives 403 from both `/ai` and `/onboarding`. This also makes `app.ts:879-884` load no onboarding state, so the banner never appears. The tests hide the defect by constructing a dummy request whose user is placed in `app` (`tests/test_ai_rest.py:66-79`).
- **Required repair:** Read `request.get(KEY_HASS_USER)`/`request[KEY_HASS_USER]` using HA’s constant and retain the fail-closed null/admin check; test the request mapping, absent user, non-admin, and admin cases for both views.

### 5. The onboarding launchers are inert and steps ②/③ are not rendered

- **Severity:** High (the promised guided flow is not wired in).
- **Location:** `custom_components/oig_cloud/www_v2/src/ui/app.ts:968-974`, `:1324-1330`, `:1425-1432`; `www_v2/src/ui/features/onboarding/step-solar.ts:19-29`; `step-pricing.ts:9-15`.
- **Scenario:** Clicking either “Spustit průvodce” button causes the child to dispatch `launch-onboarding`; `OigApp` stops that event and dispatches the same event outward, but never changes state, imports `onboarding/index.ts`, or renders a wizard. `STEP_SOLAR` and `STEP_PRICING` have no production consumer. The UI test only asserts that the launcher button exists (`onboarding-soft-gate.test.ts:114-117`), so it passes while the click does nothing.
- **Required repair:** Add an in-app wizard/modal state and event handler, mount all three step components, wire registry-driven fields/save/test actions, and test a real click through opening, skipping/completing, persistence, and closing.

### 6. Grandfathering and skipping exist only as disconnected types/helpers

- **Severity:** Medium.
- **Location:** `custom_components/oig_cloud/onboarding/state.py:30-58`, `:85-101`; `www_v2/src/ui/app.ts:1297-1300`; `www_v2/src/ui/features/onboarding/onboarding-data.ts:32-45`, `:94-105`, `:128-138`.
- **Scenario:** `is_grandfathered()` is exported and unit-tested but never used, while the persisted/API state has no `grandfathered` field. After the auth bug is fixed, a previously configured entry still cannot satisfy `app.ts`’s no-banner branch. Separately, the frontend type recognizes `skipped`, but the backend only supports marking a step `done`, no skip UI calls the endpoint, and the banner treats every value other than `done` as unfinished. Users therefore cannot exercise the promised per-step skip behavior.
- **Required repair:** Compute and return grandfathering from the owning entry’s options (or initialize state accordingly), implement an explicit validated skip transition, and make banner completion use the same terminal-state helper as the wizard.

## Security checklist

| Check | Result | Evidence |
|---|---|---|
| Provider key lives only in `AiKeyStore` `.storage`, never options/registry | **PASS** | `steps.py:3599` removes `ai_api_key` before building the option update and writes it via `AiKeyStore` at `:3606-3609`; `config_registry.py:256-265` has no key field; REST writes through `AiKeyStore` at `ha_rest_api.py:1389-1391`. |
| Key is never logged in cleartext | **PASS** | `ai/key_store.py:19-27` defines redaction and `:46` logs only `redact_key(api_key)`; REST verification logging uses `redact_key` at `ha_rest_api.py:1410-1413`. `git grep` found no other AI-key logger. |
| `/ai` and `/onboarding` are admin-gated and fail closed before existence/data disclosure | **FAIL** | The checks occur before entry lookup (`ha_rest_api.py:1344-1352`, `:1448-1456`) and do fail closed, but they consult `request.app` rather than HA’s authenticated request mapping (`:1340`, `:1443`). Result: non-admin data is not leaked, but real admins are also always denied, so these are not correctly functioning admin gates. |
| `GET /ai` never echoes key/prefix | **PASS** | `AiKeyStore.async_api_state()` returns exactly `provider`, `key_set`, `verified` (`ai/key_store.py:59-66`), and GET returns only that shape (`ha_rest_api.py:1344-1353`). |
| `provider="ai_task"` never calls the OIG backend | **PASS** (branch only) | `ai_task.py:44-52` branches to `_async_delegate_to_host_ai_task`; the OIG backend is only in `else`. The branch’s runtime delegation is nevertheless broken as Defect 2 describes. |
| Prompt anonymity is enforced by an allow-list on the outgoing body | **FAIL** | The allow-list builder exists at `ai/backends.py:59-71`, but the production caller sends raw `task.instructions` (`ai_task.py:51-52`) and the backend puts it unchanged in the outgoing body (`ai/backends.py:95-104`). Production never calls `build_anonymous_prompt`. |
| `POST /ai` rejects malformed prefixes locally before network | **PASS** | Provider/key/prefix checks finish at `ha_rest_api.py:1371-1387`; session/backend creation and `async_verify_key()` occur later at `:1397-1408`. |
| Onboarding carries no lock/gate and dashboard always renders | **PASS** | Persisted state contains only schema/steps/timestamps/provider (`onboarding/state.py:30-37`), and `app.ts:1302-1457` always renders tabs/dashboard; the banner is additive. The separate launcher/grandfathering defects do not create a hard gate. |

## Overall assessment

The diff is in scope and contains useful building blocks (private key storage, response minimization, local prefix validation, soft-state persistence, and an additive banner), but it is **not mergeable as Tasks 8–14**. The central AI entity is never registered, host-AI delegation uses an invalid API, the outbound privacy allow-list is bypassed, both new REST surfaces reject real admins, and the onboarding wizard is not mounted. Repair spans backend platform setup, HA API integration, authorization tests, prompt-boundary design, and frontend state/rendering, so the required rework is **substantial**, not trivial.
