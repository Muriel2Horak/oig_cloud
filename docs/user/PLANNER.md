# Plánovač nabíjení (Battery forecast) a automatický režim

Plánovač kombinuje dostupná data (spot ceny, solární předpověď, spotřebu, SOC) a vytváří **timeline režimů** a plánované nabíjení ze sítě. Výstup používá jak dashboard, tak volitelné automatické přepínání režimu.

---

## Jak plánovač zapnout

1. `Nastavení → Zařízení a služby → OIG Cloud → Konfigurovat`
2. Zapněte **Predikci baterie**.
3. Doplňte parametry v kroku **Predikce baterie**.

Poznámky:

- Predikce baterie vyžaduje **Solární předpověď** a **Rozšířené senzory**.
- Dashboard vyžaduje i **Statistiky** a **Cenové senzory**.

---

## Co plánovač počítá

- **Timeline režimů** (typicky 15min bloky)
- **Plánované nabíjení ze sítě** (intervaly + cena)
- **Detailní taby** pro včera/dnes/zítra

---

## Hlavní výstupní entity

- `sensor.oig_XXXXX_battery_forecast`
  - hlavní predikce (state = kWh)
  - atributy obsahují kompletní timeline, detail tabs, souhrny

- `sensor.oig_XXXXX_planner_recommended_mode`
  - doporučený režim pro aktuální interval
  - atributy: kdy je další změna, proč byl režim zvolen

- `binary_sensor.oig_XXXXX_grid_charging_planned`
  - on/off podle toho, zda je v plánu nabíjení ze sítě

---

## Konfigurační parametry (krok „Predikce baterie")

- **auto_mode_switch_enabled**
  - zapne automatické přepínání režimů podle timeline
- **min_capacity_percent / target_capacity_percent**
  - minimální a cílový SOC
- **home_charge_rate**
  - výkon nabíjení ze sítě (kW)
- **max_ups_price_czk**
  - max cena (Kč/kWh), kdy planner dovolí HOME UPS
- **disable_planning_min_guard**
  - vypnutí minimálního guardu plánovače
- **balancing_* parametry**
  - řízení balancování (intervaly, držení SOC, prahy)
- **cheap_window_percentile**
  - jak agresivně hledat „levná okna"

---

## Automatický režim (auto mode)

Pokud je `auto_mode_switch_enabled=true`, integrace volá `oig_cloud.set_box_mode` v okamžiku, kdy se má změnit režim v plánu. ServiceShield zajišťuje frontu a validaci.

Omezení:

- Doporučený režim se neaktualizuje častěji než **30 minut** (guard proti rychlým přepnutím).
- Ruční přepnutí režimu může být plánovačem v dalším kroku „přepsáno".

---

## Jak poznat, že planner běží

- `sensor.oig_XXXXX_battery_forecast` má platná data
- dashboard zobrazuje timeline a detailní taby
- `sensor.oig_XXXXX_planner_recommended_mode` mění hodnotu

---

## Bojler — plánování ohřevu

Bojler používá samostatný komfort-first planner, který je nezávislý na battery timeline.

### Jak funguje

Plánovač bojleru kombinuje:
- aktuální teplotu vody (shora i zdola, pokud jsou k dispozici)
- cílovou teplotu a deadline
- spotové ceny elektřiny
- ekonomiku alternativního zdroje (pokud je nastaven)
- preferovaný komfortní profil (řízený historií, manuálně, nebo výchozí)

Výstupem je **plan slots** — časové bloky, ve kterých se bojler zapíná. Planner vždy preferuje levnější a dostupnější zdroje před elektřinou, pokud je to z komfortního hlediska možné.

### Zdroje a ekonomika

Planner vybírá mezi zdroji podle jejich relativní ceny:
- **Elektřina (spot)** — pokud je cena elektřiny příznivá a deadline umožňuje
- **Alternativní zdroj** — pokud je levnější než elektřina (u controllable zdrojů) nebo pokud jde o ekonomicky výhodnější variantu (benchmark_only počítá s Kč/kWh parametrem)

Planner nikdy neohřívá bojler, pokud je aktuální teplota již nad cílovou a deadline je vzdálený.

### Stav a indikátory

Stav boileru se zobrazuje v Dashboard V2 a zahrnuje:
- **Aktuální stav** — heating / idle / degraded
- **Vybraný zdroj** — electric / alternative / none
- **Aktuovaný zdroj** — fyzicky aktivní zdroj (může se lišit od vybraného, pokud je aktivní manuální override)
- **Komfortní stav** — comfort_met / comfort_risk / comfort_gap
- **Důvody** — reason_codes proč planner zvolil aktuální rozhodnutí
- **Čerstvost** — freshness indikátor, degraded indikátory

### Manuální override

V Dashboard V2 je k dispozici manuální override panel. Uživatel zadá TTL (doba trvání override, 15 minut až 24 hodin, výchozí 120 minut) a povinný důvod. Submit je aktivní pouze pokud je k dispozici identita a schopnost override. Manuální override je sekundární vůči automatickému plánování — planner jej respektuje a po uplynutí TTL se vrací k automatickému režimu.

Override je dostupný jako alternativa k automatickému plánování, ne jako trvalé vypnutí.

### Degraded a freshness stavy

- **Degraded** — planner nemůže plně optimalizovat (chybí data, senzor je nedostupný, cena není k dispozici). Systém jede v nouzovém režimu s co nejbezpečnější strategií.
- **Stale/Freshness** — indikátor stáří dat. Pokud planner nedostává aktuální data, zobrazí freshness problém a přejde do degraded režimu.

---

## Souvisící dokumentace

- `./STATISTICS.md` – efektivita, profil spotřeby, balancování
- `./SERVICES.md` – služby, které planner používá
