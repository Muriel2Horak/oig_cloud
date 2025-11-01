# 🔋 Battery Constraints Fix - Quick Reference

**Pro okamžité pokračování v práci:**

## 🎯 Co řešíme?

Battery forecast má **4 kritické bugy** které způsobují porušování kapacitních constraintů:

1. ❌ Baterie klesá pod user minimum (33% → 20%)
2. ❌ Balancing na 100% se ignoruje
3. ❌ Forward pass clampuje na 0 místo minimum
4. ❌ Duplicitní výpočet deficitu → dvojitý import

## 📄 Hlavní Dokumenty

| Dokument | Účel |
|----------|------|
| **`docs/BATTERY_CONSTRAINTS_FIX_IMPLEMENTATION.md`** | 🔥 **HLAVNÍ** - Kompletní implementační plán s tasky |
| `BATTERY_CAPACITY_ARCHITECTURE_ANALYSIS.md` | Architektonická analýza, identifikace bugů |
| `MODE_RECOMMENDATIONS_BALANCER_ANALYSIS.md` | Analýza recommendations a balanceru |

## 🚀 Jak Začít?

```bash
# 1. Otevři hlavní implementační plán
open docs/BATTERY_CONSTRAINTS_FIX_IMPLEMENTATION.md

# 2. Scroll na "IMPLEMENTAČNÍ PLÁN"

# 3. Začni TASK 1.1 (první task ve FÁZI 1)

# 4. Následuj instrukce v tasku
```

## 📋 Progress Status

```
FÁZE 1: Quick Fixes        🔴 0/4  (CRITICAL)
FÁZE 2: Unified Simulation 🔴 0/1  (HIGH)
FÁZE 3: SOC% Migration     🔴 0/3  (MEDIUM)
FÁZE 4: Testing            🔴 0/2  (MEDIUM)
────────────────────────────────────────────
CELKEM:                    🔴 0/10 (0%)
```

## 🔥 Next Task

**TASK 1.1: Fix Forward Pass Clamp**
- Priorita: CRITICAL
- Čas: 10 min
- Soubor: `oig_cloud_battery_forecast.py`
- Řádek: ~1892
- Fix: `max(0, ...)` → `max(min_capacity, ...)`

## 🎓 Kontext v Kostce

**Jak systém funguje:**
```
Config (33% min, 80% target)
    ↓
HYBRID Algorithm
    ├─ Forward pass  ← BUG 1: clamp na 0
    ├─ Backward pass
    └─ Select modes
    ↓
Post-processing      ← Reaktivní oprava
    ↓
Mode Recommendations ← Jen prezentace
```

**Kapacity:**
```
Total:    15.36 kWh (100% SOC)
Physical:  3.07 kWh ( 20% SOC) ← Hardware limit
User Min:  5.07 kWh ( 33% SOC) ← NESMÍ klesnout pod toto!
Target:   12.29 kWh ( 80% SOC) ← Cíl optimalizace
```

## 🛠️ Po Každém Tasku

1. ✅ Implementuj fix
2. ✅ Validuj kritéria
3. ✅ Zapiš "Implementováno" + datum + commit
4. ✅ Updatuj progress tracking
5. ✅ Commit do gitu
6. ✅ Pokračuj dalším taskem

## 📞 Reference

- **HA Instance:** 10.0.0.143:8123
- **Box ID:** 2206237016
- **Token:** V souboru `.ha_config`

---

**Kompletní detaily:** `docs/BATTERY_CONSTRAINTS_FIX_IMPLEMENTATION.md`
