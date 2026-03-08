# Ekonomický Plánovací Algoritmus - Analýza Přístupů

## Požadavky (Shrnutí)

### Primární Cíl
**Minimalizovat celkové náklady na elektřinu** (nákup ze sítě + ztráty)

### Strategie
1. **FVE First**: Když FVE stačí, použít ji (přetoky do sítě/bojleru)
2. **Baterie jako Buffer**: Použít když FVE nestačí, abychom nemuseli brát ze sítě
3. **Ekonomické Nabíjení**: Nabít ze sítě jen když se to vyplatí
4. **Rozhodovací Logika**: Při SOC → planning_min spočítat všechny varianty a vybrat nejlevnější

### Omezení
- **Planning minimum**: Konfigurovatelné (v config flow)
- **HW minimum**: 20% (3.07 kWh) - fyzická ochrana
- **Cyklování**: Ideálně 20-80%, občas 100% (3h balancing)
- **Bezpečnost**: Nebýt dlouho na HW minimu

---

## Scénář: Kritické Rozhodnutí

### Příklad:
- **Nyní**: 8:00, SOC = 35% (planning_min = 33%)
- **FVE**: Dnes 5 kWh (zataženo), zítra 15 kWh
- **Spotřeba**: Dnes 15 kWh, zítra 12 kWh
- **Ceny**: Dnes 2.50 Kč (drahé), zítra 1.20 Kč (levné)
- **Večer**: Očekáváme 4 kWh spotřeby (17-21h)

### Co se stane v HOME_I (default)?
- Baterie klesne k 33% (planning_min)
- Večer budeme brát ze sítě za 2.50 Kč/kWh
- Náklady: 4 kWh × 2.50 = **10 Kč**

### Co když nabijeme teď?
- UPS režim: nabijeme 2 kWh za 2.50 Kč/kWh
- Ztráty: 10% (round-trip) → efektivně 1.8 kWh použitelných
- Večer spotřebujeme 4 kWh: 1.8 z baterie, 2.2 ze sítě
- Náklady: (2 × 2.50) + (2.2 × 2.50) = 5 + 5.5 = **10.50 Kč**
- **Nevyplatí se!**

### Co když počkáme na zítřek?
- Dnes večer: 4 kWh ze sítě za 2.50 = 10 Kč
- Zítra ráno: nabijeme levně za 1.20 Kč/kWh
- Ale: Musíme vydržet do zítřka s prázdnou baterií (HW min)
- Riziko: Pokud zítra bude málo FVE, můžeme spadnout pod HW min

### Správné rozhodnutí:
- **Nenabíjet teď** (2.50 je drahé)
- **Použít baterii na večer** (vyhnout se 2.50)
- **Zítra nabít za 1.20** (levné)
- **Přijmout riziko**: HW min je bezpečné na jeden večer

---

## Možné Přístupy k Algoritmu

### Přístup A: "Threshold-based" (Jednoduchý)

**Pravidlo:**
```
IF SOC < planning_min:
    IF cena_nyní < průměrná_cena_budoucí_spotřeby:
        → Nabít teď
    ELSE:
        → Použít baterii až na HW min, pak brát ze sítě
```

**Výhody:**
- Jednoduchý na implementaci
- Rychlý výpočet
- Předvídatelný

**Nevýhody:**
- Nezohledňuje ztráty (round-trip efficiency)
- Nepočítá s "přečkat do FVE"
- Průměrná cena je hrubá metrika

---

### Přístup B: "Look-ahead Simulation" (Doporučuji)

**Algoritmus:**
```
IF SOC < planning_min:
    # Simuluj 3 varianty:
    
    Varianta 1: "Použij baterii"
    → Simuluj HOME_I až na HW min, pak brát ze sítě
    → Spočítej celkové náklady
    
    Varianta 2: "Nabij teď"
    → Simuluj UPS teď, pak HOME_I
    → Spočítej celkové náklady (včetně ztrát)
    
    Varianta 3: "Počkej na FVE"
    → Simuluj HOME_I, najdi kdy začne FVE
    → Pokud FVE pokryje spotřebu před deficitem → OK
    → Jinak brát ze sítě
    → Spočítej náklady
    
    Vyber variantu s nejnižšími náklady
```

**Výhody:**
- Skutečně optimalizuje náklady
- Zohledňuje ztráty
- Bere v úvahu FVE prognózu
- Přesné rozhodnutí pro každou situaci

**Nevýhody:**
- Více výpočetně náročný (3× simulace)
- Složitější na implementaci
- Těžší debuggovat

---

### Přístup C: "Dynamic Programming" (Optimální, ale složitý)

**Myšlenka:**
- Pro každý interval rozhodnout: nabíjet/ne/nabíjet
- Celkové náklady = součet nákladů všech intervalů
- Najít globálně optimální sekvenci režimů

**Implementace:**
```python
# Bellman equation
optimal_cost[i][soc] = min(
    cost_interval_i(soc, HOME_I) + optimal_cost[i+1][new_soc_i],
    cost_interval_i(soc, HOME_UPS) + optimal_cost[i+1][new_soc_ups],
)
```

**Výhody:**
- Globálně optimální řešení
- Zohledňuje všechny interakce

**Nevýhody:**
- Výpočetně náročný O(n × soc_states)
- Složitá implementace
- Přetěžování pro jednoduchý problém

---

## Doporučení: Přístup B (Look-ahead)

### Proč?
1. **Dostatečně dobrý**: Najde lokálně optimální řešení
2. **Implementovatelný**: Jasné kroky, testovatelné
3. **Interpretovatelný**: Můžeme vysvětlit proč rozhodl tak jak rozhodl
4. **Výkonnostní**: ~3× simulace = stále < 100ms

### Detailní Algoritmus:

```python
def plan_battery_schedule():
    # Základní simulace v HOME_I
    baseline = simulate_timeline(modes=[HOME_I]*96)
    
    # Najdi první deficit pod planning_min
    deficit_idx = find_first_deficit(baseline, planning_min)
    
    if deficit_idx is None:
        # Žádný deficit, pokračuj v HOME_I
        return [HOME_I]*96
    
    # Kritické rozhodnutí potřeba
    decision = make_economic_decision(
        current_soc=baseline[deficit_idx].start_soc,
        deficit_idx=deficit_idx,
        prices=prices,
        solar=solar,
        load=load
    )
    
    return decision.modes


def make_economic_decision(current_soc, deficit_idx, prices, solar, load):
    """
    Porovná 3 varianty a vrátí nejlevnější.
    """
    
    # Varianta 1: Použij baterii až na HW min
    v1 = simulate_variant(
        strategy="use_battery",
        current_soc=current_soc,
        deficit_idx=deficit_idx
    )
    
    # Varianta 2: Nabij teď (pokud je levné)
    v2 = simulate_variant(
        strategy="charge_now",
        current_soc=current_soc,
        deficit_idx=deficit_idx,
        max_charge=charge_rate * (deficit_idx - current_idx)
    )
    
    # Varianta 3: Počkej na FVE
    v3 = simulate_variant(
        strategy="wait_for_solar",
        current_soc=current_soc,
        deficit_idx=deficit_idx
    )
    
    # Porovnej náklady
    costs = {
        "use_battery": v1.total_cost,
        "charge_now": v2.total_cost,
        "wait_for_solar": v3.total_cost
    }
    
    best = min(costs, key=costs.get)
    
    return {
        "use_battery": v1,
        "charge_now": v2,
        "wait_for_solar": v3
    }[best]
```

---

## Dodatečné Úvahy

### 1. Jak Spočítat "Náklady"?

```python
def calculate_cost(simulation_result):
    total = 0
    
    for interval in simulation_result:
        # Náklady za odběr ze sítě
        total += interval.grid_import * interval.price
        
        # Ztráty při nabíjení (opportunity cost)
        # Každý kWh nabité do baterie "stojí" cenu elektřiny
        # ale jen část je použitelná (ztráty)
        if interval.grid_charge > 0:
            # Zaplatili jsme za grid_charge, ale ztratili jsme (1-efficiency)
            losses = interval.grid_charge * (1 - efficiency)
            total += losses * interval.price
    
    return total
```

### 2. Kdy Nabít na 100% (Balancing)?

**Pravidla:**
- Každých X dní (např. 7)
- Pokud SOC > 95% a už dlouho nebylo 100%, přeskočit
- Jinak: Najít nejlevnější okno a nabít na 100%
- Držet 100% po dobu 3h (configurovatelné)

**Integrace:**
- Balancing jako "hard constraint"
- Naplánovat předem (deadline-based)
- Ostatní rozhodnutí respektují balancing

### 3. Bojler Koordinace

**Logika:**
- Přetoky z FVE jdou nejdříve do bojleru (pokud je zapnutý)
- Tím se "ušetří" baterie na večer
- Bojler je "lacinější buffer" než baterie

**Integrace:**
- Simulace musí zohlednit bojler
- Přetoky = min(FVE surplus, bojler capacity)
- Zbytek do baterie

---

## Otázky k Diskuzi

### 1. Hloubka Look-ahead?
- **Varianta A**: Jen do konce dne (24h)
- **Varianta B**: 36h (dnes + zítra ráno)
- **Varianta C**: 48h (2 dny)

**Doporučení**: 36h - vidíme zítřejší ceny i FVE

### 2. Kolik Variant Porovnávat?
- **Varianta A**: 2 varianty (nabít teď vs. počkat)
- **Varianta B**: 3 varianty (+ počkat na FVE)
- **Varianta C**: N variant (všechny možné kombinace)

**Doporučení**: 3 varianty - dobrý kompromis

### 3. Jak Často Přepočítávat?
- **Varianta A**: Každých 15 minut
- **Varianta B**: Každou hodinu
- **Varianta C**: Při změně prognózy

**Doporučení**: Každých 15 minut (s cachingem)

### 4. Jaké Ztráty Uvažovat?
- **Round-trip**: ~12% (0.88 efektivita)
- **Stačí tato hodnota?** Nebo měřit reálně?

**Doporučení**: Použít configurovatelnou hodnotu, default 88%

---

## Váš Názor?

### Co preferujete?

**A) Jednoduchý threshold**
- Rychlý, předvídatelný
- Méně optimální

**B) Look-ahead simulation (doporučuji)**
- Optimalizuje náklady
- Porovnává varianty
- Implementovatelný

**C) Full dynamic programming**
- Globálně optimální
- Výpočetně náročný
- Složitý

### Další Otázky:

1. **Jak často potřebujete přepočet?** (15min / 1h / jinak)
2. **Chcete vidět proč rozhodl tak jak rozhodl?** (logging / vysvětlení)
3. **Máte preference pro "jistotu" vs "optimalitu"?** (vyhnout se riziku / minimalizovat náklady)

---

## Shrnutí Navrhovaného Algoritmu

### Pokud FVE stačí:
- HOME_III celý den
- Přetoky do sítě/bojleru

### Pokud FVE nestačí:
1. Simuluj v HOME_I
2. Najdi kdy SOC klesne k planning_min
3. Ve 3 variantách spočítej náklady:
   - Použij baterii až na HW min
   - Nabij teď (pokud je levné)
   - Počkej na FVE (pokud brzy začne)
4. Vyber nejlevnější variantu
5. Vygeneruj režimy podle výsledku

### Integrace s balancing:
- Hard constraint
- Naplánuj předem
- Ostatní rozhodnutí se přizpůsobí

Souhlasíte s tímto přístupem? Chcete něco upravit?
