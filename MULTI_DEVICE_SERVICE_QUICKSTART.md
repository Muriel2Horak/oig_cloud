# 🎯 Multi-Device Service Support - Quick Start

## ✅ Co bylo změněno

**Verze:** 2.0.1.alpha3
**Datum:** 19. října 2025

### Přidané Funkce

1. **Volitelný `device_id` selector** ve všech službách:

   - `set_box_mode`
   - `set_grid_delivery`
   - `set_boiler_mode`
   - `set_formating_mode`

2. **Automatická detekce počtu zařízení:**

   - **1 zařízení** → `device_id` není povinný, použije se automaticky
   - **2+ zařízení** → `device_id` můžeš zadat pro výběr konkrétního zařízení

3. **Fallback logika:**
   - Pokud `device_id` nezadáš → použije se **první dostupné** zařízení
   - Pokud `device_id` zadáš → použije se **konkrétní** zařízení

---

## 🧪 Testování - Krok za Krokem

### 1. Ověř, že deployment proběhl

```bash
# V HA logu by mělo být:
# "Registering fallback services for entry <entry_id>"
```

**Zkontroluj:** Settings → System → Logs → hledej "oig_cloud"

---

### 2. Otevři Developer Tools → Services

**Cesta:** Developer Tools → Services → vyhledej "OIG Cloud"

---

### 3. Test #1: Zavolej službu BEZ device_id

**Služba:** `oig_cloud.set_box_mode`

**YAML:**

```yaml
service: oig_cloud.set_box_mode
data:
  mode: Home 1
  acknowledgement: true
```

**Očekáváný výsledek:**

- ✅ Služba se zavolá
- ✅ V logu uvidíš: `"No device_id provided, available boxes: ['2206237016', '2209234094'], using first: 2206237016"`
- ✅ Služba se provede na **prvním zařízení** (2206237016)

---

### 4. Test #2: Zavolej službu S device_id

**Služba:** `oig_cloud.set_grid_delivery`

**UI Postup:**

1. V "Device" selectoru vyber **ČEZ Battery Box Home 2209234094**
2. Nastav mode: "S omezením / Limited"
3. Nastav limit: 5000
4. Zaškrtni acknowledgement

**YAML (alternativa):**

```yaml
service: oig_cloud.set_grid_delivery
target:
  device_id: <ID druhého zařízení> # Najdeš v Developer Tools → States
data:
  mode: S omezením / Limited
  limit: 5000
  acknowledgement: true
```

**Očekáváný výsledek:**

- ✅ V logu uvidíš: `"Found box_id 2209234094 from device <device_id>"`
- ✅ Služba se provede na **druhém zařízení** (2209234094)

---

### 5. Zkontroluj Logy

**Developer Tools → Logs → filtr "oig_cloud"**

**Co hledat:**

```
Setting grid delivery for device 2209234094: mode=S omezením / Limited, limit=5000
```

---

## 🔍 Jak Najít Device ID

### Metoda 1: UI

1. Settings → Devices & Services
2. OIG Cloud → klikni na zařízení
3. URL obsahuje device_id: `http://.../config/devices/device/<DEVICE_ID>`

### Metoda 2: Developer Tools

1. Developer Tools → States
2. Vyber nějaký senzor z druhého zařízení (např. `sensor.oig_2209234094_soc`)
3. Atributy → `device_id`

### Metoda 3: YAML Service Call

```yaml
service: oig_cloud.set_box_mode
target:
  # Vyber zařízení v UI - automaticky doplní device_id
  device_id:
data:
  mode: Home 1
  acknowledgement: true
```

---

## 📊 Verifikace Multi-Device Support

### Zkontroluj, že máš 2 zařízení

**Settings → Devices & Services → OIG Cloud**

Měl bys vidět:

- ✅ ČEZ Battery Box Home **2206237016** (91 entit)
- ✅ ČEZ Battery Box Home **2209234094** (91 entit)

---

## ⚠️ Aktuální Omezení

### 1. API Nemá Box_ID Parametr (DOČASNÉ)

**Současný stav:**

```python
# services.py
box_id = get_box_id_from_device(hass, device_id, entry.entry_id)
_LOGGER.info(f"Setting mode for device {box_id}")

# ALE API volání používá self.box_id (první zařízení)
await client.set_box_mode(mode_value)  # ← PROBLÉM!
```

**Co to znamená:**

- ✅ Service DETEKUJE správný box_id
- ✅ Service LOGUJE správný box_id
- ❌ API ZAVOLÁ první zařízení (protože `client.box_id` je pevně nastavený)

**Příští krok:**

- Upravit API metody, aby přijímaly `box_id` parametr
- Upravit `OigCloudApi` aby nepožívala `self.box_id`

---

### 2. Shield Nemá Box_ID Support (TODO)

ServiceShield zatím neví o více zařízeních. Bude potřeba:

- Přidat `box_id` do Shield queue
- Filtrovat události podle `box_id`

---

## 🚀 Další Kroky

### Priority:

1. **✅ HOTOVO:** Device selector v services.yaml
2. **✅ HOTOVO:** Box_ID extrakce z device_id
3. **🔄 DALŠÍ:** Upravit API metody:

   ```python
   # PŘED:
   async def set_box_mode(self, mode: str) -> bool:
       # Používá self.box_id

   # PO:
   async def set_box_mode(self, box_id: str, mode: str) -> bool:
       # Přijímá box_id jako parametr
   ```

4. **🔄 DALŠÍ:** Upravit ServiceShield
5. **🔄 DALŠÍ:** Otestovat se 2 zařízeními

---

## 🐛 Troubleshooting

### Služba se nevolá na správné zařízení

**Zkontroluj logy:**

```
"Found box_id <ID> from device <device_id>"
"Setting <service> for device <box_id>"
```

Pokud vidíš správný box_id v logu, ale služba se volá na jiné zařízení:
→ **Očekáváno!** API zatím nemá box_id parametr (viz Omezení #1)

### Device selector nezobrazuje zařízení

**Možné příčiny:**

1. Device nemá správný `manufacturer: OIG`
2. Device nemá správný `model: ČEZ Battery Box Home`
3. Device není přiřazený k integraci `oig_cloud`

**Zkontroluj:**

- Settings → Devices & Services → OIG Cloud → zařízení
- Device Info → Manufacturer, Model

### "Cannot determine box_id"

**Možné příčiny:**

1. Coordinator.data je prázdný
2. Device_id není validní
3. Device nemá identifiers s DOMAIN

**Zkontroluj logy:**

- "No device_id provided and no coordinator data available"
- "Device <ID> not found in registry"
- "Could not extract box_id from device <ID>"

---

## 📝 Testovací Checklist

- [ ] Service BEZ device_id → používá první zařízení
- [ ] Service S device_id (první zařízení) → loguje správný box_id
- [ ] Service S device_id (druhé zařízení) → loguje správný box_id
- [ ] Device selector zobrazuje OBĚ zařízení
- [ ] Logy obsahují "Found box_id" s správným ID
- [ ] Logy obsahují "Setting ... for device" s správným ID

---

## 📞 Co nahlásit

Po testování prosím napiš:

1. ✅ **Funguje device selector?** (vidíš obě zařízení?)
2. ✅ **Loguje se správný box_id?** (kontroluj logy)
3. ❌ **Volá se služba na správné zařízení?** (očekávám NE - viz Omezení #1)

**Příklad reportu:**

```
✅ Device selector OK - vidím obě zařízení
✅ Logy OK - "Found box_id 2209234094"
❌ Služba se volá na první zařízení (2206237016) i když jsem vybral druhé
   → Očekáváno, API nemá box_id parametr
```

---

**Až potvrdíš, že funguje detekce box_id, upravím API metody aby přijímaly box_id parametr!** 🚀
