#!/usr/bin/env bash
# Bootstrap for RunPod serverless workers running on the plain
# nikolaik/python-nodejs image: installs Chrome deps, pulls this repo,
# installs the renderer, then hands off to the runpod handler.
set -euo pipefail

echo "[start] installing system packages..."
apt-get update -qq
apt-get install -y -qq --no-install-recommends \
  ca-certificates git fontconfig fonts-liberation \
  libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
  libgbm1 libasound2 libpango-1.0-0 libcairo2 libatspi2.0-0 \
  > /dev/null

echo "[start] installing python packages..."
pip3 install --no-cache-dir --break-system-packages runpod requests \
  || pip3 install --no-cache-dir runpod requests

echo "[start] cloning worker repo..."
rm -rf /app/worker
mkdir -p /app
git clone --depth 1 https://github.com/asapbuyco-source/vantage-worker.git /app/worker

echo "[start] installing renderer dependencies..."
cd /app/worker/renderer
npm install --no-audit --no-fund

echo "[start] ensuring chromium headless shell..."
npx --yes remotion browser ensure || true

echo "[start] launching handler..."
exec python3 -u /app/worker/handler.py
