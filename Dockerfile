FROM node:20-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive

# Headless-Chrome runtime libraries required by Remotion's Chromium + Python for the RunPod handler
RUN apt-get update && apt-get install -y --no-install-recommends \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
      libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
      libgbm1 libasound2 libpango-1.0-0 libcairo2 libatspi2.0-0 \
      fonts-liberation python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/renderer
COPY renderer/package.json renderer/tsconfig.json renderer/tsconfig.esm.json ./
COPY renderer/src ./src
COPY renderer/scripts ./scripts
RUN npm install --no-audit --no-fund

# Pre-download Chromium Headless Shell so the first job doesn't pay for it
RUN npx --yes remotion browser ensure || true

WORKDIR /app
COPY handler.py requirements.txt ./
RUN pip3 install --no-cache-dir --break-system-packages -r requirements.txt

CMD ["python3", "-u", "handler.py"]
