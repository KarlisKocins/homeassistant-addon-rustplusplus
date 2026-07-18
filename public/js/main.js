/*
    WebUI module entry point.

    Import order matters only for side-effect modules:
    - map-tools.js augments RustPlusWebUI.prototype (must load before construction)
    - raid-planner.js self-instantiates window.raidPlanner

    All other modules are pulled in transitively by app.js. Window globals are
    assigned inside the RustPlusWebUI constructor (rustplusUI, switchesModal,
    trackersModal) and by raid-planner, so the many inline onclick handlers in
    index.html and HTML template strings keep working unchanged.
*/

import { RustPlusWebUI } from '../app.js';

/* Prototype mixins - each module copies its method group onto
   RustPlusWebUI.prototype and must load before construction */
import './map/coords.js';
import './map/renderer.js';
import './map/markers.js';
import './map/minimap.js';
import './map/view.js';
import './map/death-data.js';
import './core/socket.js';
import './core/events.js';
import './core/assets.js';
import './panels/guilds.js';
import './panels/ui.js';
import './map-tools.js';

/* Self-instantiating side-effect module */
import './raid-planner.js';

/* Module scripts are deferred, so the DOM may already be ready */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new RustPlusWebUI());
} else {
    new RustPlusWebUI();
}
