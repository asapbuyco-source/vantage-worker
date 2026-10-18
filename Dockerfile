FROM mcr.microsoft.com/playwright:v1.48.0-jammy
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip && rm -rf /var/lib/apt/lists/*
RUN echo stage-apt-ok
