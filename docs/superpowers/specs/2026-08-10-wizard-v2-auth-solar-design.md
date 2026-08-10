# Wizard v2 authentication and solar correctness design

Status: approved by operator on 2026-08-10

Target branch: `codex/wizard-v2-auth-fix`

Imported baseline: `f1/wizard-v2-impl` at `1f216150c94c2f3f66183172f973d31acaff9d8d`

## Objective

- Fix expired Home Assistant authentication in the v2 frontend.
- Make solar azimuth consistent in Wizard, Settings, REST, native flow, and provider calls.
- Restore reliable solar forecast refreshes after Home Assistant restarts.
- Preserve existing operator-entered compass values without a bulk numeric migration.
- Land through a reviewed pull request after required quality gates pass.

## Confirmed failures

### Authentication

- `www_v2/src/data/ha-client.ts` reads `hass.auth.data.access_token` directly.
- Both typed and untyped OIG REST wrappers call global `fetch` with that cached token.
- Neither path checks token expiry nor invokes Home Assistant token refresh.
- A continuously visible dashboard can keep sending an expired token.
- Production Home Assistant logs contain repeated invalid-auth requests from OIG API paths.

### Solar azimuth

- Current registry and validators expose Forecast.Solar provider coordinates as the application contract.
- Current Czech help states `0 = south`, `-90 = east`, `90 = west`.
- REST normalizes arbitrary input modulo 360 before validating it; invalid values can be silently accepted.
- Stored values are passed unchanged to Forecast.Solar.
- Wizard, Settings, native flow, translations, and tests disagree about the convention.
- Operator-confirmed real configuration: `138` means south-east and must remain numerically `138`.

### Solar staleness

- `daily_optimized` registers a 30-minute interval anchored to integration setup time.
- The callback fetches only at `06`, `12`, or `16` with minute `00-05`.
- Setup at `10:42` produces callbacks at `:12` and `:42` forever; no callback enters the allowed window.
- Initial setup fetch explains the one successful load.
- The restored value becomes stale after 24 hours or when it no longer covers tomorrow.
- The current code evaluates the documented local schedule using UTC callback time.

## Accepted product contract

### Azimuth

- Application and UI convention: compass degrees.
- Cardinal mapping:
  - `0` or `360`: north.
  - `90`: east.
  - `180`: south.
  - `270`: west.
- Both solar strings use the same convention, copy, validation, and provider adapter.
- Accept finite integral values in the inclusive range `0..360` after form transport parsing.
- Reject negative values, values above `360`, fractions, booleans, and malformed text.
- Never modulo-wrap invalid user input.
- Preserve existing non-negative stored values unchanged. In particular, `138` stays `138`.
- Do not run a bulk numeric migration.

### Provider ownership

- Forecast.Solar:
  - OIG owns latitude, longitude, tilt, azimuth, and installed peak power.
  - Convert compass azimuth only when building a Forecast.Solar request.
  - Provider mapping: `provider_azimuth = compass_azimuth - 180`.
  - Examples: `0 -> -180`, `90 -> -90`, `138 -> -42`, `180 -> 0`, `270 -> 90`, `360 -> 180`.
- Solcast:
  - Rooftop Site owns location, tilt, and azimuth in Solcast cloud configuration.
  - OIG sends no geometry for Rooftop Site forecast calls.
  - Keep Rooftop Site ID, API key, and installed peak power visible.
  - Hide Forecast.Solar-only geometry in the solar provider form.
  - Preserve hidden values when switching providers; never erase them.

### Existing negative values

- Treat an already stored negative value as legacy Forecast.Solar provider coordinates.
- Keep its runtime provider meaning until the operator explicitly saves the field.
- Show its equivalent compass direction plus a legacy-value warning in editable flows.
- Saving the displayed compass value adopts the new contract through explicit operator action.
- Do not silently persist the converted value during setup, reload, GET, or rendering.
- Existing non-negative values are compass values by operator decision; do not infer or convert them.

### Refresh schedule

- `daily_optimized`: refresh at local `06:00`, `12:00`, and `16:00`.
- `daily`: refresh at local `06:00`.
- Schedule must be independent of integration setup or Home Assistant restart time.
- Schedule must follow the Home Assistant local timezone across DST changes.
- Preserve the cached forecast during transient provider failure.
- Retry a failed scheduled refresh after 15 minutes and then after another 30 minutes.
- Allow at most two retries per scheduled occurrence.
- Cancel pending retry work after success, unload, or a newer scheduled occurrence.
- Prevent overlapping provider requests.
- Manual refresh reports success only when a new forecast was accepted.

## Design

### 1. Refresh-aware frontend authentication

- Extend the local `Hass` interface with Home Assistant's `fetchWithAuth` transport.
- Keep the existing OIG URL allowlist check before dispatch.
- Route typed and untyped OIG REST wrappers through one internal authenticated transport seam.
- Delegate token expiry detection and token refresh to `hass.fetchWithAuth`.
- Remove direct reads of `auth.data.access_token` from request dispatch.
- Remove duplicated manual `Authorization` header construction.
- Preserve current public wrapper return shapes, abort behavior, response-body parsing, and status classification.
- Preserve untyped network retry behavior only for retry-safe network failures.
- Never retry a `401` with the same credential.
- Never automatically replay a failed authenticated POST after a `401`.
- If Home Assistant token refresh fails, dispatch no downstream network request and return the existing stable failure shape.

Authentication data flow:

```text
OIG caller
  -> OIG URL validation
  -> shared OIG request adapter
  -> hass.fetchWithAuth
  -> Home Assistant expiry check and refresh
  -> OIG REST endpoint
```

### 2. Canonical compass azimuth with provider adapters

- Replace the shared modulo normalizer with two explicit pure operations:
  - strict compass input validation;
  - Forecast.Solar outbound conversion.
- Registry metadata for both azimuth fields: minimum `0`, maximum `360`, step `1`.
- REST and native flows validate before persistence and return field errors for rejected values.
- Settings and Wizard render identical help for String 1 and String 2.
- Update every duplicated Czech and English translation entry.
- Runtime Forecast.Solar URL builder and candidate-test URL builder call the same outbound helper.
- Solcast runtime and candidate-test paths continue to omit geometry.
- Add provider-aware field visibility without deleting hidden data.
- Include explicit legacy-negative metadata in the editable read model; do not overload the canonical validator.

Azimuth data flow:

```text
Wizard or Settings compass value
  -> strict 0..360 validation
  -> unchanged config storage
  -> provider selection
     -> Forecast.Solar: subtract 180 at request boundary
     -> Solcast: omit geometry; Rooftop Site owns it
```

### 3. Wall-clock solar scheduling

- Replace interval-plus-hour-gate scheduling for `daily` and `daily_optimized` with wall-clock local-time subscriptions.
- Keep interval subscriptions only for modes whose contract is truly interval-based.
- Register one primary-sensor schedule; secondary sensors never call a provider.
- On setup:
  - restore persisted cache;
  - fetch immediately only when no usable current forecast exists;
  - otherwise wait for the next wall-clock occurrence.
- Serialize scheduled, retry, and manual refreshes through the existing update lock.
- Track retry ownership per scheduled occurrence.
- Advance `response_time`, persisted storage, coordinator data, and HA state only after accepting a successful provider response.
- Preserve old data and its stale status on failure.
- Make manual service result reflect whether accepted response state advanced.

Scheduling data flow:

```text
HA local wall clock 06:00 / 12:00 / 16:00
  -> primary sensor update lock
  -> provider request
     -> success: persist, publish, clear stale, cancel retries
     -> failure: keep cache, retry at +15m and +45m total
```

## Error handling and diagnostics

- Authentication refresh rejection:
  - no downstream request;
  - no same-token retry;
  - sanitized log without token contents.
- Invalid azimuth:
  - reject at the nearest boundary;
  - return field-specific validation error;
  - keep prior stored value unchanged.
- Legacy negative azimuth:
  - preserve runtime meaning;
  - show actionable warning;
  - convert only after explicit save.
- Provider `429`, timeout, or temporary server error:
  - retain cache;
  - schedule bounded retries;
  - expose failure state without reporting manual success.
- Unload:
  - unsubscribe wall-clock callbacks;
  - cancel pending retry tasks;
  - avoid state writes after removal.

## Test-first implementation slices

### Slice A: authentication

- RED: typed and untyped wrappers delegate to Home Assistant transport.
- RED: expired credential refreshes once and sends only the fresh credential.
- RED: current credential performs no refresh.
- RED: refresh failure causes no downstream dispatch.
- RED: abort and typed HTTP error classification remain unchanged.
- GREEN: consolidate both wrappers on `hass.fetchWithAuth`.

### Slice B: azimuth and provider visibility

- RED: cardinal and `138` compass values persist unchanged.
- RED: Forecast.Solar receives `-180`, `-90`, `-42`, `0`, `90`, and `180` for representative compass values.
- RED: both runtime and candidate-test URLs use the same conversion.
- RED: negative, `361`, fractional, boolean, and malformed inputs fail validation without storage changes.
- RED: both strings expose `0..360` metadata and identical help.
- RED: Solcast hides Forecast.Solar geometry, retains kWp, and preserves hidden values.
- RED: legacy negative value keeps its runtime meaning and changes only after explicit save.
- GREEN: implement canonical validator, provider adapter, UI metadata, visibility, warnings, and translations.

### Slice C: scheduler and stale recovery

- RED: setup at local `10:42`, then local `12:00`, produces exactly one scheduled provider call.
- RED: arbitrary startup-minute phases do not affect scheduled calls.
- RED: Prague summer and winter tests retain local `06:00`, `12:00`, `16:00` behavior.
- RED: `daily` calls once at local `06:00`.
- RED: initial success, two-day advance, scheduled success updates value and clears stale.
- RED: timeout or `429`, then success, preserves cache and performs bounded retries.
- RED: unload cancels pending retry.
- RED: manual provider failure returns false.
- GREEN: replace defective scheduling and implement retry lifecycle.

### Cross-slice verification

- Frontend unit suite under `TZ=UTC`.
- Frontend typecheck, ESLint, production build, and relevant E2E tests.
- Python unit suite with coverage.
- Flake8, Mypy, and Pylint.
- Provider-boundary E2E: enter east `90`, persist `90`, reload, Forecast.Solar receives `-90`.
- Solcast E2E: provider switch hides geometry without deleting it and sends no geometry.
- Authentication E2E or browser harness: expired token refreshes without invalid-auth request.

## Quality and landing constraints

- No direct deployment from the worktree.
- Keep authentication, azimuth, scheduler, and prerequisite quality cleanup in separate commits.
- Open a pull request; keep it draft until all required gates pass.
- Require security, unit, E2E, lint, Flake8, Mypy, Pylint, build, and coverage review before ready state.
- Require repository coverage above 80 percent under the agreed gate.
- Imported baseline currently has inherited failures:
  - two ESLint errors;
  - one Python unit failure;
  - 29 inherited Mypy errors plus four WIP-introduced errors;
  - non-zero Pylint on base and WIP;
  - frontend statement coverage near 73.22 percent;
  - ten WIP-introduced Flake8 findings.
- Do not hide failures by weakening configuration or making checks non-blocking.
- Address branch-owned regressions first; isolate broader inherited cleanup from the three behavior fixes.
- Do not mark the pull request ready while any required gate remains red.

## Rollout and observation

- Deploy only the reviewed pull request artifact to HP first.
- Verify sanitized Home Assistant logs contain no recurring invalid-auth requests from OIG endpoints after natural token refresh.
- Verify both providers independently:
  - Forecast.Solar request uses converted azimuth.
  - Solcast request uses Rooftop Site identity and no geometry.
- Observe scheduled refreshes at the next local wall-clock occurrence.
- Verify `response_time`, `forecast_age_hours`, `forecast_covers_tomorrow`, and `forecast_stale` after refresh.
- Keep cached forecast behavior as rollback protection during provider failure.

## Non-goals

- No automatic numeric rewrite of existing non-negative azimuth values.
- No Solcast Rooftop Site geometry management from OIG.
- No blind authenticated POST replay.
- No direct production deployment without pull-request review and gates.
- No relaxation of existing or requested quality thresholds.
