#!/bin/bash

# Deploy script for OIG Cloud integration to Home Assistant (Docker)
# Enhanced with single SSH session to eliminate rate limiting

set -e  # Exit on error

# Configuration - CUSTOMIZE HERE
HA_HOST="${HA_HOST:-10.0.0.143}"
HA_USER="${HA_USER:-martin}"
HA_PASS="${HA_PASS:-HOmag79//}"
LOCAL_PATH="${LOCAL_PATH:-$(pwd)/custom_components/oig_cloud}"
CONTAINER_NAME="${CONTAINER_NAME:-homeassistant}"
REMOTE_PATH="/config/custom_components/oig_cloud"

# Deployment mode: 'changed' (only modified files), 'full' (all files), or 'dashboard' (dashboard switcher)
DEPLOY_MODE="${DEPLOY_MODE:-full}"

# Timestamp file for tracking last deployment
DEPLOY_TIMESTAMP_FILE="/tmp/.oig_cloud_last_deploy"

echo "🚀 Starting deployment to Home Assistant (Docker)..."
echo "📍 Target: ${HA_USER}@${HA_HOST}"
echo "🐳 Container: ${CONTAINER_NAME}"
echo "📦 Mode: ${DEPLOY_MODE}"
echo "📁 Source: ${LOCAL_PATH}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        dashboard|switcher)
            DEPLOY_MODE="dashboard"
            echo "🎯 Dashboard Switcher deployment mode activated"
            shift
            ;;
        full)
            DEPLOY_MODE="full"
            shift
            ;;
        changed)
            DEPLOY_MODE="changed"
            shift
            ;;
        --help|-h)
            echo -e "${BLUE}OIG Cloud Deploy Script${NC}"
            echo ""
            echo "Usage: $0 [MODE]"
            echo ""
            echo -e "${BLUE}Available modes:${NC}"
            echo "  full        Deploy entire integration + dashboard switcher (default)"
            echo "  changed     Deploy only changed files"
            echo "  dashboard   Deploy only Dashboard Switcher (JS, CSS, docs)"
            echo "  switcher    Alias for 'dashboard'"
            echo ""
            echo -e "${BLUE}Examples:${NC}"
            echo "  $0                    # Deploy everything (full)"
            echo "  $0 changed           # Deploy only changed files"
            echo "  $0 dashboard         # Deploy only dashboard switcher"
            echo ""
            echo -e "${BLUE}Environment variables:${NC}"
            echo "  HA_HOST=${HA_HOST}"
            echo "  HA_USER=${HA_USER}"
            echo "  CONTAINER_NAME=${CONTAINER_NAME}"
            echo ""
            exit 0
            ;;
        *)
            echo "Unknown parameter: $1"
            echo "Usage: $0 [changed|full|dashboard|--help]"
            echo "Use '$0 --help' for more information"
            exit 1
            ;;
    esac
done

echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if sshpass is installed
echo "📦 Checking dependencies..."
if ! command -v sshpass &> /dev/null; then
    echo -e "${YELLOW}⚠️  sshpass not found. Installing via Homebrew...${NC}"
    brew install hudochenkov/sshpass/sshpass
fi

# Test SSH connection
echo "🔐 Testing SSH connection..."
if sshpass -p "${HA_PASS}" ssh -o StrictHostKeyChecking=no "${HA_USER}@${HA_HOST}" "echo 'Connection successful'" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ SSH connection OK${NC}"
else
    echo -e "${RED}❌ SSH connection failed${NC}"
    exit 1
fi

# Prepare deployment package
echo "📦 Preparing deployment package..."
TEMP_DIR=$(mktemp -d)

# Create directory structure
mkdir -p "${TEMP_DIR}/api"
mkdir -p "${TEMP_DIR}/sensors"
mkdir -p "${TEMP_DIR}/shared"
mkdir -p "${TEMP_DIR}/translations"
mkdir -p "${TEMP_DIR}/www"
mkdir -p "${TEMP_DIR}/docs"

# Copy files based on deployment mode
case "$DEPLOY_MODE" in
    "dashboard")
        echo -e "${BLUE}🎯 Dashboard-only deployment...${NC}"

        # Required dashboard files
        required_files=(
            "www/dashboard-switcher.js"
            "www/dashboard-styles.css"
            "www/dashboard.html"
        )

        for file in "${required_files[@]}"; do
            if [[ -f "${LOCAL_PATH}/${file}" ]]; then
                cp "${LOCAL_PATH}/${file}" "${TEMP_DIR}/${file}"
                echo "  ✓ ${file}"
            else
                echo -e "${RED}❌ Required file not found: ${file}${NC}"
                exit 1
            fi
        done

        # Optional docs
        if [[ -f "${LOCAL_PATH}/docs/DASHBOARD_SWITCHER_QUICKSTART.md" ]]; then
            cp "${LOCAL_PATH}/docs/DASHBOARD_SWITCHER_QUICKSTART.md" "${TEMP_DIR}/docs/"
        fi
        ;;

    "full")
        echo -e "${BLUE}📋 Full deployment - copying all files...${NC}"
        cp -r "${LOCAL_PATH}"/* "${TEMP_DIR}/"
        ;;

    "changed")
        echo -e "${BLUE}📋 Changed files deployment...${NC}"
        # Copy all files for now - can be enhanced later
        cp -r "${LOCAL_PATH}"/* "${TEMP_DIR}/"
        ;;
esac

# Clean MacOS metadata
echo "🧹 Cleaning MacOS metadata..."
find "${TEMP_DIR}" -name "._*" -delete 2>/dev/null || true
find "${TEMP_DIR}" -name ".DS_Store" -delete 2>/dev/null || true

# Create archive without extended attributes
echo "📦 Creating deployment archive..."
cd "${TEMP_DIR}"
export COPYFILE_DISABLE=1
tar --no-xattrs -czf "../deployment.tar.gz" . 2>/dev/null || tar -czf "../deployment.tar.gz" .
ARCHIVE_PATH="${TEMP_DIR}/../deployment.tar.gz"

# File count
FILE_COUNT=$(find "${TEMP_DIR}" -type f | wc -l | tr -d ' ')
echo -e "${BLUE}📊 Files to deploy: ${FILE_COUNT}${NC}"

# Execute entire deployment in single SSH session
echo "🚀 Executing single-session deployment..."

sshpass -p "${HA_PASS}" ssh -o StrictHostKeyChecking=no "${HA_USER}@${HA_HOST}" bash << 'ENDSSH'
# This entire block runs on the remote server in ONE session

echo "📡 Connected to remote server"
CONTAINER_NAME="homeassistant"
REMOTE_PATH="/config/custom_components/oig_cloud"
VM_TEMP="/tmp/oig_deploy_$(date +%s)"

# Create backup
echo "💾 Creating backup..."
BACKUP_NAME="oig_cloud_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
docker exec ${CONTAINER_NAME} tar -czf /config/${BACKUP_NAME} -C /config/custom_components oig_cloud 2>/dev/null || echo "No existing installation"
echo "✅ Backup created: ${BACKUP_NAME}"

# Prepare temporary directory
echo "📦 Preparing temporary directory..."
mkdir -p ${VM_TEMP}
cd ${VM_TEMP}

# Receive and extract archive
echo "📥 Receiving deployment archive..."
cat > deployment.tar.gz

echo "📦 Extracting archive..."
tar -xzf deployment.tar.gz 2>/dev/null || tar -xzf deployment.tar.gz
rm deployment.tar.gz

echo "📊 Archive extracted, contents:"
ls -la

# Deploy to Docker container
echo "🐳 Deploying to Home Assistant container..."

# Remove old installation
echo "  🗑️ Removing old installation..."
docker exec ${CONTAINER_NAME} rm -rf ${REMOTE_PATH} || true

# Create parent directory
echo "  📂 Creating directory structure..."
docker exec ${CONTAINER_NAME} mkdir -p /config/custom_components

# Copy files into container
echo "  📋 Copying files into container..."
docker cp ${VM_TEMP} ${CONTAINER_NAME}:/config/custom_components/oig_cloud_tmp
docker exec ${CONTAINER_NAME} mv /config/custom_components/oig_cloud_tmp ${REMOTE_PATH}

# Verify deployment
echo "🔍 Verifying deployment..."
if docker exec ${CONTAINER_NAME} test -f ${REMOTE_PATH}/__init__.py; then
    echo "✅ Core files deployed successfully"
else
    echo "❌ Deployment verification failed"
    exit 1
fi

# Check deployment type and handle accordingly
if docker exec ${CONTAINER_NAME} test -f ${REMOTE_PATH}/www/dashboard-switcher.js; then
    echo "🎯 Dashboard switcher detected"

    # Update dashboard.html if needed
    if ! docker exec ${CONTAINER_NAME} grep -q 'dashboard-switcher.js' ${REMOTE_PATH}/www/dashboard.html 2>/dev/null; then
        echo "  🔧 Updating dashboard.html for switcher..."

        # Backup original
        docker exec ${CONTAINER_NAME} cp ${REMOTE_PATH}/www/dashboard.html ${REMOTE_PATH}/www/dashboard.html.backup

        # Add switcher support (simple approach)
        docker exec ${CONTAINER_NAME} sed -i 's|</head>|    <script src="/oig_cloud_static/dashboard-switcher.js"></script>\n    <link rel="stylesheet" href="/oig_cloud_static/dashboard-styles.css">\n</head>|' ${REMOTE_PATH}/www/dashboard.html

        echo "  ✅ Dashboard.html updated"
    else
        echo "  ✅ Dashboard.html already has switcher support"
    fi

    # For dashboard-only deployment, just reload
    if [ "$(ls -1 ${VM_TEMP} | wc -l)" -le 5 ]; then
        echo "♻️ Dashboard-only deployment, reloading..."
        if command -v ha >/dev/null 2>&1; then
            ha core restart
        else
            docker restart ${CONTAINER_NAME} >/dev/null 2>&1 &
        fi
        echo "✅ Reload initiated"
    fi
else
    echo "📦 Full integration deployment"
fi

# For full deployment, restart HA
if [ "$(find ${VM_TEMP} -name '*.py' | wc -l)" -gt 5 ]; then
    echo "♻️ Full deployment detected, restarting Home Assistant..."

    if command -v ha >/dev/null 2>&1; then
        echo "  📱 Using HA CLI restart..."
        ha core restart
    else
        echo "  🐳 Using Docker restart..."
        docker restart ${CONTAINER_NAME}
    fi

    echo "✅ Home Assistant restart initiated"
fi

# Cleanup
echo "🧹 Cleaning up remote temp files..."
rm -rf ${VM_TEMP}

echo "🎉 Remote deployment completed successfully!"

ENDSSH < "${ARCHIVE_PATH}"

# Cleanup local files
rm -rf "${TEMP_DIR}" "${ARCHIVE_PATH}"

# Save deployment timestamp
echo "$(date '+%Y-%m-%d %H:%M:%S')" > "${DEPLOY_TIMESTAMP_FILE}"

echo ""
echo -e "${GREEN}✅ Single-session deployment completed successfully!${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📋 Next steps:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  1. ⏳ Wait ~30 seconds for Home Assistant to restart"
echo "  2. 🧹 Clear browser cache (Ctrl+Shift+R)"
echo "  3. 📊 Check: http://${HA_HOST}:8123/config/logs"
echo "  4. ⚙️  Configure: Settings → Devices & Services → OIG Cloud"

if [ "$DEPLOY_MODE" == "dashboard" ] || [ "$DEPLOY_MODE" == "full" ]; then
    echo "  5. 🎯 Test dashboard with 4 tabs:"
    echo "     http://${HA_HOST}:8123/oig_cloud_dashboard?entry_id=YOUR_ENTRY&inverter_sn=YOUR_SN"
fi

echo ""
echo -e "${BLUE}💡 Deployment modes:${NC}"
echo "   ./deploy_to_ha.sh             # Full deployment (default)"
echo "   ./deploy_to_ha.sh dashboard   # Dashboard only (fast)"
echo "   ./deploy_to_ha.sh changed     # Changed files only"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"