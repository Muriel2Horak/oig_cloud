#!/bin/bash
# Script pro analýzu OIG Cloud session manager logů

echo "🔍 OIG CLOUD SESSION MANAGER - LOG ANALYSIS"
echo "============================================"
echo ""

# SSH do HA a analyzuj logy
ssh martin@10.0.0.143 'docker exec homeassistant bash -c "
echo \"📊 STATISTIKY SESSION MANAGERU:\"
echo \"\"

# Počet inicializací
echo \"🔧 Session Manager inicializace:\"
grep -c \"SessionManager initialized\" /config/home-assistant.log 2>/dev/null || echo \"0\"
echo \"\"

# Počet autentizací
echo \"🔐 Celkový počet autentizací:\"
grep -c \"Authentication #\" /config/home-assistant.log 2>/dev/null || echo \"0\"
echo \"\"

# PHPSESSID cookie info
echo \"🍪 PHPSESSID cookies (posledních 5):\"
grep \"PHPSESSID:\" /config/home-assistant.log 2>/dev/null | tail -5
echo \"\"

# Úspěšné requesty
echo \"✅ Úspěšné requesty:\"
grep -c \"successful\" /config/home-assistant.log 2>/dev/null | grep -i \"request\" || echo \"0\"
echo \"\"

# Rate limiting
echo \"⏸️  Rate limiting události:\"
grep -c \"Rate limiting\" /config/home-assistant.log 2>/dev/null || echo \"0\"
echo \"\"

# Retry události
echo \"🔄 Retry pokusy:\"
grep -c \"Retrying in\" /config/home-assistant.log 2>/dev/null || echo \"0\"
echo \"\"

# Session expiry
echo \"⏰ Session expiry události:\"
grep -c \"Session expired\" /config/home-assistant.log 2>/dev/null || echo \"0\"
echo \"\"

# Poslední autentizace
echo \"🔐 Poslední autentizace (posledních 3):\"
grep \"Authentication #\" /config/home-assistant.log 2>/dev/null | tail -3
echo \"\"

# Session validity
echo \"✓ Session validity checks (posledních 5):\"
grep \"Session still valid\" /config/home-assistant.log 2>/dev/null | tail -5
echo \"\"

# Request statistics
echo \"📡 Requesty (posledních 10):\"
grep \"Request #\" /config/home-assistant.log 2>/dev/null | tail -10
echo \"\"

# Final statistics (pokud byl unload)
echo \"📊 FINAL STATISTICS (pokud byl session ukončen):\"
grep -A 15 \"SESSION MANAGER FINAL STATISTICS\" /config/home-assistant.log 2>/dev/null | tail -20
"'

echo ""
echo "✅ Analýza dokončena"
