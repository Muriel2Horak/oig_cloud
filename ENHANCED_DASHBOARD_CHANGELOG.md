# Enhanced Dashboard Switcher - Changelog

## 🔄 Verze 2.0 - Opravená (16.10.2025)

### 🐛 Opravy kritických chyb

- **Odstraněny všechny hardcoded nesmyslné hodnoty**
  - ❌ Fake cykly baterie (247)
  - ❌ Fake výkony (487W, 198W, 248W)
  - ❌ Fake statistiky (7.5 kWh, 5.1 kWh)
  - ❌ Fake spot ceny (2.45 Kč/kWh)

### ✅ Nové reálné hodnoty

- **Battery sekce:**

  - 🌡️ Teplota baterie (místo cyklů)
  - 📊 Stav baterie (místo účinnosti)
  - ⚡ Reálné nabíjení/vybíjení dnes
  - 🔋 Live procenta a výkon

- **Power flow:**
  - ☀️ Reálný solární výkon
  - 🏠 Skutečná spotřeba domu
  - 🔌 Živý import/export sítě
  - 🔋 Aktuální battery výkon

### 🔧 Technické vylepšení

- **Lepší error handling**

  - Kontrola dostupnosti OigCloudDashboard
  - Fallback error page při selhání
  - Detailní console logging

- **Vylepšená inicializace**
  - Správné pořadí načítání scriptů
  - Graceful degradation při chybách
  - Better debugging info

### 📱 UX vylepšení zachována

- ✅ Real-time updates (15s)
- ✅ HA theme detection
- ✅ Responsive design
- ✅ Smooth animace
- ✅ 4 viewing modes

## 🚀 Instalace

### Automatická (preferovaná):

```bash
./deploy_to_ha.sh full
```

### Manuální (při SSH problémech):

1. Zkopírovat `dashboard-switcher-enhanced.js` do `/config/www/oig_cloud_static/`
2. Zkopírovat `dashboard-styles-enhanced.css` do `/config/www/oig_cloud_static/`
3. Aktualizovat `dashboard.html` s enhanced odkazy
4. Restart HA + clear cache

## 📊 Co očekávat

### ✅ Správně fungující:

- Dashboard switcher s 4 tabu
- Reálná data ze sensorů (nebo "--" pokud nedostupné)
- Animované flow diagramy podle skutečných toků
- Live aktualizace každých 15 sekund
- Responsive design na všech zařízeních

### ❌ Nemělo by být:

- Žádné hardcoded fake hodnoty
- Žádné nesmyslné údaje typu "247 cyklů"
- Žádné zmrazené hodnoty co se nemění

## 🔍 Troubleshooting

### Console chyby:

```javascript
// Správný výstup:
"Enhanced Dashboard Switcher initialized successfully";

// Problém:
"OigCloudDashboard class not found!";
```

### Řešení častých problémů:

1. **Dashboard se nenačte** → Ctrl+Shift+R (clear cache)
2. **Chybí data** → Zkontrolovat sensory v HA
3. **Chyba v console** → Zkontrolovat pořadí scriptů

---

**Tato verze odstraňuje všechny hardcoded hodnoty a zobrazuje pouze reálná data z Home Assistant sensorů.**
