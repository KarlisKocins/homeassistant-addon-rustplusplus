# RustPlusPlus Home Assistant Add-on — Project Summary

## What This Is

A complete Home Assistant add-on for the RustPlusPlus Discord bot, with native MQTT-based Home Assistant device integration. Run the bot directly on your Home Assistant device through the add-on store interface, and control your Rust smart devices from your HA dashboard.

## Core Add-on Files

| File | Purpose |
|------|---------|
| [`config.yaml`](config.yaml) | Add-on configuration and metadata (Discord + MQTT options) |
| [`Dockerfile`](Dockerfile) | Container definition optimized for Home Assistant |
| [`build.yaml`](build.yaml) | Multi-architecture build configuration |
| [`run.sh`](run.sh) | Startup script with HA integration and MQTT env vars |
| [`repository.yaml`](repository.yaml) | Repository metadata |
| [`index.ts`](index.ts) | Main application entry point |

## Documentation

| File | Purpose |
|------|---------|
| [`README.md`](README.md) | Add-on store description, features, and configuration |
| [`INSTALLATION_GUIDE.md`](INSTALLATION_GUIDE.md) | Step-by-step user installation guide |
| [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) | Instructions for deploying to GitHub |
| [`SUMMARY.md`](SUMMARY.md) | This summary document |

## Key Features

### 🏠 Home Assistant MQTT Integration
- **MQTT Device Discovery** — Smart switches, alarms, and storage monitors auto-discovered in HA
- **Bidirectional Control** — Toggle switches from HA, state changes reflect in real time
- **Configurable** — Connect to Mosquitto broker or external MQTT broker
- **REST API Support** — Legacy HA event publishing via Supervisor token

### 🎮 Discord Bot Presence
- Bot status displays the connected server name and online teammate count
- Example: `Playing My Rust Server | 3/5 Online`

### 🔧 Native Add-on Integration
- **Add-on Store Support** — Install through the familiar HA interface
- **Configuration UI** — Set Discord and MQTT credentials through the web interface
- **Persistent Storage** — Data survives container restarts and updates
- **Logging Integration** — View logs through the Home Assistant interface
- **Auto-start Support** — Optional automatic startup with Home Assistant

### 📡 Technical Implementation
- **Multi-Architecture** — ARM64, AMD64, ARMv7, ARMhf, i386
- **Alpine Linux base** — Lightweight container footprint
- **Environment Variables** — Secure credential handling via `run.sh`
- **Volume Mapping** — Persistent data in `/data/` with symlinks to `/app/`

### 🎮 RustPlusPlus Features
- **Smart Device Control** — Switches, alarms, storage monitors
- **Event Notifications** — Helicopter, cargo ship, oil rigs
- **Team Communication** — Discord ↔ In-game chat bridge
- **Server Information** — Player counts, events, maps
- **Quality of Life Commands** — Extensive command library

## Quick Start

1. Add the repository: `https://github.com/KarlisKocins/homeassistant-addon-rustplusplus`
2. Install "RustPlusPlus Discord Bot" from the add-on store
3. Enter Discord Client ID and Token in the Configuration tab
4. *(Optional)* Configure MQTT credentials for HA device integration
5. Start the add-on and follow the setup guide

## Configuration Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `discord_client_id` | ✅ | — | Discord application client ID |
| `discord_token` | ✅ | — | Discord bot token |
| `log_level` | No | `info` | Logging level |
| `mqtt_host` | No | `core-mosquitto` | MQTT broker hostname |
| `mqtt_port` | No | `1883` | MQTT broker port |
| `mqtt_username` | No | — | MQTT broker username |
| `mqtt_password` | No | — | MQTT broker password |
| `mqtt_discovery` | No | `true` | Enable MQTT auto-discovery |

## Technical Notes

- **Version**: 1.1.11
- **Base Image**: Alpine Linux 3.18
- **Node.js Version**: 18 (LTS)
- **Architecture Support**: ARM64, AMD64, ARMv7, ARMhf, i386
- **Storage Location**: `/data/` (mapped to persistent storage)
- **MQTT Client**: `mqtt` npm package v5.15+
- **Key Dependency**: `@liamcottle/rustplus.js` for Rust+ API

## Support

- **Original Project**: [RustPlusPlus by alexemanuelol](https://github.com/alexemanuelol/rustplusplus)
- **Discord Support**: [Official Discord Server](https://discord.gg/vcrKbKVAbc)
- **Documentation**: [Full Feature Documentation](https://github.com/alexemanuelol/rustplusplus/blob/master/docs/documentation.md)
- **Issues**: [GitHub Issues](https://github.com/KarlisKocins/homeassistant-addon-rustplusplus/issues)