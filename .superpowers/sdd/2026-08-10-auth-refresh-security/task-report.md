# Auth refresh security slice report

## Scope

- Base: `d0ec33de`.
- Branch: `codex/wizard-v2-auth-fix`.
- Delegate both OIG REST wrappers to Home Assistant `hass.fetchWithAuth`.
- Remove caller-owned token access, credential construction, global authenticated fetch, and unused `ApiClient` escape hatch.
- Enforce OIG path grammar, caller `Authorization` stripping, manual redirect handling, bounded safe-read retries, single-dispatch mutations, and redacted transport failures.
- Replace time-derived Vite cache busting with a deterministic SHA-256 build ID and closed build environment.
- Add browser expiry and refresh-rejection regression coverage.

## TDD evidence

- Baseline dependency correction: locked `npm ci`; initial missing declared test dependency was environment setup, not RED.
- Auth RED before production edits:
  - `TZ=UTC npm run test:unit -- --run src/__tests__/ha-client.test.ts src/__tests__/onboarding-soft-gate.test.ts`
  - Result: `97 failed, 18 passed`.
  - Failures exercised HA transport delegation, expired/current/concurrent auth, hostile paths, header stripping, redirects, retry limits, mutation single dispatch, abort/auth/provider shapes, and log redaction.
  - Immediately before RED, only the two test files were modified.
- Build RED before build implementation:
  - `TZ=UTC npm run test:unit -- --run tests/unit/build-security.test.ts`
  - Result: `5 failed, 9 passed`.
  - Failures expected deterministic ID generation and private environment construction; the secure build CLI did not yet exist.
- Focused GREEN:
  - `130 passed` across auth, onboarding soft-gate, and build-security tests.
  - Auth-only file: `98 passed`.

## Implementation

- `src/data/ha-client.ts`
  - Model HA refresh-aware `fetchWithAuth` and `auth.expired`.
  - Add one private canonical OIG dispatch seam.
  - Keep public typed and untyped result contracts.
  - Reject absolute/scheme/credential/duplicate-prefix/traversal/backslash/fragment/control/malformed paths before transport.
  - Normalize caller headers to a copied plain record and remove `Authorization` case-insensitively.
  - Force `redirect: manual`; classify visible 3xx and `opaqueredirect` as `redirect_blocked`.
  - Retry only untyped GET/HEAD transport failures and HTTP 502/503/504, four total attempts, one-second delay.
  - Keep typed calls and every mutation single-dispatch.
  - Return fixed auth, abort, provider, redirect, and invalid-path failures without raw exception/path/query/body logging.
- Delete unused `src/data/api.ts` after zero-caller search.
- `scripts/build-security.mjs`, `scripts/build-v2.mjs`, `vite.config.ts`, `package.json`
  - Hash sorted explicit inputs: `src/**`, `public/**`, `index.html`, `vite.config.ts`, `package.json`, `package-lock.json`, root `tsconfig*.json`.
  - Exclude tests, Playwright, dist, node_modules, and coverage.
  - Reject missing/malformed/mismatched `OIG_BUILD_ID`.
  - Reject project `.env*`/`.npmrc`, user `.npmrc`, ambient `VITE_*`, `NODE_OPTIONS`, and `NPM_CONFIG_*` before output.
  - Create distinct empty mode-0600 npm user/global configs under a private build directory; verify npm resolves both exact paths.
  - Run `npm ci --include=dev` under `NODE_ENV=production` when requested.
  - Normalize source-map paths to deterministic `oig-v2:///` paths.
- `playwright/auth-refresh.spec.ts`
  - Expired credential: HA-owned refresh; fresh-only GET and POST; zero invalid-auth requests; one mutation.
  - Refresh rejection: zero downstream dispatch; fixed auth UI/result; no token or exception sentinel in page/console.

## Verification

- Frontend unit: `99` files, `1,979 passed`.
- Focused auth/build: `3` files, `130 passed`.
- Playwright auth harness: `2 passed`.
- TypeScript typecheck: exit 0.
- ESLint errors: exit 0.
- Production build: exit 0.
- Closed `build:install`: exit 0; dev build tools installed under production mode.
- Reproducibility:
  - Tracked `dist`, isolated build A, and isolated build B: all nine files/maps byte-identical.
  - Build ID: `64de39187d76aa50ce441bf76b9ec5318c4f8ff68dddc9ca517b9e71c7525197`.
  - `dist/index.html`: `a29c03a86c2168c6235e09f8d4ca0c4b352093fe68f3b0933010a7c015b9cbae`.
  - `dist/assets/index.js`: `513382ea75e655ef2ba1552c8ee51ec49f37261cef070fc0a8da990567214c8c`.
  - `dist/assets/index.js.map`: `4ff8112ff348aac434dfc9e473e41d20a2ab450204a68b2f191003561c74f9f8`.
- Source/bundle/map scan:
  - No `auth.data.access_token` read.
  - No production bearer construction.
  - No production global/window fetch call.
  - No legacy `ApiClient` caller or tracked implementation.
  - Authenticated transport appears only as HA `fetchWithAuth` in production.
- Python gates:
  - Flake8: exit 0.
  - Mypy canonical command: `Success: no issues found in 198 source files`.
  - Pylint 4.0.7: exit 0; score `9.523990304587798`; `E=0`, `F=0`; no configuration diagnostics.
- Pre-commit: two consecutive all-files runs passed all nine hooks; no rewrites.
- `git diff --check`: exit 0.

## Coverage

- Frontend full suite: statements `73.18%`, branches `77.51%`, functions `72.32%`, lines `73.18%`.
- `src/data/ha-client.ts`: statements/lines `75.07%`, branches `86.92%`, functions `45.94%`.
- This is inherited release-gate debt. No production exclusions or weakened thresholds were added.
- Quality-plan Task 3 owns global statements/lines `>=80.01%` and changed pure-module `100%` enforcement.

## Security diagnostics and residual gates

- Bandit: 40 Low; 0 Medium; 0 High.
- Gitleaks: three `generic-api-key` false positives; no credential value exposed.
  - Two inherited `key="prices15m_czk_kwh"` call arguments in `battery_forecast/data/pricing.py`.
  - One generated source-map `sourceKey` identifier adjacent to mapping data; no source-input match.
- Isolated npm audit against unchanged lockfiles:
  - Root: 15 inherited vulnerabilities: 1 Moderate, 12 High, 2 Critical.
  - v2: 21 inherited vulnerabilities: 3 Moderate, 16 High, 2 Critical.
- Corrected Trivy scan excluding local virtualenv/cache artifacts:
  - 13 inherited `requirements.txt` vulnerabilities: 11 High, 2 Critical.
  - Secret metadata empty.
- No dependency or lockfile changed in this slice; no introduced dependency finding.
- Release remains blocked until quality/security Task 6 resolves or explicitly replaces every inherited High/Critical dependency finding, completes the Ubuntu PEP 517/wheelhouse proof, and runs the exact Node 22.17.0/npm 10.9.2 gate. Local auth-slice frontend verification used Node 24.3.0/npm 11.4.2 and is not final release-toolchain evidence.
- No push, PR, deploy, HP write, or remote mutation occurred.
