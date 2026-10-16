FROM node:20-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive

# Headless-Chrome runtime libraries required by Remotion + Python for the worker.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates git curl fontconfig fonts-liberation \
      libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
      libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
      libgbm1 libasound2 libpango-1.0-0 libcairo2 libatspi2.0-0 \
      python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Self-contained: clone the repo inside the image so the build works no matter
# how the builder lays out its context.
RUN git clone --depth 1 https://github.com/asapbuyco-source/vantage-worker.git /app

WORKDIR /app/renderer
RUN npm install --no-audit --no-fund

# Pre-download Chromium Headless Shell so the first job doesn't pay for it
RUN npx --yes remotion browser ensure || true

WORKDIR /app
RUN pip3 install --no-cache-dir -r requirements.txt \
  || pip3 install --no-cache-dir --break-system-packages -r requirements.txt

CMD ["python3", "-u", "/app/handler.py"]
