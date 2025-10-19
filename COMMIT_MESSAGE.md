# Commit: Fix - Sjednocení enable_pricing a enable_spot_prices flagů

## 🐛 Bug Fix

### Problém

- Dva feature flagy pro jednu funkcionalitu:
  - `enable_pricing` - definován v config flow, ale **NIKDE nepoužívaný**
  - `enable_spot_prices` - používán pro pricing senzory (nekonzistentní název)

### Řešení

Sjednocení pod jediný flag `enable_pricing`, který nyní řídí:

- ✅ Cenové senzory (pricing sensors)
- ✅ Spotové ceny z OTE API
- ✅ OTE API inicializaci
- ✅ Analytics sensors pro ceny

---

## 📝 Změněné soubory

### Core soubory

- `config_flow.py` - Odstraněn `enable_spot_prices`, aktualizace validace
- `__init__.py` - OTE API inicializace podle `enable_pricing`
- `sensor.py` - Registrace pricing sensors podle `enable_pricing`
- `oig_cloud_coordinator.py` - OTE API v koordinátoru
- `oig_cloud_analytics_sensor.py` - Kontrola dostupnosti
- `const.py` - Odstraněna konstanta `CONF_ENABLE_SPOT_PRICES`

### Dokumentace

- `docs/FEATURE_FLAGS_PRICING_UNIFICATION.md` - Kompletní popis opravy
- `docs/FEATURE_FLAGS_AUDIT.md` - Aktualizováno
- `docs/PRICING_FLAG_FIX_SUMMARY.md` - Shrnutí pro vývojáře

---

## ⚠️ Breaking Change

**Důležité pro existující uživatele:**
Po upgrade MUSÍ všichni uživatelé **EXPLICITNĚ ZAPNOUT** `enable_pricing` flag v konfiguraci, pokud chtějí cenové senzory!

**Postup:**

1. Configuration → Integrations → OIG Cloud → Configure
2. Najít sekci "💰 Pricing and Spot Prices"
3. Zapnout checkbox
4. Uložit a restartovat HA

**Proč:**

- Starý flag `enable_spot_prices` už neexistuje
- Nový flag `enable_pricing` má default `False`
- Automatická migrace není možná (flag existoval, ale byl nepoužívaný)

---

## ✅ Výsledný stav

| Feature Flag                | Status          |
| --------------------------- | --------------- |
| `enable_statistics`         | ✅ OK           |
| `enable_solar_forecast`     | ✅ OK           |
| `enable_battery_prediction` | ✅ OK           |
| `enable_pricing`            | ✅ **OPRAVENO** |
| `enable_extended_sensors`   | ✅ OK           |
| `enable_dashboard`          | ✅ OK           |

Všechny feature flagy nyní fungují konzistentně!

---

## 🧪 Testováno

- ✅ Config flow - wizard (nová instalace)
- ✅ Options flow - reconfiguration (úprava existující)
- ✅ Dashboard validace (vyžaduje pricing=true)
- ✅ Sensor registrace (pricing senzory se vytvoří)
- ✅ OTE API inicializace (aktivní při pricing=true)

---

**Typ:** Bug fix + Refactoring
**Priorita:** Vysoká
**Impact:** Breaking change - vyžaduje akci od uživatelů
