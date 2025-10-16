#!/bin/bash

# Quick monitoring pro jitter a ETag - zobrazí jen poslední hodnoty
# Použití: ./quick_monitor.sh

HOST="martin@10.0.0.143"
PASSWORD="HOmag79//"

echo "🔍 Poslední jitter logy:"
sshpass -p "$PASSWORD" ssh "$HOST" "docker exec homeassistant grep -E 'Applying jitter|Jitter:' /config/home-assistant.log 2>/dev/null | tail -5" || echo "  Zatím žádné..."

echo ""
echo "🔍 Poslední ETag responses:"
sshpass -p "$PASSWORD" ssh "$HOST" "docker exec homeassistant grep 'Response status' /config/home-assistant.log 2>/dev/null | tail -5" || echo "  Zatím žádné..."

echo ""
echo "🔍 Poslední request timestamps:"
sshpass -p "$PASSWORD" ssh "$HOST" "docker exec homeassistant grep 'Getting stats from' /config/home-assistant.log 2>/dev/null | tail -5 | awk '{print \$1, \$2}'" || echo "  Zatím žádné..."
