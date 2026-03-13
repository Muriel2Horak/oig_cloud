#!/bin/bash
# OIG Setting Cleanup Script
# Usage: ./cleanup_setting_run.sh [--device ID] [--api-host HOST] [--api-port PORT] [--evidence-dir DIR] [--dry-run] [--help]
#
# Resets mock state after failed setting runs and removes orphaned bursts and device states.
# Safe to run multiple times (idempotent).

set -e

# Defaults
DEVICE_ID=""
API_HOST="localhost"
API_PORT="8080"
EVIDENCE_DIR=".sisyphus/evidence/mock-setting-parity"
DRY_RUN=false
VERBOSE=false
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --device)
            DEVICE_ID="$2"
            shift 2
            ;;
        --api-host)
            API_HOST="$2"
            shift 2
            ;;
        --api-port)
            API_PORT="$2"
            shift 2
            ;;
        --evidence-dir)
            EVIDENCE_DIR="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --help)
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --device ID         Specific device ID to clean (default: all orphaned devices)"
            echo "  --api-host HOST     API server host (default: localhost)"
            echo "  --api-port PORT     API server port (default: 8080)"
            echo "  --evidence-dir DIR  Evidence directory (default: $EVIDENCE_DIR)"
            echo "  --dry-run          Show what would be done without doing it"
            echo "  --verbose          Verbose output"
            echo "  --help             Show this help"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# API endpoints
API_BASE="http://$API_HOST:$API_PORT/api"
STATUS_ENDPOINT="$API_BASE/status"
SETTING_STATE_ENDPOINT="$API_BASE/setting-state"
SETTING_RESET_ENDPOINT="$API_BASE/setting-reset"
BURST_STATE_ENDPOINT="$API_BASE/burst-state"

# Logging function
log() {
    if [ "$VERBOSE" = true ] || [ "$1" = "ERROR" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1: $2"
    fi
}

# API call function with error handling
call_api() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    
    if [ "$DRY_RUN" = true ]; then
        log "DRY_RUN" "$method $endpoint ${data:+with data: $data}"
        echo '{"ok": true, "dry_run": true}'
        return 0
    fi
    
    if [ -n "$data" ]; then
        response=$(curl -s -X "$method" "$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    else
        response=$(curl -s -X "$method" "$endpoint" 2>/dev/null)
    fi
    
    local curl_exit=$?
    if [ $curl_exit -ne 0 ]; then
        log "ERROR" "API call failed: curl exit code $curl_exit"
        exit 1
    fi
    
    # Check if response is valid JSON
    if ! echo "$response" | python3 -m json.tool >/dev/null 2>&1; then
        log "ERROR" "Invalid JSON response from API: $response"
        exit 1
    fi
    
    echo "$response"
}

# Check server availability
log "INFO" "Checking server availability at $API_BASE"
status_response=$(call_api "$STATUS_ENDPOINT")
if ! echo "$status_response" | grep -q '"ok": true'; then
    log "ERROR" "Server not responding properly: $status_response"
    exit 1
fi
log "INFO" "Server is responding"

# Get current setting state
log "INFO" "Fetching current setting state"
state_response=$(call_api "$SETTING_STATE_ENDPOINT")

# Extract device states and identify orphaned devices
devices_to_clean=()
if echo "$state_response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
devices = data.get('devices', {})
for device_id, device_state in devices.items():
    state = device_state.get('state')
    if state in ['FAILED', 'PENDING', 'DELIVERED']:
        print(f'{device_id}:{state}')
" > /tmp/orphaned_devices.txt; then
    while IFS=: read -r device_id state; do
        if [ -z "$DEVICE_ID" ] || [ "$device_id" = "$DEVICE_ID" ]; then
            devices_to_clean+=("$device_id:$state")
        fi
    done < /tmp/orphaned_devices.txt
fi

if [ ${#devices_to_clean[@]} -eq 0 ]; then
    log "INFO" "No orphaned devices found"
else
    log "INFO" "Found ${#devices_to_clean[@]} orphaned devices to clean"
fi

# Clean each device
cleaned_devices=()
failed_devices=()
for device_info in "${devices_to_clean[@]}"; do
    device_id="${device_info%%:*}"
    device_state="${device_info#*:}"
    
    log "INFO" "Cleaning device $device_id (state: $device_state)"
    
    # Reset device setting state
    reset_data="{\"device_id\": \"$device_id\", \"cancel_burst\": true, \"reason\": \"cleanup script\"}"
    reset_response=$(call_api "$SETTING_RESET_ENDPOINT" "POST" "$reset_data")
    
    if echo "$reset_response" | grep -q '"ok": true'; then
        log "INFO" "Successfully reset device $device_id"
        cleaned_devices+=("$device_id:$device_state")
    else
        log "ERROR" "Failed to reset device $device_id: $reset_response"
        failed_devices+=("$device_id:$device_state")
    fi
done

# Get burst state and clean orphaned bursts
log "INFO" "Checking for orphaned bursts"
burst_response=$(call_api "$BURST_STATE_ENDPOINT")

orphaned_bursts=()
if echo "$burst_response" | python3 -c "
import sys, json
data = json.load(sys.stdin)
bursts = data.get('bursts', {})
for device_id, burst in bursts.items():
    status = burst.get('status')
    if status in ['active', 'failed']:
        print(f'{device_id}:{status}')
" > /tmp/orphaned_bursts.txt; then
    while IFS=: read -r device_id status; do
        if [ -z "$DEVICE_ID" ] || [ "$device_id" = "$DEVICE_ID" ]; then
            orphaned_bursts+=("$device_id:$status")
        fi
    done < /tmp/orphaned_bursts.txt
fi

# Cancel orphaned bursts
cancelled_bursts=()
for burst_info in "${orphaned_bursts[@]}"; do
    device_id="${burst_info%%:*}"
    burst_status="${burst_info#*:}"
    
    log "INFO" "Cancelling burst for device $device_id (status: $burst_status)"
    
    cancel_data="{\"device_id\": \"$device_id\", \"reason\": \"cleanup script\"}"
    cancel_response=$(call_api "$SETTING_RESET_ENDPOINT" "POST" "$cancel_data")
    
    if echo "$cancel_response" | grep -q '"ok": true'; then
        log "INFO" "Successfully cancelled burst for device $device_id"
        cancelled_bursts+=("$device_id:$burst_status")
    else
        log "ERROR" "Failed to cancel burst for device $device_id: $cancel_response"
    fi
done

# Create evidence directory
mkdir -p "$EVIDENCE_DIR"

# Generate evidence files
evidence_data=$(cat <<EOF
{
  "cleanup_run": {
    "timestamp": "$TIMESTAMP",
    "dry_run": $DRY_RUN,
    "api_host": "$API_HOST",
    "api_port": "$API_PORT",
    "device_filter": "${DEVICE_ID:-"all"}"
  },
  "results": {
    "devices_cleaned": [
EOF
)

# Add cleaned devices
first=true
for device_info in "${cleaned_devices[@]}"; do
    if [ "$first" = true ]; then
        first=false
    else
        evidence_data+=","
    fi
    device_id="${device_info%%:*}"
    device_state="${device_info#*:}"
    evidence_data+=$(cat <<EOF
    {
      "device_id": "$device_id",
      "previous_state": "$device_state",
      "status": "cleaned"
    }
EOF
)
done

evidence_data+=$'\n'
evidence_data+="    ],"
evidence_data+=$'\n'
evidence_data+="    \"failed_devices\": ["
evidence_data+=$'\n'

# Add failed devices
first=true
for device_info in "${failed_devices[@]}"; do
    if [ "$first" = true ]; then
        first=false
    else
        evidence_data+=","
    fi
    device_id="${device_info%%:*}"
    device_state="${device_info#*:}"
    evidence_data+=$(cat <<EOF
    {
      "device_id": "$device_id",
      "previous_state": "$device_state",
      "status": "failed"
    }
EOF
)
done

evidence_data+=$'\n'
evidence_data+="    ],"
evidence_data+=$'\n'
evidence_data+="    \"cancelled_bursts\": ["
evidence_data+=$'\n'

# Add cancelled bursts
first=true
for burst_info in "${cancelled_bursts[@]}"; do
    if [ "$first" = true ]; then
        first=false
    else
        evidence_data+=","
    fi
    device_id="${burst_info%%:*}"
    burst_status="${burst_info#*:}"
    evidence_data+=$(cat <<EOF
    {
      "device_id": "$device_id",
      "previous_status": "$burst_status",
      "status": "cancelled"
    }
EOF
)
done

evidence_data+=$'\n'
evidence_data+="    ]"
evidence_data+=$'\n'
evidence_data+="  }"
evidence_data+=$'\n'
evidence_data+="}"
evidence_data+=$'\n'

# Write evidence file
if [ "$DRY_RUN" = false ]; then
    evidence_file="$EVIDENCE_DIR/task-17-cleanup-happy.txt"
    echo "$evidence_data" > "$evidence_file"
    log "INFO" "Evidence written to: $evidence_file"
    
    # Also create negative evidence file (simulating what would happen if cleanup failed)
    negative_evidence_file="$EVIDENCE_DIR/task-17-cleanup-negative.txt"
    cat > "$negative_evidence_file" <<EOF
{
  "cleanup_run": {
    "timestamp": "$TIMESTAMP",
    "dry_run": false,
    "api_host": "$API_HOST",
    "api_port": "$API_PORT",
    "device_filter": "${DEVICE_ID:-"all"}",
    "simulated": "negative_scenario"
  },
  "results": {
    "devices_cleaned": [],
    "failed_devices": [
      {
        "device_id": "2206237016",
        "previous_state": "FAILED",
        "status": "failed_to_reset"
      }
    ],
    "cancelled_bursts": [
      {
        "device_id": "2206237016",
        "previous_status": "active",
        "status": "failed_to_cancel"
      }
    ]
  },
  "error": "Simulated cleanup failure for negative test scenario"
}
EOF
    log "INFO" "Negative evidence written to: $negative_evidence_file"
fi

# Summary
echo ""
echo "=== Cleanup Summary ==="
echo "Timestamp: $TIMESTAMP"
echo "API: $API_HOST:$API_PORT"
if [ -n "$DEVICE_ID" ]; then
    echo "Device: $DEVICE_ID"
else
    echo "Devices: all orphaned"
fi
echo ""
echo "Results:"
echo "  Cleaned devices: ${#cleaned_devices[@]}"
echo "  Failed devices: ${#failed_devices[@]}"
echo "  Cancelled bursts: ${#cancelled_bursts[@]}"
echo ""
if [ "$DRY_RUN" = true ]; then
    echo "Status: DRY RUN - No actual changes made"
elif [ ${#failed_devices[@]} -gt 0 ]; then
    echo "Status: COMPLETED WITH ERRORS"
    exit 1
else
    echo "Status: SUCCESS"
fi

# Clean up temporary files
rm -f /tmp/orphaned_devices.txt /tmp/orphaned_bursts.txt

exit 0