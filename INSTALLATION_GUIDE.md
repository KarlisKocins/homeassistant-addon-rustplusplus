# RustPlusPlus Home Assistant Add-on Installation Guide

This guide will walk you through setting up the RustPlusPlus Discord bot as a Home Assistant add-on on your Home Assistant Green.

## Prerequisites

Before starting, ensure you have:
- Home Assistant Green with Supervisor access
- A Discord account and server where you want the bot
- Access to a Rust server that supports Rust+ (most official servers do)

## Step 1: Create a Discord Bot

1. **Go to Discord Developer Portal**
   - Visit [https://discord.com/developers/applications](https://discord.com/developers/applications)
   - Click "New Application" and give it a name (e.g., "RustPlusPlus Bot")

2. **Create the Bot**
   - Go to the "Bot" section in the left sidebar
   - Click "Add Bot"
   - Copy the **Token** (keep this secure - you'll need it later)
   - Enable "Message Content Intent" under "Privileged Gateway Intents"

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
   - In Home Assistant, go to **Supervisor** → **Add-on Store**
   - Click the **⋮** menu (three dots) in the top right
   - Select **Repositories**
   - Add this URL: `https://github.com/YOUR_USERNAME/rustplusplus-homeassistant-addon`
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

3. **Save Configuration**
   - Click **Save**

## Step 5: Start the Add-on

1. **Start the Add-on**
   - Go to the **Info** tab
   - Click **Start**
   - Enable "Start on boot" if you want it to auto-start

2. **Check Logs**
   - Go to the **Log** tab
   - Look for successful startup messages
   - The bot should connect to Discord

## Step 6: Get Rust+ Credentials

You need to get your Rust+ credentials to connect to Rust servers:

### Option A: Using the Credential Application (Recommended)

1. **Download the Application**
   - Download from: [RustPlusPlus Credential Application](https://github.com/alexemanuelol/rustplusplus-credential-application/releases/download/v1.4.0/rustplusplus-1.4.0-win-x64.exe)
   - Run the application on Windows
   - Follow the instructions to get your credentials

2. **Upload Credentials**
   - The credentials will be saved as a JSON file
   - You need to place this in the Home Assistant share folder
   - Access your Home Assistant files via Samba/SMB or File Editor add-on
   - Create folder: `/share/rustplusplus/credentials/`
   - Upload your credentials file there

### Option B: Using Discord Commands

1. **Use the Bot**
   - In your Discord server, type `/credentials`
   - Follow the bot's instructions to set up credentials

## Step 7: Connect to a Rust Server

1. **Join a Rust Server**
   - Join a Rust server that supports Rust+ (most official servers)
   - Open the Rust+ mobile app
   - Pair with the server

2. **Pair the Bot**
   - In Discord, use `/pair` command
   - Follow the instructions to connect the bot to your server

## Step 8: Configure Features

Once connected, you can set up various features:

### Smart Devices
- Use `/switch` to set up smart switches
- Use `/alarm` to configure smart alarms
- Use `/storagemonitor` for storage monitoring

### Notifications
- Configure event notifications (heli, cargo ship, etc.)
- Set up team chat bridging

### Information Channels
- The bot will create information channels automatically
- These show server status, events, and team information

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

### Add-on Won't Start
- Check Home Assistant logs
- Verify configuration syntax
- Ensure all required fields are filled

## File Locations

The add-on stores data in these locations:
- **Credentials**: `/share/rustplusplus/credentials/`
- **Server Data**: `/share/rustplusplus/instances/`
- **Logs**: `/share/rustplusplus/logs/`
- **Maps**: `/share/rustplusplus/maps/`

## Support

For help and support:
- [Official Documentation](https://github.com/alexemanuelol/rustplusplus/blob/master/docs/documentation.md)
- [Discord Support Server](https://discord.gg/vcrKbKVAbc)
- [GitHub Issues](https://github.com/alexemanuelol/rustplusplus/issues)

## Next Steps

After successful setup:
1. Explore the bot's commands with `/help`
2. Set up your preferred smart devices
3. Configure notification preferences
4. Enjoy enhanced Rust gameplay with Discord integration!