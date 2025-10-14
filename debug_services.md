# Potřebujeme najít kde se může validovat starý seznam režimů

# Chyba se pravděpodobně vyskytuje v Home Assistant Core validaci

# nebo v některém dalším schématu

# MOŽNÉ ŘEŠENÍ: Restart Home Assistant je klíčový

# Po restartu by se měly načíst nové definice ze services.yaml

# Pokud přetrvává chyba i po restartu, může být problém v:

# 1. Cache prohlížeče - vyčistit cache

# 2. Stará definice services někde v jiném souboru

# 3. Voluptuous schéma se načítá z jiného místa

# Debug kroky:

# 1. Restart Home Assistant

# 2. Vyčistit cache prohlížeče (Ctrl+Shift+R)

# 3. Zkontrolovat v Developer Tools -> Services že jsou všechny možnosti

# 4. Zkusit volat službu přes Developer Tools

# Pokud stále nefunguje, zkontrolujeme manifest.json a ostatní konfigurační soubory
