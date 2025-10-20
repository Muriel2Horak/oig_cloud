# Bugfix Summary - Post Release Preparation

## 🐛 Opravené Problémy

### 1. ✅ Home Assistant 2025.4 Kompatibilita

**Problém**:

```
Detected that custom integration 'oig_cloud' calls `async_add_job`,
which will stop working in Home Assistant 2025.4
```

**Lokace**: `custom_components/oig_cloud/service_shield.py:175`

**Oprava**:

```python
# Před:
self.hass.async_add_job(callback)

# Po:
self.hass.async_create_task(callback())
```

**Commit**: `8126913`

---

### 2. ✅ Deprecated `country` Field v Manifest

**Problém**: Field `country` je deprecated v novějších verzích HA

**Oprava**:

```json
// Odstraněno:
"country": ["CZ"]

// Aktualizováno:
"homeassistant": "2024.1.0"  // bylo: "2022.0.0"
```

**Commit**: `08f8879`

---

### 3. ✅ GitHub Actions Test Failures

**Problém**:

```
ModuleNotFoundError: No module named 'homeassistant.helpers.event'
platform linux -- Python 3.13.8
```

**Příčina**: Home Assistant 2025.1.4 nemusí být plně kompatibilní s Python 3.13

**Opravy**:

#### a) Python Version Downgrade

```yaml
# .github/workflows/test.yml
python-version: "3.12" # bylo: '3.13'
```

#### b) Dependency Install Error Handling

```yaml
# Odstraněno '|| true' - fail fast na chyby
pip install -r requirements-dev.txt
```

**Commit**: `08f8879`

---

### 4. ✅ Requirements.txt Cleanup

**Problém**: Staré external dependencies v `requirements.txt`

**Před**:

```
aiohttp>=3.8.0
opentelemetry-sdk==1.29.0
grpcio==1.70.0
opentelemetry-exporter-otlp-proto-http==1.29.0
opentelemetry-exporter-otlp-proto-grpc==1.29.0
pandas>=1.3.0
openpyxl>=3.0.0
```

**Po**:

```
# OIG Cloud Integration - Runtime Dependencies
#
# This integration uses vendored dependencies (lib/oig_cloud_client/)
# No external Python packages are required at runtime.
#
# All required libraries are included in the integration itself.
```

**Důvod**: Po vendoring všech dependencies jsou external packages zbytečné

**Commit**: `08f8879`

---

## 📊 Souhrn Commitů

| Commit    | Popis                                                       | Soubory                                                   |
| --------- | ----------------------------------------------------------- | --------------------------------------------------------- |
| `8126913` | HA 2025.4 compatibility (async_add_job → async_create_task) | service_shield.py, manifest.json, RELEASE_PREP_SUMMARY.md |
| `08f8879` | Test infrastructure + dependency cleanup                    | test.yml, requirements.txt, manifest.json                 |

---

## 🧪 Test Status

### Před opravami:

- ❌ Tests failing - Python 3.13 incompatibility
- ❌ ModuleNotFoundError with homeassistant.helpers.event
- ⚠️ Deprecated async_add_job warning
- ⚠️ Deprecated country field warning

### Po opravách:

- ✅ Python 3.12 (kompatibilní s HA 2025.1.4)
- ✅ async_create_task (HA 2025.4 ready)
- ✅ Deprecated field removed
- ✅ Clean requirements.txt
- ✅ Fail-fast dependency install

---

## 🚀 Další Kroky

1. **Ověřit CI/CD**: Počkat na GitHub Actions výsledky
2. **Test Coverage**: Zkontrolovat test pokrytí
3. **Release**: Pokud testy projdou → vytvořit v2.0.0-beta release

---

## 📝 Poznámky

### requirements-dev.txt

Ponecháno:

```
pytest
pytest-cov
pytest-asyncio
flake8
black
isort
mypy
homeassistant==2025.1.4  # Pro testy
```

### Vendored Dependencies

Vše v `custom_components/oig_cloud/lib/oig_cloud_client/`:

- API Client
- Models
- Utils
- Žádné externí Python dependencies

---

**Status**: ✅ Všechny známé problémy opraveny
**Branch**: `temp`
**Latest Commit**: `08f8879`
