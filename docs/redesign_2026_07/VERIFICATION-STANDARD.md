# Verifikační standard (závazný pro všechny další plány F1+)

**Vznikl 2026-07-18 po reálném selhání:** Plán 3 doručil onboarding wizard, jehož kroky ② a ③
byly prázdné obrazovky odkazující do Nastavení. Prošlo to 4354 zelenými testy, dvěma koly
adversariální kritiky a security review. Uživatel to odhalil za pět minut tím, že na to klikl.

Tento dokument existuje, aby se to nemohlo opakovat.

---

## Co přesně selhalo (aby bylo jasné, proti čemu se bráníme)

`STEP_SOLAR` byl **datový objekt**, který správně odvozoval pole z registru:

```ts
export const STEP_SOLAR: RegistryStep = {
  fields: (reg) => fieldsFromRegistry(reg, 'solar'),
  visibleFields: (reg, values) => ...conditional...
};
```

Testy to ověřovaly a **právem procházely**:

```ts
expect(STEP_SOLAR.fields(FIXTURE).map(f => f.key))
  .toEqual(fieldsFromRegistry(FIXTURE, 'solar').map(f => f.key));   // ✅ PASS
```

**Jenže ten objekt nikdo nikdy nevykreslil.** Wizard místo něj renderoval větu „konfigurace se
provede v Nastavení". Datová vrstva byla hotová a správná; UI vrstva ji nikdy nezavolala.

**Diagnóza:** testy ověřovaly *kontrakt jednotky*, nikdy *kompozici*. Chyběla jediná aserce, která
spojuje data s pixely: **„vykreslený krok obsahuje N vstupních polí."**

---

## Pravidlo 1 — Akceptační kritérium = pozorovatelný výsledek uživatele

Každý úkol s uživatelským dopadem musí v plánu nést větu, co **uživatel uvidí nebo udělá**.

| ❌ Nestačí | ✅ Musí být |
|---|---|
| „komponenta odpovídá kontraktu" | „krok ② zobrazí pole provider, klíč, GPS, string1 kWp/sklon/azimut" |
| „registry-driven, no second field list" | „…a tato pole se vykreslí jako `<input>`/`<select>`, odvozená z registru" |
| „skippable, blocksDashboard=false" | „tlačítko [Otestovat] stáhne reálnou předpověď a zobrazí graf zítřka" |

## Pravidlo 2 — Zákaz čistě negativních požadavků

„Nedělej X" bez párového „musí udělat Y" je defekt zadání. Implementátor splní „no second field
list" dokonale tím, že nevykreslí nic. **Každé „ne-X" musí mít pozitivní protějšek.**

## Pravidlo 3 — Render aserce, ne kontrakt aserce

Pro každou uživatelskou obrazovku musí existovat test, který **komponentu vykreslí** a asertuje na
**vzniklý DOM** — ne na datový objekt.

```ts
// ❌ kontrakt aserce — projde i u prázdné obrazovky
expect(STEP_SOLAR.fields(reg)).toEqual(...);

// ✅ render aserce — chytí stub
const el = await fixture(html`<oig-onboarding-wizard .step=${'solar'}></oig-onboarding-wizard>`);
const inputs = el.shadowRoot.querySelectorAll('input, select');
expect(inputs.length).toBeGreaterThanOrEqual(4);
expect(el.shadowRoot.querySelector('[data-testid=solar-test]')).toBeTruthy();
```

**Minimum pro každou obrazovku:** počet interaktivních prvků > 0 a přítomnost klíčových akcí.

## Pravidlo 4 — Ověřuj jako reálný klient, ne jak se ti to hodí

- **FE deploy:** stáhnout **s `Accept-Encoding: gzip`** a porovnat s lokálním buildem.
  (`curl` bez gzipu sáhne na jiný soubor — `index.js` vs `index.js.gz` — a bude hlásit úspěch,
  zatímco prohlížeče dostávají starý bundle. Automatizováno v `deploy_to_ha.sh`.)
- **API:** ověřovat na nasazené instanci, ne na test fixture.
- Nikdy nezaměňovat „soubor na disku je správný" za „klient dostane správná data".

## Pravidlo 5 — Nezávislý akceptační reviewer

Vedle kritiků kódu musí jeden reviewer dostat zadání **„otevři to a použij jako uživatel"**, ne
„porovnej s plánem". Nesmí vidět implementaci předem. Jeho výstup je odpověď na otázky:
*Co uživatel uvidí? Co může udělat? Kde se zasekne?* — s důkazem z vykresleného UI.

## Pravidlo 6 — „Testy zelené" není důkaz funkčnosti

4354 zelených testů neřeklo nic o tom, že je obrazovka prázdná. Do GATE-STATUS smí „green" vstoupit
jen s **render důkazem** (Pravidlo 3) a **klientským důkazem** (Pravidlo 4). Bez nich je verdikt
nejvýš „unit-tested components", což **není** hotová funkce — a musí to tak být napsané.

---

## Gate checklist (povinný před verdiktem DEPLOY)

- [ ] Každý uživatelský úkol má akceptační kritérium jako pozorovatelný výsledek (P1)
- [ ] Žádný čistě negativní požadavek bez pozitivního protějšku (P2)
- [ ] Každá dotčená obrazovka má render asercí na vykreslený DOM (P3)
- [ ] FE ověřen stažením s gzip proti lokálnímu buildu (P4)
- [ ] Nezávislý akceptační reviewer otevřel UI a popsal, co uživatel vidí/udělá (P5)
- [ ] Verdikt nezaměňuje „unit-tested" za „funkční" (P6)
