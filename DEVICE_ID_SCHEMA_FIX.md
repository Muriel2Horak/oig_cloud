# 🔧 OPRAVA: Device_ID Validation Schema

## ❌ Problém

**Chyba:**

```
Nepodařilo se provést akci oig_cloud.set_box_mode.
extra keys not allowed @ data['device_id']. Got None
```

**Příčina:**

- ✅ Přidal jsem `device_id` do `services.yaml`
- ❌ Zapomněl jsem přidat `device_id` do **voluptuous validation schemas** v `services.py`

---

## ✅ Řešení

### Opravené Schemas

#### 1. Shield-Protected Services (řádek 270-325)

```python
# PŘED:
schema=vol.Schema({
    vol.Required("mode"): vol.In(["Home 1", "Home 2", ...]),
    vol.Required("acknowledgement"): vol.In([True]),
})

# PO:
schema=vol.Schema({
    vol.Optional("device_id"): cv.string,  # ← PŘIDÁNO!
    vol.Required("mode"): vol.In(["Home 1", "Home 2", ...]),
    vol.Required("acknowledgement"): vol.In([True]),
})
```

**Opraveno pro všechny 4 služby:**

- ✅ `set_box_mode`
- ✅ `set_grid_delivery`
- ✅ `set_boiler_mode`
- ✅ `set_formating_mode`

---

#### 2. Fallback Services (řádek 460-505)

```python
# PŘED:
services_to_register = [
    ("set_box_mode", handle_set_box_mode, {
        vol.Required("mode"): vol.In([...]),
        vol.Required("acknowledgement"): vol.In([True]),
    }),
]

# PO:
services_to_register = [
    ("set_box_mode", handle_set_box_mode, {
        vol.Optional("device_id"): cv.string,  # ← PŘIDÁNO!
        vol.Required("mode"): vol.In([...]),
        vol.Required("acknowledgement"): vol.In([True]),
    }),
]
```

**Opraveno pro všechny 4 služby** (fallback verze bez Shield)

---

#### 3. Přidána Box_ID Extrakce do Real_Call Funkcí

```python
@callback
async def real_call_set_box_mode(...):
    # PŘIDÁNO:
    device_id: Optional[str] = service_data.get("device_id")
    box_id = get_box_id_from_device(hass, device_id, entry.entry_id)

    if not box_id:
        _LOGGER.error("Cannot determine box_id for set_box_mode")
        return

    _LOGGER.info(f"[SHIELD] Setting box mode for device {box_id} to {mode}")

    # Původní kód:
    await client.set_box_mode(mode_value)
```

**Aktualizováno pro:**

- ✅ `real_call_set_box_mode` (řádek 180)
- ✅ `real_call_set_grid_delivery` (řádek 197)
- ✅ `real_call_set_boiler_mode` (řádek 235)
- ✅ `real_call_set_formating_mode` (řádek 248)

---

## 📊 Co se změnilo celkem

### Soubory:

1. **`services.yaml`** (původní commit)

   - ✅ Přidány device selectors (4 služby)

2. **`services.py`** (tato oprava)
   - ✅ Přidán `vol.Optional("device_id"): cv.string` do 8 schemas
     - 4 shield-protected schemas
     - 4 fallback schemas
   - ✅ Přidána box_id extrakce do 4 real_call funkcí
   - ✅ Přidány debug logy s `[SHIELD]` prefix

---

## 🧪 Testování

### Zkus znovu:

**Developer Tools → Services → `oig_cloud.set_box_mode`**

```yaml
service: oig_cloud.set_box_mode
data:
  mode: Home 1
  acknowledgement: true
  # device_id: <volitelné>
```

**Očekávané výsledky:**

✅ **BEZ chyby** "extra keys not allowed"
✅ Service se zavolá
✅ V logu uvidíš jeden z:

- `"No device_id provided, using first: 2206237016"`
- `"[SHIELD] Setting box mode for device 2206237016 to Home 1"`

---

## 🎯 Příští kroky

Po ověření, že služba funguje:

1. ✅ Zkontroluj logy pro správný box_id
2. 🔄 Přidat box_id parametr do API metod
3. 🔄 Upravit ServiceShield pro multi-device support

---

**Deployment:** ✅ Hotovo (21:48)
**Status:** Ready for testing 🧪
