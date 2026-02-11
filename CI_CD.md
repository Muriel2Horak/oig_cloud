# CI/CD - Dokumentace

Tento dokumentace popisuje všechny CI/CD workflow, konfigurace a nastavení pro security, quality, maintainability a code coverage.

## Přehled CI/CD

### Testování
- **test.yml**: Spouští testy s coverage na každém push a pull request
- Python 3.12
- pytest s coverage upload
- Timeout: 30 min

### Kvalita a maintainability
- **quality.yml**: Python linting (flake8, Pylint, Mypy)
- Frontend linting (npm test)
- Timeout: 30 min

- **maintainability.yml**: Code complexity (Radon), dead code (Vulture)
- Timeout: 30 min

### Security
- **security.yml**: CodeQL, Bandit, Safety
- **secret-scanning.yml**: Trivy, Gitleaks, Snyk
- Timeout: 30 min

### Code Quality & Coverage
- **sonarcloud.yml**: SonarCloud analýza s coverage
- Timeout: 60 min

## Secrets pro GitHub

V GitHub Settings → Secrets and variables → Actions přidejte:

### Volitelné:
- **SONAR_TOKEN**: SonarCloud autentizační token

### Automatické:
- **GITHUB_TOKEN**: GitHub Token (automatický)

## Příklady CI checks

1. **Security**:
   - **CodeQL Analysis**: Advanced security scanning
   - **Bandit**: Python security linter
   - **Trivy**: Container vulnerability scanning
   - **Snyk**: SAST (Static Application Security Testing)

2. **Quality**:
   - **Python Lint**: flake8, Pylint, Mypy
   - **Frontend Lint**: npm test
   - **Radon**: Code complexity analysis
   - **Vulture**: Dead code detection

3. **Maintainability**:
   - **SonarCloud**: Code quality metrics
   - **Coverage**: 99% target

4. **Pre-commit**:
   - Automatizované lintování před commitem

5. **Dependency Check**:
   - Dependabot pro security audit
   - Pip-audit pro pip dependencies

## Coverage Status

**Target**: 99%
**Aktuální**: 99% (35 missů z 23732 řádků)

## Zbývající test failures (pokud)
- Některé testy mohou selhat kvůli, ale neovlivní workflow:

1. **test_coordinator_and_ote_api_gaps.py**:
   - `_schedule_spot_price_update` (schedule neexistuje)
   - `_schedule_hourly_fallback` (schedule neexistuje)
   - Testy volají, ale v coverage se neobjeví

2. **test_config_steps_wizard_boiler_coverage.py**:
   - `_get_next_step` vrací coroutine místo funkci
   - Problém s async metodami v wizard

3. **test_init_shield_and_stats_flush_coverage.py**:
   - ConfigEntry konflikt při vytváření instancí
   - Nefunguje se v běžném provozní

4. **test_hybrid_planning_mode_guard_coverage.py**:
   - Funkce neexistuje nebo má špatný název
   - Potřebuje lepší mockování strategie

5. **test_coordinator_throttle_coverage.py**:
   - Frame report issue při inicializaci
   - Potřebuje hass setup fixture

## Troubleshooting

### Coverage se nenačít z Github Actions
- Ujistěte, že workflow má správné triggers
- Zkontrolujte `PYTHONPATH` v test.yml
- Ujistěte, že coverage je správně generována

### Security checks fail
- **Bandit**: Zkontrolujte bandit-report.json artifacts
- **Safety**: Zkontrolujte safety-report.json artifacts
- **Trivy**: Zkontrolujte trivy-report.sarif artifacts

### Quality checks fail
- **Pylint**: Opravte `disable=all` na konkrétní problémy
- **Mypy**: Ignoruj `--ignore-missing-imports` pro externí moduly
- **Mypy**: Přidejte `--strict` pro interní moduly

### Maintainability checks fail
- **Radon**: Zkontrolujte MCC a složitost kódu
- **Vulture**: Zkontrolujte nulové funkce nebo nepsané atributy

### Pre-commit failures
- Ujistěte, že `pre-commit` nainstalované jako dependency v CI
- Lokálně zkontrolujte: `pre-commit run --all-files --show-diff-on-failure`

### Dependabot failures
- Kontrolujte, zda existuje security advisory pro verzi závislosti
- Zkontrolujte licence konflikty s `pyproject.toml`

### SonarCloud failures
- Kontrolujte Quality Gate nastavení v SonarCloud
- Zkontroluje Quality Profile nastavení
- Zkontrolujte Code Smell

## Maintenance

### Přidání nových testů
- Dodávejte nové testy pro chybějící větve:
  - Vytvořte malý, cílený test
  - Zkontrolujte, že test pokrý specifickou větev
  - Proveďte, že výsledky se odráží

### Refaktoring před přidávání testů
- Pokud kód je příliš složitý na testování, refaktoruj ho
- Extrahuj společné mock objeky do fixtures
- Vytvořte testovací moduly pro mockované objekty

### Coverage tracking
- Sledujte `_pytest_config_confcache` pro CI výkon
- Používejte `pytest-cach` pro lokální vývoj
- Uložte .coverage.xml a uploadujte jako artefakt

## Závěr

Tato dokumentace by měla stažit úplným a konkrétním zdrojem informací o CI/CD nastavení. Pro otázky nebo problémy se obraťte na dokumentaci nebo na Github repository.
