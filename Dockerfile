FROM mcr.microsoft.com/playwright:v1.48.0-jammy

ENV DEBIAN_FRONTEND=noninteractive

# Python for the RunPod handler (the Playwright image ships Node + Chromium + deps)
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Point Remotion at the Chromium that ships with the Playwright image (no downloads)
RUN ln -s "$(find /ms-playwright -type f -name chrome | head -n 1)" /usr/local/bin/chrome-playwright
ENV REMOTION_BROWSER_EXECUTABLE=/usr/local/bin/chrome-playwright

WORKDIR /app/renderer
COPY renderer/package.json renderer/tsconfig.json renderer/tsconfig.esm.json ./
COPY renderer/src ./src
COPY renderer/scripts ./scripts
RUN npm install --no-audit --no-fund --ignore-scripts

WORKDIR /app
COPY handler.py requirements.txt ./
RUN pip3 install --no-cache-dir runpod requests \
  || pip3 install --no-cache-dir --break-system-packages runpod requests

CMD ["python3", "-u", "/app/handler.py"]
