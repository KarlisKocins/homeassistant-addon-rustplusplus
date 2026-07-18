#!/usr/bin/with-contenv bashio

# ==============================================================================
# RustPlusPlus Discord Bot Add-on for Home Assistant
# Starts the RustPlusPlus Discord bot
# ==============================================================================

# Set default log level
declare log_level

# Get configuration from Home Assistant
DISCORD_CLIENT_ID=$(bashio::config 'discord_client_id')
DISCORD_TOKEN=$(bashio::config 'discord_token')
LOG_LEVEL=$(bashio::config 'log_level')

# Validate required configuration
if bashio::var.is_empty "${DISCORD_CLIENT_ID}"; then
    bashio::log.fatal "Discord Client ID is required but not provided!"
    bashio::exit.nok
fi

if bashio::var.is_empty "${DISCORD_TOKEN}"; then
    bashio::log.fatal "Discord Token is required but not provided!"
    bashio::exit.nok
fi

# Set environment variables
export RPP_DISCORD_CLIENT_ID="${DISCORD_CLIENT_ID}"
export RPP_DISCORD_TOKEN="${DISCORD_TOKEN}"
export RPP_LOG_LEVEL="${LOG_LEVEL}"

# MQTT Configuration
export RPP_MQTT_HOST=$(bashio::config 'mqtt_host')
export RPP_MQTT_PORT=$(bashio::config 'mqtt_port')
export RPP_MQTT_USERNAME=$(bashio::config 'mqtt_username')
export RPP_MQTT_PASSWORD=$(bashio::config 'mqtt_password')
export RPP_MQTT_DISCOVERY=$(bashio::config 'mqtt_discovery')

# Web UI & Database Configuration
if bashio::config.has_value 'webui_enabled'; then
    export RPP_WEBUI_ENABLED=$(bashio::config 'webui_enabled')
fi

if bashio::config.has_value 'webui_port'; then
    export RPP_WEBUI_PORT=$(bashio::config 'webui_port')
fi

if bashio::config.has_value 'webui_password'; then
    export RPP_WEBUI_PASSWORD=$(bashio::config 'webui_password')
else
    bashio::log.warning "webui_password is not set - the WebUI will generate a random access token; check the log below for it."
fi

if bashio::config.has_value 'database_path'; then
    export RPP_DB_PATH=$(bashio::config 'database_path')
fi

if bashio::config.has_value 'positions_retention_days'; then
    export RPP_POSITIONS_RETENTION_DAYS=$(bashio::config 'positions_retention_days')
fi

# Create target directories in persistent storage if they don't exist
mkdir -p /data/credentials /data/instances /data/logs /data/maps

# Create symlinks to persistent storage
ln -sf /data/credentials /app/credentials
ln -sf /data/instances /app/instances
ln -sf /data/logs /app/logs
ln -sf /data/maps /app/maps

# Set log level
bashio::log.info "Setting log level to: ${LOG_LEVEL}"

# Log startup information
bashio::log.info "Starting RustPlusPlus Discord Bot..."
bashio::log.info "Discord Client ID: ${DISCORD_CLIENT_ID}"
bashio::log.info "Data directory: /data"

# Change to app directory
cd /app || bashio::exit.nok

# Start the application
bashio::log.info "Launching RustPlusPlus..."
exec node /app/index.js