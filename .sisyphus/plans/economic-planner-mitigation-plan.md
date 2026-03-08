# Plán Mitigace - Ekonomický Plánovač Baterie

## Přehled

**Cíl:** Opravit všechny kritické, vysoké a střední problémy nalezené při code review
**Priorita:** Bezpečnost > Funkčnost > Kvalita kódu > Optimalizace
**Časová osa:** 1-2 dny práce (v závislosti na komplexitě)

---

## Kritické Problémy (P0) - OKAMŽITĚ

### Task P0.1: ~~Opravit Mode Priority Conflict~~ [NEEXISTUJÍCÍ BUG]
**Status:** ✅ **ODSTRANĚNO** - Kód je již správný

**Verifikace:** V aktuálním kódu je podmínka:
```python
if mode == CBBMode.HOME_I.value and inputs.solar_forecast[i] > 0.0:
```
Tato podmínka zajišťuje, že HOME_UPS (mode=3) není přepsán HOME_III (mode=2), protože 3 != 0.

**Závislost:** N/A

---

### Task P0.2: Opravit Negative Interval Index
**Soubor:** `custom_components/oig_cloud/battery_forecast/economic_planner.py`  
**Řádek:** 86  
**Priorita:** 🔴 P0 - CRITICAL  
**Odhadovaný čas:** 10 minut

**Problém:**
```python
must_start_charging = interval - intervals_needed  # Může být záporné!
```

**Řešení:**
```python
must_start_charging = max(0, interval - intervals_needed)
```

**Akceptační kritéria:**
- [ ] Test s velkým deficitem (intervals_needed > interval)
- [ ] Ověření, že must_start_charging nikdy není záporné
- [ ] Test ověřující správné chování při záporném výpočtu

**Závislost:** Žádná

---

### Task P0.3: Přidat Logování do Exception Handleru
**Soubor:** `custom_components/oig_cloud/battery_forecast/economic_planner.py`  
**Řádek:** 392  
**Priorita:** 🔴 P0 - HIGH  
**Odhadovaný čas:** 10 minut

**Problém:**
```python
except Exception:
    # Spolkne VŠECHNY chyby bez logování!
    pass
```

**Řešení:**
```python
except Exception as e:
    _LOGGER.error("Economic planning failed: %s", e, exc_info=True)
    # Fallback to safe mode
```

**Akceptační kritéria:**
- [ ] Přidat import logging na začátek souboru
- [ ] Vytvořit _LOGGER = logging.getLogger(__name__)
- [ ] Test ověřující, že chyby jsou logovány

**Závislost:** Žádná

---

## Vysoké Problémy (P1) - DO KONCE TÝDNE

### Task P1.1: Doplnit Input Validaci
**Soubor:** `custom_components/oig_cloud/battery_forecast/economic_planner_types.py`  
**Priorita:** 🟠 P1 - HIGH  
**Odhadovaný čas:** 45 minut

**Chybějící validace:**
- [ ] `current_soc_kwh` > 0 a <= `max_capacity_kwh`
- [ ] `max_capacity_kwh` > 0
- [ ] `charge_rate_kw` > 0
- [ ] `planning_min_percent` <= 100
- [ ] Negativní hodnoty v `prices`, `solar_forecast`, `load_forecast`
- [ ] Délky seznamů se shodují

**Implementace:**
```python
def __post_init__(self) -> None:
    # Stávající validace
    if self.planning_min_kwh < self.hw_min_kwh:
        raise ValueError("Planning min < HW min")
    
    # Nová validace
    if self.current_soc_kwh <= 0:
        raise ValueError("Current SOC must be positive")
    
    if self.current_soc_kwh > self.max_capacity_kwh:
        raise ValueError("Current SOC exceeds capacity")
    
    if self.max_capacity_kwh <= 0:
        raise ValueError("Max capacity must be positive")
    
    if self.charge_rate_kw <= 0:
        raise ValueError("Charge rate must be positive")
    
    if self.planning_min_percent > 100:
        raise ValueError("Planning min percent cannot exceed 100")
    
    # Kontrola délek
    n = len(self.intervals)
    if len(self.prices) != n or len(self.solar_forecast) != n or len(self.load_forecast) != n:
        raise ValueError("Forecast lengths must match intervals count")
    
    # Poznámka: Záporné ceny jsou povoleny (OTE trh má záporné ceny)
    # https://www.ote-cr.cz/cs/kratkodobe-trhy/energeticky-trh/denni-zaznamy-cenove-vyrovnani
    
    # Kontrola negativních hodnot pouze pro forecasty (fyzikálně nemožné)
    if any(s < 0 for s in self.solar_forecast):
        raise ValueError("Solar forecast cannot be negative")
    if any(l < 0 for l in self.load_forecast):
        raise ValueError("Load forecast cannot be negative")
```

**Akceptační kritéria:**
- [ ] Unit testy pro každou validaci
- [ ] Testy pro edge cases (hranice hodnot)
- [ ] Všechny testy procházejí

**Závislost:** Žádná

---

### Task P1.2: Opravit False Async Funkci
**Soubor:** `custom_components/oig_cloud/battery_forecast/economic_planner_integration.py`  
**Řádky:** 31-110  
**Priorita:** 🟠 P1 - HIGH  
**Odhadovaný čas:** 30 minut

**Problém:**
```python
async def load_planner_inputs(...) -> PlannerInputs:
    # ŽÁDNÉ await! Volá synchronní hass.states.get()
```

**Řešení A (Odstranit async):**
```python
def load_planner_inputs(...) -> PlannerInputs:
    # Odstranit async keyword
```

**Řešení B (Udělat skutečně async):**
```python
async def load_planner_inputs(...) -> PlannerInputs:
    soc_state = await hass.async_add_executor_job(
        hass.states.get, soc_sensor
    )
    # ... ostatní volání podobně
```

**Doporučení:** Řešení A (jednodušší, stačí pro tento use case)

**Akceptační kritéria:**
- [ ] Funkce buď sync nebo skutečně async
- [ ] Žádné warningy o "coroutine was never awaited"
- [ ] Test ověřující správné chování

**Závislost:** Žádná

---

## Střední Problémy (P2) - DO KONCE MĚSÍCE

### Task P2.1: Implementovat Reálné Forecasty
**Soubor:** `custom_components/oig_cloud/battery_forecast/economic_planner_integration.py`  
**Řádky:** 96-98  
**Priorita:** 🟡 P2 - MEDIUM  
**Odhadovaný čas:** 2-4 hodiny (vyžaduje integraci)

**Problém:**
```python
solar_forecast = [0.0] * 96  # TODO: Fetch from forecast sensor
load_forecast = [0.5] * 96   # TODO: Calculate from history
prices = [5.0] * 96          # TODO: Fetch from OTE API
```

**Implementace:**
```python
# Solar forecast - z Solcast nebo podobného sensoru
solar_entity = f"sensor.solcast_forecast_{box_id}"
solar_state = hass.states.get(solar_entity)
if solar_state and solar_state.state not in ("unknown", "unavailable"):
    solar_forecast = parse_forecast(solar_state.state)
else:
    # Fallback na historii nebo konstantu
    solar_forecast = [0.0] * 96
    _LOGGER.warning("Solar forecast unavailable, using default")

# Load forecast - výpočet z historie
load_forecast = await calculate_load_forecast(hass, box_id)

# Prices - z OTE API nebo spotového sensoru
prices_entity = f"sensor.ote_spot_prices_{box_id}"
prices_state = hass.states.get(prices_entity)
if prices_state:
    prices = parse_prices(prices_state.state)
else:
    prices = [5.0] * 96  # Default
```

**Akceptační kritéria:**
- [ ] Načítání z reálných senzorů
- [ ] Fallback při nedostupnosti
- [ ] Logování pro debugging
- [ ] Konfigurovatelné entity IDs

**Závislost:** Task P1.2 (oprava async)

---

### Task P2.2: Refaktorovat Duplicitní Simulaci
**Soubor:** `custom_components/oig_cloud/battery_forecast/economic_planner.py`  
**Priorita:** 🟡 P2 - MEDIUM  
**Odhadovaný čas:** 1 hodina

**Problém:** Simulace HOME_I je duplikována ve 4 funkcích

**Řešení:** Extrahovat do `_simulate_interval()` helperu
```python
def _simulate_interval(
    soc: float,
    solar: float,
    load: float,
    price: float,
    inputs: PlannerInputs,
    mode: int = CBBMode.HOME_I.value
) -> tuple[float, float, float, float]:
    """Simulate one interval and return (new_soc, grid_import, grid_export, cost)."""
    # Shared logic here
    return new_soc, grid_import, grid_export, cost
```

**Akceptační kritéria:**
- [ ] Refaktorované všechny 4 funkce
- [ ] Žádná změna ve funkčnosti (regresní testy)
- [ ] Lepší čitelnost kódu

**Závislost:** Doporučeno po Task P0.x (kritické bugy opraveny)

---

## Minor Problémy (P3) - NÍZKÁ PRIORITA

### Task P3.1: Odstranit Mrtvý Kód
**Soubor:** `custom_components/oig_cloud/__init__.py`  
**Řádky:** 1350-1358  
**Priorita:** 🟢 P3 - LOW  
**Odhadovaný čas:** 5 minut

**Akce:**
```bash
# Odstranit zakomentovaný kód:
# async def _setup_telemetry(...):
#     ...
```

**Závislost:** Žádná

---

### Task P3.2: Zlepšit Type Safety
**Soubor:** `custom_components/oig_cloud/battery_forecast/economic_planner_types.py`  
**Priorita:** 🟢 P3 - LOW  
**Odhadovaný čas:** 30 minut

**Změny:**
```python
# Místo:
IntervalData = Dict[str, Any]

# Použít:
class IntervalData(TypedDict):
    index: int
    # případně další pole

# Místo:
mode: int

# Použít:
mode: CBBMode
```

**Závislost:** Žádná

---

### Task P3.3: Standardizovat Komentáře
**Soubory:** Všechny Python soubory  
**Priorita:** 🟢 P3 - LOW  
**Odhadovaný čas:** 15 minut

**Akce:** Přeložit české komentáře do angličtiny (nebo odstranit)

**Závislost:** Žádná

---

## Testovací Plán

### Nové Testy (vyžadováno)

1. **Test Mode Priority**
```python
def test_home_ups_not_overwritten_by_home_iii():
    # Scénář: CHARGE_CHEAPEST v intervalu s solar > 0
    # Očekávání: HOME_UPS zůstane (není přepsán HOME_III)
```

2. **Test Negative Interval Index**
```python
def test_must_start_charging_never_negative():
    # Velký deficit, malý charge rate
    # Očekávání: must_start_charging >= 0
```

3. **Test Input Validation**
```python
def test_planner_inputs_validates_negative_soc():
    # current_soc_kwh = -1
    # Očekávání: ValueError

def test_planner_inputs_validates_exceeds_capacity():
    # current_soc_kwh > max_capacity_kwh
    # Očekávání: ValueError
```

4. **Test Exception Logging**
```python
def test_planning_errors_are_logged(caplog):
    # Simulace chyby
    # Očekávání: Error message v logu
```

---

## Časová Osa

### Den 1 (Kritické)
- [ ] 08:00-08:30 - Task P0.1: Mode priority fix
- [ ] 08:30-09:00 - Task P0.2: Negative interval fix
- [ ] 09:00-09:30 - Task P0.3: Exception logging
- [ ] 09:30-10:00 - Spuštění testů, ověření
- [ ] 10:00-12:00 - Task P1.1: Input validation
- [ ] 12:00-12:30 - Task P1.2: False async fix

### Den 2 (Vysoké + Střední)
- [ ] 08:00-12:00 - Task P2.1: Real forecasts (integrace)
- [ ] 13:00-15:00 - Task P2.2: Refactoring
- [ ] 15:00-16:00 - P3 tasks (cleanup)

### Den 3 (Testování)
- [ ] Nové testy
- [ ] Regresní testy
- [ ] Dokumentace změn

---

## Úspěšné Dokončení

### Definition of Done
- [ ] Všechny P0 úkoly dokončeny
- [ ] Všechny P1 úkoly dokončeny
- [ ] Minimálně 80% P2 úkolů dokončeno
- [ ] Všechny testy procházejí (45+)
- [ ] Code review nových změn
- [ ] Dokumentace aktualizována

### Metriky
| Kategorie | Před | Po | Cíl |
|-----------|------|-----|-----|
| Critical Bugs | 3 | 0 | 0 |
| High Issues | 2 | 0 | 0 |
| Medium Issues | 2 | 0-1 | ≤1 |
| Test Coverage | 45/45 | 50+/45 | 100% |
| Code Quality | 72/100 | 90+/100 | ≥85 |
