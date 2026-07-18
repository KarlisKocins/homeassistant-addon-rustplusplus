import { APIClient } from './js/api-client.js';
import { AuthManager } from './js/auth-manager.js';
import { LanguageManager } from './js/language_manager.js';
import { NotificationManager } from './js/notifications.js';
import { SwitchesModalManager } from './js/switches-modal.js';
import { TrackersModalManager } from './js/trackers-modal.js';
import { MapReplay } from './js/map-replay.js';
import { VendingManager } from './js/vending.js';
import { StatisticsManager } from './js/statistics.js';
import { EventPredictionManager } from './js/event-predictions.js';
import { AchievementManager } from './js/achievements.js';

export class RustPlusWebUI {
    constructor() {
        this.socket = null;
        this.currentGuildId = null;
        this.serverData = null;
        this.mapImage = null;

        // Initialize API client
        this.apiClient = new APIClient();

        // Initialize global authentication manager
        this.authManager = new AuthManager(this.apiClient);

        // Statistics manager
        this.statisticsManager = null;
        this.vendingManager = null;

        // Map replay system
        this.mapReplay = null;

        // Player colors (persistent across sessions)
        this.playerColors = {};
        this.playerColorRequestKey = '';

        // Initialize marker images
        this.markerImages = {
            shop: new Image(),
            shopIcon: new Image(),
            chinook: new Image(),
            heli: new Image(),
            cargo: new Image(),
            pinBg: new Image(),
            pinFg: new Image(),
            pinFgLeader: new Image()
        };
        this.markerImages.shop.src = window.RPP_BASE + '/images/markers/shop.png';
        this.markerImages.shopIcon.src = window.RPP_BASE + '/images/markers/shop_icon.png';
        this.markerImages.chinook.src = window.RPP_BASE + '/images/markers/chinook.png';
        this.markerImages.heli.src = window.RPP_BASE + '/images/markers/heli.png';
        this.markerImages.cargo.src = window.RPP_BASE + '/images/markers/cargo.png';
        this.markerImages.pinBg.src = window.RPP_BASE + '/images/markers/pin_bg.png';
        this.markerImages.pinFg.src = window.RPP_BASE + '/images/markers/pin_fg.png';
        this.markerImages.pinFgLeader.src = window.RPP_BASE + '/images/markers/pin_fg_leader.png';

        // Offscreen canvas reused for tinting the white pin background per player color
        this._pinTintCanvas = document.createElement('canvas');
        this._pinTintCtx = this._pinTintCanvas.getContext('2d');

        // Trail duration setting (in milliseconds) - default 10 minutes
        this.trailDuration = parseInt(localStorage.getItem('trailDuration')) || 600000;

        // Monument name mapping with emojis
        this.monumentNames = {
            // Base names
            'airfield': { name: 'Airfield', emoji: '✈️' },
            'arctic_base': { name: 'Arctic Research Base', emoji: '🏔️' },
            'arctic_base_a': { name: 'Arctic Research Base', emoji: '🏔️' },
            'bandit_camp': { name: 'Bandit Camp', emoji: '🏕️' },
            'dome': { name: 'The Dome', emoji: '⚛️' },
            'excavator': { name: 'Giant Excavator Pit', emoji: '⚒️' },
            'gas_station': { name: 'Gas Station', emoji: '⛽' },
            'harbor': { name: 'Harbor', emoji: '⚓' },
            'junkyard': { name: 'Junkyard', emoji: '🗑️' },
            'large_oil_rig': { name: 'Large Oil Rig', emoji: '🛢️' },
            'launch_site': { name: 'Launch Site', emoji: '🚀' },
            'launchsite': { name: 'Launch Site', emoji: '🚀' },
            'lighthouse': { name: 'Lighthouse', emoji: '🗼' },
            'military_tunnel': { name: 'Military Tunnels', emoji: '🎖️' },
            'military_tunnels': { name: 'Military Tunnels', emoji: '🎖️' },
            'missile_silo_monument': { name: 'Missile Silo', emoji: '🚀' },
            'mining_outpost': { name: 'Mining Outpost', emoji: '⛏️' },
            'mining_quarry': { name: 'Mining Quarry', emoji: '🪨' },
            'outpost': { name: 'Outpost', emoji: '🏪' },
            'power_plant': { name: 'Power Plant', emoji: '⚡' },
            'quarry': { name: 'Quarry', emoji: '🪨' },
            'ranch': { name: 'Ranch', emoji: '🐄' },
            'sewer_branch': { name: 'Sewer Branch', emoji: '🚰' },
            'sewer': { name: 'Sewer Branch', emoji: '🚰' },
            'small_oil_rig': { name: 'Small Oil Rig', emoji: '🛢️' },
            'oil_rig_small': { name: 'Small Oil Rig', emoji: '🛢️' },
            'supermarket': { name: 'Abandoned Supermarket', emoji: '🏬' },
            'abandoned_supermarket': { name: 'Abandoned Supermarket', emoji: '🏬' },
            'satellite': { name: 'Satellite Dish', emoji: '📡' },
            'satellite_dish': { name: 'Satellite Dish', emoji: '📡' },
            'train_tunnel': { name: 'Train Tunnel', emoji: '🚇' },
            'train_yard': { name: 'Train Yard', emoji: '🚂' },
            'trainyard': { name: 'Train Yard', emoji: '🚂' },
            'underwater_lab': { name: 'Underwater Lab', emoji: '🔬' },
            'water_treatment': { name: 'Water Treatment Plant', emoji: '💧' },
            'water_treatment_plant': { name: 'Water Treatment Plant', emoji: '💧' },
            'water_well': { name: 'Water Well', emoji: '🚰' },
            'fishing_village': { name: 'Fishing Village', emoji: '🎣' },
            'large_fishing_village': { name: 'Large Fishing Village', emoji: '🎣' },
            'stable': { name: 'Stable', emoji: '🐴' },
            'stables': { name: 'Stables', emoji: '🐴' },
            'stables_a': { name: 'Ranch', emoji: '🐄' },
            'stables_b': { name: 'Large Barn', emoji: '🏚️' },

            // Display name variants (with _display_name suffix)
            'airfield_display_name': { name: 'Airfield', emoji: '✈️' },
            'arctic_base_display_name': { name: 'Arctic Research Base', emoji: '🏔️' },
            'arctic_base_a_display_name': { name: 'Arctic Research Base', emoji: '🏔️' },
            'bandit_camp_display_name': { name: 'Bandit Camp', emoji: '🏕️' },
            'dome_display_name': { name: 'The Dome', emoji: '⚛️' },
            'dome_monument_name': { name: 'The Dome', emoji: '⚛️' },
            'excavator_display_name': { name: 'Giant Excavator Pit', emoji: '⚒️' },
            'gas_station_display_name': { name: 'Gas Station', emoji: '⛽' },
            'harbor_display_name': { name: 'Harbor', emoji: '⚓' },
            'harbor_1_display_name': { name: 'Harbor', emoji: '⚓' },
            'harbor_2_display_name': { name: 'Harbor', emoji: '⚓' },
            'junkyard_display_name': { name: 'Junkyard', emoji: '🗑️' },
            'large_oil_rig_display_name': { name: 'Large Oil Rig', emoji: '🛢️' },
            'launch_site_display_name': { name: 'Launch Site', emoji: '🚀' },
            'lighthouse_display_name': { name: 'Lighthouse', emoji: '🗼' },
            'military_tunnel_display_name': { name: 'Military Tunnels', emoji: '🎖️' },
            'military_tunnels_display_name': { name: 'Military Tunnels', emoji: '🎖️' },
            'missile_silo_monument_display_name': { name: 'Missile Silo', emoji: '🚀' },
            'mining_outpost_display_name': { name: 'Mining Outpost', emoji: '⛏️' },
            'mining_quarry_display_name': { name: 'Mining Quarry', emoji: '🪨' },
            'outpost_display_name': { name: 'Outpost', emoji: '🏪' },
            'power_plant_display_name': { name: 'Power Plant', emoji: '⚡' },
            'quarry_display_name': { name: 'Quarry', emoji: '🪨' },
            'ranch_display_name': { name: 'Ranch', emoji: '🐄' },
            'sewer_branch_display_name': { name: 'Sewer Branch', emoji: '🚰' },
            'sewer_display_name': { name: 'Sewer Branch', emoji: '🚰' },
            'small_oil_rig_display_name': { name: 'Small Oil Rig', emoji: '🛢️' },
            'oil_rig_small_display_name': { name: 'Small Oil Rig', emoji: '🛢️' },
            'supermarket_display_name': { name: 'Abandoned Supermarket', emoji: '🏬' },
            'abandoned_supermarket_display_name': { name: 'Abandoned Supermarket', emoji: '🏬' },
            'satellite_display_name': { name: 'Satellite Dish', emoji: '📡' },
            'satellite_dish_display_name': { name: 'Satellite Dish', emoji: '📡' },
            'train_tunnel_display_name': { name: 'Train Tunnel', emoji: '🚇' },
            'train_tunnel_link_display_name': { name: 'Train Tunnel', emoji: '🚇' },
            'train_yard_display_name': { name: 'Train Yard', emoji: '🚂' },
            'trainyard_display_name': { name: 'Train Yard', emoji: '🚂' },
            'underwater_lab_display_name': { name: 'Underwater Lab', emoji: '🔬' },
            'water_treatment_display_name': { name: 'Water Treatment Plant', emoji: '💧' },
            'water_treatment_plant_display_name': { name: 'Water Treatment Plant', emoji: '💧' },
            'water_well_display_name': { name: 'Water Well', emoji: '🚰' },
            'fishing_village_display_name': { name: 'Fishing Village', emoji: '🎣' },
            'large_fishing_village_display_name': { name: 'Large Fishing Village', emoji: '🎣' },
            'stable_display_name': { name: 'Stable', emoji: '🐴' },
            'stables_display_name': { name: 'Stables', emoji: '🐴' },
            'oxums_gas_station_display_name': { name: 'Oxum\'s Gas Station', emoji: '⛽' },
            'mining_quarry_a_display_name': { name: 'Mining Quarry', emoji: '🪨' },
            'mining_quarry_b_display_name': { name: 'Mining Quarry', emoji: '🪨' },
            'mining_quarry_c_display_name': { name: 'Mining Quarry', emoji: '🪨' },
            'mining_quarry_sulfur_display_name': { name: 'Sulfur Quarry', emoji: '🪨' },
            'mining_quarry_stone_display_name': { name: 'Stone Quarry', emoji: '🪨' },
            'mining_quarry_hqm_display_name': { name: 'HQM Quarry', emoji: '🪨' }
        };

        // Canvas layers
        this.backgroundCanvas = null;
        this.backgroundCtx = null;
        this.staticCanvas = null;
        this.staticCtx = null;
        this.dynamicCanvas = null;
        this.dynamicCtx = null;

        this.worldRect = null;

        // Pan and zoom state
        this.baseScale = 1;
        this.scale = 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.lastX = 0;
        this.lastY = 0;

        // Chat messages
        this.chatMessages = [];

        // Control states
        this.controls = {
            showPlayers: true,
            showPlayerNames: true,
            showTrails: true,
            showMonuments: true,
            showGrid: true,
            showMarkers: false,
            showVendingMachines: false,
            showEvents: false,
            showDeathMarkers: false,
            showHeatmap: false
        };

        // Annotation state
        this.isAnnotating = false;
        this.annotations = JSON.parse(localStorage.getItem('rustplus-annotations') || '[]');
        this.currentAnnotation = null;

        // Death markers data
        this.deathMarkersData = [];
        this.deathMarkersTimeRange = 24; // hours

        // Recent team deaths (always shown for 5 minutes, separate from death markers option)
        this.recentTeamDeaths = [];
        this.TEAM_DEATH_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

        // Persistent patrol markers (5-minute expiry)
        this.persistentPatrolMarkers = [];
        this.PATROL_MARKER_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

        this.playerTrails = {};
        this.playerTrailStartTime = {}; // Track when player trails should start recording
        this.TRAIL_DELAY = 5000; // Wait 5 seconds before recording trails for new players
        this.needsRender = true;
        this.lastRenderTime = 0;
        this.dirtyStatic = true;
        this.dirtyDynamic = true;

        // Minimap properties
        this.minimapCanvas = null;
        this.minimapCtx = null;
        this.followedPlayerId = null;
        this.minimapSize = 300;
        this.minimapZoom = 10.0;
        this.minimapZoomMin = 0.2;
        this.minimapZoomMax = 16.0;
        this.minimapPanX = 0;
        this.minimapPanY = 0;
        this.minimapBaseCanvas = null;
        this.minimapBaseCtx = null;
        this.minimapBaseDirty = true;

        // Player avatars cache
        this.playerAvatars = {};
        this.loadAvatars = true;
        this.showMinimapGrid = true;
        this.showMinimapPlayerNames = true;

        // Language Manager
        this.languageManager = new LanguageManager();

        // Notification Manager
        this.notificationManager = new NotificationManager();
        this.switchesManager = new SwitchesModalManager(this);
        this.trackersManager = new TrackersModalManager(this);

        // Event Prediction & Achievement managers
        this.eventPredictions = new EventPredictionManager(this.apiClient);
        this.achievementManager = new AchievementManager(this.apiClient);

        // Expose to global scope for onclick handlers in HTML templates
        window.switchesModal = this.switchesManager;
        window.trackersModal = this.trackersManager;

        this.setupPlayerListModal(); // Initialize player list modal listeners

        // Setup custom confirm modal listeners
        this.setupConfirmModal();

        // Load persistend controls settings
        this.loadPersistentControls();

        this.init();
    }


    loadPersistentControls() {
        const savedControls = localStorage.getItem('rpp_controls');
        if (savedControls) {
            try {
                const parsed = JSON.parse(savedControls);
                // Merge saved controls with current ones to ensure we don't lose new keys
                this.controls = { ...this.controls, ...parsed };
            } catch (e) {
                console.error('Failed to load persistent controls', e);
            }
        }
    }

    savePersistentControls() {
        localStorage.setItem('rpp_controls', JSON.stringify(this.controls));
    }



    init() {
        this.backgroundCanvas = document.getElementById('map-background-canvas');
        this.backgroundCtx = this.backgroundCanvas.getContext('2d');
        this.staticCanvas = document.getElementById('map-static-canvas');
        this.staticCtx = this.staticCanvas.getContext('2d');
        this.dynamicCanvas = document.getElementById('map-dynamic-canvas');
        this.dynamicCtx = this.dynamicCanvas.getContext('2d');

        this.setupMinimap();
        this.setupSocketConnection();
        this.setupEventListeners();
        this.loadGuilds();
        this.startRenderLoop();

        // Initialize map replay system
        this.mapReplay = new MapReplay(this);

        // Initialize vending manager
        this.vendingManager = new VendingManager(this);

        // Setup statistics button (will be enabled when server is selected)
        this.setupStatisticsButton();

        // Shop hover cards on the map (mixin: js/map/shop-hover.js)
        this.setupShopHover();

        // Make globally accessible for statistics panel
        window.rustplusUI = this;

        // Add window resize listener
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/*
    RustPlusWebUI is a thin class shell: state lives in the constructor and
    behavior is contributed by prototype-mixin modules (see js/main.js):

    js/map/      coords, renderer, markers, minimap, view, death-data
    js/core/     socket, events, assets
    js/panels/   guilds, ui
    js/map-tools chat, annotations, heatmap, coordinate tooltip

    Construction happens in js/main.js (module entry point).
*/
