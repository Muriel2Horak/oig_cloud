# R2-AIKEYS — audit ukládání klíčů a AI plochy

## Verdikt

| Oblast | Verdikt | Důkaz |
|---|---|---|
| Klíč v `entry.options` | OK pro aktuální REST a options flow; klíč je mimo config entry | VERIFIED: `custom_components/oig_cloud/ai/key_store.py:35` používá `Store(..., f"oig_cloud.ai_{entry_id}", private=True)`; `config_registry.py:259-264` AI sekce nemá key field; `config/steps.py:3599-3612` popne `ai_api_key` před `async_update_entry` |
| REST echo klíče | OK pro `/ai` a `module_config`; klíč se nevrací | VERIFIED: `key_store.py:60-67` vrací jen `{provider,key_set,verified}`; `ha_rest_api.py:1357-1358` vrací `async_api_state`; `ha_rest_api.py:1219-1229` `module_config` neiteruje sekci `ai` |
| Admin gate `/ai` | OK, fail-closed | VERIFIED: `ha_rest_api.py:1342-1347`, `:1349-1358`, `:1360-1367`; test `tests/test_ai_rest.py:85-98`, `:177-191` |
| Prompt anonymita | Částečně OK; `install` je strukturálně allow-listovaný, ale `task: str` je volný text | VERIFIED: `ai/backends.py:60-72` vkládá `task` beze sanitizace; `:96-107` teprve `install` mapu převádí přes allow-list |
| Deletion/rotation | NEOK | VERIFIED: `key_store.py` nemá delete/clear metodu; `config/steps.py:3606-3609` zapisuje nový klíč jen při neblank hodnotě; `rg -n "async_remove_entry|AiKeyStore|oig_cloud\\.ai_" custom_components/oig_cloud tests` našel jen `async_remove_config_entry_device`, žádný config-entry removal cleanup |

Počty nálezů vyžadujících fix před D8: CRITICAL 0, MAJOR 6, MINOR 1. Neutrální/pozitivní ověření jsou v tabulkách kvůli pokrytí briefu, ale nejsou započtena jako fixy.

## Storage

| # | Severity | Stav | Nález | Důkaz | Dopad |
|---|---:|---|---|---|---|
| S1 | MAJOR | VERIFIED | Neexistuje mazání AI klíče ani cleanup při odstranění integrace. `AiKeyStore` umí jen set/get/mark/state; `async_unload_entry` uklízí runtime objekty, ne privátní `.storage/oig_cloud.ai_<entry_id>`. | `key_store.py:43-67`; `__init__.py:1860-1929`; `rg -n "async_remove_entry|AiKeyStore|oig_cloud\\.ai_" custom_components/oig_cloud tests` našel `__init__.py:1932 async_remove_config_entry_device`, ne `async_remove_entry`. | Uživatel neumí klíč odstranit. Po odstranění config entry může klíč zůstat v `.storage`. |
| S2 | MAJOR | VERIFIED | Options flow při změně providera bez nového klíče nechá starý klíč ve store; při zadání klíče nevaliduje provider ani prefix. | `config/steps.py:3552-3583` vždy ukazuje `ai_api_key`; `:3606-3609` ukládá key pod `updates["ai_provider"]`; `:3611-3612` uloží options i bez změny store. | Může vzniknout rozpor `entry.options.ai_provider != AiKeyStore.provider`, osiřelý klíč pro `ai_task` nebo klíč uložený pod prázdným providerem. |
| S3 | MAJOR | VERIFIED | REST `/ai` uloží nový klíč před ověřením a setup backendu pak nekontroluje `verified_at`. | `ha_rest_api.py:1394-1395` `async_set_key` před `async_verify_key`; `:1418-1420` při chybě vrací stav store; `ai_task.py:164-181` backend přidá entitu, pokud existuje provider a key, bez kontroly `verified`. | Rate-limit nebo dočasná chyba provideru může přepsat funkční klíč neověřeným; neověřený klíč se může později používat. |
| S4 | MINOR | VERIFIED | Samotné uložení mimo options je dobře ohraničené. | `key_store.py:35` privátní store; `config_registry.py:259-264` "API KEY IS DELIBERATELY ABSENT"; `tests/test_ai_config_flow.py:94-117`; `tests/test_ai_key_store.py:60-68`. | Klíč se nemá dostat do config-entry exportu ani standardního options dumpu. |

## Transport a expozice

| # | Severity | Stav | Nález | Důkaz | Dopad |
|---|---:|---|---|---|---|
| T1 | MINOR | VERIFIED | Směrem ke Groq/NVIDIA jde klíč jen v `Authorization` hlavičce; není v promptu ani JSON payloadu backendu. | `ai/backends.py:85-87` hlavičky; `:90-94` `/models`; `:107-116` chat payload bez klíče; `tests/test_ai_backends.py:66-75`. | Správné oddělení provider credentials od obsahu promptu. |
| T2 | MINOR | INFERRED | Verify error vrací `detail: str(err)` bez redakce. Vlastní `RuntimeError` v backendu klíč neobsahuje, ale libovolná výjimka ze session vrstvy může nést request context. | `ha_rest_api.py:1411-1420`; redakce je použita jen v logu na `:1414-1417`, ne na `detail`. | Pokud nižší HTTP vrstva nebo testovací wrapper zahrne hlavičky do `str(err)`, klíč se může dostat do REST odpovědi/UI. |
| T3 | MAJOR | VERIFIED | `task` je volný string vložený přímo do promptu, takže boundary není plně strukturální. | `ai/backends.py:60-72` `return f"task={task}\n" + ...`; `ai_task.py:95-96` dnes posílá konstantu `"ai_task_generate_data"`. | Budoucí `validate_config` caller může omylem předat label/instrukci s GPS, box id nebo entity id a obejít allow-list přes řádek `task=`. |

## Autorizace

| # | Severity | Stav | Zjištění | Důkaz | Hodnocení |
|---|---:|---|---|---|---|
| A1 | MAJOR | VERIFIED | Non-admin dnes nemůže číst `/ai` stav (`provider`, `key_set`, `verified`) ani zapisovat key. | `ha_rest_api.py:1342-1347`; `tests/test_ai_rest.py:85-98`, `:187-191`. | Přijatelné. Tento stav prozrazuje existenci externího účtu, takže admin-only je správně. |
| A2 | MAJOR | VERIFIED | `module_config` GET není admin-gated, ale aktuálně nevrací sekci `ai`; Plan 4 to stejně opravuje kvůli GPS. | `ha_rest_api.py:1213-1229` bez admin checku a jen `("basic","modules","battery","solar","boiler")`; Plan 4 `git show ... | nl -ba | sed -n '51,101p'` řádky 55-101 požadují 403 pro non-admin GET. | Není přímý únik AI klíče/stavu, ale nesmí se použít jako budoucí AI status povrch. |
| A3 | MAJOR | INFERRED | Budoucí `oig_ai_status` sensor by obešel REST admin gate, pokud ponese provider, `key_set`, `verified` nebo last error v HA state/attributes. | SCOPE `SCOPE-REVISION.md:73-74` vyžaduje senzor; `rg -n "oig_ai_status|ai_status" custom_components/oig_cloud tests` dnes nenašel implementaci. | Plán D8 musí říct, že sensor je diagnostický a bez tajemství, provider detailů a raw errorů; jinak non-admin/recorder uvidí stav, který `/ai` správně chrání. |

## Prompt anonymita

| # | Severity | Stav | Zjištění | Důkaz | Dopad |
|---|---:|---|---|---|---|
| P1 | MAJOR | VERIFIED | `install` data jsou filtrována allow-listem až na odchozí hranici; caller nemá parametr pro raw prompt content. | `ai/backends.py:50-57` allow-list; `:96-107` mapping místo free textu; `tests/test_ai_anonymity.py:69-91`, `:94-119`; `tests/test_ai_backends.py:157-179`. | Dobrá strukturální ochrana pro hodnoty konfigurace. |
| P2 | MAJOR | VERIFIED | Allow-list výslovně zakazuje lokaci a identifikátory, ale budoucí `validate_config` zatím nemá vlastní collector ani test na reálné request body. | `ai/backends.py:46-49`; SCOPE `SCOPE-REVISION.md:11-12` říká `validate_config` "BEZ lokace"; `rg -n "validate_config|ai/tasks.py" custom_components/oig_cloud tests` našel jen backend testy, ne úlohu. | D8 plán nesmí říct jen "anonymní prompt"; musí dodat collector z registry polí a wire test s reálnými `solar_forecast_latitude/longitude`, `box_id`, `entity_id`, e-mail. |
| P3 | MAJOR | VERIFIED | `ai_task` delegační větev nepoužívá OIG backend, ale její reálné HA API volání je označeno jako neověřené. | `ai_task.py:83-97` branchuje provider; `:108-138` delegace; `:116-126` říká "UNVERIFIED" a test monkeypatchuje metodu. | Pokud se delegace později opraví stylem "vezmi `task.instructions` a pošli do OIG backendu", vrátí se původní únik; plán musí zachovat zákaz raw instructions. |

## Deletion a rotation

| Operace | Dnes | Důkaz | Verdikt |
|---|---|---|---|
| Replace přes `/ai` validním klíčem | Přepíše `provider`, `api_key`, resetuje `verified_at`; stará hodnota v aktuálním store dictu zmizí. | `key_store.py:43-46`; `ha_rest_api.py:1394-1424`. | OK pro úspěšnou rotaci, ale až po vyřešení S3. |
| Replace přes options flow | Uloží key jen když pole není blank; neověří provider/prefix; blank ponechá starý store. | `config/steps.py:3599-3612`. | NEOK. |
| Remove key | Není REST action, není options action, není `AiKeyStore.async_clear`. | `key_store.py:43-67`; `onboarding-data.ts:139-148` posílá jen verify. | NEOK. |
| Integration removal | Není `async_remove_entry` cleanup pro `oig_cloud.ai_<entry_id>`. | `rg -n "async_remove_entry|async_remove_config_entry_device" custom_components/oig_cloud/__init__.py` našel jen device removal `__init__.py:1932`. | NEOK. |

## Plánovaná AI práce — nové key/privacy riziko

| Plánovaná část | Nové riziko | Co musí plán D8 explicitně říct před implementací |
|---|---|---|
| `validate_config` | Odeslání raw `entry.options` by zahrnulo GPS, box id, entity ids, případně legacy secrets; volný `task` string může obejít allow-list. | Zavést typed collector jen pro numerické anonymní hodnoty; `task` jako enum/konstanta, ne volný text; wire test nad skutečným POST body s negativními asercemi na `solar_forecast_latitude`, `solar_forecast_longitude`, `box_id`, `entity_id`, e-mail a všechny `*_api_key`. |
| Volitelné ověření ceníku proti aktuálnímu ceníku | Ceníky nejsou AI pipeline; upload účtu/PDF nebo zákaznického tarifu by změnil privacy profil a mohl nést osobní data. | Opřít se o bundled ERÚ dataset; AI cross-check smí dostat jen anonymní sazbu/distributor/číselné ceny a source metadata, ne fakturu, smlouvu, adresu, odběrné místo ani účet. Výstup je pomocná kontrola, ne zdroj cen. |
| Fallback chain | Fallback může poslat stejný prompt více modelům/providerům; to je nový souhlasový a logovací problém. | Fallback jen v rámci uživatelem zvoleného providera a jeho klíče, pokud není výslovný souhlas pro cross-provider; žádné raw model error bodies v REST/sensor/logu; fallback pořadí z bundled `ai_models`, bez runtime fetch. |
| AI status sensor | HA entity state/attributes jsou širší plocha než admin REST a mohou jít do recorderu/history. | Sensor nesmí nést klíč, prefix, `key_set`, provider detail ani raw last error. Stav jen obecné enumy typu `not_configured/verified/unverified/error`; entity disabled-by-default nebo diagnostic; atributy redigované a testované. |

## Fix before implementation starts

1. MAJOR: Přidat `AiKeyStore.async_clear()` a admin-only delete action (`POST /ai {action:"delete"}` nebo `DELETE /ai`); napojit cleanup do config-entry removal a testovat, že `.storage/oig_cloud.ai_<entry_id>` zmizí.
2. MAJOR: Změnit `/ai` rotaci na `verify -> store -> mark_verified`, nebo ukládat neověřený kandidát odděleně od aktivního klíče; `async_setup_entry` smí použít jen verified key.
3. MAJOR: Opravit options flow: key field podmínit providerem, zakázat key pro `ai_task`/blank provider, ověřit prefix stejně jako REST, při změně providera bez key buď failnout, nebo jasně smazat starý key.
4. MAJOR: Udělat prompt boundary plně strukturální: `task` jako enum/konstanta, ne libovolný string; přidat test, že PII v task labelu nejde na wire.
5. MAJOR: D8 plán pro `validate_config` musí dodat collector + wire privacy test; ne jen obecné "prompty anonymní".
6. MAJOR: D8 plán pro fallback/status sensor musí stanovit consent boundary, redakci errorů a zákaz provider/key state v HA sensoru.
7. MINOR: Redigovat `detail: str(err)` před REST odpovědí nebo vracet jen klasifikovaný error code bez raw exception textu.
