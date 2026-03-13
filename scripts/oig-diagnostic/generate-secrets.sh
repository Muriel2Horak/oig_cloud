#!/bin/bash

# Generate deployment secrets
echo "# DEPLOYMENT SECRETS - KEEP SECURE"
echo "# Generated on $(date)"
echo ""
echo "AUTHELIA_SESSION_SECRET=$(openssl rand -hex 64)"
echo "OIG_JWT_SECRET=$(openssl rand -hex 32)"
echo "OIG_CLIENT_SECRET=$(openssl rand -hex 32)"
echo "GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 24)"
echo "INFLUXDB_ADMIN_TOKEN=$(openssl rand -hex 32)"
