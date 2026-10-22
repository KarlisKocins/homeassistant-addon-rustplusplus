# Multi-platform base image: BuildKit picks the right architecture, so no per-arch
# build.yaml is needed (Supervisor deprecated it).
ARG BUILD_FROM=ghcr.io/home-assistant/base:3.22

# ---------------------------------------------------------------------------
# Builder stage: compilers only exist here (bcrypt, better-sqlite3 native builds)
# ---------------------------------------------------------------------------
FROM $BUILD_FROM AS builder

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN \
    apk add --no-cache \
        nodejs \
        npm \
        python3 \
        make \
        g++

WORKDIR /app

COPY package*.json ./
COPY vendor/rustplus.js-089cfd3d.tgz ./vendor/rustplus.js-089cfd3d.tgz

# Install npm dependencies from lockfile for reproducible and faster installs.
# Foreground scripts + info logs make slow native builds (e.g. aarch64) visible.
RUN npm ci --omit=dev --no-audit --no-fund --foreground-scripts --loglevel=info

# ---------------------------------------------------------------------------
# Runtime stage: no compilers, no npm, no git
# ---------------------------------------------------------------------------
FROM $BUILD_FROM

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

# graphicsmagick is required at runtime by the `gm` package
RUN \
    apk add --no-cache \
        nodejs \
        graphicsmagick

WORKDIR /app

# Native modules were compiled against the same base image ABI in the builder
COPY --from=builder /app/node_modules ./node_modules

COPY . .

RUN chmod a+x /app/run.sh

LABEL \
    org.opencontainers.image.title="RustPlusPlus Discord Bot" \
    org.opencontainers.image.description="A Discord bot for Rust+ Companion App integration" \
    org.opencontainers.image.source="https://github.com/alexemanuelol/rustplusplus" \
    org.opencontainers.image.licenses="GPL-3.0" \
    io.hass.name="RustPlusPlus Discord Bot" \
    io.hass.description="A Discord bot for Rust+ Companion App integration" \
    io.hass.arch="aarch64|amd64" \
    io.hass.type="addon"

EXPOSE 3001

CMD [ "/app/run.sh" ]
