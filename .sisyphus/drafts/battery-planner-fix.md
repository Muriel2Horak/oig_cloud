# Draft: Oprava plánování nabíjení baterie (FVE vs. síť)

## Problém (od uživatele)
- Ráno: 70% baterie
- V 10:00: Zapne se nabíjení ze sítě (UPS režim)
- Přitom svítí slunce a FVE by mohla baterii nabíjet sama
- Výsledek: Elektřina jde do sítě místo do baterie, plýtvání FVE

## Root Cause Analysis

### 1. Klíčové soubory
- `hybrid_planning.py` - hlavní plánovací logika
- `charging_plan.py` - ekonomické plánování nabíjení
- `hybrid.py` - hybridní strategie
- `rollout_flags.py` - feature flags (pv_first_policy_enabled)

### 2. Identifikovaná chyba
**Problém je v `_reach_target_soc` (hybrid_planning.py:513-566)**:
- Funkce hledá nejlevnější intervaly pro nabíjení ze sítě
- Ignoruje solární prognózu (solar_forecast)
- Plánuje UPS režim i když FVE by mohla pokrýt nabíjení

**Další problém v `_apply_economic_charging` (hybrid_planning.py:692-744)**:
- Prochází všechny intervaly a rozhoduje o nabíjení
- Nezohledňuje, že později bude dostatek FVE

### 3. Existující částečná ochrana
- `should_defer_for_pv()` v charging_plan.py (ř. 89-115) - odloží nabíjení pokud je FVE dostupná
- Ale: Tato funkce je volána jen na začátku, ne v hlavním plánovacím loopu

## Cílové chování
1. Ráno s 70% baterie → HOME režim (vybíjení baterie na spotřebu)
2. Během dne (FVE > spotřeba) → HOME režim, FVE nabíjí baterii
3. Nabíjení ze sítě (UPS) jen pokud:
   - Solární prognóza nestačí k dosažení cílové kapacity
   - Cena je výrazně nižší než očekávaná úspora

## Technické řešení

### Option A: Přidat solar-aware check do `_reach_target_soc`
- Před přidáním UPS intervalu simulovat, zda FVE dosáhne cíle sama
- Pokud ano, nepřidávat nabíjení ze sítě

### Option B: Vylepšit `should_defer_for_pv`
- Rozšířit kontrolu na celý den, ne jen aktuální interval
- Použít v hlavním plánovacím loopu

### Option C: Přidat `solar_forecast` do `_find_cheapest_candidate`
- Upřednostnit intervaly s FVE před nabíjením ze sítě

## Dotazy na uživatele
1. Jaká je kapacita baterie?
2. Jaký je cílový SoC (target_percent)?
3. Je zapnutý "PV-first" v konfiguraci?
4. Jaké jsou hodnoty min_capacity_percent a target_capacity_percent?
5. Jaký je typický denní výkon FVE (kWh) oproti spotřebě?
