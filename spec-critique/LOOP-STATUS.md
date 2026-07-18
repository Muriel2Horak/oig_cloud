# LOOP-STATUS (R6–R10)

## Verdikt smyčky
Smyčka proběhla v 5 kolech (R6–R10) a v kole R10 dosáhla cíle „0 CRITICAL“ ve všech čtyřech ohniscích (ANTISTUB, SECURITY, PERF, AIKEYS) podle hlaviček reportů: `spec-critique/R10-ANTISTUB-round5.md:1`, `spec-critique/R10-SECURITY-round5.md:1`, `spec-critique/R10-PERF-round5.md:1`, `spec-critique/R10-AIKEYS-round5.md:1`.  
To znamená, že v této iteraci byla dosažena shoda, že se návrhy v SPEC mohou považovat za implementačně bezpečné, nikoli však že je tímto krokem opraven nasazený kód: položky v `spec-critique/SHIPPED-CODE-DEFECTS.md` explicitně zůstávají mimo loop a nejsou zavřené (`spec-critique/SHIPPED-CODE-DEFECTS.md:SEC-2`, `spec-critique/SHIPPED-CODE-DEFECTS.md:AIK-1`).

## Přehled po kolech (R6–R10)

| Kolo | Zjištění ve vstupu | Opraveno ve specifikaci | Přesunuto do SHIPPED-CODE | Zamítnuto (důvod) |
|---|---|---|---|---|
| R6 (Round 1) | ANTISTUB `1C/1M/0m`, SECURITY `2C/2M/0m`, PERF `0C/3M/4m`, AIKEYS `1C/3M/0m` | Na základě `R6-CLASSIFICATION` byly položky rozděleny do SPEC/PARTIALLY-CLOSED a doplněny do textu rozsahu. | SHIPPED-CODE položky byly explicitně vedeny v klasifikaci kola a následně shrnuty v seznamu chyb. | Kolo neobsahuje formální odmítnutí navíc než změnu priority směrem do SHIPPED-CODE. |
| R7 (Round 2) | ANTISTUB `2C/1M/0m`, PERF `0C/1M/2m`, AIKEYS `1C/2M/1m` | Nově vzniklá zjištění byla doplněna do návrhu R7 (`spec-critique/R7-ANTISTUB-round2.md:1`, `spec-critique/R7-PERF-round2.md:1`, `spec-critique/R7-AIKEYS-round2.md:1`) a převedena na další ověřovací kroky. | V přiložených artefaktech kole je přímá nová SHIPPED-CODE položka na úrovni R7 malá, přetrvávající SHIPPED bucket je uveden v `SHIPPED-CODE-DEFECTS.md`. | Žádný nový explicitní reject, pouze přehodnocení dosavadních závěrů. |
| R8 (Round 3) | ANTISTUB `0C/0M/1m`, SECURITY `1C/1M/0m`, PERF `0C/0M/3m` | Opravy v R8 upravily text včetně částí ponechaných jako PARTIALLY-CLOSED, bez přidání nových CRITICAL v tomto kole. | Dílčí závazné položky převedené mimo specifikaci jsou evidovány jako SHIPPED-CODE v `spec-critique/SHIPPED-CODE-DEFECTS.md` (nebo pokračující stav z předchozích kol). | Formální reject není v R8 zapsán jako nová položka mimo další evidence. |
| R9 (Round 4) | ANTISTUB `0C/2M/0m`, SECURITY `0C/0M/0m`, PERF `0C/1M/1m` | R9 dál dolaďuje otevřené body s cílem snížit MAJOR/MINOR a potvrzuje splnění exit kritérií bez nových kritických zjištění. | R9 explicitně neobsahuje nové SHIPPED-CODE body mimo opakovaně potvrzené položky; hlavní cesta je pokračující stabilizace. | Bez nového odmítnutí, pouze pokračování předchozích rozhodnutí (AS-22 mimo aktuální implementační okno). |
| R10 (Round 5) | ANTISTUB `0C/0M/0m`, SECURITY `0C/0M/0m`, PERF `0C/0M/1m`, AIKEYS `0C/1M/0m` (`R10-AKEY-001`) | V kole R10 byla závěrečná kontrola zaměřená na odstranění CRITICAL a potvrzení otevřených/částečně uzavřených bodů dle `spec-critique/R10-*` souborů. | SHIPPED-CODE bucket na tomto kole explicitně zahrnuje `AS-22`, `SEC-2`, `AIK-1`–`AIK-5`, `AIK-7` (`spec-critique/R10-ANTISTUB-round5.md`, `spec-critique/R10-SECURITY-round5.md`, `spec-critique/R10-AIKEYS-round5.md`). | Neodmítnuto nic nového; jediné trvalé odchylky jsou vedeny jako OPEN/PARTIALLY-CLOSED v dalších seznamech. |

## Zbývající MAJOR/MINOR po R10

### AI-keys (lens AIKEYS)
- `SCOPE-REVISION.md:R10.3` + `docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md:R9.2`: `R10-AKEY-001` — limit spotřeby provideru mimo část `R10.3` ve specifikaci chybí (provider-consumption bound chybí).
- `spec-critique/R10-AIKEYS-round5.md:R10-AKEY-001` — `R10-AKEY-001` zůstává MAJOR, protože kontrolní hranice spotřeby není úplně definována bez implementačního doplnění.

### ANTISTUB
- `spec-critique/R8-ANTISTUB-round3.md:R8-AS-NEW-1` — OPEN: není jasné, zda se endpoint `/api/oig_cloud/{box}/data` i `/oig_cloud/{box}/ai` chová stejnoměrně při chybových stavech.
- `spec-critique/R9-ANTISTUB-round4.md:R9-AS-NEW-1` — OPEN: enumerace endpointů a testovací scénář zůstává neuzavřený.
- `spec-critique/R10-ANTISTUB-round5.md:PARTIALLY-CLOSED` — část antistub nálezů zůstává `PARTIALLY-CLOSED` a čeká na doplnění konkrétních uzavírek jednotlivých větví.

### PERFORMANCE
- `SCOPE-REVISION.md:F-1.1` — PARTIALLY-CLOSED: požaduje explicitní potvrzení přidané meze `Kč/A/měsíc` bez vazby na variabilní sazby.
- `SCOPE-REVISION.md:F-1.2` — PARTIALLY-CLOSED: nutné rozlišit asymptotické chování u hromadného načítání.
- `SCOPE-REVISION.md:F-1.3` — PARTIALLY-CLOSED: doplnit limity pro paralelní dotazy.
- `SCOPE-REVISION.md:F-2.1` — PARTIALLY-CLOSED: chybí jasný fallback pro přetečení fronty požadavků.
- `SCOPE-REVISION.md:F-2.2` — PARTIALLY-CLOSED: je potřeba upřesnit limit zátěže u burst scénářů.
- `SCOPE-REVISION.md:F-2.6` — PARTIALLY-CLOSED: nutný explicitní cap při opakovaných opakováních dotazů.
- `SCOPE-REVISION.md:F-2.7` — PARTIALLY-CLOSED: není jednoznačně doloženo, jak se chovají mezery po timeoutech.
- `SCOPE-REVISION.md:F-3.1` — PARTIALLY-CLOSED: nedochází k explicitnímu měření nákladovosti při škálování.
- `SCOPE-REVISION.md:F-3.2` — PARTIALLY-CLOSED: chybí testované krytí degradace výkonu.
- `SCOPE-REVISION.md:F-5.2` — PARTIALLY-CLOSED: slabé odůvodnění pro rychlosti při přepínání provideru.
- `SCOPE-REVISION.md:F-5.3` — PARTIALLY-CLOSED: nedefinován stop-loss pro dlouhotrvající požadavky.
- `SCOPE-REVISION.md:PERF-NEW-2` — PARTIALLY-CLOSED: stále čeká na jednoznačnou metodu měření a threshold.
- `spec-critique/R10-PERF-round5.md:PERF-NEW-6` — MINOR/OPEN: odklizení `lazy import` je jen částečně upřesněno.
- `spec-critique/R10-PERF-round5.md:PERF-NEW-R10-A` — MINOR: je potřeba dokončit životní cyklus `AbortController` a vyčištění dashboardového toku.

### SECURITY
- `spec-critique/R10-SECURITY-round5.md:M-4` — PARTIALLY-CLOSED: čeká detailní úprava logiky kontrol pro tento případ.
- `spec-critique/R10-SECURITY-round5.md:m-4` — PARTIALLY-CLOSED: drobný bezpečnostní gap zůstává v připojovacím toku.

## Vady v nasazeném kódu
Tento seznam je přímým převodem SHIPPED-CODE bucketu a nesmí být chápán jako opravené položky.

| ID | Závažnost | Referenční místo | Požadovaná oprava |
|---|---|---|---|
| SEC-2 | CRITICAL | `custom_components/oig_cloud/api/ha_rest_api.py:1213-1229` | Dovést logiku ověřování oprávnění do podoby, která je v souladu s limity specifikace. |
| AIK-1 | MAJOR | `custom_components/oig_cloud/ai/key_store.py:43-67`, `custom_components/oig_cloud/__init__.py:1932` | Přepsat správu klíčů a úniky životnosti tokenů dle přísných pravidel AIKEYS. |
| AIK-2 | MAJOR | `custom_components/oig_cloud/config/steps.py:3599-3612` | Dopsat validace vstupů a chování po chybách kroků konfigurace. |
| AIK-3 | MAJOR | `custom_components/oig_cloud/api/ha_rest_api.py:1394-1424` | Upevnit limitace API volání podle scope požadavků. |
| AIK-4 | MAJOR | `custom_components/oig_cloud/api/ha_rest_api.py:1411-1420` | Dodat robustní kontrolu provider-consumption a chování při vyčerpání limitu. |
| AIK-5 | MAJOR | `custom_components/oig_cloud/ai/backends.py:60-72` | Doladit fallbacky a retry logiku backendu pro predikovatelné chování. |
| AIK-7 | MAJOR | `custom_components/oig_cloud/ai_task.py:108-138` | Doplnit deduplikaci úloh a bezpečný zánik `ai_task` včetně korektního stavu. |
| AS-22 | MINOR | `docs/redesign_2026_07/SCOPE-REVISION.md:R6.10` | Vyřešit mismatch klasifikace v návrhu antistub scénářů (nešlo to přeložit do SHIPPED-CODE implementace v této smyčce). |

Všechny položky výše **nebyly** v tomto loopu opravovány, byly vědomě odděleny do operativního plánu nasazení a vyžadují explicitní GO operátora.

## Co se nepodařilo potvrdit
- V některých kolech je SHIPPED-CODE stav kumulativní; bez další změny kódu nelze tvrdit, že jsou tyto body v produkci skutečně opraveny (`spec-critique/SHIPPED-CODE-DEFECTS.md`).
- Část evidence je v rámci `R10` trvale označena jako PARTIALLY-CLOSED bez jednoznačné poslední implementační podoby a čeká na samostatné rozpracování.

## Doporučení
1. Nejprve implementovat po krocích otevřené R10 zbytky `AIKEYS`, `ANTISTUB` a `PERF` v uvedených clausech (`SCOPE-REVISION.md:R10.3`, `spec-critique/R10-ANTISTUB-round5.md`, `SCOPE-REVISION.md:F-*`, `spec-critique/R10-PERF-round5.md`) a potvrdit průchod všech ohnisek bez CRITICAL.  
2. Až poté naplánovat samostatný sprint pro SHIPPED-CODE bucket (`spec-critique/SHIPPED-CODE-DEFECTS.md`), protože tyto nálezy nemají vazbu na návrh SPEC v této pětikolové smyčce a vyžadují operativní GO operátora.
