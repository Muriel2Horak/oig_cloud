#!/bin/bash

# Deploy script for OIG Cloud frontend (www only) to Home Assistant (Docker)
# Hot deploy without restarting HA

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration - CUSTOMIZE HERE
SSH_ALIAS="${SSH_ALIAS:-ha}"
LOCAL_PATH="${LOCAL_PATH:-$(pwd)/custom_components/oig_cloud}"
CONTAINER_NAME="${CONTAINER_NAME:-homeassistant}"
REMOTE_PATH="/config/custom_components/oig_cloud"

# Logging control (default: QUIET). Use `--verbose` (or OIG_DEPLOY_VERBOSE=1) to enable output.
VERBOSE="${OIG_DEPLOY_VERBOSE:-0}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=1
            shift
            ;;
        --quiet|-q)
            VERBOSE=0
            shift
            ;;
        --help|-h)
            echo -e "${BLUE}OIG Cloud FE Deploy Script${NC}"
            echo ""
            echo "Usage: $0"
            echo ""
            echo -e "${BLUE}Deployment:${NC}"
            echo "  • Deploys ONLY frontend (custom_components/oig_cloud/www)"
            echo "  • No HA restart required"
            echo ""
            echo -e "${BLUE}Environment variables:${NC}"
            echo "  SSH_ALIAS=${SSH_ALIAS}"
            echo "  LOCAL_PATH=${LOCAL_PATH}"
            echo "  CONTAINER_NAME=${CONTAINER_NAME}"
            echo "  OIG_DEPLOY_VERBOSE=${OIG_DEPLOY_VERBOSE}"
            echo ""
            echo -e "${BLUE}Flags:${NC}"
            echo "  --quiet, -q     Suppress output (default)"
            echo "  --verbose, -v   Show output"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown parameter: $1" >&2
            echo "Usage: $0 [--quiet|--verbose|--help]" >&2
            exit 1
            ;;
    esac
done

# Suppress stdout by default (keep stderr for errors).
if [[ "${VERBOSE}" != "1" ]]; then
    exec 3>&1
    exec 1>/dev/null
fi

echo "🚀 Starting FE deploy to Home Assistant (Docker)..."
echo "📍 Target: SSH alias '${SSH_ALIAS}'"
echo "🐳 Container: ${CONTAINER_NAME}"
echo "📁 Source: ${LOCAL_PATH}/www"
echo ""

# Function to run SSH commands
run_ssh() {
    if [[ "${VERBOSE}" == "1" ]]; then
        ssh "${SSH_ALIAS}" "$1"
    else
        ssh -q -o LogLevel=ERROR "${SSH_ALIAS}" "$1"
    fi
}

# Function to copy file to VM
copy_to_vm() {
    if [[ "${VERBOSE}" == "1" ]]; then
        scp "$1" "${SSH_ALIAS}:$2"
    else
        scp -q "$1" "${SSH_ALIAS}:$2"
    fi
}

# Ensure source exists
if [[ ! -d "${LOCAL_PATH}/www" ]]; then
    echo -e "${RED}❌ www directory not found: ${LOCAL_PATH}/www${NC}" >&2
    exit 1
fi

# Create archive
TMP_ARCHIVE="/tmp/oig_cloud_www_$(date +%Y%m%d_%H%M%S).tgz"
tar -czf "${TMP_ARCHIVE}" -C "${LOCAL_PATH}" www

echo -e "${BLUE}📤 Uploading FE archive...${NC}"
copy_to_vm "${TMP_ARCHIVE}" "/tmp/oig_cloud_www.tgz"
rm -f "${TMP_ARCHIVE}"

# Deploy in container
run_ssh "docker exec ${CONTAINER_NAME} mkdir -p ${REMOTE_PATH}"
run_ssh "docker cp /tmp/oig_cloud_www.tgz ${CONTAINER_NAME}:${REMOTE_PATH}/oig_cloud_www.tgz"
run_ssh "docker exec ${CONTAINER_NAME} tar -xzf ${REMOTE_PATH}/oig_cloud_www.tgz -C ${REMOTE_PATH}"
run_ssh "docker exec ${CONTAINER_NAME} rm -f ${REMOTE_PATH}/oig_cloud_www.tgz"
run_ssh "rm -f /tmp/oig_cloud_www.tgz"

echo -e "${GREEN}✅ FE deploy complete (no restart)${NC}"
echo -e "${YELLOW}ℹ️  Hard reload browser to pick up new JS/CSS (Ctrl+F5 / Cmd+Shift+R)${NC}"
