ARG BUILD_FROM
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
        g++ \
    && npm install -g ts-node typescript

# Set work directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install npm dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Create required directories
RUN mkdir -p /data/credentials /data/instances /data/logs /data/maps

# Copy run script
COPY run.sh /
RUN chmod a+x /run.sh

# Labels
LABEL \
    io.hass.name="RustPlusPlus Discord Bot" \
    io.hass.description="A Discord bot for Rust+ Companion App integration" \
    io.hass.arch="armhf|aarch64|amd64|armv7|i386" \
    io.hass.type="addon" \
    io.hass.version="1.22.0"

CMD [ "/run.sh" ]