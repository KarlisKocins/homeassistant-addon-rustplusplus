/* Extracted from app.js - methods are verbatim; they are copied onto RustPlusWebUI.prototype below. */
import { RustPlusWebUI } from '../../app.js';

const Methods = class {
    drawDeathMarkers(ctx) {
        if (!this.deathMarkersData?.length) return;

        const now = Date.now();

        this.deathMarkersData.forEach(death => {
            if (!death.x || !death.y) return;
            if (death.expiresAt && death.expiresAt <= now) return; // Skip expired

            const { x, y } = this.worldToCanvas(death.x, death.y);
            const size = 12 / this.scale;

            // Draw red circle background
            ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
            ctx.lineWidth = 2 / this.scale;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Draw skull emoji
            ctx.font = `bold ${16 / this.scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2 / this.scale;
            ctx.strokeText('💀', x, y);
            ctx.fillText('💀', x, y);

            // Draw player name if zoomed in enough
            if (this.scale > 0.5 && death.player_name) {
                ctx.font = `bold ${10 / this.scale}px Arial`;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.lineWidth = 3 / this.scale;
                ctx.strokeText(death.player_name, x, y + size + 10 / this.scale);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(death.player_name, x, y + size + 10 / this.scale);

                // Draw time since death
                const deathTime = death.death_time || death.timestamp || 0;
                const timeSince = Math.floor((Date.now() / 1000 - deathTime) / 60);
                const timeText = timeSince < 60 ? `${timeSince}m ago` : `${Math.floor(timeSince / 60)}h ago`;
                ctx.font = `${9 / this.scale}px Arial`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fillText(timeText, x, y + size + 22 / this.scale);
            }
        });
    }

    drawRecentTeamDeaths(ctx) {
        if (!this.recentTeamDeaths?.length) return;

        const now = Date.now();

        this.recentTeamDeaths.forEach(death => {
            if (!death.x || !death.y) return;
            if (death.expiresAt <= now) return; // Skip expired

            const { x, y } = this.worldToCanvas(death.x, death.y);
            const size = 12 / this.scale;

            // Draw red circle background with pulsing effect
            const pulsePhase = (now % 1500) / 1500;
            const pulseOpacity = 0.4 + 0.2 * Math.sin(pulsePhase * Math.PI * 2);

            ctx.fillStyle = `rgba(255, 0, 0, ${pulseOpacity})`;
            ctx.strokeStyle = 'rgba(255, 0, 0, 0.95)';
            ctx.lineWidth = 2 / this.scale;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Draw skull emoji
            ctx.font = `bold ${16 / this.scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ff0000';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2 / this.scale;
            ctx.strokeText('💀', x, y);
            ctx.fillText('💀', x, y);

            // Draw player name
            if (this.scale > 0.5) {
                ctx.font = `bold ${10 / this.scale}px Arial`;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.lineWidth = 3 / this.scale;
                ctx.strokeText(death.player_name, x, y + size + 10 / this.scale);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(death.player_name, x, y + size + 10 / this.scale);

                // Draw time remaining
                const timeRemaining = Math.ceil((death.expiresAt - now) / 1000 / 60);
                const timeText = `${timeRemaining}m`;
                ctx.font = `${9 / this.scale}px Arial`;
                ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
                ctx.fillText(timeText, x, y + size + 22 / this.scale);
            }
        });
    }

    drawPersistentPatrolMarkers(ctx) {
        if (!this.persistentPatrolMarkers?.length) return;

        const now = Date.now();
        this.persistentPatrolMarkers.forEach(marker => {
            if (marker.expiresAt <= now) return;

            // Skip grid-only positions as they're shown in minimap info bar
            if (marker.isGridPosition) return;

            // For world coordinates (if available)
            if (!marker.x || !marker.y) return;

            const { x, y } = this.worldToCanvas(marker.x, marker.y);
            const size = 25 / this.scale;

            // Pulsing circle
            const pulsePhase = (now % 2000) / 2000;
            const pulseSize = size * (1 + 0.4 * Math.sin(pulsePhase * Math.PI * 2));
            const opacity = 0.5 + 0.3 * Math.sin(pulsePhase * Math.PI * 2);

            ctx.fillStyle = `rgba(255, 69, 0, ${opacity})`;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.lineWidth = 3 / this.scale;
            ctx.beginPath();
            ctx.arc(x, y, pulseSize, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Draw explosion emoji
            ctx.font = `bold ${32 / this.scale}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2 / this.scale;
            ctx.strokeText('💥', x, y);
            ctx.fillText('💥', x, y);

            // Draw label
            if (this.scale > 0.5) {
                const timeLeft = Math.ceil((marker.expiresAt - now) / 60000);
                const timeText = timeLeft > 1 ? `${timeLeft}m` : '<1m';

                ctx.font = `bold ${14 / this.scale}px Arial`;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.lineWidth = 3 / this.scale;
                ctx.strokeText(`Patrol Down - ${marker.location}`, x, y + size + 12 / this.scale);
                ctx.fillStyle = '#ffffff';
                ctx.fillText(`Patrol Down - ${marker.location}`, x, y + size + 12 / this.scale);

                ctx.font = `bold ${12 / this.scale}px Arial`;
                ctx.fillStyle = '#ff4500';
                ctx.strokeText(`⏱️ ${timeText}`, x, y + size + 26 / this.scale);
                ctx.fillText(`⏱️ ${timeText}`, x, y + size + 26 / this.scale);
            }
        });
    }

    drawPlayerTrails(ctx) {
        const players = this.serverData.team?.players || [];
        if (!players.length) return;

        players.forEach(p => {
            if (!p.isOnline || !p.isAlive) return;

            /* Trails are pruned in the serverUpdate handler; the render loop
               only strokes them (no per-frame allocations) */
            const trails = this.playerTrails[p.steamId];
            if (!trails) return;

            if (trails.length > 1) {
                // Use player-specific color
                const color = this.getPlayerColor(p.steamId);
                ctx.strokeStyle = color;
                ctx.lineWidth = 3 / this.scale;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                ctx.globalAlpha = 0.6;

                ctx.beginPath();
                ctx.moveTo(trails[0].x, trails[0].y);
                for (let i = 1; i < trails.length; i++) {
                    ctx.lineTo(trails[i].x, trails[i].y);
                }
                ctx.stroke();
                ctx.globalAlpha = 1.0;
            }
        });
    }

    drawPlayers(ctx) {
        const players = this.serverData.team?.players;
        if (!players) return;

        const leaderId = this.serverData.team?.leaderSteamId;
        const pinBg = this.markerImages.pinBg;
        const pinsReady = pinBg.complete && pinBg.naturalWidth > 0 &&
            this.markerImages.pinFg.complete && this.markerImages.pinFg.naturalWidth > 0;

        players.forEach(p => {
            if (!p.isOnline) return;

            const { x, y } = this.worldToCanvas(p.x, p.y);
            const playerColor = this.getPlayerColor(p.steamId);
            const isLeader = !!leaderId && p.steamId === leaderId;

            let labelY;
            if (pinsReady) {
                labelY = this.drawPlayerPin(ctx, x, y, p, playerColor, isLeader);
            } else {
                labelY = this.drawPlayerCircle(ctx, x, y, p, playerColor);
            }

            if (this.controls.showPlayerNames && this.scale > 0.7) {
                ctx.fillStyle = 'white';
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 3 / this.scale;
                ctx.lineJoin = 'round';
                ctx.font = `bold ${12 / this.scale}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'alphabetic';
                ctx.strokeText(p.name, x, labelY);
                ctx.fillText(p.name, x, labelY);
            }
        });
    }

    drawPlayerPin(ctx, x, y, p, color, isLeader) {
        const bg = this.markerImages.pinBg;
        const h = 34 / this.scale;
        const aspect = bg.naturalHeight ? bg.naturalWidth / bg.naturalHeight : 1;
        const w = h * aspect;
        const left = x - w / 2;
        const top = y - h; // anchor the teardrop tip at the world position

        const holeCx = left + w * 0.5;
        const holeCy = top + h * 0.40;
        const holeR = w * 0.19;

        ctx.save();
        ctx.globalAlpha = p.isAlive ? 1 : 0.5;

        // 1. Tinted teardrop body
        ctx.drawImage(this.tintPin(bg, color), left, top, w, h);

        // 2. Avatar clipped into the circular hole
        const avatar = this.playerAvatars[p.steamId];
        if (avatar) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(holeCx, holeCy, holeR, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatar, holeCx - holeR, holeCy - holeR, holeR * 2, holeR * 2);
            ctx.restore();
        }

        // 3. Dark outline overlay (leader variant carries the crown badge)
        const fg = isLeader ? this.markerImages.pinFgLeader : this.markerImages.pinFg;
        if (fg.complete && fg.naturalWidth > 0) {
            ctx.drawImage(fg, left, top, w, h);
        }

        ctx.restore();

        // Dead marker over the avatar hole
        if (!p.isAlive) {
            ctx.font = `${holeR * 1.6}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💀', holeCx, holeCy);
        }

        return top - 4 / this.scale; // name label baseline above the pin
    }

    drawPlayerCircle(ctx, x, y, p, playerColor) {
        const size = 10 / this.scale;
        const avatar = this.playerAvatars[p.steamId];

        if (avatar) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatar, x - size, y - size, size * 2, size * 2);
            ctx.restore();

            ctx.strokeStyle = p.isAlive ? playerColor : `${playerColor}80`;
            ctx.lineWidth = 2 / this.scale;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.fillStyle = p.isAlive ? playerColor : `${playerColor}80`;
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2 / this.scale;
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        return y - size - (5 / this.scale);
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(RustPlusWebUI.prototype, descriptors);
