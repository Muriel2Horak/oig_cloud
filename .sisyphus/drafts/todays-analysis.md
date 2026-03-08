# Detailní Analýza Dnešního Dne (5.3.2026)

## Získaná Data z HA

### Aktuální Stav (8:45)
- **Aktuální SOC**: 6.96 kWh (68% z 10.24 kWh)
- **HW minimum**: 3.072 kWh (30% - fyzická ochrana)
- **Plánovací minimum**: předpokládám 30% = 3.072 kWh
- **Target**: předpokládám 80% = 8.192 kWh

### Prognóza na Dnes (5.3.2026)
**Solární prognóza (hourly):**
```
06:00: 0.00 kW
07:00: 0.41 kW  → 0.10 kWh/15min
08:00: 1.01 kW  → 0.25 kWh/15min  [TEĎ]
09:00: 1.71 kW  → 0.43 kWh/15min
10:00: 2.27 kW  → 0.57 kWh/15min
11:00: 2.64 kW  → 0.66 kWh/15min
12:00: 2.73 kW  → 0.68 kWh/15min  [PEAK]
13:00: 2.64 kW  → 0.66 kWh/15min
14:00: 2.39 kW  → 0.60 kWh/15min
15:00: 1.90 kW  → 0.48 kWh/15min
16:00: 1.25 kW  → 0.31 kWh/15min
17:00: 0.56 kW  → 0.14 kWh/15min
```

**Denní součty:**
- FVE dnes: 18.17 kWh
- Spotřeba dnes: 13.3 kWh
- **Očekávaný přebytek**: 18.17 - 13.3 = **+4.87 kWh**

### Výpočet: Co se stane bez nabíjení ze sítě?

**Aktuální stav**: 6.96 kWh (68%)
**Očekávaný přebytek dnes**: +4.87 kWh
**Teoretický večerní stav**: 6.96 + 4.87 = 11.83 kWh
**ALE**: Maximum baterie je 10.24 kWh
**Reálný večerní stav**: 10.24 kWh (100%)

**Závěr**: Dnes se baterie nabije sama z FVE na 100% bez jakéhokoli nabíjení ze sítě!

---

## Simulace Timeline (15min intervaly)

### Metodika:
1. Začínáme: 6.96 kWh (8:45)
2. Pro každý 15min interval: SOC = SOC + FVE/4 - Load/4
3. FVE a Load převedeny na kWh/15min
4. HW minimum: 3.072 kWh (nedovolit pod)
5. Max: 10.24 kWh

### Simulace od 8:45:
```
08:45: SOC=6.96 kWh (68%)
09:00: +0.25 FVE - 0.33 Load → SOC=6.88 kWh (67%) [bez FVE klesá]
09:15: +0.25 FVE - 0.33 Load → SOC=6.80 kWh (66%)
09:30: +0.25 FVE - 0.33 Load → SOC=6.72 kWh (66%)
09:45: +0.25 FVE - 0.33 Load → SOC=6.64 kWh (65%)
10:00: +0.57 FVE - 0.33 Load → SOC=6.88 kWh (67%) [začíná nabíjení]
10:15: +0.57 FVE - 0.33 Load → SOC=7.12 kWh (70%)
10:30: +0.57 FVE - 0.33 Load → SOC=7.36 kWh (72%)
10:45: +0.57 FVE - 0.33 Load → SOC=7.60 kWh (74%)
11:00: +0.66 FVE - 0.33 Load → SOC=7.93 kWh (77%)
...
12:00: +0.68 FVE - 0.33 Load → SOC=8.85 kWh (86%)
...
14:00: +0.60 FVE - 0.33 Load → SOC=10.24 kWh (100%) [PLNÉ]
...
```

**Kritický moment**: Mezi 10:00-12:00 baterie začne nabíjet z FVE a rychle stoupne.

---

## Analýza Problému

### Současný Plánovač - Co dělá špatně:

**Problém 1: Ignoruje Solar Surplus**
- Vidí target 80% (8.192 kWh)
- Aktuálně máte 68% (6.96 kWh)
- Chybí 1.23 kWh k targetu
- Hledá nejlevnější intervaly k nabíjení
- Najde třeba interval v 10:00 za 1.50 Kč/kWh
- **ALE**: V 10:00 máte FVE přebytek 0.57*4=2.28 kWh/h
- FVE by sama nabila baterii bez nákladů!

**Problém 2: Předčasné Nabíjení**
- Plánuje UPS v 10:00 (když svítí slunce)
- Tím posílá FVE do sítě místo do baterie
- Plýtvá FVE výrobou

**Problém 3: Nehledí na FV surplus**
- Prognóza říká +4.87 kWh dnes
- To je víc než potřeba k targetu
- Není třeba žádné nabíjení ze sítě

---

## Správný Algoritmus - Jak by Měl Rozhodovat

### Fáze 1: Solar Surplus Check
```
IF (FVE_prognóza_dnes - Spotřeba_dnes) > (Target - Current_SOC):
    → Žádné nabíjení ze sítě dnes
ELSE:
    → Jdeme do Fáze 2
```

**Pro dnešek:**
```
FVE_prognóza_dnes (18.17) - Spotřeba_dnes (13.3) = +4.87 kWh
Target - Current_SOC = 8.192 - 6.96 = 1.23 kWh
4.87 > 1.23 → TRUE
→ Žádné nabíjení ze sítě dnes!
```

### Fáze 2: Detekce Deficitů (pokud FVE nestačí)
```
Simuluj každý interval:
  SOC = SOC + FVE/4 - Load/4
  IF SOC < Planning_Min:
    → Zaznamenej deficit
  IF SOC > Target:
    → Zaznamenej přebytek

IF deficity existují:
  → Najdi nejlevnější intervaly PŘED deficity
  → Naplánuj UPS v těchto intervalech
ELSE:
  → Žádné nabíjení ze sítě
```

### Fáze 3: Optimalizace (pokud potřeba)
```
Seznam kandidátů = všechny intervaly PŘED deficity
Seřaď podle ceny (nejlevnější první)
Pro každý kandidát:
  Simuluj: "Co kdybychom nabili zde?"
  IF odstraní deficit:
    → Vyber tento interval
    → Zastav hledání
```

---

## Plán pro Dnešek (Co by Měl Plánovač Vygenerovat)

### Režimy podle hodin:
```
00:00-08:45: HOME III (proběhlo)
08:45-10:00: HOME III (FVE roste, baterie ještě klesá na spotřebu)
10:00-14:00: HOME III (FVE > spotřeba, baterie se nabíjí z FVE)
14:00-17:00: HOME III (baterie plná, FVE jde do sítě)
17:00-24:00: HOME III (večerní spotřeba z baterie)
```

### Žádný UPS režim dnes!

### Důvod:
- FVE prognóza: 18.17 kWh
- Spotřeba: 13.3 kWh
- Přebytek: +4.87 kWh
- Aktuální SOC: 6.96 kWh
- Maximum: 10.24 kWh
- **FVE sama nabije baterii na 100%**

---

## Kritická Poznámka k Současnému Plánu

V battery_forecast senzoru vidím:
```json
"mode_optimization": {
    "total_cost_czk": 0,
    "total_savings_vs_home_i_czk": 0,
    "modes_distribution": {
        "HOME_I": 61,
        "HOME_II": 0,
        "HOME_III": 0,
        "HOME_UPS": 0
    }
}
```

**Problém**: Vše je HOME_I, což je špatně! Dnes by mělo být HOME_III celý den.

HOME_I znamená "grid priority" - deficit ze sítě. Ale když svítí slunce, chceme HOME_III (solar priority).

---

## Přepočet s Realistickou Spotřebou

Pokud je spotřeba rozložená rovnoměrně:
- 13.3 kWh / 24h = 0.55 kW průměrně
- Ráno/večer vyšší, v poledne nižší

Předpokládaný průběh dnešní baterie:
```
08:45:  6.96 kWh (68%)  [START]
09:00:  6.88 kWh (67%)  [klesá na spotřebu]
10:00:  7.12 kWh (70%)  [začíná nabíjení z FVE]
11:00:  8.20 kWh (80%)  [dosáhli targetu]
12:00:  9.20 kWh (90%)  [nabíjení z FVE]
13:00:  10.24 kWh (100%) [PLNÉ]
14:00:  10.24 kWh (100%) [FVE do sítě]
15:00:  10.24 kWh (100%) [FVE do sítě]
16:00:  10.24 kWh (100%) [FVE do sítě]
17:00:  10.24 kWh (100%) [začátek večerní spotřeby]
18:00:  9.50 kWh (93%)   [večerní spotřeba z baterie]
20:00:  8.50 kWh (83%)   [večerní spotřeba z baterie]
22:00:  7.50 kWh (73%)   [večerní spotřeba z baterie]
00:00:  6.50 kWh (63%)   [konec dne]
```

**Večer**: 6.50 kWh (63%) - bezpečně nad minimem (30%).

---

## Závěr Analýzy

### Pro Dnešek (5.3.2026):
✅ **Správné chování**: HOME_III celý den, žádný UPS
❌ **Současný plán**: HOME_I (špatně!) - mohl by brát ze sítě místo z FVE

### Proč Současný Plánovač Selhává:
1. Nevyužívá slunečné dny
2. Plánuje nabíjení ze sítě když FVE stačí
3. Režim HOME_I místo HOME_III
4. Nezohledňuje solar surplus v kalkulaci

### Nový Algoritmus Musí:
1. **Nejdřív spočítat**: Dává FVE + baterie target?
2. **Pokud ano**: Žádné nabíjení ze sítě
3. **Pokud ne**: Najít nejlevnější intervaly PŘED deficity
4. **Vždy preferovat**: FVE před nabíjením ze sítě
5. **Režim**: HOME_III když FVE > 0, jinak HOME_I
