# OIG Cloud pro Home Assistant — poznámky k vydání 2.4.1

Verze 2.4.1 je servisní vydání zaměřené na spolehlivost po upgradu. Opravuje plánování a ukládání
solární předpovědi, navazování denní výroby v Recorderu, autentizaci V2 dashboardu a několik
startovacích a lifecycle problémů. Stávající konfigurace zůstává zachována; po aktualizaci stačí
Home Assistant jednou restartovat.

---

## Nejdůležitější opravy

### Solární předpověď se obnovuje podle skutečného místního času

- Režim `daily_optimized` spouští automatický refresh v **06:00, 12:00 a 16:00 místního času**.
- Režim `daily` spouští refresh v **06:00 místního času**.
- Čas startu Home Assistanta už plán neposouvá; start například v 10:42 nezpůsobí, že by se
  další refreshy navždy spouštěly v nesprávnou minutu.
- Přechod na letní nebo zimní čas, restart, překryv ručního a automatického volání ani opakované
  doručení stejného callbacku nevytvoří duplicitní přijatý forecast.
- Dočasné chyby provideru mají trvalý retry stav `+15/+45 minut`; terminální chyba se neopakuje
  a platná předchozí předpověď zůstává dostupná.

### Solární cache a konfigurace jsou transakční

- Provider, konfigurace, revize privátních přihlašovacích údajů a occurrence jsou svázané s
  konkrétním požadavkem. Starší odpověď už nemůže přepsat novější výsledek.
- Forecast a retry metadata používají stejné pořadí zámků a jeden trvalý zápis. Restart proto
  neobnoví již úspěšně dokončený retry ani nepřejmenuje starou cache na novou konfiguraci.
- Unload čeká na rozpracovaný Store zápis, zruší callbacky a po odebrání entity nic nepublikuje.
- Manuální služba `oig_cloud.update_solar_forecast` vrací `updated` jen po validaci a trvalém
  uložení nových dat. Rate limit nebo odmítnutí providerem vrací pravdivou chybu.

### Azimut používá běžný kompas

V nastavení se azimut zadává jako:

- `0` nebo `360` — sever,
- `90` — východ,
- `180` — jih,
- `270` — západ.

Hodnota se uloží a zobrazí beze změny. Převod na formát Forecast.Solar probíhá až na hranici
provideru. Staré záporné hodnoty se zobrazí jako legacy konfigurace a lze je výslovně převzít;
integrace je nepřepisuje skrytě.

### Solární klíče zůstávají privátní

- Forecast.Solar a Solcast přihlašovací údaje se ukládají mimo veřejné options.
- Test konfigurace vydá krátkodobý proof svázaný s přesným efektivním DTO; proof nelze přehrát,
  použít pro jinou entry ani použít po změně konfigurace.
- Explicitní uložení bez testu zůstává možné a označí nové údaje jako neověřené.
- Solcast nedostává lokální GPS, sklon ani azimut; geometrii spravuje jeho Rooftop Site.

### Denní výroba navazuje bez poškození historie

Senzor `sensor.oig_<box>_dc_in_fv_ad` nyní používá Recorder kontrakt pro denní čítač:

- existující historie z `total_increasing` se při upgradu zachová,
- první stav po restartu nevytvoří falešný reset ani dvojí započtení,
- reset marker se aktivuje až po prokázaném přechodu do nového dne,
- chybějící půlnoční vzorek, krátký restart, nízká denní výroba, rollback čítače a dočasné
  `unknown/unavailable` hodnoty jsou ošetřené bez skoku v dlouhodobých statistikách.

### Dashboard používá autentizaci Home Assistanta

- V2 dashboard deleguje HTTP požadavky na `hass.fetchWithAuth`.
- Aplikační kód nečte access token, nesestavuje vlastní `Bearer` hlavičku a nevolá globální
  `fetch` pro autentizované OIG endpointy.
- Home Assistant vlastní refresh expirovaného přihlášení; paralelní požadavky používají čerstvý
  token a neodesílají známý expirovaný token.
- Cesty jsou omezené na relativní OIG API, hlavičky dodané volajícím jsou očištěné a diagnostika
  neobsahuje token, URL query ani text výjimky.

---

## Další změny

- Solar Settings a onboarding používají stejné podmínky viditelnosti, providerovou validaci,
  varování k legacy hodnotám a české/anglické texty.
- Úspěšně uložené části wizardu se při retry znovu neposílají; neúspěšný pozdější krok nesníží
  ověřené solární přihlašovací údaje na neověřené.
- Sekundární solární string senzory dostávají stejný přijatý snapshot jako hlavní senzor.
- Boiler plánovač a battery forecast vlastní své async úlohy, retry callbacky a Store zápisy;
  unload je zruší nebo dokončí v bezpečném pořadí.
- Prázdný boiler Store a očekávaně chybějící zítřejší OTE data již nevytvářejí zavádějící
  startup warningy.
- Fallback přes Home Assistant entity registry znovu správně rozpozná číselné ID boxu z reálného
  entity ID; test už kvůli tomu nepřepisuje globální regulární výrazy Pythonu.
- Volitelné hodinové AI vyhodnocení publikuje jen hodnotný diagnostický report. Nemění samo
  režim boxu ani jinou fyzickou akci.

---

## Upgrade

1. Aktualizujte integraci přes **HACS → Integrations → OIG Cloud → Update**.
2. Restartujte Home Assistant.
3. V **Nastavení → Solár** zkontrolujte azimut v kompasovém rozsahu `0..360`.
4. Pokud se zobrazí upozornění na starou zápornou hodnotu, zkontrolujte zobrazený kompasový
   ekvivalent a potvrďte převzetí. Bez potvrzení se hodnota automaticky nezmění.
5. U Solcastu ponechte geometrii v Rooftop Site; lokální kWp slouží pro alokaci a fallback a
   neposílá se jako geometrie provideru.

Při běžném upgradu není nutná ruční migrace Recorder databáze ani opětovné zadání aktivních
solárních klíčů.

---

## Ověření vydání

- Python: **5 479 passed, 29 skipped**, coverage **91,18 %**.
- Frontend: **2 489 testů**, statements **81,51 %**, branches **80,81 %**, functions **80,50 %**.
- Flake8, Mypy, Pylint `E0/F0`, ESLint, TypeScript, build verification a dva po sobě jdoucí
  all-files pre-commit běhy prošly.
- Deterministický frontend build byl ověřen na Node.js `22.17.0` a npm `10.9.2`.
- Security diff audit dokončil úplné pokrytí změněných souborů s **0 reportovatelnými nálezy**.
- Přímé ověření na Home Assistantu `2026.8.1` potvrdilo jeden přijatý automatický refresh v
  16:00, úspěšný pozdější ruční refresh, čistý OIG-scoped log a plynulé Recorder součty bez
  falešného resetu.

Známé warningy jiných integrací Home Assistanta (například uživatelské šablony, Songpal, Tuya
nebo samostatný MQTT OIG Proxy) nejsou součástí OIG Cloud 2.4.1.
