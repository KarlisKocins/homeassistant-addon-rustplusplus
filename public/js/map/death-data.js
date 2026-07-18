/* Extracted from app.js - methods are verbatim; they are copied onto RustPlusWebUI.prototype below. */
import { RustPlusWebUI } from '../../app.js';

const Methods = class {
    cleanExpiredTeamDeaths() {
        if (!this.recentTeamDeaths?.length) return;

        const now = Date.now();
        const before = this.recentTeamDeaths.length;
        this.recentTeamDeaths = this.recentTeamDeaths.filter(d => d.expiresAt > now);

        if (this.recentTeamDeaths.length !== before) {
            console.log(`[WebUI] Cleaned ${before - this.recentTeamDeaths.length} expired team deaths`);
            this.dirtyDynamic = true;
            this.needsRender = true;
        }
    }

    startDeathMarkerAutoRefresh() {
        this.stopDeathMarkerAutoRefresh();
        this.deathMarkerRefreshInterval = setInterval(() => {
            if (this.controls.showDeathMarkers) {
                this.fetchDeathMarkers();
            }
        }, 60000); // Auto-refresh every 60 seconds
    }

    stopDeathMarkerAutoRefresh() {
        if (this.deathMarkerRefreshInterval) {
            clearInterval(this.deathMarkerRefreshInterval);
            this.deathMarkerRefreshInterval = null;
        }
    }

    async fetchDeathMarkers() {
        if (!this.currentGuildId) return;

        try {
            const hoursAgo = this.deathMarkersTimeRange;
            const startTime = Math.floor(Date.now() / 1000) - (hoursAgo * 3600);

            const response = await fetch(`${window.RPP_BASE}/api/statistics/deaths/${this.currentGuildId}?startTime=${startTime}&serverId=${this.serverData.serverId}`);
            if (response.ok) {
                const deaths = await response.json();

                this.deathMarkersData = deaths.map(death => ({
                    ...death,
                    fetchedAt: Date.now()
                }));

                console.log(`[WebUI] Loaded ${this.deathMarkersData.length} death markers (last ${hoursAgo}h, auto-refresh)`);
                this.dirtyDynamic = true;
                this.needsRender = true;
            } else {
                console.error('[WebUI] Failed to fetch death markers:', response.statusText);
                this.deathMarkersData = [];
            }
        } catch (error) {
            console.error('[WebUI] Error fetching death markers:', error);
            this.deathMarkersData = [];
        }
    }

    addPersistentPatrolMarker(type, x, y, location, timestamp = null) {
        const now = timestamp || Date.now();
        const marker = {
            type: type, // 'heli', 'cargo', 'chinook'
            x: x,
            y: y,
            location: location,
            timestamp: now,
            expiresAt: now + this.PATROL_MARKER_DURATION,
            isGridPosition: x === null || y === null
        };

        // Remove duplicate markers (by timestamp for grid positions, by location for world coords)
        if (marker.isGridPosition) {
            this.persistentPatrolMarkers = this.persistentPatrolMarkers.filter(m =>
                !(m.type === type && m.timestamp === now)
            );
        } else {
            this.persistentPatrolMarkers = this.persistentPatrolMarkers.filter(m =>
                !(m.type === type && Math.abs(m.x - x) < 10 && Math.abs(m.y - y) < 10)
            );
        }

        this.persistentPatrolMarkers.push(marker);
        this.savePersistentMarkers();
        console.log(`[WebUI] Added persistent ${type} death marker at ${location} (expires in 5min)`);
        this.dirtyDynamic = true;
        this.needsRender = true;
    }

    cleanExpiredPatrolMarkers() {
        const now = Date.now();
        const before = this.persistentPatrolMarkers.length;
        this.persistentPatrolMarkers = this.persistentPatrolMarkers.filter(m => m.expiresAt > now);
        if (this.persistentPatrolMarkers.length !== before) {
            this.savePersistentMarkers();
            this.dirtyDynamic = true;
            this.needsRender = true;
        }
    }

    savePersistentMarkers() {
        if (!this.currentGuildId) return;
        try {
            localStorage.setItem(`patrol_markers_${this.currentGuildId}`, JSON.stringify(this.persistentPatrolMarkers));
        } catch (e) {
            console.error('[WebUI] Failed to save persistent markers:', e);
        }
    }

    loadPersistentMarkers() {
        if (!this.currentGuildId) return;
        try {
            const stored = localStorage.getItem(`patrol_markers_${this.currentGuildId}`);
            if (stored) {
                this.persistentPatrolMarkers = JSON.parse(stored);
                this.cleanExpiredPatrolMarkers();
                console.log(`[WebUI] Loaded ${this.persistentPatrolMarkers.length} persistent patrol markers`);
            }
        } catch (e) {
            console.error('[WebUI] Failed to load persistent markers:', e);
            this.persistentPatrolMarkers = [];
        }
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(RustPlusWebUI.prototype, descriptors);
