# 🌦️ OIG Cloud v2.0.4 - ČHMÚ Weather Warnings

**Release Date:** 24. října 2025

---

## 🎉 Co je nového

### 🌦️ **ČHMÚ Meteorologická Varování** (NOVÉ!)

Kompletní integrace s Českým hydrometeorologickým ústavem pro real-time meteorologická varování!

#### Hlavní funkce:

- **Dva senzory:**
  - 🎯 **Lokální** - GPS filtrovaná varování pro váš region
  - 🗺️ **Globální** - Všechna varování pro celou Českou republiku

- **5 úrovní závažnosti:**
  - Level 0: Žádná varování ✅
  - Level 1: Minor (Žluté varování) 🟡
  - Level 2: Moderate (Oranžové varování) 🟠
  - Level 3: Severe (Červené varování) 🔴 + pulsace
  - Level 4: Extreme (Fialové varování) 🟣 + rychlá pulsace

- **Dashboard integrace:**
  - Color-coded badge v hlavičce dashboardu
  - Kliknutelný badge otevře detailní modal
  - Zobrazuje: typ události, oblast, začátek, konec, ETA, popis, pokyny
  - WebSocket real-time updates
  - Mobile-responsive design

#### Technické detaily:

- **Data source:** ČHMÚ CAP XML API
- **Update interval:** 1× za hodinu
- **Geografické filtrování:** Point-in-polygon, Point-in-circle, Geocode fallback
- **GPS priority:** Solar Forecast → HA nastavení → Praha default
- **Persistent storage:** Ano (data přežijí restart)
- **Dependencies:** Zero (Shapely-free implementace)

#### Konfigurace:

1. **Nastavení** → **Zařízení a služby** → **OIG Cloud** → **Konfigurovat**
2. Zaškrtnout **"🌦️ Varování ČHMÚ"** v sekci Moduly
3. Pro přesné lokální varování nastavit GPS v Solar Forecast nebo HA obecných nastaveních

📖 **Dokumentace:** `docs/CHMU_WARNINGS.md`

---

### 🔋 **Grid Charging Sensor - Refactor**

Kompletní přepracování senzoru nabíjení ze sítě s lepší přesností a detailními informacemi.

#### ⚠️ BREAKING CHANGE:

**Předtím:**
- Typ: Numeric sensor
- Stav: Celková energie v kWh
- Zahrnoval i intervaly kdy baterie byla plná

**Nyní:**
- Typ: Binary sensor
- Stav: `on` když je plánováno nabíjení, `off` když ne
- Energie a cena přesunuty do atributů
- Počítá **pouze skutečné nabíjení baterie**

#### Nové atributy:

```yaml
state: on
attributes:
  total_energy_kwh: 8.5          # Jen energie pro nabíjení baterie
  total_cost_czk: 23.80          # Jen cena za nabíjení baterie
  charging_battery_count: 5      # Počet intervalů se skutečným nabíjením
  charging_intervals:            # Detailní seznam všech intervalů
    - start: "2025-10-25T02:00:00+02:00"
      end: "2025-10-25T03:00:00+02:00"
      energy_kwh: 2.1
      price_czk: 5.67
      is_charging_battery: true   # ← Baterie se skutečně nabíjí
      battery_capacity_kwh: 8.5
    - start: "2025-10-25T03:00:00+02:00"
      end: "2025-10-25T04:00:00+02:00"
      energy_kwh: 1.5
      price_czk: 4.05
      is_charging_battery: false  # ← Grid jen pokrývá spotřebu
      battery_capacity_kwh: 10.0  # ← Baterie plná
      note: "Grid pokrývá jen spotřebu (baterie plná)"
```

#### Co to znamená pro vás:

- **Přesnější statistiky** - počítá jen skutečné nabíjení baterie
- **Lepší přehled** - vidíte které intervaly skutečně nabíjejí baterii
- **Správné náklady** - cena jen za nabíjení, ne za celkovou spotřebu
- **Automations** - můžete reagovat na binary state místo parsování energie

---

### 🐛 **Opravy Dashboard**

- ✅ Výchozí zoom pricing grafu nyní ukazuje aktuální čas
- ✅ Opravena inicializace grafů po hard refresh (F5)
- ✅ Opraveno timezone handling v grafech
- ✅ Opraven výpočet počtu animačních kuliček ve flow
- ✅ Opravena validace viditelnosti při přepnutí na Flow tab
- ✅ Asynchronní aplikace výchozího zoomu po Chart.js inicializaci

---

### 🗑️ **Odstraněno**

- ❌ Automatické nabíjení baterie při nepřízni počasí
  - Feature byl experimentální a nepoužívaný
  - Nahrazen ČHMÚ varováními pro lepší informovanost

---

## 📊 Statistiky Release

- **Commits od v2.0.3-preview:** 432
- **Nové soubory:** 3
  - `api/api_chmu.py` - ČHMÚ API client (705 řádků)
  - `sensors/SENSOR_TYPES_CHMU.py` - Sensor definitions
  - `docs/CHMU_WARNINGS.md` - Dokumentace
- **Upravené soubory:** 15+
- **Řádky kódu:** +2,500 / -800
- **Dokumentace:** +300 řádků

---

## 🚀 Instalace / Aktualizace

### Přes HACS:

1. **HACS** → **Integrations** → **OIG Cloud** → **Update**
2. **Restart Home Assistant**
3. **Nastavení** → **Zařízení a služby** → **OIG Cloud** → **Konfigurovat**
4. Aktivovat modul **"🌦️ Varování ČHMÚ"**

### Manuálně:

```bash
cd /config/custom_components/
rm -rf oig_cloud
wget https://github.com/psimsa/oig_cloud/releases/download/v2.0.4/oig_cloud.zip
unzip oig_cloud.zip
rm oig_cloud.zip
```

---

## ⚠️ Důležité poznámky

### Grid Charging Binary Sensor

Pokud máte automatizace nebo dashboardy používající `sensor.{box_id}_grid_charging_planned`, budete muset:

1. **Změnit typ entity** z numeric na binary
2. **Aktualizovat šablony:**
   - `state` je nyní `on`/`off` místo čísla
   - Energie: `state_attr('sensor.xxx_grid_charging_planned', 'total_energy_kwh')`
   - Cena: `state_attr('sensor.xxx_grid_charging_planned', 'total_cost_czk')`

### ČHMÚ Varování

- Lokální varování vyžadují správnou GPS polohu
- Doporučujeme nastavit GPS v Solar Forecast konfiguraci nebo HA obecných nastaveních
- Bez GPS nastavení se použije Praha jako default (50.0875°N, 14.4213°E)

---

## 🐛 Známé problémy

Žádné známé problémy v tomto release.

---

## 📚 Dokumentace

- **ČHMÚ Warnings:** [docs/CHMU_WARNINGS.md](docs/CHMU_WARNINGS.md)
- **Complete Changelog:** [CHANGELOG.md](CHANGELOG.md)
- **README:** [README.md](README.md)

---

## 🙏 Poděkování

Děkujeme všem testerům a uživatelům za zpětnou vazbu!

Speciální poděkování:
- ČHMÚ za veřejné CAP XML API
- Home Assistant community za podporu
- Všem contributors

---

## 🔗 Odkazy

- **GitHub Release:** https://github.com/psimsa/oig_cloud/releases/tag/v2.0.4
- **Issues:** https://github.com/psimsa/oig_cloud/issues
- **HACS:** https://github.com/hacs/integration

---

**Vyrobeno s ❤️ pro Home Assistant a ČEZ Battery Box komunitu**

*Pro podrobný seznam všech změn viz [CHANGELOG.md](CHANGELOG.md)*
