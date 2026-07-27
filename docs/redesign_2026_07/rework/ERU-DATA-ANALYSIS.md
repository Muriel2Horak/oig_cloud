# ERU data forensic analysis

**Date:** 2026-07-27
**Scope:** ERU source XLSX, build pipeline, bundled dataset, REST pricelists endpoint, FE wizard distribution display.
**Verdict:** No guilty layer in the current tree. The tree became guilt-free in the 48h before this audit via three commits (70c61155e, f5c1dbcf2, 105bc7228) addressing dual-tariff VT/NT correctness — see §10. No code change recommended beyond verifying the owner's live instance has those commits.

## TL;DR

- Live URL reachable; committed XLSX sha256 matches the live download and the README.
- Build script (`scripts/build_pricelists.py`, ERU-decree mode) extracts VT/NT correctly for all 8 dual tariffs × 3 distributors.
- VAT math correct; POZE 0/0 matches the 15/2025 POZE-zeroing decree.
- Runtime (`custom_components/oig_cloud/**`) reads ONLY the bundled JSON; XLSX is never touched at runtime.
- REST endpoint `OIGCloudPricelistsView.get()` (admin-only) shapes the full `distributors` payload including `vt`/`nt` sub-objects.
- FE wizard step 4 (`step-pricing-distribution.ts`) and prefill logic (`applyDistributionFeeSuggestion`, `onboarding/index.ts:2660-2683`) read `rate.vt`/`rate.nt` correctly for dual tariffs.
- The current clean tree is the RESULT of three commits in the preceding 48h (70c61155e, f5c1dbcf2, 105bc7228) that rebuilt the dataset from the real ERU XLSX, split the wizard distribution step into a side-by-side VT/NT pair (owner-driven), and fixed silently-VT-for-both BE billing math in a sibling field family. See §10.

**No proven bug → no trivial fix → documented follow-up only.**

---

## 1. Provenance

### 1.1 Live URL accessibility

```
GET https://eru.gov.cz/sites/default/files/obsah/prilohy/ceny-nn26-1.xlsx
HTTP/2 200
content-length: 45997
content-type:  application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
last-modified:  Fri, 23 Jan 2026 09:26:57 GMT
```

The regulator URL is live (curl `HEAD` + `GET`, exit 0). 45 997 bytes — matches the committed local copy exactly.

### 1.2 Sha256 cross-check

| Location | sha256 | Source |
|---|---|---|
| Live download (`/tmp/eru_remote_test.xlsx`) | `ca2948ae156708fa5a340000577b912e10cc92de973de10deb8a215bd46af480` | curl 2026-07-27 |
| Committed XLSX (`scripts/data_sources/ceny-nn26-1.xlsx`) | `ca2948ae156708fa5a340000577b912e10cc92de973de10deb8a215bd46af480` | `sha256sum` 2026-07-27 |
| README declared (`scripts/data_sources/README.md:11`) | `ca2948ae156708fa5a340000577b912e10cc92de973de10deb8a215bd46af480` | committed doc |
| Bundled JSON sources block (`pricelists.json:482`) | `ca2948ae156708fa5a340000577b912e10cc92de973de10deb8a215bd46af480` | committed JSON |

**All four match.** No drift, no hand-edited artifact, no stale cache.

### 1.3 Sample-against-XLSX

The bundled JSON's `distributors` (and `valid_from_snapshots[0].distributors`) were re-derived from the committed XLSX by re-running the build script in ERU-decree mode — see `tests/test_build_pricelists.py::test_shipped_pricelists_is_reproducible_from_committed_source` (lines 263-292). The test asserts:

- `rebuilt["distributors"] == shipped["distributors"]`
- `rebuilt["valid_from_snapshots"] == shipped["valid_from_snapshots"]`
- `rebuilt["sources"][...]["source_url"] == shipped["sources"][...]["source_url"]`

This is a CI guard: a hand-typed or stale dataset cannot ship silently.

---

## 2. Decree correctness

### 2.1 Decree reference (bundled JSON, `pricelists.json:479`)

```
"decree": "14/2025 (Energetický regulační věstník 18/2025), distribuce NN pro rok 2026"
```

- **14/2025** = ERU cenové rozhodnutí for distribuce NN 2026 (the price-decree itself).
- **18/2025** = the Energetický regulační věstník that publishes it.
- This is the only official distributor-pricing decree for rok 2026 NN; both ČEZ Distribuce and PRE refer to it (P4/O3 in `docs/redesign_2026_07/DECISIONS.md:205-212`). **Correct.**

*Limitation: the 14/2025 + 15/2025 POZE decree label is sourced only to this project's internal docs (`scripts/data_sources/README.md:12,33-46` and `docs/redesign_2026_07/DECISIONS.md:205-212`); the XLSX itself does not embed a decree number, and no independent regulator confirmation was obtained for this audit.*

### 2.2 POZE 0/0 — decree 15/2025

The `Regulovaná složka NN` sheet, row 5 (the only `Kč/A/měsíc` per-ampere row):

```
Složka ceny na podporu elektřiny z podporovaných zdrojů energie
   - výpočet dle rezervovaného příkonu **)        0   Kč/A/měsíc
```

Zeroed by výměr **15/2025** (navazuje na 13/2025), účinnost 2026-01-01. README (`scripts/data_sources/README.md:33-46`) and bundled note (`pricelists.json:481`) both record this. The build script's `_extract_eru_poze` (`build_pricelists.py:632-647`) correctly matches the Czech label and returns `excl=0.0`, which then becomes `price_incl_vat = 0.0 * 1.21 = 0.0` for every DSO. **Correct** — the README's "no second snapshot with a fabricated nonzero POZE" stance is exactly the audit gap O3 exists to remove.

---

## 3. Runtime isolation from XLSX

`rg 'openpyxl|build_pricelists|ceny-nn26|regulovana slozka|distribuce'` against `custom_components/oig_cloud/` returns **only** the `pricelists.json` file (no `openpyxl` import, no XLSX parsing, no `Distribuce`/`Regulovaná složka` sheet access). The runtime reader is one path:

- `custom_components/oig_cloud/config_registry.py:105-118`
  ```python
  _PRICELISTS_JSON_PATH = (
      Path(__file__).resolve().parent / "remote_config" / "data" / "pricelists.json"
  )
  def _load_released_pricelists() -> Dict[str, Any]:
      try:
          with _PRICELISTS_JSON_PATH.open("r", encoding="utf-8") as fh:
              payload = json.load(fh)
      ...
  ```

There is **no other runtime source**. The build script is maintainer-side only; it never executes inside HA.

**Confidence:** HIGH — confirmed by absence of any openpyxl/XLSX reference in the runtime tree.

---

## 4. Dual-tariff audit (8 codes × 3 DSOs × {VT, NT})

### 4.1 XLSX (raw `Kč/MWh`, no VAT, `Distribuce` sheet)

Extracted by replicating `_parse_eru_tariffs` + `_eru_price_row` against the committed XLSX (`openpyxl`, `data_only=True`):

| Tariff | ČEZ VT | EG.D VT | PRE VT | ČEZ NT | EG.D NT | PRE NT |
|---|---|---|---|---|---|---|
| D25d | 2252.45 | 2243.88 | 1656.49 | 116.50 | 224.30 | 175.20 |
| D26d | 1202.06 | 1237.94 | 1009.35 | 116.50 | 224.30 | 175.20 |
| D27d | 2252.45 | 2243.88 | 1656.49 | 116.50 | 224.30 | 175.20 |
| D35d |  754.77 |  749.87 |  421.52 | 116.50 | 224.30 | 175.20 |
| D45d |  754.77 |  749.87 |  421.52 | 116.50 | 224.30 | 175.20 |
| D56d |  754.77 |  749.87 |  421.52 | 116.50 | 224.30 | 175.20 |
| D57d |  754.77 |  749.87 |  421.52 | 116.50 | 224.30 | 175.20 |
| D61d | 3306.67 | 3367.23 | 2343.05 | 116.50 | 224.30 | 175.20 |

### 4.2 Bundled JSON (`vt.price_excl_vat`, `nt.price_excl_vat`)

`pricelists.json:26-153` (ČEZ), `pricelists.json:183-310` (EG.D), `pricelists.json:340-467` (PRE).

| Tariff | ČEZ VT | EG.D VT | PRE VT | ČEZ NT | EG.D NT | PRE NT |
|---|---|---|---|---|---|---|
| D25d | 2252.45 | 2243.88 | 1656.49 | 116.50 | 224.30 | 175.20 |
| D26d | 1202.06 | 1237.94 | 1009.35 | 116.50 | 224.30 | 175.20 |
| D27d | 2252.45 | 2243.88 | 1656.49 | 116.50 | 224.30 | 175.20 |
| D35d |  754.77 |  749.87 |  421.52 | 116.50 | 224.30 | 175.20 |
| D45d |  754.77 |  749.87 |  421.52 | 116.50 | 224.30 | 175.20 |
| D56d |  754.77 |  749.87 |  421.52 | 116.50 | 224.30 | 175.20 |
| D57d |  754.77 |  749.87 |  421.52 | 116.50 | 224.30 | 175.20 |
| D61d | 3306.67 | 3367.23 | 2343.05 | 116.50 | 224.30 | 175.20 |

### 4.3 XLSX vs JSON — mismatch count

**0 mismatches across 24 legs** (8 codes × 3 DSOs × 2 legs). All `vt.price_excl_vat`/`nt.price_excl_vat` cells equal the XLSX raw values to the cent.

### 4.4 VAT math verification

`price_incl_vat = round(excl * (1 + 0.21) + 1e-9, 2)` (`build_pricelists.py:684-693`). Every leg recomputes correctly:

- `116.5 * 1.21 = 140.965` → `round2 = 140.97` ✓
- `224.3 * 1.21 = 271.403` → `round2 = 271.40` ✓
- `175.2 * 1.21 = 211.992` → `round2 = 211.99` ✓
- `2252.45 * 1.21 = 2725.4645` → `round2 = 2725.46` ✓
- All 48 incl/excl pairs (8 × 3 × 2) verified by direct comparison in audit script. **Zero mismatches.**

### 4.5 Single-tariff sanity

D01d (3 legs: cez/egd/pre × VT) and D02d (3 legs) match XLSX exactly. Both correctly **lack** an `nt` leg (single-tariff sazby by decree carry only `distribuované množství elektřiny:`).

### 4.6 Top-level mirror-VT (intentional)

For two-tariff sazby, the top-level `price_incl_vat`/`price_excl_vat` mirror the VT leg by design (`build_pricelists.py:712`):

```python
payload: Dict[str, Any] = {**vt, "vt": vt, "description": description}
if "NT" in legs:
    ...
    payload["nt"] = _eru_point("Kc/MWh", legs["NT"][dso], vat_rate)
```

This keeps the 2-level readers (legacy `distributor → tariff → {price_incl_vat, price_excl_vat, unit}`) working for both single and dual sazby; canonical per-leg data is in `vt`/`nt`. **Documented design, not a bug.**

---

## 5. REST shaping — `OIGCloudPricelistsView`

### 5.1 Endpoint surface

`custom_components/oig_cloud/api/ha_rest_api.py:1639-1723`

- URL: `{API_BASE}/{box_id}/pricelists`
- Auth: admin-only (`_require_admin`)
- Source: `_load_released_pricelists()` → `_pick_latest_snapshot()` → snapshot distributors
- Response shape:
  ```python
  {
    "distributors": {dso: {tariff: rate, ...}},   # full vt/nt structure
    "tariffs": [...],                              # union of all tariff codes
    "selected_distributor": str,
    "selected_tariff": str,
    "confirmed_distribution_price_incl_vat": float,   # from selected_rate (top-level == VT)
    "confirmed_distribution_price_excl_vat": float,
    "confirmed_distribution_unit": str,
    "year": int,
    "valid_from": str,
    "stale_warning": bool,
  }
  ```

### 5.2 VT/NT carriage

The `distributors` payload is the snapshot's `distributors` dict **verbatim** (`ha_rest_api.py:1669-1672`):

```python
distributors = {
    str(distributor): dict(rates) if isinstance(rates, dict) else {}
    for distributor, rates in snapshot_distributors.items()
}
```

This preserves the `vt`/`nt` sub-objects. For a D26d user, `distributors.cez.D26d.nt.price_excl_vat` is reachable — **no information loss**.

### 5.3 FE consumption path

`custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts:2660-2683`:

```typescript
private applyDistributionFeeSuggestion(): void {
    if (!this._registry) return;
    const distributor = this.pricingDraft['confirmed_distribution_distributor'] as string | undefined;
    const tariff = this.pricingDraft['confirmed_distribution_tariff'] as string | undefined;
    if (!distributor || !tariff) return;
    const rate = this.pricing?.distributors?.[distributor]?.[tariff];
    if (!rate) return;

    const suggest = (key: string, leg?: { price_excl_vat: number }): [string, number] | null => {
      if (!leg) return null;
      const current = this.pricingDraft[key];
      const registryDefault = this._registry!.fields[key]?.default;
      const untouched = current === undefined || current === registryDefault;
      if (!untouched) return null;
      return [key, Math.round((leg.price_excl_vat / 1000) * 100) / 100];
    };

    const updates = [
      suggest('distribution_fee_vt_kwh', rate.vt),
      suggest('distribution_fee_nt_kwh', rate.nt),
    ].filter((u): u is [string, number] => u !== null);
    if (updates.length === 0) return;
    this.pricingDraft = { ...this.pricingDraft, ...Object.fromEntries(updates) };
}
```

Two key correctness checks:

1. **Cross-step dual flag.** `isDualTariff` is derived from the tariff code via `isDualTariffCode(...)` (`step-pricing-distribution.ts:21-23`) which compares against the same `DUAL_TARIFF_CODES` (`['D25d','D26d','D27d','D35d','D45d','D56d','D57d','D61d']`) used by the test suite and matching the XLSX reality. **Match.**
2. **Untouched-only prefill.** The prefill is gated on `current === registryDefault` — an existing user with a custom value is never overwritten (UX-SPEC §3 review mode, line 2657). **Safe.**

The prefill divides `price_excl_vat` (Kč/MWh) by 1000 and rounds to 2 decimals to derive Kč/kWh for the registry fields. This is a documented conversion, not a corruption; the user can correct.

### 5.4 Cross-references (DUAL_TARIFF_CODES consistency)

| Location | List | Source of truth |
|---|---|---|
| `tests/test_build_pricelists.py:33` | `TWO_TARIFF_D_CODES = {"D25d","D26d","D27d","D35d","D45d","D56d","D57d","D61d"}` | test guard |
| `www_v2/src/ui/features/onboarding/step-pricing-distribution.ts:17-19` | `DUAL_TARIFF_CODES = ['D25d','D26d','D27d','D35d','D45d','D56d','D57d','D61d']` | FE |

**Identical** (set membership; order differs in the FE constant but it's not consulted by index). The XLSX `Distribuce` sheet confirms all 8 are two-tariff (both `vysokém` and `nízkém` tarifu sections present); D01d/D02d are single-tariff (only `distribuované množství elektřiny:` section). **Three sources agree.**

---

## 6. Verdict / fix list

| Layer | Status | Evidence |
|---|---|---|
| Provenance (live URL + sha256) | OK | §1.1, §1.2 |
| Decree label (14/2025, věstník 18/2025) | OK | §2.1 |
| POZE 0/0 (15/2025 zeroing) | OK | §2.2 |
| Build script dual-tariff extraction | OK | §4.1, §4.2, §4.3 |
| VAT math | OK | §4.4 |
| Single-tariff `nt` absence | OK | §4.5 |
| Top-level mirror-VT (intentional) | OK | §4.6 |
| Runtime isolated from XLSX | OK | §3 |
| REST carries `vt`/`nt` | OK | §5.2 |
| FE prefill uses `rate.vt`/`rate.nt` | OK | §5.3 |
| DUAL_TARIFF_CODES three-way consistency | OK | §5.4 |
| Snapshot = latest | OK | audit-script `diff` returns 0 |

**Conclusive finding (current tree):** No data corruption, no mis-mapping, no guilty layer. The dual-tariff path is correct end-to-end today: XLSX → build_pricelists.py → bundled JSON → REST `distributors[*].*.[vt|nt]` → FE `applyDistributionFeeSuggestion`. See §10 for the timeline that produced this state.

**No trivial proven bug → no fix implemented. No tests added. No commit made (per brief).**

---

## 7. Follow-up only (non-bugs, optional future polish)

These are **NOT** proven defects and are documented as deferred work, not as the required deliverable:

1. **Pre-fill rounding loss.** `Kč/MWh → Kč/kWh` at `index.ts:2674` rounds to 2 decimals, so e.g. 2252.45 → 2.25 Kč/kWh (true 2.25245). The registry default re-derives from `price_excl_vat` without this loss, so the only loss is in the wizard prefill, which the user can correct. Not a data bug; a UX nicety (3-decimal precision, or display the MWh value with a "/MWh" hint). Out of scope for this forensic brief.
2. **Top-level mirror-VT consumer caution.** `confirmed_distribution_price_incl_vat` (REST, `ha_rest_api.py:1706`) returns the VT (top-level) value for two-tariff sazby. Any BE consumer that reads this for a dual-tariff customer without consulting `distribution_fee_vt_kwh`/`distribution_fee_nt_kwh` will silently use VT. The current FE does not (it uses the prefill-derived `distribution_fee_*_kwh`); no current BE consumer was found that reads `confirmed_distribution_price_incl_vat` for distribution-pricing math (only the wizard field display and the legacy single-field representation). Follow-up: audit BE consumers (`battery_forecast/data/pricing.py`, `pricing/spot_price_15min.py`, `entities/analytics_sensor.py` referenced in `step-pricing-distribution.ts:51-53`) for actual VT-vs-NT selection logic. Not a forensic finding here. **Fix landed 2026-07-26 in `105bc7228` (Unit 2) — verify the running instance has it.**
3. **Build script VT/NT leg scope.** `_parse_eru_tariffs` (`build_pricelists.py:650-681`) does not record which tariffs it classified as single vs dual in the output JSON. The classification is recoverable from `nt` presence, but the build script's `_validate_eru_distributors` (`build_pricelists.py:738-757`) doesn't assert it. Already covered by the shipped `test_shipped_pricelists_has_tariff_descriptions` and `test_shipped_pricelists_unit_rules` guards. Not a bug.
4. **POZE single value, three duplicates.** The POZE 0/0 is duplicated across all three distributors despite being a single state-mandated fee. This is intentional (`_eru_tariff_payload` lines 731-733 of `build_pricelists.py`) — keeps the 2-level reader contract uniform — but bloats the JSON. Follow-up only.
5. **Snapshot count audit.** The README and bundled JSON agree on a single 2026 snapshot (R4 collapse of 14/2025 + 15/2025). No second snapshot exists. The shipped `test_shipped_pricelists_snapshots_have_valid_from` guard (`test_build_pricelists.py:252-260`) asserts presence; not quantity. No issue.

---

## 8. Reproducing this audit

Tools used: `sha256sum`, `curl`, `python3 -c "..."` with `openpyxl 3.1.5` (system package, no virtualenv needed), plus the existing test suite `tests/test_build_pricelists.py::test_shipped_pricelists_is_reproducible_from_committed_source`.

All checks are read-only. No files modified. No commit. Per brief: "Do not commit. Do not run slow full builds. Do not change unrelated files or deploy."

---

## 9. Sign-off

- **Files read for this analysis:** `scripts/data_sources/README.md`, `scripts/data_sources/ceny-nn26-1.xlsx`, `scripts/build_pricelists.py`, `custom_components/oig_cloud/remote_config/data/pricelists.json`, `custom_components/oig_cloud/config_registry.py:90-230`, `custom_components/oig_cloud/api/ha_rest_api.py:1620-1730`, `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/step-pricing-distribution.ts`, `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts:2660-2710`, `tests/test_build_pricelists.py`, git log of `scripts/data_sources/`, `scripts/build_pricelists.py`, `custom_components/oig_cloud/battery_forecast/data/pricing.py`, `custom_components/oig_cloud/battery_forecast/spot_price_export_15min.py`, `tests/test_nt_fee_pricing.py`, `tests/test_registry_field_consumption.py` (HEAD and pre-fix bases).
- **Files written:** this document (`docs/redesign_2026_07/rework/ERU-DATA-ANALYSIS.md`).
- **Commit:** none (per brief).

---

## 10. Recency — how the current tree became clean

The audit was run on the current tree only. Three commits in the 48h BEFORE this doc addressed the dual-tariff VT/NT surface directly:

| commit | date (UTC) | role |
|---|---|---|
| `70c61155e` | 2026-07-25 06:18 | "F1 O3: rebuild bundled pricelist dataset from the real ERU 14/2025 XLSX" — replaced a fabricated TEST FIXTURE dataset (commit message: *"The shipped pricelists.json was generated from a TEST FIXTURE ... fabricated prices"*) |
| `f5c1dbcf2` | 2026-07-26 05:16 | "feat(f1-wv2): pricing-distribution step owner UX rev ... VT/NT distribution price" — owner-driven split of the wizard distribution step from a single mirror-VT display into a side-by-side VT/NT pair (commit message: *"Owner live-walk direction on the deployed wizard, step 4 ... VT/NT distribution price"*) |
| `105bc7228` | 2026-07-26 21:22 | "fix(f1): wire dead field-audit fields + NT dual-tariff fees + boiler misclassification" — Unit 2 fixes silently-VT-for-both billing math for `spot_positive_fee_percent_nt`, `spot_negative_fee_percent_nt`, `spot_fixed_fee_mwh_nt`, `export_fee_percent_nt`, `export_fixed_fee_czk_nt` |

The current clean tree is the RESULT of these three commits, not evidence that the pipeline was never broken. At least one of them (`f5c1dbcf2`) was triggered by an owner live-walk on the deployed wizard — the same symptom class as the owner's report on this doc.

The doc does not establish whether the owner's live HA instance has picked up `70c61155e`, `f5c1dbcf2`, and `105bc7228` (HA restart, integration update). That is the most direct explanation left standing if the owner's report was filed before the integration window reached their box. Confirm with the owner whether their report predates 2026-07-26, and confirm their running instance is on the post-`105bc7228` build.