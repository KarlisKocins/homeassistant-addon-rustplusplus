# Changelog

## v1.2.8 - 2026-02-12
### Fixed
- WebUI death tracking stuck at 0: player states were stored as mutable references causing alive→dead transitions to never be detected

## v1.2.6 - 2026-02-12
### Fixed
- Smart Switches UI: Dropdown options and messages were hardcoded in Spanish regardless of selected language
  - Auto-config dropdown (OFF, AUTO-DAY, AUTO-NIGHT, etc.) now respects locale
  - Delete confirmation, save validation, and error messages now use translation system
  - Added translation keys for all 3 supported languages (EN, ES, RU)

## v1.2.5
### Fixed
- WebUI death tracking not recording player deaths
- Chat messages not updating in the WebUI
