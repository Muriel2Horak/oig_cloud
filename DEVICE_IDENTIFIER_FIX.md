# 🔧 OPRAVA: Device Identifier Parsing

## ❌ Problém z Logu

**Zavolaná služba:**

```yaml
service: oig_cloud.set_box_mode
data:
  acknowledgement: true
  mode: Home 1
  device_id: 6481c59cfdb4218ae3a0e55a92a3bdf0
```

**Chyba v logu (21:49:21):**

```
WARNING [custom_components.oig_cloud.services]
box_id 2209234094 from device not found in coordinator data

WARNING [custom_components.oig_cloud.services]
Could not extract box_id from device 6481c59cfdb4218ae3a0e55a92a3bdf0
```

---

## 🔍 Root Cause Analýza

### Device Identifiers v HA

Home Assistant má **3 různá zařízení** pro každý ČEZ Battery Box:

1. **Hlavní zařízení** (91 entit)

   - Identifier: `("oig_cloud", "2209234094")`

2. **ServiceShield** (3 entity)

   - Identifier: `("oig_cloud", "2209234094_shield")`

3. **Analytics & Predictions** (65-69 entit)
   - Identifier: `("oig_cloud", "2209234094_analytics")`

### Coordinator.Data Struktura

```python
coordinator.data = {
    "2206237016": { "actual": {...}, "box_prms": {...} },  # Box 1
    "2209234094": { "actual": {...}, "box_prms": {...} },  # Box 2
}
```

**Klíče jsou POUZE box_id**, BEZ suffixů!

---

## ❌ Původní Kód (CHYBNÝ)

```python
def get_box_id_from_device(...):
    for identifier in device.identifiers:
        if identifier[0] == DOMAIN:
            box_id = identifier[1]  # ← PROBLÉM!

            # Pokud device je Shield nebo Analytics:
            # box_id = "2209234094_shield" nebo "2209234094_analytics"

            if coordinator.data and box_id in coordinator.data:
                # ❌ NIKDY neprojde pro Shield/Analytics!
                # coordinator.data má pouze "2209234094", ne "2209234094_shield"
                return box_id

            _LOGGER.warning(f"box_id {box_id} not found in coordinator data")
```

**Výsledek:**

- ✅ Hlavní zařízení (ID: `2206237016`) → **funguje**
- ❌ Shield (ID: `2206237016_shield`) → **nefunguje**
- ❌ Analytics (ID: `2206237016_analytics`) → **nefunguje**

---

## ✅ Opravený Kód

```python
def get_box_id_from_device(...):
    for identifier in device.identifiers:
        if identifier[0] == DOMAIN:
            identifier_value = identifier[1]

            # KLÍČOVÁ OPRAVA: Odstraň suffix _shield nebo _analytics
            box_id = identifier_value.replace("_shield", "").replace("_analytics", "")

            # Teď máme čistý box_id bez suffixů
            # "2209234094_shield" → "2209234094"
            # "2209234094_analytics" → "2209234094"
            # "2209234094" → "2209234094"

            if coordinator.data and box_id in coordinator.data:
                _LOGGER.debug(
                    f"Found box_id {box_id} from device {device_id} "
                    f"(identifier: {identifier_value})"
                )
                return box_id
            else:
                _LOGGER.warning(
                    f"box_id {box_id} from device not found in coordinator data. "
                    f"Available: {list(coordinator.data.keys())}"
                )
```

**Výsledek:**

- ✅ Hlavní zařízení (`2206237016`) → `box_id = "2206237016"`
- ✅ Shield (`2206237016_shield`) → `box_id = "2206237016"` (odstraněn suffix)
- ✅ Analytics (`2206237016_analytics`) → `box_id = "2206237016"` (odstraněn suffix)

---

## 🧪 Test Scenarios

### Test 1: Zavolat službu z Hlavního zařízení

**Device_ID:** ČEZ Battery Box Home 2209234094
**Identifier:** `("oig_cloud", "2209234094")`

**Očekávaný výsledek:**

```
DEBUG: Found box_id 2209234094 from device <ID> (identifier: 2209234094)
INFO: [SHIELD] Setting box mode for device 2209234094 to Home 1
```

---

### Test 2: Zavolat službu ze ServiceShield

**Device_ID:** ServiceShield 2209234094
**Identifier:** `("oig_cloud", "2209234094_shield")`

**Očekávaný výsledek:**

```
DEBUG: Found box_id 2209234094 from device <ID> (identifier: 2209234094_shield)
INFO: [SHIELD] Setting box mode for device 2209234094 to Home 1
```

---

### Test 3: Zavolat službu z Analytics & Predictions

**Device_ID:** Analytics & Predictions 2209234094
**Identifier:** `("oig_cloud", "2209234094_analytics")`

**Očekávaný výsledek:**

```
DEBUG: Found box_id 2209234094 from device <ID> (identifier: 2209234094_analytics)
INFO: [SHIELD] Setting box mode for device 2209234094 to Home 1
```

---

## 📊 Debugging Info

### Zjistit Device Identifiers

**Developer Tools → States → sensor.oig_2209234094_soc**

```json
{
  "device_id": "6481c59cfdb4218ae3a0e55a92a3bdf0",
  "device_info": {
    "identifiers": [["oig_cloud", "2209234094"]],
    "manufacturer": "OIG",
    "model": "ČEZ Battery Box Home"
  }
}
```

### Zjistit Coordinator.Data Keys

**Check logs při startu:**

```
DEBUG [custom_components.oig_cloud.sensor]
Setting up sensors with coordinator data: 6 devices
```

**Poznámka:** "6 devices" znamená 6 klíčů v nějaké struktuře, ne nutně v `coordinator.data`.

---

## 🎯 Next Steps - Prosím otestuj

1. **Zavolej službu znovu se STEJNÝM device_id:**

   ```yaml
   service: oig_cloud.set_box_mode
   data:
     acknowledgement: true
     mode: Home 1
     device_id: 6481c59cfdb4218ae3a0e55a92a3bdf0
   ```

2. **Zkontroluj logy - měl bys vidět:**

   ```
   DEBUG: Found box_id 2209234094 from device 6481c59c... (identifier: 2209234094_shield)
   INFO: [SHIELD] Setting box mode for device 2209234094 to Home 1
   ```

3. **Zkus zavolat z JINÉHO zařízení** (Analytics nebo hlavní zařízení)

4. **Reportni výsledky!** 😊

---

**Deployment:** ✅ Hotovo (21:55)
**Status:** Ready for final testing 🧪
