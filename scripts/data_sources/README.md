# ERU price-decree sources

Machine-readable source files for `scripts/build_pricelists.py`. These are the raw
regulator artifacts the bundled `custom_components/oig_cloud/remote_config/data/pricelists.json`
is compiled from. Keep them committed so the dataset is reproducible and auditable.

## `ceny-nn26-1.xlsx`

- **Source URL:** https://eru.gov.cz/sites/default/files/obsah/prilohy/ceny-nn26-1.xlsx
- **Downloaded:** 2026-07-25
- **sha256:** `ca2948ae156708fa5a340000577b912e10cc92de973de10deb8a215bd46af480`
- **Decree:** ERU cenové rozhodnutí **14/2025** (Energetický regulační věstník **18/2025**),
  distribuce NN pro rok 2026.
- **Discovery:** https://eru.gov.cz/cenova-rozhodnuti -> "Cenové výměry" ->
  "Energetický regulační věstník 18/2025". URLs are not blind-templatable; browse from the
  discovery page.

### Layout notes (why the compiler needs the `--eru-decree` path)

- Sheet **`Distribuce`** holds per-sazba blocks (`Sazba D 25d - ...`), each with a breaker
  capacity table and one or two energy-price sections located by Czech text:
  - single-tariff (D01d, D02d): `... z platu za distribuované množství elektřiny:` -> VT
  - two-tariff: `... ve vysokém tarifu:` -> VT, `... v nízkém tarifu:` -> NT
  Energy prices are `Kč/MWh`, columns `ČEZ | EG.D | PRE` (also `UCED | SV` for category C,
  which is business-only and skipped — household tariffs are category **D**).
- Sheet **`Regulovaná složka NN`** holds the POZE component
  (`... na podporu elektřiny z podporovaných zdrojů energie`), in `Kč/A/měsíc`.
- Decree prices are **without VAT** (sheet footnote: excludes "daň z elektřiny a DPH").
  The compiler derives `price_incl_vat = price_excl_vat * (1 + vat_rate)`, `vat_rate` default 0.21.

## POZE zeroing and the snapshot count (two-decree structure, SCOPE-REVISION R4)

The 2026 household POZE (per-ampere) contribution is **0 Kč/A/měsíc**: výměr **15/2025**
(navazuje na 13/2025) vynuloval POZE s účinností od 2026-01-01, a zveřejněný `ceny-nn26-1.xlsx`
už tuto nulu obsahuje (list `Regulovaná složka NN`).

Both the distribution decree (14/2025) and the POZE zeroing (15/2025) take effect **2026-01-01**,
so per R4 ("build script dissolves amendments into finished snapshots; the app takes the newest
snapshot with `valid_from <= today`") they collapse into a **single finished 2026 snapshot**.

No separate machine-readable XLSX exists for 15/2025, and **no authoritative source publishes a
nonzero pre-zeroing 2026 POZE** (checked: věstníky 13/15/19/2025 pages and PDFs, prior-year and
`-1`-revision URL variants — all absent or 404). A second snapshot with a fabricated nonzero POZE
was deliberately **not** produced: inventing regulatory prices is exactly the defect audit gap O3
exists to remove. Both decrees are recorded in the JSON `sources` block; the maintainer can add a
genuine second snapshot once a real prior-period file is obtained.

## Regenerate the bundled dataset

```
python scripts/build_pricelists.py \
  --output custom_components/oig_cloud/remote_config/data/pricelists.json \
  --source-url "ceny-nn26-1.xlsx=https://eru.gov.cz/sites/default/files/obsah/prilohy/ceny-nn26-1.xlsx" \
  --valid-from 2026-01-01 \
  scripts/data_sources/ceny-nn26-1.xlsx
```

`--source-url NAME=https://...` is **required** in ERU-decree mode so the shipped JSON records the
real regulator URL and can never ship a `file://` provenance.
