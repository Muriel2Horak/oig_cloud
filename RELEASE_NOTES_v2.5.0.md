# OIG Cloud pro Home Assistant - poznámky k vydání 2.5.0

Verze 2.5.0 přináší dvě větší novinky. AI hodnocení na dashboardu radí konkrétní kroky s časem
a úsporou v Kč. Kdo čte data z boxu lokálně přes OIG Proxy, může přes proxy box i ovládat, včetně
nabíjecího proudu a prodeje z baterie do sítě. Obě funkce jsou dobrovolné: bez poskytovatele AI
a bez zapnutého ovládání přes proxy se integrace chová jako dosud.

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

V Nastavení → AI přibylo pole **Další senzory pro AI**. Vyberte nejvýš 10 entit, které má AI brát
v úvahu, třeba venkovní teplotu, počasí nebo wallbox. Odchází jen název, stav a jednotka, u entity
počasí navíc teplota, oblačnost, vlhkost a vítr. ID entity ani číslo boxu se neposílá. Změna výběru
spustí nové hodnocení při nejbližším hodinovém běhu.

Funguje s poskytovatelem Groq, NVIDIA nebo AI Task z Home Assistanta, který máte nastavený v Nastavení → AI.

## 🔌 **Ovládání boxu přes OIG Proxy**

V nastavení integrace přibyla volba **Řídit přes OIG Proxy**, ve výchozím stavu vypnutá. Nabízí se
jen tomu, kdo čte data lokálně nebo v hybridním režimu. Po zapnutí jdou změny režimu, přetoků
a bojleru přes proxy přímo do boxu místo přes cloudový portál. Když integrace přejde na cloud
(proxy nedodává data), jdou zápisy přes cloud jako dřív. Vše dál hlídá shield, a pokud box lokální
zápis nepotvrdí, zkusí se jednou přes cloud.

Přes proxy jdou i dvě věci, které cloud neumí:

- **Nabíjecí proud v režimu Home UPS.** Služba `set_box_mode` přijímá `charge_current` v ampérech.
  Shield nejdřív přepne do Home UPS, počká na potvrzení boxu a teprve potom zapíše proud, protože
  přepnutí do Home UPS vrací proud na 50 A. Strop je limit boxu, případně nižší strop z nastavení.
  Na boxu autora tak šlo nabíjet ze sítě až 6,4 kW místo 2,6 kW přes cloud.
  Volba **Nabíjecí proud v Home UPS přes proxy** (ve výchozím stavu 0, tedy vypnuto) nastaví
  tento proud po každém přepnutí do Home UPS, i když přepíná plánovač. Plánovač pak počítá
  s nabíjecím výkonem proud × aktuální napětí baterie místo pevně nastavených kW.
- **Prodej z baterie do sítě.** Nové služby `battery_export` a `stop_battery_export` vybíjí baterii
  do sítě s nastaveným limitem výkonu. Prodej vždy skončí: v zadaný čas, při restartu Home Assistanta
  nebo když SoC klesne na minimum. Potom se vrátí původní limit přetoků.

## 🔧 **Opravy**

- Po restartu Home Assistanta ukazoval senzor režimu boxu na 5-7 sekund „Home UPS“, přestože box
  byl v Home 1. Integrace si stihla stáhnout zastaralá data z cloudu dřív, než naběhla proxy.
  V lokálním režimu teď nejdřív počká na lokální data (nejdéle po dobu nastavené ochranné lhůty startu).
- S více boxy hlídal shield při změně režimu bojleru senzor výchozího boxu, ne boxu, kterému byl
  příkaz určen.
- Skok odběru během plánovaného nabíjení v režimu Home UPS už AI nehlásí jako „velký spotřebič“
  a nabíjení baterie neplete s vybíjením.
- Hodinový běh AI se po startu spouštěl dvakrát naráz a poskytovatel jedno volání odmítal.
- Z řetězce modelů Groq zmizel `qwen/qwen3.6-27b`, který Groq už nenabízí (vracel 404).
- Nástroje pro sestavení dashboardu přešly na vite 7 a vitest 4 kvůli bezpečnostním opravám.
  Dashboard se dál sestavuje i pro starší webview aplikace Home Assistant.
