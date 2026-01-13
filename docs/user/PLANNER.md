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

## Konfigurační parametry (krok „Predikce baterie“)

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
  - jak agresivně hledat „levná okna“

---

## Automatický režim (auto mode)

Pokud je `auto_mode_switch_enabled=true`, integrace volá `oig_cloud.set_box_mode` v okamžiku, kdy se má změnit režim v plánu. ServiceShield zajišťuje frontu a validaci.

Omezení:

- Doporučený režim se neaktualizuje častěji než **30 minut** (guard proti rychlým přepnutím).
- Ruční přepnutí režimu může být plánovačem v dalším kroku „přepsáno“.

---

## Jak poznat, že planner běží

- `sensor.oig_XXXXX_battery_forecast` má platná data
- dashboard zobrazuje timeline a detailní taby
- `sensor.oig_XXXXX_planner_recommended_mode` mění hodnotu

---

## Souvisící dokumentace

- `./STATISTICS.md` – efektivita, profil spotřeby, balancování
- `./SERVICES.md` – služby, které planner používá
