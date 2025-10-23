# 📋 Sensor Registry Refactor - Summary

**Větev:** `feature/sensor-registry-refactor`  
**Datum:** 23. října 2025  
**Status:** ✅ Návrh schválen, ready to implement

---

## 🎯 Co bylo dohodnuto

### ✅ ANO - Co děláme

1. **Sjednocení cleanup logiky**
   - 3 stávající funkce → 1 univerzální
   - `_cleanup_all_orphaned_entities()` v sensor.py

2. **Explicitní mapování zařízení**
   - Přidat `device_mapping` do všech SENSOR_TYPES
   - 3 typy: `main`, `analytics`, `shield`

3. **Lepší dokumentace**
   - sensors/README.md s mapováním
   - Jasná vazba modul → senzory → zařízení

4. **Vše v sensor.py**
   - Žádné nové soubory
   - Pouze pomocné funkce

### ❌ NE - Co NEDĚLÁME

1. **Žádné změny entity_id**
   - 100% zachování (běží 3 roky v produkci!)
   - Data a dashboardy nesmí zmizet

2. **Žádný separátní soubor**
   - Ne sensor_registry.py
   - Ne device_info_factory.py
   - Vše zůstává v sensor.py

3. **Žádné breaking changes**
   - Device identifiers zachovány
   - API senzorů zachováno

4. **Plugin architektura**
   - Vysvětlena jako future možnost
   - Teď neimplementujeme

---

## 📁 Vytvořené dokumenty

1. **SENSOR_REFACTOR_IMPLEMENTATION_PLAN.md** (hlavní)
   - Detailní návrh implementace
   - Code examples
   - Mapování zařízení
   - Fáze 1-5

2. **SENSOR_REFACTOR_QUICKSTART.md**
   - Quick start pro development
   - Checklist pro každou fázi
   - Validační skripty
   - Status tracking

3. **SENSOR_REGISTRATION_REFACTOR_ANALYSIS.md**
   - Původní kompletní analýza
   - Současný stav
   - Všechny kategorie senzorů
   - 100% lokalizace audit

4. **SENSOR_REFACTOR_SUMMARY.md**
   - Executive summary
   - Problémy a řešení
   - Otázky k diskuzi

---

## 🔑 Klíčové principy

### 1. Zero Breaking Changes
```python
# PŘED refaktorem
entity_id = f"sensor.oig_{box_id}_{sensor_type}"

# PO refaktoru
entity_id = f"sensor.oig_{box_id}_{sensor_type}"  # STEJNÉ!
```

### 2. Device Mapping
```python
# Nová definice v SENSOR_TYPES
{
    "name_cs": "...",
    "device_mapping": "main",  # nebo "analytics" nebo "shield"
}

# Použití
device_info = get_device_info_for_sensor(sensor_type, box_id, config)
```

### 3. Unified Cleanup
```python
# PŘED (3 funkce)
await _cleanup_empty_devices(hass, entry)
await _cleanup_orphaned_devices(hass, entry, coordinator)
await _cleanup_old_battery_prediction_sensors(hass, entry)

# PO (1 funkce)
await _cleanup_all_orphaned_entities(
    hass, entry, coordinator, expected_sensor_types
)
```

---

## 📅 Timeline

| Fáze | Trvání | Popis |
|------|--------|-------|
| Fáze 1 | 2 dny | Cleanup refaktor |
| Fáze 2 | 2 dny | Device mapping |
| Fáze 3 | 2 dny | Setup refaktor |
| Fáze 4 | 2-3 dny | Testování |
| Fáze 5 | ongoing | Produkční test (Martin) |

**Celkem:** 8-11 pracovních dní

---

## 🏗️ Struktura změn

```
custom_components/oig_cloud/
├── sensor.py                           # UPRAVENO
│   ├── _cleanup_all_orphaned_entities()   # NOVÉ
│   ├── _get_expected_sensor_types()       # NOVÉ
│   ├── get_device_info_for_sensor()       # NOVÉ
│   └── async_setup_entry()                # UPRAVENO (cleanup na začátku)
│
├── sensors/                            # UPRAVENO
│   ├── SENSOR_TYPES_ACTUAL.py         # + device_mapping
│   ├── SENSOR_TYPES_BATT.py           # + device_mapping
│   ├── ... (všech 17 souborů)         # + device_mapping
│   └── README.md                       # NOVÉ (dokumentace)
│
└── docs/                               # NOVÉ
    ├── SENSOR_REFACTOR_IMPLEMENTATION_PLAN.md
    ├── SENSOR_REFACTOR_QUICKSTART.md
    ├── SENSOR_REGISTRATION_REFACTOR_ANALYSIS.md
    └── SENSOR_REFACTOR_SUMMARY.md
```

---

## 🧪 Testing strategy

### Unit tests
- `test_cleanup_functions()`
- `test_get_expected_sensor_types()`
- `test_get_device_info_for_sensor()`
- `test_device_mapping()`

### Integration tests
- `test_full_setup_cycle()`
- `test_entity_id_preservation()`
- `test_orphaned_entity_cleanup()`
- `test_device_assignment()`

### Production test
- Deploy do Martinovy instalace
- Monitor 1 týden
- Validace entity_id
- Validace cleanup

---

## 🔄 Merge strategy

```bash
# Development
feature/sensor-registry-refactor (tady jsme)
    ↓ implementace + testy
    ↓
    ✅ Vše OK?
    ↓
temp ← merge
    ↓
main ← merge

# Rollback plán
❌ Něco se pokazilo?
    ↓
temp (stabilní verze)
    ↓
git tag v1.x.x
git branch -D feature/sensor-registry-refactor
```

---

## 📊 Metriky úspěchu

### Must have ✅
- [ ] Entity IDs zachovány 100%
- [ ] Cleanup funguje pro všechny typy osiřelých entit
- [ ] Device mapping správně
- [ ] Žádné regrese v funkcionalitě

### Nice to have 🎁
- [ ] Snížení kódu v sensor.py >30%
- [ ] Startup time stejný nebo rychlejší
- [ ] Dokumentace kompletní
- [ ] 90%+ test coverage

---

## 🚀 Next steps

1. **TERAZ:** Začít s Fází 1 (Cleanup refaktor)
   ```bash
   git checkout feature/sensor-registry-refactor
   # Implementovat _cleanup_all_orphaned_entities()
   ```

2. **PO Fázi 1:** Code review + test
3. **PO Fázi 2:** Device mapping validace
4. **PO Fázi 3:** Integration test
5. **PO Fázi 4:** Deploy do produkce (Martin)

---

## 📞 Kontakt

**Implementace:** AI Assistant  
**Testing:** Martin Horák  
**Dokumentace:** docs/SENSOR_REFACTOR_*.md

**Při problémech:**
1. Check docs/SENSOR_REFACTOR_QUICKSTART.md
2. Check implementační plán
3. Rollback plan připraven

---

## ✅ Sign-off

**Návrh schválen:** ✅ Martin Horák  
**Implementace může začít:** ✅ ANO  
**Datum:** 23. října 2025

**Kritické požadavky potvrzeny:**
- ✅ 100% zachování entity_id
- ✅ Vše v sensor.py
- ✅ Sjednocení cleanup
- ✅ Device mapping
- ✅ Testing na produkci (Martin)

---

**Současný stav větví:**

```
main
  └── temp (stabilní)
        └── feature/sensor-registry-refactor (tady pracujeme) ⭐
```

**Ready to code! 🚀**
