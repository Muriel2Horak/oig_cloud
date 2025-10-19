# Závislosti mezi moduly OIG Cloud

## 📊 Mapa závislostí

```
┌─────────────────────────────────────────────────────────┐
│                    DASHBOARD                            │
│              (vyžaduje VŠE níže)                        │
└──────────────────┬──────────────────────────────────────┘
                   │
         ┌─────────┴─────────┬─────────────┐
         │                   │             │
         ▼                   ▼             ▼
┌──────────────────┐  ┌──────────────┐  ┌────────────────┐
│  BATTERY         │  │  SOLAR       │  │  EXTENDED      │
│  PREDICTION      │  │  FORECAST    │  │  SENSORS       │
└────┬─────────────┘  └──────────────┘  └────────────────┘
     │                         ▲
     └─────────────────────────┴─ vyžaduje

┌──────────────────┐  ┌──────────────┐  ┌────────────────┐
│  STATISTICS      │  │  PRICING     │  │  SPOT PRICES   │
│  (nezávislé)     │  │  (nezávislé) │  │  (nezávislé)   │
└──────────────────┘  └──────────────┘  └────────────────┘
```

## 🔗 Detailní závislosti

### 1. Statistiky a analýzy

- **Závislosti:** ŽÁDNÉ
- **Popis:** Nezávislý modul pro sledování mediánu spotřeby a predikce

### 2. Solární předpověď

- **Závislosti:** ŽÁDNÉ
- **Popis:** Nezávislý modul pro předpověď výroby z FVE
- **Poznámka:** Vyžadován jinými moduly (Battery Prediction, Dashboard)

### 3. Predikce baterie

- **Závislosti:**
  - ✅ **Solární předpověď** (POVINNÉ)
  - ✅ **Rozšířené senzory** (POVINNÉ)
- **Popis:** Inteligentní optimalizace nabíjení podle cen a předpovědi
- **Důvod závislostí:**
  - Solar → potřebuje vědět, kolik se vyrobí
  - Extended sensors → potřebuje detailní data o baterii

### 4. Cenové senzory

- **Závislosti:** ŽÁDNÉ
- **Popis:** Nezávislý modul pro kalkulaci nákladů

### 5. Spotové ceny

- **Závislosti:** ŽÁDNÉ
- **Popis:** Nezávislý modul pro stahování cen z OTE

### 6. Rozšířené senzory

- **Závislosti:** ŽÁDNÉ
- **Popis:** Nezávislý modul pro detailní monitoring
- **Poznámka:** Vyžadován jinými moduly (Battery Prediction, Dashboard)

### 7. Webový dashboard

- **Závislosti:**
  - ✅ **Statistiky** (POVINNÉ)
  - ✅ **Solární předpověď** (POVINNÉ)
  - ✅ **Predikce baterie** (POVINNÉ)
  - ✅ **Cenové senzory** (POVINNÉ)
  - ✅ **Spotové ceny** (POVINNÉ)
  - ✅ **Rozšířené senzory** (POVINNÉ)
- **Popis:** Kompletní webové rozhraní s grafy
- **Důvod:** Dashboard zobrazuje data ze všech modulů

## ✅ Validační pravidla

### Při zapnutí Battery Prediction:

```python
if enable_battery_prediction:
    if not enable_solar_forecast:
        ERROR: "Predikce baterie vyžaduje zapnutou solární předpověď"
    if not enable_extended_sensors:
        ERROR: "Predikce baterie vyžaduje zapnuté rozšířené senzory"
```

### Při zapnutí Dashboard:

```python
if enable_dashboard:
    missing = []
    if not enable_statistics:
        missing.append("Statistiky")
    if not enable_solar_forecast:
        missing.append("Solární předpověď")
    if not enable_battery_prediction:
        missing.append("Predikce baterie")
    if not enable_pricing:
        missing.append("Cenové senzory")
    if not enable_spot_prices:
        missing.append("Spotové ceny")
    if not enable_extended_sensors:
        missing.append("Rozšířené senzory")

    if missing:
        ERROR: f"Dashboard vyžaduje: {', '.join(missing)}"
```

## 🎯 Implementace ve wizardu

### Krok 1: Výběr modulů

- Uživatel vybírá checkboxy
- Zobrazí se varování u závislých modulů

### Krok 2: Validace

- Před pokračováním kontrola závislostí
- Pokud chybí závislosti → ERROR s vysvětlením

### Krok 3: Automatická aktivace

- Pokud user zapne Dashboard → nabídnout automatické zapnutí všeho

### Příklad chybové zprávy:

```
❌ Nelze pokračovat

Vybrali jste "Predikce baterie", ale tento modul vyžaduje:
• ✅ Solární předpověď (CHYBÍ - musíte zapnout)
• ✅ Rozšířené senzory (CHYBÍ - musíte zapnout)

Vraťte se zpět a zapněte požadované moduly.
```

## 🔧 On/Off přepínače v každé sekci

Každá sekce by měla začínat:

```
┌─────────────────────────────────────────────┐
│  Solární předpověď výroby elektřiny         │
├─────────────────────────────────────────────┤
│  □ Zapnout solární předpověď                │
│                                             │
│  📖 Co tento modul dělá:                    │
│  Předpovídá výrobu elektřiny z fotovoltaiky │
│  na základě počasí a parametrů instalace.  │
│                                             │
│  🔧 Co je potřeba:                          │
│  • API klíč z Forecast.Solar (volitelný)   │
│  • GPS souřadnice instalace                │
│  • Parametry panelů (sklon, orientace)     │
│                                             │
│  ⚠️ Tento modul je vyžadován pro:          │
│  • Predikci baterie                        │
│  • Dashboard                                │
└─────────────────────────────────────────────┘

[Pokud je zapnutý → zobrazit detailní nastavení]
[Pokud je vypnutý → skočit na další sekci]
```

---

**Status:** Návrh připraven
**Next:** Implementovat do config_flow.py
