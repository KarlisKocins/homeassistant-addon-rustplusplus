/* Extracted from app.js - methods are verbatim; they are copied onto RustPlusWebUI.prototype below. */
import { RustPlusWebUI } from '../../app.js';

const Methods = class {
    async loadMapImage(guildId) {
        try {
            const response = await fetch(`${window.RPP_BASE}/api/map/${guildId}`);
            if (!response.ok) throw new Error(`Failed to fetch map: ${response.statusText}`);
            const blob = await response.blob();
            const img = new Image();
            img.onload = () => {
                this.mapImage = img;
                this.minimapBaseDirty = true;

                // Use handleResize to properly size canvases
                this.handleResize();

                // Enable high quality rendering on all contexts
                [this.backgroundCtx, this.staticCtx, this.dynamicCtx].forEach(ctx => {
                    if (ctx) {
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                    }
                });
                this.drawStaticLayers();
                this.resetView();
            };
            img.src = URL.createObjectURL(blob);
        } catch (error) {
            console.error('Failed to load map:', error);
        }
    }

    loadPlayerAvatar(steamId) {
        if (this.playerAvatars[steamId]) return;

        const img = new Image();

        // Use placeholder initially
        this.playerAvatars[steamId] = null;

        img.onload = () => {
            this.playerAvatars[steamId] = img;
            this.dirtyDynamic = true;
            this.needsRender = true;
        };

        img.onerror = () => {
            // If proxy fails, just use default circle (no fallback to prevent 404s)
            this.playerAvatars[steamId] = null;
        };

        // Use our server proxy - it handles the Steam CDN redirect properly
        img.src = `${window.RPP_BASE}/api/avatar/${steamId}`;
    }

    async loadPlayerColors(steamIds = null) {
        const ids = steamIds || this.serverData?.team?.players?.map(p => p.steamId);
        if (!ids?.length) return;

        const uniqueSteamIds = [...new Set(ids.filter(Boolean).map(String))];
        if (uniqueSteamIds.length === 0) return;

        const requestKey = uniqueSteamIds.slice().sort().join(',');
        if (requestKey === this.playerColorRequestKey) return;
        this.playerColorRequestKey = requestKey;

        try {
            const colors = await this.apiClient.get(`/api/statistics/colors?steamIds=${uniqueSteamIds.join(',')}`);
            this.playerColors = { ...this.playerColors, ...colors };
            this.dirtyDynamic = true;
            this.needsRender = true;
        } catch (error) {
            console.error('Failed to load player colors:', error);
        } finally {
            if (this.playerColorRequestKey === requestKey) {
                this.playerColorRequestKey = '';
            }
        }
    }

    getPlayerColor(steamId) {
        return this.playerColors[steamId] || '#00ff88';
    }

    setReplayMode(enabled, replayData = null) {
        if (enabled && replayData) {
            this.mapReplay.setReplayData(replayData);
        }
        this.mapReplay.enableReplayMode(enabled);
        this.dirtyDynamic = true;
        this.needsRender = true;
    }

    startReplay() {
        this.mapReplay.start();
    }

    pauseReplay() {
        this.mapReplay.pause();
    }

    stopReplay() {
        this.mapReplay.stop();
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(RustPlusWebUI.prototype, descriptors);
