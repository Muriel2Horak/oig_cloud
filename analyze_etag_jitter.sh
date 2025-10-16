#!/bin/bash

# Analýza ETag caching a Jitter funkčnosti z HA logů
# Použití: ./analyze_etag_jitter.sh

set -e

HOST="martin@10.0.0.143"
PASSWORD="HOmag79//"
CONTAINER="homeassistant"
LOG_FILE="/config/home-assistant.log"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 ANALÝZA ETAG CACHING A JITTER"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Kontrola inicializace
echo "🔍 1. INICIALIZACE OIG CLOUD API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
INIT_LOG=$(sshpass -p "$PASSWORD" ssh "$HOST" "docker exec $CONTAINER grep 'initialized with ETag' $LOG_FILE 2>/dev/null | tail -5" || echo "")

if [ -n "$INIT_LOG" ]; then
    echo "✅ ETag caching inicializován:"
    echo "$INIT_LOG" | while read line; do
        echo "   $line"
    done
else
    echo "❌ ETag inicializace nenalezena v logách"
fi
echo ""

# 2. Analýza HTTP Response Headers (ETag od serveru)
echo "🔍 2. HTTP RESPONSE HEADERS (ETag od serveru)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
RESPONSE_HEADERS=$(sshpass -p "$PASSWORD" ssh "$HOST" "docker exec $CONTAINER grep -E 'Response status.*ETag header' $LOG_FILE 2>/dev/null | tail -20" || echo "")

if [ -n "$RESPONSE_HEADERS" ]; then
    echo "📋 HTTP Responses (poslední 20):"

    # Počítadla
    TOTAL=0
    WITH_ETAG=0
    WITHOUT_ETAG=0
    STATUS_304=0

    while read line; do
        TOTAL=$((TOTAL + 1))

        # Extrakt status a ETag
        if echo "$line" | grep -q "ETag header: None"; then
            WITHOUT_ETAG=$((WITHOUT_ETAG + 1))
            echo "   ❌ $line"
        elif echo "$line" | grep -q "ETag header: "; then
            WITH_ETAG=$((WITH_ETAG + 1))
            echo "   ✅ $line"
        fi

        if echo "$line" | grep -q "status: 304"; then
            STATUS_304=$((STATUS_304 + 1))
        fi
    done <<< "$RESPONSE_HEADERS"

    echo ""
    echo "📊 STATISTIKA:"
    echo "   Celkem responses: $TOTAL"
    echo "   S ETag headerem: $WITH_ETAG ($(awk "BEGIN {printf \"%.1f\", ($WITH_ETAG/$TOTAL)*100}")%)"
    echo "   Bez ETag headeru: $WITHOUT_ETAG ($(awk "BEGIN {printf \"%.1f\", ($WITHOUT_ETAG/$TOTAL)*100}")%)"
    echo "   304 Not Modified: $STATUS_304"

    if [ $WITH_ETAG -gt 0 ]; then
        echo ""
        echo "✅ SERVER PODPORUJE ETAG!"
    else
        echo ""
        echo "❌ Server nepodporuje ETag (všechny responses mají ETag: None)"
    fi
else
    echo "⚠️  Žádné HTTP response logy nenalezeny"
    echo "   Možné příčiny:"
    echo "   - Debug logging není aktivní"
    echo "   - Ještě nebyl HTTP request"
    echo "   - Logy byly vymazány"
fi
echo ""

# 3. Analýza ETag Cache Hits
echo "🔍 3. ETAG CACHE HITS (If-None-Match)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
CACHE_HITS=$(sshpass -p "$PASSWORD" ssh "$HOST" "docker exec $CONTAINER grep -E '(ETag hit|304 Not Modified|💾 Caching)' $LOG_FILE 2>/dev/null | tail -30" || echo "")

if [ -n "$CACHE_HITS" ]; then
    echo "📋 Cache aktivita (poslední 30):"

    ETAG_HITS=0
    CACHE_304=0
    CACHE_STORES=0

    while read line; do
        if echo "$line" | grep -q "ETag hit"; then
            ETAG_HITS=$((ETAG_HITS + 1))
            echo "   📋 $line"
        elif echo "$line" | grep -q "304 Not Modified"; then
            CACHE_304=$((CACHE_304 + 1))
            echo "   ✅ $line"
        elif echo "$line" | grep -q "Caching ETag"; then
            CACHE_STORES=$((CACHE_STORES + 1))
            echo "   💾 $line"
        fi
    done <<< "$CACHE_HITS"

    echo ""
    echo "📊 CACHE STATISTIKA:"
    echo "   If-None-Match odesláno: $ETAG_HITS"
    echo "   304 Not Modified přijato: $CACHE_304"
    echo "   Nové ETagy uloženy: $CACHE_STORES"

    if [ $CACHE_304 -gt 0 ]; then
        HIT_RATE=$(awk "BEGIN {printf \"%.1f\", ($CACHE_304/($CACHE_304 + $CACHE_STORES))*100}")
        echo "   Cache hit rate: ~$HIT_RATE%"
    fi
else
    echo "⚠️  Žádná cache aktivita nenalezena"
fi
echo ""

# 4. Analýza Jitter
echo "🔍 4. POLLING JITTER ANALÝZA"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
JITTER_LOGS=$(sshpass -p "$PASSWORD" ssh "$HOST" "docker exec $CONTAINER grep -E 'Applying jitter|⏱️.*jitter' $LOG_FILE 2>/dev/null | tail -50" || echo "")

if [ -n "$JITTER_LOGS" ]; then
    echo "📋 Jitter hodnoty (poslední 50):"

    # Extrakt jitter hodnot
    JITTER_VALUES=()
    while read line; do
        # Extract číslo z formátu "+3.2s" nebo "-4.1s"
        VALUE=$(echo "$line" | grep -oE '[-+][0-9]+\.[0-9]+s' | head -1 | sed 's/s$//')
        if [ -n "$VALUE" ]; then
            JITTER_VALUES+=("$VALUE")

            # Formátovaný výstup s barvou
            if (( $(echo "$VALUE > 0" | bc -l) )); then
                echo "   ⏱️  $line"
            else
                echo "   ⏱️  $line"
            fi
        fi
    done <<< "$JITTER_LOGS"

    if [ ${#JITTER_VALUES[@]} -gt 0 ]; then
        echo ""
        echo "📊 JITTER STATISTIKA:"
        echo "   Celkem vzorků: ${#JITTER_VALUES[@]}"

        # Výpočet min/max/avg
        MIN=$(printf '%s\n' "${JITTER_VALUES[@]}" | sort -n | head -1)
        MAX=$(printf '%s\n' "${JITTER_VALUES[@]}" | sort -n | tail -1)
        AVG=$(printf '%s\n' "${JITTER_VALUES[@]}" | awk '{sum+=$1} END {printf "%.2f", sum/NR}')

        echo "   Minimum: ${MIN}s"
        echo "   Maximum: ${MAX}s"
        echo "   Průměr: ${AVG}s"
        echo "   Očekávaný rozsah: ±5.0s"

        # Kontrola rozsahu
        MIN_OK=$(echo "$MIN >= -5.0" | bc -l)
        MAX_OK=$(echo "$MAX <= 5.0" | bc -l)

        if [ "$MIN_OK" -eq 1 ] && [ "$MAX_OK" -eq 1 ]; then
            echo ""
            echo "   ✅ Jitter v očekávaném rozsahu (-5.0s až +5.0s)"
        else
            echo ""
            echo "   ⚠️  Jitter mimo očekávaný rozsah!"
        fi

        # Distribuce
        echo ""
        echo "   📊 Distribuce:"
        NEGATIVE=$(printf '%s\n' "${JITTER_VALUES[@]}" | awk '$1 < 0' | wc -l)
        POSITIVE=$(printf '%s\n' "${JITTER_VALUES[@]}" | awk '$1 > 0' | wc -l)
        ZERO=$(printf '%s\n' "${JITTER_VALUES[@]}" | awk '$1 == 0' | wc -l)

        echo "   Negativní (<0s): $NEGATIVE"
        echo "   Pozitivní (>0s): $POSITIVE"
        echo "   Nulové (=0s): $ZERO"
    fi
else
    echo "⚠️  Žádné jitter logy nenalezeny"
    echo "   Možné příčiny:"
    echo "   - Debug logging není aktivní"
    echo "   - Update cycle ještě neběžel"
fi
echo ""

# 5. Časové intervaly mezi requesty
echo "🔍 5. ČASOVÉ INTERVALY MEZI REQUESTY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
REQUEST_TIMES=$(sshpass -p "$PASSWORD" ssh "$HOST" "docker exec $CONTAINER grep 'Getting stats from' $LOG_FILE 2>/dev/null | tail -20" || echo "")

if [ -n "$REQUEST_TIMES" ]; then
    echo "📋 Request timestamps (poslední 20):"

    PREV_TIME=""
    INTERVALS=()

    while read line; do
        # Extract timestamp (formát: 2025-10-16 12:25:18.426)
        TIMESTAMP=$(echo "$line" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}')

        if [ -n "$TIMESTAMP" ]; then
            # Convert to epoch seconds
            EPOCH=$(date -j -f "%Y-%m-%d %H:%M:%S" "${TIMESTAMP%.*}" "+%s" 2>/dev/null || echo "")
            MILLIS=$(echo "$TIMESTAMP" | grep -oE '\.[0-9]{3}' | sed 's/\.//')
            EPOCH_MS="${EPOCH}${MILLIS}"

            if [ -n "$PREV_TIME" ] && [ -n "$EPOCH_MS" ]; then
                # Vypočítej interval v sekundách
                INTERVAL=$(awk "BEGIN {printf \"%.1f\", ($EPOCH_MS - $PREV_TIME) / 1000}")
                INTERVALS+=("$INTERVAL")
                echo "   ⏱️  $TIMESTAMP (interval: ${INTERVAL}s od předchozího)"
            else
                echo "   ⏱️  $TIMESTAMP (první request)"
            fi

            PREV_TIME=$EPOCH_MS
        fi
    done <<< "$REQUEST_TIMES"

    if [ ${#INTERVALS[@]} -gt 0 ]; then
        echo ""
        echo "📊 INTERVAL STATISTIKA:"

        MIN_INT=$(printf '%s\n' "${INTERVALS[@]}" | sort -n | head -1)
        MAX_INT=$(printf '%s\n' "${INTERVALS[@]}" | sort -n | tail -1)
        AVG_INT=$(printf '%s\n' "${INTERVALS[@]}" | awk '{sum+=$1} END {printf "%.1f", sum/NR}')

        echo "   Minimum: ${MIN_INT}s"
        echo "   Maximum: ${MAX_INT}s"
        echo "   Průměr: ${AVG_INT}s"
        echo "   Očekávaný rozsah: 25-35s (base 30s ± 5s jitter)"

        # Kontrola, zda je průměr blízko 30s
        AVG_OK=$(echo "$AVG_INT >= 25 && $AVG_INT <= 35" | bc -l)
        if [ "$AVG_OK" -eq 1 ]; then
            echo ""
            echo "   ✅ Průměrný interval odpovídá očekávání (30s ± jitter)"
        else
            echo ""
            echo "   ⚠️  Průměrný interval mimo očekávaný rozsah"
        fi
    fi
else
    echo "⚠️  Žádné request timestamps nenalezeny"
fi
echo ""

# 6. Celkové shrnutí
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 CELKOVÉ SHRNUTÍ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ETag support
if [ -n "$RESPONSE_HEADERS" ] && [ $WITH_ETAG -gt 0 ]; then
    echo "✅ ETag Caching: FUNGUJE"
    echo "   - Server podporuje ETag hlavičku"
    echo "   - If-None-Match se odesílá"
    if [ $CACHE_304 -gt 0 ]; then
        echo "   - 304 Not Modified responses aktivní"
        echo "   - Bandwidth savings: aktivní"
    fi
elif [ -n "$RESPONSE_HEADERS" ]; then
    echo "⚠️  ETag Caching: SERVER NEPODPORUJE"
    echo "   - Všechny responses mají ETag: None"
    echo "   - Fallback mode aktivní (funguje normálně)"
    echo "   - Žádné bandwidth savings (server limitation)"
else
    echo "❓ ETag Caching: NEDOSTATEČNÁ DATA"
    echo "   - Zapni debug logging a počkej na HTTP requesty"
fi

echo ""

# Jitter
if [ -n "$JITTER_LOGS" ] && [ ${#JITTER_VALUES[@]} -gt 0 ]; then
    echo "✅ Polling Jitter: FUNGUJE"
    echo "   - Jitter rozsah: ${MIN}s až ${MAX}s"
    echo "   - Průměr: ${AVG}s"
    echo "   - Load balancing: aktivní"
else
    echo "❓ Polling Jitter: NEDOSTATEČNÁ DATA"
    echo "   - Zapni debug logging a počkej na update cycles"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "💡 TIP: Pro continuous monitoring:"
echo "   watch -n 10 './analyze_etag_jitter.sh'"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
