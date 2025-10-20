#!/bin/bash
# Test runner script using Home Assistant Docker container

set -e

echo "🧪 Running tests in Home Assistant container..."

# Pull latest HA image
echo "📦 Pulling Home Assistant image..."
docker pull homeassistant/home-assistant:2025.1.4

# Run tests in container with HA environment
echo "🔬 Running pytest..."
docker run --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  homeassistant/home-assistant:2025.1.4 \
  sh -c "
    echo "🧪 Running tests..."
docker run --rm \
    -v "$(pwd)":/workspace \
    -w /workspace \
    -e PYTHONPATH=/workspace \
    homeassistant/home-assistant:2025.1.4 \
    bash -c '
echo "📥 Installing test dependencies..."
pip install pytest pytest-cov pytest-asyncio pytest-homeassistant-custom-component

echo "✅ Dependencies installed"
echo ""
echo "🧪 Running tests..."
export PYTHONPATH=/workspace
pytest tests/ -v --tb=short
'
  "

echo ""
echo "✅ Tests completed!"
