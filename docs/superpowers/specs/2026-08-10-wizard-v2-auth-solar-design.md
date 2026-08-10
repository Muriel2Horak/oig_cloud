# Wizard v2 authentication and solar correctness design

Status: operator-approved product direction; revision 2 incorporates critic findings from 2026-08-10

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
- Existing finite integral values above `360` are invalid legacy state, not compass
  values. Preserve the raw stored value until correction, do not dispatch it to a
  provider, retain any prior cache as stale, and require an explicit valid `0..360`
  save. Never clamp or modulo-wrap it.
- Treat non-integral, boolean, non-finite, or non-numeric stored values with the same
  invalid-legacy behavior.

### Provider ownership

- Forecast.Solar:
  - OIG owns latitude, longitude, tilt, azimuth, and installed peak power.
  - Convert compass azimuth only when building a Forecast.Solar request.
  - Provider mapping: `provider_azimuth = compass_azimuth - 180`.
  - Examples: `0 -> -180`, `90 -> -90`, `138 -> -42`, `180 -> 0`, `270 -> 90`, `360 -> 180`.
- Solcast:
  - Rooftop Site owns location, tilt, and azimuth in Solcast cloud configuration.
  - OIG sends no geometry for Rooftop Site forecast calls.
  - Keep Rooftop Site ID, API key, enabled strings, and per-string installed peak
    power visible.
  - Hide Forecast.Solar-only geometry in the solar provider form.
  - Preserve hidden Forecast.Solar geometry when switching providers; never erase it.
  - Keep per-string kWp locally. It supplies the string allocation ratio and the GHI
    fallback capacity; OIG never transmits it as Rooftop Site geometry.
  - Preserve the existing security policy for credentials: changing providers deletes
    inactive active/candidate API credentials and the inactive Solcast Site ID. A
    switch back requires credentials to be entered again.

### Existing negative values

- Treat an already stored negative value as legacy Forecast.Solar provider coordinates.
- Keep its runtime provider meaning until the operator explicitly saves the field.
- Show its equivalent compass direction plus a legacy-value warning in editable flows.
- Expose a read-model record per affected field with `stored_value`, `display_value`,
  `legacy_provider_value: true`, and `requires_adoption: true`.
- A render, reload, GET, unrelated save, or unchanged native form submit preserves the
  raw negative value.
- Wizard v2 and Settings include the field key in an `adopt_legacy_fields` write
  control only after that input is touched. The server accepts only known legacy
  azimuth field keys in this control.
- Native HA flows show a transient per-field `adopt_legacy_*` checkbox. Submitting the
  equivalent displayed value without that checkbox preserves the raw value; checking
  it, or entering a different valid compass value, persists the compass value.
- The adoption control is transport-only and is never stored in ConfigEntry options.
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
- Cancel in-memory retry work after success, unload, or a newer scheduled occurrence.
  Preserve a matching durable retry record across unload/restart; setup restores it.
- Prevent overlapping provider requests.
- Manual refresh reports success only when a new forecast was accepted.
- Retry only timeout, connection failure, HTTP `429`, and HTTP `5xx`. Do not retry
  authentication/authorization (`401`, `403`), invalid configuration or provider
  validation (`400`, `404`, `422`), malformed successful responses, or cancellation.
- The retry instants for one occurrence are exactly occurrence `+15m` and `+45m`.
- Local-time semantics use Home Assistant's configured timezone. The `06:00`, `12:00`,
  and `16:00` targets exist once on Europe/Prague DST transition days, so each fires
  once; no UTC substitution or catch-up call is made.

## Design

### 1. Refresh-aware frontend authentication

- Extend the local `Hass` interface with Home Assistant's `fetchWithAuth` transport.
- Public `fetchOIGAPI`/`fetchOIGAPITyped` accept only an endpoint suffix with optional
  leading slash and query. Reject schemes, hosts, protocol-relative input, a pre-prefixed
  `/api/oig_cloud`, fragments, backslashes, malformed encoding, and traversal before
  joining. `battery/x?a=1` and `/battery/x?a=1` both dispatch exactly
  `/api/oig_cloud/battery/x?a=1`.
- The private authenticated seam accepts only an already joined origin-relative path
  whose canonical pathname is `/api/oig_cloud` or starts with `/api/oig_cloud/`.
- Reject absolute URLs, protocol-relative URLs, credentials, foreign hosts, localhost
  aliases, alternate ports, backslashes, encoded or decoded traversal, fragments, and
  malformed paths before calling Home Assistant transport.
- Permit endpoint query strings because existing read endpoints use them, but never
  include a query string in authentication diagnostics.
- Route typed and untyped OIG REST wrappers through one internal authenticated transport seam.
- Remove the currently public manual-token `HaClient.fetchWithAuth` method. Replace it
  with the private canonical OIG seam; no public/callable helper may dispatch an arbitrary
  path or use global fetch with credentials.
- Delegate token expiry detection and token refresh to `hass.fetchWithAuth`.
- Do not invoke `refreshAccessToken` directly and do not assume that Home Assistant
  coalesces concurrent refreshes. Concurrent-call acceptance requires only that no
  stale credential reaches a downstream dispatch and that OIG performs no refresh of
  its own.
- Remove direct reads of `auth.data.access_token` from request dispatch.
- Remove duplicated manual `Authorization` header construction.
- Normalize caller headers into a copied plain string record before delegation because
  Home Assistant assigns `headers.authorization` as an object property. Remove every
  case variant of caller-supplied `Authorization`; callers cannot override credentials.
- Set `redirect: "manual"` on the authenticated request so the adapter can distinguish
  a returned redirect from a network exception. Treat every HTTP `3xx` response and
  `Response.type === "opaqueredirect"` as terminal `redirect_blocked`; never follow or
  retry it.
- Redirect results are exact and independent of browser visibility: untyped returns
  `null`; typed returns `{ ok: false, status: 0, code: "redirect_blocked", error:
  "Authenticated redirect blocked" }` for both visible `3xx` and `opaqueredirect`.
- Preserve current public wrapper return shapes, abort behavior, response-body parsing, and status classification.
- The untyped wrapper retries only `GET` or `HEAD`, and only for
  connection/transport failures or HTTP `502`, `503`, and `504`, with the existing
  bounded attempt count and delay. The typed wrapper remains single-dispatch so its
  caller retains timeout/status control.
- Never retry `401`, `403`, `429`, abort, redirect failure, or any other HTTP status.
- Dispatch `POST`, `PUT`, `PATCH`, and `DELETE` exactly once for every outcome unless a
  future endpoint defines and tests an idempotency key.
- If Home Assistant context is absent or token refresh rejects, dispatch no downstream
  request. The untyped wrapper returns `null`. The typed wrapper returns exactly
  `{ ok: false, status: 0, code: "auth", error: "Home Assistant authentication unavailable" }`.
- A caller abort remains exactly `{ ok: false, status: 0, code: "aborted", error:
  "Request aborted" }`; other transport failures remain `code: "provider_unreachable"`
  with the safe fixed text `Provider request failed`.
- Remove the unused arbitrary-base-URL/token helper in `www_v2/src/data/api.ts`, or make
  it private to tests if a verified caller appears. No production raw-fetch escape hatch
  may remain.
- Rebuild the tracked v2 distribution from the reviewed source. A repository-wide scan
  of source, tracked bundles, and source maps must find no manual access-token dispatch,
  caller-supplied bearer construction, or authenticated global-fetch path. Release
  artifact construction fails when tracked served bytes are stale relative to source.
- Replace Vite's time-derived cache-bust ID with a deterministic SHA-256 over a sorted,
  explicitly listed frontend input set including `public/**`. Identical reviewed inputs produce identical IDs
  and every served dist byte/source map; changing any executable input changes the ID.
  Release CI may supply the computed value but cannot override it with a mismatched value.
- Release builds run explicit Vite production mode in a sanitized environment. Project
  `.env*` and `.npmrc` files plus ambient `VITE_*`, `NODE_OPTIONS`, and unapproved
  `NPM_CONFIG_*` variables are rejected before install/build; only the documented fixed
  toolchain/environment allowlist may influence output. The wrapper forces both npm
  userconfig and globalconfig to `/dev/null`, verifies the effective npm config sources,
  and never reads host `/etc/npmrc` or Homebrew/global npmrc files.

Authentication data flow:

```text
OIG caller
  -> OIG URL validation
  -> shared OIG request adapter
  -> hass.fetchWithAuth
  -> Home Assistant expiry check and refresh
  -> OIG REST endpoint
```

Authentication logging contract:

- Emit only a classified event name, wrapper kind, HTTP method, and safe error code.
- Never log headers, URL/path/query, request/response body, raw exception text or stack,
  access/refresh tokens, provider API keys, or Site ID.
- Sentinel-secret tests inspect console arguments, typed/untyped results, and rendered
  UI error text.

### 2. Canonical compass azimuth with provider adapters

- Replace the shared modulo normalizer with explicit pure operations in one backend
  provider-boundary module used by runtime and candidate tests:
  - strict compass input validation;
  - legacy-negative display conversion without persistence;
  - Forecast.Solar outbound conversion and URL construction.
- Registry metadata for both azimuth fields: minimum `0`, maximum `360`, step `1`.
- REST and native flows validate before persistence and return field errors for rejected values.
- Settings and Wizard render identical help for String 1 and String 2.
- Update every duplicated Czech and English translation entry.
- Runtime Forecast.Solar URL builder and candidate-test URL builder call the same outbound helper.
- The `/solar_test` parser uses a provider-discriminated DTO:
  - Forecast.Solar accepts provider, forecast mode, latitude, longitude, enabled flags, and
    enabled-string kWp/declination/compass azimuth. Its API key is optional for
    `daily`/`daily_optimized` and required for `hourly`/`every_4h`. It rejects Solcast
    fields.
  - Solcast accepts provider, forecast mode, API key, Site ID, enabled flags, and enabled-string kWp.
    It rejects latitude, longitude, declination, and azimuth.
- One pure server-side `build_effective_solar_dto` merges ConfigEntry options, active
  private credentials, and the incoming patch, then validates and deterministically
  serializes the result. Candidate request building, proof binding, explicit save, and
  runtime provider construction use this same DTO and serializer.
- Patch semantics are exact: omitted non-secret fields retain stored values; omitted or
  empty secret fields retain the selected provider's active value; numeric values receive
  one canonical representation so equivalent integer/float transport does not change the
  proof hash; inactive hidden geometry is retained but excluded from Solcast DTOs; provider
  switch deletes inactive secrets only at committed save. This slice adds no general
  current-provider secret-clear operation.
- Canonical numeric validation is shared by save, runtime, and candidate testing:
  latitude finite `-90..90`, longitude finite `-180..180`, kWp finite `0.1..50`,
  declination integral `0..90`, and compass azimuth integral `0..360`. Reject booleans,
  numeric strings, non-finite values, and out-of-range values before any outbound call.
- Construct provider URLs only after validation. Percent-encode every credential/Site-ID
  path segment with no safe characters and build query strings with a standard URL
  encoder. Reserved characters such as slash, question mark, hash, percent, and space
  must never alter URL structure.
- Solcast runtime and candidate-test requests contain only Rooftop Site URL identity,
  format, and API key. Geometry and kWp never appear in the provider request.
- Add provider-aware field visibility without deleting hidden data.
- Include explicit legacy-negative metadata in the editable read model; do not overload the canonical validator.
- `/solar_test` is side-effect-free. Success or failure never writes candidate/active
  credentials, provider selection, options, or cache. A successful test may create only
  a short-lived, single-use, in-memory verification proof: a random opaque token bound
  to ConfigEntry, provider, and a server-side SHA-256 of the normalized DTO. It contains
  no secret or hash in the response, expires after five minutes, and is lost on restart.
- Explicit section save is the only credential activation boundary. Save with a valid
  matching proof activates credentials as verified; save without a proof activates them
  as unverified so native HA and untested saves remain functional. A supplied expired,
  mismatched, or replayed proof fails without mutation.
- Proof validation and consumption run under a per-entry lock. The proof store atomically
  claims and removes a matching token before activation; concurrent saves using one token
  yield exactly one success, one `400`, and one revision increment. Once claimed, the
  proof remains consumed even if the later activation/options/reload transaction rolls
  back; a new candidate test is required.
- Credential/options save is one compensating transaction. Validate the effective DTO,
  snapshot options and key-store state, atomically write the new active credential record
  with one incremented revision, update ConfigEntry options, and reload. Any key-store,
  options, or reload failure restores both snapshots, reloads the prior effective state,
  and keeps the previous active credentials.
  Provider-switch inactive-secret deletion occurs inside the same transaction.
- Runtime and candidate readers acquire the same per-entry lock only long enough to build
  one immutable versioned effective-DTO snapshot, then release it before provider I/O.
  A reader interleaved with activation, provider switch, or compensation sees either the
  complete old revision or the complete committed revision. It never dispatches new
  credentials with old options/provider or observes inactive-secret deletion before commit.
  An old snapshot captured before save may finish its request, but lifecycle/provenance
  guards prevent it from committing after reload.
- A provider switch preserves non-secret geometry/options and clears inactive secrets
  according to the credential policy above.

Azimuth data flow:

```text
Wizard or Settings compass value
  -> strict 0..360 validation
  -> unchanged config storage
  -> provider selection
     -> Forecast.Solar: subtract 180 at request boundary
     -> Solcast: omit geometry; Rooftop Site owns it
```

Legacy read/write flow:

```text
stored -90
  -> GET/native read model: display 90 + raw -90 metadata + warning
  -> no field adoption: keep stored -90; runtime sends -90
  -> touched/adopted 90: persist 90; runtime converts and sends -90
```

### 3. Wall-clock solar scheduling

- Replace interval-plus-hour-gate scheduling for `daily` and `daily_optimized` with wall-clock local-time subscriptions.
- Keep interval subscriptions only for modes whose contract is truly interval-based.
- Add `daily` to the canonical registry enum, frontend labels/fixtures, REST round-trip,
  Settings, and Wizard v2 so the accepted mode is reachable on every surface.
- Register one primary-sensor schedule; secondary sensors never call a provider.
- On setup:
  - restore persisted cache;
  - fetch immediately only when no usable current forecast exists;
  - otherwise wait for the next wall-clock occurrence.
- Add one primary-sensor `asyncio.Lock`; no suitable update lock exists today.
- Serialize initial, scheduled, retry, and manual refreshes through that lock.
- Maintain a monotonically increasing lifecycle generation and a removed flag. Every
  request captures the generation and may commit only when it still matches and the
  entity has not been removed.
- Track every active initial, scheduled, retry, and manual refresh task in one lifecycle
  set. On unload, mark removed, increment generation, unsubscribe callbacks, cancel and
  await the set except the current removal task, and prevent any later provider dispatch,
  storage, coordinator, state, or broadcast write.
- Give every attempt a 90-second total deadline covering lock wait and provider I/O. A
  timeout is retryable only for a scheduled occurrence; manual calls return false.
- Track retry ownership per scheduled occurrence.
- Advance `response_time`, persisted storage, coordinator data, and HA state only after accepting a successful provider response.
- Preserve old data and its stale status on failure.
- Make manual service result reflect whether accepted response state advanced.

Cache provenance and usability:

- Bump the solar forecast store schema and persist `provider`, a normalized non-secret
  configuration fingerprint, and a non-secret credential revision supplied by
  `SolarKeyStore`; never persist raw credentials in the forecast cache.
- Fingerprint provider, enabled strings, kWp, mode, and Forecast.Solar GPS/tilt/azimuth.
  For Solcast, geometry is excluded; the credential revision detects Site ID/API-key
  changes without storing either value.
- A restored cache is usable only when provenance matches, `response_time` is parseable
  and no more than 24 hours old, there is no `error`, and accepted-response rules cover
  both current local date and next local date.
- A provenance mismatch retains old cache only as stale fallback, never publishes it as
  current, and triggers an immediate fetch. A failed replacement keeps that stale cache.
- Provenance mismatch sets a forced-stale marker and reason on the fallback. UI stale
  state is `forced_stale || age_or_coverage_stale`, so a recent mismatched payload is
  visibly stale until a matching accepted commit clears the marker.
- Reusing a box ID under another ConfigEntry cannot accept the previous entry's cache;
  include ConfigEntry identity in storage ownership or provenance.
- Persist scheduled-retry recovery state in the entry-specific envelope: occurrence
  identity/time, completed attempt index, next attempt time, safe failure code, and
  provenance. On setup, restore a future retry or run one overdue retry still inside the
  occurrence's `+45m` horizon. Clear it on success, terminal failure, final exhaustion,
  newer occurrence, or provenance mismatch. Unload cancels only the timer/task and keeps
  a valid durable record. Initial/manual failures never create it.
- Occurrence identity is restart-stable: ConfigEntry ID, mode, and scheduled local ISO
  instant including UTC offset. Lifecycle generation is a separate in-memory commit guard
  and never enters persisted identity. On setup, valid matching retry recovery takes
  precedence over cache-driven initial fetch; future/overdue retry is restored exactly
  once. Only after retry state is absent/cleared does cache usability decide initial fetch.
- Occurrence ownership/deduplication applies only to scheduled callbacks and their retry
  chain. Setup has one explicit initial-task guard. Each manual service invocation has a
  unique request identity and runs once after lock serialization; concurrent manual calls
  do not overlap but are not silently collapsed.
- Keep backward rollback compatibility: leave the legacy box-only cache untouched and
  write schema 2 under an entry-specific key; old code ignores that key. Key-store
  revision/verification metadata is additive in the existing v1-readable object, so the
  prior artifact still reads `active` credentials. Provider-switch deletion remains an
  intentional security policy and rollback never resurrects deleted secrets.

Accepted response and atomic commit:

- Reject a provider result unless its payload is a mapping with a parseable
  `response_time`, no error marker, finite non-negative numeric values, and local today
  plus tomorrow coverage.
- Forecast.Solar requires today and tomorrow daily values for every enabled string;
  disabled strings may be empty. Solcast requires aggregate today and tomorrow values,
  then derives enabled-string values from the validated local kWp ratios.
- Empty, malformed, partial-enabled-string, non-finite, or error-bearing HTTP-200 data
  is a failed attempt and is not retryable.
- Build and validate a complete candidate snapshot before mutation. Persist through an
  atomic HA Store write in its own tracked task. Await it through `asyncio.shield`; if
  caller cancellation arrives, await/reconcile the write result before teardown completes.
  Save completion is the durable commit boundary: a failed/cancelled-before-write save
  leaves the old envelope; a completed save is authoritative even when caller cancellation
  was already requested. A removed entity emits no state or broadcast, and its replacement
  setup loads and publishes that durable envelope exactly once. Persistence failure leaves
  all prior observable state unchanged and reports failure.
- Persist retry recovery state before arming a timer. If persistence fails, arm no retry
  and terminate that occurrence with safe `storage_failed`; the prior forecast remains.
  A crash after persistence and before timer registration is recovered from the envelope
  on setup. Timer-registration failure leaves the durable record for restart recovery and
  dispatches nothing in the failed process.
- An equivalent accepted snapshot may refresh `response_time` and provenance once, but
  produces one commit/broadcast only; duplicated callbacks for the same occurrence are
  idempotent.

Scheduling data flow:

```text
HA local wall clock 06:00 / 12:00 / 16:00
  -> primary sensor update lock
  -> provider request
     -> success: persist, publish, clear stale, cancel retries
     -> failure: keep cache, retry at +15m and +45m total
```

Scheduled occurrence state machine:

```text
new occurrence -> cancel older pending retries -> attempt 0 under lock
  accepted -> atomic commit -> terminal success
  retryable failure -> attempt 1 at +15m
    accepted -> atomic commit -> terminal success
    retryable failure -> attempt 2 at +45m
      accepted or failed -> terminal; no third retry
  non-retryable failure/cancel/newer occurrence -> terminal immediately
  unload with durable retry -> suspend in-memory work; setup restores occurrence
```

## Error handling and diagnostics

- Authentication refresh rejection:
  - no downstream request;
  - no same-token retry;
  - exact typed/untyped failure contract above;
  - classified sanitized log without raw error or request data.
- Invalid azimuth:
  - reject at the nearest boundary;
  - return field-specific validation error;
  - keep prior stored value unchanged.
- Legacy negative azimuth:
  - preserve runtime meaning;
  - show actionable warning;
  - convert only after explicit save.
- Provider `429`, timeout, connection failure, or `5xx`:
  - retain cache;
  - schedule bounded retries;
  - expose failure state without reporting manual success.
- Provider `401`, `403`, invalid config, `422`, cancellation, or malformed success:
  - retain cache;
  - do not schedule a retry;
  - expose a classified failure without secrets.
- Unload:
  - unsubscribe wall-clock callbacks;
  - cancel and await the unified initial/scheduled/retry/manual task set;
  - avoid state writes after removal.

## Test-first implementation slices

### Slice A: authentication

- RED: typed and untyped wrappers delegate to Home Assistant transport with a copied
  plain header record and no caller Authorization.
- RED: expired credential delegates refresh to Home Assistant and sends only a fresh
  credential; OIG never calls refresh directly and does not assert refresh coalescing.
- RED: current credential performs no refresh.
- RED: refresh failure causes no downstream dispatch and returns the exact typed/untyped shapes.
- RED: canonical OIG paths pass; absolute, protocol-relative, localhost/loopback,
  credentials, alternate-port, traversal, fragment, and malformed paths perform zero
  transport calls.
- RED: public suffix grammar joins optional-leading-slash endpoints to exact canonical
  full paths; pre-prefixed/malicious suffixes fail before the private seam. The private
  full-path table is tested separately.
- RED: `HaClient` exposes no callable manual-token/global-fetch auth method.
- RED: GET and HEAD transport/502/503/504 failures retry within the existing bound; POST and
  other mutations dispatch exactly once for transport, 401/403/429/5xx outcomes.
- RED: redirects fail closed; caller authorization casing variants are stripped.
- RED: every visible `3xx` and `opaqueredirect` returns the exact typed status-0 shape,
  untyped `null`, and no retry/follow.
- RED: concurrent expired requests use Home Assistant refresh and never send stale credentials.
- RED: tracked built assets and source maps contain no stale manual-token/global-fetch
  implementation and exactly match a clean reviewed source build.
- RED: two isolated builds produce identical cache-bust IDs/dist bytes; changing one
  executable input changes the ID and served index reference.
- RED: sentinel secrets are absent from logs, return values, and UI text.
- RED: abort and typed HTTP error classification remain unchanged.
- GREEN: consolidate both wrappers on `hass.fetchWithAuth`.

### Slice B: azimuth and provider visibility

- RED: cardinal and `138` compass values persist unchanged.
- RED: Forecast.Solar receives `-180`, `-90`, `-42`, `0`, `90`, and `180` for representative compass values.
- RED: both runtime and candidate-test URLs use the same conversion.
- RED: negative, `361`, fractional, boolean, and malformed inputs fail validation without storage changes.
- RED: both strings expose `0..360` metadata and identical help.
- RED: Solcast hides Forecast.Solar geometry, retains kWp, and preserves hidden values.
- RED: Solcast candidate test succeeds without geometry, rejects geometry, sends no
  provider geometry/kWp, and changes no credential or option state.
- RED: Forecast.Solar API-key optionality follows mode; both provider DTOs reject every
  invalid numeric type/range before dispatch and encode reserved credential/Site-ID
  characters without changing URL structure.
- RED: a successful candidate test mutates no persistent state; proof-backed, unverified,
  failed, expired, mismatched, replayed, and rollback credential-save paths preserve the
  exact activation transaction contract.
- RED: candidate/test/proof/save/runtime share mode and canonical effective DTO across
  partial patches, blank/omitted secrets, hidden fields, field order, equivalent numeric
  representation, unsaved mode changes, and provider switch.
- RED: two concurrent saves claiming one proof yield one success, one `400`, one revision;
  a claimed proof remains consumed after transaction rollback.
- RED: runtime/candidate reads interleaved at every save/switch/rollback boundary capture
  only a full old or full committed immutable DTO revision; old in-flight snapshots cannot
  commit after reload.
- RED: legacy negative value keeps its runtime meaning across GET/render/unrelated save,
  adopts through touched/checkbox control exactly once, and changes only after explicit save.
- RED: invalid stored `361`, `720`, fractional, and non-finite-like corrupt values are
  retained but never dispatched until corrected.
- RED: switching providers preserves geometry and clears inactive credentials exactly
  according to the documented policy.
- RED: `daily` is present in registry, translations, REST, Wizard, and Settings.
- GREEN: implement canonical validator, provider adapter, UI metadata, visibility, warnings, and translations.

### Slice C: scheduler and stale recovery

- RED: setup at local `10:42`, then local `12:00`, produces exactly one scheduled provider call.
- RED: arbitrary startup-minute phases do not affect scheduled calls.
- RED: Prague summer and winter tests retain local `06:00`, `12:00`, `16:00` behavior.
- RED: `daily` calls once at local `06:00`.
- RED: initial success, two-day advance, scheduled success updates value and clears stale.
- RED: timeout or `429`, then success, preserves cache and performs bounded retries.
- RED: exact retry instants are `+15m` and `+45m`; two retry failures produce no third call.
- RED: `401`, `403`, `422`, invalid config, malformed HTTP-200, and abort produce no retry.
- RED: a newer occurrence cancels older retries; success cancels pending retry work.
- RED: manual-vs-scheduled overlap serializes; duplicated callbacks for one occurrence
  create one provider dispatch/retry chain and one commit/broadcast.
- RED: unload during an active request and unload with a pending retry produce no later writes.
- RED: unload cancels initial/scheduled/retry/manual tracked tasks; a hung lock/provider
  hits the 90-second deadline and cannot starve later work.
- RED: scheduled retry state survives restart and resumes at the correct future/overdue
  attempt without an extra initial call.
- RED: restart-stable occurrence identity excludes lifecycle generation; retry recovery
  takes precedence over cache-driven initial fetch.
- RED: retry-state persistence failure arms no timer; crash after persistence/before timer
  registration restores exactly one attempt.
- RED: a recent provenance-mismatched fallback is visibly forced stale until replacement.
- RED: unload before storage completion leaves the old durable envelope; unload after
  completion lets replacement setup reconcile and publish the new envelope once.
- RED: cancellation racing Store completion is shielded/reconciled with no ambiguous or
  duplicate durable commit.
- RED: secondary sensors register no schedule and never call a provider.
- RED: cache from changed provider/geometry/credentials/ConfigEntry is stale fallback and triggers fetch.
- RED: recent cache missing tomorrow is not usable; partial/invalid responses and storage
  failure preserve prior state atomically.
- RED: manual provider failure or an unaccepted response returns false.
- GREEN: replace defective scheduling and implement retry lifecycle.

### Cross-slice verification

- Frontend unit suite under `TZ=UTC`.
- Frontend typecheck, ESLint, production build, and relevant E2E tests.
- Python unit suite with coverage.
- Flake8, Mypy, and Pylint.
- Provider-boundary E2E: enter east `90`, persist `90`, reload, Forecast.Solar receives `-90`.
- Solcast E2E: provider switch hides geometry without deleting it and sends no geometry.
- Authentication E2E or browser harness: expired token refreshes without invalid-auth request.
- Stale-recovery E2E: start at a non-aligned minute, advance through the next local
  occurrence, and observe one accepted update with stale cleared.

## Quality and landing constraints

- No direct deployment from the worktree.
- Keep authentication, azimuth, scheduler, and prerequisite quality cleanup in separate commits.
- Open a pull request; keep it draft until all required gates pass.
- Require security, unit, E2E, lint, Flake8, Mypy, Pylint, build, and coverage review before ready state.
- Interpret the repository's written `MNP` requirement as the frontend `npm` gates;
  there is no separate MNP tool or command in this repository.
- Gate Python production-code line coverage at `80.01%` or higher using coverage
  precision `2` and `pytest --cov=custom_components/oig_cloud --cov-fail-under=80.01`.
- Gate v2 frontend statements and lines at `80.01%` or higher under
  `test:unit:coverage`; report branches/functions and require 100% line/branch coverage
  for newly changed behavior files where the coverage tool can isolate them.
- Run both coverage gates independently; aggregate percentages cannot mask one side.
- Make Pylint, Mypy, pre-commit, frontend lint/typecheck/unit/build, Python unit,
  security, and relevant Playwright E2E true pull-request checks. Remove `|| true` and
  replace the root no-op `npm test` job with commands in `www_v2`.
- Build the frontend during pull-request CI, not only after merge.
- Imported baseline currently has inherited failures:
  - two ESLint errors;
  - one Python unit failure;
  - 29 inherited Mypy errors plus four WIP-introduced errors;
  - non-zero Pylint on base and WIP;
  - frontend statement coverage near 73.22 percent;
  - ten WIP-introduced Flake8 findings.
- Do not hide failures by weakening configuration or making checks non-blocking.
- Address branch-owned regressions first; isolate broader inherited cleanup from the three behavior fixes.
- Land prerequisite quality-gate repairs as reviewable commits before behavior slices;
  fix inherited failures instead of suppressing or excluding production code.
- Do not mark the pull request ready while any required gate remains red.

## Rollout and observation

- Pull-request CI creates one immutable release archive containing the exact reviewed
  runtime deployment allowlist from `custom_components/oig_cloud` and built/compressed
  v2 assets. The archive name,
  internal manifest, and SHA-256 identify the reviewed Git commit.
- Archive scope is an explicit allowlist: include runtime Python modules, manifest,
  strings/translations and runtime data plus `www_v2/dist` including deterministic maps
  and gzip siblings; exclude raw `www_v2/src`, frontend tests/Playwright, repository tests,
  node_modules, coverage, caches, local storage, and secrets. "Source excluded" means raw
  frontend development source, never the Python integration runtime.
- Reproducibility pins runner image, Node/npm/Python versions, locale/timezone/umask, and
  archive format. `SOURCE_DATE_EPOCH` is the reviewed PR-head commit timestamp. Tar paths,
  modes, owners and mtimes are canonical and sorted; gzip filename/mtime/header are fixed.
- CI checks out `github.event.pull_request.head.sha`, never the synthetic merge ref, and
  asserts checkout HEAD, archive name, manifest commit, attested subject, digest, and
  deploy expected commit are identical. `workflow_dispatch` accepts only a recorded
  approved PR-head artifact whose required checks are green; otherwise rollout blocks.
- `deploy_to_ha.sh` gains artifact-only mode and verifies archive digest, attestation,
  manifest commit, safe paths, and extraction before staging. It never runs npm/vite for
  artifact deploys. Archive preflight permits regular files/directories only and rejects
  absolute/traversal paths, duplicate normalized paths, symlinks, hard links, devices,
  FIFOs, unsafe link targets, unexpected files, and digest mismatches.
- Verify GitHub artifact attestation with a pinned verifier against the exact repository,
  GitHub Actions OIDC issuer, signer workflow path, PR-head source digest/ref, and archive
  subject SHA-256. Wrong issuer/repository/workflow/ref/subject or forged bundle fails
  before staging.
- Stage each reviewed artifact in
  `/config/custom_components/.oig_cloud_releases/<full-sha>/`. Keep current and previous
  releases. Activation atomically replaces the `oig_cloud` symlink only after full stage
  verification; copy/extract failure cannot affect the active release.
- Restart and health-check after activation. On failure, atomically restore the previous
  symlink, restart, and verify previous commit/digest/health. The first transition from a
  legacy directory requires verified current and previous artifacts, a retained legacy
  backup, and a proven previous-release health check before current activation.
- Deploy and rollback acquire one host-local exclusive `flock` before reading active state
  and hold it across staging/retention, compare-and-swap activation, restart/health,
  atomic deployment-manifest update, and compensation. A second rollout fails without
  mutation. Manifests are written/fsynced to a same-directory temporary file and renamed.
- Legacy-directory transition runs with Home Assistant stopped and an atomic migration
  journal. Rename the legacy directory to a retained backup, install a temporary symlink
  to the verified previous release, atomically rename that symlink into place, start and
  health-check previous, then use normal activation for current. Every interruption phase
  recovers to either the retained directory or verified previous symlink before HA starts.
- Release integration proves deploy `N`, deploy `N+1`, rollback `N`, and verifies active
  manifest, digest, commit, and Home Assistant health at every step.
- Every activation, including rollback, re-verifies retained archive attestation/digest,
  rechecks every staged file against the signed manifest immediately before compare-and-
  swap, and fails without symlink/manifest/restart mutation if either retained artifact or
  staged release was substituted or modified.
- Deploy only the reviewed pull-request artifact to HP first.
- Verify sanitized Home Assistant logs contain no recurring invalid-auth requests from OIG endpoints after natural token refresh.
- Verify both providers independently:
  - Forecast.Solar request uses converted azimuth.
  - Solcast request uses Rooftop Site identity and no geometry.
- Observe scheduled refreshes at the next local wall-clock occurrence.
- Verify `response_time`, `forecast_age_hours`, `forecast_covers_tomorrow`, and `forecast_stale` after refresh.
- Keep cached forecast behavior as rollback protection during provider failure.
- Observe HP for at least 48 hours, at least two scheduled occurrences, and at least one
  natural Home Assistant token refresh, whichever takes longer.
- Pass thresholds:
  - zero OIG invalid-auth requests after a natural refresh;
  - zero leaked credential sentinels or unhandled OIG exceptions;
  - exactly one initial attempt per scheduled occurrence, with no overlap;
  - accepted refresh by the occurrence or its final `+45m` retry when the provider is
    available;
  - advancing `response_time`, age below 24 hours, tomorrow coverage true, and stale false;
  - Forecast.Solar candidate sees the converted direction and Solcast candidate succeeds
    without geometry or configuration mutation.
- Roll back immediately on repeated OIG invalid-auth traffic, a state write after unload,
  corrupted/lost prior cache, wrong provider azimuth, Solcast geometry leakage, or an
  unrecovered scheduler miss while the provider is known available.

## Non-goals

- No automatic numeric rewrite of existing non-negative azimuth values.
- No Solcast Rooftop Site geometry management from OIG.
- No blind authenticated POST replay.
- No direct production deployment without pull-request review and gates.
- No relaxation of existing or requested quality thresholds.
