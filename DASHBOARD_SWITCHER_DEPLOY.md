# 🚀 OIG Cloud Dashboard Switcher - Rychlý deployment

## TL;DR - Nasaďte Dashboard Switcher hned teď!

```bash
# Nasadit pouze Dashboard Switcher (rychlé, bezpečné):
./deploy_to_ha.sh dashboard

# Nebo nasadit vše včetně switcheru:
./deploy_to_ha.sh full
```

## Co získáte?

### 🎯 4 různé pohledy na energetická data:

1. **🏠 Základní přehled** - Kompletní energetické toky s gauge vizualizací
2. **⚡ Minimální** - Pouze nejdůležitější hodnoty, mobilně optimalizované
3. **📊 Pokročilé grafy** - Původní Apex Charts s predikcemi
4. **🔋 Baterie & Optimalizace** - Připraveno pro battery prediction

### ✨ Klíčové funkce:

- 🔄 **Přepínání tabami** - Jeden klik, jiný pohled
- 💾 **Automatické uložení** - Pamatuje si váš oblíbený pohled
- 📱 **Mobilně optimalizované** - Perfektní na telefonu i tabletu
- 🌙 **Dark/Light téma** - Automatická detekce nebo ruční přepnutí
- 🔒 **Bezpečné** - Vytváří zálohy, lze vrátit změny

## Před nasazením

### Ověřte, že máte:

- ✅ Funkční OIG Cloud integraci
- ✅ Přístup k dashboard URL: `http://HA_IP:8123/oig_cloud_dashboard?entry_id=X&inverter_sn=Y`
- ✅ SSH přístup k HA systému

### Zkontrolujte konfiguraci:

```bash
# Otevřete deploy_to_ha.sh a ověřte:
HA_HOST="10.0.0.143"      # ← Vaše HA IP adresa
HA_USER="martin"          # ← Váš SSH uživatel
HA_PASS="password"        # ← Váš SSH heslo
CONTAINER_NAME="homeassistant"  # ← Název HA containeru
```

## Nasazení krok za krokem

### Varianta A: Pouze Dashboard Switcher (doporučeno na začátek)

```bash
cd /path/to/oig_cloud
./deploy_to_ha.sh dashboard
```

**Výhody:**

- ⚡ Rychlé (30 sekund)
- 🛡️ Bezpečné (nedotýká se Python kódu)
- 🔄 Vratné (automatická záloha)

### Varianta B: Kompletní nasazení

```bash
cd /path/to/oig_cloud
./deploy_to_ha.sh full
```

**Co se nasadí:**

- 🔧 Celá OIG Cloud integrace
- 🎯 Dashboard Switcher
- 📚 Kompletní dokumentace

## Po nasazení

### 1. Vyčistěte browser cache

```bash
# Chrome/Firefox/Safari:
Ctrl+F5 (Windows/Linux)
Cmd+Shift+R (Mac)
```

### 2. Otevřete dashboard

```
http://YOUR_HA_IP:8123/oig_cloud_dashboard?entry_id=YOUR_ENTRY&inverter_sn=YOUR_SN
```

### 3. Uvidíte nové tabs nahoře:

```
🏠 Základní přehled | ⚡ Minimální | 📊 Pokročilé grafy | 🔋 Baterie
```

## Řešení problémů

### Tabs se nezobrazují?

```bash
# 1. Zkontrolujte že se soubory nasadily:
ssh YOUR_USER@YOUR_HA_IP "docker exec homeassistant ls -la /config/custom_components/oig_cloud/www/dashboard-*"

# 2. Vyčistěte cache:
Ctrl+F5

# 3. Zkontrolujte browser konzoli:
F12 → Console → hledejte chyby
```

### Chcete vrátit původní dashboard?

```bash
# SSH do HA:
ssh YOUR_USER@YOUR_HA_IP

# Najít zálohu:
docker exec homeassistant ls -lt /config/custom_components/oig_cloud/www/dashboard_backup_*

# Obnovit:
docker exec homeassistant cp /config/custom_components/oig_cloud/www/dashboard_backup_NEJNOVĚJŠÍ.html /config/custom_components/oig_cloud/www/dashboard.html
```

### Jiné problémy?

```bash
# Zobrazit help:
./deploy_to_ha.sh --help

# Zkontrolovat HA logy:
ssh YOUR_USER@YOUR_HA_IP "docker logs homeassistant | tail -50"
```

## Další možnosti

### Klávesové zkratky v dashboardu:

- `1` = Základní přehled
- `2` = Minimální
- `3` = Pokročilé grafy
- `4` = Baterie & Optimalizace
- `T` = Přepnout tmavé/světlé téma

### URL pro konkrétní pohled:

```
http://HA_IP:8123/oig_cloud_dashboard?entry_id=X&inverter_sn=Y&view=minimal
```

### Přidání na plochu telefonu:

1. Otevřete dashboard v Safari/Chrome
2. "Přidat na plochu"
3. Spouštějte jako aplikaci

## Co dál?

### Sledujte aktualizace:

- 📢 GitHub repozitář pro nové funkce
- 🔄 HACS pro automatické aktualizace
- 📚 Dokumentace v `/config/custom_components/oig_cloud/docs/`

### Pošlete zpětnou vazbu:

- 🐛 Problémy: GitHub Issues
- 💡 Nápady: GitHub Discussions
- ⭐ Líbí se? Dejte hvězdičku na GitHubu!

---

**🎉 Užijte si nový dashboard! Za 2 minuty budete mít 4x lepší pohled na vaše energetická data.**
