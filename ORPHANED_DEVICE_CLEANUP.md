# 🧹 Automatické Čištění Osiřelých Zařízení

## 🎯 Problém

Když odstraníš ČEZ Battery Box z účtu OIG Cloud, zařízení a jeho entity **zůstanou** v Home Assistant:
- ❌ Device v Settings → Devices & Services
- ❌ Entity v States
- ❌ Cards v Dashboardech

**Důvod:** Home Assistant nemá jak vědět, že zařízení už neexistuje - integrace to musí detekovat a vyčistit.

---

## ✅ Řešení - Automatické Čištění

### Nová Funkce: `_cleanup_orphaned_devices()`

**Přidáno do:** `sensor.py` (řádek ~701)

**Volá se:** Při každém restartu nebo reload integrace (v `async_setup_entry`)

---

## 🔍 Jak to Funguje

### 1. Detekce Osiřelých Zařízení

```python
# Získej aktuální seznam box_id z coordinator.data
current_box_ids = set(coordinator.data.keys())
# Např: {"2206237016", "2209234094"}

# Projdi všechna zařízení v HA
for device in devices:
    # Extrahuj box_id z device identifiers
    device_box_id = extract_box_id(device)
    
    # Je tento box_id stále v coordinator.data?
    if device_box_id not in current_box_ids:
        # ❌ NE → Zařízení už neexistuje → SMAZAT!
```

### 2. Odstranění Zařízení a Entit

```python
# Nejprve smažeme všechny entity
entities = er.async_entries_for_device(entity_reg, device.id)
for entity in entities:
    entity_reg.async_remove(entity.entity_id)

# Pak smažeme samotné zařízení
device_reg.async_remove_device(device.id)
```

---

## 📋 Postup Čištění

### Automatické (po deployment)

1. **Restart HA nebo Reload integrace**
   - Settings → Devices & Services → OIG Cloud → ⋮ → Reload

2. **Funkce se spustí automaticky:**
   ```
   INFO: Starting cleanup of orphaned devices (removed Battery Boxes)
   DEBUG: Current box_ids in coordinator.data: {'2206237016'}
   WARNING: Device ServiceShield 2209234094 (box_id: 2209234094) no longer exists - removing
   INFO: Successfully removed orphaned device: ServiceShield 2209234094
   ```

3. **Výsledek:**
   - ✅ Zařízení odstraněno z Settings → Devices
   - ✅ Entity odstraněny z States
   - ⚠️ Dashboard cards **zůstanou** (musíš smazat ručně)

---

### Manuální (kdykoliv)

**Settings → Devices & Services → OIG Cloud**

1. Najdi zařízení, které už neexistuje
2. Klikni na něj
3. ⋮ (tři tečky) → **Delete Device**
4. Potvrď

---

## 🧪 Testování

### Test Scenario 1: Odebrání Zařízení

1. **Před:** Máš 2 Battery Boxy (2206237016, 2209234094)
2. **Akce:** Odstraníš jeden z OIG Cloud účtu
3. **Po Reload:**
   ```
   INFO: Orphaned device cleanup completed: removed 3 devices
   ```
   (3 = Hlavní zařízení + Shield + Analytics)

### Test Scenario 2: Přidání Zařízení Zpět

1. **Přidáš Battery Box zpět** do OIG Cloud účtu
2. **Reload integrace**
3. **Výsledek:**
   - ✅ Vytvoří se nové zařízení
   - ✅ Vytvoří se všechny entity
   - ⚠️ Dashboard **NEOBNOVÍ** karty (musíš přidat ručně)

---

## 📊 Logging

### Debug Messages

```bash
# V Developer Tools → Logs nebo logs HA
DEBUG: Current box_ids in coordinator.data: {'2206237016', '2209234094'}
DEBUG: Device ČEZ Battery Box Home 2206237016 (box_id: 2206237016) still exists - keeping
DEBUG: Device ServiceShield 2206237016 (box_id: 2206237016) still exists - keeping
```

### Warning Messages (při odstranění)

```bash
WARNING: Device ČEZ Battery Box Home 2209234094 (box_id: 2209234094) no longer exists - removing
WARNING: Device ServiceShield 2209234094 (box_id: 2209234094) no longer exists - removing
WARNING: Device Analytics & Predictions 2209234094 (box_id: 2209234094) no longer exists - removing
```

### Success Messages

```bash
INFO: Successfully removed orphaned device: ČEZ Battery Box Home 2209234094 (box_id: 2209234094)
INFO: Orphaned device cleanup completed: removed 3 devices
```

---

## 🔧 Implementační Detaily

### Extrakce Box_ID z Device

```python
for identifier in device.identifiers:
    if identifier[0] == DOMAIN:
        identifier_value = identifier[1]
        # Odstraň suffix _shield nebo _analytics
        device_box_id = identifier_value.replace("_shield", "").replace("_analytics", "")
        break

# Příklady:
# "2206237016" → "2206237016"
# "2206237016_shield" → "2206237016"
# "2206237016_analytics" → "2206237016"
```

### Porovnání s Coordinator.Data

```python
# coordinator.data = {
#     "2206237016": { "actual": {...}, "box_prms": {...} },
#     "2209234094": { "actual": {...}, "box_prms": {...} }
# }

current_box_ids = set(coordinator.data.keys())
# → {"2206237016", "2209234094"}

if device_box_id not in current_box_ids:
    # Zařízení už neexistuje v API → odstranit
```

---

## ⚠️ Důležité Poznámky

### Dashboard Cards Nezmizel

**Dashboardy se NEČISTÍ automaticky!**

Důvod: HA neví, které karty patří kterému zařízení.

**Řešení:**
1. Otevři Dashboard
2. Edit Mode
3. Ručně smaž karty pro odstraněné zařízení

---

### Reload vs Restart

**Reload integrace** (rychlejší):
- Settings → Devices & Services → OIG Cloud → ⋮ → Reload

**Restart HA** (pomalejší, ale jistější):
- Settings → System → Restart

Obě varianty spustí cleanup.

---

### Kdy se Cleanup Spouští

1. ✅ Při **prvním** setupu integrace
2. ✅ Při každém **reload** integrace
3. ✅ Při každém **restartu** HA
4. ❌ **NE** při běžném update coordinatoru (každých 30s)

---

## 🎯 Výhody Automatického Čištění

1. **Žádné mrtvé entity** - automaticky se čistí
2. **Žádná duplikace** - při přidání zařízení zpět se vytvoří nové
3. **Čistý device registry** - pouze aktivní zařízení
4. **Méně manuální práce** - nemusíš mazat ručně

---

## 🚀 Použití

### Scenario: Prodal jsi Battery Box

1. Odstraníš zařízení z OIG Cloud účtu
2. V HA: Settings → Devices & Services → OIG Cloud → Reload
3. **Automaticky se vyčistí:**
   - Device "ČEZ Battery Box Home XXXXX"
   - Device "ServiceShield XXXXX"
   - Device "Analytics & Predictions XXXXX"
   - Všechny jejich entity

4. **Ručně smažeš:**
   - Dashboard cards pro toto zařízení

---

**Deployment:** ✅ Hotovo (22:05)  
**Status:** Automatické čištění aktivní 🧹
