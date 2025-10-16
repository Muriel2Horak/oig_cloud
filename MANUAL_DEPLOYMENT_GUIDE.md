# 🔧 Manuální deployment - SSH problémy

## ❌ Problém

SSH deployment selhává s chybou "Permission denied" - soubory se nenasadily do HA.

## 🚀 Řešení: Manuální kopírování

### Krok 1: Připrav soubory k nakopírování

```bash
cd /Users/martinhorak/Downloads/oig_cloud

# Vytvoř balíček pro ruční deploy
tar -czf manual_deploy.tar.gz \
  custom_components/oig_cloud/www/dashboard-switcher.js \
  custom_components/oig_cloud/www/dashboard-styles.css \
  custom_components/oig_cloud/www/dashboard.html \
  custom_components/oig_cloud/www/chart-loader.js
```

### Krok 2: Zkopíruj na HA server

```bash
# Zkopíruj balíček na HA server (pokud SSH funguje pro kopírování)
scp manual_deploy.tar.gz martin@10.0.0.143:/tmp/

# NEBO použij jiný způsob (USB, network share, atd.)
```

### Krok 3: Na HA serveru rozbal a umísti soubory

```bash
# Přihlásit se na HA server
ssh martin@10.0.0.143

# Rozbalit soubory
cd /tmp
tar -xzf manual_deploy.tar.gz

# Zkopírovat do HA
sudo docker cp custom_components/oig_cloud/www/. homeassistant:/config/www/oig_cloud_static/

# Restartovat HA
sudo docker restart homeassistant
```

### Alternativní způsob přes File Editor

1. **Otevřít File Editor** v Home Assistant
2. **Přejít do** `/config/www/oig_cloud_static/`
3. **Nahradit soubory:**
   - `dashboard-switcher.js`
   - `dashboard-styles.css`
   - `dashboard.html`

## 🔍 Verifikace nasazení

### Zkontroluj, že soubory existují:

```bash
# Na HA serveru
sudo docker exec homeassistant ls -la /config/www/oig_cloud_static/

# Mělo by obsahovat:
# dashboard-switcher.js (nová verze s graphical flow)
# dashboard-styles.css (nová verze s animacemi)
# dashboard.html (aktualizovaný)
```

### Test v prohlížeči:

1. **Otevři dashboard** v HA
2. **Otevři F12 Console**
3. **Hledej zprávy:**
   ```
   ✅ "Enhanced Dashboard Switcher initialized successfully"
   ❌ "OigCloudDashboard class not found!"
   ```

## 🎯 Co očekávat po správném nasazení

### Vizuální změny:

- **Nový grafický flow diagram** místo jednoduchých karet
- **SVG ikony** pro solár, baterii, síť, dům
- **Animované částice** pohybující se po linkách
- **Barevné gradient pozadí** u jednotlivých sekcí
- **Hover efekty** s 3D elevací

### Funkční změny:

- **Real-time animace** podle směru toku energie
- **Interaktivní statistiky** pod flow diagramem
- **Responsive design** na všech zařízeních
- **Žádné hardcoded hodnoty** - vše ze sensorů

## 🚨 Troubleshooting

### Problém: Dashboard se stále nenačte

**Řešení:**

1. Zkontroluj, že soubory jsou ve správné složce
2. Restartuj HA znovu
3. Vyčisti kompletně browser cache
4. Zkus jiný browser

### Problém: Console error "OigCloudDashboard not found"

**Řešení:**

1. Zkontroluj, že `dashboard.js` je také nasazený
2. Zkontroluj pořadí scriptů v `dashboard.html`

### Problém: Animace nefungují

**Řešení:**

1. Zkontroluj, že `dashboard-styles.css` je správně načten
2. Zkus disable adblocker
3. Zkontroluj, že CSS není cachovaný

---

**Po manuálním nasazení by dashboard měl vypadat úplně jinak s krásným grafickým flow diagramem! 🎨**
