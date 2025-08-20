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
exec npm start