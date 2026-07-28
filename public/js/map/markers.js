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

        players.forEach(p => {
            if (!p.isOnline) return;

            const { x, y } = this.worldToCanvas(p.x, p.y);
            const playerColor = this.getPlayerColor(p.steamId);
            const isLeader = !!leaderId && p.steamId === leaderId;

            const labelY = this.drawPlayerCircle(ctx, x, y, p, playerColor, isLeader);

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

    /* Compact disc centered on the world position: the avatar fills it and the
       player color is carried by the ring, so the marker stays the same size
       whether or not the avatar has loaded. */
    drawPlayerCircle(ctx, x, y, p, playerColor, isLeader) {
        const size = 11 / this.scale;
        const ring = 2.5 / this.scale;
        const color = p.isAlive ? playerColor : `${playerColor}80`;
        const avatar = this.playerAvatars[p.steamId];

        if (avatar) {
            ctx.save();
            ctx.globalAlpha = p.isAlive ? 1 : 0.5;
            ctx.beginPath();
            ctx.arc(x, y, size - ring / 2, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(avatar, x - size, y - size, size * 2, size * 2);
            ctx.restore();
        } else {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, size - ring / 2, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = ring;
        ctx.beginPath();
        ctx.arc(x, y, size - ring / 2, 0, Math.PI * 2);
        ctx.stroke();

        // Dead marker over the avatar
        if (!p.isAlive) {
            ctx.font = `${size * 1.2}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💀', x, y);
        }

        // Leader badge on the upper-right edge, same as the old pin overlay
        if (isLeader) {
            const badgeR = size * 0.34;
            const offset = size * 0.72;
            ctx.beginPath();
            ctx.arc(x + offset, y - offset, badgeR, 0, Math.PI * 2);
            ctx.fillStyle = '#4cc38a';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
            ctx.lineWidth = 1.5 / this.scale;
            ctx.stroke();
        }

        return y - size - (5 / this.scale);
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(RustPlusWebUI.prototype, descriptors);
