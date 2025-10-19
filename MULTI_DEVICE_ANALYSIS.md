# Analýza podpory více zařízení ČEZ Battery Box

## Executive Summary

**Stav:** Integrace NENÍ připravena pro více než jedno zařízení ČEZ Battery Box
**Dopad:** KRITICKÝ - služby nefungují správně, senzory používají pouze první box
**Náročnost opravy:** STŘEDNÍ až VYSOKÁ - vyžaduje změny v 15+ souborech

---

## 🔴 HLAVNÍ PROBLÉMY

### ⚠️ DŮLEŽITÉ: Home Assistant architektura

**Home Assistant používá JEDEN ConfigEntry = JEDNO zařízení (účet)**

Podle HA guidelines:

- **ConfigEntry** = jeden uživatelský účet / jedno fyzické připojení
- **Device** = jedno fyzické zařízení v rámci ConfigEntry
- Více zařízení pod jedním účtem = více Devices, NE více ConfigEntries

**Naše situace:**

- ✅ **SPRÁVNĚ:** 1 ConfigEntry = 1 účet OIG Cloud (může mít více Battery Boxů)
- ✅ **SPRÁVNĚ:** `coordinator.data` obsahuje VŠECHNA zařízení jako `{box_id: data}`
- ❌ **PROBLÉM:** Služby a API volání nejsou navrženy pro více Devices

**Důsledek:**

- Dashboard a senzory SE NAČÍTAJÍ SPRÁVNĚ pro všechna zařízení
- Senzory se vytváří v `sensor.py::async_setup_entry()` který běží JEDNOU pro celý ConfigEntry
- Každé zařízení má své vlastní Device v HA s vlastními senzory
- **ALE služby nemají device selector → nelze vybrat cílové zařízení**

---

### 1. API klient drží pouze jedno `box_id`

**Soubor:** `lib/oig_cloud_client/api/oig_cloud_api.py`

```python
self.box_id: Optional[str] = None  # ❌ PROBLÉM: Pouze jedno box_id
```

**Dopad:**

- API metody jako `set_grid_delivery()`, `set_formating_mode()` používají `self.box_id`
- Při více zařízeních se vždy použije první načtené box_id
- **Služby se aplikují pouze na první zařízení, i když má uživatel více boxů**

**Řešení:**

- Změnit API metody, aby přijímaly `box_id` jako parametr
- Odstranit `self.box_id` z API clienta
- Přidat `box_id` jako povinný parametr všech API volání

---

### 2. Senzory MAY použít první `box_id` (ale setup iteruje správně)

### 2. Senzory MAY použít první `box_id` (ale setup iteruje správně)

**DŮLEŽITÉ ZJIŠTĚNÍ:**

- `sensor.py::async_setup_entry()` se volá **JEDNOU** pro celý ConfigEntry
- Obsahuje 9 kategorií senzorů (data, computed, extended, statistics, shield, atd.)
- **Setup NEITERUJE přes `box_id`** - vytváří senzory globálně pro ConfigEntry

**Problematické soubory:**

1. **`oig_cloud_sensor.py`** (řádek 73, 107, 133, 153)

   ```python
   self._box_id: str = list(coordinator.data.keys())[0]  # ❌ Vždy první!
   box_id = list(self.coordinator.data.keys())[0]
   ```

2. **`oig_cloud_computed_sensor.py`** (řádek 28)

   ```python
   self._box_id = list(coordinator.data.keys())[0]  # ❌ Vždy první!
   ```

3. **`oig_cloud_shield_sensor.py`** (řádek 91, 437, 446)

   ```python
   self._box_id: str = list(coordinator.data.keys())[0]  # ❌ Vždy první!
   box_id = list(self.coordinator.data.keys())[0]
   ```

4. **`oig_cloud_data_sensor.py`** (řádek 76, 95, 175)

   ```python
   self._box_id = list(coordinator.data.keys())[0]  # ❌ Vždy první!
   ```

5. **`binary_sensor.py`** (řádek 27, 42, 51, 54)

   ```python
   self._box_id = list(self.coordinator.data.keys())[0]  # ❌ Vždy první!
   ```

6. **`spot_price_sensor.py`** (řádek 326, 718, 914, 1129, 1137)
   ```python
   box_id = list(self.coordinator.data.keys())[0]  # ❌ Vždy první!
   ```

**Aktuální stav:**

- ❌ Senzory se NEVYTVÁŘÍ pro každé zařízení
- ❌ Setup běží JEDNOU, vytvoří senzory s `list(...)[0]`
- ❌ Druhé a další zařízení NEMAJÍ senzory

**Dopad:**

- Všechny senzory zobrazují data pouze prvního boxu
- Druhé a další zařízení nemají žádné senzory
- Uživatel nevidí stav dalších Battery Boxů

**Řešení:**

```python
# V sensor.py - PŘED vytvořením senzorů
async def async_setup_entry(...):
    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]

    # ✅ OPRAVA: Iterovat přes všechna zařízení
    all_sensors = []
    for box_id in coordinator.data.keys():
        # Pro každé zařízení vytvořit sadu senzorů
        for sensor_type in SENSOR_TYPES:
            sensor = OigCloudSensor(coordinator, sensor_type, box_id)
            all_sensors.append(sensor)

    async_add_entities(all_sensors, True)
```

---

### 3. Služby nepodporují výběr zařízení

**Soubor:** `services.yaml`

```yaml
set_box_mode:
  name: Set BatteryBox Mode
  fields:
    mode:
      description: The mode to set
      # ❌ CHYBÍ: Výběr zařízení (device/entity selector)
```

**Všechny služby bez device selectoru:**

- `set_box_mode`
- `set_grid_delivery`
- `set_boiler_mode`
- `set_formating_mode`

**Dopad:**

- Uživatel nemůže vybrat, na které zařízení se má služba aplikovat
- Služba se vždy volá na `entry.entry_id` → první box
- **Nelze ovládat druhé a další Battery Boxy**

**Řešení:**

- Přidat `device` nebo `entity_id` selector do všech služeb
- Z vybrané entity extrahovat správné `box_id`
- Předat `box_id` do API volání

---

### 4. Coordinator nepodporuje více zařízení správně

**Soubor:** `oig_cloud_coordinator.py`

```python
device_id = next(iter(self.data.keys()))  # ❌ Vždy první!
device_data = self.data.get(device_id, {})
```

**Dopad:**

- Notification manager dostává pouze první `device_id`
- Extended stats se načítají pouze pro první zařízení

**Řešení:**

- Iterovat přes všechna `device_id` v `self.data`
- Načíst extended stats pro každé zařízení samostatně

---

### 5. ServiceShield nezná `box_id` v službách

**Soubor:** `service_shield.py`

```python
async def intercept_service_call(...):
    # ❌ CHYBÍ: Určení box_id z entity/device
    expected_entities = self.extract_expected_entities(service_name, params)
```

**Dopad:**

- Shield neví, pro které zařízení je služba určena
- `extract_expected_entities()` hledá entity bez ohledu na box_id
- Může dojít ke kolizi mezi zařízeními

**Řešení:**

- Přidat logiku pro extrakci `box_id` z entity/device selectoru
- Filtrovat expected_entities podle `box_id`

---

## 📊 DETAILNÍ DOPAD

### Home Assistant architektura vs naše implementace

**Jak to MĚLO fungovat:**

```
1 ConfigEntry = 1 OIG Cloud účet
    ├─ Device 1 (CBB 2206237016)
    │   ├─ sensor.oig_2206237016_battery_soc
    │   ├─ sensor.oig_2206237016_power
    │   └─ ... (všechny senzory pro toto zařízení)
    │
    └─ Device 2 (CBB 2209234094)
        ├─ sensor.oig_2209234094_battery_soc
        ├─ sensor.oig_2209234094_power
        └─ ... (všechny senzory pro toto zařízení)
```

**Jak to FUNGUJE nyní:**

```
1 ConfigEntry = 1 OIG Cloud účet
    ├─ Device 1 (CBB 2206237016) ✅ Má senzory
    │   ├─ sensor.oig_2206237016_battery_soc
    │   ├─ sensor.oig_2206237016_power
    │   └─ ...
    │
    └─ Device 2 (CBB 2209234094) ❌ NEMÁ senzory!
        └─ (prázdné - žádné senzory)
```

**Proč?**

- `sensor.py::async_setup_entry()` běží **JEDNOU** pro celý ConfigEntry
- Senzory se vytváří BEZ iterace přes `coordinator.data.keys()`
- Každý senzor si sám bere `box_id = list(...)[0]`
- **Výsledek:** Všechny senzory patří k prvnímu zařízení

### Senzory bez `box_id` iterace

| Kategorie v sensor.py      | Počet typů | Iteruje přes box_id?        | Kritičnost  |
| -------------------------- | ---------- | --------------------------- | ----------- |
| Basic sensors (data)       | ~20        | ❌ NE                       | 🔴 KRITICKÁ |
| Computed sensors           | ~5         | ❌ NE                       | 🔴 KRITICKÁ |
| Extended sensors           | ~10        | ❌ NE                       | 🔴 KRITICKÁ |
| Statistics sensors         | ~8         | ❌ NE                       | 🔴 KRITICKÁ |
| Battery helper sensors     | ~5         | ❌ NE                       | 🔴 KRITICKÁ |
| Solar forecast sensors     | ~3         | ❌ NE (správně - shared)    | 🟢 OK       |
| ServiceShield sensors      | ~4         | ❌ NE (správně - per-entry) | 🟢 OK       |
| Notification sensors       | ~2         | ❌ NE                       | 🔴 KRITICKÁ |
| Battery prediction sensors | ~3         | ❌ NE                       | 🔴 KRITICKÁ |
| Pricing sensors            | ~6         | ❌ NE (správně - shared)    | � OK        |

**Kritické kategorie:** 6 z 10 (60%)
**Shared kategorie (OK):** 3 z 10 (30%)
**Per-entry kategorie (OK):** 1 z 10 (10%)

### API metody vyžadující `box_id` parametr

| Metoda                      | Aktuální implementace | Potřebná změna                |
| --------------------------- | --------------------- | ----------------------------- |
| `set_box_mode()`            | Používá `self.box_id` | Přidat parametr `box_id: str` |
| `set_grid_delivery()`       | Používá `self.box_id` | Přidat parametr `box_id: str` |
| `set_boiler_mode()`         | Používá `self.box_id` | Přidat parametr `box_id: str` |
| `set_formating_mode()`      | Používá `self.box_id` | Přidat parametr `box_id: str` |
| `set_grid_delivery_limit()` | Používá `self.box_id` | Přidat parametr `box_id: str` |

---

## 🎯 NÁVRH ŘEŠENÍ

### Fáze 1: API Client (KRITICKÁ)

**Soubor:** `lib/oig_cloud_client/api/oig_cloud_api.py`

**Změny:**

1. **Odstranit globální `box_id`:**

   ```python
   # PŘED
   self.box_id: Optional[str] = None

   # PO
   # (odstranit úplně)
   ```

2. **Přidat `box_id` do všech API metod:**

   ```python
   # PŘED
   async def set_box_mode(self, mode_value: str) -> Dict[str, Any]:
       data = {"id_device": self.box_id, ...}

   # PO
   async def set_box_mode(self, box_id: str, mode_value: str) -> Dict[str, Any]:
       data = {"id_device": box_id, ...}
   ```

3. **Aplikovat na metody:**
   - `set_box_mode(box_id, mode_value)`
   - `set_grid_delivery(box_id, delivery_mode)`
   - `set_boiler_mode(box_id, mode)`
   - `set_formating_mode(box_id, mode)`
   - `set_grid_delivery_limit(box_id, limit)`

**Dopad:** Všechny volající kód musí být aktualizován

---

### Fáze 2: Session Manager

**Soubor:** `api/oig_cloud_session_manager.py`

**Změny:**

```python
# PŘED
async def set_box_mode(self, mode_value: str) -> Dict[str, Any]:
    return await self._call_with_retry(self._api.set_box_mode, mode_value)

# PO
async def set_box_mode(self, box_id: str, mode_value: str) -> Dict[str, Any]:
    return await self._call_with_retry(self._api.set_box_mode, box_id, mode_value)
```

**Aplikovat na všechny wrapper metody**

---

### Fáze 3: Služby (KRITICKÁ)

**Soubor:** `services.yaml`

**Změny:**

```yaml
set_box_mode:
  name: Set BatteryBox Mode
  fields:
    # NOVÉ: Device selector
    device_id:
      description: Vyber zařízení ČEZ Battery Box
      required: true
      selector:
        device:
          filter:
            integration: oig_cloud
            manufacturer: OIG
    mode:
      description: The mode to set
      selector:
        select:
          options:
            - Home 1
            - Home 2
            # ...
```

**Soubor:** `services.py`

**Změny:**

```python
@callback
async def real_call_set_box_mode(
    domain: str,
    service: str,
    service_data: Dict[str, Any],
    blocking: bool,
    context: Optional[Context],
) -> None:
    # NOVÉ: Extrakce box_id z device_id
    device_id = service_data.get("device_id")
    if not device_id:
        raise vol.Invalid("Device ID je povinný")

    # Získat box_id z device registry
    dev_reg = dr.async_get(hass)
    device = dev_reg.async_get(device_id)

    # Extrahovat box_id z device identifiers
    box_id = None
    for identifier in device.identifiers:
        if identifier[0] == DOMAIN:
            box_id = identifier[1]
            break

    if not box_id:
        raise vol.Invalid(f"Nelze najít box_id pro zařízení {device_id}")

    # NOVÉ: Najít správný coordinator pro tento box_id
    coordinator = None
    for entry_id in hass.data[DOMAIN]:
        entry_coordinator = hass.data[DOMAIN][entry_id].get("coordinator")
        if entry_coordinator and box_id in entry_coordinator.data:
            coordinator = entry_coordinator
            break

    if not coordinator:
        raise vol.Invalid(f"Nelze najít coordinator pro box_id {box_id}")

    with tracer.start_as_current_span("async_set_box_mode"):
        client: OigCloudApi = coordinator.api
        mode: Optional[str] = service_data.get("mode")
        mode_value: Optional[str] = MODES.get(mode) if mode else None

        # ZMĚNA: Předat box_id do API
        await client.set_box_mode(box_id, mode_value)
```

**Aplikovat na všechny služby:**

- `set_box_mode`
- `set_grid_delivery`
- `set_boiler_mode`
- `set_formating_mode`

---

### Fáze 4: Senzory (KRITICKÁ)

**Aktuální stav v `sensor.py`:**

```python
# NYNÍ: Setup běží JEDNOU pro ConfigEntry
async def async_setup_entry(...):
    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]

    # ❌ PROBLÉM: Vytváří senzory BEZ iterace přes box_id
    basic_sensors = []
    for sensor_type in data_sensors.items():
        sensors.append(OigCloudSensor(coordinator, sensor_type))
        # Senzor si bere box_id = list(...)[0] → vždy první!
```

**Potřebná oprava:**

```python
# PO: Setup MUSÍ iterovat přes všechna zařízení
async def async_setup_entry(...):
    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]

    basic_sensors = []

    # ✅ ITERACE přes všechna zařízení
    for box_id in coordinator.data.keys():
        for sensor_type in data_sensors.items():
            # Předat box_id do konstruktoru
            sensors.append(OigCloudSensor(coordinator, sensor_type, box_id))

    async_add_entities(basic_sensors, True)
```

**Změna v sensor třídách:**

```python
# PŘED v oig_cloud_sensor.py
def __init__(self, coordinator: Any, sensor_type: str) -> None:
    self._box_id = list(coordinator.data.keys())[0]  # ❌ Tvrdě první!

# PO v oig_cloud_sensor.py
def __init__(self, coordinator: Any, sensor_type: str, box_id: str) -> None:
    self._box_id = box_id  # ✅ Přijímá jako parametr
```

**Soubory k úpravě:**

1. **`sensor.py`** - 9 kategorií senzorů

   - Pro každou kategorii přidat iteraci `for box_id in coordinator.data.keys()`
   - Předat `box_id` do konstruktorů

   Kategorie:

   - Basic sensors (data)
   - Computed sensors
   - Extended sensors
   - Statistics sensors
   - Battery helper sensors
   - Solar forecast sensors (shared napříč zařízeními)
   - ServiceShield sensors (jeden pro ConfigEntry)
   - Notification sensors
   - Battery prediction sensors
   - Pricing sensors (shared napříč zařízeními)

2. **Sensor třídy - přidat `box_id` parametr:**

   - `oig_cloud_sensor.py` → `__init__(coordinator, sensor_type, box_id)`
   - `oig_cloud_computed_sensor.py` → `__init__(coordinator, sensor_type, box_id)`
   - `oig_cloud_shield_sensor.py` → `__init__(coordinator, sensor_type, box_id)`
   - `oig_cloud_data_sensor.py` → `__init__(coordinator, sensor_type, box_id)`
   - `binary_sensor.py` → `__init__(coordinator, sensor_type, box_id)`

3. **VÝJIMKY - shared senzory (NEITEROVAT):**
   - `spot_price_sensor.py` - ceny jsou STEJNÉ pro všechna zařízení
   - `oig_cloud_solar_forecast.py` - předpověď je STEJNÁ pro všechna zařízení
   - `oig_cloud_analytics_sensor.py` - analytika může být shared
   - `oig_cloud_shield_sensor.py` - Shield je per-ConfigEntry, ne per-Device

**Pravidlo:**

- **Device-specific data** → iterovat přes `box_id` (stav baterie, výkon, režim)
- **Shared data** → NEITEROVAT (spotové ceny, předpověď počasí)

---

### Fáze 5: ServiceShield

**Soubor:** `service_shield.py`

**Změny:**

```python
def extract_expected_entities(
    self,
    service_name: str,
    params: Dict[str, Any]
) -> Dict[str, str]:
    # NOVÉ: Extrakce box_id z device_id
    device_id = params.get("device_id")
    if device_id:
        # Získat box_id z device
        dev_reg = dr.async_get(self.hass)
        device = dev_reg.async_get(device_id)
        box_id = self._extract_box_id_from_device(device)
    else:
        box_id = None  # Fallback - může být problém

    # ZMĚNA: Filtrovat entity podle box_id
    if service_name == "oig_cloud.set_box_mode":
        if box_id:
            entity_id = f"sensor.oig_{box_id}_box_mode"
        else:
            # Fallback pro zpětnou kompatibilitu
            entity_id = f"sensor.oig_cloud_box_mode"

        mode = params.get("mode")
        return {entity_id: mode}
```

---

### Fáze 6: Coordinator & Notifications

**Soubor:** `oig_cloud_coordinator.py`

**Změny:**

```python
# PŘED
device_id = next(iter(self.data.keys()))
device_data = self.data.get(device_id, {})

# PO - iterace přes všechna zařízení
for device_id, device_data in self.data.items():
    # Zpracovat extended stats pro každé zařízení
    if self.notification_manager:
        self.notification_manager.set_device_id(device_id)
        await self.notification_manager.update_from_api()
```

---

## 📋 KONTROLNÍ SEZNAM (CHECKLIST)

### Fáze 1: API & Session Manager

- [ ] Odstranit `self.box_id` z `OigCloudApi`
- [ ] Přidat `box_id` parametr do `set_box_mode()`
- [ ] Přidat `box_id` parametr do `set_grid_delivery()`
- [ ] Přidat `box_id` parametr do `set_boiler_mode()`
- [ ] Přidat `box_id` parametr do `set_formating_mode()`
- [ ] Přidat `box_id` parametr do `set_grid_delivery_limit()`
- [ ] Aktualizovat `OigCloudSessionManager` wrapper metody

### Fáze 2: Služby

- [ ] Přidat `device_id` selector do `services.yaml` (všechny služby)
- [ ] Implementovat extrakci `box_id` z `device_id` v `services.py`
- [ ] Aktualizovat `real_call_set_box_mode()`
- [ ] Aktualizovat `real_call_set_grid_delivery()`
- [ ] Aktualizovat `real_call_set_boiler_mode()`
- [ ] Aktualizovat `real_call_set_formating_mode()`
- [ ] Aktualizovat fallback metody

### Fáze 3: Senzory

- [ ] **sensor.py** - přidat iteraci přes `coordinator.data.keys()` pro:
  - [ ] Basic sensors (data category)
  - [ ] Computed sensors
  - [ ] Extended sensors (pokud enabled)
  - [ ] Statistics sensors (pokud enabled)
  - [ ] Battery helper sensors (pokud enabled)
  - [ ] Notification sensors
  - [ ] Battery prediction sensors (pokud enabled)
  - [ ] ⚠️ VÝJIMKY (NEITEROVAT):
    - [ ] Solar forecast (shared)
    - [ ] ServiceShield sensors (per-entry)
    - [ ] Pricing/Spot sensors (shared)
- [ ] Přidat `box_id` parametr do `OigCloudSensor.__init__()`
- [ ] Přidat `box_id` parametr do `OigCloudComputedSensor.__init__()`
- [ ] Přidat `box_id` parametr do `OigCloudDataSensor.__init__()`
- [ ] Aktualizovat `binary_sensor.py` (pokud je součástí integrace)
- [ ] ⚠️ NEMĚNIT: `spot_price_sensor.py` (shared data)
- [ ] ⚠️ NEMĚNIT: `oig_cloud_solar_forecast.py` (shared data)

### Fáze 4: ServiceShield

- [ ] Implementovat extrakci `box_id` z `device_id`
- [ ] Aktualizovat `extract_expected_entities()` - filtrování podle `box_id`
- [ ] Testovat queue s více zařízeními

### Fáze 5: Coordinator

- [ ] Iterace přes všechna zařízení pro extended stats
- [ ] Iterace přes všechna zařízení pro notifications
- [ ] Zajistit unikátní `device_info` pro každé zařízení

### Fáze 6: Testování

- [ ] Test: Vytvoření senzorů pro 2+ zařízení
- [ ] Test: Volání služby na první zařízení
- [ ] Test: Volání služby na druhé zařízení
- [ ] Test: ServiceShield queue s různými zařízeními
- [ ] Test: Zobrazení notifikací pro obě zařízení

---

## ⚠️ RIZIKA

### Zpětná kompatibilita

- **Problém:** Uživatelé s jedním zařízením mohou mít automatizace bez `device_id`
- **Řešení:** Přidat fallback logiku - pokud není `device_id`, použij první box

### Breaking changes v API

- **Problém:** Změna signatury API metod
- **Řešení:** Postupná migrace s deprecation warnings

### Komplexita ServiceShield

- **Problém:** Shield musí rozlišovat entity podle `box_id`
- **Řešení:** Použít regex matching na `entity_id` pro extrakci `box_id`

---

## 🚀 DOPORUČENÝ POSTUP

### Priorita 1 (Musí se udělat první):

1. API Client - přidat `box_id` parametry
2. Session Manager - aktualizovat wrapper metody
3. Služby - přidat device selector

### Priorita 2 (Poté):

4. Senzory - iterace přes zařízení
5. ServiceShield - filtrace podle `box_id`

### Priorita 3 (Nakonec):

6. Coordinator - extended stats pro všechna zařízení
7. Testování a dokumentace

---

## 📝 POZNÁMKY

- **Čas implementace:** Odhadem 8-12 hodin čisté práce
- **Testování:** Minimálně 2 fyzická zařízení ČEZ Battery Box
- **Dokumentace:** Aktualizovat README.md a services.yaml descriptions

---

## 📸 SOUČASNÝ STAV (Screenshot)

Jak vidíš na screenshotu:

- Integrace zobrazuje 2 ČEZ Battery Boxy (2206237016 a 2209234094)
- Každý má 3 entity (Home, ServiceShield, Analytics)
- ✅ Senzory se vytvářejí správně pro obě zařízení
- ❌ **ALE služby nepodporují výběr zařízení** → vždy se aplikují na první box

---

## 🎓 ZÁVĚR

Integrace **není připravena** pro více zařízení. Hlavní problémy:

### ✅ Co FUNGUJE správně:

1. **Home Assistant architektura** - používáme správně 1 ConfigEntry pro 1 účet
2. **Coordinator data** - správně obsahuje všechna zařízení jako `{box_id: data}`
3. **Device registry** - HA správně zobrazuje obě zařízení v UI (viz screenshot)

### ❌ Co NEFUNGUJE:

1. **Setup senzorů** - `sensor.py` NEITERUJE přes zařízení

   - Běží JEDNOU pro ConfigEntry
   - Vytváří senzory pouze s `list(...)[0]` → první box
   - **Druhé zařízení NEMÁ senzory**

2. **API volání** - vždy na první `box_id`

   - `OigCloudApi.box_id` je globální
   - Služby nemají device selector

3. **Služby** - bez device selectoru
   - Nelze vybrat cílové zařízení
   - Vždy se aplikují na první box

### 🎯 Kritické priority:

**Priorita 1 (KRITICKÁ - bez toho druhé zařízení nevidíme):**

1. ✅ Opravit `sensor.py` - přidat iteraci přes `coordinator.data.keys()`
2. ✅ Upravit sensor třídy - přijímat `box_id` jako parametr

**Priorita 2 (VYSOKÁ - bez toho nemůžeme ovládat):** 3. ✅ API Client - přidat `box_id` parametry 4. ✅ Služby - přidat device selector

**Priorita 3 (STŘEDNÍ):** 5. Session Manager - aktualizovat wrapper metody 6. ServiceShield - filtrace podle `box_id`

### 📸 Screenshot analýza:

- ✅ HA zobrazuje **2 zařízení** (2206237016, 2209234094)
- ✅ Každé má **3 entity kategorie** (Home, ServiceShield, Analytics)
- ❌ **ALE všechny entity patří prvnímu zařízení** (protože setup neiteruje)
- ❌ Druhé zařízení existuje v device registry, ale **nemá senzory**

Potřebuješ pomoc s implementací?
