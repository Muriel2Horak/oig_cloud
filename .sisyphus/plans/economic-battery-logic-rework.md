# Plán: přepracování ekonomické logiky baterie (Ceny & predikce)

## Cíl (zamčeno s uživatelem)
Být maximálně soběstačný za nejnižší náklady. Baterie = nárazník na období, kdy je **málo/žádná FVE A drahý spot**, aby se v drahých intervalech neodebíralo nekontrolovaně ze sítě. Doplňovat ze sítě jen v nejlevnějších oknech, předem, jen tolik kolik je potřeba. Baterie se aktivně neprodává (HW neumí); export jen pasivně při plné baterii.

## Řídicí prostor (zamčeno)
- Plánovač volí **jen Home 1 (`HOME_I`, self-consume) / Home UPS (`HOME_UPS`, grid-charge)**.
- Home 2/3 se po skončení výroby chovají jako Home 1 (liší se jen denní alokací soláru) → pro plánovač = jedno „self-consume".
- **Home 5** (baterie → bojler/auto, HW-gated) je budoucí hák pro bojler/auto — jádro psát jako **zdroje × spotřebiče** (sink rozhraní: target + deadline + povolené zdroje), aby přidání bojleru/auta nebyl rewrite.

## Algoritmus (zamčeno)
Cena = **all-in** (spot + distribuce + DPH), 15min. Práh „drahého" = **percentil dne**. Účinnost = round-trip η.

0. **Baseline**: simuluj vše Home 1 → SoC trajektorie + kde/za kolik by se odebíralo ze sítě.
1. **Drahé odběry**: baseline odběry s `cena ≥ percentil P`.
2. **Displacement (jádro, dnes chybí)**: od nejdražšího odběru najdi dřívější interval na Home UPS, nejlevnější první, kde: `cena_levná/η < cena_drahá`, je headroom (s mezi-tím solárem), a nabití reálně dorezervuje (ověř re-simulací). Sepni, re-simuluj, opakuj. V levném intervalu jede dům z levné sítě → baterie se nevybíjí.
3. **Floor (pojistka)**: SoC nikdy < HW min — tvrdá podmínka, nabíjí nejlevnější **bez** η-filtru.
4. **PV-first guard**: před drahým oknem se silnou FVE grid-charge odlož (`_estimate_future_storable_surplus_kwh`).

Dynamický target = emergentní (součet vytlačených drahých deficitů). Žádné magické číslo.

## Reálná změna v kódu
Dnešní `_global_greedy_charge_intervals` dělá jen krok 3 (statických 33 %). Rozšířit:
- `find_critical_moments` → i `EXPENSIVE_IMPORT` momenty (baseline odběr nad percentilem).
- η-filtr do výběru kandidáta (jen pro ekonomické momenty; floor bez filtru).
- percentil P + η z `PlannerInputs`/configu.
- smazat mrtvý 3-cestný systém (`make_economic_decisions`/`generate_plan`/`calculate_cost_*`).
Živé primitivy (`_simulate_with_modes`, `find_critical_moments`, `_estimate_future_storable_surplus_kwh`, `_simulate_interval`) jsou zdravé → reuse.

## Fáze
- **F0** Baseline & fixtures z živých dat + harness (jen testy). 
- **F1** Jádro: ekonomické momenty + displacement + η-filtr + percentil; scénářové testy (levná noc/drahé ráno, slunečný den→odloží, celý levný/drahý, η-hranice, prázdná FVE).
- **F2** Wiring: `forecast_update` předá percentil/η; `target_kwh` reportuje dynamickou rezervu; dlaždice/recommended/timeline odráží.
- **F3** Cenové entity: 15min jako kanonický zdroj pravdy (2.61 vs 4.17), legacy hodinový deprecovat.
- **F4** Mrtvý kód: import-graph audit → smazat legacy plánovače + jejich testy (až po OK na seznam).
- **F5** Živá verifikace: deploy + Playwright Ceny tab, plán předadbíjí v levných oknech, total cost ↓ vs baseline.

## Mrtvý kód (kandidáti, zatím jen mapováno)
`economic_planner_integration.py`, `strategy/{hybrid,hybrid_planning,hybrid_scoring,planner_observability}`, `planning/{charging_plan,charging_helpers,dynamic_day_policy,observability}`, in-file 3-cestný systém v `economic_planner.py`. ~6000+ ř. + testy. (`dynamic_day_policy` = klasifikátor dne, případně částečně salvage.)

## Pozn.
Deploy + živá verifikace = main loop (SSH gated). Subagenti: research/fixtures/implementace/review/pytest.
