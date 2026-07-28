# RustPlusPlus Discord Bot Add-on

<img width="640" height="426" alt="Rust++ + Home Assistant image" src="https://github.com/user-attachments/assets/4d53bf8a-ef7c-42b0-803f-43db6f301b38" />

A Home Assistant add-on for running the RustPlusPlus Discord bot, which connects to Rust game servers via the Rust+ Companion App — with native Home Assistant MQTT device integration.

## About

RustPlusPlus is a powerful Discord bot that provides Quality-of-Life features for Rust players by integrating with the Rust+ Companion App. This add-on packages the bot for easy deployment on Home Assistant, with built-in MQTT discovery so your Rust smart devices appear as native Home Assistant entities.

### Features

- 🏠 **Home Assistant Integration**: Smart devices auto-discovered via MQTT — control switches, monitor alarms, and view storage directly from your HA dashboard
- 🚁 **Event Notifications**: Get notified about Patrol Helicopter, Cargo Ship, Chinook 47, and Oil Rig events
- 🔌 **Smart Device Control**: Control Smart Switches and Smart Switch Groups via Discord, in-game chat, or Home Assistant
- 🚨 **Smart Alarms**: Set up alarms that notify you when triggered — also exposed as binary sensors in HA
- 📦 **Storage Monitoring**: Monitor Tool Cupboard upkeep and container contents — also exposed as sensors in HA
- 💬 **Team Communication**: Bridge Discord and in-game team chat
- 👥 **Player Tracking**: Track other teams using Battlemetrics integration
- 🎮 **Discord Bot Presence**: Bot status shows the connected server name and online teammate count
- 🛠️ **QoL Commands**: Extensive list of helpful commands for Discord and in-game use
- 🗺️ **WebUI**: Live map (teammate pins, events, shops with hover cards), Shops Browser and Insta-Profit trade finder with item icons, team statistics with an activity heatmap and player forecast, map replay
- 🔐 **Secured WebUI**: Password/token login on direct access, or open it from the Home Assistant sidebar (ingress) behind HA's own authentication

## Installation

### Step 1: Add the Repository

1. Navigate to **Settings** → **Add-ons** → **Add-on Store** in your Home Assistant
2. Click the **⋮** menu in the top right corner
3. Select **Repositories**
4. Add this repository URL: `https://github.com/KarlisKocins/homeassistant-addon-rustplusplus`
5. Click **Add**

### Step 2: Install the Add-on

1. Find "RustPlusPlus Discord Bot" in the add-on store
2. Click on it and press **Install**
3. Wait for the installation to complete

### Step 3: Configure the Add-on

1. Go to the **Configuration** tab
2. Fill in the required fields:
   - **Discord Client ID**: Your Discord application's client ID
   - **Discord Token**: Your Discord bot token
   - **Log Level**: Choose your preferred logging level (info recommended)
3. Optionally configure MQTT for Home Assistant integration (see below)

### Step 4: Start the Add-on

1. Go to the **Info** tab
2. Click **Start**
3. Check the **Log** tab to ensure everything is running correctly

## Configuration

### Discord Bot Setup

Before using this add-on, you need to create a Discord bot:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and give it a name
3. Go to the **Bot** section and click **Add Bot**
4. Copy the **Token** (this is your Discord Token)
5. Enable **Message Content Intent** under **Privileged Gateway Intents**
6. Go to **OAuth2** → **General** and copy the **Client ID**
7. In **OAuth2** → **URL Generator**:
   - Select **bot** scope
   - Select required permissions (Administrator recommended for full functionality)
   - Use the generated URL to invite the bot to your Discord server

### Rust+ Credentials

You'll need to get your Rust+ credentials using the official credential application:

1. Download the [RustPlusPlus Credential Application](https://github.com/alexemanuelol/rustplusplus-credential-application/releases/download/v1.4.0/rustplusplus-1.4.0-win-x64.exe)
2. Run the application and follow the instructions

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `discord_client_id` | string | **Required** | Your Discord application's client ID |
| `discord_token` | password | **Required** | Your Discord bot token |
| `log_level` | list | `info` | Logging level (debug, info, warning, error) |
| `mqtt_host` | string | `core-mosquitto` | MQTT broker hostname |
| `mqtt_port` | integer | `1883` | MQTT broker port |
| `mqtt_username` | string | _(empty)_ | MQTT broker username |
| `mqtt_password` | password | _(empty)_ | MQTT broker password |
| `mqtt_discovery` | boolean | `true` | Enable/disable MQTT auto-discovery of Rust devices in Home Assistant |
| `webui_enabled` | boolean | `false` | Enable/disable the built-in RustPlusPlus WebUI |
| `webui_port` | integer | `3001` | Port used by the WebUI when enabled |
| `webui_password` | password | _(empty)_ | Password for the WebUI login on direct access. If left empty, a random access token is generated and printed in the add-on log on every start |
| `database_path` | string | `/data/statistics.db` | Path for the statistics database used by WebUI/statistics features |
| `positions_retention_days` | integer | `14` | How many days of player position history to keep for map replay; older rows are deleted during hourly maintenance |

## Home Assistant MQTT Integration

This add-on can automatically publish your Rust smart devices to Home Assistant via MQTT Discovery. When enabled, your devices appear natively in Home Assistant without any manual configuration.

### Prerequisites

1. Install the **Mosquitto broker** add-on from the Home Assistant Add-on Store
2. Create an MQTT user in **Settings** → **People** → **Users** (or use an existing one)
3. Configure the MQTT options in this add-on's configuration

### Supported Device Types

| Rust Device | HA Entity Type | Capabilities |
|-------------|---------------|--------------|
| Smart Switch | `switch` | On/Off control from HA dashboard, automations, scripts |
| Smart Alarm | `binary_sensor` (safety) | Alarm state visible in HA, usable in automations |
| Storage Monitor | `sensor` | Item contents and TC upkeep as sensor attributes |

### How It Works

1. The add-on connects to your MQTT broker on startup
2. When you pair smart devices in Rust, they are automatically published to HA via MQTT Discovery
3. State changes (e.g., a switch toggled in-game) are reflected in HA in real time
4. Commands from HA (e.g., toggling a switch) are sent back to the Rust server

### Example Configuration

```yaml
mqtt_host: core-mosquitto
mqtt_port: 1883
mqtt_username: mqtt_user
mqtt_password: your_mqtt_password
mqtt_discovery: true
```

### WebUI / Statistics

The add-on can run an optional RustPlusPlus WebUI. When enabled, it listens on the configured `webui_port`.
Statistics and related feature data are stored in the SQLite database at `database_path` (default: `/data/statistics.db`).

There are two ways to open the WebUI:

- **Through Home Assistant (recommended)**: use the add-on's **Open Web UI** button or the sidebar panel (ingress). No extra login is needed — Home Assistant's own authentication protects it.
- **Directly** at `http://HOME_ASSISTANT_IP:<webui_port>`: a login is required. Set `webui_password` in the configuration, or use the random access token printed prominently in the add-on log at startup (a new token is generated on every restart until a password is set).

WebUI highlights:

- Live map with teammate pins, event markers, vending machine icons and shop hover cards
- Shops Browser and Insta-Profit trade route finder, both with item icons
- Team statistics: sessions, deaths, chat history, a 7×24 activity heatmap and a player-count forecast
- Map replay of recorded team positions (retention controlled by `positions_retention_days`)

Example optional settings:

```yaml
webui_enabled: true
webui_port: 3001
webui_password: "choose-a-strong-password"
database_path: /data/statistics.db
positions_retention_days: 14
```

## Usage

### First Time Setup

1. After starting the add-on, join your Discord server where the bot was invited
2. Use the `/credentials` command to set up your Rust+ credentials
3. Use the `/pair` command to connect to your Rust server
4. Configure your desired features using the bot's commands

### Common Commands

- `/help` - Show all available commands
- `/credentials` - Set up Rust+ credentials
- `/pair` - Connect to a Rust server
- `/map` - View the server map
- `/players` - See online players
- `/upkeep` - Check tool cupboard upkeep

### Smart Switch Auto Modes

Smart Switch automation includes `AUTO-NIGHT-ANY-ONLINE`.
This mode turns switches on only at night when at least one teammate is online, and turns them off during daytime or when all teammates are offline.

### Discord Bot Presence

When connected to a Rust server, the bot's Discord status automatically displays:
- The server name
- The number of online teammates (e.g., `My Rust Server | 3/5 Online`)

### Data Persistence

The add-on stores data in the following locations:
- **Credentials**: `/data/credentials/`
- **Server Instances**: `/data/instances/`
- **Logs**: `/data/logs/`
- **Maps**: `/data/maps/`
- **Statistics Database**: `/data/statistics.db` (default, configurable via `database_path`)

All data persists between add-on restarts and updates.

## Troubleshooting

### First Installation Issues

If you encounter issues during the first installation, try restarting the add-on:

1. Go to the **Info** tab
2. Click **Stop** to stop the add-on
3. Wait a few seconds, then click **Start**
4. Check the **Log** tab to verify the add-on is running correctly

Sometimes a restart can resolve initialization problems or temporary configuration issues that may occur during the initial setup.

### Bot Not Responding

1. Check the add-on logs for errors
2. Verify your Discord token and client ID are correct
3. Ensure the bot has proper permissions in your Discord server
4. Check if the bot is online in your Discord server

### Connection Issues

1. Verify your Rust+ credentials are valid
2. Check if the Rust server supports Rust+ (most official servers do)
3. Ensure you're paired with the correct server
4. Try restarting the add-on

### MQTT / Home Assistant Issues

1. Verify the Mosquitto broker add-on is running
2. Check MQTT credentials are correct (`mqtt_username` / `mqtt_password`)
3. Look for `[HA] Connected to MQTT broker.` in the add-on logs
4. If devices don't appear in HA, check **Settings** → **Devices & Services** → **MQTT**
5. Ensure `mqtt_discovery` is set to `true`

### WebUI Login Issues

1. When opening the WebUI on its direct URL, a login is required — this is expected since v2.0.0
2. If you haven't set `webui_password`, find the auto-generated access token in the add-on **Log** tab (printed in a highlighted block at startup)
3. Opening the WebUI through the Home Assistant sidebar or the **Open Web UI** button never asks for this login
4. After changing `webui_password`, restart the add-on and hard-refresh the browser (Ctrl+F5)

### Log Analysis

Check the add-on logs in the **Log** tab for detailed error messages. Common issues include:
- Invalid Discord credentials
- Missing Rust+ credentials
- Network connectivity problems
- Server pairing issues
- `[HA] MQTT error:` messages indicating broker connection issues

### Development Smoke Test

For local development/release checks, run the startup smoke test:

```bash
chmod +x scripts/ha_addon_smoke_test.sh
./scripts/ha_addon_smoke_test.sh
```

This emulates add-on startup with a generated `/data/options.json` plus a mock Supervisor API endpoint, and fails if bootstrap does not reach `run.sh -> node index.js`.

## Support

For support and documentation:
- [Official RustPlusPlus Documentation](https://github.com/alexemanuelol/rustplusplus/blob/master/docs/documentation.md)
- [Discord Support Server](https://discord.gg/vcrKbKVAbc)
- [GitHub Issues](https://github.com/KarlisKocins/homeassistant-addon-rustplusplus/issues)

## License

This add-on is based on RustPlusPlus by alexemanuelol, licensed under GPL-3.0.

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[armhf-shield]: https://img.shields.io/badge/armhf-yes-green.svg
[armv7-shield]: https://img.shields.io/badge/armv7-yes-green.svg
