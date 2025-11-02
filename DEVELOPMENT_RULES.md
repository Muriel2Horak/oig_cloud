# Development Rules - OIG Cloud Integration

## 🚨 KRITICKÁ PRAVIDLA - VŽDY DODRŽUJ

### 1. Deployment
- **VŽDY používej `./deploy_to_ha.sh` pro nasazení**
- **NIKDY** neupravuj soubory přímo na vzdáleném HA přes SSH
- **NIKDY** nepoužívej ruční `docker cp` nebo `scp`
- Deployment script zajišťuje:
  - Správné kopírování všech souborů
  - Restart Docker containeru
  - Zálohy

### 2. Vzdálené prostředí
- **Home Assistant běží na vzdáleném serveru** (ne lokálně)
- **Konfigurace**: `/Users/martinhorak/Downloads/oig_cloud/.ha_config`
  - HA_HOST=10.0.0.143
  - HA_URL=http://10.0.0.143:8123
- **SSH alias**: `ha` (nakonfigurováno v ~/.ssh/config)
- **Docker container**: `homeassistant`

### 3. Workflow
```bash
# 1. Upravíš kód lokálně v /Users/martinhorak/Downloads/oig_cloud/
# 2. Nasadíš pomocí:
./deploy_to_ha.sh

# 3. Pro kontrolu logů:
ssh ha "docker logs -f homeassistant"
```

### 4. Zakázané praktiky
- ❌ NIKDY nevytvářej `.backup` soubory v `custom_components/oig_cloud/`
- ❌ NIKDY neupravuj soubory přímo na serveru
- ❌ NIKDY nerestaruj HA jinak než přes deploy script
- ❌ NIKDY nepoužívej `python -c` testy lokálně (HA závislosti nejsou dostupné)

### 5. Testing
- Testy běží lokálně pomocí `pytest`
- Pro testování na HA použij deployment + kontrolu logů
- Při chybě VŽDY kontroluj logy na vzdáleném HA:
  ```bash
  ssh ha "docker logs homeassistant | tail -100"
  ```

### 6. Python Cache
- Pokud nastane problém s importy, vyčisti cache na vzdáleném HA:
  ```bash
  ssh ha "docker exec homeassistant rm -rf /config/custom_components/oig_cloud/__pycache__"
  ssh ha "docker restart homeassistant"
  ```

## 📁 Struktura projektu
```
/Users/martinhorak/Downloads/oig_cloud/  # Lokální vývoj
├── custom_components/oig_cloud/         # Integrace
├── .ha_config                           # Konfigurace vzdáleného HA
├── deploy_to_ha.sh                      # JEDINÝ způsob nasazení
└── tests/                               # Unit testy (lokálně)

Vzdálený HA:
/config/custom_components/oig_cloud/     # Nasazená integrace
```

## 🔄 Typický vývoj cycle
1. Edituj kód lokálně
2. `./deploy_to_ha.sh`
3. Kontroluj logy: `ssh ha "docker logs -f homeassistant"`
4. Opakuj

## ⚠️ Při chybě importu modulu
1. Zkontroluj soubory na vzdáleném HA: `ssh ha "docker exec homeassistant ls -la /config/custom_components/oig_cloud/"`
2. Smaž `.backup`, `.bak`, `.old` soubory
3. Vyčisti cache (viz výše)
4. Znovu nasaď přes `./deploy_to_ha.sh`
