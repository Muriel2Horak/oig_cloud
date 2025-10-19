# 🔧 Shield Mapping Fix - Oprava mapování služeb na senzory

## 📋 Problém

Shield nefungoval správně pro `set_grid_delivery` a `set_boiler_mode` kvůli **nesouladu mezi hodnotami služeb a senzorů**.

### Zjištěné problémy:

1. **Grid Delivery Mode - "nebo" hack**
   ```python
   # ŠPATNĚ (service_shield.py):
   mode_mapping = {
       "Zapnuto / On": "Zapnuto nebo Omezeno",  # ❌ HACK!
   }
   ```

2. **Boiler Mode - EN vs CS**
   ```python
   # Služba: "Manual" (anglicky)
   # Senzor: "Manuální" (česky)
   # Shield: Neporovnával správně!
   ```

3. **Senzory VŽDY vrací česky**
   ```python
   # oig_cloud_data_sensor.py:
   return self._grid_mode(pv_data, raw_value, "cs")  # ← Hardcoded!
   ```

## ✅ Řešení

### 1. **Přesné mapování služba → senzor**

```python
# service_shield.py - extract_expected_entities()

# Grid Delivery Mode:
mode_mapping = {
    "Vypnuto / Off": "Vypnuto",      # ✅ Přesná shoda
    "Zapnuto / On": "Zapnuto",        # ✅ Přesná shoda (NE "nebo"!)
    "S omezením / Limited": "Omezeno" # ✅ Přesná shoda
}

# Boiler Mode:
boiler_mode_mapping = {
    "CBB": "CBB",           # Stejné
    "Manual": "Manuální"    # ✅ Překlad EN → CS
}
```

### 2. **Strukturovaný targets output**

Shield nyní poskytuje **strukturovaná data** pro Frontend:

```python
# running_requests a queued_requests obsahují:
{
    "service": "set_grid_delivery",
    "description": "set_grid_delivery: Vypnuto",  # Pro parsing
    "targets": [  # ← NOVÉ!
        {
            "param": "mode",           # Typ parametru
            "value": "Vypnuto",        # Cílová hodnota (vždy česky)
            "entity_id": "sensor.oig_xxxxx_invertor_prms_to_grid",
            "from": "Zapnuto",         # Původní hodnota
            "to": "Vypnuto",           # Cílová hodnota
            "current": "Zapnuto"       # Aktuální stav
        }
    ],
    "changes": [...]  # Legacy - zachováno pro kompatibilitu
}
```

### 3. **Backend VŽDY používá české hodnoty**

- Služby přijímají `"Vypnuto / Off"` (backward compatible)
- Shield je **přeloží** na `"Vypnuto"` (hodnota ze senzoru)
- Porovnání: `"Vypnuto"` vs `"Vypnuto"` ✅

### 4. **Frontend může mapovat jak chce**

```javascript
// Dashboard může zobrazovat česky/anglicky
const GRID_MODE_MAP = {
    "Vypnuto": { label_en: "Off", label_cs: "Vypnuto" },
    "Zapnuto": { label_en: "On", label_cs: "Zapnuto" },
    "Omezeno": { label_en: "Limited", label_cs: "Omezeno" }
};

// Použití:
request.targets.forEach(target => {
    if (target.param === 'mode') {
        const label = GRID_MODE_MAP[target.value].label_cs;
        updateButton(label);
    }
});
```

## 🎯 Výhody

1. ✅ **Backward compatible** - Služby stále přijímají `"Vypnuto / Off"`
2. ✅ **Backend konzistentní** - Vždy pracuje s českými hodnotami
3. ✅ **Shield funguje** - Porovnává přesné hodnoty
4. ✅ **Frontend flexibilní** - Může zobrazovat jakkoliv
5. ✅ **Strukturovaná data** - Snazší parsing pro Frontend

## 📊 Mapování služeb

### Grid Delivery Mode

| Služba (input) | Shield (expected) | Senzor (current) | Status |
|----------------|-------------------|------------------|--------|
| `"Vypnuto / Off"` | `"Vypnuto"` | `"Vypnuto"` | ✅ Funguje |
| `"Zapnuto / On"` | `"Zapnuto"` | `"Zapnuto"` | ✅ Funguje |
| `"S omezením / Limited"` | `"Omezeno"` | `"Omezeno"` | ✅ Funguje |

### Boiler Mode

| Služba (input) | Shield (expected) | Senzor (current) | Status |
|----------------|-------------------|------------------|--------|
| `"CBB"` | `"CBB"` | `"CBB"` | ✅ Funguje |
| `"Manual"` | `"Manuální"` | `"Manuální"` | ✅ Funguje |

### Box Mode

| Služba (input) | Shield (expected) | Senzor (current) | Status |
|----------------|-------------------|------------------|--------|
| `"Home 1"` až `"Home 6"` | `"Home X"` | `"Home X"` | ✅ Funguje |

## 🔬 Testování

1. **Změna Grid Delivery Mode:**
   ```yaml
   service: oig_cloud.set_grid_delivery
   data:
     mode: "Vypnuto / Off"
   ```
   - ✅ Shield detekuje změnu
   - ✅ Frontend zamkne tlačítko
   - ✅ Logbook zobrazí záznam

2. **Změna Boiler Mode:**
   ```yaml
   service: oig_cloud.set_boiler_mode
   data:
     mode: "Manual"
   ```
   - ✅ Shield přeloží na `"Manuální"`
   - ✅ Porovná s `"Manuální"` ze senzoru
   - ✅ Funguje správně

## 📝 Změněné soubory

1. `service_shield.py`
   - Opraveno mapování pro `set_grid_delivery` (mode)
   - Opraveno mapování pro `set_boiler_mode`
   - Přidána helper funkce `_extract_param_type()`

2. `oig_cloud_shield_sensor.py`
   - Implementován strukturovaný `targets` output
   - Zachována zpětná kompatibilita (`changes`, `description`)
   - Přidána helper funkce `_extract_param_type()`

## 🚀 Nasazení

- ✅ Backward compatible - žádné breaking changes
- ✅ Automatizace fungují dál
- ✅ Frontend může postupně přejít na `targets` API
