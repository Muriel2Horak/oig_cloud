# OIG Cloud pro Home Assistant — poznámky k vydání 2.4.3

Verze 2.4.3 opravuje **hodinovou AI analýzu**, která od svého zavedení nikdy nedostala data, o kterých
měla přemýšlet — a proto radila mimo. Druhá polovina vydání srovnává čísla na kartě Bojler, kde
dlaždice „Plán & realita" ukazovala jinou spotřebu než zbytek téže obrazovky.

Obě věci se našly na reálné instalaci, ne při čtení kódu.

---

## 🤖 **AI analýza konečně vidí ceny a plán**

Blok s cenami a plánem se načítal přes HTTP s adresou bez domény. Takový požadavek knihovna odmítne
rovnou, chybu spolkla příliš široká pojistka a modelu se místo dat vložil text **„(nedostupné)"**.
Při každém spuštění, od začátku. Model tedy netušil nic o cenách ani o plánu nabíjení a musel si
domýšlet — což přesně dělal.

Data se teď berou z lokální předpočítané paměti, kterou používá i samotný dashboard. Model nově dostane:

- dnešní **plánované náklady proti dosud utraceným** a odhad konce dne,
- **předpověď výroby FVE** na dnešek i zítřek,
- **plánované okno nabíjení ze sítě** včetně rozsahu cen,
- **tabulku nejbližších intervalů** — čas, režim střídače, spotová cena, očekávaná výroba a spotřeba, stav baterie.

## 🔇 **Nefunkční AI se tvářila jako klidná hodina**

Tři různé cesty ukončily hodinové vyhodnocení **beze stopy** — bez zápisu, bez záznamu o pokusu.
Rozbitá analýza tak vypadala úplně stejně jako hodina, kdy se prostě nic nestalo. Právě proto si
předchozí chyby nikdo měsíce nevšiml.

Nově se při selhání zachová předchozí zpráva i deník událostí, zaznamená se čas pokusu, stav se
přepne na `ai_unavailable` a do protokolu jde varování.

## 🔗 **Dva ze tří záložních modelů už neexistovaly**

Řetěz modelů obsahoval dva, které poskytovatel dávno zrušil — takže to nebyl řetěz, ale jediný model
bez záchrany. Jediné zaškobrtnutí a celé volání vrátilo prázdno. Nahrazeny ověřenými modely.

## ⚡ **Konec chybné rady „nerovnoměrná zátěž zvyšuje odběr ze sítě"**

Tuhle (neexistující) souvislost modelu předepisovalo přímo zadání. Nerovnoměrnost fází se přitom
měří **výhradně na zálohovaném okruhu** a odběr ze sítě sama o sobě nezvyšuje — ten tvoří nezáloha,
nepokrytá záloha a nabíjení baterie ze sítě.

Zadání teď tuhle skladbu popisuje výslovně a událost s sebou nese i čísla, ze kterých je souvislost
vidět: který okruh je nevyvážený, rozpad po fázích a současný odběr nezálohy i sítě.

## 🔥 **Bojler: „Plán & realita" hlásila víc, než bojler spotřeboval**

Dlaždice četla surová denní počítadla, zatímco zbytek obrazovky používá hodnotu srovnanou s vlastním
počítadlem boxu. Na referenční instalaci tak vedle sebe svítilo **18,06 kWh** a **10,1 kWh** za
totéž — přičemž box naměřil 10,498 kWh za celý den.

Zároveň už se nepáruje *plánované denní minimum* připravené vody s *aktuálním* stavem; to jsou dvě
různé veličiny a vypadalo to jako obrovské přeplnění plánu.

---

## ⬆️ **Aktualizace**

Přes HACS jako obvykle, poté restart Home Assistantu. Konfigurace ani entity se nemění.

## 🔎 **Známá omezení**

- Karta Bojler zatím neukazuje **skutečné náklady po slotech, soulad s plánem, průběh dne ani
  záložku „Včera"** — to vyžaduje ukládání plánu a denní archiv, které se chystají.
