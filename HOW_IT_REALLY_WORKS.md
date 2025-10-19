# 🔍 DŮKLADNÁ ANALÝZA - Jak to OPRAVDU funguje

## Otázka: Proč máš senzory pro OBĚ zařízení?

Tvrdíš:

- ✅ Existují senzory pro OBJE zařízení (2206237016 i 2209234094)
- ✅ Každé zařízení má své vlastní senzory
- ✅ 2 Shield, 2 Analytics, vše oddělené

Ale z kódu:

```python
# sensor.py - řádek 84
sensor = OigCloudDataSensor(coordinator, sensor_type)  # BEZ box_id!

# oig_cloud_data_sensor.py - řádek 76
self._box_id = list(coordinator.data.keys())[0]  # VŽDY PRVNÍ!

# oig_cloud_data_sensor.py - řádek 95 (device_info)
box_id = list(data.keys())[0]  # VŽDY PRVNÍ!
```

---

## 🧩 MOŽNÉ VYSVĚTLENÍ

### Teorie 1: `coordinator.data` obsahuje POSTUPNĚ různá zařízení

**Možná coordinator.data se MĚNÍ mezi voláními?**

```python
# První volání setup:
coordinator.data = {"2206237016": {...}}  # Pouze první
# → Vytvoří senzory pro 2206237016

# Pak se data aktualizují:
coordinator.data = {"2209234094": {...}}  # Pouze druhé
# → Setup se volá ZNOVU?
# → Vytvoří senzory pro 2209234094
```

**Test:** Zkontroluj logy při startu HA:

```
Setting up sensors with coordinator data: 1 devices
Setting up sensors with coordinator data: 1 devices  # ← Dvakrát?
```

---

### Teorie 2: Setup běží VÍCEKRÁT (jednou pro každé zařízení)

**Možná máš 2 ConfigEntries?**

```python
# První ConfigEntry:
entry.entry_id = "abc123"
coordinator.data = {"2206237016": {...}}
# → Vytvoří senzory pro 2206237016

# Druhý ConfigEntry:
entry.entry_id = "def456"
coordinator.data = {"2209234094": {...}}
# → Vytvoří senzory pro 2209234094
```

**Test:** V HA Settings → Devices & Services:

- Kolik máš "instances" OIG Cloud?
- Vidíš 1 nebo 2?

---

### Teorie 3: Coordinator má VŠECHNA data, ale něco jiného iteruje

**Možná coordinator.data opravdu má:**

```python
coordinator.data = {
    "2206237016": {...},
    "2209234094": {...}
}
```

**A něco jiného vytváří senzory pro každé zařízení?**

Ale NEVIDÍM TO V KÓDU! `sensor.py` NEITERUJE:

```python
# sensor.py - řádek 79-85
for sensor_type, config in data_sensors.items():
    sensor = OigCloudDataSensor(coordinator, sensor_type)
    # ❌ ŽÁDNÁ iterace přes box_id!
```

---

## 🎯 CO POTŘEBUJI VĚDĚT

### 1. Zkontroluj Home Assistant logy

Při restartu HA hledej tento řádek:

```
Setting up sensors with coordinator data: X devices
```

**Kolikrát se objeví?**

- ✅ **2×** → Setup běží dvakrát (pravděpodobně 2 ConfigEntries)
- ❌ **1×** → Setup běží jednou (nevysvětluje proč máš 2 zařízení)

### 2. Zkontroluj ConfigEntries

V HA:

```
Settings → Devices & Services → Integrations → OIG Cloud
```

**Kolik "instances" vidíš?**

- 🔴 **1 instance** → Jak máš senzory pro obě zařízení???
- 🟢 **2 instances** → Vysvětluje to! (ale není to optimální)

### 3. Zkontroluj coordinator.data

Můžeš přidat dočasný log do kódu:

```python
# V sensor.py, řádek 58
_LOGGER.error(f"🔍 COORDINATOR DATA KEYS: {list(coordinator.data.keys())}")
```

Pak restart HA a zkontroluj logy:

```
🔍 COORDINATOR DATA KEYS: ['2206237016', '2209234094']  # ← Obě najednou?
```

NEBO

```
🔍 COORDINATOR DATA KEYS: ['2206237016']  # ← Pouze první?
```

---

## 💡 MŮJ NEJLEPŠÍ TIP

**Nejpravděpodobnější scénář:**

Myslím že máš **2 ConfigEntries** (2 instance integrace):

```
Instance 1:
  - ConfigEntry ID: abc123
  - Coordinator s data = {"2206237016": {...}}
  - Senzory pro 2206237016
  - Shield pro 2206237016
  - Analytics pro 2206237016

Instance 2:
  - ConfigEntry ID: def456
  - Coordinator s data = {"2209234094": {...}}
  - Senzory pro 2209234094
  - Shield pro 2209234094
  - Analytics pro 2209234094
```

**Proč si myslím?**

- Shield a Analytics jsou "per-ConfigEntry" services
- Pokud máš 2 Shield → pravděpodobně 2 ConfigEntries
- Každý ConfigEntry má vlastní coordinator
- Každý coordinator drží data jednoho zařízení

**Jak ověřit:**

- Počkej na logy
- Zkontroluj Devices & Services

---

## ⚠️ CO TO ZNAMENÁ?

### Pokud máš 2 ConfigEntries:

✅ **Funguje to** - máš senzory pro obě zařízení
❌ **NENÍ to optimální** - měl bys mít 1 ConfigEntry pro 1 účet
🔧 **Řešení:** Smazat jeden ConfigEntry, opravit kód aby iteroval

### Pokud máš 1 ConfigEntry:

🤯 **WTF** - jak to funguje?
🔍 **Potřebuji víc info** - logy, screenshot, debug

---

Prosím zkontroluj tyto 3 věci a dej mi vědět! 🚀
