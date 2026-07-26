# F1 Phase C — the real AI runtime (P1 + D4/O1 + D8/K1 closure) — bite-sized TDD plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement task-by-task. Steps use checkbox
> (`- [ ]`) syntax for tracking.

**Goal:** close the three audit verdicts that are still open after Phase A (RCA fixes) and Phase B
(wizard v2 shell) landed:

- **P1** (`docs/redesign_2026_07/DECISIONS.md:54-66`, revised by `SCOPE-REVISION.md` items 3/4 and
  `R7.11`): `DEFAULT_MODELS` (`ai_task.py:41-44`) is one hardcoded model per provider — no ordered
  fallback chain, no `oig_ai_status` sensor, no `no_credits` state, no retry/backoff, no TTL cache
  of the last-working model.
- **D4/O1** (`rework/INDEX.md`, `DECISIONS.md:186-193`): the `ai_task` delegation path
  (`ai_task.py:119-149`) is unverified scaffolding — no capability gate, a raw
  `hass.services.async_call` that does not match O1's documented helper contract, no
  `HomeAssistantError` fallback to the key-based backend, and an accepted-but-unused `schema`
  parameter (`ai/backends.py:108-137`).
- **D8/K1** (`rework/INDEX.md` R2, `DECISIONS.md:156-164`): `validate_config` is allow-listed
  (`ai/backends.py:59-62`) with **zero product callers** — only tests exercise it
  (`tests/test_ai_backends.py`, `tests/test_ai_anonymity.py`). The product ships no working AI
  feature, so K1's "AI functions locked until verified + banner" has nothing to lock. This plan
  builds the first one: a "Zkontrolovat konfiguraci AI" button (wizard step 9 Summary + Settings)
  that calls `validate_config` and renders the result, plus the persistent K1 badge.

**Scope discipline — what this plan does NOT touch:** `rework/INDEX.md` R11.1–R11.6 (the seven
shipped-code AI defects assigned to Plan 4: admin gate, key-deletion, verify-before-replace,
provider-switch cleanup, task enum, classified errors) are **already fixed** on this tree — verified
below, task by task, not re-scoped here. `P4`/`O3` (pricelist AI extraction) is **cancelled**
(`rework/INDEX.md` R2-OPRAVA: "AI v F1 nemá uživatelskou funkci... 'Načíst ceník' jako AI úloha se
NEIMPLEMENTUJE"). Cross-provider fallback UI/consent flow beyond the boolean gate in Stage C3 is out
of scope — `R7.11` only requires the refusal to be correct and disclosed, not a full consent wizard.

## Constraints that MUST hold throughout (verify per-task, cite the line)

1. **Prompt anonymity allow-list** (`ai/backends.py:37-57` `PROMPT_ALLOWED_FIELDS`) — no new call
   site may pass free text or an un-allow-listed field into `build_anonymous_prompt`. `task` stays
   an enum (`ALLOWED_TASKS`, `_validated_task`), never concatenated free text (R6.8/R11.5, already
   enforced — do not regress it).
2. **Key only in the `Authorization: Bearer` header**, never in a prompt, log, or REST response body
   beyond `{provider, key_set, verified}` (`ai/key_store.py:1-7`, `:69-76`).
3. **Admin gates on REST** — every new/changed AI route reuses the `_require_admin` pattern already
   in `OIGCloudAiView`/`OIGCloudSolarTestView` (`api/ha_rest_api.py:1453-1466`, `:1570-1583`) and
   updates the closed endpoint auth matrix (`SCOPE-REVISION.md` R9.1) — a route not in that table
   "may not ship".
4. **Build/parse dependencies stay out of the runtime manifest** — not touched by this plan (no new
   heavy deps needed; the OpenAI-compatible client uses the existing aiohttp session).
5. **Providers stay a co-equal choice** (`SCOPE-REVISION.md` item 8) — no default, no "recommended"
   copy, and the `ai_task` provider branch must never fall through to Groq/NVIDIA silently
   (`ai_task.py:47-53`, tested by `tests/test_ai_task_entity.py:70-89` — do not weaken that test).
6. **Same-provider failover only; cross-provider needs explicit consent** — `R7.11` supersedes P1's
   "fallback přes CELÝ žebříček" for the ai_task↔backend and Groq↔NVIDIA directions. Within one
   provider's own model chain, failover is automatic (that part of P1 is unchanged).

## Tech stack / verify commands

- **Backend:** Python 3.12, HA custom integration. No `.venv` exists yet in this worktree — Task 1's
  "Step 0" creates one (`python3 -m venv .venv && .venv/bin/pip install -r requirements.txt -r
  requirements-dev.txt`, per `TESTING.md:28-32`). Test/lint/type commands below assume it exists.
  `.venv/bin/python -m pytest`, `.venv/bin/flake8 --max-line-length=120` (matches
  `.github/workflows/quality.yml:39`, NOT the repo-root `.flake8`'s `max-line-length=88` — that file
  also sets `extend-ignore=E203,E501`, so CI's explicit `--max-line-length=120` is the binding
  number), `.venv/bin/mypy --ignore-missing-imports --explicit-package-bases`.
- **Frontend:** TypeScript + Lit, vitest. From `custom_components/oig_cloud/www_v2`:
  `npx vitest run <path>`.
- **hassfest/i18n parity:** `scripts/run_hassfest.sh` (exists — reuse, per the 2026-07-25 plan's own
  note; run after any `manifest.json`/service-schema change).
- **HA harness caveat (binding on every task below that touches `ai_task.py`):** the shared test venv
  has no `ai_task` module (HA 2025.1.4). Tests that need it install the `sys.modules` shim from
  `tests/test_ai_task_wiring.py:26-68` (`_install_shim()`) BEFORE importing `custom_components.
  oig_cloud.ai_task` — copy that pattern, don't reinvent it. `tests/test_ai_task_entity.py` instead
  uses `pytest.importorskip("homeassistant.components.ai_task", ...)` and constructs the entity via
  `OigAiTaskEntity.__new__` to dodge the missing base class entirely — use THAT pattern for pure
  dispatch-logic tests that don't need `async_setup_entry`. Every item that cannot be exercised
  against the real `homeassistant.components.ai_task` module (the helper signature in Task 9 is the
  one case in this plan) gets an explicit "UNVERIFIED — confirm on live-box HA ≥2025.8" marker
  carried into the code comment, mirroring the existing one at `ai_task.py:127-137`.
- **Style/format reference:** `docs/redesign_2026_07/plans/2026-07-25-wizard-v2-implementation.md`.

**Worklog convention:** commit after every task; trailer identifies the implementing agent.

---

## Stage C1 — bundled model chains + same-provider failover loop + TTL last-working cache

### Task 1: Ordered per-provider model chains, bundled (no remote fetch)

**Files:**
- Modify: `custom_components/oig_cloud/ai_task.py:41-44` (`DEFAULT_MODELS` → `MODEL_CHAINS`)
- Test: `tests/test_ai_task_wiring.py` (append)

**Design, cited:** `SCOPE-REVISION.md` item 3 ("`ai_models` (seznam + fallback pořadí) →
PŘIBALENÝ v release. Fallback chain zůstává.") overrides P1's remote-fetch framing — the chain is a
Python literal, not a `remote_config` read. Groq chain is given verbatim in the brief/DECISIONS
P10 (`DECISIONS.md:151-152`): `["llama-3.3-70b-versatile", "qwen3-32b", "llama-3.1-8b-instant"]`.
NVIDIA chain is derived from the empirically-tested catalog in
`docs/redesign_2026_07/nim-model-test-2026-07-09.json` (83 models probed 2026-07-09, cited by
`DECISIONS.md:54-66`) per the DECISIONS P1 ordering rule: **6 named flagships first, in the stated
order**, then **the remaining OK models sorted by ascending `latency_s`**. `kimi-k2.6` is excluded —
it FAILs in the data (`404`, `docs/redesign_2026_07/nim-model-test-2026-07-09.json`, model
`moonshotai/kimi-k2.6`), matching `enabled:false` in DECISIONS.

- [ ] **Step 1: Write the failing test**

```python
# tests/test_ai_task_wiring.py — append (reuses _install_shim() already at module scope)

def test_groq_chain_matches_p10_order():
    from custom_components.oig_cloud import ai_task
    assert ai_task.MODEL_CHAINS["groq"] == (
        "llama-3.3-70b-versatile", "qwen3-32b", "llama-3.1-8b-instant",
    )


def test_nvidia_chain_head_is_the_flagship_order_from_decisions_p1():
    from custom_components.oig_cloud import ai_task
    assert ai_task.MODEL_CHAINS["nvidia"][:6] == (
        "z-ai/glm-5.2",
        "mistralai/mistral-large-3-675b-instruct-2512",
        "minimaxai/minimax-m3",
        "nvidia/nemotron-3-super-120b-a12b",
        "mistralai/mistral-medium-3.5-128b",
        "openai/gpt-oss-120b",
    )


def test_nvidia_chain_excludes_dead_and_disabled_models_and_is_32_long():
    from custom_components.oig_cloud import ai_task
    chain = ai_task.MODEL_CHAINS["nvidia"]
    assert len(chain) == 32          # the 32 OK models in the 2026-07-09 probe
    assert "moonshotai/kimi-k2.6" not in chain      # FAIL/404, disabled per DECISIONS P1
    assert "01-ai/yi-large" not in chain            # FAIL/404 — not a live model
    assert len(set(chain)) == 32     # no duplicate between the named head and the tail


def test_nvidia_chain_tail_is_latency_sorted():
    from custom_components.oig_cloud import ai_task
    tail = ai_task.MODEL_CHAINS["nvidia"][6:]
    assert tail[0] == "microsoft/phi-4-mini-instruct"   # 0.9s, joint-fastest, first alphabetically
    assert tail[-1] == "meta/llama-3.3-70b-instruct"    # 33.8s, slowest OK model in the probe
```

- [ ] **Step 2: Run — verify FAIL.** `MODEL_CHAINS` does not exist yet (`DEFAULT_MODELS` is a
  single-string-per-provider dict).

Run: `.venv/bin/python -m pytest -q tests/test_ai_task_wiring.py -k "chain"`

- [ ] **Step 3: Implement.** Replace `DEFAULT_MODELS` with:

```python
MODEL_CHAINS: dict[str, tuple[str, ...]] = {
    "groq": ("llama-3.3-70b-versatile", "qwen3-32b", "llama-3.1-8b-instant"),
    "nvidia": (
        "z-ai/glm-5.2",
        "mistralai/mistral-large-3-675b-instruct-2512",
        "minimaxai/minimax-m3",
        "nvidia/nemotron-3-super-120b-a12b",
        "mistralai/mistral-medium-3.5-128b",
        "openai/gpt-oss-120b",
        # remaining 26 OK models from the 2026-07-09 NIM probe, ascending latency_s
        # (docs/redesign_2026_07/nim-model-test-2026-07-09.json) — regenerate this
        # tail with the exact source data, do not hand-edit it out of sync.
        "mistralai/ministral-14b-instruct-2512",
        "meta/llama-3.1-8b-instruct",
        "mistralai/mistral-small-4-119b-2603",
        "mistralai/mistral-nemotron",
        "nvidia/nemotron-mini-4b-instruct",
        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        "nvidia/llama-3.3-nemotron-super-49b-v1",
        "stockmark/stockmark-2-100b-instruct",
        "nvidia/nemotron-nano-12b-v2-vl",
        "nvidia/nemotron-3-nano-30b-a3b",
        "abacusai/dracarys-llama-3.1-70b-instruct",
        "stepfun-ai/step-3.5-flash",
        "google/gemma-4-31b-it",
        "mistralai/mixtral-8x7b-instruct-v0.1",
        "stepfun-ai/step-3.7-flash",
        "openai/gpt-oss-20b",
        "deepseek-ai/deepseek-v4-pro",
        "sarvamai/sarvam-m",
        "minimaxai/minimax-m2.7",
        "deepseek-ai/deepseek-v4-flash",
        "nvidia/llama-3.3-nemotron-super-49b-v1.5",
        "meta/llama-3.1-70b-instruct",
        "nvidia/nvidia-nemotron-nano-9b-v2",
        "nvidia/nemotron-3-ultra-550b-a55b",
        "meta/llama-3.3-70b-instruct",
    ),
}
"""
microsoft/phi-4-mini-instruct MUST be prepended to the tail above at latency 0.9s — it is the
joint-fastest OK model and is currently MISSING from this hand-transcribed list (33 lines shown,
26 expected). The implementer must regenerate this tuple programmatically from
docs/redesign_2026_07/nim-model-test-2026-07-09.json (filter status==OK, drop the 6 flagship
models above, sort by latency_s) rather than trust this hand-copied draft — Step 2's test
`test_nvidia_chain_tail_is_latency_sorted` is the falsifier that catches a wrong/incomplete list.
"""
```

  Update the two call sites that read `DEFAULT_MODELS[provider]` (`ai_task.py:184`,
  `tests/test_ai_task_wiring.py:124,136`) to `MODEL_CHAINS[provider][0]` — Task 2 below is what
  actually walks the chain; until then the entity keeps using the chain head, unchanged behavior.

- [ ] **Step 4: Run full AI suite — fix fallout** (`ai_task.DEFAULT_MODELS` references in
  `tests/test_ai_task_wiring.py:124,136`).

Run: `.venv/bin/python -m pytest -q tests/test_ai_task_entity.py tests/test_ai_task_wiring.py`

- [ ] **Step 5: Lint + commit**

```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/ai_task.py
git add custom_components/oig_cloud/ai_task.py tests/test_ai_task_wiring.py
git commit -m "feat(ai): bundled ordered per-provider model chains (P1/P10, SCOPE-REVISION #3)"
```

**Done-criteria:** `MODEL_CHAINS` replaces `DEFAULT_MODELS`; groq chain matches P10 verbatim;
nvidia chain head matches P1's 6 named flagships in order; nvidia chain excludes dead/disabled
models; no remote fetch anywhere in the diff.

---

### Task 2: Same-provider failover loop (error / timeout(30s) / invalid JSON → next model)

**Files:**
- Modify: `custom_components/oig_cloud/ai/backends.py:87-137` (`OpenAiCompatBackend`)
- Test: `tests/test_ai_backends.py` (append)

**Design, cited:** P1 (`DECISIONS.md:62`): "chyba/timeout(30s)/nevalidní JSON → další." `R7.11`
narrows this to **within** one provider's chain — cross-provider is out of scope for this task
(Task 10 handles the ai_task→backend direction). `OpenAiCompatBackend` currently takes one `model:
str` (`backends.py:90`) and has no concept of a chain. Change it to accept an ordered
`models: Sequence[str]` and walk it inside `async_generate_data`.

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_ai_backends.py — append

@pytest.mark.asyncio
async def test_failover_tries_next_model_on_http_error(monkeypatch):
    calls = []

    class _Resp:
        def __init__(self, status, body=None):
            self.status = status
            self._body = body
        async def __aenter__(self): return self
        async def __aexit__(self, *a): return False
        async def json(self): return self._body

    class _Session:
        def post(self, url, headers, json, timeout):
            calls.append(json["model"])
            if json["model"] == "model-a":
                return _Resp(500)
            return _Resp(200, {"choices": [{"message": {"content": '{"ok": true}'}}]})
        def get(self, *a, **kw): raise AssertionError("verify not used here")

    backend = OpenAiCompatBackend(
        session=_Session(), base_url="https://x", api_key="k",
        models=("model-a", "model-b"))
    result = await backend.async_generate_data("validate_config", {"capacity_kwh": 10}, {})
    assert result == {"ok": True}
    assert calls == ["model-a", "model-b"]


@pytest.mark.asyncio
async def test_failover_tries_next_model_on_invalid_json():
    ...  # same shape, model-a returns 200 with non-JSON content, model-b returns valid JSON


@pytest.mark.asyncio
async def test_failover_exhausts_chain_and_raises_classified_error():
    ...  # every model in the chain fails → raises a RuntimeError/ValueError the caller can classify


@pytest.mark.asyncio
async def test_single_model_backend_still_works_shape_compat():
    """A 1-element models tuple behaves exactly like today's single-model backend —
    the migration from `model=` to `models=` must not change single-provider behavior."""
```

- [ ] **Step 2: Run — verify FAIL.** `OpenAiCompatBackend.__init__` takes `model`, not `models`;
  there is no loop.

Run: `.venv/bin/python -m pytest -q tests/test_ai_backends.py -k failover`

- [ ] **Step 3: Implement.** `__init__(self, session, base_url, api_key, models: Sequence[str])`
  (keep a `model` compat property `self.models[0]` ONLY if `api/ha_rest_api.py:1523-1528`'s
  `model="verify-only"` construction needs updating too — it does, see below). In
  `async_generate_data`, loop `for model in self._models:`, build the payload with that model,
  `async with self._session.post(...)`, and on `resp.status != 200` OR JSON-decode failure,
  `continue` to the next model (still inside `DEFAULT_TIMEOUT_S` per attempt — aiohttp's
  `timeout=` param already bounds each individual call at 30s, satisfying the "timeout(30s)" leg
  of P1 with no new code). After the loop, if nothing succeeded, raise
  `RuntimeError("AI backend: all N models in chain failed")`. Update the two other constructors:
  `ai_task.py:180-185` (`models=MODEL_CHAINS[provider]`) and `api/ha_rest_api.py:1523-1528`
  (`models=(f"verify-only",)` — the verify-key probe only ever needs `async_verify_key`, which
  doesn't touch `_models`, so a 1-tuple placeholder is fine and unchanged in behavior).

- [ ] **Step 4: Run affected suites — fix fallout.**

Run: `.venv/bin/python -m pytest -q tests/test_ai_backends.py tests/test_ai_task_wiring.py tests/test_ai_rest.py tests/test_ai_anonymity.py`

- [ ] **Step 5: Lint + type-check + commit**

```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/ai/backends.py custom_components/oig_cloud/ai_task.py custom_components/oig_cloud/api/ha_rest_api.py
.venv/bin/mypy --ignore-missing-imports --explicit-package-bases custom_components/oig_cloud/ai/backends.py
git add custom_components/oig_cloud/ai/backends.py custom_components/oig_cloud/ai_task.py custom_components/oig_cloud/api/ha_rest_api.py tests/test_ai_backends.py
git commit -m "feat(ai): same-provider model-chain failover on error/timeout/invalid-JSON (P1)"
```

**Done-criteria:** `OpenAiCompatBackend` walks an ordered model chain, per-attempt timeout stays
30s, exhausting the chain raises a classified error, and every existing single-model call site
(verify-key probe, `ai_task` entity) still passes unmodified.

---

### Task 3: TTL cache of the last-working model per (entry, provider)

**Files:**
- New: `custom_components/oig_cloud/ai/model_cache.py`
- Modify: `custom_components/oig_cloud/ai/backends.py` (`OpenAiCompatBackend.async_generate_data` —
  try the cached model FIRST, before falling back to chain order)
- Test: `tests/test_ai_model_cache.py` (new)

**Design, cited:** P1 (`DECISIONS.md:62`): "poslední funkční model cache (TTL 1h)." Model the cache
after the existing per-(entry, provider) bucket pattern in
`custom_components/oig_cloud/forecast/solar_test_limiter.py:43-94` (`SolarTestLimiter` — an
in-`hass.data` dict keyed by `(entry_id, provider)`, no `Store`/disk persistence needed for a
1-hour TTL). Cache is **process-memory only** — a restart cold-starts back to chain-head order,
which is safe (P1 doesn't require persistence, only avoiding "reprobe every dead model every call").

- [ ] **Step 1: Write the failing tests**

```python
# tests/test_ai_model_cache.py — new file
import pytest
from custom_components.oig_cloud.ai.model_cache import LastWorkingModelCache

def test_get_returns_none_when_nothing_cached():
    cache = LastWorkingModelCache(ttl_seconds=3600)
    assert cache.get("entry1", "groq") is None

def test_set_then_get_returns_the_model(monkeypatch):
    ...  # freeze a fake clock, set, get within TTL -> model returned

def test_entry_expires_after_ttl(monkeypatch):
    ...  # set at t=0, advance fake clock past ttl_seconds, get -> None

def test_cache_is_scoped_per_entry_and_provider():
    ...  # set (entry1, groq), get (entry1, nvidia) and (entry2, groq) both None
```

- [ ] **Step 2: Run — verify FAIL.** Module doesn't exist.

Run: `.venv/bin/python -m pytest -q tests/test_ai_model_cache.py`

- [ ] **Step 3: Implement `model_cache.py`.** A small class taking an injectable `now: Callable[[],
  float]` (default `time.monotonic`, per `R9.3`'s "deterministic clock guardrail" convention already
  binding elsewhere in this repo — pass it explicitly in tests, never a module-level test hook) and
  `ttl_seconds: float`. `set(entry_id, provider, model)` / `get(entry_id, provider) -> str | None`
  backed by `dict[(str, str), tuple[str, float]]`.

  Wire it into `OpenAiCompatBackend.async_generate_data`: before the ordered-chain loop, if a cached
  model exists, try it FIRST (still subject to the same failover-on-failure from Task 2), then fall
  through to chain order starting from the head. On success, call `cache.set(...)`. This means the
  backend needs the cache + `(entry_id, provider)` key injected at construction — thread it through
  from `ai_task.async_setup_entry` (`ai_task.py:180-185`) using a single module-level (or
  `hass.data`-scoped) `LastWorkingModelCache` instance shared across entries, mirroring
  `get_solar_test_limiter(hass)`'s `hass.data` singleton pattern
  (`forecast/solar_test_limiter.py:94`) — add `get_ai_model_cache(hass)` alongside it in
  `model_cache.py`.

- [ ] **Step 4: Run — verify PASS**, then full AI suite for fallout.

Run: `.venv/bin/python -m pytest -q tests/test_ai_model_cache.py tests/test_ai_backends.py tests/test_ai_task_wiring.py`

- [ ] **Step 5: Lint + commit**

```bash
.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/ai/model_cache.py custom_components/oig_cloud/ai/backends.py custom_components/oig_cloud/ai_task.py
git add custom_components/oig_cloud/ai/model_cache.py custom_components/oig_cloud/ai/backends.py custom_components/oig_cloud/ai_task.py tests/test_ai_model_cache.py
git commit -m "feat(ai): TTL cache of the last-working model per (entry, provider) (P1)"
```

**Done-criteria:** a `get_ai_model_cache(hass)`-scoped 1-hour TTL cache tries the last-working model
first on every call, falls back to full chain order on miss/expiry/failure, and never persists to
disk (P1 doesn't ask for it, and persisting a model *name* is not a secret so this is a scope
choice, not a privacy one — flag if a reviewer disagrees).

---

## Stage C2 — `oig_ai_status` sensor + `no_credits`/error classification + retry/backoff + badge

### Task 4: Classified error codes for the chain-exhausted and per-attempt failure paths

**Files:**
- Modify: `custom_components/oig_cloud/ai/backends.py` (raise typed/coded exceptions, not bare
  `RuntimeError`/`ValueError`)
- Test: `tests/test_ai_backends.py` (append)

**Design — correction found while verifying this task's own citation against the tree:** P1 wants a
`no_credits` state distinct from generic errors, but O2 (`DECISIONS.md:195-197`, CLOSED) explicitly
says NVIDIA's credit system was **cancelled** ("Kreditní systém ZRUŠEN, potvrzeno NVIDIA staff
09/2025") and today's failure mode is `pure rate limit (~40 RPM per model, 429 při překročení, bez
časové expirace)` — i.e. NVIDIA 429 is NOT a credit-exhaustion signal, it's the same rate-limit
shape as Groq's (30 RPM / 14400 RPD, `SCOPE-REVISION.md` item 7). Neither bundled provider has a
literal "spent credits" concept today. Resolve the naming tension honestly rather than picking
silently: implement the enum value `no_credits` (satisfies P1's explicit requirement and gives the
UI a stable string to render copy against) but trigger it on HTTP 429 from EITHER provider, with a
code comment clarifying it means "quota/rate window exhausted for this key", not a literal
depleted-balance signal — if a future provider has real per-request billing, this code can be
split then. Model this as a `_classify_http_status(status: int) -> str` returning one of
`"no_credits"` (429), `"auth"` (401/403), `"provider_unreachable"` (connection error/5xx after all
models exhausted), `"timeout"`, `"invalid_response"` (bad JSON) — the string-code STYLE mirrors the
existing convention already used by `OIGCloudSolarTestView`/`get_solar_test_limiter`
(`rate_limited`, `provider_unreachable`, `timeout` — `api/ha_rest_api.py:1613-1624`), even though
the AI backend's 429 gets the more specific `no_credits` name per P1's explicit ask instead of a
reused generic `rate_limited`.

- [ ] **Step 1: Write the failing tests** — `test_classify_429_as_no_credits`,
  `test_classify_401_as_auth`, `test_classify_5xx_as_provider_unreachable`,
  `test_chain_exhausted_raises_with_the_last_models_classification`.
- [ ] **Step 2: Run — verify FAIL.**
- [ ] **Step 3: Implement.** New `class AiBackendError(RuntimeError): code: str`. Chain-exhausted
  path (Task 2) raises `AiBackendError(code=classification_of_last_attempt)` instead of a bare
  `RuntimeError`. `R6.9` (binding, `SCOPE-REVISION.md`): the exception message and `code` must never
  contain raw key material or a raw upstream exception string — classify, don't echo.
- [ ] **Step 4: Run affected suites.**
- [ ] **Step 5: Lint + commit.**

Run: `.venv/bin/python -m pytest -q tests/test_ai_backends.py` then
`.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud/ai/backends.py`

**Done-criteria:** every raised AI-backend error carries a `code` from a closed, tested set; no raw
provider exception text or key material reaches it (falsifier: inject a 429 body containing a
fake key string, assert the raised error's `str()` doesn't contain it).

---

### Task 5: Retry/backoff state machine (capped, K2f) per (entry, provider)

**Files:**
- New: `custom_components/oig_cloud/ai/backoff.py`
- Test: `tests/test_ai_backoff.py` (new)

**Design, cited:** P1 (`DECISIONS.md:63-64`): "Onboarding s ležícím NIM: klíč uložit, retry fronta...
periodická re-sonda." `K2(f)` (`DECISIONS.md:181`): "retry fronta = definovaný stavový automat s
capem." States: `idle → backing_off(attempt=n, next_probe_at) → idle` (on success) — a small
explicit state machine, not a generic library. Cap: exponential backoff base 30s (matches
`DEFAULT_TIMEOUT_S`), doubling, capped at a maximum interval and a maximum attempt count (choose
`max_interval_s=3600` matching the model-cache TTL, `max_attempts` uncapped — re-probe forever at
the ceiling interval, since P1 says "periodická re-sonda", never "give up permanently"; document
this choice, it is a plan-author decision, not stated verbatim by P1/K2f).

- [ ] **Step 1: Write the failing tests** — `test_first_failure_schedules_30s_backoff`,
  `test_backoff_doubles_on_repeated_failure`, `test_backoff_caps_at_max_interval`,
  `test_success_resets_state_to_idle`, `test_is_due_false_before_next_probe_at_true_after`.
- [ ] **Step 2: Run — verify FAIL.**
- [ ] **Step 3: Implement `AiBackoffState`** — same injectable-clock convention as Task 3's cache
  (explicit `now` callable, no module-level clock global — `R9.3`'s guardrail, reused here for
  consistency even though `R9.3` itself scopes to the stale-pricelist-warning clock).
- [ ] **Step 4: Run — verify PASS.**
- [ ] **Step 5: Lint + commit.**

**Done-criteria:** a pure, clock-injectable state machine; not yet wired to a caller (Task 6 wires
it into the sensor's re-probe scheduling).

---

### Task 6: `oig_ai_status` sensor

**Files:**
- New: `custom_components/oig_cloud/entities/ai_status_sensor.py`
- Modify: `custom_components/oig_cloud/sensor.py` (register alongside
  `_register_data_source_sensor`, `:1579`)
- Test: `tests/test_ai_status_sensor.py` (new)

**Design, cited:** P1 (`DECISIONS.md:64`): "Za provozu: `oig_ai_status` senzor + badge, cache,
backoff." Model directly on `OigCloudDataSourceSensor`
(`custom_components/oig_cloud/entities/data_source_sensor.py:31-127`) — a **standalone**
`SensorEntity`, not routed through `sensor.py`'s coordinator-driven `SENSOR_TYPES` category system
(that system is for box telemetry; AI status has nothing to do with the coordinator's data). State
values: `not_configured | verified | unverified | backing_off | no_credits | error`. Source of
truth: `AiKeyStore.async_api_state()` (`ai/key_store.py:69-76`, already returns
`{provider, key_set, verified}`) plus Task 5's `AiBackoffState` for `backing_off`, plus the last
classified error `code` from Task 4 for `no_credits`/`error`. `extra_state_attributes`: `provider`,
`last_error_code` (never the raw exception — `R6.9`), `next_probe_at` (when backing off).

- [ ] **Step 1: Write the failing tests** — construct the sensor with fake `AiKeyStore`/backoff
  state, assert `native_value` for each of the 6 states, assert `extra_state_attributes` never
  contains a `key` or key-shaped string (falsifier: seed a fake key value into every collaborator,
  assert absence in both `native_value` and `extra_state_attributes`, matching the `R6.9` falsifier
  pattern already used for `/solar_test`).
- [ ] **Step 2: Run — verify FAIL.**
- [ ] **Step 3: Implement.** No coordinator dependency; register via a
  `_register_ai_status_sensor(hass, entry)` helper called from `sensor.py:async_setup_entry` next to
  `_register_data_source_sensor` — always added (AI is optional, so `not_configured` is itself a
  valid, always-present state; unlike the `ai_task` entity, this sensor does NOT skip itself when AI
  is unconfigured, because the badge in Task 7 needs something to bind to even pre-setup).
- [ ] **Step 4: Run — verify PASS + fallout sweep.**
- [ ] **Step 5: Lint + commit.**

**Done-criteria:** `sensor.oig_<box_id>_ai_status` exists in every entry's device, reflects the 6
states above, and the `R6.9` no-leak falsifier passes.

---

### Task 7: Wizard/Settings K1 badge tied to verified state

**Files:**
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts` (banner/step
  area) and `custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts`
- Modify: `custom_components/oig_cloud/api/ha_rest_api.py` `OIGCloudAiView.get` (`:1468-1477`) —
  extend the returned shape with the Task 6 sensor's classification so the FE doesn't need a second
  round-trip to `/history` for the sensor state
- Test: `www_v2/src/__tests__/` (new or appended AI-badge test), `tests/test_ai_rest.py` (append)

**Design, cited:** K1 (`DECISIONS.md:161-164`, binding, unchanged by the critique round): "trvalý
banner 'AI čeká na ověření'" while unverified; **AI functions stay locked until verified** — this
plan's own new feature (Task 12's `validate_config` button, Stage C4) is exactly the first thing
that badge must gate. Badge states: hidden (not configured — AI is fully optional, no nag),
"AI čeká na ověření" (key stored, `verified: false`), "AI ověřena" implicit (no badge — silence is
the success state, consistent with D11's "banner, ne gate" philosophy elsewhere in this repo), and
a `backing_off`/`no_credits` variant surfacing Task 6's classification so the user isn't left
guessing why nothing happens.

- [ ] **Step 1: Write the failing tests** — REST: `GET /ai` response includes a `status` key sourced
  from Task 6's sensor classification, still admin-gated, still never leaking the key
  (`tests/test_ai_rest.py`, extend the existing admin/shape tests at whatever line the current
  `test_ai_rest.py` asserts the response shape — verify exact line at implementation time, this plan
  intentionally does not hardcode it since Task 6 changes what's available to read). FE: badge
  renders "AI čeká na ověření" when `status !== 'verified'` and `provider` is set; badge absent when
  `provider` is empty; badge shows the `no_credits`/`backing_off` copy variant when status matches.
- [ ] **Step 2: Run — verify FAIL.**
- [ ] **Step 3: Implement.** Add i18n keys `settings.ai.badge.awaiting_verification`,
  `settings.ai.badge.no_credits`, `settings.ai.badge.backing_off` to both CS and EN blocks in
  `www_v2/src/i18n/onboarding.ts` (same file, same CS/EN-pair convention already used at lines
  48-50/107-109 for the disclosure strings). Render the badge in both the wizard (near `STEP_AI`,
  `index.ts:229,278`) and the Settings tab AI card (Task 14 creates that card — if Task 7 lands
  first, stub a minimal card here and let Task 14 extend it, don't duplicate the fetch).
- [ ] **Step 4: Run FE + BE suites.**
- [ ] **Step 5: Lint + commit.**

**Done-criteria:** the badge is visibly present exactly when `provider` is set and `status !==
'verified'`, absent otherwise, and its copy distinguishes plain "awaiting verification" from
`no_credits`/`backing_off` — falsifiable by mounting the component with each of the 6 sensor states
and asserting the rendered text.

---

## Stage C3 — `ai_task` path made real

### Task 8: Capability gate — `has_service("ai_task", "generate_data")`

**Files:**
- Modify: `custom_components/oig_cloud/ai_task.py:152-197` (`async_setup_entry`, the `provider ==
  "ai_task"` branch)
- Test: `tests/test_ai_task_wiring.py` (append)

**Design, cited:** O1 (`DECISIONS.md:186-193`, CLOSED): "Detekce:
`hass.services.has_service('ai_task','generate_data')` + entity s feature GENERATE_DATA." Today's
code (`ai_task.py:165-173`) adds the delegation entity unconditionally whenever
`provider == "ai_task"`, with no check that the host HA actually has an `ai_task` backend
configured — if it doesn't, the entity is added and every call fails at `_async_generate_data` time
with an opaque HA error instead of being gated at setup.

- [ ] **Step 1: Write the failing tests** — `test_ai_task_provider_without_host_service_adds_no_entity`
  (extends the existing `_FakeHass`/`_FakeServices` fixtures at `tests/test_ai_task_wiring.py:169-183`
  with a `has_service` method returning `False`, asserts `async_add_entities` is never called — same
  "optional feature, add nothing" contract as the existing
  `test_no_provider_configured_adds_no_entity`/`test_provider_set_but_key_missing_adds_no_entity`
  tests right above it), `test_ai_task_provider_with_host_service_adds_entity` (positive case,
  `has_service` returns `True`).
- [ ] **Step 2: Run — verify FAIL.** The branch has no `has_service` check at all — the negative
  test currently adds an entity unconditionally.
- [ ] **Step 3: Implement.** Guard the `provider == "ai_task"` branch:
  `if not hass.services.has_service("ai_task", "generate_data"): return` before constructing the
  entity, mirroring the "optional feature → add nothing" style of the two guards immediately below
  it in the same function.
- [ ] **Step 4: Run — verify PASS + fallout.**
- [ ] **Step 5: Lint + commit.**

**Done-criteria:** `provider == "ai_task"` with no host `ai_task.generate_data` service registered
adds zero entities, matching the "no readable config → add nothing, never raise" convention already
established for the other two guards in the same function.

---

### Task 9: Correct the delegation calling convention (fixes the UNVERIFIED docstring)

**Files:**
- Modify: `custom_components/oig_cloud/ai_task.py:119-149`
  (`_async_delegate_to_host_ai_task`)
- Test: `tests/test_ai_task_wiring.py:186-206` (rewrite the existing
  `test_delegation_payload_matches_ai_task_generate_data_contract`)

**Design, cited — and the one item in this plan flagged genuinely unverifiable against the tree:**
O1 (`DECISIONS.md:188-189`) documents the calling convention as **the `ai_task.async_generate_data`
Python helper**, not a raw `hass.services.async_call`: "Volání: helper
`ai_task.async_generate_data(hass, task_name=…, entity_id=None → použije uživatelovu preferovanou
AI, instructions=…, structure=vol.Schema(HA selectory))`." The current code
(`ai_task.py:139-149`) calls `hass.services.async_call("ai_task", "generate_data", {"task": task},
...)` — passing the raw `GenDataTask` object as a service-call data field, which is not how HA
service calls work (data must be JSON-serializable) and doesn't match O1's helper signature at all.
**This repo has no `homeassistant.components.ai_task` module available anywhere — not in this
worktree's (nonexistent) `.venv`, not pip-installed, not vendored** (checked: no
`local_dev/ha-core` checkout present, no system `homeassistant` package). The exact helper import
path and signature MUST be re-confirmed against a real HA ≥2025.8 install before merge — this task
implements O1's documented contract as the best available source and marks it UNVERIFIED exactly
like the code already does at `ai_task.py:127-137`, rather than silently trusting either the old
code or O1's prose.

- [ ] **Step 1: Write the failing test** — rewrite
  `test_delegation_payload_matches_ai_task_generate_data_contract` to assert the NEW contract: the
  test's `_install_shim()` (`tests/test_ai_task_wiring.py:26-68`) must additionally stub an
  `async_generate_data` function on the fake `homeassistant.components.ai_task` module (it currently
  only stubs the class/entity surface), and the test monkeypatches/spies that function instead of
  `hass.services.async_call`, asserting it's called with `hass`, `task_name` (a stable constant,
  e.g. `"oig_ai_task_delegate"`), `entity_id=None`, `instructions=<from task>`,
  `structure=<task.structure>`.
- [ ] **Step 2: Run — verify FAIL.**
- [ ] **Step 3: Implement.** Replace the body of `_async_delegate_to_host_ai_task` with
  `from homeassistant.components import ai_task as ha_ai_task; return await
  ha_ai_task.async_generate_data(self.hass, task_name=..., entity_id=None,
  instructions=task.instructions, structure=task.structure)` — import locally inside the method
  (matching the module's existing pattern of deferring anything HA-version-gated), keep the
  `⚠️ UNVERIFIED` docstring, and add a one-line note pointing at THIS task's plan entry so a future
  reader knows this specific call was written against O1's prose, not against source.
- [ ] **Step 4: Run — verify PASS + fallout.**
- [ ] **Step 5: Lint + commit.**

**Done-criteria:** the delegation call matches O1's documented helper contract; the docstring's
UNVERIFIED marker is preserved (not removed — it's still true); a live-box checklist item is added
in Stage C5 to re-confirm this against real HA ≥2025.8 before it's trusted in production.

---

### Task 10: `HomeAssistantError` fallback from `ai_task` to the key-based backend (R7.11 consent)

**Files:**
- New registry field: `custom_components/oig_cloud/config_registry.py` (`ai` section, `:408-413`)
  — `ai_consent_cross_provider_fallback: bool`
- Modify: `custom_components/oig_cloud/ai_task.py` (`_async_generate_data`, `:80-108`)
- Test: `tests/test_ai_task_entity.py` (append), `tests/test_config_registry.py` (append, if that
  file exists — verify at implementation time; if not, add the field-shape assertion to
  `tests/test_ai_task_wiring.py`)

**Design, cited:** D4/O1 (brief): "no try/except HomeAssistantError fallback to key-based backend."
`R7.11` (`SCOPE-REVISION.md:301-305`, binding): "fallback is within user-selected provider by
default. `ai_task` ↔ backend fallback... require an explicit stored consent flag and user-visible
disclosure... Falsifier: set provider to `ai_task` and force failure plus missing consent; assert
no outbound call to Groq/NVIDIA and a refusal code is surfaced." This directly supersedes P1's
"fallback přes CELÝ žebříček" for this specific direction (R7.11's own text says so).

- [ ] **Step 1: Write the failing tests** —
  `test_ai_task_failure_without_consent_refuses_and_does_not_call_backend` (force
  `_async_delegate_to_host_ai_task` to raise `HomeAssistantError`, entity has no `_backend`
  configured for fallback OR consent flag is `False`, assert the entity raises a classified refusal
  — e.g. `RuntimeError` with a code like `cross_provider_fallback_declined` — and assert nothing
  resembling a Groq/NVIDIA call happens, mirroring the "OIG backend called for provider=ai_task"
  assertion style already at `tests/test_ai_task_entity.py:87`);
  `test_ai_task_failure_with_consent_and_configured_fallback_backend_delegates` (consent `True`
  AND a fallback `backend` present on the entity → falls through to
  `backend.async_generate_data(...)`, same call-shape assertions already established at
  `tests/test_ai_task_entity.py:58-66`).
- [ ] **Step 2: Run — verify FAIL.** No `try/except HomeAssistantError` exists at all today.
- [ ] **Step 3: Implement.** Add the registry field (default `False`, `scope="advanced"`, i18n
  label/hint keys following the `Field` convention at `config_registry.py:21-36`). Thread a
  `consent_cross_provider: bool` + optional `fallback_backend` into `OigAiTaskEntity.__init__`
  (read from the registry/options in `async_setup_entry`, `ai_task.py:159-173`, when constructing
  the `ai_task`-provider entity — this requires `async_setup_entry` to ALSO build an
  `OpenAiCompatBackend` for the fallback even on the `ai_task` branch, gated behind the consent
  flag, using whichever provider/key is separately configured; if none is configured, fallback is
  simply unavailable regardless of consent). Wrap the delegation call:
  `try: data = await self._async_delegate_to_host_ai_task(task) except HomeAssistantError: if not
  (self._consent_cross_provider and self._fallback_backend): raise <classified refusal>; data =
  await self._fallback_backend.async_generate_data(...)`.
- [ ] **Step 4: Run — verify PASS + fallout.**
- [ ] **Step 5: Lint + commit.**

**Done-criteria:** the `R7.11` falsifier passes verbatim — provider `ai_task`, forced failure,
missing consent → no outbound Groq/NVIDIA call, classified refusal surfaced; with consent AND a
configured fallback backend, the failure is caught and the call proceeds to the OIG backend.

---

### Task 11: Use the `schema` parameter (currently accepted, ignored)

**Files:**
- Modify: `custom_components/oig_cloud/ai/backends.py:108-137`
  (`OpenAiCompatBackend.async_generate_data`)
- Test: `tests/test_ai_backends.py` (append)

**Design, cited:** brief: "`schema` param accepted but unused in `ai/backends.py:108-136`." Verified
— the parameter is declared, never referenced in the method body (`json.loads(content)` returns
whatever shape the model produced, unchecked). OpenAI-compatible chat/completions supports
`response_format: {"type": "json_schema", "json_schema": {...}}` on providers that implement it;
Groq/NVIDIA support varies per-model, so this task validates AFTER the fact rather than trusting
provider-side schema enforcement (safer, provider-agnostic): parse the JSON, then validate it
against `schema` using `voluptuous` (already a core HA/this-integration dependency — `steps.py`
imports it throughout) before returning, raising a classified `invalid_response` (Task 4's taxonomy)
on mismatch instead of returning malformed data silently to the caller.

- [ ] **Step 1: Write the failing tests** — `test_generate_data_validates_against_schema_success`,
  `test_generate_data_rejects_response_not_matching_schema` (assert the classified
  `invalid_response` code from Task 4, not a bare exception).
- [ ] **Step 2: Run — verify FAIL.**
- [ ] **Step 3: Implement.** `vol.Schema(schema)(parsed)` (or a light hand-rolled check if `schema`
  arrives as a plain JSON-schema dict rather than a voluptuous schema — confirm the actual shape
  callers pass: `ai_task.py:107` passes `task.structure`, which per O1 is "HA selectory", i.e.
  ALREADY a voluptuous-compatible shape for the `ai_task` caller; `validate_config`'s caller
  (Task 12, Stage C4) will pass a plain dict — implement a small adapter that accepts either).
- [ ] **Step 4: Run — verify PASS + fallout.**
- [ ] **Step 5: Lint + commit.**

**Done-criteria:** a response that doesn't match the passed `schema` is rejected with a classified
error rather than returned as-is; a response that matches passes through unchanged (falsifier for
regression: `test_single_model_backend_still_works_shape_compat` from Task 2 must still pass —
schema validation must not break the no-schema / empty-schema case used by existing callers before
this task, if any pass `{}`).

---

## Stage C4 — first real AI feature: `validate_config` wiring end-to-end

### Task 12: REST endpoint — `POST /api/oig_cloud/{box_id}/ai/validate_config`

**Files:**
- Modify: `custom_components/oig_cloud/api/ha_rest_api.py` (new `OIGCloudAiValidateConfigView`
  class, near `OIGCloudAiView` `:1438-1560`; register at `:1934` alongside
  `hass.http.register_view(OIGCloudAiView())`)
- Modify: `SCOPE-REVISION.md` R9.1's endpoint auth matrix table (`:401-407`) — add the new route row
  (binding per R9.1: "every shipped endpoint... MUST appear in this matrix... before the endpoint
  may ship")
- Test: `tests/test_ai_rest.py` (append)

**Pre-existing gap found while verifying this task against the tree:** `SCOPE-REVISION.md`'s R9.1
matrix (`:401-407`) is missing a row for the ALREADY-SHIPPED `/api/oig_cloud/{box}/ai` route
(`OIGCloudAiView`, `api/ha_rest_api.py:1438-1560`) — only `module_config`, `config_registry`,
`pricelists`, `solar_test`, `onboarding` are listed. R9.1's own text ("every shipped endpoint...
MUST appear in this matrix... before the endpoint may ship") is therefore already being violated by
existing code, independent of anything this plan adds. Step 3 below fixes both: it adds the missing
`/ai` row (documenting existing `GET`/`POST` behavior, no code change) AND the new
`/ai/validate_config` row — don't add only the new row and leave the pre-existing gap in place.

**Design:** admin-gated (`_require_admin`, copy the exact pattern from `OIGCloudAiView`/
`OIGCloudSolarTestView`, `:1453-1466`/`:1570-1583` — both already fail closed identically). Payload:
collect the anonymous install snapshot server-side FROM THE STORED CONFIG (never trust a client-
submitted install payload for an anonymity-boundary call — the whole point of the allow-list is that
the SERVER decides what's safe, per `ai/backends.py:37-49`'s own reasoning).

**Correction found while verifying this task against the tree — `PROMPT_ALLOWED_FIELDS` keys do
NOT match `config_registry.py` field keys 1:1, an intersection is not enough:**
`PROMPT_ALLOWED_FIELDS` (`ai/backends.py:50-57`) names generic scalars `kwp`, `declination`,
`azimuth`, `capacity_kwh` — but `config_registry.py` has no such fields. It has PER-STRING solar
fields (`solar_forecast_string1_kwp`/`_declination`/`_azimuth`, `solar_forecast_string2_kwp`/
`_declination`/`_azimuth`, `:337-348`), and `capacity_kwh` is not a registry field at all — per P8
("kapacita baterie číst z reálných dat boxu", `DECISIONS.md:117-119`) it's sensor-first, sourced at
runtime as `max_capacity_kwh`/`min_capacity_kwh` in `battery_forecast/config.py:44-45` (usable
capacity derived at `:70-74`), not from `entry.options`. This task therefore needs an explicit
`_collect_anonymous_install(hass, entry, coordinator) -> dict` mapping function, NOT a registry
filter:
- `capacity_kwh` ← the resolved battery config's `usable_capacity_kwh` (or `max_capacity_kwh` if
  usable is `None` — decide which at implementation time, verify `battery_forecast/config.py`'s
  actual resolution helper rather than reading raw `entry.options`).
- `kwp`/`declination`/`azimuth` ← the two solar strings need reduction to single scalars: this plan
  proposes `kwp = string1_kwp + string2_kwp` (installed capacity is additive) and
  `declination`/`azimuth` from string 1 only when both strings share the same orientation, else
  send neither (an accurate cross-check needs the real geometry, and PROMPT_ALLOWED_FIELDS has no
  per-string variant to send two numbers under one key) — **this reduction rule is a plan-author
  judgment call, not stated anywhere in DECISIONS/SCOPE-REVISION**, flag it to Martin at
  implementation time rather than treating it as settled.
- The remaining `PROMPT_ALLOWED_FIELDS` battery keys (`battery_comfort_soc_percent`,
  `auto_mode_switch_enabled`, `balancing_*`, `cheap_window_percentile`, `expensive_percentile`,
  `charge_rate_kw`) DO map 1:1 to `config_registry.py:302-316` — read those straight from
  `entry.options`, no adapter needed.

Whatever `_collect_anonymous_install` produces, run it through `build_anonymous_prompt`'s own
allow-list (`ai/backends.py:71-84`) unchanged — that boundary stays the single source of truth for
what's safe to send, this function only fixes WHERE the numbers come from.

**Second gap found while verifying — this endpoint must branch on `provider == "ai_task"` too, it
cannot assume Groq/NVIDIA.** O1 (`DECISIONS.md:190-192`) is explicit that `ai_task`'s `structure`
parameter is HA-selector-shaped, NOT JSON-schema-shaped, and that a task therefore needs "JEDEN
interní popis a DVA převodníky (selector pro ai_task, JSON schema pro NIM)" — one internal task
description, two converters. If the entry's configured provider is `ai_task`, this endpoint must
delegate through the same mechanism `OigAiTaskEntity._async_generate_data` uses (Task 9/10), passing
a `vol.Schema`-shaped `structure` for `validate_config`'s expected findings shape — NOT construct an
`OpenAiCompatBackend` (which only applies to `groq`/`nvidia`, where `PROVIDERS`/`MODEL_CHAINS`
apply and the schema is the plain JSON-schema dict Task 11 validates against). Define BOTH shapes
for `validate_config`'s output once (a single Python source of truth — e.g. one JSON-schema dict,
with a small adapter producing the `vol.Schema` selector variant from it, or vice versa — pick
whichever direction Task 11's adapter already leans, don't invent a third representation), and
branch this endpoint's dispatch on `provider` exactly like `ai_task.py:165-197`'s `async_setup_entry`
already does. Hand the collected dict to whichever path applies:
- `groq`/`nvidia`: `backend.async_generate_data("validate_config", collected, json_schema)` using
  `PROVIDERS`/`MODEL_CHAINS`/the entry's stored `AiKeyStore` key, same construction pattern as
  `OIGCloudAiView.post` (`:1513-1528`).
- `ai_task`: delegate via the Task 9 helper with the selector-shaped `structure`, subject to Task
  10's `HomeAssistantError` → consent-gated fallback if the host AI Task call fails.

No `ai_provider` selection in the request body — this endpoint uses whatever provider the entry
already has configured (Task 6's `oig_ai_status` must be `verified` or the endpoint refuses with a
classified `ai_not_verified` code — this is K1's "AI functions locked until verified" made concrete
for the FIRST time in this codebase).

- [ ] **Step 1: Write the failing tests** — `test_validate_config_requires_admin` (403, mirrors
  existing admin tests), `test_validate_config_refuses_when_ai_not_verified` (K1 gate — the whole
  point of this task), `test_validate_config_collects_only_allow_listed_fields` (seed `entry.options`
  with a GPS/box_id/email-shaped value alongside allow-listed numeric fields, monkeypatch the
  backend call to capture what it received, assert ONLY allow-listed keys are present — this is the
  same falsifier shape as `R6.8`/the existing `test_ai_anonymity.py` tests, reused here at the REST
  boundary instead of the backend boundary), `test_validate_config_returns_structured_findings`,
  `test_validate_config_route_is_in_auth_matrix_and_returns_403_for_non_admin_consistently_with_missing_box`
  (mirrors `R9.1`'s "non-admin consistency test": same status/shape for an existing vs. a guessed
  box id), `test_validate_config_delegates_via_ai_task_when_that_is_the_configured_provider` (seed
  `provider="ai_task"`, monkeypatch the Task 9 delegation helper instead of `OpenAiCompatBackend`,
  assert it's called with the selector-shaped `structure` and that no `PROVIDERS`/`AiKeyStore`
  key lookup happens on this path).
- [ ] **Step 2: Run — verify FAIL.**
- [ ] **Step 3: Implement** the view + register it + update the `SCOPE-REVISION.md` matrix table
  with TWO rows: the missing pre-existing `/api/oig_cloud/{box}/ai` (`GET`/`POST`, documenting
  `OIGCloudAiView`'s actual current behavior — no code change, closes the gap noted above) and the
  new `/api/oig_cloud/{box}/ai/validate_config` (`POST` | "Runs `validate_config` against the
  entry's allow-listed numeric config, returns structured findings" | `403` before any field is
  read, same safe-refusal shape for existing/missing boxes). Also update the
  `api/ha_rest_api.py:1949` endpoint listing string.
- [ ] **Step 4: Run — verify PASS + fallout**, including the R9.1-style non-admin fuzz sweep if one
  exists already for the sibling routes (check `tests/test_ai_rest.py`/`test_onboarding_rest.py` for
  a shared parametrized fixture before writing a new one).
- [ ] **Step 5: Lint + commit.**

**Done-criteria:** the falsifiers above all pass; `SCOPE-REVISION.md`'s R9.1 matrix table lists the
new route with its full auth-outcome row (a route "may not ship" without this, per R9.1's own
binding text).

---

### Task 13: Wizard step 9 (Summary) — "Zkontrolovat konfiguraci AI" button

**Files:**
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts:1855-1901`
  (the `currentStep === 'summary'` render block — both the review-mode diff-table branch and the
  new-install flat-list branch each get the button appended, since either mode can have AI
  configured)
- Modify: `www_v2/src/i18n/onboarding.ts` (new CS/EN key pair,
  `onboarding.summary.validate_ai_config_button` / `..._result_*`)
- Test: `www_v2/src/__tests__/` (new or appended summary-step test)

**Design:** button visible only when `oig_ai_status` (Task 6, surfaced via Task 7's extended `/ai`
GET response) is `verified` — an unverified/unconfigured AI has nothing to validate against, and
this is exactly K1's lock in FE form. On click: `POST /ai/validate_config` (Task 12), render
structured findings inline in the summary card (no modal — matches the existing "inline, in the
card that has the fields" convention noted for other UI decisions in `rework/UX-SPEC-wizard-v2.md`
around line 672's "never as a modal, toast, or separate summary-only surface").

- [ ] **Step 1: Write the failing tests** — button absent when AI unverified/unconfigured, present
  and clickable when verified, click triggers the POST with no extra client-supplied fields (server
  collects them, per Task 12's design — the request body should be empty or a minimal marker),
  renders returned findings, renders a classified error state on failure (network/`ai_not_verified`
  race/`no_credits`) without a raw exception string in the DOM.
- [ ] **Step 2: Run — verify FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run — verify PASS + fallout** (`npx vitest run` full onboarding suite — this render
  block is shared by both review-mode and new-install paths, so both need re-verification).
- [ ] **Step 5: Lint + commit.**

**Done-criteria:** the button's visibility is driven entirely by `oig_ai_status`, never by a
client-side guess; a findings render and an error render are both exercised by real DOM assertions
(not mocked-result-only, per the `R5.3`/`R6.4`-style "click the real control" convention already
enforced elsewhere in this wizard's tests).

---

### Task 14: Settings tab — AI section card with the same button

**Files:**
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts` (new `renderCard`
  call for an `'ai'` section, alongside the existing `battery`/`solar` cards at `:818-819`; note
  `fieldsFor()` at `:484-486` has no `'ai'` branch today — add one reading the `ai` `FIELD_REGISTRY`
  section, or route this card's fields manually since `ai_api_key` is `secret=True` and needs the
  same masked-input treatment already established for other secret fields elsewhere in this file)
- Test: `www_v2/src/__tests__/` (settings AI card test)

**Design:** this is the Settings-side counterpart of Task 13 — same button, same endpoint, same
K1 gate, reusing whatever shared rendering helper Task 13 introduces (extract one if Task 13 didn't
already factor it out — don't duplicate the fetch/render logic between wizard and settings).

- [ ] **Step 1: Write the failing tests** — card renders provider/key-set/verified state (via the
  Task 7-extended `/ai` GET), button gated the same way as Task 13, badge (Task 7) visible in this
  card too.
- [ ] **Step 2: Run — verify FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run — verify PASS + fallout.**
- [ ] **Step 5: Lint + commit.**

**Done-criteria:** Settings shows the same AI state/badge/button as the wizard summary step, backed
by the same REST calls — no divergent client-side re-implementation of the K1 gate logic.

---

### Task 15: K1 badge semantics — final tie-together + regression guard

**Files:**
- Test only: `tests/test_ai_rest.py`, `www_v2/src/__tests__/` (cross-cutting assertions)

**Design:** this task is deliberately test-only — Tasks 6/7/12/13/14 already implement every piece;
this task's job is to write the END-TO-END falsifier K1 actually demands: **a user with AI
configured-but-unverified sees the badge in BOTH wizard and Settings, cannot use the
validate_config button in either surface, and the badge disappears (silently, no separate "success"
banner, per D11's established "silence is success" pattern elsewhere) the moment `verified` flips
true** — this is the acceptance test for the whole stage, not a new feature.

- [ ] **Step 1: Write the failing/passing test** — seed `verified=False`, assert badge+disabled
  button in both surfaces; flip `verified=True` (simulating a successful `POST /ai` verify, already
  implemented pre-existing behavior), re-render, assert badge gone + button enabled in both.
- [ ] **Step 2: Run.** Should already PASS if Tasks 6/7/12/13/14 are correctly wired — if it fails,
  that's this stage's actual bug, not a new task; fix forward in whichever of the 5 files is wrong.
- [ ] **Step 3: N/A (test-only task).**
- [ ] **Step 4: Full stage regression sweep** — every test file touched in C2/C3/C4.
- [ ] **Step 5: Commit** (test-only commit, or folded into Task 14's commit if landed together).

**Done-criteria:** the cross-surface, state-transition falsifier passes. This is the task that
actually closes K1, not any single earlier task in isolation.

---

## Stage C5 — gates + live-box verification checklist

### Task 16: Full-suite gate (backend + frontend + hassfest + lint + types)

**Files:** none (verification-only)

- [ ] Run backend: `.venv/bin/python -m pytest -q tests/` — full suite, not a hand-picked selector
  (base-vs-change discipline: run the SAME selector on a scratch worktree at the merge-base and diff
  the failing sets before claiming green, per this box's standing rule).
- [ ] Run frontend: `cd custom_components/oig_cloud/www_v2 && npx vitest run`.
- [ ] Run `scripts/run_hassfest.sh` (manifest/service-schema parity — Task 8/10 may touch
  `manifest.json` if `ai_task` capability declarations need updating; verify at implementation
  time).
- [ ] Run `.venv/bin/flake8 --max-line-length=120 custom_components/oig_cloud` and
  `.venv/bin/mypy --ignore-missing-imports --explicit-package-bases custom_components/oig_cloud`
  across the full touched surface (not just per-task file lists — cross-file type errors between
  e.g. `model_cache.py` and `backends.py` only show up at the full-package level).
- [ ] Re-run the `R6.9`/`R7.11`/`R6.8` falsifiers named in Tasks 4/6/10/12 as an explicit named
  checklist, not just "the suite passed" — these are the security-relevant ones a green run can miss
  if a test was accidentally skipped/marked xfail.

### Task 17: Live-box verification checklist (cannot be exercised in the shared test venv)

Mark each explicitly at deploy-verify time on Martin's live box (HA ≥2025.8, per O1's minimum
version for structured `ai_task` output):

- [ ] **Task 8/9's capability gate + delegation call** — the shared test venv has no `ai_task`
  module at all (`tests/test_ai_task_wiring.py:1-17`'s own docstring). Confirm
  `hass.services.has_service("ai_task", "generate_data")` gates correctly against a REAL configured
  host AI Task entity, and that Task 9's `ai_task.async_generate_data(...)` call signature is
  actually correct — this is the one contract this plan could NOT verify against source (see Task
  9's design note) and it MUST be corrected on live-box before this path is trusted, not assumed
  correct because tests pass against a hand-written shim.
- [ ] **Task 1's NVIDIA chain** — the 2026-07-09 probe is 17 days old at plan-authoring time
  (2026-07-26); NVIDIA's catalog has already shown deprecation-without-notice behavior (DECISIONS
  O2: "GLM-5 ~6 dní, kimi 410"). Re-probe the chain head models against the live NVIDIA endpoint
  before/at release and confirm none of the 6 named flagships have gone dark since the probe.
- [ ] **Task 2's failover timing** — confirm real Groq/NVIDIA latency doesn't make a full 3-deep
  Groq chain or a 32-deep NVIDIA chain exceed a tolerable end-to-end wait for a synchronous
  `ai_task.generate_data` call from the user's perspective; P1 doesn't set an end-to-end budget, only
  a per-model 30s cap — flag to Martin if a full NVIDIA chain walk (32 × up to 30s = 16 minutes
  worst-case) is unacceptable UX, since nothing in DECISIONS bounds the CHAIN's total wall time, only
  each attempt.
- [ ] **Task 5's backoff ceiling choice** (`max_interval_s=3600`, uncapped attempts) — this plan
  author's judgment call, not stated verbatim in P1/K2f; confirm with Martin it matches intent
  before merge, or treat it as the default and let a future `remote_config`-equivalent (if one is
  ever un-cancelled) override it.
- [ ] **Task 12's `validate_config` findings quality** — the backend has never produced real
  findings against real installation numbers before; a live run against Martin's actual
  `capacity_kwh`/`kwp`/etc. is the first real signal on whether the prompt (`build_anonymous_prompt`,
  `ai/backends.py:71-84`) produces numerically sane, actionable output at all — this is a product
  question this plan cannot resolve on paper.

---

## Report back (per the launch contract)

- **Task count per stage:** C1 = 3, C2 = 4, C3 = 4, C4 = 4, C5 = 2 (16 implementation/gate tasks +
  1 live-box checklist).
- **Contracts flagged as unverifiable against this tree** (both must be re-confirmed on a live HA
  ≥2025.8 install, not trusted from this plan alone):
  1. Task 9 — the exact `homeassistant.components.ai_task.async_generate_data` helper signature
     (no `ai_task` module available anywhere in this environment; implemented from O1's prose only).
  2. Task 1's NVIDIA chain tail — hand-transcribed from
     `docs/redesign_2026_07/nim-model-test-2026-07-09.json` in this plan's Task 1 draft and
     explicitly flagged there as needing programmatic regeneration (one model,
     `microsoft/phi-4-mini-instruct`, was missing from my first manual transcription — Step 2's own
     test is written to catch exactly that class of error, but the implementer must actually run the
     generation from source, not copy this plan's draft literal).
  3. Task 12's multi-string → single-scalar reduction for `kwp`/`declination`/`azimuth` (additive
     `kwp`, string-1-if-matching for orientation) — not specified anywhere in DECISIONS/
     SCOPE-REVISION, a plan-author default that needs Martin's sign-off before or during
     implementation, not silent adoption.
- **Other gap closed opportunistically while verifying, not part of the original brief:**
  `SCOPE-REVISION.md`'s R9.1 auth matrix (`:401-407`) never listed the already-shipped
  `/api/oig_cloud/{box}/ai` route — Task 12 fixes this alongside adding its own new route, since
  it's the same table and the same verification pass caught it.
