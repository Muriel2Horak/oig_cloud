# 🔧 Balancing Execution Debug - 9.11.2025 10:17

## 🎯 Cíl této iterace
Opravit problém kdy `check_balancing()` nikdy nevykonává - periodic task registrován, ale metoda se nevolá.

## ✅ Co bylo provedeno

### 1. Přidáno logování pro debugging
**Soubor**: `custom_components/oig_cloud/balancing/core.py`

```python
async def check_balancing(self) -> Optional[BalancingPlan]:
    _LOGGER.info("🔍 check_balancing() CALLED")  # ← NOVÝ LOG

    if not self._forecast_sensor:
        _LOGGER.warning("Forecast sensor not set, cannot check balancing")
        return None

    days_since_last = self._get_days_since_last_balancing()
    _LOGGER.info(f"📊 Balancing check: {days_since_last:.1f} days since last")  # ← ZMĚNĚNO z DEBUG na INFO

    # 1. Natural balancing
    _LOGGER.debug("Checking Natural balancing...")  # ← NOVÝ LOG
    natural_plan = await self._check_natural_balancing()
    # ... atd

    # Na konci:
    _LOGGER.info(f"No balancing needed yet ({days_since_last:.1f} days)")  # ← NOVÝ LOG
    return None
```

**Přidáno logování do `_check_natural_balancing()`:**
```python
async def _check_natural_balancing(self) -> Optional[BalancingPlan]:
    _LOGGER.debug("_check_natural_balancing: Getting HYBRID timeline...")
    timeline = self._get_hybrid_timeline()
    if not timeline:
        _LOGGER.warning("No HYBRID timeline available for natural balancing check")
        return None

    _LOGGER.debug(f"Timeline has {len(timeline)} intervals")

    battery_capacity_kwh = await self._get_battery_capacity_kwh()
    if not battery_capacity_kwh:
        _LOGGER.warning("Battery capacity not available")
        return None

    _LOGGER.debug(f"Battery capacity: {battery_capacity_kwh:.2f} kWh")
    # ... atd
```

### 2. Opraveno spuštění initial check
**Soubor**: `custom_components/oig_cloud/__init__.py`

**Problém**: `async_track_time_interval` volá callback až **PO** intervalu, ne hned při startu.

**Řešení**: Přidán `async_call_later` pro jednorázové spuštění za 2 minuty:

```python
# Periodické volání každých 30 min
async def update_balancing(_now: Any) -> None:
    """Periodická kontrola balancingu."""
    try:
        _LOGGER.debug("⏰ Periodic balancing check triggered")  # ← NOVÝ LOG
        await balancing_manager.check_balancing()
    except Exception as e:
        _LOGGER.error(f"Error checking balancing: {e}", exc_info=True)

entry.async_on_unload(
    async_track_time_interval(
        hass, update_balancing, timedelta(minutes=30)
    )
)

# První kontrola za 2 minuty (aby forecast měl čas se inicializovat)
async def initial_balancing_check(_now: Any) -> None:
    """Počáteční kontrola balancingu po startu."""
    try:
        _LOGGER.info("🔍 Initial balancing check after startup")  # ← NOVÝ LOG
        result = await balancing_manager.check_balancing()
        if result:
            _LOGGER.info(f"✅ Initial check created plan: {result.mode.name}")
        else:
            _LOGGER.debug("Initial check: no plan needed yet")
    except Exception as e:
        _LOGGER.error(f"Error in initial balancing check: {e}", exc_info=True)

# První kontrola za 2 minuty
async_call_later(hass, 120, initial_balancing_check)  # ← NOVÝ KÓD
```

## ❌ Co NEFUNGUJE

### Hlavní problém: Balancing Manager se VŮBEC neinicializuje

**Evidence:**
1. ✅ **Restart proběhl**: 09:48:30 (deploy script)
2. ✅ **HA naběhl**: Logy běží od 09:48, systém funguje
3. ✅ **Integration běží**: Forecast senzory fungují, coordinator běží
4. ❌ **Balancing Manager**: **ŽÁDNÉ LOGY** - ani "Initializing Balancing Manager", ani "Balancing Manager successfully initialized"

**Vyhledané logy (--since 30m):**
```bash
# ❌ ŽÁDNÝ z těchto logů neexistuje:
grep "Balancing Manager"           # 0 výsledků
grep "Initial balancing"           # 0 výsledků
grep "check_balancing CALLED"      # 0 výsledků
grep "⏰ Periodic balancing"        # 0 výsledků
```

**Co SE objevuje:**
- ✅ Forecast senzory běží (SOLAR LOOKUP logy každou minutu)
- ✅ Coordinator updaty probíhají
- ✅ Analytics senzory se počítají
- ❌ **Balancing Manager vůbec neexistuje v runtime**

### Možné příčiny

#### 1. Balancing disabled v konfiguraci?
```python
# __init__.py line 773:
if entry.options.get("balancing_enabled", True):  # ← default=True
```
Možnost: Config má `balancing_enabled: False`

#### 2. Exception při inicializaci?
Chybí error log protože try/except to mlčky spolkne:
```python
try:
    balancing_manager = BalancingManager(hass, box_id, storage_path)
    await balancing_manager.async_setup()
except Exception as e:
    _LOGGER.error(f"Failed to initialize Balancing Manager: {e}", exc_info=True)
    balancing_manager = None  # ← Mlčky selže
```

#### 3. Kód se nikdy nevykoná?
`async_setup_entry` možná failuje dřív než dojde k balancing inicializaci?

#### 4. Importy selhaly?
```python
from .balancing import BalancingManager  # line 28
```
Pokud import selhal, celý __init__.py možná nejede?

## 🔍 Diagnostika k provedení

### 1. Zkontrolovat config
```bash
ssh ha "cat /config/.storage/core.config_entries | jq '.data.entries[] | select(.domain==\"oig_cloud\") | .options'"
```

### 2. Najít async_setup_entry log
```bash
ssh ha "docker logs homeassistant --since 30m 2>&1 | grep -E '(Setup of domain oig_cloud|async_setup_entry)' | head -5"
```

### 3. Hledat ERROR při inicializaci
```bash
ssh ha "docker logs homeassistant --since 30m 2>&1 | grep -i error | grep -i oig | head -10"
```

### 4. Zkontrolovat že __init__.py je správně nasazený
```bash
ssh ha "docker exec homeassistant grep -n 'Initializing Balancing Manager' /config/custom_components/oig_cloud/__init__.py"
```

## 📝 Změněné soubory

1. **`custom_components/oig_cloud/__init__.py`**
   - Přidán `async_call_later` pro initial check za 2 min
   - Přidáno logování do periodic task
   - Import `async_call_later` z `homeassistant.helpers.event`

2. **`custom_components/oig_cloud/balancing/core.py`**
   - Přidán INFO log na začátek `check_balancing()`
   - Přidáno DEBUG logování do Natural balancing
   - Přidán INFO log když není potřeba balancing
   - Změněn log "Balancing check: X days" z DEBUG na INFO

## 🎯 Další kroky

1. **Zjistit proč se Balancing Manager neinicializuje**
   - Zkontrolovat config
   - Najít error logy
   - Ověřit že kód je nasazený

2. **Až pojede inicializace:**
   - Testovat initial check (za 2 min po restartu)
   - Testovat periodic check (každých 30 min)
   - Zkontrolovat že Natural/Opportunistic/Forced logika běží

3. **TODO 6: Vytvořit balancing sensor**
   - Až bude manager fungovat, přidat sensor pro FE

## 📊 Stav systému (10:17)

- ✅ HA běží: 09:48 restart, nyní 10:17 (29 minut)
- ✅ Forecast běží: SOLAR LOOKUP logy každou minutu
- ✅ Coordinator běží: update cycle každých 5 min
- ❌ **Balancing Manager: NEEXISTUJE**
- ❌ FE balancer tile: PRÁZDNÁ (žádná data)
