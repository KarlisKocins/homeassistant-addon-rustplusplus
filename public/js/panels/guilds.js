/* Extracted from app.js - methods are verbatim; they are copied onto RustPlusWebUI.prototype below. */
import { RustPlusWebUI } from '../../app.js';
import { StatisticsManager } from '../statistics.js';

const Methods = class {
    async loadGuilds(silent = false) {
        try {
            const response = await fetch(window.RPP_BASE + '/api/guilds');
            const guilds = await response.json();
            const select = document.getElementById('serverSelect');

            const previousGuildId = this.currentGuildId;

            select.innerHTML = '<option value="">Select a server...</option>';
            guilds.forEach(g => select.add(new Option(`${g.guildName} - ${g.serverName}`, g.guildId)));

            if (guilds.length > 0) {
                const stillExists = guilds.some(g => g.guildId === previousGuildId);

                if (previousGuildId && stillExists) {
                    select.value = previousGuildId;
                    // We don't call selectServer here if it's a simple list refresh,
                    // but we DO if it's the initial connect (handled in connect handler)
                } else if (!silent) {
                    select.value = guilds[0].guildId;
                    this.selectServer(guilds[0].guildId);
                }
            } else {
                select.innerHTML = '<option value="">No active servers</option>';
            }
        } catch (error) {
            console.error('Failed to load guilds:', error);
        }
    }

    async selectServer(guildId) {
        if (this.currentGuildId) this.socket.emit('unsubscribe', this.currentGuildId);
        this.currentGuildId = guildId;
        if (!guildId) {
            this.serverData = null;
            // Disable statistics button
            const statsBtn = document.getElementById('statsButton');
            if (statsBtn) statsBtn.disabled = true;
            return;
        }

        // Check authentication BEFORE subscribing or showing anything
        const isAuthenticated = await this.authManager.ensureAuthenticated(guildId);

        if (!isAuthenticated) {
            // User closed PIN modal or authentication failed
            // Reset to no server selected
            const select = document.getElementById('serverSelect');
            select.value = '';
            this.currentGuildId = null;
            this.serverData = null;
            return;
        }

        // Only proceed if authenticated
        this.socket.emit('subscribe', guildId);
        this.loadMapImage(guildId);

        // Initialize statistics manager for this guild
        const serverId = this.serverData?.serverId || null;
        if (this.statisticsManager) {
            this.statisticsManager.guildId = guildId;
            this.statisticsManager.serverId = serverId;
            this.statisticsManager.authManager = this.authManager; // Share auth manager
        } else {
            this.statisticsManager = new StatisticsManager(this.apiClient, guildId, serverId);
            this.statisticsManager.authManager = this.authManager; // Share auth manager
            this.statisticsManager.init();
        }

        // Enable statistics button immediately
        const statsBtn = document.getElementById('statsButton');
        if (statsBtn) {
            statsBtn.disabled = false;
            statsBtn.style.display = 'flex';
        }

        // Load player colors
        this.loadPlayerColors();

        // Load persistent patrol markers
        this.loadPersistentMarkers();

        // Start cleanup interval if not already running
        if (!this.patrolMarkerCleanupInterval) {
            this.patrolMarkerCleanupInterval = setInterval(() => {
                this.cleanExpiredPatrolMarkers();
                this.cleanExpiredTeamDeaths();
            }, 30000); // Check every 30 seconds
        }
    }

    setupStatisticsButton() {
        // Setup existing statistics button
        const statsButton = document.getElementById('statsButton');
        if (!statsButton) return;

        statsButton.onclick = async () => {
            if (this.statisticsManager) {
                // Check authentication BEFORE opening panel
                await this.statisticsManager.checkAuthenticationBeforeOpen();
            }
        };
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(RustPlusWebUI.prototype, descriptors);
