#!/bin/bash
# Deploy OIG Diagnostic Cloud to Synology NAS

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
NAS_HOST="nas"
NAS_DIR="/volume1/docker/oig-diagnostic"

echo "=== OIG Diagnostic Cloud Deploy ==="
echo "Target: ${NAS_HOST}:${NAS_DIR}"
echo ""

# Create directory on NAS
echo "Creating directory on NAS..."
ssh ${NAS_HOST} "mkdir -p ${NAS_DIR}/data"

# Copy files
echo "Copying files..."
scp "${SCRIPT_DIR}/server.py" "${NAS_HOST}:${NAS_DIR}/"
scp "${SCRIPT_DIR}/Dockerfile" "${NAS_HOST}:${NAS_DIR}/"
scp "${SCRIPT_DIR}/docker-compose.yml" "${NAS_HOST}:${NAS_DIR}/"
scp "${SCRIPT_DIR}/README.md" "${NAS_HOST}:${NAS_DIR}/"

# Build and start
echo ""
echo "Building and starting container..."
ssh ${NAS_HOST} "cd ${NAS_DIR} && /usr/local/bin/docker-compose up -d --build"

echo ""
echo "=== Deploy complete ==="
echo ""
echo "Check status: ssh ${NAS_HOST} 'cd ${NAS_DIR} && /usr/local/bin/docker-compose logs -f'"
echo ""
echo "Don't forget to open port 5710 on your router!"
