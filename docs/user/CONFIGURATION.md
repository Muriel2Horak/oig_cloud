# Průvodce konfigurací OIG Cloud

Tento dokument popisuje aktuální konfiguraci integrace podle toho, jak ji skutečně nabízí konfigurační wizard v Home Assistant.

## 📋 Před začátkem

✅ **Povinné:**

- Home Assistant 2024.1+ (doporučeno)
- Účet v OIG Cloud portálu
- E‑mail a heslo pro přihlášení
- Aktivní „Živá data“ v OIG Cloud mobilní aplikaci

⚠️ **Volitelné:**

- API klíč pro solární předpověď (Forecast.Solar nebo Solcast)
- Informace o tarifech/distribuci (pro přesnější ceny)

📖 Pokud chybí živá data, konfigurace skončí chybou: `./LIVE_DATA_REQUIREMENT.md`.

---

## 🧭 Typy nastavení

Po přidání integrace si zvolíte jeden ze tří režimů:

1. **Wizard (doporučeno)** – postupné nastavení v několika krocích.
2. **Quick setup** – pouze přihlášení + základní výchozí hodnoty.
3. **Import z YAML** – zatím **není** implementováno.

---

## 🧙‍♂️ Wizard: krok za krokem

### 1) Uvítání

Informační krok. Nic nenastavujete.

### 2) Přihlašovací údaje + „Živá data“

- **E‑mail** a **heslo** pro OIG Cloud.
- Potvrzení checkboxu, že máte zapnutá **Živá data**.

> Bez živých dat integrace nebude schopná číst telemetrii.

### 3) Výběr modulů

Zde zapínáte funkcionalitu. Přehled:

- **Statistiky a analýzy** – výpočty a dlouhodobé metriky.
- **Solární předpověď** – Forecast.Solar nebo Solcast.
- **Predikce baterie** – plánovač timeline a doporučený režim.
- **Cenové senzory (OTE)** – spot ceny a výpočty cen.
- **Rozšířené senzory** – napětí/proudy/teploty.
- **ČHMÚ varování** – meteorologická varování.
- **Dashboard** – webový UI panel v HA.
- **Bojler** – modul řízení bojleru.
- **Auto** – připravovaný modul (zatím bez funkční logiky).

Důležité závislosti:

- **Predikce baterie** vyžaduje **Solární předpověď** a **Rozšířené senzory**.
- **Dashboard** vyžaduje **Statistiky + Solární předpověď + Predikci baterie + Cenové senzory + Rozšířené senzory**.

### 4) Intervaly a zdroj dat

- **standard_scan_interval** (30–300 s)
- **extended_scan_interval** (300–3600 s)
- **data_source_mode**
  - `cloud_only` – telemetrie z OIG Cloud API
  - `local_only` – lokální proxy, fallback na cloud při výpadku
- **local_proxy_stale_minutes** – po jak dlouhé neaktivitě přepnout na cloud
- **local_event_debounce_ms** – debounce změn z lokální proxy

📖 Detaily o lokálním režimu: `./DATA_SOURCE.md`.

### 5) Solární předpověď (pokud je zapnuto)

- **Provider**: Forecast.Solar / Solcast
- **Režim aktualizace** (daily, every_4h, hourly)
- **API klíč**
  - Forecast.Solar: klíč je nutný pro častější aktualizace (4h / hourly)
  - Solcast: klíč je nutný vždy
- **Souřadnice** (lat, lon)
- **String 1 / String 2**
  - alespoň jeden string musí být zapnutý
  - parametry: kWp, sklon (declination), azimut

### 6) Predikce baterie (pokud je zapnuto)

Hlavní parametry plánovače:

- **auto_mode_switch_enabled** – automatické přepínání režimu podle plánu
- **min_capacity_percent** – minimální SOC
- **target_capacity_percent** – cílový SOC
- **home_charge_rate** – nabíjecí výkon ze sítě (kW)
- **max_ups_price_czk** – maximální cena pro režim HOME UPS
- **disable_planning_min_guard** – vypnutí min. guardu v plánovači
- **balancing_enabled** – zapnutí balancování
- **balancing_interval_days** – periodicita balancování
- **balancing_hold_hours** – jak dlouho držet SOC pro balancování
- **balancing_opportunistic_threshold** – práh pro opportunistic režim
- **balancing_economic_threshold** – práh pro economic režim
- **cheap_window_percentile** – percentile levných oken

Detailní popis plánovače: `./PLANNER.md` + `./STATISTICS.md`.

### 7) Ceny – nákup (import)

Výběr scénáře pro cenu nákupu:

- **SPOT + procento** (spot_percentage)
- **SPOT + fixní poplatek** (spot_fixed)
- **FIX cena** (fix_price)

### 8) Ceny – prodej (export)

Analogicky:

- **SPOT − procento**
- **SPOT − fixní srážka**
- **FIX cena**

### 9) Ceny – distribuce a tarify

- **tariff_count**: single / dual
- Distribuční poplatky (VT/NT)
- **VT/NT starty** pro **pracovní dny** i **víkendy**
- **tariff_weekend_same_as_weekday** – zjednodušení
- **VAT (DPH)**

### 10) Bojler (pokud je zapnuto)

Bojler lze nastavit dvěma způsoby, přepínač je na prvním kroku:

**Jednoduchý režim (5 kroků, doporučeno):**

1. **Identita a objem** — ID boxu a objem bojleru v litrech. Na tomto kroku lze přepnout na Expert.
2. **Senzory teplot** — horní senzor (povinný), volitelně spodní senzor (pro přesnější stratifikovaný model, aktivuje se zaškrtnutím volby).
3. **Ohřev a zdroj** — topné těleso (switch), výkon nebo rychlost regenerace, volitelné cirkulační čerpadlo.
4. **Alternativní zdroj** — režim alternativního zdroje: vypnuto / pouze benchmarking / ovladatelný (s cenou za kWh).
5. **Komfort a deadline** — komfortní profil (historie / manuál / výchozí), cílová teplota, čas deadline.

**Expert režim:** Původní jeden krok s pokročilými parametry (stratifikace, plánovací horizont 12–48 h, explicitní režim alternativního zdroje, spotový senzor, atd.). Velikost plánovacího slotu není konfigurovatelná; planner používá pevný 15minutový kontrakt.

Dokončení jednoduchého režimu nastaví `boiler_setup_complete`, což odemkne ovládání bojleru. Expert režim rovněž nastavuje `boiler_setup_complete` po úspěšném uložení.

### 11) Souhrn

Zobrazí se shrnutí konfigurace a potvrdíte vytvoření integrace.

---

## ⚡ Quick setup

Quick setup obsahuje jen:

- Username + password
- Potvrzení živých dat

Ostatní volby se nastaví na výchozí hodnoty (intervaly, moduly atd.).

---

## 🔧 Rekonfigurace

Změny provedete přes:

`Nastavení → Zařízení a služby → OIG Cloud → Konfigurovat`

Otevře se stejný wizard (bez přihlášení) a změny se uloží do options.

---

## 🧪 Telemetrie

Integrace odesílá omezenou telemetrii pouze pro ServiceShield (diagnostika a stabilita). Identifikátory jsou **hashované** (e‑mail + HA instance). V UI zatím není přepínač, ale lze použít `no_telemetry` v options (pokročilé nastavení).

Pokud potřebujete telemetrii vypnout, napište nám – poradíme s bezpečným postupem.

---

## ✅ Co dál

- Dashboard: `./DASHBOARD.md`
- Služby: `./SERVICES.md`
- Plánovač a algoritmy: `./PLANNER.md`
- Statistiky a metriky: `./STATISTICS.md`
- Lokální data: `./DATA_SOURCE.md`
