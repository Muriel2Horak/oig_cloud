# Authenticated Telemetry Pilot Recovery Handover

## Status

- State: stopped by operator; incomplete; not deployable.
- Handover branch: `codex/telemetry-pilot-handover-20260821`.
- Handover branch base: `origin/main` at `a9851650420656a9337eccd8771c4908bea08cde`.
- Branch content: this handover only. No telemetry implementation is reconstructed or proposed for merge.
- Live systems: no Home Assistant, MQTT, InfluxDB, gateway, broker, release, or deployment mutation was authorized or performed by the recovery monitor.
- Automation: `monitor-telemetry-fleet-orchestrator` deleted after operator stop.
- Last root: `task-recover-telemetry-pilot-v23-afte-fe1ff0`.
- Last gate worker: `task-v23-m6-gates-canonical-gate-run-ac49ab`.
- Last gate worker terminal record: `rc=137`, `cause=tool_failure` after operator stop.
- Root terminal record says `rc=0`, `cause=provider_limit`; do not interpret that row as delivery or approval. The operator stopped the process.

## Critical Git Provenance Loss

- Historical candidate: `ae2e69e2cbac272e2bfc3edaef80bd98b20f7d92`.
- Historical candidate parent: `f97ad2aa503cdf69678bda1aabd470060d0d8d1d`.
- Clean feature base: `2476613158e89fc592a588d76f88313e80b69763`.
- Automatic worktree cleanup removed the independent v17/v23 Git object store after the stop.
- `ae2e69e2...` is absent from `/repos/oig-cloud` and local developer clones.
- `git fetch origin ae2e69e2...` fails with `upload-pack: not our ref`.
- Do not claim that `ae2e69e2...` is fetchable, reviewable, or mergeable.
- Do not synthesize a full candidate by replacing a clean tree with a surviving directory snapshot.
- Two surviving directories match each other except for `.git`, but they are sparse working copies. Treat them as read-only per-file references, not complete Git trees:
  - `/repos/wt-tp-v23-candidate`
  - `/repos/wt-tp-v23-xcut-review`
- A full-tree replacement from those directories falsely deletes roughly 42,000 lines from the clean base.
- Dirty gate directory: `/repos/wt-tp-v23-m6-gates-b`. Do not use it as source material. Preserve it until forensic disposition is agreed.

## Historical Lineage To Preserve

- Original reviewed candidate: `52421ba164eced07eef85ba20048c08db9113510`.
- Clean feature base: `2476613158e89fc592a588d76f88313e80b69763`.
- Wiring lineage: `cc4a1a73f` plus `a18b996b8` plus `439b5ba58`.
- Earlier accepted fixes: `9297cf053`.
- Earlier review: `review-sonnet-439b5ba58-closure-4f35ff`.
- Blocking U7 review: `review-u7-cross-cutting-security-privac-1a92fc`.
- U7 blockers:
  - production enrollment omitted `installation_id`;
  - TLS trust did not establish the private pilot CA;
  - gateway, client, Mosquitto, and ACL credentials were incompatible.

## Valid v14 Evidence

- B1 and N2 commit `28fda0bc9` approved by `review-v14-review-of-v13-frozen-commit-a1df3d`.
- B2 commit `f30376163` approved by `review-v14-review-of-v13-frozen-commit-484190`.
- B3, N3, and N5 commit `1217dcd47` approved by `review-v14-review-of-v13-frozen-commit-673574`.
- Old N1 commit `6bb652082` rejected as substantial by `review-v14-review-of-v13-frozen-commit-fe4a88`.
- RED-first N1 replacement `9282857cc` authored by named MiniMax session `task-n1-payloadproducer-production-tr-3be678`.
- Any review recorded with `model_origin=picked`, a forbidden model, a shared worktree, or a dirty review tree is invalid evidence even if its prose appears favorable.

## Later Evidence Worth Preserving

- v22 rework commit: `f97ad2aa503cdf69678bda1aabd470060d0d8d1d`.
- v22 named review: `review-v4-rework-commit-f97ad2aa5-revie-6e0e8c`.
- v22 review verdict: no rework; grounded, in-scope, honest, and complete scores recorded as `1`.
- v23 candidate verifier: `task-v23-m3-candidate-verify-lineage-bf8b27`.
- v23 historical candidate commit: `ae2e69e2cbac272e2bfc3edaef80bd98b20f7d92`.
- v23 production-path E2E worker: `task-v23-m4-e2e-proof-run-production-6488ea`.
- E2E result: 5 of 5 passed in `tests/e2e/test_production_wiring_e2e.py`.
- The first E2E marker used a false placeholder timestamp and is superseded.
- Corrected E2E worker: `task-v23-production-e2e-proof-correct-4431ab`.
- Corrected marker: `/root/.local/share/vibestruct-scratch/E2E-PROOF-v23-rerun.md`.
- Corrected run: started `2026-08-15T21:08:29Z`, completed `2026-08-15T21:08:44Z`, pytest duration `2.88s`, wall time `15s`, 5 of 5 passed.
- Cross-cutting review: `integrate-v23-m5-cross-cutting-security-pr-81520b`.
- Cross-cutting review recorded score event `2225` with no rework and all review dimensions equal to `1`.
- These results describe the lost historical candidate only. They are not final evidence for a future reconstructed candidate.

## Invalid Recovery Evidence

- v8: shared dirty worktree custody violations.
- v9: exhausted providers used despite explicit green-provider constraint.
- v10: stalled before dispatch during unrelated uninterruptible I/O.
- v13: forbidden review provider variants.
- v14: one auto-picked review recorded `model_origin=picked`; that review is invalid.
- v15: Mistral HTTP 503 attempts produced no evidence; forbidden `sonnet-2@claude-second` fallback is invalid.
- v16: review launched from a dirty child tree and the live review tree was mutated after launch.
- v21: child briefs written into live implementation and root worktrees; dirty custody invalidated the work.
- v22: candidate unit launched through auto-pick and a terminal worktree was reused.
- Any cancelled descendant or review from those invalid roots remains invalid.

## Last Canonical Python Result

Evidence directory on `hp-docker`:

`/root/.local/share/vibestruct-scratch/ev-tp-v23-m6/`

Command:

```text
pytest tests/ --tb=short -q
```

Result:

- 19 failed.
- 6,205 passed.
- 34 skipped.
- 25 warnings.
- Duration: 645.26 seconds.
- Coverage above 80 percent was not established.
- Later non-E2E coverage attempts were non-canonical and must not replace the full-suite result.

Failing tests:

1. `tests/e2e/test_mqtt_tls_handshake.py::TestTlsHandshakeAgainstRealBroker::test_tls_1_2_only_client_is_rejected`
2. `tests/test_init_extra.py::test_async_remove_entry_deletes_ai_key_store_file`
3. `tests/test_quality_gate_policy.py::test_pylint_reports_no_error_or_fatal_in_known_regression_modules`
4. `tests/test_telemetry_credential_contract.py::TestBrokerPasswordFileContract::test_publisher_connect_creds_match_gateway_and_broker`
5. `tests/test_telemetry_credential_contract.py::TestConnectUsernameMatchesAclGrant::test_acl_grant_expands_to_captured_connect_username`
6. `tests/test_telemetry_enrollment_client.py::test_enrollment_with_mqtt_identity`
7. `tests/test_telemetry_enrollment_client.py::test_enrollment_with_mqtt_credentials_from_legacy_fields`
8. `tests/test_telemetry_enrollment_client.py::test_enrollment_conflict_raises_typed_error`
9. `tests/test_telemetry_enrollment_client.py::test_enrollment_network_failure_raises_typed_error`
10. `tests/test_telemetry_enrollment_client.py::test_enrollment_challenge_expired_raises_typed_error`
11. `tests/test_telemetry_enrollment_client.py::test_enrollment_challenge_fetch_failure_raises_network_error`
12. `tests/test_telemetry_enrollment_client.py::test_enrollment_submits_correct_payload`
13. `tests/test_telemetry_enrollment_client.py::test_enrollment_signature_is_valid`
14. `tests/test_telemetry_enrollment_client.py::test_do_enroll_uses_gateway_envelope_shape`
15. `tests/test_telemetry_enrollment_client.py::test_enrollment_cancel_stops_inflight`
16. `tests/test_telemetry_enrollment_client.py::test_different_key_conflict_surfaces_typed_error`
17. `tests/test_telemetry_enrollment_client.py::test_enrollment_410_expired_challenge`
18. `tests/test_telemetry_runtime_wiring.py::TestEnrollmentClientPersistsInstallationId::test_enrollment_response_installation_id_is_persisted`
19. `tests/test_telemetry_runtime_wiring.py::TestRuntimeWiringWithPersistedInstallationId::test_runtime_constructs_publisher_from_real_persisted_enrollment_state`

## Other Last Gate Results

- Flake8: RED; unused imports, unused locals, `E731`, `E714`, and `F632` findings.
- Mypy: RED; 3 errors in 3 files:
  - nullable MQTT username returned where `str` is required;
  - missing `ChatLog` attribute in the installed Home Assistant conversation module;
  - missing `Platform.AI_TASK` attribute in the installed Home Assistant version.
- Pylint: exit `30`; 5 E/F findings recorded; overall rating `9.54/10` is not a pass substitute.
- Hassfest: not executed correctly; attempted module names were unavailable.
- `pip-audit`: unavailable in the gate environment.
- `safety`: unavailable in the gate environment.
- Secret scan: command exited zero, but must be repeated on the exact future diff.
- Frontend ESLint: unavailable because `eslint` was not installed.
- Frontend typecheck: RED because `lit`, `lit/decorators.js`, and `@mdi/js` types were unavailable; downstream element type errors followed.
- Two consecutive full pre-commit passes after the final handoff edit were not established.

## Handover-Only Branch Baseline

- Worktree base: `origin/main` at `a9851650420656a9337eccd8771c4908bea08cde`.
- Command: `python3 -m pytest tests/ --tb=short -q`.
- Local platform: macOS, Python `3.14.3`, pytest `9.0.2`.
- Collection stopped with exit `2`: 468 items collected and 303 collection errors.
- Primary environment blockers: missing `pytest_socket`, `voluptuous`, Home Assistant, and Home Assistant pytest helpers.
- This baseline is not evidence that `origin/main` or the handover branch is test-green.
- This branch changes documentation only; it does not fix or suppress the baseline environment failures.
- `git diff --cached --check`: passed.
- `gitleaks git --staged --redact --no-banner --no-color`: passed; no leaks found.
- Pre-commit document hooks: trailing whitespace and end-of-file checks passed.
- Full pre-commit: RED because the `always_run` environment lacked Mypy, Pylint, `typescript-eslint`, and frontend type dependencies.
- Two consecutive full pre-commit passes are not claimed for this handover-only branch.

## Recovery Strategy

1. Fetch this handover branch into a fresh dedicated worktree.
2. Read this file before inspecting implementation snapshots.
3. Treat `/repos/wt-tp-v23-candidate` and `/repos/wt-tp-v23-xcut-review` as read-only sparse references.
4. Never copy either directory over a full repository tree.
5. Search for a recoverable Git bundle, backup, reflog, object pack, or remote ref containing `ae2e69e2...` before manual reconstruction.
6. If the object cannot be recovered, start from current `origin/main` and port only an explicit, reviewed per-file telemetry manifest.
7. Preserve unrelated current-main files. A deletion not justified by the telemetry manifest is drift.
8. Reproduce each blocker RED-first before changing production code.
9. Close enrollment shape, `installation_id` persistence, TLS private-CA trust, unified broker credentials, ACL identity, v2 namespace, producer-to-outbox flow, PUBACK deletion, retry and restart, generation gates, namespace isolation, and clean unload.
10. Require a named different-model review of every implementation slice.
11. Integrate only reviewed commits into one new exact candidate.
12. Run production-path authenticated E2E on that exact candidate.
13. Run a fresh cross-cutting security, privacy, and lifecycle review on that exact candidate.
14. Run every final gate after integration and after the final handoff edit.

## Final Acceptance Gates

- Full canonical Python suite green.
- Coverage above 80 percent on the canonical scope.
- Flake8 green.
- Mypy green.
- Pylint E0/F0.
- Hassfest green.
- Security and dependency policy gates green.
- Exact-diff secret scan green.
- Exact frontend lint, typecheck, unit, and build gates green.
- Two consecutive full pre-commit passes after the final handoff edit.
- Production-path authenticated E2E green on the exact final candidate.
- Fresh exact-candidate cross-cutting approval.
- Clean scope and clean final worktree.
- One reviewed local final head.
- Truthful English handoff updated to the final head.
- No implementation push, merge, release, tag, deployment, or live-service mutation until the applicable review and operator authorization gates are satisfied. This handover-only branch is the operator-authorized exception.

## Fleet Custody Rules

- Pre-create one fresh dedicated worktree and branch for every implementation, test, integration, review, gate, and handoff unit.
- Never set `FLEET_ALLOW_INHERITED_WORKTREE=1`.
- Reject a child whose recorded worktree equals its parent, `/repos/oig-cloud`, or a live sibling.
- Launch work and test units with an explicit named provider.
- Launch reviews with an explicit named different model.
- Never accept `model_origin=picked` as evidence for this recovery.
- Store briefs under the scratch directory, not inside a child worktree.
- Never mutate a child worktree after launch.

## Fetch And Read

```bash
git fetch origin codex/telemetry-pilot-handover-20260821
git worktree add ../wt-telemetry-pilot-resume \
  -b codex/telemetry-pilot-resume \
  origin/codex/telemetry-pilot-handover-20260821
sed -n '1,320p' \
  ../wt-telemetry-pilot-resume/docs/handoffs/2026-08-21-telemetry-pilot-recovery.md
```

Do not implement directly on the handover branch. Create a separate recovery branch after the provenance audit.
