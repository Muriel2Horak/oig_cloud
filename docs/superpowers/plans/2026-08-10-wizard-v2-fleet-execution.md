# Wizard v2 correctness fleet execution plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Execute the four approved implementation plans through an orchestrated fleet without shared-file races, then obtain independent critic and security approval before PR/HP rollout.

**Architecture:** The leader owns integration and gates. Workers use isolated worktrees and English task briefs. Each implementation slice produces one reviewable commit and test evidence; critics never edit. Shared solar files force provider work before scheduler work. Auth and frontend coverage components may proceed independently after baseline cleanup.

**Tech Stack:** OMX durable team runtime, tmux, Git worktrees, GitHub pull requests, the language/test stacks named by each subsystem plan.

---

## Source plans

- `docs/superpowers/plans/2026-08-10-quality-gates-release.md`
- `docs/superpowers/plans/2026-08-10-auth-refresh-security.md`
- `docs/superpowers/plans/2026-08-10-solar-provider-contract.md`
- `docs/superpowers/plans/2026-08-10-solar-scheduler-recovery.md`

### Gate 0: Approve specification and plans

- [x] Commit revision-2 design plus all plans on `codex/wizard-v2-auth-fix`.
- [x] Assign read-only second-pass reviews to architecture/provider, auth/security, and scheduler/quality critics.
- [ ] Require each critic to end with `APPROVE` or `REQUEST_CHANGES`, exact paths, missing tests, and verification evidence.
- [ ] Commit revision-3 resolutions for credential activation, mode-aware DTO validation,
  URL encoding, HA-owned auth refresh/redirects, tracked served bundles, durable scheduler
  recovery, and atomic attested HP rollback.
- [ ] Run a fresh three-lens approval pass against revision 3. Resolve every P0/P1 and
  every contract ambiguity; repeat only affected lenses until all three approve.

### Gate 1: Clear deterministic branch blockers serially

- [ ] Assign quality plan Tasks 1-2 to one executor. No other worker edits until its commit is reviewed and integrated because it touches auth/solar shared files.
- [ ] Require Flake8 zero, Mypy zero, frontend lint error zero, optional-AI regression green, Pylint policy green, and pre-commit green.
- [ ] Assign an independent critic. Integrate `chore: clear branch quality blockers` only after approval.

### Gate 2: Run independent implementation lanes

- [ ] Lane A executor: complete auth plan Tasks 1-7 in an isolated worktree; commit `fix: delegate OIG requests to Home Assistant auth`.
- [ ] Lane B executor: complete provider plan Tasks 1-9 in an isolated worktree; commit `fix: use compass azimuth at solar provider boundary`.
- [ ] Lane C executor: complete quality plan Task 3 component-coverage groups that do not touch Lane A/B files; commit `test: raise v2 behavior coverage`.
- [ ] Give each lane its own critic. Do not let a critic review its own implementation.
- [ ] Integrate in order A, B, C. Resolve conflicts by preserving both tested contracts; rerun lane-focused tests after every integration.

### Gate 3: Run scheduler and release lanes

- [ ] After provider integration, assign scheduler plan Tasks 1-9 to an executor based on the integrated branch; commit `fix: schedule solar refreshes on local wall clock`.
- [ ] In parallel, assign quality plan Tasks 5-8 to a release executor because workflows/artifact/deploy tests do not share scheduler production files; commit `ci: enforce reviewed release gates`.
- [ ] Assign independent scheduler and release critics. Require cancellation/atomicity and archive/traversal/rollback evidence respectively.
- [ ] Integrate scheduler, then release; rerun focused suites after each.

### Gate 4: Close coverage and security gaps

- [ ] Assign quality plan Task 4 and any remaining Task 3 deficit using post-integration coverage JSON; do not alter exclusions to reach the number.
- [ ] Require Python and frontend statements/lines at least 80.01% and changed pure behavior modules at 100% line/branch coverage.
- [ ] Run the complete local gate matrix from quality plan Task 9.
- [ ] Run independent code review and repository security-diff review. Resolve every P0/P1 and all validated security findings, then rerun both reviews.

### Gate 5: PR and HP rollout

- [ ] Push only `codex/wizard-v2-auth-fix`; open a draft PR with design, commits, test matrix, known baseline resolution, and rollback section.
- [ ] Wait for every remote blocking check. No direct push to `main` and no local-tree deployment.
- [ ] Download and verify PR-head plus previous reviewed artifacts.
- [ ] Deploy PR-head artifact to HP via verified dry-run and artifact mode.
- [ ] Observe for the design's 48-hour/two-occurrence/token-refresh minimum; retain the exact rollback command.
- [ ] Request final critic approval after HP evidence. Mark ready only with green local/remote gates and HP acceptance.

## Orchestrator invariants

- One worker owns a file at a time; tasks with shared files are serialized.
- Every worker brief is English, telegraphic markdown, with exact scope, tests, and prohibited actions.
- Critics are read-only and independent from implementers.
- Leader inspects diffs/tests before cherry-pick; worker completion is not integration approval.
- No `|| true`, coverage exclusion, broad lint disable, secret logging, raw token fetch, local deploy build, direct main push, or unreviewed artifact.
- No implementation lane starts before the three revision-3 critic verdicts are `APPROVE`.
- Shutdown a durable team only after every task is terminal and results/mailboxes are collected.
