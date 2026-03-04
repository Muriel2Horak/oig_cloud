# Fix Chrome Cache - Kompletní řešení

## Problém
- ✅ V Safari: správný 3-sloupcový layout
- ✅ V Chrome Inkognito: správný layout
- ❌ V Chrome normální okno: starý 2-sloupcový layout (i po Hard Reload)

## Příčina
Chrome si cachuje data ve více vrstvách:
1. HTTP cache (soubory)
2. **Service Workers** (offline cache)
3. **Application Storage** (localStorage, IndexedDB)

## Kompletní řešení

### Krok 1: Otevřete DevTools
1. Otevřete V2 Dashboard v Chrome
2. Stiskněte **F12**

### Krok 2: Vyčistěte Application Data
1. V DevTools přejděte na záložku **"Application"**
2. V levém menu klikněte na **"Storage"** (úplně dole)
3. Rozklikněte **"Clear site data"**
4. **ZAŠKRTNĚTE VŠECHNY POLOŽKY:**
   - ☑ Cookies and site data
   - ☑ Cache storage
   - ☑ Application cache (deprecated)
   - ☑ Local and session storage
   - ☑ IndexedDB
   - ☑ Web SQL (deprecated)
5. Klikněte **"Clear site data"**

### Krok 3: Unregister Service Workers (DŮLEŽITÉ!)
1. Stále v záložce **"Application"**
2. V levém menu najděte **"Service Workers"**
3. Pokud vidíte nějaké registrované Service Workers, klikněte na **"Unregister"** u každého z nich
4. Pokud je tam položka pro `oig_cloud_static_v2`, určitě ji **Unregister**

### Krok 4: Disable Cache + Hard Reload
1. V DevTools zůstaňte na záložce **"Network"**
2. **Zaškrtněte** checkbox **"Disable cache"** (nahoře v Network tab)
3. **NECHTE DevTools OTEVŘENÉ**
4. **Pravým tlačítkem na ikonu Refresh** (⟳ vedle URL)
5. Vyberte: **"Empty Cache and Hard Reload"**

### Krok 5: Zavřete a znovu otevřete prohlížeč
1. **Zavřete Chrome ÚPLNĚ** (všechna okna)
2. Otevřete nové okno Chrome
3. Přihlaste se do HA
4. Otevřete V2 Dashboard

---

## Rychlá varianta (jednodušší)

### V Chrome URL bar zadejte:
```
chrome://serviceworker-internals/
```

1. V seznamu najděte `ha.muriel-cz.cz` nebo `oig_cloud`
2. Klikněte **"Unregister"** u všech souvisejících Service Workers
3. Zavřete Chrome
4. Otevřete znovu a načtěte dashboard

---

## Alternativa: Chrome Settings

1. **⋮ Menu** → **Settings** → **Privacy and security**
2. **"Site Settings"**
3. Najděte **"View permissions and data stored across sites"**
4. Vyhledejte: `ha.muriel-cz.cz`
5. Klikněte na web → **"Clear data"**
6. Potvrďte a zavřete Chrome
7. Otevřete znovu

---

## Diagnostika v Chrome DevTools

### Zkontrolujte co je načteno:
1. **F12** → **Network** tab
2. **Disable cache** ☑
3. Obnovte stránku (**Ctrl+Shift+R**)
4. Najděte soubor `index.js` v seznamu
5. Klikněte na něj → **Response** tab
6. Hledejte text: `flow-tiles-left`
   - ✅ **Pokud najdete** = nová verze SE načítá (problém je v browseru)
   - ❌ **Pokud nenajdete** = stará verze (problém na serveru - ale to není náš případ, Safari funguje)

### Zkontrolujte Service Workers:
1. **F12** → **Application** tab
2. Levé menu: **Service Workers**
3. Mělo by být: **"No service workers"** nebo pouze HA core worker
4. Pokud vidíte worker pro `oig_cloud_static_v2` → **Unregister**

---

## Pokud nic nepomůže

### Nucené vyčištění všeho:
```
1. chrome://settings/clearBrowserData
2. Časový rozsah: "All time"
3. Zaškrtněte VŠE
4. Clear data
5. Zavřete Chrome
6. Otevřete znovu
```

⚠️ **Varování:** Toto vás odhlásí ze všech webů a vymaže všechna hesla uložená v prohlížeči.

---

## Potvrzení úspěchu

Po vyčištění byste měli vidět **stejný layout jako v Safari**:
- Levý sloupec: Dlaždice (tiles)
- Střední sloupec: Flow diagram
- Pravý sloupec: Ovládací panel

---

**Vytvořeno:** 2026-02-16  
**Pro:** OIG Dashboard V2 deployment
