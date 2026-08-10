# Home Assistant auth refresh and request security implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Route every v2 OIG REST request through Home Assistant's refresh-aware transport without credential leakage or unsafe mutation replay.

**Architecture:** Keep `HaClient` as the public facade. Add one private canonical-path/header/dispatch seam in `ha-client.ts`; typed and untyped wrappers share it but retain their existing public result models. Home Assistant owns token refresh. OIG owns the narrow path boundary, retry policy, safe classification, and log redaction.

**Tech Stack:** TypeScript, Home Assistant frontend `fetchWithAuth`, Vitest, jsdom, ESLint, Playwright.

---

## Contract references

- Design: `docs/superpowers/specs/2026-08-10-wizard-v2-auth-solar-design.md`
- Production facade: `custom_components/oig_cloud/www_v2/src/data/ha-client.ts`
- Existing raw-fetch helper: `custom_components/oig_cloud/www_v2/src/data/api.ts`
- Logger: `custom_components/oig_cloud/www_v2/src/core/logger.ts`
- Unit tests: `custom_components/oig_cloud/www_v2/src/__tests__/ha-client.test.ts`
- Browser harness: `custom_components/oig_cloud/www_v2/playwright/boiler-v2-smoke.mjs`

### Task 1: Lock the authenticated transport contract with RED tests

**Files:**

- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/ha-client.test.ts`

- [ ] Replace the immortal token-only `Hass` fixture with a refresh-aware fake exposing `auth.expired` and `fetchWithAuth(path, init)`.
- [ ] Give the fake a separate `dispatch` spy. When expired, Home Assistant refreshes and writes `headers.authorization = "Bearer fresh-token"` before dispatch. Do not use `global.fetch` as the transport spy and do not assert that upstream coalesces refresh calls.
- [ ] Add typed and untyped success tests asserting the exact canonical `/api/oig_cloud/...` path, copied plain-object headers, `redirect: "manual"`, preserved signal/body/method, fresh bearer token, and zero direct global-fetch calls.
- [ ] Add a current-token test asserting zero refreshes and one dispatch.
- [ ] Add a concurrent-expiry test with two wrapper calls; assert OIG never invokes refresh directly and neither dispatch contains the stale token. Accept one or more HA-owned refresh calls.
- [ ] Run `TZ=UTC npm run test:unit -- --run src/__tests__/ha-client.test.ts`; expect new delegation tests to fail against manual-token/global-fetch code.

### Task 2: Lock path, header, and redirect boundaries with RED tests

**Files:**

- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/ha-client.test.ts`

- [ ] Add a passing table for `/api/oig_cloud`, child paths, and existing query-string endpoints.
- [ ] Add a rejection table for `https://evil.example`, `//evil.example`, localhost, `127.0.0.1`, `[::1]`, credentials, alternate ports, backslashes, fragments, malformed percent encoding, `/api/other`, `/api/oig_cloud_evil`, raw/encoded dot segments, and double-decoded traversal.
- [ ] Assert every rejected value causes zero HA transport and zero dispatch calls.
- [ ] Pass `Authorization`, `authorization`, and mixed-case variants as object, tuple, and `Headers` input. Assert none survives and HA can inject the fresh lowercase property into the copied plain record.
- [ ] Return each HTTP `3xx` plus `type: "opaqueredirect"`; assert one dispatch, no follow/retry, untyped `null`, and exact typed `{ ok: false, status: 0, code: "redirect_blocked", error: "Authenticated redirect blocked" }` for every case.
- [ ] Run the focused test command; expect failures until the shared seam exists.

### Task 3: Lock retry, failure-shape, abort, and redaction behavior with RED tests

**Files:**

- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/ha-client.test.ts`
- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/onboarding-soft-gate.test.ts`

- [ ] Use fake timers to assert untyped GET retries transport failures and `502/503/504` only, within the current four-total-attempt bound and one-second delay.
- [ ] Mirror the full GET retry/no-retry table for HEAD, including transport, `502/503/504`, redirect, abort, auth, `401/403/429`, and mutation exclusion.
- [ ] Assert untyped GET does not retry `401`, `403`, `429`, abort, redirect failure, or other `4xx/5xx` statuses.
- [ ] Assert typed calls are always single-dispatch.
- [ ] Assert POST/PUT/PATCH/DELETE are single-dispatch for transport ambiguity and every tested HTTP status.
- [ ] Assert absent HASS and an expired HA fake whose refresh rejects return untyped `null` and exact typed `{ ok: false, status: 0, code: "auth", error: "Home Assistant authentication unavailable" }`, with zero dispatch calls.
- [ ] Assert a caller abort returns exact typed `{ ok: false, status: 0, code: "aborted", error: "Request aborted" }`.
- [ ] Assert non-auth transport rejection returns `provider_unreachable` plus fixed `Provider request failed`; never include the raw exception.
- [ ] Seed token, API-key, Site-ID, URL-query, body, exception, and stack sentinels. Inspect all console calls, results, and rendered onboarding text; assert no sentinel appears.
- [ ] Run the focused tests; expect classification/redaction failures.

### Task 4: Implement one refresh-aware request seam

**Files:**

- Modify: `custom_components/oig_cloud/www_v2/src/data/ha-client.ts`
- Modify: `custom_components/oig_cloud/www_v2/src/core/logger.ts` only if a classified-event helper is required

- [ ] Extend `Hass` with `auth.expired: boolean` and `fetchWithAuth(path: string, init?: RequestInit): Promise<Response>`; remove request-dispatch dependence on `auth.data.access_token`.
- [ ] Add private pure helpers for canonical OIG path validation and plain-record header normalization. Reject before `getHass()` transport use.
- [ ] Strip caller Authorization case-insensitively, set JSON content type only when absent, and force `redirect: "manual"`.
- [ ] Classify returned `3xx` and `opaqueredirect` as terminal `redirect_blocked`. Keep a thrown network `TypeError` retryable only for untyped GET/HEAD; never conflate it with an observed redirect response.
- [ ] Add one private dispatch method receiving wrapper kind and retry policy. Delegate every attempt to `hass.fetchWithAuth`.
- [ ] For a rejection, classify `auth` only when HASS is absent or the delegated call rejects while `hass.auth.expired` remains true; otherwise classify a safe transport failure. Never inspect or serialize the token.
- [ ] Keep untyped retry limited to GET/HEAD transport errors and `502/503/504`. Keep typed and all mutation methods single-dispatch.
- [ ] Make logs structured and fixed-text: wrapper kind, method, safe code only. Remove endpoint, URL, raw exception, and stack from auth request paths.
- [ ] Route `fetchOIGAPI` and `fetchOIGAPITyped` through the seam while preserving parsed HTTP bodies and server error codes.
- [ ] Run focused tests; expect green.

### Task 5: Remove the production raw-fetch escape hatch

**Files:**

- Delete: `custom_components/oig_cloud/www_v2/src/data/api.ts` if `rg` confirms no imports
- Modify: `custom_components/oig_cloud/www_v2/vite.config.ts`
- Add: focused deterministic build-ID tests or release-script tests covering Vite inputs
- Modify callers/tests only if `rg -n "from ['\"]@?/?.*data/api|new ApiClient|apiClient" custom_components/oig_cloud/www_v2/src` finds a live use

- [ ] Prove call-site status with `rg` before deletion.
- [ ] Delete the unused arbitrary-base-URL/caller-token client. If a live production caller exists, migrate it to `HaClient` and remove base URL/token parameters.
- [ ] Run a repository-wide tracked-file scan, excluding dependency/coverage directories, for `auth.data.access_token`, caller bearer construction, authenticated `globalThis.fetch`/`window.fetch`/`fetch`, and the deleted API client. Include `www_v2/dist/assets/index.js` and source maps; allow only documented test fixtures.
- [ ] Rebuild v2 distribution from reviewed source and fail if `git diff` shows a stale/unreproducible tracked bundle. Assert served `index.js` and map contain no legacy manual-token dispatch.
- [ ] Replace `Date.now()` cache busting with a SHA-256 over a sorted explicit input set: `src/**`, `index.html`, `vite.config.ts`, `package.json`, `package-lock.json`, and TypeScript configs, excluding dist/tests/Playwright/node_modules/coverage. Reject a supplied `OIG_BUILD_ID` that differs from the computed value.
- [ ] Build twice in isolated directories and byte-compare every `dist` file/map. Assert identical inputs keep the ID/bytes and changing one executable input changes the ID/index reference.
- [ ] Run `npm run typecheck` and the full unit suite under `TZ=UTC`.

### Task 6: Add the browser expiry regression harness

**Files:**

- Add: `custom_components/oig_cloud/www_v2/playwright/auth-refresh.spec.ts`
- Modify: `custom_components/oig_cloud/www_v2/playwright.config.ts`

- [ ] Mount the v2 app with a controllable HA fake whose initial auth is expired.
- [ ] Record refresh count, bearer value, OIG requests, invalid-auth requests, and mutation dispatches.
- [ ] Exercise one read and one settings/test POST. Assert HA-owned refresh, only fresh credentials, zero invalid-auth requests, and one mutation dispatch; do not require refresh coalescing.
- [ ] Exercise refresh rejection. Assert zero OIG dispatch, safe UI error, and no sentinels in browser console/page text.
- [ ] Run `npm run test:e2e -- auth-refresh.spec.ts`; expect green.

### Task 7: Verify and commit the auth slice

**Files:** all auth-slice files above

- [ ] Run `TZ=UTC npm run test:unit -- --run src/__tests__/ha-client.test.ts src/__tests__/onboarding-soft-gate.test.ts`.
- [ ] Run `npm run typecheck`, `npm run lint -- --quiet`, `npm run build`, and `npm run test:e2e -- auth-refresh.spec.ts` from `custom_components/oig_cloud/www_v2`.
- [ ] Re-run the repository-wide source/bundle/map auth scan and a clean-build byte comparison required by the release plan.
- [ ] Run the repository security commands defined by the quality-gate plan; confirm no token/header/path finding.
- [ ] Run `git diff --check` and inspect `git diff` for raw secrets or accidental generated changes.
- [ ] Commit only this slice: `fix: delegate OIG requests to Home Assistant auth`.
