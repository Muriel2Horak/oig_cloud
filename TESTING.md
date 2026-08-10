# Testing Guide - OIG Cloud Integration

## 🧪 Testovací Prostředí

Integrace podporuje více způsobů testování:

### 1. 🐳 Docker (Doporučeno)

Použití Home Assistant kontejneru pro testy:

```bash
# Spustit testy v HA kontejneru
./run_tests_docker.sh
```

Nebo manuálně:

```bash
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  homeassistant/home-assistant:2025.1.4 \
  sh -c "pip install pytest pytest-homeassistant-custom-component && pytest tests/ -v"
```

### 2. 📦 Lokální Python Environment

```bash
# Vytvořit virtual environment s přesným Pythonem 3.14.3
python3.14 --version  # musí vypsat Python 3.14.3
python3.14 -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate  # Windows

# Instalovat a ověřit přesné hashované dependencies
python -m pip install --require-hashes -r requirements-dev.txt
python -m pip check

# Spustit testy
pytest tests/ -v
```

### 3. 🔄 GitHub Actions

Testy se automaticky spustí při push/PR do `main` branch.

### 4. ✅ Hassfest (lokálně)

Hassfest je součást Home Assistant Core. Nejjednodušší je použít náš skript:

```bash
./scripts/run_hassfest.sh
```

Skript si stáhne HA Core do `local_dev/ha-core`, vytvoří venv a spustí:
`python -m script.hassfest --integration-path custom_components/oig_cloud`.

Volitelné proměnné:

- `HA_CORE_DIR=/cesta/k/ha-core` (přesměruje umístění core)
- `INTEGRATION_PATH=/cesta/k/custom_components/oig_cloud`

## 📋 Test Struktura

```
tests/
├── test_coordinator.py      # DataUpdateCoordinator testy
├── test_models.py           # Data model testy
├── test_oig_cloud_api.py    # API client testy
├── test_etag_caching.py     # ETag caching testy
└── sample-response.json     # Sample API data
```

## 🔧 pytest-homeassistant-custom-component

Používáme `pytest-homeassistant-custom-component` package, který poskytuje:

- ✅ Home Assistant fixtures
- ✅ Mock `hass` object
- ✅ Mock config entries
- ✅ Async test support
- ✅ Time travel utilities

## 📊 Test Coverage

```bash
# Spustit s coverage reportem
pytest tests/ --cov=custom_components.oig_cloud --cov-report=html

# Otevřít HTML report
open htmlcov/index.html  # Mac
xdg-open htmlcov/index.html  # Linux
start htmlcov/index.html  # Windows
```

## 🐛 Debugging Tests

```bash
# Verbose output
pytest tests/ -v -s

# Specific test file
pytest tests/test_coordinator.py -v

# Specific test
pytest tests/test_coordinator.py::TestOigCloudDataUpdateCoordinator::test_update -v

# Stop on first failure
pytest tests/ -x

# Show local variables on failure
pytest tests/ -l
```

## 🔍 Docker Compose Pro Development

Pro lokální development s živým HA:

```bash
# Spustit HA s integrací
docker-compose up -d homeassistant

# Zobrazit logy
docker-compose logs -f homeassistant

# Zastavit
docker-compose down
```

HA dostupný na: http://localhost:8123

## 🚀 CI/CD

GitHub Actions automaticky:

1. Spustí `hassfest` - validace integrace
2. Spustí `HACS` - HACS kompatibilita
3. Spustí `pytest` - unit testy
4. Generuje test report

## 📝 Psaní Testů

### Example Test

```python
import pytest
from homeassistant.core import HomeAssistant
from custom_components.oig_cloud.coordinator import OigCloudDataUpdateCoordinator

@pytest.mark.asyncio
async def test_coordinator_update(hass: HomeAssistant):
    """Test coordinator data update."""
    coordinator = OigCloudDataUpdateCoordinator(
        hass,
        api_client,
        update_interval=30
    )

    await coordinator.async_refresh()

    assert coordinator.data is not None
    assert "box_id" in coordinator.data
```

### Fixtures

```python
@pytest.fixture
def mock_api():
    """Mock OIG Cloud API."""
    with patch("custom_components.oig_cloud.api.OigCloudApi") as mock:
        mock.return_value.get_stats.return_value = {...}
        yield mock
```

## 🔗 Užitečné Odkazy

- [pytest-homeassistant-custom-component](https://github.com/MatthewFlamm/pytest-homeassistant-custom-component)
- [Home Assistant Testing](https://developers.home-assistant.io/docs/development_testing)
- [pytest Documentation](https://docs.pytest.org/)

## ⚠️ Poznámky

- Testy používají mock data z `sample-response.json`
- API volání jsou mockovaná - nevyžadují skutečný OIG Cloud účet
- Docker testy jsou izolované - nemění lokální prostředí
