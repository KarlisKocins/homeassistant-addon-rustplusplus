/* Extracted from app.js - methods are verbatim; they are copied onto RustPlusWebUI.prototype below. */
import { RustPlusWebUI } from '../../app.js';

const Methods = class {
    setupSocketConnection() {
        /* Path-aware for HA ingress: socket.io must connect under the prefix */
        this.socket = io({ path: (window.RPP_BASE || '') + '/socket.io' });

        this.socket.on('connect', () => {
            this.updateConnectionStatus(true);
            // Refresh list and restore subscription if we had a server selected
            this.loadGuilds(true).then(() => {
                if (this.currentGuildId) {
                    this.selectServer(this.currentGuildId);
                }
            });

            // Enable statistics button if we have a guild selected (autoconnect)
            if (this.currentGuildId) {
                const statsBtn = document.getElementById('statsButton');
                if (statsBtn) {
                    statsBtn.disabled = false;
                    statsBtn.style.display = 'flex';
                }
            }
        });
        this.socket.on('disconnect', () => this.updateConnectionStatus(false));

        /* Websocket rejected by server auth: session missing/expired */
        this.socket.on('connect_error', (err) => {
            if (err && /authentication required/i.test(err.message || '')) {
                window.location.href = 'login.html';
            }
        });

        this.socket.on('guildsUpdate', () => {
            this.loadGuilds(true);
        });

        this.socket.on('serverUpdate', (data) => {
            const firstUpdate = !this.serverData;
            // Player session alerts — detect online/offline changes
            if (!firstUpdate && this.serverData?.team?.players && data?.team?.players) {
                const oldPlayers = new Map(this.serverData.team.players.map(p => [p.steamId, p]));
                for (const np of data.team.players) {
                    const op = oldPlayers.get(np.steamId);
                    if (!op) continue;
                    if (!op.isOnline && np.isOnline) {
                        this.showToast(`🟢 ${np.name || np.steamId} came online`, 'success', 4000);
                        if (this.notificationManager?.soundEnabled) this.notificationManager.playNotificationSound();
                    } else if (op.isOnline && !np.isOnline) {
                        this.showToast(`🔴 ${np.name || np.steamId} went offline`, 'info', 4000);
                    }
                }
            }
            this.serverData = data;

            // Update serverId in statistics manager and enable stats button once we have server data
            if (this.statisticsManager && data.serverId) {
                this.statisticsManager.serverId = data.serverId;
                // Enable statistics button if not already enabled
                const statsBtn = document.getElementById('statsButton');
                if (statsBtn && statsBtn.disabled) {
                    statsBtn.disabled = false;
                    statsBtn.style.display = 'flex';
                }
            }

            if ((firstUpdate || !this.worldRect) && this.mapImage && this.serverData.info) {
                this.worldRect = this.computeWorldRectFromWorldSize(
                    this.mapImage.width,
                    this.mapImage.height,
                    this.serverData.info.mapSize
                );
                this.dirtyStatic = true;
            }

            // Track patrol helicopter DEATH location (explosion when taken down)
            if (data.mapMarkers?.patrolHelicopterDestroyedLocation && data.mapMarkers?.timeSincePatrolHelicopterWasDestroyed) {
                const deathTime = new Date(data.mapMarkers.timeSincePatrolHelicopterWasDestroyed).getTime();
                const exists = this.persistentPatrolMarkers.some(m =>
                    m.type === 'heli' && m.timestamp === deathTime
                );

                if (!exists) {
                    const gridPos = data.mapMarkers.patrolHelicopterDestroyedLocation;
                    // Convert grid position to world coordinates
                    // Grid positions are like "K15", we need to estimate the center
                    // For now, just use the location string
                    this.addPersistentPatrolMarker('heli', null, null, gridPos.location || gridPos, deathTime);
                }
            }

            this.updateUI();

            // Update switches modal if open
            if (this.switchesManager && this.switchesManager.modal && this.switchesManager.modal.classList.contains('open')) {
                this.switchesManager.fetchAndRender();
            }

            // Update trackers modal if open
            if (this.trackersManager && this.trackersManager.modal && this.trackersManager.modal.classList.contains('open')) {
                this.trackersManager.fetchAndRender();
            }

            // Keep vending/shop modals in sync while they are open.
            if (this.vendingManager) {
                if (this.vendingManager.modal && this.vendingManager.modal.classList.contains('open')) {
                    this.vendingManager.renderList();
                }
                if (this.vendingManager.instaProfitModal && this.vendingManager.instaProfitModal.classList.contains('open')) {
                    this.vendingManager.renderInstaProfitRoutes();
                }
            }

            this.updateLastUpdateTime();

            // Load player avatars and update trails
            if (data.team?.players) {
                const steamIds = data.team.players
                    .map(p => p.steamId)
                    .filter(Boolean)
                    .map(String);

                const hasMissingColors = steamIds.some(steamId => !this.playerColors[steamId]);
                if (steamIds.length > 0 && (firstUpdate || hasMissingColors)) {
                    this.loadPlayerColors(steamIds);
                }

                data.team.players.forEach(p => {
                    this.loadPlayerAvatar(p.steamId);

                    // Add to player trails
                    if (p.isOnline && p.isAlive) {
                        // Validate player position (not at 0,0 and not undefined)
                        if (!p.x || !p.y || (p.x === 0 && p.y === 0)) {
                            // Skip invalid positions
                            return;
                        }

                        // Initialize trail start time for new players
                        if (!this.playerTrailStartTime[p.steamId]) {
                            this.playerTrailStartTime[p.steamId] = Date.now();
                            return; // Don't add trail yet
                        }

                        // Wait 5 seconds before starting to record trails
                        if (Date.now() - this.playerTrailStartTime[p.steamId] < this.TRAIL_DELAY) {
                            return; // Still in delay period
                        }

                        if (!this.playerTrails[p.steamId]) {
                            this.playerTrails[p.steamId] = [];
                        }

                        const pos = this.worldToCanvas(p.x, p.y);
                        if (pos) {
                            const trails = this.playerTrails[p.steamId];
                            const lastTrail = trails[trails.length - 1];

                            // Only add if moved significantly (reduce trail point density)
                            if (!lastTrail ||
                                Math.abs(lastTrail.x - pos.x) > 5 ||
                                Math.abs(lastTrail.y - pos.y) > 5) {
                                trails.push({ x: pos.x, y: pos.y, time: Date.now() });

                                // Keep only last 100 points
                                if (trails.length > 100) {
                                    trails.shift();
                                }
                            }
                        }
                    }
                });
            }

            /* Prune trails once per update (render loop just strokes them);
               drop empty entries so departed players do not linger */
            const trailCutoff = Date.now() - this.trailDuration;
            for (const sid of Object.keys(this.playerTrails)) {
                const t = this.playerTrails[sid];
                while (t.length && t[0].time < trailCutoff) t.shift();
                if (t.length === 0) delete this.playerTrails[sid];
            }

            this.dirtyDynamic = true;
            this.needsRender = true;
        });

        this.socket.on('resetPlayerTrail', (data) => {
            if (data.steamId && this.playerTrails[data.steamId]) {
                console.log(`[WebUI] Resetting trail for player ${data.steamId}`);
                this.playerTrails[data.steamId] = [];
                // Reset the trail start time so they wait 5 seconds again
                delete this.playerTrailStartTime[data.steamId];
                this.dirtyDynamic = true;
                this.needsRender = true;
            }
        });

        this.socket.on('teamDeath', (data) => {
            if (data.x && data.y && data.player_name) {
                const now = Date.now();
                this.recentTeamDeaths.push({
                    x: data.x,
                    y: data.y,
                    player_name: data.player_name,
                    steam_id: data.steam_id,
                    timestamp: now,
                    expiresAt: now + this.TEAM_DEATH_DURATION
                });
                console.log(`[WebUI] Team death recorded: ${data.player_name} at (${data.x}, ${data.y})`);

                // Add notification
                if (this.notificationManager) {
                    this.notificationManager.addNotification('death', `💀 ${data.player_name} died`);
                }

                this.dirtyDynamic = true;
                this.needsRender = true;
            }
        });

        // Listen for chat messages (single handler: map chat + statistics feed)
        this.socket.on('chatMessage', (data) => {
            this.addChatMessage(data);
            if (this.statisticsManager) {
                this.statisticsManager.handleNewChatMessage(data);
            }
        });

        // Listen for generic events if the server emits them (adding support for future)
        this.socket.on('notification', (data) => {
            if (this.notificationManager && data.type && data.message) {
                this.notificationManager.addNotification(data.type, data.message);
            }
        });
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(RustPlusWebUI.prototype, descriptors);
