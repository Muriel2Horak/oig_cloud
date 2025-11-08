# Frontend Development Rules - OIG Cloud Dashboard

**Platné od**: 2025-11-08
**Povinné pro**: Všechny členy týmu + AI asistenty

---

## 🚨 KRITICKÁ PRAVIDLA - VŽDY DODRŽUJ

### 1. STRUKTURA SOUBORŮ

#### ✅ POVOLENÉ

```text
custom_components/oig_cloud/www/
├── dashboard.html                    # JEDINÝ produkční HTML soubor
│
├── css/                              # VŠECHNY CSS soubory MUSÍ být zde
│   ├── 00-variables.css
│   ├── components/
│   ├── features/
│   └── utils/
│
├── js/                               # VŠECHNY JS soubory MUSÍ být zde
│   ├── core/
│   ├── features/
│   └── components/
│
└── fragments/                        # HTML fragmenty (ne kompletní stránky)
```

#### ❌ ZAKÁZANÉ

```text
❌ www/dashboard-*.css (mimo css/)
❌ www/dashboard-*.js (mimo js/)
❌ www/*.backup, *.bak, *.old
❌ www/dashboard-detail-tabs.html (duplicitní HTML)
❌ Více než jeden produkční HTML soubor
```

---

### 2. CSS PRAVIDLA

#### 2.1 Umístění CSS souborů

**✅ SPRÁVNĚ**:

```text
css/features/detail-tabs.css          # Feature-specific
css/components/tiles.css              # Reusable component
css/utils/animations.css              # Utilities
```

**❌ ŠPATNĚ**:

```text
dashboard-detail-tabs.css             # V kořeni www/
detail-tabs.css                       # V kořeni www/
```

#### 2.2 Pojmenování CSS tříd

**✅ SPRÁVNĚ**:

```css
/* BEM metodologie */
.block-header { }
.block-header__title { }
.block-header--active { }

/* Namespace pro features */
.detail-tabs__container { }
.boiler-tab__control { }
```

**❌ ŠPATNĚ**:

```css
/* Obecné názvy bez kontextu */
.header { }
.title { }
.container { }
```

#### 2.3 Duplicitní CSS třídy

**PRAVIDLO**: Před vytvořením nové CSS třídy VŽDY zkontroluj:

```bash
# Zkontroluj, jestli třída už existuje
grep -r "\.block-header" custom_components/oig_cloud/www/css/
```

**Pokud existuje**:

1. Použij existující třídu
2. Nebo přejmenuj na specifičtější (např. `.detail-block-header`)
3. **NIKDY** nevytvářej duplicitní definici!

---

### 3. HTML PRAVIDLA

#### 3.1 Jeden produkční HTML soubor

**PRAVIDLO**: `dashboard.html` je JEDINÝ entry point

```python
# __init__.py
dashboard_url = f"/oig_cloud_static/dashboard.html?..."
```

#### 3.2 HTML fragmenty

**Pokud potřebuješ HTML kód pro část stránky**:

1. Generuj HTML v JavaScriptu (preferovaný způsob)
2. NEBO ulož do `fragments/` s jasným README

**✅ SPRÁVNĚ**:

```javascript
// dashboard-timeline.js
renderModeBlocks(blocks) {
    return blocks.map(block => `
        <div class="mode-block">...</div>
    `).join('');
}
```

**❌ ŠPATNĚ**:

```text
www/dashboard-detail-tabs.html  # Samostatný HTML soubor, který se nepoužívá
```

---

### 4. JAVASCRIPT PRAVIDLA

#### 4.1 Umístění JS souborů

**✅ SPRÁVNĚ**:

```text
js/core/dashboard-core.js         # Core funkce
js/features/timeline.js           # Feature modul
js/components/dialog.js           # Reusable component
```

**❌ ŠPATNĚ**:

```text
dashboard-timeline.js             # V kořeni www/
timeline.js                       # V kořeni www/
```

#### 4.2 CSS třídy v JavaScriptu

**PRAVIDLO**: Před použitím CSS třídy v JS, ujisti se, že je definována

```javascript
// ✅ SPRÁVNĚ: Zkontroluj, že třída existuje v CSS
function renderBlock() {
    return `<div class="block-header">...</div>`;
    //                  ↑
    //                  Tato třída MUSÍ být v css/features/detail-tabs.css
}
```

**❌ ŠPATNĚ**:

```javascript
// Použiješ třídu, která není v žádném CSS
return `<div class="my-new-class">...</div>`;
//               ↑
//               Kde je CSS pro tuto třídu?
```

---

### 5. KONTROLA PŘED COMMITEM

#### Checklist před každým commitem:

```bash
# 1. Žádné backup soubory
find custom_components/oig_cloud/www -name "*.backup" -o -name "*.bak" -o -name "*.old"
# Očekávaný výstup: PRÁZDNÝ

# 2. Všechny CSS v css/
find custom_components/oig_cloud/www -maxdepth 1 -name "*.css" ! -name "dashboard-styles.css"
# Očekávaný výstup: PRÁZDNÝ (kromě dashboard-styles.css přechodně)

# 3. Všechny JS v js/ (až po migraci)
# find custom_components/oig_cloud/www -maxdepth 1 -name "dashboard-*.js"
# Očekávaný výstup: PRÁZDNÝ

# 4. Jen jeden produkční HTML
find custom_components/oig_cloud/www -maxdepth 1 -name "*.html" ! -name "dashboard.html"
# Očekávaný výstup: PRÁZDNÝ
```

---

### 6. WORKFLOW PRO PŘIDÁNÍ NOVÉ FUNKCE

#### Scénář: Přidáváš novou "Weather Widget" komponentu

**Krok 1**: Vytvoř CSS soubor

```bash
# CSS pro novou komponentu
touch custom_components/oig_cloud/www/css/components/weather-widget.css
```

```css
/* css/components/weather-widget.css */
.weather-widget { }
.weather-widget__icon { }
.weather-widget__temp { }
```

**Krok 2**: Přidej import do dashboard.html

```html
<!-- dashboard.html -->
<link rel="stylesheet" href="css/components/weather-widget.css">
```

**Krok 3**: Vytvoř JS modul

```bash
touch custom_components/oig_cloud/www/js/components/weather-widget.js
```

```javascript
// js/components/weather-widget.js
function renderWeatherWidget(data) {
    return `
        <div class="weather-widget">
            <div class="weather-widget__icon">${data.icon}</div>
            <div class="weather-widget__temp">${data.temp}°C</div>
        </div>
    `;
}
```

**Krok 4**: Přidej import do dashboard.html

```html
<!-- dashboard.html -->
<script src="js/components/weather-widget.js"></script>
```

**Krok 5**: Testuj

```bash
./deploy_to_ha.sh
```

**Krok 6**: Commit

```bash
git add css/components/weather-widget.css
git add js/components/weather-widget.js
git add dashboard.html
git commit -m "feat: Add weather widget component"
```

---

### 7. REFAKTOROVÁNÍ EXISTUJÍCÍHO KÓDU

#### Pokud zjistíš duplicitní CSS/HTML:

**STOP! Neupravuj hned!**

1. Vytvoř issue / task
2. Analyzuj všechna místa použití
3. Vytvoř plán migrace
4. Testuj na dev prostředí
5. Teprve pak commituj

**✅ PŘÍKLAD**:

```text
ZJIŠTĚNÍ: .mode-block je definována v 2 souborech
├── css/detail-tabs.css
└── dashboard-detail-tabs.css (nepoužívá se)

AKCE:
1. Ověř, který soubor se používá v produkci (dashboard.html)
2. Smaž nepoužívaný soubor
3. Zkontroluj, že nic není rozbitě
4. Commit s jasným popisem
```

---

### 8. AI ASISTENT PRAVIDLA

**Pokud jsi AI asistent a upravuješ frontend kód**:

#### VŽDY:

1. Zkontroluj, který CSS soubor se importuje v `dashboard.html`
2. Uprav POUZE ten soubor
3. NIKDY nevytvářej duplicitní CSS soubory
4. Před přidáním CSS třídy zkontroluj, jestli už neexistuje
5. Používej existující CSS třídy, pokud jsou k dispozici

#### NIKDY:

1. ❌ Nevytvářej `.backup` soubory
2. ❌ Nevytvářej CSS soubory v kořeni `www/`
3. ❌ Nevytvářej duplicitní HTML soubory
4. ❌ Neupravuj více souborů najednou bez analýzy
5. ❌ Nepředpokládej strukturu - VŽDY ji ověř

#### KONTROLA PŘED EDITACÍ:

```bash
# Krok 1: Zjisti, který HTML se používá
grep -r "\.html" custom_components/oig_cloud/__init__.py

# Krok 2: Zjisti, které CSS se importují
grep "link.*stylesheet" custom_components/oig_cloud/www/dashboard.html

# Krok 3: Uprav POUZE ty soubory, které jsou importované
```

---

### 9. CODE REVIEW CHECKLIST

Před schválením PR zkontroluj:

- [ ] Žádné backup soubory (.backup, .bak, .old)
- [ ] Žádné CSS v kořeni www/ (kromě dashboard-styles.css dočasně)
- [ ] Žádné duplicitní HTML soubory
- [ ] CSS třídy mají jasný namespace
- [ ] Všechny CSS třídy z JS mají definici v CSS
- [ ] Přidány importy do dashboard.html (pokud nové soubory)
- [ ] Testováno deployment scriptem
- [ ] Git diff neobsahuje přejmenování stejného souboru

---

### 10. PORUŠENÍ PRAVIDEL

**Co dělat, když zjistíš porušení**:

1. **Malé porušení** (1-2 soubory): Oprav okamžitě
2. **Větší porušení** (3+ souborů): Vytvoř issue, plánuj cleanup
3. **Systémové porušení**: Vytvoř refactoring plan (jako tento dokument)

**Eskalace**:

- 🟢 Malé: Oprav v aktuálním PR
- 🟡 Střední: Vytvoř samostatný cleanup PR
- 🔴 Velké: Vytvoř epic/milestone pro refactoring

---

## ODKAZY

- 📄 [FRONTEND_STRUCTURE_ANALYSIS.md](./FRONTEND_STRUCTURE_ANALYSIS.md) - Analýza současného stavu
- 📄 [FRONTEND_REFACTORING_PLAN.md](./FRONTEND_REFACTORING_PLAN.md) - Plán refaktoringu
- 📄 [DEVELOPMENT_RULES.md](./DEVELOPMENT_RULES.md) - Obecná pravidla

---

## VERZE

| Verze | Datum | Změny |
|-------|-------|-------|
| 1.0 | 2025-11-08 | Iniciální verze po analýze duplicit |

---

**Připomenutí**: Tato pravidla vznikla proto, že jsme zjistili 454 řádků duplicitního CSS a 3 nepoužívané HTML soubory. Dodržuj je, ať se to neopakuje! 🎯
