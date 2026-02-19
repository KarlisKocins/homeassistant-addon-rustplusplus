ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base:3.22
FROM $BUILD_FROM

# Set shell
SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# Install dependencies
RUN \
    apk add --no-cache \
        nodejs \
        npm \
        git \
        graphicsmagick \
        python3 \
        make \
        g++

# Set work directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY vendor/rustplus.js-089cfd3d.tgz ./vendor/rustplus.js-089cfd3d.tgz

# Install npm dependencies from lockfile for reproducible and faster installs.
# Foreground scripts + info logs make slow native builds (e.g. aarch64) visible.
RUN npm ci --omit=dev --no-audit --no-fund --foreground-scripts --loglevel=info

# Copy application files
COPY . .

# Ensure startup script is executable
RUN chmod a+x /app/run.sh

# Labels
LABEL \
    io.hass.name="RustPlusPlus Discord Bot" \
    io.hass.description="A Discord bot for Rust+ Companion App integration" \
    io.hass.arch="aarch64|amd64" \
    io.hass.type="addon" \
    io.hass.version="1.3.0"

EXPOSE 3001

CMD [ "/app/run.sh" ]
