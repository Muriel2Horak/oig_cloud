# 🚀 Quick Start: Wizard Config Flow

## TL;DR - Co se změnilo?

✨ **Nový wizard průvodce** pro snadnější nastavení integrace OIG Cloud!

### Před (starý flow):

```
❌ Jeden velký formulář se všemi parametry
❌ Složité, matoucí
❌ Těžko se opravují chyby
```

### Teď (nový wizard):

```
✅ Postupné kroky (jako instalace aplikace)
✅ Pouze relevantní parametry
✅ Možnost vrátit se zpět
✅ Souhrn před dokončením
```

## 🎯 Jak to použít?

### 1. Přidání integrace

**Home Assistant** → **Nastavení** → **Zařízení a služby** → **+ Přidat integraci** → **OIG Cloud**

### 2. Výběr typu nastavení

Zobrazí se 3 možnosti:

```
┌─────────────────────────────────────────┐
│  Způsob nastavení:                      │
├─────────────────────────────────────────┤
│  ○ 🧙‍♂️ Průvodce (doporučeno)            │
│  ○ ⚡ Rychlé nastavení                  │
│  ○ 📥 Import z YAML                     │
└─────────────────────────────────────────┘
```

### 3A. Průvodce (doporučeno)

**Krok 1: Úvod**

- Informace o průvodci
- [Odeslat]

**Krok 2: Přihlášení** (Krok 1/5 ▓░░░░)

```
E-mail: ________________
Heslo: ________________
✅ Mám zapnutá Živá data
```

**Krok 3: Výběr modulů** (Krok 2/5 ▓▓░░░)

```
□ 📊 Statistiky (doporučeno)
□ ☀️ Solární předpověď
□ 🔋 Predikce baterie
□ 💰 Cenové senzory
□ 📈 Spotové ceny (doporučeno)
□ ⚡ Rozšířené senzory (doporučeno)
□ 📊 Dashboard
```

**Krok 4: Intervaly** (Krok 3/5 ▓▓▓░░)

```
Základní data: [30] sekund (min. 30s)
Rozšířená data: [300] sekund (min. 300s)
```

💡 **Proč minimální limity?**

- **30 sekund** pro základní data = ochrana OIG Cloud API před přetížením
- **300 sekund** pro rozšířená data = snížení zátěže na servery
- Kratší intervaly mohou způsobit nestabilitu API

**Krok 5+: Detaily zapnutých modulů**

- Pouze pro moduly, které jste zapnuli
- Automaticky se přeskočí vypnuté moduly

**Poslední: Souhrn** (Krok 5/5 ▓▓▓▓▓)

```
✅ Přehled konfigurace
✅ Potvrzení
```

### 3B. Rychlé nastavení

Pro rychlou instalaci:

```
E-mail: ________________
Heslo: ________________
✅ Mám zapnutá Živá data

[Dokončit] → Hotovo!
```

Výchozí hodnoty:

- ✅ Statistiky: ZAP
- ✅ Spotové ceny: ZAP
- ✅ Rozšířené senzory: ZAP
- ❌ Solar: VYP
- ❌ Baterie: VYP
- ❌ Pricing: VYP
- ❌ Dashboard: VYP

## ⚠️ DŮLEŽITÉ: Živá data

**MUSÍTE** mít v mobilní aplikaci OIG Cloud zapnutou funkci **"Živá data"**!

### Jak zapnout:

1. Otevřete aplikaci OIG Cloud
2. **Menu** → **Nastavení**
3. Zapněte přepínač **"Živá data"**
4. Počkejte 1-2 minuty
5. Spusťte wizard

Bez toho wizard selže s chybou:

```
❌ V OIG Cloud aplikaci nejsou zapnutá 'Živá data'
```

## 🔄 Vrácení zpět

Pokud chcete opravit předchozí krok:

- Použijte tlačítko **"Zpět"** v prohlížeči
- Wizard si pamatuje vaše volby
- Můžete měnit cokoliv

## 💡 Tipy

### Doporučená konfigurace pro začátečníky:

```
✅ Statistiky
✅ Spotové ceny
✅ Rozšířené senzory
❌ Ostatní (můžete přidat později)
```

### Pokročilá konfigurace:

```
✅ Vše kromě baterie (experimentální)
```

### Minimalistická konfigurace:

```
Použijte "Rychlé nastavení"
```

## 🔧 Změna konfigurace později

Po instalaci můžete kdykoliv změnit:

**Integrace** → **OIG Cloud** → **Možnosti**

Vyberte kategorii:

- 🔧 Základní konfigurace
- ⚡ Rozšířené senzory
- 📊 Statistiky
- ☀️ Solární předpověď
- 🔋 Predikce baterie
- 💰 Cenové senzory
- 📈 Dashboard

## 🐛 Řešení problémů

### "Nepodařilo se připojit"

- ✅ Zkontrolujte e-mail a heslo
- ✅ Zkuste se přihlásit do mobilní aplikace
- ✅ Zkontrolujte internet

### "Živá data nejsou zapnutá"

- ✅ Zapněte je v aplikaci (viz výše)
- ✅ Počkejte 1-2 minuty
- ✅ Zkuste znovu

### "Neplatný API klíč" (Solar)

- ✅ Získejte klíč na https://forecast.solar
- ✅ Zkontrolujte, že je zkopírovaný celý

### Wizard nejde dokončit

- ✅ Zkuste "Rychlé nastavení"
- ✅ Nahlaste issue na GitHub

## 📚 Další dokumentace

- [Kompletní dokumentace wizardu](./WIZARD_CONFIG_FLOW.md)
- [Uživatelská příručka](./uzivatelska_dokumentace.md)
- [Dashboard setup](./DASHBOARD_QUICK_START.md)

## ⏱️ Časová náročnost

- **Rychlé nastavení:** 30 sekund
- **Wizard (minimum):** 2 minuty
- **Wizard (plná konfigurace):** 5-10 minut

## 🎉 To je vše!

Po dokončení wizardu máte plně funkční integraci OIG Cloud!

### Co dál?

1. ✅ Přejděte na **Přehled** - uvidíte nové senzory
2. ✅ Vytvořte dashboard s grafy
3. ✅ Nastavte automatizace
4. ✅ Užívejte si data! 📊

---

**Pro více info:** [Celá dokumentace](./WIZARD_CONFIG_FLOW.md)
**Problémy?** [GitHub Issues](https://github.com/psimsa/oig_cloud/issues)
