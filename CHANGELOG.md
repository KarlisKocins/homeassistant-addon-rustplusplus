# Changelog

## v2.0.1 (2026-07-18)

### Fixes

- Fixed the Stats page not opening: the server-selection code referenced `StatisticsManager` without importing it after the ES-module split, so the statistics manager was never created.
- Fixed map dragging only moving player icons: the drag handler did not mark the static map layer for redraw (previously masked by a redundant per-frame redraw that v2.0.0 removed).
- Fixed the Predictions modal rendering garbage "success/error" cards when the statistics PIN had not been verified yet: non-OK API responses are no longer rendered as event data, and a clear "PIN verification required" message is shown instead. The same response guard was added to achievements loading.

## v2.0.0 (2026-07-18)

### ⚠️ Upgrade notes — read before updating

- **The WebUI now requires a login on direct/public URLs.** Set `webui_password` in the add-on configuration, or use the auto-generated access token printed prominently in the add-on log on every start. When opened through the new Home Assistant ingress panel, no extra login is needed (HA's own authentication applies).
- **Player position history older than 14 days is now deleted** during hourly maintenance. Raise or change `positions_retention_days` in the add-on configuration if you want a longer replay window.

### Security

- Authentication (HMAC-signed session cookies) in front of every WebUI route, static asset, and the websocket. Previously all endpoints — including smart-switch control, tracker create/delete (Discord channels!), and statistics reset — were unauthenticated.
- The statistics PIN is now enforced server-side with signed per-guild access cookies; previously it was client-side only. `set-pin` can no longer overwrite an existing PIN.
- CORS fully closed (same-origin UI); cross-origin mutations rejected; login rate-limited with constant-time password comparison.

### Home Assistant integration

- **Ingress support**: the WebUI now appears in the HA sidebar behind HA's login. All frontend URLs are prefix-aware; direct port access keeps working.
- Supervisor **watchdog** via the new `/api/health` endpoint, and an "Open Web UI" button on the add-on page.

### Runtime & image

- Dropped `ts-node` from production: the app now runs under plain Node (`node index.js`). TypeScript tooling removed from dependencies.
- Multi-stage Docker build: compilers (`g++`, `python3`, `make`), `git` and `npm` no longer ship in the runtime image — significantly smaller and faster to pull.

### Performance

- Fixed a perpetual full-redraw loop in the map renderer (every frame re-dirtied all canvas layers). Idle CPU drops substantially; rendering also pauses while the tab is hidden.
- HTTP compression for all WebUI/API responses; server data cache no longer rebuilt per request; deaths queries filtered in SQL instead of JS; death heatmap prerendered off-screen; player trails pruned once per update.

### Frontend architecture

- The WebUI is now native ES modules: `app.js` (was 2,940 lines) and `statistics.js` (was 2,137) split into focused modules under `js/core/`, `js/map/`, `js/panels/`, `js/stats/` with a single module entry point.

### Features

- **Activity tab** in Statistics: 7×24 team-activity heatmap (4-week average, local timezone) and a per-hour player-count forecast for today with live overlay.
- **Map shop hover cards**: hovering a vending machine on the map shows its sell orders with item icons, prices, and stock — including out-of-stock strikethrough.

### Tests

- New `node --test` suite (18 tests) covering auth token signing/verification, scope isolation, SQL death filtering, retention cleanup, and the new activity/forecast aggregations. `npm test` runs it.

## v1.3.6 (2026-07-17)

### Features

- Added item icons throughout the WebUI shop views: the Shops Browser now shows an icon next to every product and its price currency, and Insta-Profit route cards show icons in the buy/sell trade lines, the total profit, and the leftover amount.
- Added a new `/api/items/icon/:itemId` endpoint that resolves the item's shortname from the bundled item database and proxies the icon from the rusthelp.com CDN with in-memory caching (only confirmed 404s are negative-cached, so transient network failures can be retried).

## v1.3.5 (2026-07-17)

### Fixes

- Fixed the Insta-Profit finder returning zero routes on real servers: Rust item ids are signed hashes and usually negative, but order normalization clamped them to 0 and the route guard then rejected every order. Ids are now kept as plain integers. Verified against live server data producing the same routes as the rustplus-desktop app.
- Removed a dead replay-mode block in the map monument renderer that referenced undefined variables and would throw a ReferenceError when replay mode rendered monuments.

### Chores

- Bumped addon/package version to 1.3.5.

## v1.3.4 (2026-07-07)

### Features

- Reworked the WebUI map with desktop-style markers: color-tinted teammate pins (gold crown for the team leader, dimmed with a skull when dead), shop/vending discs with a cart glyph, monument icon badges with rounded name labels, and event markers with a colored backing ring.

### Fixes

- Fixed the Insta-Profit finder hiding profitable reciprocal flips when a vending machine's current stock was below one full balanced trade cycle. Route detection now simulates trades within available stock, keeps the most profitable run, and shows any leftover middle item.

### Chores

- Bumped addon/package version to 1.3.4.

## v1.3.3 (2026-02-25)

### Fixes

- Updated WebUI live update handling to re-render Shops Browser and Insta-Profit views while their modals are open.
- Fixed Insta-Profit route identity to avoid coordinate-based machine collisions by using per-update machine indexing during route pairing/deduping.
- Fixed Insta-Profit stock undercounting when a vending machine contains duplicate matching orders by aggregating in-stock amounts per normalized order key.
- Bumped addon/package version to 1.3.3.

## v1.3.2 (2026-02-19)

### Hotfix

- Rolled back recently upgraded runtime dependency ranges to the known-working pre-1.3.0 compatibility set to address Home Assistant startup failures after Dependabot updates.
- Regenerated `package-lock.json` with the rollback.
- Bumped addon/package version to 1.3.2.

## v1.3.1 (2026-02-19)

### Fixes

- Updated slash command registration to Discord API v10 in `RegisterSlashCommands`.
- Removed startup hard-exit behavior on Discord error events and slash registration failures to prevent restart loops and surface real runtime errors in logs.
- Added global `uncaughtException` logging during startup/runtime to improve crash diagnostics.
- Bumped addon/package version to 1.3.1.

## v1.3.0 (2026-02-19)

### Security

- Hardened BattleMetrics outbound requests to only allow HTTPS calls to `api.battlemetrics.com` to mitigate SSRF risk.
- Added strict guild ID validation and safe path resolution for instance/credentials file reads and writes.
- Added per-IP + per-guild rate limiting for statistics PIN endpoints (`verify`, `set`, `update`).
- Added prototype-pollution guards for dynamic Web API object keys and tracker/server identifier validation.
- Added stricter tracker player ID validation before state mutations.
- Replaced ad-hoc markdown escaping with centralized Discord link-text escaping for BattleMetrics player names in embeds and command output.
- Strengthened RustLabs parser string handling (`%20` / `%` replacements) and HTML decode behavior for repeated replacements.
- Bumped addon/package version to 1.3.0.

## v1.2.29 (2026-02-19)

### Improvements

- Added a new `fertilizerScrapMaxStockSetting` notification toggle in Discord settings.
- Added edge-triggered notifications for Scrap-for-Fertilizer max stock at safe-zone NPC vending machines.
- Added observed-peak tracking for fertilizer->scrap stock (`amountInStock`) with automatic re-arming after stock drops.
- Added a dedicated event image asset for `fertilizerScrapMaxStockSetting` (`fertilizer_scrap_max_stock_logo.png`).
- Updated the fertilizer max-stock notification setting to use the dedicated image.
- Added instance migration logic to update existing guild notification settings to the new image automatically.
- Bumped addon/package version to 1.2.29.

## v1.2.28 (2026-02-18)

### WebUI

- Added `Undo` and `Erase all` buttons to map annotation controls.
- Added undo support to remove the most recently saved annotation path.
- Improved annotation clear/toggle behavior to redraw immediately after changes.
- Bumped addon/package version to 1.2.28.

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
