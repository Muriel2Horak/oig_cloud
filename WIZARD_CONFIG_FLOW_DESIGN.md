# 🧙‍♂️ Návrh pokročilého Wizard Config Flow

## Koncept

Config Flow v Home Assistant **plně podporuje** pokročilé wizard flow s:

- ✅ Postupným procházením sekcí (multi-step)
- ✅ Možností vracení se zpět
- ✅ Podmíněnými kroky (skip pokud není potřeba)
- ✅ Validací na každém kroku
- ✅ Preview a souhrnem před dokončením

## Struktura Wizardu

### 1. Inicializační flow (`async_step_user`)

```
┌─────────────────────────────────┐
│  🎯 Vítejte v OIG Cloud         │
├─────────────────────────────────┤
│  Zvolte typ nastavení:          │
│  ○ Rychlé nastavení (doporučeno)│
│  ○ Pokročilé nastavení (wizard) │
│  ○ Import z YAML                │
└─────────────────────────────────┘
```

### 2. Wizard Flow - Postupné kroky

```
Krok 1: Přihlášení
    ↓
Krok 2: Základní moduly (checkboxy)
    ↓
Krok 3: Solární předpověď (pokud zapnuto)
    ↓
Krok 4: Predikce baterie (pokud zapnuto)
    ↓
Krok 5: Cenové nastavení (pokud zapnuto)
    ↓
Krok 6: Rozšířené senzory (pokud zapnuto)
    ↓
Krok 7: Dashboard (pokud zapnuto)
    ↓
Krok 8: Shrnutí a dokončení
```

## Implementace s možností vracení

### Klíčové komponenty:

1. **State Management**

   ```python
   self._wizard_data = {}  # Ukládá data z kroků
   self._wizard_step = 0   # Aktuální krok
   self._enabled_steps = [] # Které kroky jsou aktivní
   ```

2. **Navigation**

   ```python
   # Každý step má:
   - Tlačítko "Zpět" (vrátí na předchozí krok)
   - Tlačítko "Další" (pokračuje na další)
   - Tlačítko "Přeskočit" (u volitelných kroků)
   ```

3. **Conditional Flow**
   ```python
   def _get_next_step(self) -> str:
       """Dynamicky určí další krok podle enabled modulů"""
   ```

## Příklad implementace

### Multi-step s tlačítky Zpět/Další

Home Assistant má několik způsobů, jak implementovat navigaci:

#### A) Pomocí menu (jednodušší, ale bez "Zpět")

```python
async def async_step_wizard_menu(self, user_input=None):
    return self.async_show_menu(
        step_id="wizard_menu",
        menu_options=["step_1", "step_2", "step_3"]
    )
```

#### B) Pomocí show_form s flow_id (s možností Zpět) ✅ DOPORUČENO

```python
class ConfigFlow:
    def __init__(self):
        self._wizard_data = {}
        self._step_history = []  # Historie kroků pro "Zpět"

    async def async_step_wizard_1(self, user_input=None):
        if user_input is not None:
            if user_input.get("go_back"):
                # Vrátit se zpět
                return await self._go_back()

            # Uložit data
            self._wizard_data.update(user_input)
            self._step_history.append("wizard_1")

            # Pokračovat na další krok
            return await self.async_step_wizard_2()

        return self.async_show_form(
            step_id="wizard_1",
            data_schema=vol.Schema({...}),
            description_placeholders={
                "step": "1/8",
                "back_available": "Ne" if not self._step_history else "Ano"
            }
        )

    async def _go_back(self):
        """Vrátit se na předchozí krok"""
        if self._step_history:
            prev_step = self._step_history.pop()
            return await getattr(self, f"async_step_{prev_step}")()
        return await self.async_step_user()
```

#### C) Pomocé FlowHandler.async_show_progress (pro dlouhé operace)

```python
async def async_step_validate(self, user_input=None):
    # Zobrazit progress bar
    return self.async_show_progress(
        step_id="validate",
        progress_action="testing_connection"
    )
```

## Konkrétní návrh pro OIG Cloud

### Struktura kroků:

```python
WIZARD_STEPS = [
    "wizard_welcome",        # 0. Úvod + výběr módu
    "wizard_credentials",    # 1. Přihlášení
    "wizard_modules",        # 2. Výběr modulů
    "wizard_intervals",      # 3. Intervaly načítání
    "wizard_solar",          # 4. Solární předpověď (conditional)
    "wizard_battery",        # 5. Predikce baterie (conditional)
    "wizard_pricing",        # 6. Cenové nastavení (conditional)
    "wizard_extended",       # 7. Rozšířené senzory (conditional)
    "wizard_dashboard",      # 8. Dashboard (conditional)
    "wizard_summary",        # 9. Shrnutí a dokončení
]
```

### Navigační logika:

```python
def _get_next_step(self, current_step: str) -> str:
    """Určí další krok podle enabled modulů"""
    current_idx = WIZARD_STEPS.index(current_step)

    # Procházet další kroky
    for step in WIZARD_STEPS[current_idx + 1:]:
        if step == "wizard_summary":
            return step  # Vždy skončit shrnutím

        # Podmíněné kroky
        if step == "wizard_solar" and not self._wizard_data.get("enable_solar_forecast"):
            continue
        if step == "wizard_battery" and not self._wizard_data.get("enable_battery_prediction"):
            continue
        if step == "wizard_pricing" and not self._wizard_data.get("enable_pricing"):
            continue
        # ... další podmínky

        return step

    return "wizard_summary"
```

## UI/UX Best Practices

### 1. Progress Indicator

```python
description_placeholders={
    "step": f"{current_step}/{total_steps}",
    "progress_bar": "▓▓▓▓░░░░",  # Vizuální progress
}
```

### 2. Validace na každém kroku

```python
errors = {}
if not user_input.get("username"):
    errors["username"] = "required"
    return self.async_show_form(..., errors=errors)
```

### 3. Výchozí hodnoty z předchozích kroků

```python
vol.Optional(
    "solar_latitude",
    default=self._wizard_data.get("solar_latitude", 50.0)
): vol.Coerce(float)
```

### 4. Podmíněné zobrazování polí

```python
schema_fields = {
    vol.Required("enable_solar"): bool,
}

# Pokud je solar zapnutý, přidat detaily
if self._wizard_data.get("enable_solar"):
    schema_fields.update({
        vol.Required("solar_kwp"): vol.Coerce(float),
        vol.Required("solar_latitude"): vol.Coerce(float),
        # ...
    })
```

## Výhody Wizard Flow

✅ **Uživatelská přívětivost** - postupný průvodce místo velkého formuláře
✅ **Kontextová nápověda** - každý krok má specifické informace
✅ **Validace po kroku** - chyby se zachytí dříve
✅ **Přeskočení nepotřebného** - conditional flow šetří čas
✅ **Přehlednost** - jasný progress a možnost vrátit se

## Next Steps

1. ✅ Přepsat `ConfigFlow` do wizard struktury
2. ✅ Implementovat state management
3. ✅ Přidat navigaci Zpět/Další
4. ✅ Implementovat podmíněné kroky
5. ✅ Vytvořit summary step s přehledem
6. ✅ Přidat validace na každém kroku
7. ✅ Aktualizovat strings.json s novými kroky

## Poznámky

- ⚠️ **OptionsFlow může zůstat jako menu** - je to konfigurace pro pokročilé uživatele
- ⚠️ **ConfigFlow wizard je pouze při první instalaci** - pak už se používá OptionsFlow
- ✅ **Podporováno od Home Assistant 2021.3+** - všechny moderní verze
