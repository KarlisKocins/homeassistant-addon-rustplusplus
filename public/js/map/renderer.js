/* Extracted from app.js - methods are verbatim; they are copied onto RustPlusWebUI.prototype below. */
import { RustPlusWebUI } from '../../app.js';

const Methods = class {
    startRenderLoop() {
        const render = (timestamp) => {
            this._rafId = null;
            const elapsed = timestamp - this.lastRenderTime;

            // Only render at most 60fps
            if (elapsed < 16 && !this.dirtyStatic && !this.dirtyDynamic) {
                this._rafId = requestAnimationFrame(render);
                return;
            }

            if (this.dirtyStatic) {
                this.drawStaticLayers();
                this.dirtyStatic = false;
            }

            if (this.needsRender || this.dirtyDynamic) {
                this.drawDynamicLayers();
                this.renderMinimap();
                this.needsRender = false;
                this.dirtyDynamic = false;
                this.lastRenderTime = timestamp;
            }

            this._rafId = requestAnimationFrame(render);
        };

        /* Pause rendering entirely while the tab is hidden; redraw fresh on return */
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                if (this._rafId) {
                    cancelAnimationFrame(this._rafId);
                    this._rafId = null;
                }
            } else if (!this._rafId) {
                this.dirtyStatic = true;
                this.dirtyDynamic = true;
                this._rafId = requestAnimationFrame(render);
            }
        });

        this._rafId = requestAnimationFrame(render);
    }

    drawStaticLayers() {
        if (!this.mapImage) return;

        this.backgroundCtx.clearRect(0, 0, this.backgroundCanvas.width, this.backgroundCanvas.height);

        // Save context state
        this.backgroundCtx.save();

        // Apply zoom and pan transforms
        this.backgroundCtx.translate(this.backgroundCanvas.width / 2, this.backgroundCanvas.height / 2);
        this.backgroundCtx.scale(this.scale, this.scale);
        this.backgroundCtx.translate(this.offsetX - this.mapImage.width / 2, this.offsetY - this.mapImage.height / 2);

        // Use high quality image rendering
        this.backgroundCtx.imageSmoothingEnabled = true;
        this.backgroundCtx.imageSmoothingQuality = 'high';
        this.backgroundCtx.drawImage(this.mapImage, 0, 0);

        this.backgroundCtx.restore();

        this.staticCtx.clearRect(0, 0, this.staticCanvas.width, this.staticCanvas.height);

        this.staticCtx.save();
        this.staticCtx.translate(this.staticCanvas.width / 2, this.staticCanvas.height / 2);
        this.staticCtx.scale(this.scale, this.scale);
        this.staticCtx.translate(this.offsetX - this.mapImage.width / 2, this.offsetY - this.mapImage.height / 2);

        if (this.serverData) {
            if (this.controls.showGrid) this.drawGrid(this.staticCtx);
            if (this.controls.showMonuments) this.drawMonuments(this.staticCtx);
            if (this.controls.showVendingMachines && this.serverData.mapMarkers?.vendingMachines) {
                this.drawVendingMachines(this.staticCtx);
            }
        }

        this.staticCtx.restore();
    }

    drawDynamicLayers() {
        this.dynamicCtx.clearRect(0, 0, this.dynamicCanvas.width, this.dynamicCanvas.height);
        if (!this.serverData || !this.mapImage) return;

        const ctx = this.dynamicCtx;

        // Apply zoom and pan transforms
        ctx.save();
        ctx.translate(this.dynamicCanvas.width / 2, this.dynamicCanvas.height / 2);
        ctx.scale(this.scale, this.scale);
        ctx.translate(this.offsetX - this.mapImage.width / 2, this.offsetY - this.mapImage.height / 2);

        // Check if replay mode should handle rendering
        if (this.mapReplay?.isReplayMode && this.serverData.map) {
            const rendered = this.mapReplay.render(ctx, this.serverData.map);
            if (rendered) {
                ctx.restore();
                return; // Replay handled all rendering
            }
        }

        // Normal rendering
        if (this.controls.showEvents) this.drawEvents(ctx);
        // Draw persistent patrol death markers (always visible)
        this.drawPersistentPatrolMarkers(ctx);
        // Draw recent team deaths (always visible for 5 minutes)
        if (!this.mapReplay?.isReplayMode) this.drawRecentTeamDeaths(ctx);
        // Draw historical death markers (only when enabled)
        if (this.controls.showDeathMarkers && !this.mapReplay?.isReplayMode) this.drawDeathMarkers(ctx);
        // Draw heatmap overlay
        if (this.controls.showHeatmap && !this.mapReplay?.isReplayMode) this.drawHeatmap(ctx);
        if (this.controls.showMarkers && this.serverData.markers) this.drawCustomMarkers(ctx);

        // Render live trails with colors
        if (this.controls.showTrails && !this.mapReplay?.isReplayMode) {
            this.drawPlayerTrails(ctx);
        }

        if (this.controls.showPlayers && this.serverData.team?.players) this.drawPlayers(ctx);

        // Draw annotations on top
        if (this.annotations.length > 0) this.drawAnnotations(ctx);
        if (this.currentAnnotation && this.currentAnnotation.points.length > 0) this.drawAnnotationPath(ctx, this.currentAnnotation);

        ctx.restore();
    }

    drawGrid(ctx) {
        if (!this.worldRect || !this.serverData?.info?.mapSize) return;

        const worldSize = this.serverData.info.mapSize;
        const gridSize = 150;
        const numCells = Math.ceil(worldSize / gridSize);
        const cellSize = this.worldRect.width / numCells;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1 / this.scale;

        for (let i = 0; i <= numCells; i++) {
            const x = this.worldRect.x + i * cellSize;
            ctx.beginPath();
            ctx.moveTo(x, this.worldRect.y);
            ctx.lineTo(x, this.worldRect.y + this.worldRect.height);
            ctx.stroke();
        }

        for (let i = 0; i <= numCells; i++) {
            const y = this.worldRect.y + i * cellSize;
            ctx.beginPath();
            ctx.moveTo(this.worldRect.x, y);
            ctx.lineTo(this.worldRect.x + this.worldRect.width, y);
            ctx.stroke();
        }

        if (this.scale < 0.8) return; // Hide labels when zoomed out

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = `${14 / this.scale}px Arial`;
        ctx.textAlign = 'center';

        for (let i = 0; i < numCells; i++) {
            const col = this.columnLabel(i);
            for (let j = 0; j < numCells; j++) {
                const x = this.worldRect.x + i * cellSize + cellSize / 2;
                const y = this.worldRect.y + j * cellSize + cellSize / 2;
                ctx.fillText(`${col}${j}`, x, y);
            }
        }
    }

    drawMonuments(ctx) {
        const monuments = this.serverData.map?.monuments;
        if (!monuments) return;

        monuments.forEach(m => {
            const { x, y } = this.worldToCanvas(m.x, m.y);

            // Get formatted monument info
            let token = (m.token || '').toLowerCase();

            // Handle prefab paths - extract the key part
            if (token.includes('/')) {
                // Extract filename from path
                const parts = token.split('/');
                const filename = parts[parts.length - 1].replace('.prefab', '');

                // Map common prefab patterns
                if (token.includes('underwater')) {
                    token = 'underwater_lab';
                } else if (token.includes('moonpool')) {
                    token = 'underwater_lab';
                } else {
                    token = filename.replace(/[-_]/g, '_');
                }
            }

            token = token.replace(/\s+/g, '_');

            const monumentInfo = this.monumentNames[token] || {
                name: m.token || 'Monument',
                emoji: '📍'
            };

            const r = 9 / this.scale;

            // Icon badge: dark disc with a monument-red ring
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(24, 24, 24, 0.78)';
            ctx.fill();
            ctx.lineWidth = 1.5 / this.scale;
            ctx.strokeStyle = 'rgba(206, 65, 43, 0.95)';
            ctx.stroke();

            if (this.scale > 0.5) {
                // Emoji glyph inside the badge
                ctx.font = `${12 / this.scale}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(monumentInfo.emoji, x, y);

                // Rounded label pill above the badge
                if (this.scale > 0.8) {
                    const name = monumentInfo.name;
                    ctx.font = `bold ${11 / this.scale}px Arial`;
                    const padX = 5 / this.scale;
                    const pillH = 16 / this.scale;
                    const pillW = ctx.measureText(name).width + padX * 2;
                    const pillX = x - pillW / 2;
                    const pillY = y - r - pillH - 3 / this.scale;

                    this.roundRectPath(ctx, pillX, pillY, pillW, pillH, 4 / this.scale);
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.62)';
                    ctx.fill();

                    ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(name, x, pillY + pillH / 2 + 0.5 / this.scale);
                }
            }
        });
    }

    drawRadZones(ctx) {
        const radZones = this.serverData.mapMarkers.genericRadiuses;
        if (!radZones?.length) return;

        const scale = this.worldRect.width / this.serverData.info.mapSize;

        ctx.fillStyle = 'rgba(46, 204, 113, 0.2)';
        ctx.strokeStyle = 'rgba(46, 204, 113, 0.6)';
        ctx.lineWidth = 2 / this.scale;

        radZones.forEach(zone => {
            const { x, y } = this.worldToCanvas(zone.x, zone.y);
            const radius = zone.radius * scale;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });
    }

    drawEvents(ctx) {
        const markers = this.serverData.mapMarkers;
        if (!markers) return;

        const drawMarkerImg = (items, img, sizeMult = 1, rotationOffset = Math.PI / 2, ringColor = null) => {
            if (!items || !img) return;
            items.forEach(item => {
                const { x, y } = this.worldToCanvas(item.x, item.y);
                const size = (28 * sizeMult) / this.scale;

                // Backing disc + colored ring for contrast against the map
                if (ringColor) {
                    const rr = size * 0.42;
                    ctx.beginPath();
                    ctx.arc(x, y, rr, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
                    ctx.fill();
                    ctx.lineWidth = 2 / this.scale;
                    ctx.strokeStyle = ringColor;
                    ctx.stroke();
                }

                if (img.complete) {
                    ctx.save();
                    ctx.translate(x, y);

                    // Rotation logic
                    if (item.rotation !== undefined) {
                        // Apply rotation offset (most icons point Right/East, so -90deg makes them point North at 0)
                        const angleRad = (item.rotation) * (Math.PI / 180) + rotationOffset;
                        ctx.rotate(angleRad);
                    }

                    ctx.drawImage(img, -size / 2, -size / 2, size, size);
                    ctx.restore();
                } else {
                    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
                    ctx.beginPath();
                    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        };

        // Draw markers using correct images, rotation offset and event-colored backing ring
        drawMarkerImg(markers.cargoShips, this.markerImages.cargo, 1.8, Math.PI / 2, 'rgba(52, 152, 219, 0.9)'); // Cargo ship is big
        drawMarkerImg(markers.ch47s, this.markerImages.chinook, 1.2, Math.PI / 2, 'rgba(241, 196, 15, 0.9)');
        drawMarkerImg(markers.patrolHelicopters, this.markerImages.heli, 1.2, Math.PI / 2, 'rgba(231, 76, 60, 0.95)');
    }

    drawVendingMachines(ctx) {
        const machines = this.serverData.mapMarkers.vendingMachines;
        if (!machines?.length || this.scale < 0.9) return;

        const icon = this.markerImages.shopIcon;
        const iconReady = icon.complete && icon.naturalWidth > 0;
        const r = 9 / this.scale;

        machines.forEach(vm => {
            const { x, y } = this.worldToCanvas(vm.x, vm.y);

            // Colored shop disc with white outline
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(46, 160, 67, 0.95)';
            ctx.fill();
            ctx.lineWidth = 1.5 / this.scale;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.stroke();

            // White cart glyph on top
            if (iconReady) {
                const s = r * 1.3;
                ctx.drawImage(this.tintPin(icon, '#ffffff'), x - s / 2, y - s / 2, s, s);
            }
        });
    }

    drawCustomMarkers(ctx) {
        // Implementation for custom markers can be added here
    }

    tintPin(img, color) {
        const w = img.naturalWidth || 64;
        const h = img.naturalHeight || 64;
        const c = this._pinTintCanvas;
        const cx = this._pinTintCtx;
        if (c.width !== w) c.width = w;
        if (c.height !== h) c.height = h;

        cx.clearRect(0, 0, w, h);
        cx.globalCompositeOperation = 'source-over';
        cx.drawImage(img, 0, 0, w, h);
        cx.globalCompositeOperation = 'source-in';
        cx.fillStyle = color;
        cx.fillRect(0, 0, w, h);
        cx.globalCompositeOperation = 'source-over';
        return c;
    }

    roundRectPath(ctx, x, y, w, h, radius) {
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(x, y, w, h, radius);
            return;
        }
        const r = Math.min(radius, w / 2, h / 2);
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(RustPlusWebUI.prototype, descriptors);
