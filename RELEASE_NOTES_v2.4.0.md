# OIG Cloud pro Home Assistant — poznámky k vydání 2.4.0

Verze 2.4.0 je velké uživatelské vydání, které kompletně obměňuje dashboard v Home Assistantu. Přináší
nový V2 dashboard se čtyřmi kartami (Toky / Ceny / Bojler / Nastavení), zcela přepracovanou kartu
Bojler s novým způsobem zobrazení ohřevu vody, nový onboarding wizard v2, který vás provede
nastavením celé integrace, a opravu zápisu na OIG portál po změně kontraktu 2026-07-31, kvůli které
dočasně přestaly fungovat přepínače režimu bojleru, střídače a dodávky do sítě. Součástí jsou i
další moduly — ČHMÚ výstrahy, zdroj telemetrie z lokálního proxy, ServiceShield, podpora více
Battery Boxů, hybridní plánovač a volitelné AI scénáře.

---

## 🚀 **Co je nového**

### 📊 **Nový V2 dashboard**

Dashboard V2 je nyní výchozí zobrazení integrace. Místo staré stránky s jedním dlouhým seznamem
entit uvidíte čtyři karty v horní liště:

- **Toky** — reálný čas: výroba FVE, domácí spotřeba, baterie, síť.
- **Ceny** — spotové ceny, nákup a prodej, nastavení distributora a dodavatele.
- **Bojler** — kompletně přepracovaná karta (viz níže).
- **Nastavení** — modulární konfigurace, onboarding wizard a servisní služby.

### 🔥 **Karta Bojler — úplně nový způsob zobrazení**

Karta Bojler prošla kompletním přepracováním. Místo jednoduchého přehledu teplot a stavu topení
ukazuje bojler jako „baterii" s animovaným tokem energie:

- **Hero tok energie** — barevně animované šipky zdroj → nádrž → odběr (všechny zdroje tepla —
  elektřina ze sítě, přetoky z FVE, alternativní zdroj). Při ohřevu uvidíte, odkud teplo aktuálně
  teče a kam odchází.
- **Rolující 24h graf** — kombinuje průběh SoC (stavu nabití) a teploty v nádrži, s překryvem
  výroby FVE pro daný den.
- **Plán a realita** — dlaždice **Včera / Dnes / Zítra** porovnává plánovaný a skutečný průběh
  (topného výkonu i SoC), ať víte, jak dobře plánovač pracuje.
- **Energie dnes** — kolik energie šlo do bojleru dnes, rozdělené podle zdroje (FVE / síť).
- **Mapa odběrů vody (P90)** — týdenní heatmapa odběrů teplé vody po hodinách, sloupec P90
  ukazuje typický náročný den, přes který plánovač dimenzuje rezervu.

### 🧙‍♂️ **Onboarding wizard v2**

Dashboard dostal vlastního průvodce nastavením — nahradil dřívější tříkrokový onboarding. Wizard
se spouští z karty **Nastavení** a můžete ho kdykoliv otevřít znovu (žádný krok vás nezamkne).
Kroky jsou seskupeny do dvou fází — **Nastavuje se jednou** (volby, které měníte zřídka) a
**Mění se v čase** (ceny, plánovač).

> 📖 Co přesně který krok nastaví a jak funguje režim kontroly, najdete v sekci
> [🧙‍♂️ Wizard a planner v2](./README.md#-wizard-a-planner-v2) v hlavním README.

### 🛡️ **ServiceShield™**

Ochrana proti nechtěným změnám režimu se rozšířila: volitelný **timeout 5–60 minut**, monitoring
externích změn režimu (když se režim změní mimo integraci — mobilní app, displej boxu, jiná
automatizace), a živý přehled změn v dashboardu.

### 🌦️ **ČHMÚ meteorologická varování**

Nový volitelný modul z Českého hydrometeorologického ústavu:

- Lokální varování filtrovaná podle GPS vaší instalace (z nastavení solární předpovědi nebo z
  Home Assistanta).
- Celostátní varování pro celou Českou republiku.
- 5 úrovní závažnosti (0–4): žádné / žluté / oranžové / červené / fialové.
- Badge v hlavičce dashboardu s barevným indikátorem, detail v modalu.
- Aktualizace každou hodinu + WebSocket real-time push.

### 🔌 **Více Battery Boxů na jednom účtu**

Pokud máte na jednom OIG účtu více Battery Boxů, služby nyní přijímají volitelný parametr
`device_id`, abyste mohli cílit na konkrétní box. Výchozí chování (bez `device_id`) je stejné
jako dřív.

### ☁️ **Zdroj telemetrie — Cloud nebo lokální proxy**

V kartě **Nastavení → Připojení** si nově zvolíte, odkud integrace bere telemetrii:

- **Přes OIG Cloud** *(výchozí — funguje vždy)*.
- **Přímo z boxu po domácí síti** — přes OIG Proxy (rychlejší aktualizace, funguje i bez
  internetu). Konfigurace v kartě Připojení (adresa proxy, timeout, debounce).

Volba se projeví okamžitě — žádný restart Home Assistanta.

### 📈 **Hybridní plánovač a AI scénáře**

Plánovač baterie dostal nový režim náhledu **Hybrid / Autonomy preview** — ukáže levná okna pro
dnešek a zítřek a umožní vyladit prahové hodnoty plánovače (DP ladění parametrů) vůči simulaci,
než je necháte řídit box.

K plánovači je nově připraven **AI asistent** (`oig_ai_status` senzor + tlačítko Ověřit v Nastavení).
AI je **dobrovolné** — všechno funguje i bez něj. Pokud ho zapnete, integrace předá AI jen
anonymní čísla (výkon a orientace panelů, kapacita a nastavení baterie), nikdy vaši polohu,
jméno ani e-mail. Můžete si vybrat svůj vlastní klíč (Groq / NVIDIA — obojí free tier) nebo použít
AI, kterou už máte nastavenou v Home Assistantu.

---

## ⚠️ **Breaking / upgrade notes**

### 🔧 **Oprava zápisu na OIG portál (2026-07-31)**

**Pokud jste mezi přibližně 2026-07-25 a 2026-07-31 zkusili přepnout režim bojleru, přepnout
režim střídače nebo změnit dodávku do sítě a nic se nestalo**, nebyla to chyba na vaší straně.
OIG portál mezitím beze změny dokumentace zpřísnil kontrakt pro zápis (Device.Set.Value.php /
ToGrid.Toggle.php):

- zapisované hodnoty `value` musí být celé číslo (ne řetězec) pro `boiler_prms.manual`,
  `boiler_prms.ssr`, `box_prms.mode` a `box_prm2.app`;
- každý zápis vyžaduje HTTP hlavičku `X-Requested-With: XMLHttpRequest` (čtení ji nevyžaduje);
- `ToGrid.Toggle.php` (dodávka do sítě) nově vyžaduje parametr `p_max_feed_grid` i pro off/on.

Integrace od verze 2.4.0 kontrakt znovu dodržuje — **přepínání režimu bojleru, režimu střídače
i dodávky do sítě zase funguje**. Po upgradu není potřeba nic ručně nastavovat.

---

## 📦 **Instalace / upgrade**

Integrace se instaluje a aktualizuje standardně přes **HACS → Integrations → OIG Cloud → Update**.
Pokud jde o čistý upgrade z 2.3.x, vaše uložené nastavení zůstává beze změny.

Po restartu Home Assistanta se dashboard V2 zobrazí automaticky. Wizard v2 najdete v kartě
**Nastavení** — spustí se jen na vaše vyžádání, nic vás k němu nenutí.
