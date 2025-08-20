# RustPlusPlus Discord Bot Add-on

![Supports aarch64 Architecture][aarch64-shield] ![Supports amd64 Architecture][amd64-shield] ![Supports armhf Architecture][armhf-shield] ![Supports armv7 Architecture][armv7-shield] ![Supports i386 Architecture][i386-shield]

A Home Assistant add-on for running the RustPlusPlus Discord bot, which connects to Rust game servers via the Rust+ Companion App.

## About

RustPlusPlus is a powerful Discord bot that provides Quality-of-Life features for Rust players by integrating with the Rust+ Companion App. This add-on packages the bot for easy deployment on Home Assistant.

### Features

- 🚁 **Event Notifications**: Get notified about Patrol Helicopter, Cargo Ship, Chinook 47, and Oil Rig events
- 🔌 **Smart Device Control**: Control Smart Switches and Smart Switch Groups via Discord or in-game chat
- 🚨 **Smart Alarms**: Set up alarms that notify you when triggered
- 📦 **Storage Monitoring**: Monitor Tool Cupboard upkeep and container contents
- 💬 **Team Communication**: Bridge Discord and in-game team chat
- 👥 **Player Tracking**: Track other teams using Battlemetrics integration
- 🛠️ **QoL Commands**: Extensive list of helpful commands for Discord and in-game use

## Installation

### Step 1: Add the Repository

1. Navigate to **Supervisor** → **Add-on Store** in your Home Assistant
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
5. Go to **OAuth2** → **General** and copy the **Client ID**
6. In **OAuth2** → **URL Generator**:
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

### Data Persistence

The add-on stores data in the following locations:
- **Credentials**: `/share/rustplusplus/credentials/`
- **Server Instances**: `/share/rustplusplus/instances/`
- **Logs**: `/share/rustplusplus/logs/`
- **Maps**: `/share/rustplusplus/maps/`

All data persists between add-on restarts and updates.

## Troubleshooting

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

### Log Analysis

Check the add-on logs in the **Log** tab for detailed error messages. Common issues include:
- Invalid Discord credentials
- Missing Rust+ credentials
- Network connectivity problems
- Server pairing issues

## Support

For support and documentation:
- [Official RustPlusPlus Documentation](https://github.com/alexemanuelol/rustplusplus/blob/master/docs/documentation.md)
- [Discord Support Server](https://discord.gg/vcrKbKVAbc)
- [GitHub Issues](https://github.com/alexemanuelol/rustplusplus/issues)

## License

This add-on is based on RustPlusPlus by alexemanuelol, licensed under GPL-3.0.

[aarch64-shield]: https://img.shields.io/badge/aarch64-yes-green.svg
[amd64-shield]: https://img.shields.io/badge/amd64-yes-green.svg
[armhf-shield]: https://img.shields.io/badge/armhf-yes-green.svg
[armv7-shield]: https://img.shields.io/badge/armv7-yes-green.svg
[i386-shield]: https://img.shields.io/badge/i386-yes-green.svg