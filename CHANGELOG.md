# Changelog

## v1.2.11 (2026-02-16)

### Bug Fixes

- Fixed Spanish fallback text in confirmation modal
- Removed Rad Zones dead code from sidebar and app logic
- Death markers now auto-refresh every 60 seconds

### New Features

- **Toast notifications** — Visual feedback for all user actions (switch toggles, tracker edits, settings saves)
- **Keyboard shortcuts** — `Esc` (close modal), `F` (fullscreen), `G` (grid), `M` (monuments), `T` (theme), `A` (annotate)
- **Loading states** — Skeleton screens and loading overlays for async content
- **Dark/Light theme toggle** — 🌙/☀️ button with `localStorage` persistence
- **Mobile responsive design** — Hamburger menu, sidebar drawer, full-screen modals at 768px/1024px breakpoints
- **Team chat sidebar tab** — Real-time messaging via Socket.IO
- **Event timeline** — Icon-based timeline cards with relative timestamps
- **Distance measuring tool** — Click two map points to measure world-distance in meters
- **Map coordinate tooltip** — Hover shows world coordinates + grid reference (e.g. `E15`)
- **Zoom to player** — Click team member name to pan/zoom map to their position
- **Notification sounds** — Web Audio API beep on events, toggleable via settings
- **Export statistics to CSV** — Players, Sessions, Deaths, and Chat tables
- **Player session alerts** — Toast + sound when team members come online/offline
- **Map heatmap overlay** — Death density visualization using radial gradients, toggled via sidebar checkbox
- **Map annotations** — Freehand drawing tool (✏️ button or `A` key), persisted to `localStorage`

### Code Quality

- Extracted inline styles from `index.html` death markers config to CSS classes
- Split `app.js` — Extracted 18 methods (~313 lines) into `js/map-tools.js` module (coordinates, measuring, chat, heatmap, annotations)
