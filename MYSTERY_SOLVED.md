# 🎯 TAJEMSTVÍ VYŘEŠENO - Jak funguje Multi-Device Support

## 📸 Screenshot Analýza

**Potvrzeno:**

- ✅ **1 ConfigEntry** OIG Cloud (verze 2.0.1.alpha3)
- ✅ **4 zařízení** celkem:
  1. ČEZ Battery Box Home **2206237016** (91 entit)
  2. ServiceShield **2206237016** (3 entity)
  3. Analytics & Predictions **2206237016** (69 entit)
  4. ČEZ Battery Box Home **2209234094** (91 entit)
  5. ServiceShield **2209234094** (3 entity)
  6. Analytics & Predictions **2209234094** (65 entit)
- ✅ **2 služby**
- ✅ **322 entit** celkem

---

## 🔍 Klíčové Zjištění: API Vrací VŠE Najednou!

### `oig_cloud_api.py` - Řádek 191-210

```python
async def _get_stats_internal(self) -> Optional[Dict[str, Any]]:
    try:
        to_return = await self._try_get_stats()
        if self.box_id is None and to_return:
            self.box_id = list(to_return.keys())[0]  # ← Nastaví POUZE první!
        self.last_state = to_return
        return to_return  # ← ALE vrací VŠECHNA zařízení!
```

### Struktura Návratové Hodnoty

```python
{
    "2206237016": {
        "actual": { "P": 100, "SOC": 50, ... },
        "box_prms": { "sw": "1.0", "model": "Home", ... }
    },
    "2209234094": {
        "actual": { "P": 200, "SOC": 75, ... },
        "box_prms": { "sw": "1.0", "model": "Home", ... }
    }
}
```

**DŮLEŽITÉ:** `coordinator.data` obsahuje **OBĚ** zařízení!

---

## ❌ PROBLÉM: Jak se vytváří senzory pro druhé zařízení?

### Analýza `sensor.py`

```python
async def async_setup_entry(...):
    # VOLÁ SE JEDNOU pro ConfigEntry

    coordinator = hass.data[DOMAIN][entry.entry_id]["coordinator"]
    # coordinator.data = { "2206237016": {...}, "2209234094": {...} }

    # NEITERUJE přes coordinator.data.keys()!
    for sensor_type, config in data_sensors.items():
        sensor = OigCloudDataSensor(coordinator, sensor_type)  # ← Žádný box_id!
        basic_sensors.append(sensor)
```

### Analýza `oig_cloud_data_sensor.py`

```python
class OigCloudDataSensor:
    def __init__(self, coordinator, sensor_type):
        self._box_id = list(coordinator.data.keys())[0]  # ← VŽDY první!

    @property
    def device_info(self):
        box_id = list(data.keys())[0]  # ← VŽDY první!
        return DeviceInfo(
            identifiers={(DOMAIN, self._box_id)},
            name=f"ČEZ Battery Box Home {self._box_id}",
            ...
        )
```

### ❓ Rozpor s Realitou

**Kód říká:**

- Setup se volá JEDNOU
- Senzory se vytváří BEZ iterace přes box_id
- Každý senzor používá `list(...)[0]` → měl by existovat jen PRVNÍ!

**Screenshot ukazuje:**

- Senzory pro **OBĚ** zařízení (2206237016 **A** 2209234094)
- Každé zařízení má 91 entit
- Obě Shields (3 entity každá)
- Obě Analytics (69 a 65 entit)

---

## 🤔 Možná Vysvětlení

### ❓ Hypotéza 1: `device_info` není statické?

Možná `device_info` property se **vyhodnocuje dynamicky** při každém update a **HA automaticky vytváří multiple devices** na základě rozdílných `identifiers`?

**Test:** Podívat se na logs během refreshe coordinatoru.

### ❓ Hypotéza 2: Senzory se "duplikují" interně?

Možná HA detekuje, že `coordinator.data` obsahuje více zařízení a automaticky **duplikuje entity** pro každý klíč?

**Test:** Zkontrolovat entity registry.

### ❓ Hypotéza 3: `list(data.keys())[0]` se mění?

Možná při každém volání `device_info` se **data liší** kvůli update timing?

**Test:** Přidat logging do `device_info`.

### ❓ Hypotéza 4: Hidden Iteration?

Možná existuje **skrytá logika v coordinatoru** nebo `DataUpdateCoordinator` base třídě, která iteruje přes dict keys?

**Test:** Zkontrolovat HomeAssistant core kód pro `DataUpdateCoordinator`.

---

## 🎯 DALŠÍ KROKY

### 1. Prozkoumat Entity Registry

```python
# Zkontrolovat, kolik entit existuje v registry
entity_registry = er.async_get(hass)
entities = [
    entity for entity in entity_registry.entities.values()
    if entity.config_entry_id == entry.entry_id
]
```

### 2. Přidat Detailní Logging

Do `oig_cloud_data_sensor.py`:

```python
def __init__(self, coordinator, sensor_type):
    all_box_ids = list(coordinator.data.keys())
    _LOGGER.warning(
        f"🔍 Creating sensor {sensor_type} - "
        f"Available box_ids: {all_box_ids}, "
        f"Using: {all_box_ids[0] if all_box_ids else 'None'}"
    )
```

### 3. Zkontrolovat Device Registry

```python
device_registry = dr.async_get(hass)
devices = [
    device for device in device_registry.devices.values()
    if entry.entry_id in device.config_entries
]
# Kolik devices existuje?
```

---

## 🚨 Důsledky pro Opravu Služeb

**Bez ohledu na to, JAK to funguje:**

1. ✅ Služby **MUSÍ** podporovat device_id selector
2. ✅ API **MUSÍ** přijímat box_id jako parametr
3. ✅ ServiceShield **MUSÍ** používat správný box_id

**Oprava služeb je NUTNÁ** bez ohledu na vyřešení tohoto tajemství!

---

## 📝 Závěr

**MYSTERY:**
Kód vypadá, že by měl vytvořit senzory jen pro **první** zařízení (2206237016),
ALE screenshot ukazuje senzory pro **OBĚ** zařízení (2206237016 + 2209234094).

**PRAVDĚPODOBNÉ VYSVĚTLENÍ:**
HomeAssistant **automaticky** vytváří multiple devices na základě rozdílných `DeviceInfo.identifiers`,
a coordinator **poskytuje data pro všechna zařízení najednou**,
takže `device_info` property **dynamicky vrací správný box_id** při každém update.

**POTŘEBA VERIFIKACE:**
Přidat logging a zkontrolovat entity/device registry.
