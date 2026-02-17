# Changelog

## v1.2.27 (2026-02-17)

### Improvements

- Added a new Smart Switch auto mode: `AUTO-NIGHT-ANY-ONLINE`.
- This mode turns switches on only during night when at least one teammate is online.
- Switches now turn off automatically during daytime or when all teammates are offline in this mode.
- Added the new mode to Discord switch auto-setting select menus and labels.
- Added the new mode to WebUI switch auto-configuration options and translations.
- Bumped addon/package version to 1.2.27.

## v1.2.26 (2026-02-17)

### Maintenance

- Bumped addon/package version to 1.2.26.

## v1.2.25 (2026-02-17)

### Fixes

- Published Home Assistant MQTT discovery/state immediately when a smart device is paired (host and lite listeners).
- Fixed MQTT state publishing when Supervisor REST token is unavailable by allowing MQTT updates without REST events.
- Republished known server/device discovery on MQTT reconnect to recover cleanly after broker restarts.
- Removed retained MQTT discovery/state topics when devices or servers are deleted to prevent stale entities.
- Synced MQTT discovery updates when device names are edited from Discord modals or WebUI switch edit API.
- Bumped addon/package version to 1.2.25.

## v1.2.24 (2026-02-17)

### WebUI

- Fixed map annotation drawing by storing and rendering world points in a consistent format.
- Added backward-compatible annotation rendering support for previously saved `{ worldX, worldY }` points.
- Fixed annotation mode cursor handling to target the dynamic map canvas.
- Removed the WebUI distance measure tool (button, tooltip, handlers, and related styles).
- Bumped addon/package version to 1.2.24.

## v1.2.23 (2026-02-17)

### WebUI

- Changed team member online indicators in the WebUI to use each player's map color instead of fixed green.
- Updated player list modal online status dots to use each team member's mapped player color when available.
- Bumped addon/package version to 1.2.23.

## v1.2.22 (2026-02-17)

### Fixes

- Fixed Insta-Profit false-positive route pairs caused by invalid/missing item IDs.
- Added stricter reciprocal trade validation to reject malformed/self-referential pairs.
- Normalized per-cycle leg item labeling so both legs consistently show the same swapped pair context.
- Bumped addon/package version to 1.2.22.

## v1.2.21 (2026-02-17)

### WebUI

- Updated Insta-Profit route rendering to show per-cycle player actions with the same swapped middle item across both route legs.
- Added explicit cycle middle-amount consistency validation to reciprocal route matching.
- Added per-cycle route search matching for improved item/action discoverability.
- Added dedicated `#instaProfitSearch` styling and focus state in modal controls.
- Added translation keys for buy/sell action labels used in per-cycle route text.
- Bumped addon/package version to 1.2.21.

## v1.2.20 (2026-02-17)

### WebUI

- Moved Insta-Profit routes from the Shops Browser modal into a dedicated navbar page/modal (`Insta Profit`).
- Kept Shops Browser focused on shop listings and routed all profit discovery/search to the new page.
- Added/updated EN, ES, and RU translation keys for the new navbar/page labels.
- Bumped addon/package version to 1.2.20.

## v1.2.19 (2026-02-17)

### WebUI

- Added Insta-Profit routes to Shops Browser in the WebUI.
- Clicking a shop trade row now opens a detail panel in the same modal.
- Added strict reciprocal 2-shop arbitrage matching with blueprint-aware validation.
- Added profit math with normalized trade cycles, per-cycle gain, and stock-limited total gain.
- Added route sorting by highest net gain and side-by-side Buy From / Sell To route display.
- Added responsive styles for profit routes and mobile stacking behavior.
- Added new translation keys for profit labels and messages in EN, ES, and RU.
- Bumped addon/package version to 1.2.19.

## v1.2.18 (2026-02-17)

### Fixes

- Fixed vending modal instant-profit filtering to use the correct `showInstantProfitOnly` checkbox id.
- Removed duplicate instant-profit matcher logic and kept a single key-based matching path.
- Enforced in-stock-only instant-profit matching (`amountInStock > 0`) for key generation and shop filtering.
- Bumped addon/package version to 1.2.18.

## v1.2.17 (2026-02-17)

### Fixes

- Fixed intermittent live map player color assignment by reloading missing team colors after live team updates.
- Fixed live chat player names showing as unknown by accepting backend `player_name` / `steam_id` payload fields and resolving fallback names from current team data.
- Bumped addon/package version to 1.2.17.

## v1.2.16 (2026-02-17)

### Fixes

- Fixed Web UI player-click zoom/coordinate conversion to use `worldRect`-aligned mapping so selecting a player centers correctly on the map.
- Bumped addon/package version to 1.2.16.

## v1.2.15 (2026-02-17)

### Improvements

- Added a Web UI notification for newly earned player achievements. The notification appears in the Web UI notifications panel when a player earns an achievement.
- Added an "Achievements" toggle to Web UI notification settings so achievement notifications can be enabled or disabled.
- Bumped addon/package version to 1.2.15.

## v1.2.12 (2026-02-16)

### New Features

- **Event Prediction Engine** — Tracks in-game events (Cargo, Heli, Chinook, Oil Rigs, Deep Sea) and predicts when they'll next occur based on historical interval data. Live countdowns, progress bars, and confidence indicators in a dedicated modal.
- **Raid Planner Tool** — Client-side calculator for planning raids. Select target structures (walls, doors, TCs, etc.), adjust quantities, and see total explosive costs with cheapest-method recommendations.
- **Achievement / Badge System** — Computed achievements for each player based on playtime, session count, deaths, and chat activity. Displayed in the player details view with earned/locked states, progress bars, and icons.

### Backend

- Added `event_history` table to statistics database for persisting game events
- Added `recordEvent`, `getEventHistory`, `getEventPredictionData`, and `computeAchievements` methods to `StatisticsDatabase`
- Added pass-through methods in `StatisticsTracker` for event tracking and achievements
- Hooked `RustPlus.sendEvent()` to automatically persist all events to the database
- Added API routes: `/api/statistics/events/:guildId/predictions` and `/api/statistics/achievements/:guildId/:steamId`

### Frontend

- Added navigation buttons for Predictions and Raid Planner in header
- Added modal overlay system with backdrop blur and slide-in animations
- Integrated achievement display into player statistics detail view
- Added ~520 lines of CSS for predictions, raid planner, achievements, and modal components
