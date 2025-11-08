# HTML Fragments

Tato složka obsahuje HTML fragmenty, které jsou dynamicky načítány JavaScriptem.

## Aktuální fragmenty

### `boiler-tab.html`
- **Použití**: Dynamicky načítán v `dashboard.html` (řádek 647)
- **Velikost**: ~19KB
- **Obsah**: Kompletní HTML pro bojler záložku
- **Načítání**: `fetch('boiler-tab.html')` v JavaScript

## Pravidla

### Kdy použít fragmenty
✅ **ANO** - Pro velké, samostatné sekce UI (jako celé taby)
❌ **NE** - Pro malé komponenty (raději generuj v JS)

### Struktura fragmentu
```html
<!-- Bez <html>, <head>, <body> - jen content -->
<div class="boiler-container">
    <!-- Obsah záložky -->
</div>
```

### Styling
- CSS pro fragment by měl být v `css/features/`
- Např. `boiler-tab.html` používá `css/features/boiler-tab.css`

### Budoucnost
- **Doporučení**: Postupně migrovat na generování v JS
- **Důvod**: Lepší cache control, bundle optimization
- **Kdy**: Při větším refactoringu UI

## Migration Notes

**2025-11-08**: Potvrzeno že `boiler-tab.html` JE používán (dynamicky)
- Předchozí analýza ho omylem označila jako obsolete
- Nalezeno v `dashboard.html` řádek 647: `fetch('boiler-tab.html')`
