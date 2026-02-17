# Changelog

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
