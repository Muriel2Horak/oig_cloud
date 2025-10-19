# Home Assistant Multi-Device Architecture - Důkladná Analýza

## 🎯 ZÁKLADNÍ FAKTA (ověřené z kódu)

### Home Assistant Architektura

**1 ConfigEntry = 1 Integrace Instance = 1 Účet/Připojení**

```
ConfigEntry (OIG Cloud účet)
    └─ async_setup_entry() běží JEDNOU
        ├─ Coordinator (sdílený pro všechna zařízení)
        ├─ API Client (sdílený)
        └─ async_forward_entry_setups(entry, ["sensor"])
            └─ sensor.py::async_setup_entry() běží JEDNOU
                └─ Vytvoří senzory pro VŠECHNA zařízení
```

**Device** = Fyzické zařízení v rámci ConfigEntry

- Identifikováno pomocí `DeviceInfo` s `identifiers`
- Home Assistant automaticky seskupuje entity podle `device_info`
- Entity s STEJNÝM `identifier` = STEJNÉ Device

---

## 📋 CO JSEM ZJISTIL Z KÓDU

### 1. Coordinator má data VŠECH zařízení

**`oig_cloud_coordinator.py`:**

```python
# Data struktura:
{
    "2206237016": {  # První CBB
        "actual": {...},
        "box_prms": {...},
        ...
    },
    "2209234094": {  # Druhý CBB
        "actual": {...},
        "box_prms": {...},
        ...
    }
}
```

✅ **SPRÁVNĚ** - coordinator správně drží data obou zařízení

---

### 2. Sensor Setup běží JEDNOU pro ConfigEntry

**`sensor.py::async_setup_entry()`:**

```python
async def async_setup_entry(
    hass: HomeAssistant,
    config_entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback
) -> None:
    """Set up OIG Cloud sensors from a config entry."""

    coordinator = hass.data[DOMAIN][config_entry.entry_id]["coordinator"]

    # 1. Basic sensors - NEITERUJE přes box_id!
    basic_sensors: List[Any] = []
    for sensor_type, config in data_sensors.items():
        sensor = OigCloudDataSensor(coordinator, sensor_type)  # ❌ Bez box_id!
        basic_sensors.append(sensor)

    async_add_entities(basic_sensors, True)

    # 2. Computed sensors - NEITERUJE!
    # 3. Extended sensors - NEITERUJE!
    # ... atd pro všech 9 kategorií
```

❌ **PROBLÉM** - Setup NEITERUJE přes `coordinator.data.keys()`

---

### 3. Senzory si berou první box_id

**`oig_cloud_data_sensor.py::__init__()`:**

```python
def __init__(
    self,
    coordinator: Any,
    sensor_type: str,
    extended: bool = False,
    notification: bool = False,
) -> None:
    """Initialize the sensor."""
    super().__init__(coordinator)

    # Entity ID - KLÍČOVÉ: Tady se vytváří entity ID z sensor_type!
    if coordinator.data:
        self._box_id = list(coordinator.data.keys())[0]  # ❌ VŽDY PRVNÍ!
        self.entity_id = f"sensor.oig_{self._box_id}_{sensor_type}"
```

**`oig_cloud_data_sensor.py::device_info`:**

```python
@property
def device_info(self) -> Any:
    """Return device info."""
    if not self.coordinator.data:
        return None

    data = self.coordinator.data
    box_id = list(data.keys())[0]  # ❌ OPĚT PRVNÍ!

    return DeviceInfo(
        identifiers={(DOMAIN, box_id)},  # ❌ Vždy stejný box_id!
        name=f"{DEFAULT_NAME} {box_id}",
        manufacturer="OIG",
        model=DEFAULT_NAME,
    )
```

❌ **KRITICKÝ PROBLÉM:**

- Každý senzor používá `list(...)[0]` → vždy "2206237016"
- `device_info` vrací vždy stejný `identifier`
- **Všechny senzory patří k JEDNOMU Device**

---

## 🔍 JAK TO HOME ASSISTANT VYHODNOCUJE

### Device Registry Logic

Home Assistant seskupuje entity podle `DeviceInfo.identifiers`:

```python
# Sensor 1:
DeviceInfo(identifiers={(DOMAIN, "2206237016")})

# Sensor 2:
DeviceInfo(identifiers={(DOMAIN, "2206237016")})  # Stejný ID!

# → HA je přiřadí k JEDNOMU Device
```

**Současný stav:**

```
Device "2206237016":
    ├─ sensor.oig_2206237016_battery_soc
    ├─ sensor.oig_2206237016_power
    ├─ sensor.oig_2206237016_grid_mode
    └─ ... (všechny senzory)

Device "2209234094":
    └─ (PRÁZDNÉ - žádné senzory!)
```

---

## ❓ TVOJE OTÁZKA: Má každé zařízení svoje senzory?

### ✅ Z UI (Screenshot):

- Vidíš 2 zařízení v HA
- Každé má "91 entit"

### ❌ Z KÓDU (Reality):

- Setup NEITERUJE přes zařízení
- Všechny senzory mají `box_id = list(...)[0]`
- Všechny senzory patří k prvnímu Device

### 🤔 JAK TO MŮŽE BÝT?

**Hypotéza 1: Možná máš 2 ConfigEntries?**

```bash
# Zkontroluj v HA:
# Settings → Devices & Services → OIG Cloud
# Kolik máš "instances" OIG Cloud integrace?
```

Pokud máš:

- ✅ **2 instances** = 2 ConfigEntries → každý pro jedno zařízení → FUNGUJE ale NENÍ optimální
- ❌ **1 instance** = 1 ConfigEntry → druhé zařízení nemá senzory → NEFUNGUJE

**Hypotéza 2: Možná HA vytváří Devices automaticky z API?**

- Ale v kódu to nevidím - senzory explicitně nastavují `device_info`

---

## 🧪 EXPERIMENTÁLNÍ OVĚŘENÍ

### Test 1: Kolik máš ConfigEntries?

```python
# V HA Developer Tools → Template:
{{ integration_entities('oig_cloud') | count }}

# Pokud > 182 (91 × 2), máš pravděpodobně 2 ConfigEntries
```

### Test 2: Zkontroluj entity_id

```python
# V HA Developer Tools → Template:
{{ states.sensor | selectattr('entity_id', 'search', 'oig_2209234094') | list | count }}

# Pokud > 0, tak druhé zařízení MÁ senzory
# Pokud = 0, tak druhé zařízení NEMÁ senzory
```

### Test 3: Zkontroluj device_info

```yaml
# V HA Developer Tools → States → vyber sensor.oig_2209234094_battery_soc
# Podívej se na attributes:
device_id: <device_id>
# Pak v Settings → Devices & Services → najdi to Device
# Má senzory?
```

---

## 🎯 MŮJ ZÁVĚR (Na základě kódu)

### Pokud máš 1 ConfigEntry (správný způsob):

**Status:** ❌ NEFUNGUJE pro více zařízení

**Důvod:**

1. `sensor.py` NEITERUJE přes `coordinator.data.keys()`
2. Senzory používají `list(...)[0]` → vždy první box
3. Všechny senzory mají stejný `device_info.identifiers`
4. HA je přiřadí k JEDNOMU Device

**Řešení:**

```python
# V sensor.py
for box_id in coordinator.data.keys():  # ✅ ITERUJ
    for sensor_type in SENSOR_TYPES:
        sensor = OigCloudDataSensor(coordinator, sensor_type, box_id)
        sensors.append(sensor)
```

### Pokud máš 2 ConfigEntries (workaround):

**Status:** ✅ FUNGUJE ale není optimální

**Důvod:**

- Každý ConfigEntry → vlastní coordinator → vlastní senzory
- Ale musíš se přihlásit 2× se stejným účtem
- Není to podle HA best practices

**Doporučení:**

- Sjednotit na 1 ConfigEntry
- Opravit setup aby iteroval přes zařízení

---

## 📝 ACTION ITEMS PRO TEBE

**Prosím ověř:**

1. **Kolik máš OIG Cloud "instances" v HA?**

   - Settings → Devices & Services → OIG Cloud
   - 1 instance nebo 2?

2. **Zkus najít senzor pro druhé zařízení:**

   - `sensor.oig_2209234094_battery_soc`
   - Existuje v States?

3. **Zkontroluj Device:**
   - Settings → Devices & Services → ČEZ Battery Box 2209234094
   - Má entit nebo je prázdný?

**Po ověření ti řeknu:**

- Jestli to funguje "náhodou" (2 ConfigEntries)
- Nebo jestli opravdu nefunguje (1 ConfigEntry)
- A jak to správně opravit

---

## 📚 OFICIÁLNÍ HA DOKUMENTACE

**Best Practices pro více zařízení:**

1. **1 ConfigEntry = 1 účet/připojení**

   - Neměl bys vytvářet nový ConfigEntry pro každé fyzické zařízení
   - ConfigEntry představuje "connection" k službě

2. **Device = fyzické zařízení**

   - Identifikováno pomocí `DeviceInfo.identifiers`
   - Entity se seskupují automaticky podle identifiers

3. **Setup musí vytvořit entity pro VŠECHNA zařízení**
   ```python
   async def async_setup_entry(...):
       # Iteruj přes všechna zařízení v koordinátoru
       for device_id in coordinator.data.keys():
           # Vytvoř senzory pro každé zařízení
   ```

**Reference:**

- [Device Registry](https://developers.home-assistant.io/docs/device_registry_index)
- [Entity Registry](https://developers.home-assistant.io/docs/entity_registry_index)
- [Config Entries](https://developers.home-assistant.io/docs/config_entries_index)

---

Až mi potvrdíš kolik máš instances, můžeme pokračovat s přesným řešením! 🚀
