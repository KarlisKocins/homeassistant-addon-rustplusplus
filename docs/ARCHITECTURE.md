# Architecture

A map of how the add-on is put together, for contributors. For setup and configuration see
[DOCS.md](../DOCS.md); for releasing see [maintaining.md](maintaining.md).

<!-- Generated from the code on 2026-11-03 | src/: 154 JavaScript files | Node >= 22, CommonJS -->

## Overview

One Node.js process that sits between three things:

```
                         +--------------------+
  Discord  <-----------> |                    | <-----------> Home Assistant
  (discord.js)           |   rustplusplus     |               (MQTT discovery)
                         |   (this process)   |
  Rust+ servers <------> |                    | <-----------> Browser
  (rustplus.js, FCM)     +--------------------+               (WebUI, if enabled)
                                  |
                       instances/ credentials/ logs/ maps/  +  statistics.db
```

## Startup

1. The Home Assistant Supervisor starts the container. [`run.sh`](../run.sh) reads the add-on options with
   bashio, exports them as `RPP_*` environment variables, creates `/data/{credentials,instances,logs,maps}`,
   symlinks them into `/app` and runs `exec node /app/index.js`.
2. [`config/index.js`](../config/index.js) turns those variables into one settings object (language, polling
   interval, log level, database path, Discord credentials, WebUI port and password). The MQTT settings
   (`RPP_MQTT_*`) are read directly by `HomeAssistant.js`.
3. [`index.js`](../index.js) creates any missing data directories, builds the `DiscordBot` client, calls
   `client.build()` (the Discord login) and creates the `HomeAssistant` MQTT bridge. On `SIGTERM` it publishes
   `offline` on the MQTT availability topic before exiting.
4. The `DiscordBot` constructor ([`src/structures/DiscordBot.js`](../src/structures/DiscordBot.js)) loads every
   file in `src/commands/` and `src/discordEvents/` and the language files.
5. On the Discord `ready` event ([`src/discordEvents/ready.js`](../src/discordEvents/ready.js)) the bot
   creates the instance and credentials files for every guild, loads the guild languages, and sets its
   username, avatar and presence. Then, per guild, it syncs credentials and runs `setupGuild` (registers slash
   commands, creates the category, channels and settings messages). After that it starts the WebUI (only if
   enabled), refreshes BattleMetrics immediately and then every 60 s, and connects to the Rust servers saved
   in each guild's instance (`createRustplusInstancesFromConfig`).

## Rust+ connection and polling

Each connected server is a `RustPlus` object ([`src/structures/RustPlus.js`](../src/structures/RustPlus.js)).
Its socket events are handled by one file per event in [`src/rustplusEvents/`](../src/rustplusEvents)
(`connecting`, `connected`, `disconnected`, `message`, `request`, `error`).

- **Polling.** [`connected.js`](../src/rustplusEvents/connected.js) polls once and then every
  `pollingIntervalMs` (default 10 000 ms, from `RPP_POLLING_INTERVAL`, which the add-on options do not expose,
  so in the add-on it stays at 10 s). Each poll in
  [`pollingHandler.js`](../src/handlers/pollingHandler.js) fetches server info, map markers, team info and
  time, then runs the handlers in order: team, smart switches, time, vending machines, then (after updating
  the stored info, markers and time) the Home Assistant publish, information, storage monitors and smart
  alarms.
- **Chat.** In [`message.js`](../src/rustplusEvents/message.js), team chat messages are filtered (blacklist,
  the bot's own echoes), offered to the in-game command handler (the `!` commands in
  [`src/textCommands/`](../src/textCommands)) and otherwise relayed to Discord by the team chat handler. The
  same file handles entity-changed (switch, alarm, storage monitor) and team-changed broadcasts.
- **Push notifications.** [`FcmListener.js`](../src/util/FcmListener.js) (the host) and
  [`FcmListenerLite.js`](../src/util/FcmListenerLite.js) (other paired users) receive the Rust+ Companion
  App's push notifications. Pairing a smart switch, alarm or storage monitor arrives this way and is written
  to the guild's instance file.

## Discord side

- [`src/discordEvents/`](../src/discordEvents): `interactionCreate` sends buttons to `buttonHandler`, select
  menus to `selectMenuHandler`, modals to `modalHandler` and slash commands to the matching file in
  [`src/commands/`](../src/commands). `messageCreate` sends messages in the commands channel to
  `discordCommandHandler` and forwards messages in the team chat channel to the game. It ignores bots, the
  Discord blacklist, and every message until a server is connected.
- [`src/discordTools/`](../src/discordTools): builders for embeds, buttons, modals, select menus and the
  channel messages (`Setup*.js`), plus slash command registration and voice playback (`discordVoice.js`).
- Texts come from [`src/languages/`](../src/languages) through `client.intlGet(guildId, key)`, which falls back
  to English for a missing key.

## Data and persistence

| What | Where | Notes |
|---|---|---|
| Per-guild settings, servers, switches, alarms, trackers, channel ids | `instances/<guildId>.json` | Read and written through [`instanceUtils.js`](../src/util/instanceUtils.js); cached in memory by `client.getInstance` / `setInstance`. |
| Rust+ push credentials per Steam id | `credentials/<guildId>.json` | Secret. Never commit. |
| WebUI session secret | `instances/webui_secret.json` | Created on first start. |
| Logs, generated server map images | `logs/`, `maps/` | Map images are `<guildId>_map_clean.png` and `<guildId>_map_full.png`. |
| Statistics (positions, sessions, deaths, chat) | SQLite at `RPP_DB_PATH` (default `/data/statistics.db`) | [`src/statistics/`](../src/statistics), using `better-sqlite3`. The tracker is created when the WebUI starts. |

In the add-on, `credentials/`, `instances/`, `logs/` and `maps/` are symlinks into `/data`, so they survive
restarts and updates. They are git-ignored.

## WebUI

Off by default (`RPP_WEBUI_ENABLED`). When on, `startWebUi()` creates the server in
[`src/webserver/WebServer.js`](../src/webserver/WebServer.js): Express plus socket.io on `RPP_WEBUI_PORT`
(default 3001). It serves the static frontend in [`public/`](../public) (ES modules, entry
[`public/app.js`](../public/app.js)) and the images from `src/resources/images`.

- **Auth** ([`Auth.js`](../src/webserver/Auth.js)): a password (`webui_password`, or a token generated and
  logged at startup) gives a signed session cookie. Requests that arrive through Home Assistant ingress (source
  address `172.30.32.2`) are already authenticated. Authenticated state-changing requests whose `Origin`
  header names a different host are rejected (a CSRF check), and socket.io uses the same authentication.
  Login attempts are rate limited ([`rateLimit.js`](../src/webserver/rateLimit.js)).
- **Statistics API** ([`StatisticsRoutes.js`](../src/webserver/StatisticsRoutes.js)): optional per-guild PIN.
- `/api/health` is public so the Supervisor watchdog in [`config.yaml`](../config.yaml) can call it.

## Home Assistant (MQTT)

[`src/structures/HomeAssistant.js`](../src/structures/HomeAssistant.js) connects to the broker (`RPP_MQTT_*`,
default host `core-mosquitto`) and publishes discovery messages under `homeassistant/` for switches (with
commands back to the game), binary sensors (alarms) and sensors. State and command topics live under
`rustplus/<serverId>/<entityId>/`. Discovery can be switched off with the `mqtt_discovery` option. An entity
is available only while both `rustplus/bridge/availability` (with a Last Will, so entities go unavailable
when the add-on stops) and its server's `rustplus/<serverId>/availability` report `online`.

## Where things are

| Directory | Contents |
|---|---|
| `src/structures/` | Long-lived objects: `DiscordBot`, `RustPlus`, `HomeAssistant`, `Battlemetrics`, `Map`, `Team`, `Time` |
| `src/handlers/` | Per-poll and per-interaction logic |
| `src/commands/` | Slash commands (one file each) |
| `src/textCommands/` | In-game `!` commands |
| `src/discordEvents/`, `src/rustplusEvents/` | Event entry points, one file per event |
| `src/discordTools/` | Discord message, embed and component builders |
| `src/webserver/`, `public/` | WebUI backend and frontend |
| `src/statistics/` | SQLite statistics database and tracker |
| `src/util/` | Helpers (instance files, timers, FCM listeners, constants) |
| `src/staticFiles/`, `src/languages/`, `src/templates/` | Game data, translations, default settings |
| `src/external/` | Maintenance scripts: regenerate item and RustLabs data, and find unused language phrases |
| `test/` | Unit tests |
| `blueprints/` | Home Assistant automation blueprint |

## Working on it

```bash
npm ci
npm test                 # node --test
npm run test:coverage    # same, with Node's built-in coverage table
npm run lint             # ESLint
```

CI runs the tests, lint, the add-on image build, a startup smoke test
([maintaining.md](maintaining.md#startup-smoke-test)) and security checks (`npm audit` and CodeQL). The tests load only the pure logic; the Discord, Rust+
and MQTT paths are not covered by automated tests.
