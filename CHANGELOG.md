# Changelog

## v1.2.10 (2026-02-12)

### Bug Fixes

- **Fixed bot message history memory leak** — `updateBotMessages` in `RustPlus.js` compared an array to a number, so the history was never trimmed and grew unbounded
- **Fixed duplicate PIN code methods** — `StatisticsTracker.js` had two `hasPinCode` and two `verifyPinCode` definitions; the first `verifyPinCode` called a nonexistent database method

### Code Quality

- Removed dead `handlePlayerDeath` method from `StatisticsTracker.js` (never called anywhere)
- Removed duplicate `COLOR_DEEP_SEA_EVENT` constant in `constants.js`
- Removed debug `console.log` statements from `DiscordBot.js` constructor
- Cleaned up verbose `console.log` calls in `StatisticsDatabase.js` (routine ops no longer log to stdout)
- Cached `node-fetch` dynamic import in `WebServer.js` (was re-importing on every avatar/BattleMetrics request)
- Added table name whitelist to `limitTableSize` in `StatisticsDatabase.js` for defense-in-depth
