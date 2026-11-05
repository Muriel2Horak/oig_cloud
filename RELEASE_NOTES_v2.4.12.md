# OIG Cloud pro Home Assistant - poznámky k vydání 2.4.12

Verze 2.4.12 přepracovává AI hodnocení na dashboardu. Místo obecných poznámek o fázích teď AI čte plán
baterie, ceny, předpověď výroby, bojler a výstrahy ČHMÚ a radí, kdy co udělat a kolik to ušetří.
Týká se jen těch, kdo mají v nastavení zapnutého poskytovatele AI (Groq, NVIDIA nebo AI Task
z Home Assistanta). Bez AI se nic nemění.

---

## 🤖 **AI hodnocení s konkrétními doporučeními**

Dosud se AI ozvala jen tehdy, když detektor zachytil skok odběru, a viděla dvě hodiny plánu dopředu.
Většina hlášení proto radila přepojit spotřebič na jinou fázi. Navíc dostávala stav baterie v kWh
pod nadpisem „SoC %“, takže psala nesmysly typu „SoC klesne na 15 %“ u plné baterie.

Nově dostane AI souhrn s reálnými čísly:

- bloky plánu Home 1 / Home UPS s nabíjením ze sítě, cenou a příplatkem proti Home 1,
- hodinovou tabulku nákupní a výkupní ceny, výroby, spotřeby, exportu, SoC a tarifu VT/NT,
- nejlevnější a nejdražší tříhodinová okna a nejlevnější čas pro pračku, myčku nebo bojler
  (hodina, kdy jde přebytek do sítě, se počítá výkupní cenou),
- předpověď FVE na dnešek, zítřek a pozítří, stav bojleru, skutečné výstrahy ČHMÚ a dnešní náklady proti plánu.

Odpověď má tři části: situaci, rizika a nejvýš tři kroky. Každý krok má čas, akci, důvod a odhad
úspory v Kč, například „zítra 11:00-14:00 ohřej bojler (4 kWh) ze solárního přebytku, energie stojí
jen výkupní cenu kolem 5 Kč místo 8,5-9,5 Kč“. Dlaždice AI hodnocení je zobrazí jako přehledný seznam.

AI běží v 6, 14 a 20 hodin, dále když přibude nebo zmizí výstraha ČHMÚ, když vyjdou zítřejší ceny,
když se výrazně změní předpověď výroby a při anomálii. Tlačítkem **Obnovit** v dlaždici si nové
hodnocení vyžádáte kdykoli, nejvýš jednou za 5 minut.

## 🌡️ **Vlastní senzory pro AI**

V Nastavení → AI přibylo pole **Další senzory pro AI**. Vyberte nejvýš 10 entit, které má AI brát
v úvahu, třeba venkovní teplotu, počasí nebo wallbox. Odchází jen název, stav a jednotka, u entity
počasí navíc teplota, oblačnost, vlhkost a vítr. ID entity ani číslo boxu se neposílá. Změna výběru
spustí nové hodnocení při nejbližším hodinovém běhu.

## 🔧 **Opravy**

- Skok odběru během plánovaného nabíjení v režimu Home UPS už AI nehlásí jako „velký spotřebič“.
- AI dostává vysvětlená znaménka výkonu, takže nabíjení baterie neplete s vybíjením.
- Hodinový běh AI se po startu spouštěl dvakrát naráz a poskytovatel jedno volání odmítal.
- Z řetězce modelů Groq zmizel `qwen/qwen3.6-27b`, který Groq už nenabízí (vracel 404). AI teď
  odpovídá napoprvé.
- Neúspěšné volání AI se zapíše do logu i s modelem, HTTP stavem a kódem chyby od poskytovatele.
