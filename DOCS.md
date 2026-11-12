# RustPlusPlus Discord Bot — Documentation

Full reference for the add-on: configuration, Home Assistant integration, WebUI, usage and troubleshooting. For a step-by-step first-time walkthrough see the [installation guide](https://github.com/KarlisKocins/homeassistant-addon-rustplusplus/blob/main/docs/installation.md).

## Configuration

### Discord Bot Setup

Before using this add-on, you need to create a Discord bot:

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** and give it a name
3. Go to the **Bot** section and click **Add Bot**
4. Copy the **Token** (this is your Discord Token)
5. Under **Privileged Gateway Intents**, enable both **Server Members Intent** and **Message Content Intent**, then click **Save Changes**. The bot will not come online without both
6. Go to **OAuth2** → **General** and copy the **Client ID**
7. In **OAuth2** → **URL Generator**:
   - Select **bot** scope
   - Select required permissions (Administrator recommended for full functionality)
   - Use the generated URL to invite the bot to your Discord server

### Rust+ Credentials

You'll need to get your Rust+ credentials using the official credential application:

1. Download the [RustPlusPlus Credential Application](https://github.com/alexemanuelol/rustplusplus-credential-application/releases/download/v1.4.0/rustplusplus-1.4.0-win-x64.exe)
2. Run the application and follow the instructions

### Rust+ Auth Token (relay connection)

Since the November 2026 Rust update, game servers no longer accept direct Rust+ connections. The bot
connects through the Facepunch Rust+ relay instead, which needs two things:

- the **relay server id**, which the bot stores when you pair a server in game, and
- the **Rust+ auth token** of the Steam account that paired it. This is the Steam login token from the
  Rust+ companion login. It is **not** the same thing as the FCM credentials, and it is valid for about
  **14 days**.

**Setting it up**

1. Get a Rust+ auth token for your Steam account. The token is the `token=` value of the
   `.../callback?token=...` address the Rust+ companion login redirects to. You can paste the whole
   address or just the value; both work.
2. Give it to the bot in one of two ways:
   - **WebUI:** open **Settings** in the sidebar and use the **Rust+ relay token** panel. This also
     works through Home Assistant ingress. The token is write-only: the page shows its state and expiry
     but never the token itself.
   - **Discord:** `/credentials set_token rustplus_auth_token:<token>` (or pass `rustplus_auth_token`
     to `/credentials add` when you register the account).
3. **Re-pair each server once in game** (Rust+ menu, pair). Servers paired before the update do not
   have a relay server id yet. Pairing adds it to the existing server entry, so your Smart Devices and
   their Home Assistant entities stay as they are.

**When the token expires**

The token cannot be renewed automatically. The bot makes the expiry visible instead:

- the credential owner gets a Discord DM about 3 days before it expires, and again if it expires or the
  relay rejects it (once per token, so restarts do not repeat it);
- if the token is expired or the relay rejects it (HTTP 401/403), the bot **stops retrying** that
  server instead of hammering the relay, and resumes by itself as soon as you store a new token;
- Home Assistant gets a **Token needs attention** problem sensor, a **Token expires** timestamp sensor
  and a **Token status** sensor for each account (see below), so you can build your own notification.

Servers that have no relay server id yet are still tried directly, so servers that have not moved to
the relay keep working. A server that was only ever paired through the relay is stored as
`relay-<server id>`.

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
| `battlemetrics_api_key` | password | _(empty)_ | BattleMetrics API token, required for player tracking. See [Player Tracking](#player-tracking) |
| `webui_enabled` | boolean | `false` | Enable/disable the built-in RustPlusPlus WebUI |
| `webui_port` | integer | `3001` | Port used by the WebUI when enabled |
| `webui_password` | password | _(empty)_ | Password for the WebUI login on direct access. If left empty, a random access token is generated and printed in the add-on log on every start |
| `database_path` | string | `/data/statistics.db` | Path for the statistics database used by WebUI/statistics features |
| `positions_retention_days` | integer | `14` | How many days of player position history to keep for map replay; older rows are deleted during hourly maintenance |

## Player Tracking

Player trackers, the `/players` command and the information-channel player list all read the server's
player list from the **BattleMetrics API**.

BattleMetrics used to serve this for free. It no longer does — every endpoint now answers
`403 Access denied. A subscription is required to use the API.` A subscription and an API key are
therefore required for these features.

### Setting the API key

1. Subscribe to a plan at [battlemetrics.com](https://www.battlemetrics.com/)
2. Generate a token at [battlemetrics.com/developers/token](https://www.battlemetrics.com/developers/token)
3. Paste it into the **battlemetrics_api_key** option in the add-on **Configuration** tab
4. Restart the add-on

The key is stored as a Home Assistant secret and sent as a `Bearer` token. Requests are pinned to
`api.battlemetrics.com` and redirects are refused, so the token is never forwarded to another host.

### Without an API key

The rest of the add-on is unaffected — smart devices, alarms, storage monitors, events, team chat,
the map and the WebUI all work normally. Only the player-tracking features are unavailable:

- Tracker buttons, the BattleMetrics settings buttons, `/players` and the in-game `!player` /
  `!players` commands reply with a notice that a BattleMetrics API key is needed. Deleting an
  existing tracker still works
- The information-channel player list is removed rather than shown empty

The add-on log prints a warning at startup when no key is set.

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

### Entity Availability

Rust entities go **unavailable** in Home Assistant instead of showing stale state. Availability is
tracked on two retained topics, and every entity requires both to be `online`:

| Topic | Meaning |
|-------|---------|
| `rustplus/bridge/availability` | The add-on is running and connected to the broker |
| `rustplus/<serverId>/availability` | The Rust+ connection to that server is up |

The add-on registers a Last Will with the broker, so entities also go unavailable if it crashes
rather than shutting down cleanly. Everything recovers automatically on reconnect.

This matters for automations: a switch that reads `off` because the add-on is down is very different
from one that is genuinely off. Use `unavailable` as a guard in templates and conditions.

### Rust+ Token Health

Each registered Steam account gets its own device, `Rust+ account <steamId>`, with:

| Entity | Meaning |
|--------|---------|
| `Token needs attention` (problem) | `on` when the token is missing, invalid, expired, or was rejected by the relay |
| `Token expires` (timestamp) | When the stored token expires |
| `Token status` | `ok`, `expiring` (under 3 days left), `expired`, `missing`, `invalid` or `rejected` |

These follow only the bridge availability, not a server connection: a token problem is exactly when no
server is connected, so tying them to a server would hide it. Example automation trigger:

```yaml
trigger:
  - platform: state
    entity_id: binary_sensor.rust_account_76561198000000000_token_needs_attention
    to: "on"
```

The entity id depends on your Steam id and Home Assistant's naming; check the device page.

### Example Configuration

```yaml
mqtt_host: core-mosquitto
mqtt_port: 1883
mqtt_username: mqtt_user
mqtt_password: your_mqtt_password
mqtt_discovery: true
```

### Raid Alerts (Blueprint)

Every paired Smart Alarm is a `binary_sensor` in Home Assistant, so you can be woken up wherever you are
without anyone needing to be in Discord. The ready-made **Rust++ raid alert** blueprint does it in one click:

[![Open your Home Assistant instance and show the blueprint import dialog.](https://my.home-assistant.io/badges/blueprint_import.svg)](https://my.home-assistant.io/redirect/blueprint_import/?blueprint_url=https%3A%2F%2Fgithub.com%2FKarlisKocins%2Fhomeassistant-addon-rustplusplus%2Fblob%2Fmain%2Fblueprints%2Fautomation%2Frustplusplus%2Fraid_alert.yaml)

When the alarm triggers it can:

- send a **critical notification** to your phone that breaks through silent / Do Not Disturb (Home Assistant Companion app)
- **flash lights red**
- turn on a **siren** or a switch (for example a smart plug with a loud siren) for a set time

Pick the Smart Alarm and the alerts you want when you create the automation from the blueprint.

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

#### Day/night offset

Switches in `AUTO-DAY`, `AUTO-NIGHT` or `AUTO-NIGHT-ANY-ONLINE` mode have a **day/night offset**, set in minutes
from -120 to 120 (0 by default). It moves both the sunrise and the sunset boundary: a negative value switches
earlier, so `-10` turns a night light on about ten minutes before sunset, and a positive value switches later. Set it
from the **Edit** button on the switch in Discord, or in the Switches editor in the WebUI.

The offset is in real minutes, converted to in-game time using the server's day length. Rust runs the night at a
different speed from the day, so treat it as approximate rather than exact.

### Alarm Siren in Discord Voice

The bot can play a siren in your Discord voice channel when a Smart Alarm triggers, which is useful while
your team is in a call. It is off by default:

1. Join a voice channel and run `/voice join`.
2. Turn on **Should a siren play in the voice channel when a Smart Alarm triggers?** in the settings channel.

The bot leaves the voice channel when everyone else has left, so the siren only plays while someone is in
the call. For alerts when nobody is in Discord, use the raid alert blueprint above. Discord does not let bots
stream video, so cameras cannot be shown in a call.

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

### Bot Shows Offline in Discord

If the bot is in your server but stays offline (MQTT may still connect fine — it does not depend on
Discord), the add-on never finished logging in to Discord:

1. `Discord gateway closed (... code 4014 DisallowedIntents)` in the log: in the
   [Discord Developer Portal](https://discord.com/developers/applications) → your application →
   **Bot** → **Privileged Gateway Intents**, enable **Server Members Intent** and
   **Message Content Intent**, click **Save Changes**, then restart the add-on
2. `code 4004 AuthenticationFailed` or `Discord login failed: [TokenInvalid]`: the token is wrong or was
   reset. Click **Reset Token** on the **Bot** page, paste the new value into `discord_token` and restart
3. A successful login logs `LOGGED IN AS: <bot name>`. Until that line appears, the WebUI does not
   start either, so the sidebar panel reports a connection failure

### Connection Issues

1. Verify your Rust+ credentials are valid
2. Check if the Rust server supports Rust+ (most official servers do)
3. Ensure you're paired with the correct server
4. Try restarting the add-on
5. Look for `Relay` lines in the log. `Rust+ auth token expired` or `rejected` means the token needs
   replacing: see [Rust+ Auth Token](#rust-auth-token-relay-connection). Pair the server again in game if
   it was paired before the November 2026 update.

### MQTT / Home Assistant Issues

1. Verify the Mosquitto broker add-on is running
2. Check MQTT credentials are correct (`mqtt_username` / `mqtt_password`)
3. Look for `[HA] Connected to MQTT broker.` in the add-on logs
4. If devices don't appear in HA, check **Settings** → **Devices & Services** → **MQTT**
5. Ensure `mqtt_discovery` is set to `true`
6. If entities show as **unavailable**, check the two availability topics (see
   [Entity Availability](#entity-availability)). `rustplus/bridge/availability` reading `offline`
   means the add-on is stopped or lost the broker; `rustplus/<serverId>/availability` reading
   `offline` means the Rust+ connection to that server is down — look for reconnect messages in the log

### Player Tracking Issues

1. `Access denied. A subscription is required to use the API` in the log means BattleMetrics rejected
   the request. Either no `battlemetrics_api_key` is set, the token is wrong, or the subscription
   lapsed. Verify the token at [battlemetrics.com/developers/token](https://www.battlemetrics.com/developers/token)
2. After adding or changing the key, restart the add-on — it is read from the environment at startup
3. Empty player lists with no error in the log usually mean the server has no BattleMetrics ID stored.
   Check the server's settings in the Discord `settings` channel
4. Player tracking is the only feature that needs the key. If devices, events or the map are also
   broken, the cause is elsewhere — see the sections above

### WebUI Fails to Connect

The sidebar panel / **Open Web UI** button shows a connection error when nothing is listening:

1. Set `webui_enabled: true` (it is `false` by default) and restart the add-on
2. The WebUI starts only after the bot has logged in to Discord. If the bot is offline, fix that first —
   see [Bot Shows Offline in Discord](#bot-shows-offline-in-discord)
3. Look for `WebUI: server running on http://0.0.0.0:<port>` in the log; a `Port ... is already in use`
   error means another service holds `webui_port`

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
