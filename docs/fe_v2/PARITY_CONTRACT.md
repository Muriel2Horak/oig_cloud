# OIG FE V2 - Parity Contract

Tento dokument definuje všechny funkce V1, které musí být 1:1 převedeny do V2.
Každá položka má unikátní ID (`PAR-XXX`) a acceptance kritéria (Given/When/Then).

## Legenda stavů
- 🔴 Not started
- 🟡 In progress  
- 🟢 Done
- ⚪ Skipped (s explicitním souhlasem)

---

## PAR-001: Shell & Tabs

**Stav:** 🔴

### PAR-001A: Header
- Given: Dashboard je načten
- When: Zobrazí se header
- Then: 
  - Nadpis "⚡ Energetické Toky"
  - Čas aktuální
  - Status badge (výstrahy)
  - Tlačítka pro taby (Toky, Predikce a statistiky, Bojler)
  - Ikony pro editaci a reset layoutu

### PAR-001B: Tab Switching
- Given: Dashboard je načten
- When: Kliknu na tab
- Then:
  - Aktivní tab má zvýraznění
  - Obsah tabu se zobrazí
  - Při přepnutí na "Toky" se spustí particles
  - Při odchodu z "Toky" se particles zastaví

---

## PAR-002: Flow Visualization

**Stav:** 🔴

### PAR-002A: Nodes
- Given: Tab "Toky" je aktivní
- When: Dashboard je načten
- Then: Zobrazí se uzly:
  - Solár (s predikcí dnešní/zítra)
  - Baterie (s SoC, power, stavem)
  - Střídač (mode, grid delivery, notifikace)
  - Síť (tariff, frequency, power, phases)
  - Spotřeba (power, boiler)

### PAR-002B: Connections
- Given: Uzly jsou zobrazeny
- When: Flow data jsou načtena
- Then:
  - Spojnice mezi uzly jsou vykresleny
  - Barva odpovídá směru toku
  - SVG connections se přizpůsobí layoutu

### PAR-002C: Particles (Kuličky)
- Given: Aktivní tok energie
- When: Power > 0
- Then:
  - Animované particles po spojnících
  - Rychlost odpovídá výkonu
  - Velikost/opacity odpovídá intenzitě
  - Barva podle zdroje (solar/battery/grid)

### PAR-002D: Node Details
- Given: Uzel má detail panel
- When: Uzel je expandován
- Then:
  - Zobrazí se detailní metriky
  - Pro baterii: energie, plánované dobití
  - Pro síť: energie, ceny
  - Pro spotřebu: boiler detaily

---

## PAR-003: Pricing Tab

**Stav:** 🔴

### PAR-003A: Stats Cards
- Given: Tab "Predikce a statistiky" je aktivní
- When: Data jsou načtena
- Then:
  - Nejlevnější nákup (čas, cena)
  - Nejlepší prodej (čas, cena)
  - Nákladový přehled

### PAR-003B: Main Chart
- Given: Data jsou načtena
- When: Zobrazí se graf
- Then:
  - Časová osa X
  - Ceny nákup/prodej na Y
  - Solar/battery/consumption overlay
  - Plan markers

### PAR-003C: Zoom/Pan
- Given: Graf je zobrazen
- When:
  - Kolečko myši
  - Tažení s shift
  - Klik na kartu pro zoom na interval
- Then:
  - Zoom in/out funguje
  - Pan funguje
  - Reset zoom tlačítko
  - Datalabels se přizpůsobí zoomu

### PAR-003D: Datalabel Modes
- Given: Graf je zobrazen
- When: Přepnu režim (Auto/Always/Never)
- Then:
  - Labels se zobrazí/skryjí podle režimu
  - Auto: labels jen při zoomu

---

## PAR-004: Timeline & Detail Tabs

**Stav:** 🔴

### PAR-004A: Timeline Dialog
- Given: Klik na timeline element
- When: Dialog se otevře
- Then:
  - Taby: Včera/Dnes/Zítra/Historie/Srovnání
  - Mode blocks s barvou
  - Summary statistiky

### PAR-004B: Auto-refresh
- Given: Dialog je otevřen
- When: Uplyne 60s
- Then: Data se automaticky obnoví

---

## PAR-005: Control Panel

**Stav:** 🔴

### PAR-005A: Box Mode
- Given: Panel je rozbalen
- When: Kliknu na režim
- Then:
  - Tlačítka: Home 1, Home 2, Home 3, Home UPS
  - Aktivní režim je zvýrazněn
  - Změna se projeví přes Shield

### PAR-005B: Grid Delivery
- Given: Panel je rozbalen
- When: Kliknu na dodávku
- Then:
  - Tlačítka: Vypnuto, Zapnuto, S omezením
  - Limit input pro "S omezením"

### PAR-005C: Battery Charging
- Given: Panel je rozbalen
- When: Kliknu na "Nabít na SoC"
- Then:
  - Dialog pro zadání cílového SoC
  - Zobrazení odhadované ceny

### PAR-005D: Shield Queue
- Given: Panel je rozbalen
- When: Ve frontě jsou položky
- Then:
  - Zobrazení aktivních/čekajících/dokončených
  - Možnost odstranit z fronty
  - Live update každou sekundu

---

## PAR-006: Custom Tiles

**Stav:** 🔴

### PAR-006A: Tile Display
- Given: Tiles jsou nakonfigurovány
- When: Dashboard je načten
- Then:
  - Tiles vlevo i vpravo
  - Emoji ikony
  - Hodnoty s jednotkami
  - Podrobnosti v tooltiplu

### PAR-006B: Tile Configuration
- Given: Edit mode
- When: Kliknu na ⚙️
- Then:
  - Dialog pro konfiguraci
  - Výběr entity
  - Nastavení labelu

### PAR-006C: Tile Management
- Given: Edit mode
- When: Kliknu na ✕
- Then: Tile je odstraněn

---

## PAR-007: Layout System

**Stav:** 🔴

### PAR-007A: Breakpoints
- Given: Různé šířky obrazovky
- When: Změna šířky
- Then:
  - Desktop (>1024px)
  - Tablet (768-1024px)
  - Mobile (<768px)
  - Layout se přizpůsobí

### PAR-007B: Edit Mode
- Given: Klik na 🔧
- When: Edit mode aktivní
- Then:
  - Uzly lze přetahovat
  - Pozice se ukládají
  - Per-breakpoint storage

### PAR-007C: Reset Layout
- Given: Klik na ↺
- When: Potvrzeno
- Then: Layout reset na default

---

## PAR-008: Theme System

**Stav:** 🔴

### PAR-008A: Dark/Light Mode
- Given: HA má nastavený theme
- When: Dashboard se načte
- Then:
  - Barvy odpovídají theme
  - CSS variables fungují
  - Automatická detekce

### PAR-008B: HA Theme Events
- Given: HA změní theme
- When: theme-changed event
- Then: Dashboard aktualizuje barvy

---

## PAR-009: Mobile & HA App

**Stav:** 🔴

### PAR-009A: Touch Support
- Given: Touch device
- When: Touch interakce
- Then:
  - Drag funguje
  - Tap funguje
  - Zoom na grafu funguje

### PAR-009B: Responsive Layout
- Given: Mobile viewport
- When: Dashboard načten
- Then:
  - Control panel collapsed
  - Tiles pod sebou
  - Grafy responsive

### PAR-009C: HA Companion App
- Given: HA iOS/Android app
- When: Dashboard otevřen
- Then:
  - Žádné console chyby
  - Resize events filtrovány
  - Particles adaptivně vypnuty při low performance

---

## PAR-010: Boiler Tab

**Stav:** 🔴

### PAR-010A: Boiler Dashboard
- Given: Boiler tab enabled
- When: Přepnu na boiler tab
- Then:
  - Heatmap zobrazena
  - Profily načteny
  - Plán zobrazen

### PAR-010B: Auto-refresh
- Given: Boiler tab aktivní
- When: Uplyne 5 minut
- Then: Data se obnoví

---

## PAR-011: Analytics & Stats

**Stav:** 🔴

### PAR-011A: Battery Efficiency
- Given: Pricing tab aktivní
- When: Data načtena
- Then:
  - Efektivita nabíjení %
  - Srovnání s minulým měsícem
  - Nabito/Vybito/Ztráty

### PAR-011B: Battery Health
- Given: Pricing tab aktivní
- When: Data načtena
- Then:
  - SoH %
  - Kapacita
  - Počet měření

### PAR-011C: Planned Consumption
- Given: Pricing tab aktivní
- When: Data načtena
- Then:
  - Profil spotřeby
  - Plán vs actual
  - Predikce na zítra

### PAR-011D: Battery Balancing
- Given: Pricing tab aktivní
- When: Data načtena
- Then:
  - Stav balancování
  - Poslední balancování
  - Náklady

---

## PAR-012: CHMU Warnings

**Stav:** 🔴

### PAR-012A: Warning Badge
- Given: CHMU má výstrahu
- When: Dashboard načten
- Then:
  - Badge zobrazuje stav
  - Barva podle závažnosti

### PAR-012B: Warning Modal
- Given: Klik na badge
- When: Modal otevřen
- Then:
  - Detail výstrah
  - Časové úseky

---

## PAR-013: Error Handling

**Stav:** 🔴

### PAR-013A: API Errors
- Given: API volání selže
- When: Error response
- Then:
  - Uživatel vidí "Načítání..." nebo "Data nedostupná"
  - Žádný uncaught exception
  - Retry mechanismus

### PAR-013B: Hass Unavailable
- Given: HA nedostupný
- When: Připojení selže
- Then:
  - Graceful degradation
  - Uživatel vidí stav

---

## PAR-014: Performance

**Stav:** 🔴

### PAR-014A: Initial Load
- Given: Dashboard načten
- When: First paint
- Then:
  - < 2s na desktop
  - < 3s na mobile

### PAR-014B: Tab Switch
- Given: Dashboard loaded
- When: Přepnutí tabu
- Then: < 400ms

### PAR-014C: Memory
- Given: Dashboard běží 1h
- When: Pravidelné updates
- Then:
  - Žádný memory leak
  - < 100MB heap

### PAR-014D: Intervals
- Given: Dashboard běží
- When: Tab je neaktivní
- Then:
  - Zastavené polling
  - Pauzované particles

---

## PAR-015: Data Layer

**Stav:** 🔴

### PAR-015A: State Updates
- Given: Hass state changed
- When: Entity update
- Then:
  - UI se aktualizuje
  - Žádné duplicitní fetch

### PAR-015B: API Calls
- Given: Potřebuji data z API
- When: Zavolám endpoint
- Then:
  - Deduplikace
  - Abort on tab switch
  - Cache TTL respektován

---

## Souhrn

| ID | Kategorie | Stav | Priorita |
|----|-----------|------|----------|
| PAR-001 | Shell & Tabs | 🔴 | Critical |
| PAR-002 | Flow | 🔴 | Critical |
| PAR-003 | Pricing | 🔴 | Critical |
| PAR-004 | Timeline | 🔴 | High |
| PAR-005 | Control Panel | 🔴 | Critical |
| PAR-006 | Custom Tiles | 🔴 | High |
| PAR-007 | Layout | 🔴 | Critical |
| PAR-008 | Theme | 🔴 | High |
| PAR-009 | Mobile | 🔴 | Critical |
| PAR-010 | Boiler | 🔴 | Medium |
| PAR-011 | Analytics | 🔴 | High |
| PAR-012 | CHMU | 🔴 | Medium |
| PAR-013 | Errors | 🔴 | Critical |
| PAR-014 | Performance | 🔴 | Critical |
| PAR-015 | Data Layer | 🔴 | Critical |

**Celkem:** 15 kategorií, ~80 podpoložek
