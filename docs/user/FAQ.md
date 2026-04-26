# Často kladené otázky (FAQ)

Odpovědi na nejčastější dotazy týkající se OIG Cloud integrace.

## 📋 Obsah

- [Instalace](#instalace)
- [Konfigurace](#konfigurace)
- [Entity a data](#entity-a-data)
- [Služby](#služby)
- [Dashboard](#dashboard)
- [ServiceShield](#serviceshield)
- [Automatizace](#automatizace)
- [Výkon a stabilita](#výkon-a-stabilita)
- [Bezpečnost](#bezpečnost)

---

## 📦 Instalace

### Jak nainstalovat integraci?

**HACS (doporučeno):**

1. Otevřete HACS
2. Vyhledejte "OIG Cloud"
3. Klikněte na "Download"
4. Restartujte Home Assistant
5. Přidejte integraci přes Nastavení

**Manuálně:**

1. Stáhněte ZIP z GitHub
2. Rozbalte do `custom_components/oig_cloud/`
3. Restartujte Home Assistant
4. Přidejte integraci přes Nastavení

### Mohu použít více instancí?

Ano! Pokud máte více OIG Boxů, můžete přidat každý samostatně:

```
Nastavení → Zařízení a služby → Přidat integraci → OIG Cloud
```

### Jak odinstalovat?

1. Odeberte integraci v Nastavení
2. Smažte složku `custom_components/oig_cloud/`
3. Restartujte Home Assistant

---

## ⚙️ Konfigurace

### Co je to wizard?

Průvodce nastavením, jehož kroky se přizpůsobují zvoleným modulům. Typicky uvidíte:

1. Uvítání
2. Přihlášení + potvrzení živých dat
3. Výběr modulů
4. Intervaly + zdroj dat
5. Solární předpověď (pokud je zapnuta)
6. Predikce baterie (pokud je zapnuta)
7. Ceny – import / export / distribuce (pokud je zapnuto pricing)
8. Bojler (pokud je zapnut)
9. Souhrn

**Proč wizard?**

- 📝 Jednodušší než 30+ polí najednou
- 💡 Kontextová nápověda ke každému poli
- ✅ Validace na každém kroku
- 🎯 Samovysvětlující pro laiky

### Můžu přeskočit některé kroky?

Ne, ale můžete:

- Nechat výchozí hodnoty
- Volitelné funkce vypnout
- Změnit vše později v Options

### Jak změnit nastavení později?

```
Nastavení → Zařízení a služby → OIG Cloud → KONFIGUROVAT
```

Otevře se stejný wizard s aktuálními hodnotami.

### Co jsou intervaly aktualizace?

Integrace používá dva intervaly:

- **standard_scan_interval** – základní telemetrie (výchozí 30 s, rozsah 30–300 s)
- **extended_scan_interval** – náročnější výpočty (výchozí 300 s, rozsah 300–3600 s)

**Doporučení:**

- 30–60 s pro aktivní monitoring
- 300 s pro běžný provoz
- 600+ s pokud chcete šetřit API a výkon

### Jak získám API klíč pro forecast.solar?

1. Navštivte [https://forecast.solar/](https://forecast.solar/)
2. Zaregistrujte se (zdarma)
3. API klíč najdete v profilu
4. Zkopírujte do wizardu

**Je povinný?**
Ne, ale doporučeno pro lepší předpovědi.

### Jak zjistím své souřadnice?

**Google Maps:**

1. Najděte svůj dům
2. Pravé tlačítko → Souřadnice
3. Zkopírujte (formát: 50.0755, 14.4378)

**GPS:**

- Použijte mobilní aplikaci
- Formát: `zeměpisná_šířka, zeměpisná_délka`

---

## 📊 Entity a data

### Proč se entity neaktualizují?

**Možné příčiny:**

1. **API nedostupné** - zkontrolujte připojení
2. **Dlouhý interval** - počkejte podle nastavení (30–300 s)
3. **Chyba přihlášení** - zkontrolujte credentials
4. **Box offline** - zkontrolujte OIG aplikaci

**Řešení:**

```
Vývojářské nástroje → Služby → homeassistant.reload_config_entry
```

### Entity nemají hodnoty (unavailable)

**Běžné příčiny:**

1. První spuštění - počkejte 5-10 minut
2. Chybějící data z API - normální pokud nemáte bojler/solár
3. Špatné přihlášení - zkontrolujte username/password

### Jak často se data aktualizují?

Podle `standard_scan_interval` (a `extended_scan_interval` pro náročnější výpočty):

- Entity se aktualizují každých X sekund
- Dashboard se obnovuje automaticky
- ServiceShield je real-time

### Mohu změnit jména entit?

Ano:

```
Nastavení → Entity → [vyber entitu] → Jméno
```

Nebo přímo v YAML:

```yaml
homeassistant:
  customize:
    sensor.oig_XXXXX_bat_soc:
      friendly_name: "Baterie %"
```

### Které entity jsou nejdůležitější?

**Top 5:**

1. `sensor.oig_XXXXX_bat_soc` - Stav baterie
2. `sensor.oig_XXXXX_actual_fv_total` - Výkon FVE
3. `sensor.oig_XXXXX_actual_aco_p` - Spotřeba domu
4. `sensor.oig_XXXXX_actual_aci_wtotal` - Výkon sítě
5. `sensor.oig_XXXXX_box_prms_mode` - Režim Box

---

## 🔧 Služby

### Co je `acknowledgement` parametr?

Potvrzení, že rozumíte důsledkům změny:

```yaml
acknowledgement: true # Ano, vím co dělám
```

**Proč je povinný?**

- Ochrana před neúmyslnými změnami
- Změna režimu má velký dopad
- Může zvýšit náklady
- Může snížit životnost baterie

### Mohu volat služby bez acknowledgement?

Ne. Služba selže s chybou:

```
Error: Missing required parameter: acknowledgement
```

### Jak dlouho trvá změna režimu?

**Typicky 2-5 sekund:**

1. Služba → ServiceShield (okamžitě)
2. ServiceShield → API (1-2s)
3. API → Box (1-2s)
4. Box → Potvrzení (1s)
5. Aktualizace entit (1s)

### Co když služba selže?

ServiceShield automaticky:

1. **Retry 3x** (s prodlevami)
2. **Logování** chyby
3. **Event** `oig_cloud_shield_failed`
4. **Notifikace** v logu

### Mohu volat více služeb najednou?

Ano! ServiceShield je seřadí do fronty:

```yaml
script:
  morning_routine:
    sequence:
      - service: oig_cloud.set_box_mode
        data:
          mode: "Home 1"
          acknowledgement: true
      - service: oig_cloud.set_grid_delivery
        data:
          mode: "On"
          acknowledgement: true
      - service: oig_cloud.set_boiler_mode
        data:
          mode: "CBB"  # legacy — použijte Dashboard V2 pro ovládání bojleru
          acknowledgement: true
```

> **Poznámka:** `set_boiler_mode` je legacy backend služba. Pro běžné ovládání bojleru používejte Dashboard V2, který poskytuje komfort-first planner, komfortní stav, a manuální override.

---

## 📊 Dashboard

### Kde najdu dashboard?

**Lokálně:**

```
http://homeassistant.local:8123/local/oig_cloud/dashboard.html?entity=oig_2206237016
```

**Z internetu:**

```
https://vase-domena.duckdns.org:8123/local/oig_cloud/dashboard.html?entity=oig_2206237016
```

### Jak přidat na hlavní dashboard?

```yaml
type: iframe
url: /local/oig_cloud/dashboard.html?entity=oig_2206237016
title: OIG Dashboard
aspect_ratio: 16:9
```

### Dashboard se nenačte (404)

**Kontrola:**

1. Existuje `/config/www/oig_cloud/dashboard.html`?
2. Restartovali jste HA po instalaci?
3. Správné `entity` v URL?

**Řešení:**

```bash
cd /config/custom_components/oig_cloud/
ls www/dashboard.html  # Musí existovat
```

### Dashboard se neaktualizuje

**Auto-refresh:**

- Dashboard se obnovuje každých 5s automaticky
- Můžete i ručně: `Ctrl+R` nebo tlačítko Obnovit

**Pokud nefunguje:**

1. Vyčistěte cache prohlížeče (`Ctrl+Shift+R`)
2. Zkontrolujte entity (unavailable?)
3. Zkuste jiný prohlížeč

### Jak funguje control panel na dashboardu?

**Části:**

1. **Box mode** — Home 1/Home 2/Home 3/Home UPS (kliknutím se změní, ServiceShield zpracuje)
2. **Grid delivery** — On/Off/Limited + limit (kliknutím se změní)
3. **Bojler** — zobrazení aktuálního stavu (pouze pro čtení; ovládání je v **Dashboard V2**) — legacy V1 čtení

> ⚠️ **Ovládání bojleru** (změna režimu CBB/Manuální, plánování ohřevu) bylo přesunuto do
> **Dashboard V2**. V1 control panel zobrazuje aktuální režim bojleru, ale zápis je zablokován.

**Kliknutím na Box mode / Grid delivery:**

- Otevře se potvrzovací dialog
- Potvrdíte
- ServiceShield to zpracuje
- Vidíte ve frontě

---

## 🛡️ ServiceShield

### Co je ServiceShield?

Ochranný systém který:

- 🛡️ Chrání API před přetížením
- 📋 Řadí volání do fronty
- ✅ Validuje parametry
- 🔄 Automaticky opakuje při selhání
- 📊 Poskytuje monitoring

### Proč je to potřeba?

**Bez ServiceShield:**

```python
# ŠPATNĚ - rychlé volání = přetížení API
await set_box_mode("Home 1")
await set_grid_delivery("On")
await set_boiler_mode("CBB")
# ❌ API error: Too many requests
```

**S ServiceShield:**

```python
# DOBŘE - fronta = ochrana API
await shield.add_call(set_box_mode, "Home 1")      # Do fronty
await shield.add_call(set_grid_delivery, "On")   # Do fronty
await shield.add_call(set_boiler_mode, "CBB")    # Do fronty (legacy, prefer Dashboard V2)
# ✅ Postupné zpracování s prodlevami
```

### Jak vidím frontu?

**Dashboard:**

- ServiceShield panel (vpravo dole)
- Zobrazuje běžící + čekající + dokončené

**Entity:**

```yaml
sensor.oig_XXXXX_service_shield_status    # Aktivní/Neaktivní
sensor.oig_XXXXX_service_shield_queue     # Počet ve frontě
sensor.oig_XXXXX_service_shield_activity  # Aktuální služba
```

### Co znamenají stavy ve frontě?

| Stav          | Ikona | Popis                   |
| ------------- | ----- | ----------------------- |
| **Pending**   | ⏳    | Čeká na zpracování      |
| **Running**   | ▶️    | Právě běží              |
| **Completed** | ✅    | Úspěšně dokončeno       |
| **Failed**    | ❌    | Selhalo (po 3 pokusech) |

### ServiceShield je pomalý?

**Je to záměr:**

- Min. 2s mezi voláními (ochrana API)
- Validace před odesláním
- Čekání na potvrzení

**Výhody:**

- ✅ Žádné chyby API
- ✅ Žádné ztracené změny
- ✅ Viditelný progress

---

## 🤖 Automatizace

### Jak vytvořit automatizaci?

**UI:**

```
Nastavení → Automatizace a scény → Vytvořit automatizaci
```

**YAML:**

```yaml
automation:
  - alias: "Název"
    trigger:
      - platform: ...
    condition:
      - condition: ...
    action:
      - service: oig_cloud.set_box_mode
        data:
          mode: "Home 1"
          acknowledgement: true
```

### Automatizace podle spot ceny?

```yaml
automation:
  - alias: "Nabíjení při levné elektřině"
    trigger:
      - platform: numeric_state
        entity_id: sensor.oig_XXXXX_spot_price_current_15min
        below: 1.5
    condition:
      - condition: numeric_state
        entity_id: sensor.oig_XXXXX_bat_soc
        below: 90
    action:
      - service: oig_cloud.set_box_mode
        data:
          mode: "Home UPS"
          acknowledgement: true
```

### Automatizace podle času?

```yaml
automation:
  - alias: "Home 1 ráno"
    trigger:
      - platform: time
        at: "06:00:00"
    action:
      - service: oig_cloud.set_box_mode
        data:
          mode: "Home 1"
          acknowledgement: true
```

### Jak testovat automatizace?

**Ruční spuštění:**

```
Nastavení → Automatizace → [vyber] → Spustit
```

**Logy:**

```
Nastavení → Systém → Protokoly → Filtr: "oig_cloud"
```

---

## ⚡ Výkon a stabilita

### Integrace zatěžuje HA?

**Typicky ne.**

- Intervaly jsou řízené (nepálí API)\n- Vše běží asynchronně\n- ServiceShield chrání API volání

### Mohu snížit zátěž?

Ano – zvyšte `standard_scan_interval` a/nebo `extended_scan_interval` v konfiguraci integrace.

### Integrace způsobuje restarty HA?

**Ne, pokud:**

- Máte aktuální Home Assistant (2023.x+)
- Správně nainstalovaná integrace
- Validní credentials

**Pokud ano:**

1. Zkontrolujte logy
2. Zkontrolujte Python verzi (3.11+)
3. Reinstalujte integraci

### Jak optimalizovat výkon?

**Tipy:**

1. **Standardní interval:** 300–600 s je obvykle dostatečné
2. **Disable unused features:** Vypněte bojler/solar pokud nemáte
3. **Používejte automatizace:** Místo ručních změn
4. **Cache:** Dashboard má vlastní cache

---

## 🔒 Bezpečnost

### Jsou credentials bezpečně uložené?

**Ano!**

- Uložené v `.storage` (šifrovaně)
- Nepřístupné přes API
- Nelogují se
- HTTPS komunikace s OIG API

### Mohu sdílet dashboard veřejně?

**Ne doporučeno!**

- Dashboard zobrazuje citlivá data
- Může ovládat váš systém
- Použijte autentizaci HA

**Bezpečně:**

```yaml
# Pouze pro přihlášené uživatele
- type: iframe
  url: /local/oig_cloud/dashboard.html?entity=oig_2206237016
  title: OIG Dashboard
  # Vyžaduje přihlášení do HA
```

### Co když někdo získá přístup k HA?

**Může:**

- Vidět vaše data
- Měnit režimy
- Ovládat box

**Ochrana:**

1. **Silné heslo** do Home Assistant
2. **2FA** (two-factor auth)
3. **HTTPS** s certifikátem
4. **Fail2ban** proti brute-force
5. **Home 2** pravidelně

### Loguje se API komunikace?

**Ano, ale bezpečně:**

- Credentials se NELOGUJÍ
- API volání ANO (bez hesla)
- Odpovědi ANO (bez citlivých dat)

**Kde:**

```
/config/home-assistant.log
```

**Filtr:**

```bash
grep "oig_cloud" home-assistant.log
```

---

## 🆘 Časté problémy

### Entity jsou "unavailable"

**Řešení:**

1. Počkejte 5-10 minut (první sync)
2. Zkontrolujte přihlášení (Options)
3. Restartujte HA
4. Reload integrace

### Služby nefungují

**Kontrola:**

1. ServiceShield aktivní?
2. Správné parametry?
3. `acknowledgement: true`?
4. API dostupné?

**Debug:**

```
Vývojářské nástroje → Služby → oig_cloud.set_box_mode
```

### Dashboard se nenačte

**Řešení:**

1. Zkontrolujte cestu: `/config/www/oig_cloud/dashboard.html`
2. Restartujte HA
3. Vyčistěte cache (`Ctrl+Shift+R`)
4. Správné `entity` v URL?

### Vysoká spotřeba CPU/RAM

**Možné příčiny:**

1. Krátký standardní interval (< 60 s)
2. Moc instancí integrace
3. Chyba v automatizaci (smyčka)

**Řešení:**

Zvyšte `standard_scan_interval` a vypněte nepoužívané moduly v konfiguraci (solární předpověď, pricing, dashboard).

---

## 📚 Další zdroje

- 📖 [README.md](../../README.md) - Přehled integrace
- 🎛️ [CONFIGURATION.md](CONFIGURATION.md) - Wizard guide
- 📊 [DASHBOARD.md](DASHBOARD.md) - Dashboard dokumentace
- 📋 [ENTITIES.md](ENTITIES.md) - Seznam entit
- 🔧 [SERVICES.md](SERVICES.md) - Služby
- 🤖 [AUTOMATIONS.md](AUTOMATIONS.md) - Příklady automatizací
- 🛠️ [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Řešení problémů

---

## 💬 Komunita a podpora

**GitHub:**

- Issues: [github.com/your-repo/issues](https://github.com/your-repo/issues)
- Discussions: [github.com/your-repo/discussions](https://github.com/your-repo/discussions)

**Home Assistant:**

- Forum: [community.home-assistant.io](https://community.home-assistant.io)
- Discord: [discord.gg/home-assistant](https://discord.gg/home-assistant)

---

**FAQ aktualizováno k verzi 2.0** 📖
