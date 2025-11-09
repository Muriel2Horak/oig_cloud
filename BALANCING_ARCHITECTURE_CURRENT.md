# Aktuální Architektura Balancing Systému

**Datum analýzy:** 9. listopadu 2025
**Stav:** ČÁSTEČNĚ IMPLEMENTOVÁNO - NEFUNKČNÍ

---

## 🏗️ Struktura Souborů

### 1. Adresář `balancing/` (bývalý `planning/`)

```
balancing/
├── __init__.py              (12 řádků)  - Exporty modulů
├── balancing_manager.py     (491 řádků) - CORE balancing logika (BR-4)
├── integration.py           (243 řádků) - BalancingSystem wrapper třída
├── plan_manager.py          (604 řádků) - Plan lifecycle (BR-2)
├── simulation.py            (582 řádků) - Fyzikální simulace (BR-3)
└── weather_monitor.py       (382 řádků) - Weather emergencies (BR-5)
```

### 2. Root soubory

```
oig_cloud_battery_forecast.py  (14272 řádků) - HYBRID forecast + plan_balancing()
oig_cloud_battery_health.py    (893 řádků)   - Battery health monitoring
[SMAZÁN] oig_cloud_battery_balancing.py      - Simple balancing (677 řádků)
```

### 3. Integrace

```
__init__.py                     - Inicializace BalancingSystem
sensor.py                       - Registrace senzorů (ERROR - balancing sensor neexistuje)
```

---

## 🔄 Tok Dat - JAK TO FUNGUJE (mělo by)

### Inicializace při startu HA

```
1. __init__.py::async_setup_entry()
   └─> Vytvoří BalancingSystem(hass, entry, box_id, storage_path)
   └─> await balancing_system.async_setup()
       └─> Vytvoří BatterySimulation(context)
       └─> Vytvoří PlanManager(storage, simulation, box_id)
       └─> Vytvoří BalancingManager(hass, plan_manager, config)
       └─> Vytvoří WeatherMonitor(hass, plan_manager, config)
       └─> await weather_monitor.start()

2. Každých 30 minut:
   └─> await balancing_system.update_automatic_plan()
       └─> await balancing_system._check_balancing()
           ├─> await balancing_manager.check_opportunistic_balancing()
           ├─> await balancing_manager.check_economic_balancing()
           └─> await balancing_manager.check_forced_balancing()
```

### Kontrola Opportunistic Balancing (BR-4.2)

```
balancing_manager.check_opportunistic_balancing():
  1. Zjistí aktuální SOC z sensoru sensor.oig_{box_id}_batt_bat_c
  2. Pokud SOC >= 90% (config.opportunistic_threshold_soc):
     └─> Detekuje holding window:
         ├─> Vypočítá čas nabití do 100% (current_soc → 100%)
         ├─> Přidá holding_hours (3h default)
         └─> Vrátí (target_time, holding_hours)

     └─> Vytvoří balancing plán:
         plan_manager.create_balancing_plan(
           target_soc_percent=100.0,
           target_time=target_time,
           holding_hours=3,
           holding_mode="HOME_UPS",
           balancing_mode="opportunistic"
         )

     └─> Aktivuje plán:
         plan_manager.activate_plan(plan_id)
```

### Vytvoření Balancing Plánu (BR-2)

```
plan_manager.create_balancing_plan():
  1. Vytvoří nový Plan objekt s typem BALANCING
  2. Nastaví context pro simulaci:
     context = {
       "type": "balancing",
       "target_soc": 100.0,
       "target_time": target_time,
       "holding_hours": 3,
       "holding_mode": "HOME_UPS"
     }

  3. Spustí simulaci:
     └─> simulation.optimize_plan(
           timeline_length=48h,
           context=context
         )
         └─> Pro každý interval:
             ├─> select_optimal_mode(interval, context)
             │   └─> Pokud context.type=="balancing":
             │       └─> VŽDY režim HOME_III (nabíjení z FVE) nebo HOME_UPS (ze sítě)
             │
             └─> simulate_interval()
                 └─> Vypočítá SOC změny podle režimu

  4. Uloží plán do storage:
     └─> {box_id}_plan_{plan_id}.json
```

### Aktivace Plánu (BR-2.5)

```
plan_manager.activate_plan(plan_id):
  1. Načte plán ze storage
  2. Deaktivuje předchozí aktivní plán (pokud existuje)
  3. Nastaví plán jako aktivní:
     └─> self._active_plan = plan
     └─> plan.status = PlanStatus.ACTIVE
  4. Uloží změny do storage
```

---

## ❌ PROBLÉMY - CO NEFUNGUJE

### 1. **Chybějící Sensor pro GUI**

```python
# sensor.py řádek ~906
from .oig_cloud_battery_balancing import OigCloudBatteryBalancingSensor  # ERROR!
```

**Problém:** Soubor `oig_cloud_battery_balancing.py` byl **SMAZÁN**, ale sensor.py stále očekává import.

**Důsledek:** HA nemůže načíst senzory při startu → Integration FAILS.

### 2. **Plány se nevykonávají**

**Problém:** `PlanManager` vytváří a ukládá plány do JSON souborů, ale **NIKDO NEČTE** aktivní plán a **NEAPLIKUJE** ho na skutečný systém.

**Chybí:**
- Mechanismus pro čtení aktivního plánu každých 15 minut
- Propojení mezi `plan_manager.get_active_plan()` a skutečným ovládáním baterie
- Aplikace režimů z plánu (HOME_III, HOME_UPS) na fyzický systém

### 3. **Duplicitní logika**

Máme **DVĚ implementace balancingu:**

1. **Starý systém** (SMAZÁN):
   - `oig_cloud_battery_balancing.py` - simple balancing sensor
   - Volal `forecast.plan_balancing()`
   - Fungoval jako sensor v HA

2. **Nový systém** (balancing/):
   - `balancing_manager.py` - BR-4 logika
   - Vytváří `Plan` objekty
   - Ukládá do JSON storage
   - **ŽÁDNÝ sensor** pro export do HA

**Problém:** Starý smazán, nový nemá sensor → **ŽÁDNÝ balancing nefunguje**.

### 4. **plan_balancing() není volána**

```python
# oig_cloud_battery_forecast.py::plan_balancing()
async def plan_balancing(self, requested_start, requested_end, target_soc, mode):
    # TODO: IMPLEMENTOVAT FYZIKU
    # Dočasně vrací dummy data
```

**Problém:** Tato metoda existuje, ale **NIKDO JI NEVOLÁ** protože:
- Starý simple balancing sensor (který ji volal) byl smazán
- Nový BalancingManager používá vlastní `simulation.optimize_plan()` místo toho

### 5. **Wrapper bez účelu**

```python
# balancing/integration.py - BalancingSystem
class BalancingSystem:
    def __init__(self, hass, config_entry, box_id, storage_path):
        # Vytváří 4 sub-moduly
        self.simulation = BatterySimulation()
        self.plan_manager = PlanManager()
        self.balancing_manager = BalancingManager()
        self.weather_monitor = WeatherMonitor()
```

**Problém:** Wrapper jen drží reference na sub-moduly. Mohl by být nahrazen přímými funkcemi.

---

## 🔗 Spolupráce s Battery Forecast

### Původní návrh:
```
balancing_sensor → forecast.plan_balancing() → vrátí charging_intervals → balancing_sensor zobrazí v GUI
```

### Současný stav:
```
BalancingSystem → balancing_manager.check_opportunistic() → plan_manager.create_plan() → simulation.optimize_plan()
                                                           ↓
                                                    JSON storage (nikdo nečte)
                                                           ↓
                                                       KONEC (žádná akce)
```

**Co chybí:**
1. Čtení aktivního plánu z plan_manager
2. Volání `forecast.plan_balancing()` pro validaci okna
3. Aplikace režimů z plánu na systém
4. Export dat do HA senzoru pro GUI

---

## 📊 Závěr

### ✅ Co funguje:
- BalancingSystem se inicializuje při startu HA
- Periodický check každých 30 minut
- Detekce opportunistic balancing při SOC >= 90%
- Vytváření Plan objektů a ukládání do JSON

### ❌ Co NEFUNGUJE:
- **Chybí sensor** pro GUI (smazán oig_cloud_battery_balancing.py)
- **Plány se neaplikují** (nikdo nečte aktivní plán)
- **forecast.plan_balancing() není volána** (disconnected)
- **Žádná fyzická akce** (režimy se nenastavují)
- **Duplikace kódu** (simulation.py vs forecast HYBRID)

### 🎯 Potřebný refactoring:

**Varianta A - Minimální oprava:**
1. Obnovit `oig_cloud_battery_balancing.py` jako tenký wrapper
2. Wrapper volá `balancing_manager.check_*()` místo vlastní logiky
3. Wrapper exportuje data do HA jako sensor

**Varianta B - Kompletní refactoring:**
1. Smazat `integration.py` wrapper
2. Přejmenovat `balancing_manager.py` → `core.py`
3. Vytvořit `balancing/sensor.py` - HA sensor
4. `__init__.py` exportuje funkce místo tříd
5. sensor.py volá funkce z core.py
6. Integrace přímo v async_setup_entry bez wrapperu

**Varianta C - Sjednocení:**
1. Přesunout BR-4 logiku přímo do `oig_cloud_battery_forecast.py`
2. Smazat balancing/ adresář (simulation.py duplikuje forecast)
3. Jeden soubor = jedna odpovědnost
4. Sensor volá forecast metody

---

## 🔧 Doporučení

**STOP** dalším změnám. Nejprve rozhodnout:
1. Jaká varianta refactoringu?
2. Jaký je cílový stav architektury?
3. Postupný plán implementace (krok po kroku)
4. Testování každého kroku před pokračováním

**Nesmíme:**
- Dělat další změny bez plánu
- Látat wrapper na wrapper
- Vytvářet nové moduly bez smazání starých
- Pokračovat bez funkčního testu
