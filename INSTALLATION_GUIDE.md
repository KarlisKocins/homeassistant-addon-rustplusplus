# RustPlusPlus Home Assistant Add-on Installation Guide

This guide will walk you through setting up the RustPlusPlus Discord bot as a Home Assistant add-on, complete with MQTT-based device integration.

## Prerequisites

Before starting, ensure you have:
- A Home Assistant instance with Supervisor access
- A Discord account and server where you want the bot
- Access to a Rust server that supports Rust+ (most official servers do)
- *(Optional)* The **Mosquitto broker** add-on installed for Home Assistant device integration

## Step 1: Create a Discord Bot

1. **Go to Discord Developer Portal**
   - Visit [https://discord.com/developers/applications](https://discord.com/developers/applications)
   - Click "New Application" and give it a name (e.g., "RustPlusPlus Bot")

2. **Create the Bot**
   - Go to the "Bot" section in the left sidebar
   - Click "Add Bot"
   - Copy the **Token** (keep this secure — you'll need it later)
   - Enable **Message Content Intent** under **Privileged Gateway Intents**

3. **Get Client ID**
   - Go to "OAuth2" → "General"
   - Copy the **Client ID**

4. **Invite Bot to Your Server**
   - Go to "OAuth2" → "URL Generator"
   - Select "bot" scope
   - Select "Administrator" permission (recommended for full functionality)
   - Use the generated URL to invite the bot to your Discord server

## Step 2: Set Up the Add-on Repository

1. **Add Custom Repository**
   - In Home Assistant, go to **Settings** → **Add-ons** → **Add-on Store**
   - Click the **⋮** menu (three dots) in the top right
   - Select **Repositories**
   - Add this URL: `https://github.com/KarlisKocins/homeassistant-addon-rustplusplus`
   - Click **Add**

2. **Refresh the Store**
   - The add-on store should refresh automatically
   - Look for "RustPlusPlus Discord Bot" in the store

## Step 3: Install the Add-on

1. **Install**
   - Click on "RustPlusPlus Discord Bot"
   - Click **Install**
   - Wait for installation to complete (this may take several minutes)

2. **Don't Start Yet**
   - Do not start the add-on until you've configured it

## Step 4: Configure the Add-on

1. **Go to Configuration Tab**
   - Click on the **Configuration** tab
   - You'll see the configuration options

2. **Enter Your Discord Credentials**
   ```yaml
   discord_client_id: "YOUR_CLIENT_ID_HERE"
   discord_token: "YOUR_BOT_TOKEN_HERE"
   log_level: info
   ```

3. **Configure MQTT (Optional but Recommended)**

   If you want your Rust smart devices to appear in Home Assistant:
   ```yaml
   mqtt_host: core-mosquitto
   mqtt_port: 1883
   mqtt_username: "YOUR_MQTT_USERNAME"
   mqtt_password: "YOUR_MQTT_PASSWORD"
   mqtt_discovery: true
   ```

   > **Note**: The default `mqtt_host` of `core-mosquitto` works if you're using the official Mosquitto broker add-on. If you're using an external MQTT broker, replace this with your broker's hostname or IP.

4. **Configure WebUI/Statistics (Optional)**

   If you want to enable the RustPlusPlus WebUI and statistics database:
   ```yaml
   webui_enabled: true
   webui_port: 3001
   database_path: "/data/statistics.db"
   ```

   If WebUI is enabled, access it on your Home Assistant host at the configured port.
   Example: `http://HOME_ASSISTANT_IP:3001`

5. **Save Configuration**
   - Click **Save**

## Step 5: Set Up MQTT Broker (Optional)

If you want Home Assistant integration with your Rust devices:

1. **Install Mosquitto Broker**
   - Go to **Settings** → **Add-ons** → **Add-on Store**
   - Search for "Mosquitto broker" and install it
   - Start the Mosquitto broker add-on

2. **Create an MQTT User**
   - Go to **Settings** → **People** → **Users**
   - Create a new user for MQTT (e.g., `mqtt_user`)
   - Use these credentials in the RustPlusPlus add-on configuration

3. **Verify MQTT Integration**
   - Go to **Settings** → **Devices & Services**
   - MQTT should appear as an integration
   - If not, click **Add Integration** and search for MQTT

## Step 6: Start the Add-on

1. **Start the Add-on**
   - Go to the **Info** tab
   - Click **Start**
   - Enable "Start on boot" if you want it to auto-start

2. **Check Logs**
   - Go to the **Log** tab
   - Look for successful startup messages:
     - `Starting RustPlusPlus Discord Bot...` — bot is launching
     - `[HA] Connected to MQTT broker.` — MQTT integration is working
   - The bot should connect to Discord

## Step 7: Get Rust+ Credentials

You need to get your Rust+ credentials to connect to Rust servers:

### Option A: Using the Credential Application (Recommended)

1. **Download the Application**
   - Download from: [RustPlusPlus Credential Application](https://github.com/alexemanuelol/rustplusplus-credential-application/releases/download/v1.4.0/rustplusplus-1.4.0-win-x64.exe)
   - Run the application on Windows
   - Follow the instructions to get your credentials

2. **Upload Credentials**
   - The credentials will be saved as a JSON file
   - You need to place this in the Home Assistant data folder
   - Access your Home Assistant files via Samba/SMB or File Editor add-on
   - Upload your credentials file to the add-on's credentials directory

### Option B: Using Discord Commands

1. **Use the Bot**
   - In your Discord server, type `/credentials`
   - Follow the bot's instructions to set up credentials

## Step 8: Connect to a Rust Server

1. **Join a Rust Server**
   - Join a Rust server that supports Rust+ (most official servers)
   - Open the Rust+ mobile app
   - Pair with the server

2. **Pair the Bot**
   - In Discord, use `/pair` command
   - Follow the instructions to connect the bot to your server

## Step 9: Configure Features

Once connected, you can set up various features:

### Smart Devices
- Use `/switch` to set up smart switches
- Use `/alarm` to configure smart alarms
- Use `/storagemonitor` for storage monitoring
- If MQTT is enabled, these devices will **automatically appear** in your Home Assistant dashboard
- Smart switch automation includes `AUTO-NIGHT-ANY-ONLINE` (on only at night while any teammate is online; off during daytime or when all teammates are offline)

### Notifications
- Configure event notifications (heli, cargo ship, etc.)
- Set up team chat bridging

### Information Channels
- The bot will create information channels automatically
- These show server status, events, and team information

### Discord Bot Presence
- When connected, the bot's Discord status displays the server name and online teammate count
- Example: `Playing My Rust Server | 3/5 Online`

## Troubleshooting

### Bot Not Responding
- Check the add-on logs for errors
- Verify Discord token and client ID are correct
- Ensure bot has proper permissions in Discord

### Connection Issues
- Verify Rust+ credentials are valid
- Check if the Rust server supports Rust+
- Try restarting the add-on

### Credential Problems
- Make sure credentials file is in the correct location
- Check file permissions
- Try regenerating credentials

### MQTT / Home Assistant Issues
- Verify the Mosquitto broker add-on is installed and running
- Check that MQTT username and password are correct
- Look for `[HA] MQTT error:` messages in the add-on logs
- Ensure `mqtt_discovery` is set to `true` in the add-on configuration
- Check **Settings** → **Devices & Services** → **MQTT** to see discovered devices

### Add-on Won't Start
- Check Home Assistant logs
- Verify configuration syntax
- Ensure all required fields are filled

### WebUI Issues
- Ensure `webui_enabled` is set to `true`
- Confirm `webui_port` is not used by another service
- Access WebUI using `http://HOME_ASSISTANT_IP:<webui_port>`
- Check add-on logs for WebUI startup messages and port bind errors

## File Locations

The add-on stores data in these locations:
- **Credentials**: `/data/credentials/`
- **Server Data**: `/data/instances/`
- **Logs**: `/data/logs/`
- **Maps**: `/data/maps/`
- **Statistics Database**: `/data/statistics.db` (default, configurable via `database_path`)

## Support

For help and support:
- [Official Documentation](https://github.com/alexemanuelol/rustplusplus/blob/master/docs/documentation.md)
- [Discord Support Server](https://discord.gg/vcrKbKVAbc)
- [GitHub Issues](https://github.com/KarlisKocins/homeassistant-addon-rustplusplus/issues)

## Next Steps

After successful setup:
1. Explore the bot's commands with `/help`
2. Set up your preferred smart devices
3. Configure notification preferences
4. If MQTT is enabled, build Home Assistant automations around your Rust devices
5. Enjoy enhanced Rust gameplay with Discord and Home Assistant integration!
