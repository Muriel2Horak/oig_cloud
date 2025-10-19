# ČEZ Battery Box - OIG Cloud Integrace pro Home Assistant

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
![GitHub manifest version (path)](https://img.shields.io/github/manifest-json/v/psimsa/oig_cloud?filename=custom_components%2Foig_cloud%2Fmanifest.json)
![GitHub Release Date - Published_At](https://img.shields.io/github/release-date/psimsa/oig_cloud)
[![Validate with hassfest](https://github.com/psimsa/oig_cloud/actions/workflows/hassfest.yml/badge.svg)](https://github.com/psimsa/oig_cloud/actions/workflows/hassfest.yml)
[![HACS Action](https://github.com/psimsa/oig_cloud/actions/workflows/hacs.yml/badge.svg)](https://github.com/psimsa/oig_cloud/actions/workflows/hacs.yml)
[![CodeFactor](https://www.codefactor.io/repository/github/psimsa/oig_cloud/badge)](https://www.codefactor.io/repository/github/psimsa/oig_cloud)

Kompletní Home Assistant integrace pro ČEZ Battery Box přes OIG Cloud API. Monitorování, řízení a automatizace vašeho domácího úložiště energie.

---

## 🚀 Hlavní Funkce

### 📊 **Monitorování v reálném čase**
- Aktuální výkon a stav baterie (SOC, napětí, teplota)
- FVE výroba a domácí spotřeba
- Import/export elektrické sítě
- Sledování bojleru a dalších zařízení

### ⚡ **Integrace s Home Assistant Energy**
- Přímá podpora pro Energy Dashboard
- Statistiky výroby, spotřeby a toků energie
- Dlouhodobé ukládání dat

### 🎛️ **Pokročilé Řízení**
- Změna pracovního režimu (Home, Home+, Grid, UPS)
- Nastavení přetoků do sítě
- Řízení bojleru
- Podpora více Battery Boxů na jednom účtu

### 🛡️ **ServiceShield™ Ochrana**
- Automatická ochrana proti nechtěným změnám
- Configurable timeout protection (5-60 minut)
- Detekce externích změn režimu
- Live monitoring změn

### 🧙‍♂️ **Moderní Průvodce Nastavením**
- Wizard s postupnými kroky
- Kontextová nápověda
- Rychlé nastavení za 30 sekund
- Pokročilá konfigurace pro power-usery

### 📈 **Rozšířené Statistiky**
- Denní, měsíční a roční přehledy
- Nabíjení baterie z FVE vs. ze sítě
- Přesné výpočty pomocí Riemannovy integrace
- Automatické resety statistik

---

## 📋 Požadavky

### ✅ Povinné
- **Home Assistant** 2024.1.0 nebo novější
- **ČEZ Battery Box** s přístupem k OIG Cloud
- **Aktivní "Živá data"** v mobilní aplikaci OIG Cloud
  - ⚠️ **Bez živých dat integrace nefunguje!**
  - 📖 [Jak zapnout živá data](./docs/LIVE_DATA_REQUIREMENT.md)

### 🔧 Doporučené
- HACS pro snadnou instalaci a aktualizace

---

## 📥 Instalace

### Pomocí HACS (Doporučeno)

1. Otevřete **HACS** → **Integrations**
2. Klikněte na **⋮** (tři tečky) → **Custom repositories**
3. Přidejte: `https://github.com/psimsa/oig_cloud`
4. Kategorie: **Integration**
5. Vyhledejte **"OIG Cloud"** a klikněte na **Download**
6. **Restartujte Home Assistant**

### Manuálně

1. Stáhněte nejnovější release
2. Rozbalte do `custom_components/oig_cloud/`
3. Restartujte Home Assistant

---

## ⚙️ Konfigurace

### 🧙‍♂️ Průvodce nastavením (Doporučeno)

1. **Nastavení** → **Zařízení a služby** → **+ Přidat integraci**
2. Vyhledejte **"OIG Cloud"**
3. Zvolte **"🧙‍♂️ Průvodce nastavením"**
4. Postupujte podle kroků:
   - ✅ Přihlášení a ověření
   - 🎯 Výběr modulů (Energy, Bojler, Shield...)
   - ⏱️ Nastavení intervalů aktualizace
   - 🎨 Detailní konfigurace funkcí
   - 📋 Souhrn a dokončení

⏱️ **Trvání:** 2-10 minut (podle zvolených funkcí)

### ⚡ Rychlé nastavení

1. Stejný postup jako u wizardu
2. Zvolte **"⚡ Rychlé nastavení"**
3. Zadejte pouze přihlašovací údaje
4. Vše ostatní se nastaví automaticky

⏱️ **Trvání:** 30 sekund

📖 **Detailní dokumentace:** [Wizard Quick Start](./docs/WIZARD_QUICK_START.md)

---

## 📚 Dokumentace

### 👤 Pro Uživatele
- **[Konfigurace](./docs/user/CONFIGURATION.md)** - Detailní nastavení integrace
- **[Dashboard](./docs/user/DASHBOARD.md)** - Použití energetického dashboardu
- **[Entity](./docs/user/ENTITIES.md)** - Seznam všech senzorů a ovladačů
- **[Služby](./docs/user/SERVICES.md)** - Volání služeb pro řízení Battery Boxu
- **[ServiceShield™](./docs/user/SHIELD.md)** - Ochrana před nechtěnými změnami
- **[Automatizace](./docs/user/AUTOMATIONS.md)** - Příklady automatizací
- **[FAQ](./docs/user/FAQ.md)** - Časté dotazy
- **[Troubleshooting](./docs/user/TROUBLESHOOTING.md)** - Řešení problémů

### 🔧 Pro Vývojáře
- **[Architecture](./docs/dev/DEVICE_ARCHITECTURE_ANALYSIS.md)** - Architektura integrace
- **[Multi-Device Support](./docs/dev/MULTI_DEVICE_ANALYSIS.md)** - Podpora více Battery Boxů
- **[API Communication](./docs/dev/API_COMMUNICATION_REPORT.md)** - Komunikace s OIG Cloud API
- **[Vendoring Guide](./docs/dev/VENDORING_GUIDE.md)** - Správa závislostí
- **[Module Dependencies](./docs/dev/MODULE_DEPENDENCIES.md)** - Závislosti mezi moduly
- **[Development Setup](./docs/dev/VENDORING_IMPLEMENTATION_SUMMARY.md)** - Nastavení vývojového prostředí

---

## 🎯 Klíčové Moduly

### 🔋 Battery (Základní modul)
Vždy aktivní - poskytuje data o baterii, FVE, spotřebě a síti.

### ⚡ Energy Dashboard
Statistické entity pro Energy Dashboard v Home Assistant.

### 🔥 Boiler (Bojler)
Monitoring a řízení elektrického bojleru.

### 🛡️ ServiceShield™
Ochrana proti nechtěným změnám pracovního režimu.

### 📊 Extended Stats
Rozšířené statistiky (denní, měsíční, roční).

---

## 🔧 Služby (Services)

### `oig_cloud.set_box_mode`
Nastavení pracovního režimu Battery Boxu.

**Režimy:**
- `home` - Domácí režim
- `home1` - Home+ (priorita bojler)
- `home2` - Home+ (priorita baterie)
- `grid` - Síťový režim
- `ups` - UPS režim
- `homeups` - Domácí + UPS

### `oig_cloud.set_grid_delivery`
Nastavení maximálního přetoku do sítě (0-10000 W).

### `oig_cloud.set_boiler_mode`
Zapnutí/vypnutí bojleru.

### `oig_cloud.set_formating_mode`
Formátování baterie (⚠️ Vymaže data!).

📖 **Detailní dokumentace služeb:** [Services Documentation](./docs/user/SERVICES.md)

---

## 🆕 Co Je Nového ve Verzi 2.0.0-beta

### 🔄 **Multi-Device Support**
- Podpora více Battery Boxů na jednom OIG účtu
- Device selector ve službách
- Automatické čištění osiřelých zařízení

### 📦 **Vendored Dependencies**
- OIG Cloud Client nyní jako vendored modul
- Žádné externí Python závislosti
- Rychlejší instalace

### 🧙‍♂️ **Wizard Configuration Flow**
- Moderní průvodce nastavením
- Progresivní kroky s validací
- Rychlé nastavení vs. pokročilá konfigurace

### 🛡️ **ServiceShield™ Vylepšení**
- Configurable timeout (5-60 minut)
- Live monitoring změn
- Lepší detekce externích změn

### 🔧 **Další Vylepšení**
- ETag caching pro optimalizaci API komunikace
- Jitter v pollingu pro rozprostření zátěže
- Lepší error handling a logování
- Testovací pokrytí

📖 **Kompletní changelog:** [CHANGELOG.md](./CHANGELOG.md)

---

## 🐛 Známé Problémy

### API vrací chybu 500
✅ **Řešení:** Zapněte "Živá data" v mobilní aplikaci OIG Cloud

### Entity jsou nedostupné
✅ **Řešení:** Zkontrolujte, že je integrace správně nakonfigurována a OIG Cloud je dostupný

### ServiceShield blokuje změny
✅ **Řešení:** Počkejte na vypršení timeout nebo upravte timeout v Options

📖 **Více problémů:** [Troubleshooting](./docs/user/TROUBLESHOOTING.md)

---

## 🤝 Přispívání

Příspěvky jsou vítány! Prosím:

1. Fork repozitář
2. Vytvořte feature branch (`git checkout -b feature/amazing-feature`)
3. Commit změny (`git commit -m 'feat: Add amazing feature'`)
4. Push do branch (`git push origin feature/amazing-feature`)
5. Otevřete Pull Request

### Development Setup

```bash
# Clone repo
git clone https://github.com/psimsa/oig_cloud.git
cd oig_cloud

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements-dev.txt

# Run tests
pytest tests/
```

---

## 📜 Licence

Tento projekt je licencován pod [MIT License](./LICENSE).

---

## 🙏 Poděkování

- **ČEZ** za Battery Box a OIG Cloud API
- **Home Assistant** komunita
- Všem přispěvatelům a testerům

---

## 📞 Podpora

- **🐛 Bug Reports:** [GitHub Issues](https://github.com/psimsa/oig_cloud/issues)
- **💡 Feature Requests:** [GitHub Discussions](https://github.com/psimsa/oig_cloud/discussions)
- **📖 Dokumentace:** [docs/](./docs/)

---

**Vyrobeno s ❤️ pro Home Assistant a ČEZ Battery Box komunitu**
