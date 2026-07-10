# REPORT — Adversarial critique of F1 (reviewer: second)

**VERDICT: RETHINK (as specified) → SHIP-WITH-FIXES once C1–C3 are resolved.**

The wizard/registry/merge spine is sound and the audits are strong, but F1 as written contains a hard
privacy self-contradiction (validate_config sends GPS while §6 forbids coordinates), a mandatory-AI gate
that can permanently lock new users out of a dashboard they enabled, and an unsigned, unbounded
remote_config that steers physical battery hardware across every install. None of these are edge cases —
each is triggered by the exact conditions the design's own research (P1: 61 % of NVIDIA dead) predicts.

---

## FINDINGS

### CRITICAL

**[CRITICAL] C1 — `validate_config` task sends GPS to the LLM, breaking the mandatory anonymity rule.**
Hits: §3 (tasks.py, `validate_config` = "sedí GPS s časovou zónou?"), directly contradicts **O2(b)** and
**§3 "Soukromí (závazné)"** / **§6** which state prompts contain "VÝHRADNĚ anonymní čísla (žádné jméno,
e-mail, adresa, **souřadnice**, box ID)". You cannot sanity-check GPS-vs-timezone or "GPS makes sense"
without putting the coordinates in the prompt. The anonymity promise is presented as an enforceable,
tested guarantee (§10 "prompt-anonymita: žádný zakázaný token v promptu"), but the design's own headline
AI validation task violates it, and it is sent to third parties whose free tier trains on inputs (O2 §3.3;
P10 NVIDIA/OpenRouter). This is the difference between "we anonymize" and "we leak the user's home
coordinates to a model trainer." Why it breaks: GDPR-relevant location data → third-party training set,
in the one integration marketing itself on the anonymity guarantee. **Fix:** either (a) drop GPS/timezone
and any location-derived check from `validate_config` entirely (validate only ratios: kWp vs kapacita,
sklon/azimut ranges — pure numbers), or (b) explicitly re-scope O2 to permit coarse, rounded, non-address
geodata and update the anonymity test's denylist to match — but do NOT ship §3 and §6 as mutually
contradictory. Make the §10 test assert against the *actual* config values (known GPS, box id) in the
outgoing prompt, not a static token list (see m5).

**[CRITICAL] C2 — Onboarding gate is a lockout trap when AI cannot be verified.**
Hits: **D5** (AI povinná), **D10** (gate hlídá "AI ověřená"), **§5 krok ①** ("Dál se pustí až po ověření"),
in tension with **P1** ("premium po prvním úspěšném ověření", retry fronta). The design's own live test (P1)
found NVIDIA can be down *as a whole* and that free models die per-model and permanently; Groq's free tier
(P10) has 30 RPM and 1–14k req/**day** hard caps and no contractual uptime. A brand-new user who enables
`enable_dashboard`, has no `ai_task`, and hits a provider outage or an exhausted daily cap during
onboarding **cannot pass step ①**, and because steps ② Solár and ③ Ceny sit *behind* step ① in the gate,
they cannot even configure the deterministic parts they came for. §5's "klíč uložen, unverified, retry
fronta, krok se dokončí po prvním úspěšném ověření" is not an escape hatch — it still blocks progression.
Result: a paid-attention user staring at a locked panel with no forward path, dependent on a third party's
uptime the author does not control. **Fix:** decouple gating from ordering — let the user complete
② Solár and ③ Ceny (fully deterministic; ceny has dataset vrstva 0, solar has a real test) while AI stays
`unverified`, and unlock the dashboard on completion of the *deterministic* steps with AI in a persistent
"pending verification" banner state. Reserve the hard AI gate only for AI-*dependent* features, not for the
whole dashboard. Add an explicit "skip AI for now" path or the mandatory-AI decision (D5) creates support
tickets, not fewer.

**[CRITICAL] C3 — remote_config `tuning` is an unsigned, unbounded remote-control channel over battery hardware.**
Hits: **§4** (`"tuning": {box_floor_safety_margin_pct, holding_soc_threshold, …}`), **D6**, **P8.3**
(remote_config owns "drift dead-bandy, boost cap, holding threshold, cooldowny, **clampy**, session TTL").
These values steer real charge/discharge behavior on the physical box, are fetched from a raw GitHub URL
(§4), cached 24 h, and applied with **no signature, no bounds validation, and no user visibility**. A
compromised/hijacked GitHub account, a typo'd commit, or a well-meant bad tune (e.g.
`box_floor_safety_margin_pct: -5`, `holding_soc_threshold: 0`) silently changes battery behavior on
**every install within 24 h, without a release and without review**. The design explicitly removes the
in-code constants that today act as a floor (P8: "hardcoded konstanta = bug"), so there is no last line of
defense. §9's error table only handles "GitHub unavailable" (falls to bundled) — it does not handle
"GitHub returns a *valid-looking but dangerous* value". This is the brief's "remote code-influence vector"
made literal. **Fix (blocking):** (1) sign remote_config (detached signature / commit pin) and reject
unsigned; (2) hard-clamp every `tuning` value in code against a bundled `[min,max]` safe range — the code
keeps safety bounds even if it doesn't keep defaults; (3) refuse values outside range and log + fall back
to bundled; (4) never let a remote value widen a safety margin below the bundled floor. Treat tuning as
*advisory within guardrails*, not authoritative.

### MAJOR

**[MAJOR] M1 — pdfplumber pipeline is a heavy new dependency the design never budgets for.**
Hits: **§4 / §5 krok ③ / P4** (pdfplumber souřadnicová extrakce), **§2** (backend). `pdfplumber` is not in
`manifest.json` requirements (today: only `numpy`, `paho-mqtt`) and pulls in `pdfminer.six` + `Pillow` +
`cryptography` — a large wheel set to build/install on RPi-class HA hosts, and a HACS/HA reviewability
concern. PDF parsing is CPU-heavy and, if run in the event loop, blocks HA; the design says "backend
stáhne PDF … pdfplumber extrakce" during interactive onboarding with no mention of `async_add_executor_job`
or a timeout. **Fix:** add the deps to manifest + verify wheels exist for armv7/aarch64; run extraction in
an executor with a timeout; make the PDF cross-check strictly optional (it already is — dataset vrstva 0
covers the common case) and gate it behind an explicit user action so no install pays the dependency cost
unless used. Reconsider whether pdfplumber belongs in the HA process at all vs. a one-off maintainer script
(O3 already reduces this to a yearly XLSX ingest — the runtime PDF path may not be worth the dep).

**[MAJOR] M2 — Czech is hard-coded into the field registry, regressing existing i18n.**
Hits: **§6** (`Field = {… label_cs, hint_cs …}`), **§3** (`instructions_cs`), **§5** (Czech step copy). The
repo already ships `translations/cs.json` **and** `en.json` (934 keys) and a real i18n layer. Baking
`label_cs`/`hint_cs`/`instructions_cs` into the Python registry — from which "FE nezná žádné pevné seznamy
polí" and renders everything — means every non-Czech user gets Czech labels, hints, and wizard copy, with
no localization seam. This is a backward step for the one thing that *was* already localized. Brief UX
blind spot (non-Czech users) confirmed. **Fix:** registry fields carry i18n *keys*, not `_cs` strings; ship
`cs`/`en` values via the existing translations pipeline; FE resolves via i18n. If Czech-only is a
deliberate scope cut, say so explicitly in D-board and stop shipping en.json.

**[MAJOR] M3 — P7 breaks existing installs on upgrade, contradicting D11's "nic se nerozbije".**
Hits: **P7 / §7** ("Chybějící config → `unavailable` + warning, žádný fallback"), **D11 / §1 / §8**
("nic neztratí a dashboard mu jede", "nic se nerozbije"). Removing the author-default GPS
(50.1219800/13.9373742) and roof geometry means any grandfathered user who never explicitly set them (they
"worked" by silently using the author's location) sees `solar_forecast` go **unavailable** immediately
after upgrade — a visible regression — while §8 only gives them a *banner*, not a gate. Worse, the only path
to restore the sensor now runs through the AI onboarding step ①, so **fixing a solar default now requires a
third-party AI account** (D5 coupling). "Nothing breaks" and "missing config → unavailable" cannot both be
true in one release. **Fix:** on migration, detect installs relying on the removed defaults and either
pre-seed the previous effective value into options (preserving current behavior) or surface a *blocking,
AI-free* "set your GPS" prompt; never couple a solar-default fix to AI verification.

**[MAJOR] M4 — De-hardcode scope (P7/§7) undercounts the `15.36`/GPS sites; the CI grep gate will fail or miss.**
Hits: **P7, §7, §10** (CI grep `50.1219800|13.9373742|15\.36|azimuth.*138`), **P6**. `15.36` lives in **four**
files — `battery_forecast/config.py:41`, `physics/interval_simulator.py:73` & `:194`,
`balancing/executor.py:60`, and `storage/plan_storage_baseline.py:280` — but P7/§7 name only
plan_storage_baseline. GPS lives in `solar_forecast_sensor.py` **and** `config/validation.py`. Two
consequences: (a) the §10 CI grep gate, as written, will **red the build** on the unlisted sites the
implementer wasn't told to fix; (b) P6 calls `battery_forecast/config.py` "mrtvý kód → smazat", but
`SimulatorConfig` is imported and used live by the physics layer (`interval_simulator.py` uses
`SimulatorConfig(max_capacity_kwh=15.36, min_capacity_kwh=3.07)`), so deleting it or erroring on missing
config **breaks the simulator**. **Fix:** re-audit and enumerate *all* occurrences before implementation;
confirm config.py is live not dead; route capacity to sensor-first per P8 in every one of the four sites.

**[MAJOR] M5 — ai_task selector schema likely can't express the nested pricelist output; the "preferred" backend can't run the key task.**
Hits: **O1** ("structure = HA selectory, ne JSON schema → DVA převodníky"), **§3** (`to_ha_selectors()` /
`to_json_schema()`), **§5 krok ③**. HA `ai_task` selectors are a constrained set and do not cleanly express
deeply nested objects (pricelist rows: per-tariff `{vt_mwh, nt_mwh, jistic:{"3x25":…}}` — see §4 example).
If `extract_pricelist`'s structure can't round-trip through selectors, the *preferred* backend (ai_task,
which the whole privacy story in O2(c) leans on) silently can't perform the most important extraction, and
every user is pushed to the key-backend anyway. The design asserts the dual-converter works but never shows
the pricelist schema surviving the selector conversion. **Fix:** prototype `to_ha_selectors()` against the
real pricelist schema *before* committing; if selectors can't hold it, either flatten the task output or
accept that pricelist extraction is key-backend-only and document it (which weakens the "ai_task first"
privacy claim — call that out).

**[MAJOR] M6 — remote_config URL points to a personal fork, not the canonical HACS repo; single point of failure, no pinning.**
Hits: **§4** (`raw.githubusercontent.com/Muriel2Horak/oig_cloud/main/remote_config.json`), vs
`manifest.json` (documentation/issue_tracker = **psimsa/oig_cloud**; codeowners = both). The tuning/model/
pricelist lifeline is hard-wired to one personal account's `main` branch. If that account is renamed,
deleted, or diverges from the canonical repo, every install falls to bundled (degraded model chain + stale
prices) with no operator alert. Combined with C3 (no signature) this is both an availability and an
integrity risk. **Fix:** host remote_config under the same org/repo as the distributed integration, pin to a
tag or commit rather than `main`, sign it (C3), and add a `sensor.oig_ai_status`-style staleness/unreachable
signal so the maintainer notices before users do.

**[MAJOR] M7 — Operational bus factor: yearly ERÚ dataset + fast model-deprecation churn require perpetual manual maintenance, with silent staleness.**
Hits: **§4** ("dataset … generuje ročně skriptem"), **O3** (URLs "nejsou blind-templatable" → human discovery),
**O2/P1** (GLM-5 deprecated in ~6 days; kimi 410; 51/83 models dead). Two decay clocks: (1) prices must be
re-ingested every year by a human who finds the new ERÚ výměr, or users silently compute battery economics
on last year's tariffs (§4 has `"year":2026` but nothing warns the user when `year != current`); (2) the
NVIDIA chain rots within days as models are deprecated, so remote_config needs frequent updates just to keep
the fallback chain non-degraded. All of this rests on one maintainer. **Fix:** (a) surface dataset staleness
to the user (warn when pricelist `year` < current year, and in `oig_ai_status` when the live model chain is
mostly failing); (b) make the ERÚ ingest a documented, scheduled runbook, not tribal knowledge; (c) since
bundled fallback exists, define explicitly what "acceptable degraded" looks like so a lapsed year isn't
silently wrong.

**[MAJOR] M8 — Offline / privacy-first installs are locked out of premium entirely by D5.**
Hits: **D5** (AI povinná podmínka premium), **§5 krok ①**, **§3**. A local-only / air-gapped HA (a real and
vocal segment of the HA userbase, and ironically the most privacy-motivated) has no `ai_task` reachable and
cannot register a cloud key — so under D5 they can *never* unlock premium, even though solar and pricing are
fully deterministic and could run locally. The mandatory-AI decision's blast radius (brief §3) includes
excluding exactly the users most aligned with a "no data leaves your home" product. **Fix:** allow a
"deterministic premium" tier that unlocks the wizard-configured features without AI (AI-enhanced features
stay off), or explicitly document that premium requires internet + a third-party AI account and accept the
lost segment as a decision.

**[MAJOR] M9 — Mandatory AI forces every premium user under a "not for production" free-tier ToS that trains on inputs.**
Hits: **D5**, **O2** (NVIDIA free = "trial/evaluation, ne produkce"; §3.3 deidentified training), **P10**
(OpenRouter :free trains; only Groq contractually clean). Making AI a *hard requirement* for premium means a
publicly distributed HACS integration is steering non-consenting users into a ToS the vendor itself says
isn't for production and that (for NVIDIA/OpenRouter) trains on their inputs — with no opt-out if they want
premium. This is legal/reputational exposure for the author, not just a UX note. **Fix:** default the guided
key to Groq (the only clean free tier, per P10.2 — good), but make the disclosure a hard consent gate,
prefer ai_task, and combine with M8's offline path so consent is genuine, not coerced by the premium wall.

### MINOR

**[MINOR] m1 — No minimum HA version in manifest.** §3/O1 require HA ≥ 2025.8 for the ai_task path, but
`manifest.json` declares no `min_version`/`homeassistant` bound, so HA/HACS won't warn users on older cores;
the "HA < 2025.8 → hide ai_task" (§9) is a runtime branch only. Add the bound.

**[MINOR] m2 — AI key stored plaintext in `.storage`.** P2/§3 keep the key out of diagnostics and logs (good),
but `.storage/oig_cloud.ai_<entry>` is plaintext JSON on disk like all HA secrets. Acceptable per HA norm,
but state it explicitly so it isn't mistaken for encrypted-at-rest.

**[MINOR] m3 — Groq daily caps can be exhausted by the onboarding + cross-check flows themselves.** P10 gives
Groq 1–14k req/**day**; §5 krok ③ runs 2-model cross-check + validate_config + retries. Heavy onboarding (or
re-runs) can hit the daily cap and manifest as C2's lockout. Add per-day budgeting / clear "try again
tomorrow" messaging.

**[MINOR] m4 — Mobile onboarding undesigned.** §5 uses a GPS map picker, "graf zítřka", and interactive PDF
cross-check — none scoped for the HA mobile app / small screens (brief UX blind spot). At least a Playwright
mobile-viewport smoke, or a documented "desktop recommended for onboarding".

**[MINOR] m5 — The anonymity test is a static denylist and can't prove the promise.** §10 "žádný zakázaný
token v promptu" against a fixed list cannot catch identifiers it doesn't enumerate. Assert instead that the
outgoing prompt contains none of *this install's actual* config values (GPS, box id, email) — which will
immediately surface C1.

**[MINOR] m6 — No overall time budget on the fallback chain during verification.** §3 uses 30 s timeout per
model + 429 backoff over a chain of up to 32 models (P1). Worst case onboarding key-verification stalls for
minutes with no aggregate deadline or progress feedback. Add a total budget + UI progress.

---

## TOP 5 — FIX THESE FIRST

1. **C3** — Sign remote_config and hard-clamp every `tuning` value against bundled safe ranges before any
   of it can touch battery behavior. (Unsigned remote control of hardware is unshippable.)
2. **C1** — Remove GPS/location from `validate_config` (or formally re-scope O2) so §3 and §6 stop
   contradicting, and change the §10 test to assert against real config values.
3. **C2** — Decouple the dashboard gate from AI ordering: let deterministic Solár/Ceny steps complete and
   unlock the dashboard even when AI is `unverified`; gate only AI-dependent features. (Also fixes M8's
   offline exclusion partway.)
4. **M4** — Re-audit *all* hardcoded sites (4× `15.36`, 2× GPS), confirm `battery_forecast/config.py` is
   live (it is), and reconcile the §10 CI grep gate with the actual fix list before implementation starts.
5. **M1** — Decide pdfplumber's fate: add deps + executor + timeout + wheel check, or move PDF extraction to
   a maintainer-side script and keep the HA runtime on the dataset/XLSX path only.

---

**Findings by severity: 3 CRITICAL, 9 MAJOR, 6 MINOR (18 total).**
