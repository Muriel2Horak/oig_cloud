<!-- fleet-verify: /repos/oig-cloud/.ha-env/bin/python -m pytest -q -->

<!-- Rule: no new hardcoded tunable parameters. Priority: live box sensor > config option > constant with justification comment. -->

## Code quality

- `python scripts/quality/changed-functions-check --base origin/main`: blocks a PR when a Python function it adds or modifies breaks the Sonar-mirroring rules (S3776 <= 15, S3358, S107 <= 13, S1172/S1481/S1854). Ratchet: a new function must pass, a modified function must not get worse, untouched functions are not checked. Author, fix and review slices cite its output.
