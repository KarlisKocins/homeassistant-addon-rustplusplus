/* Extracted from app.js - methods are verbatim; they are copied onto RustPlusWebUI.prototype below. */
import { RustPlusWebUI } from '../../app.js';

const Methods = class {
    setupMinimap() {
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        this.minimapCanvas.width = this.minimapSize;
        this.minimapCanvas.height = this.minimapSize;
        this.minimapBaseCanvas = document.createElement('canvas');
        this.minimapBaseCtx = this.minimapBaseCanvas.getContext('2d');

        this.minimapCanvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.minimapZoom *= zoomFactor;
            this.minimapZoom = Math.max(this.minimapZoomMin, Math.min(this.minimapZoomMax, this.minimapZoom));
            this.dirtyDynamic = true;
            this.needsRender = true;
        });

        let isPanning = false;
        let panStartX = 0, panStartY = 0;
        let panStartPanX = 0, panStartPanY = 0;

        this.minimapCanvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                isPanning = true;
                panStartX = e.clientX;
                panStartY = e.clientY;
                panStartPanX = this.minimapPanX;
                panStartPanY = this.minimapPanY;
                e.preventDefault();
            }
        });

        this.minimapCanvas.addEventListener('mousemove', (e) => {
            if (isPanning) {
                const dx = e.clientX - panStartX;
                const dy = e.clientY - panStartY;
                this.minimapPanX = panStartPanX + dx;
                this.minimapPanY = panStartPanY + dy;
                this.dirtyDynamic = true;
                this.needsRender = true;
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (e.button === 2) isPanning = false;
        });

        this.minimapCanvas.addEventListener('mouseleave', () => { isPanning = false; });

        this.minimapCanvas.addEventListener('dblclick', (e) => {
            if (e.button === 2) {
                this.minimapZoom = 1.0;
                this.minimapPanX = 0;
                this.minimapPanY = 0;
                this.dirtyDynamic = true;
                this.needsRender = true;
                e.preventDefault();
            }
        });

        this.minimapCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    renderMinimap() {
        if (!this.minimapCtx || !this.serverData) return;

        const ctx = this.minimapCtx;
        const size = this.minimapSize;
        ctx.clearRect(0, 0, size, size);

        const centerPlayer = this.serverData.team?.players.find(p => p.steamId === this.followedPlayerId && p.isOnline) || this.serverData.team?.players.find(p => p.isOnline);

        if (!centerPlayer || !this.worldRect || !this.mapImage || !this.minimapBaseCanvas) {
            // Fallback if no player or map
            if (this.mapImage) ctx.drawImage(this.mapImage, 0, 0, size, size);
            return;
        }

        if (this.minimapBaseDirty) {
            this.minimapBaseCanvas.width = this.mapImage.width;
            this.minimapBaseCanvas.height = this.mapImage.height;
            this.minimapBaseCtx.clearRect(0, 0, this.mapImage.width, this.mapImage.height);
            this.minimapBaseCtx.drawImage(this.mapImage, 0, 0);

            const prevScale = this.scale;
            this.scale = 1;
            this.minimapBaseCtx.save();
            this.drawGrid(this.minimapBaseCtx);
            this.drawMonuments(this.minimapBaseCtx);
            this.minimapBaseCtx.restore();
            this.scale = prevScale;

            this.minimapBaseDirty = false;
        }

        // Get player position in world coordinates and convert to canvas coordinates
        // accounting for the canvas transforms (scale and offset)
        const { x: playerX, y: playerY } = this.worldToCanvas(centerPlayer.x, centerPlayer.y);

        // Now apply the canvas transform to get the actual pixel position on the transformed canvas
        const viewSize = (this.minimapBaseCanvas.width / this.minimapZoom);
        const centerX = playerX - this.minimapPanX;
        const centerY = playerY - this.minimapPanY;

        const desiredSx = centerX - viewSize / 2;
        const desiredSy = centerY - viewSize / 2;
        const maxSx = Math.max(0, this.minimapBaseCanvas.width - viewSize);
        const maxSy = Math.max(0, this.minimapBaseCanvas.height - viewSize);
        const sx = Math.max(0, Math.min(maxSx, desiredSx));
        const sy = Math.max(0, Math.min(maxSy, desiredSy));

        const miniScale = size / viewSize;
        const dx = (sx - desiredSx) * miniScale;
        const dy = (sy - desiredSy) * miniScale;

        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(this.minimapBaseCanvas, sx, sy, viewSize, viewSize, dx, dy, size, size);

        if (dx > 0) {
            ctx.drawImage(this.minimapBaseCanvas, sx, sy, 1, viewSize, 0, dy, dx, size);
        } else if (dx < 0) {
            ctx.drawImage(this.minimapBaseCanvas, sx + viewSize - 1, sy, 1, viewSize, size + dx, dy, -dx, size);
        }

        if (dy > 0) {
            ctx.drawImage(this.minimapBaseCanvas, sx, sy, viewSize, 1, dx, 0, size, dy);
        } else if (dy < 0) {
            ctx.drawImage(this.minimapBaseCanvas, sx, sy + viewSize - 1, viewSize, 1, dx, size + dy, size, -dy);
        }

        const leaderId = this.serverData.team?.leaderSteamId;

        this.serverData.team?.players.forEach(p => {
            if (!p.isOnline) return;
            const { x: px, y: py } = this.worldToCanvas(p.x, p.y);

            // Apply the same transform as for center player
            const mx = (px - desiredSx) * miniScale;
            const my = (py - desiredSy) * miniScale;

            if (mx >= 0 && mx <= size && my >= 0 && my <= size) {
                const isCenter = p.steamId === centerPlayer.steamId;
                const markerSize = 10;
                const avatar = this.playerAvatars[p.steamId];
                const playerColor = this.getPlayerColor(p.steamId);

                // Draw avatar if loaded
                if (avatar) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(mx, my, markerSize, 0, Math.PI * 2);
                    ctx.clip();
                    ctx.drawImage(avatar, mx - markerSize, my - markerSize, markerSize * 2, markerSize * 2);
                    ctx.restore();

                    // Draw colored border with player's unique color (dimmed if dead)
                    ctx.strokeStyle = p.isAlive ? playerColor : `${playerColor}80`;
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(mx, my, markerSize, 0, Math.PI * 2);
                    ctx.stroke();
                } else {
                    // Fallback to colored circles using player's unique color
                    ctx.fillStyle = p.isAlive ? playerColor : `${playerColor}80`;
                    ctx.strokeStyle = 'white';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(mx, my, markerSize, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }

                // Leader badge, same proportions as the main map marker
                if (leaderId && p.steamId === leaderId) {
                    const badgeR = markerSize * 0.34;
                    const offset = markerSize * 0.72;
                    ctx.beginPath();
                    ctx.arc(mx + offset, my - offset, badgeR, 0, Math.PI * 2);
                    ctx.fillStyle = '#4cc38a';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }

                if (this.showMinimapPlayerNames && this.minimapZoom > 0.8) {
                    ctx.fillStyle = 'white';
                    ctx.font = `bold ${isCenter ? 12 : 10}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.strokeStyle = 'black';
                    ctx.lineWidth = 2;
                    ctx.strokeText(p.name, mx, my - markerSize - 3);
                    ctx.fillText(p.name, mx, my - markerSize - 3);
                }
            }
        });

        // Draw recent team deaths on minimap (always shown for 5 minutes)
        if (this.recentTeamDeaths?.length > 0 && !this.mapReplay?.isReplayMode) {
            const now = Date.now();

            this.recentTeamDeaths.forEach(death => {
                if (!death.x || !death.y) return;
                if (death.expiresAt <= now) return; // Skip expired

                const { x: dx, y: dy } = this.worldToCanvas(death.x, death.y);

                // Apply the same transform
                const dmx = (dx - desiredSx) * miniScale;
                const dmy = (dy - desiredSy) * miniScale;

                // Only draw if in view
                if (dmx >= 0 && dmx <= size && dmy >= 0 && dmy <= size) {
                    // Draw circle background
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
                    ctx.strokeStyle = '#ff0000';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(dmx, dmy, 10, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // Draw death skull (brighter red for recent deaths)
                    ctx.fillStyle = '#ff0000';
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 2;
                    ctx.font = 'bold 14px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.strokeText('💀', dmx, dmy);
                    ctx.fillText('💀', dmx, dmy);
                }
            });
        }

        // Draw historical death markers on minimap if enabled
        if (this.controls.showDeathMarkers && this.deathMarkersData?.length > 0 && !this.mapReplay?.isReplayMode) {
            const now = Date.now();

            this.deathMarkersData.forEach(death => {
                if (!death.x || !death.y) return;
                if (death.expiresAt && death.expiresAt <= now) return; // Skip expired

                const { x: dx, y: dy } = this.worldToCanvas(death.x, death.y);

                // Apply the same transform
                const dmx = (dx - desiredSx) * miniScale;
                const dmy = (dy - desiredSy) * miniScale;

                // Only draw if in view
                if (dmx >= 0 && dmx <= size && dmy >= 0 && dmy <= size) {
                    // Draw circle background
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
                    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.arc(dmx, dmy, 9, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    // Draw death skull (slightly transparent for historical deaths)
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1.5;
                    ctx.font = 'bold 12px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.strokeText('💀', dmx, dmy);
                    ctx.fillText('💀', dmx, dmy);
                }
            });
        }

        this.drawMinimapCrosshair(ctx, size);
        this.drawMinimapStatusBar(ctx, size);
    }

    drawMinimapCrosshair(ctx, size) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(size / 2 - 10, size / 2);
        ctx.lineTo(size / 2 + 10, size / 2);
        ctx.moveTo(size / 2, size / 2 - 10);
        ctx.lineTo(size / 2, size / 2 + 10);
        ctx.stroke();
    }

    drawMinimapStatusBar(ctx, size) {
        const info = this.serverData.info;
        const time = this.serverData.time;
        const markers = this.serverData.mapMarkers;
        if (!info || !time) return;

        // Single line status bar
        const barHeight = 18;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, size - barHeight, size, barHeight);

        ctx.font = '9px Arial';
        ctx.textAlign = 'left';

        let x = 5;
        const y = size - 6;

        // Player count
        ctx.fillStyle = '#ffffff';
        let text = `👥 ${info.players}/${info.maxPlayers}`;
        if (info.queuedPlayers > 0) text += ` (${info.queuedPlayers})`;
        ctx.fillText(text, x, y);
        x += ctx.measureText(text).width;

        // Time
        const gameTime = this.formatGameTime(time.time);
        const timeIcon = time.isDay ? '☀️' : '🌙';
        ctx.fillStyle = '#888';
        ctx.fillText(' | ', x, y);
        x += ctx.measureText(' | ').width;
        ctx.fillStyle = '#ffffff';
        text = `${timeIcon} ${gameTime}`;
        ctx.fillText(text, x, y);
        x += ctx.measureText(text).width;

        // Events
        if (markers?.patrolHelicopters?.length > 0) {
            markers.patrolHelicopters.forEach(heli => {
                const grid = this.worldToGrid(heli.x, heli.y);
                ctx.fillStyle = '#888';
                ctx.fillText(' | ', x, y);
                x += ctx.measureText(' | ').width;
                ctx.fillStyle = '#ff4444';
                text = `🚁 ${grid}`;
                ctx.fillText(text, x, y);
                x += ctx.measureText(text).width;
            });
        }

        if (markers?.cargoShips?.length > 0) {
            markers.cargoShips.forEach(cargo => {
                const grid = this.worldToGrid(cargo.x, cargo.y);
                ctx.fillStyle = '#888';
                ctx.fillText(' | ', x, y);
                x += ctx.measureText(' | ').width;
                ctx.fillStyle = '#ffd700';
                text = `🚢 ${grid}`;
                ctx.fillText(text, x, y);
                x += ctx.measureText(text).width;
            });
        }

        if (markers?.ch47s?.length > 0) {
            markers.ch47s.forEach(ch47 => {
                const grid = this.worldToGrid(ch47.x, ch47.y);
                ctx.fillStyle = '#888';
                ctx.fillText(' | ', x, y);
                x += ctx.measureText(' | ').width;
                ctx.fillStyle = '#9c27b0';
                text = `🚁CH47 ${grid}`;
                ctx.fillText(text, x, y);
                x += ctx.measureText(text).width;
            });
        }

        const patrolDeath = this.persistentPatrolMarkers?.find(m => m.type === 'heli' && m.expiresAt > Date.now());
        if (patrolDeath) {
            const timeLeft = Math.ceil((patrolDeath.expiresAt - Date.now()) / 60000);
            ctx.fillStyle = '#888';
            ctx.fillText(' | ', x, y);
            x += ctx.measureText(' | ').width;
            ctx.fillStyle = '#ff6644';
            text = `💥 ${patrolDeath.location} ${timeLeft}m`;
            ctx.fillText(text, x, y);
            x += ctx.measureText(text).width;
        }
    }

    async enterPictureInPicture() {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else {
                const video = document.createElement('video');
                video.muted = true;
                video.srcObject = this.minimapCanvas.captureStream();
                video.style.width = '100%';
                video.style.height = '100%';
                await video.play();

                // Request PiP with smaller minimum size
                const pipWindow = await video.requestPictureInPicture();

                // Try to resize to a smaller size if supported
                if (pipWindow.width && pipWindow.height) {
                    try {
                        // Some browsers support resizing PiP window
                        pipWindow.resize(200, 200);
                    } catch (e) {
                        // Resize not supported in this browser
                    }
                }
            }
        } catch (error) {
            console.error('PiP failed:', error);
            alert('Picture-in-Picture not supported or failed.');
        }
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(RustPlusWebUI.prototype, descriptors);
