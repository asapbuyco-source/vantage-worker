FROM mcr.microsoft.com/playwright:v1.48.0-jammy
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip && rm -rf /var/lib/apt/lists/*
WORKDIR /app/renderer
COPY renderer/package.json renderer/tsconfig.json renderer/tsconfig.esm.json ./
RUN npm install --no-audit --no-fund --ignore-scripts --registry=https://registry.npmmirror.com
RUN echo stage-npm-mirror-ok