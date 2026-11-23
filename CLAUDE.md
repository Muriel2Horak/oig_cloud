<!-- fleet-verify: /repos/oig-cloud/.ha-env/bin/python -m pytest -q -->

<!-- Rule: no new hardcoded tunable parameters. Priority: live box sensor > config option > constant with justification comment. -->

## Code quality

- `python scripts/quality/changed-functions-check --base origin/main`: blocks a PR when a Python function it adds or modifies breaks the Sonar-mirroring rules (S3776 <= 15, S3358, S107 <= 13, S1172/S1481/S1854). Ratchet: a new function must pass, a modified function must not get worse, untouched functions are not checked. Author, fix and review slices cite its output.
- `node scripts/quality/changed-functions-check.mjs --base origin/main` (root `npm ci` first): the same ratchet for TypeScript/JavaScript in `custom_components/oig_cloud/www_v2` (S3776 <= 15, S3358, S107 <= 7, S1854, S1481 JS only, S1871/S4144/S1186; S1172 never). Function identity comes from `git diff -U0 -M`; untouched functions are not checked; exit 2 on git/parse/ownership error. Author, fix and review slices cite its output.
