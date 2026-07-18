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
import './map-tools.js';
import './raid-planner.js';

/* Module scripts are deferred, so the DOM may already be ready */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new RustPlusWebUI());
} else {
    new RustPlusWebUI();
}
