# RustPlusPlus Home Assistant Add-on - Project Summary

## What This Is

A Home Assistant add-on for the RustPlusPlus Discord bot, with MQTT-based Home Assistant device integration. It runs directly on your Home Assistant host and can expose Rust smart devices as native Home Assistant entities.

## Core Add-on Files

| File | Purpose |
|------|---------|
| [`config.yaml`](config.yaml) | Add-on configuration and metadata (Discord, MQTT, WebUI, database options) |
| [`Dockerfile`](Dockerfile) | Container definition optimized for Home Assistant |
| [`build.yaml`](build.yaml) | Multi-architecture build configuration |
| [`run.sh`](run.sh) | Startup script and Home Assistant option to environment mapping |
| [`repository.yaml`](repository.yaml) | Repository metadata |
| [`index.js`](index.js) | Main application entry point |

## Documentation

| File | Purpose |
|------|---------|
| [`README.md`](README.md) | Add-on store description, features, and configuration |
| [`INSTALLATION_GUIDE.md`](INSTALLATION_GUIDE.md) | Step-by-step installation and setup guide |
| [`DEPLOYMENT_GUIDE.md`](DEPLOYMENT_GUIDE.md) | Deployment and release workflow guidance |
| [`SUMMARY.md`](SUMMARY.md) | This summary document |

## Key Features

### Home Assistant MQTT Integration
- MQTT Device Discovery for switches, alarms, and storage monitors
- Bidirectional device control and near real-time state updates
- Support for built-in Mosquitto or external MQTT brokers

### Native Add-on Integration
- Add-on Store installation flow
- Home Assistant configuration UI support
- **Ingress**: WebUI available from the HA sidebar behind Home Assistant's own authentication
- Supervisor **watchdog** health check with automatic restart
- Persistent storage in `/data`
- Home Assistant log visibility

### WebUI
- Live map: teammate pins, event markers, vending machines with shop hover cards
- Shops Browser + Insta-Profit trade route finder with item icons
- Team statistics: sessions, deaths, chat, activity heatmap, player forecast, map replay
- Password/token login on direct access (`webui_password`); no extra login through ingress

### RustPlusPlus Features
- Smart device control for switches, alarms, and storage monitors
- Event notifications (heli, cargo, chinook, oil rig)
- Team chat bridge (Discord and in-game)
- Server/player information tools
- Smart switch automation including `AUTO-NIGHT-ANY-ONLINE` (on only at night while any teammate is online; off during daytime or when all teammates are offline)

### Technical Implementation
- Supported architectures: `aarch64`, `amd64`
- Home Assistant base image family: `3.22`
- Environment-driven configuration via `run.sh`
- Persistent data paths under `/data`

## Quick Start

1. Add repository: `https://github.com/KarlisKocins/homeassistant-addon-rustplusplus`
2. Install `RustPlusPlus Discord Bot` from the Add-on Store
3. Configure required Discord credentials
4. Optionally configure MQTT and WebUI options
5. Start the add-on and complete Rust+ pairing

## Configuration Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `discord_client_id` | Yes | - | Discord application client ID |
| `discord_token` | Yes | - | Discord bot token |
| `log_level` | No | `info` | Logging level |
| `mqtt_host` | No | `core-mosquitto` | MQTT broker hostname |
| `mqtt_port` | No | `1883` | MQTT broker port |
| `mqtt_username` | No | - | MQTT broker username |
| `mqtt_password` | No | - | MQTT broker password |
| `mqtt_discovery` | No | `true` | Enable MQTT auto-discovery |
| `webui_enabled` | No | `false` | Enable built-in WebUI |
| `webui_port` | No | `3001` | WebUI port when enabled |
| `webui_password` | No | _(auto token)_ | WebUI login password; when empty a random token is logged at startup |
| `database_path` | No | `/data/statistics.db` | Statistics database file path |
| `positions_retention_days` | No | `14` | Days of replay position history to keep |

## Technical Notes

- Version: `2.0.0`
- Runtime: plain Node.js (`node index.js`), multi-stage Docker build (no compilers in the runtime image)
- Base images: Home Assistant base `3.22`
- Architectures: `aarch64`, `amd64`
- Storage location: `/data/`
- Frontend: native ES modules (no build step) under `public/js/{core,map,panels,stats}`
- MQTT client dependency: `mqtt` (`^5.15.0`)
- Rust+ dependency: `@liamcottle/rustplus.js` (vendored tarball)
- Tests: `npm test` (`node --test`, covers WebUI auth and statistics SQL); CI runs a Docker startup smoke test

## Support

- Original project: [RustPlusPlus by alexemanuelol](https://github.com/alexemanuelol/rustplusplus)
- Discord support: [Official Discord Server](https://discord.gg/vcrKbKVAbc)
- Documentation: [Feature Documentation](https://github.com/alexemanuelol/rustplusplus/blob/master/docs/documentation.md)
- Issues: [GitHub Issues](https://github.com/KarlisKocins/homeassistant-addon-rustplusplus/issues)