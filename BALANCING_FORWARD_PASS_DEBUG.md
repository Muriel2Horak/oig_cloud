# Balancing Forward Pass - Analýza problému

**Datum:** 12. listopadu 2025
**Problém:** Baterie po ukončení forced balancing klesá na hardware minimum (20%) místo respektování planning minima (33%)

---

## 🔴 Původní problém

Timeline ukazuje, že po ukončení forced balancing (holding period 21:15 - 00:15) baterie klesá na 3.07 kWh (20% - hardware minimum) místo udržení nad 5.07 kWh (33% - planning minimum).

**Očekávané chování:**
- 20:45 - 21:15: Nabíjení na 100%
- 21:15 - 00:15: Holding period (baterie na 100%, režim HOME UPS)
- 00:15+: HOME I režim, ale baterie NESMÍ klesnout pod 33% (5.07 kWh)

**Skutečné chování:**
- Timeline ukazoval baterie na 3.07 kWh od 14:45 do 00:00 (den následující)
- Forward pass detekoval min_reached = -3.64 kWh (!!!)
- Po opravách: min_reached = 3.07 kWh (hardware minimum)
- **STÁLE ŠPATNĚ:** Baterie klesá na 20% místo respektování 33% planning minima

---

## 🔍 Diagnostika problému

### 1. Forward pass detekce holding period (SELHALO)

**Původní kód:**
```python
for i in range(n):
    # Parsování intervalu
    interval_ts = datetime.fromisoformat(spot_prices[i]["time"])

    # Detekce holding period
    in_holding_period = holding_start <= interval_ts < holding_end

    if in_holding_period:
        battery = max_capacity  # 100%
    else:
        # HOME I simulace
        battery += net_energy
```

**Problém:**
- Holding period detection NIKDY nespoušťěl (žádné logy "🔒 Holding period interval")
- Důvod: Forward pass začínal od TEĎ (20:29), ale holding_start je v budoucnosti (21:15)
- Všechny intervaly před 21:15 nebyly v holding period, takže baterie klesala normálně

**Debug logy potvrdily:**
```
📊 Balancing forward pass: starting from holding_end index 16 (00:15) with battery=100%
📊 Balancing: checking min from index 16/95 (after holding_end 00:15): min=-3.64 kWh
```

holding_end_index byl nalezen správně, ale minimum PŘED holding_end (od TEĎ do 00:15) bylo -3.64 kWh.

---

## 🛠️ Pokus o opravu #1: Přeskočení na holding_end

**Změna:**
```python
# In balancing mode, skip to holding_end and start with 100%
start_index = 0
if is_balancing_mode and holding_end:
    battery = max_capacity  # Start with 100% after balancing
    # Find index for holding_end
    for i in range(n):
        interval_ts = datetime.fromisoformat(spot_prices[i]["time"])
        if interval_ts >= holding_end:
            start_index = i
            battery_trajectory = [max_capacity]
            break

for i in range(start_index, n):
    # Simulace OD holding_end
```

**Důvod:** Místo detekování holding period během simulace, začít rovnou OD holding_end s baterií na 100%.

**Výsledek:**
```
✅ Forward pass začíná od holding_end (index 16)
✅ Baterie začíná na 100% (15.36 kWh)
❌ STÁLE min=-3.64 kWh
```

**Proč selhalo:** Simulace používala `battery += net_energy` bez omezení na hardware minimum. Baterie mohla klesnout do záporných hodnot.

---

## 🛠️ Pokus o opravu #2: Hardware minimum clamping

**Změna:**
```python
battery += net_energy

# CRITICAL: Clamp to hardware limits (inverter won't go below/above)
battery = max(hardware_minimum, min(max_capacity, battery))

battery_trajectory.append(battery)
```

**Důvod:** Forward pass musí respektovat fyzické limity inverteru (baterie nemůže jít pod 20%).

**Výsledek:**
```
❌ ERROR: name 'hardware_minimum' is not defined
```

**Proč selhalo:** V scope forward pass není proměnná `hardware_minimum`, je definovaná jako `physical_min_capacity`.

---

## 🛠️ Pokus o opravu #3: Správný název proměnné

**Změna:**
```python
battery += net_energy

# CRITICAL: Clamp to hardware limits (inverter won't go below/above)
battery = max(physical_min_capacity, min(max_capacity, battery))

battery_trajectory.append(battery)
```

**Výsledek:**
```
✅ Forward pass funguje bez chyb
✅ min_reached = 3.07 kWh (hardware minimum)
❌ Timeline stále ukazuje battery=0.00 a mode=HOME UPS všude
❌ HYBRID algoritmus vrací jen HOME UPS baseline
```

---

## 🔴 Aktuální stav problému

### Timeline API output:
```json
{
  "active": [
    {"timestamp": "20:45", "battery_kwh": 0.00, "mode": 3},  // HOME UPS
    {"timestamp": "21:00", "battery_kwh": 0.00, "mode": 3},
    {"timestamp": "21:15", "battery_kwh": 0.00, "mode": 3},
    ...
    {"timestamp": "00:15", "battery_kwh": 0.00, "mode": 3},
    {"timestamp": "00:30", "battery_kwh": 0.00, "mode": 3},
    {"timestamp": "00:45", "battery_kwh": 0.00, "mode": 0}   // HOME I
  ]
}
```

### Logy:
```
📊 Balancing forward pass: starting from holding_end index 15 (00:15) with battery=100%
📊 Balancing: checking min from index 15/95 (after holding_end 00:15): min=3.07 kWh
📊 Forward pass: min_reached=3.07 kWh, final=3.07 kWh (target=15.36)
🔋 Balancing mode - skipping economic checks (MUST charge to 100%)
🔋 Charging decision: for_minimum=True, for_target=True
🎯 Balancing deadline: index=3/109, time=21:15
📈 Balancing backward pass: required_start=15.36 kWh, required_at_deadline=15.36 kWh
```

**Pak pokračuje SOLAR LOOKUP pro backward pass, ale:**
- ❌ Chybí log "FINAL HYBRID" (HYBRID algoritmus nevrací plán)
- ❌ Timeline obsahuje jen HOME UPS a battery=0.00
- ❌ `_calculate_timeline() using mode: HOME UPS (3)` (používá fallback)

---

## 🤔 Co je skutečný problém?

### Teorie 1: HYBRID exception
HYBRID algoritmus selhal s nějakou exception po forward pass a vrátil `None`. Proto timeline používá fallback baseline (HOME UPS).

**Evidence:**
- V historických logách: `ERROR: HYBRID optimization failed: name 'hardware_minimum' is not defined`
- Ale tato chyba byla opravena v posledním deployi
- Možná existuje DALŠÍ exception, kterou nevidíme v logách

### Teorie 2: Backward pass selhal
Forward pass funguje, ale backward pass (plánování nabíjení) selhal a HYBRID nemohl vytvořit plán.

**Evidence:**
- Vidíme začátek backward pass: "Balancing backward pass: required_start=15.36"
- Pak SOLAR LOOKUP (součást backward pass)
- Ale CHYBÍ konec backward pass a FINAL HYBRID

### Teorie 3: Timeline generation problém
HYBRID vrací správný plán, ale `_calculate_timeline()` ho nepoužívá.

**Evidence:**
- `_calculate_timeline() using mode: HOME UPS (3)` - používá jen jeden režim
- Timeline má všude battery=0.00 - což naznačuje, že baseline simulace selhala

---

## 📊 Co jsme zjistili

### ✅ CO FUNGUJE:
1. Balancing plan je správně načten: `holding=2025-11-12 21:15 - 2025-11-13 00:15`
2. Forward pass start: Začíná od holding_end (index 15) s baterií na 100%
3. Hardware minimum: Respektuje 20% limit (min=3.07 kWh)
4. Backward pass start: Zjistil deficit 4.92 kWh (potřeba nabít z 10.45 na 15.36)

### ❌ CO NEFUNGUJE:
1. Forward pass detekuje min=3.07 kWh (hardware minimum) místo kontroly planning minima (5.07 kWh)
2. HYBRID algoritmus nevrací FINAL plan (chybí log "FINAL HYBRID")
3. Timeline obsahuje jen HOME UPS a battery=0.00
4. Nevidíme, kde HYBRID algoritmus končí (exception? early return?)

---

## 🎯 Co dál zkontrolovat

### 1. Existuje další exception v HYBRID?
```bash
ssh ha 'docker logs homeassistant --since 5m 2>&1 | grep -A20 "HYBRID optimization failed"'
```

### 2. Končí backward pass úspěšně?
Hledat log: "Grid charging plan generated" nebo "Backward pass complete"

### 3. Proč timeline má battery=0.00?
Zkontrolovat `_calculate_timeline()` - možná dostává špatná data nebo baseline simulace selhala

### 4. Je problém v minimum check?
```python
# Aktuální logika:
min_reached = min(battery_trajectory[holding_end_index:])
if min_reached < planning_minimum:
    # Porušení planning minima
```

Ale forward pass detekuje min=3.07 kWh (20%), což JE pod planning minimum 5.07 kWh (33%). Takže violation je DETEKOVÁNA správně!

**Otázka:** Co HYBRID dělá, když zjistí violation? Měl by:
- Přidat další intervaly nabíjení PO holding_end?
- Nebo změnit režim celého období na HOME UPS?

---

## 💡 Hypotéza problému

**Forward pass správně detekuje:**
- "Baterie po balancingu (od 00:15) klesne z 100% na 20% = PORUŠENÍ planning minima"

**HYBRID by měl:**
1. Zjistit, že HOME I po holding_end nedokáže udržet planning minimum
2. Změnit plán:
   - Buď přidat nabíjení v levných intervalech po 00:15
   - Nebo použít HOME UPS celou dobu (proto vidíme mode=3 všude)

**Ale timeline má battery=0.00 = simulace selhala!**

To naznačuje, že problém není v logice HYBRID, ale v **timeline generation** - dostává prázdná nebo špatná data.

---

## 🔧 Další kroky

1. **Zjistit přesnou exception** v HYBRID (pokud existuje)
2. **Ověřit, že backward pass doběhne** až do konce
3. **Zkontrolovat, jaká data dostává `_calculate_timeline()`**
4. **Zjistit, proč timeline má battery=0.00** (chyba v baseline simulaci?)

---

## 📝 Změny v kódu

### Commit 1: Fix datetime vs string parsing
```python
# Oprava parsování holding_start/holding_end (podporuje string i datetime)
if isinstance(plan.get("holding_start"), str):
    holding_start = datetime.fromisoformat(plan["holding_start"])
```

### Commit 2: Forward pass starts from holding_end
```python
# Forward pass v balancing režimu začíná od holding_end s 100%
if is_balancing_mode and holding_end:
    battery = max_capacity
    start_index = <index of holding_end>
```

### Commit 3: Hardware minimum clamping
```python
# Respektování hardware limitu 20%
battery = max(physical_min_capacity, min(max_capacity, battery))
```

**Výsledek:** Forward pass funguje, ale HYBRID nevrací plán → Timeline fallback na HOME UPS s battery=0.00

---

## 🎯 Závěr

**Problém není v forward pass** - ten funguje správně a detekuje violation (min=3.07 kWh < 5.07 kWh).

**Skutečný problém je pravděpodobně v:**
1. Backward pass - možná selhal s exception
2. Timeline generation - dostává špatná data nebo baseline simulace selhala
3. HYBRID return - nevrací plán, proto fallback na HOME UPS

**Potřebujeme najít, kde HYBRID algoritmus končí** a proč nevidíme "FINAL HYBRID" log.
