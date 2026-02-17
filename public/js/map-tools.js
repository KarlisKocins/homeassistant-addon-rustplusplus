/**
 * Map Tools Module — extracted from app.js
 * Contains: zoom-to-position, coordinate tooltip, distance measuring,
 * heatmap overlay, and annotation drawing tools.
 *
 * These methods are mixed into the RustPlusWebUI prototype.
 */

// ==================== ZOOM TO WORLD POSITION ====================

RustPlusWebUI.prototype.zoomToWorldPosition = function (worldX, worldY) {
    if (!this.mapImage || !this.serverData?.info?.mapSize || !this.worldRect) return;

    const imgW = this.mapImage.width;
    const imgH = this.mapImage.height;
    const { x: pixelX, y: pixelY } = this.worldToCanvas(worldX, worldY);

    this.offsetX = imgW / 2 - pixelX;
    this.offsetY = imgH / 2 - pixelY;
    this.scale = Math.max(this.baseScale * 2, this.scale);

    this.dirtyBackground = true;
    this.dirtyStatic = true;
    this.dirtyDynamic = true;
    this.needsRender = true;

    this.showToast(`Zoomed to (${Math.round(worldX)}, ${Math.round(worldY)})`, 'info', 2000);
};

// ==================== COORDINATE TOOLTIP ====================

RustPlusWebUI.prototype.canvasToWorld = function (clientX, clientY) {
    if (!this.mapImage || !this.serverData?.info?.mapSize || !this.worldRect) return null;

    const rect = this.dynamicCanvas.getBoundingClientRect();
    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const imgW = this.mapImage.width;
    const imgH = this.mapImage.height;

    const centerX = this.dynamicCanvas.width / 2;
    const centerY = this.dynamicCanvas.height / 2;

    const mapPixelX = (canvasX - centerX) / this.scale - this.offsetX + imgW / 2;
    const mapPixelY = (canvasY - centerY) / this.scale - this.offsetY + imgH / 2;

    const mapSize = this.serverData.info.mapSize;
    const worldX = ((mapPixelX - this.worldRect.x) / this.worldRect.width) * mapSize;
    const worldY = mapSize - ((mapPixelY - this.worldRect.y) / this.worldRect.height) * mapSize;

    return { worldX, worldY, mapPixelX, mapPixelY };
};

RustPlusWebUI.prototype.getGridReference = function (worldX, worldY) {
    if (!this.serverData?.info?.mapSize) return '';
    const mapSize = this.serverData.info.mapSize;
    const gridSize = 150;
    const numCells = Math.ceil(mapSize / gridSize);

    const gridX = Math.floor(worldX / gridSize);
    const gridY = Math.floor((mapSize - worldY) / gridSize);

    if (gridX < 0 || gridX >= numCells || gridY < 0 || gridY >= numCells) return '';

    let col = '';
    let cx = gridX;
    do {
        col = String.fromCharCode(65 + (cx % 26)) + col;
        cx = Math.floor(cx / 26) - 1;
    } while (cx >= 0);

    return `${col}${gridY}`;
};

RustPlusWebUI.prototype.updateCoordinateTooltip = function (e) {
    const tooltip = document.getElementById('coordinateTooltip');
    if (!tooltip) return;

    const coords = this.canvasToWorld(e.clientX, e.clientY);
    if (!coords) { tooltip.style.display = 'none'; return; }

    const grid = this.getGridReference(coords.worldX, coords.worldY);
    tooltip.innerHTML = `<span class="coord-grid">${grid || '?'}</span>${Math.round(coords.worldX)}, ${Math.round(coords.worldY)}`;
    tooltip.style.display = 'block';
    tooltip.style.left = (e.clientX + 15) + 'px';
    tooltip.style.top = (e.clientY - 10) + 'px';
};

RustPlusWebUI.prototype.hideCoordinateTooltip = function () {
    const tooltip = document.getElementById('coordinateTooltip');
    if (tooltip) tooltip.style.display = 'none';
};

// ==================== DISTANCE MEASURING TOOL ====================

RustPlusWebUI.prototype.toggleMeasuring = function () {
    this.isMeasuring = !this.isMeasuring;
    this.measureStart = null;
    this.measureEnd = null;

    const btn = document.getElementById('measureBtn');
    if (btn) btn.classList.toggle('measure-active', this.isMeasuring);

    const tooltip = document.getElementById('measureTooltip');
    if (tooltip) tooltip.style.display = 'none';

    this.dynamicCanvas.style.cursor = this.isMeasuring ? 'crosshair' : '';
    this.dirtyDynamic = true;
    this.needsRender = true;

    if (this.isMeasuring) {
        this.showToast('Click two points on the map to measure distance', 'info', 3000);
    }
};

RustPlusWebUI.prototype.handleMeasureClick = function (e) {
    const coords = this.canvasToWorld(e.clientX, e.clientY);
    if (!coords) return;

    if (!this.measureStart) {
        this.measureStart = { worldX: coords.worldX, worldY: coords.worldY, clientX: e.clientX, clientY: e.clientY };
        this.showToast('Start point set. Click another point to measure.', 'info', 2000);
    } else {
        this.measureEnd = { worldX: coords.worldX, worldY: coords.worldY, clientX: e.clientX, clientY: e.clientY };

        const dx = this.measureEnd.worldX - this.measureStart.worldX;
        const dy = this.measureEnd.worldY - this.measureStart.worldY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const tooltip = document.getElementById('measureTooltip');
        if (tooltip) {
            tooltip.textContent = `${Math.round(dist)}m`;
            tooltip.style.display = 'block';
            tooltip.style.left = ((this.measureStart.clientX + e.clientX) / 2) + 'px';
            tooltip.style.top = ((this.measureStart.clientY + e.clientY) / 2 - 25) + 'px';
        }

        this.showToast(`Distance: ${Math.round(dist)} meters`, 'success', 4000);

        this.dirtyDynamic = true;
        this.needsRender = true;

        // Reset measuring after showing result
        setTimeout(() => {
            this.measureStart = null;
            this.measureEnd = null;
            if (tooltip) tooltip.style.display = 'none';
            this.dirtyDynamic = true;
            this.needsRender = true;
        }, 5000);
    }
};

// ==================== CHAT PANEL ====================

RustPlusWebUI.prototype.addChatMessage = function (data) {
    if (!data || !data.message) return;

    const steamId = data.steamId || data.steam_id || '';
    const name = data.name || data.player_name || (steamId ? this.getTeamPlayerName(steamId) : null) || 'Unknown';

    const msg = {
        name,
        message: data.message,
        color: data.color || (steamId ? this.getPlayerColor(steamId) : '#d32f2f'),
        steamId,
        timestamp: data.timestamp ? data.timestamp * 1000 : Date.now()
    };

    this.chatMessages.push(msg);
    if (this.chatMessages.length > 100) this.chatMessages.shift();

    this.renderChatMessage(msg);
};


RustPlusWebUI.prototype.getTeamPlayerName = function (steamId) {
    return this.serverData?.team?.players?.find(p => p.steamId === steamId)?.name || null;
};

RustPlusWebUI.prototype.renderChatMessage = function (msg) {
    const container = document.getElementById('chatMessages');
    if (!container) return;

    const placeholder = container.querySelector('.timeline-empty');
    if (placeholder) placeholder.remove();

    const div = document.createElement('div');
    div.className = 'chat-message';

    const time = new Date(msg.timestamp);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    div.innerHTML = `<div class="chat-message-header">
        <span class="chat-message-name" style="color: ${msg.color}">${this.escapeHtml(msg.name)}</span>
        <span class="chat-message-time">${timeStr}</span>
    </div>
    <div class="chat-message-text">${this.escapeHtml(msg.message)}</div>`;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
};

// ==================== HEATMAP ====================

RustPlusWebUI.prototype.drawHeatmap = function (ctx) {
    if (!this.deathMarkersData?.length || !this.worldRect) return;

    const points = this.deathMarkersData
        .filter(d => d.x && d.y)
        .map(d => this.worldToCanvas(d.x, d.y));

    if (points.length === 0) return;

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.globalCompositeOperation = 'screen';

    const radius = 40 / this.scale;
    points.forEach(pt => {
        const gradient = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0.6)');
        gradient.addColorStop(0.4, 'rgba(255, 100, 0, 0.3)');
        gradient.addColorStop(0.7, 'rgba(255, 200, 0, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(pt.x - radius, pt.y - radius, radius * 2, radius * 2);
    });

    ctx.restore();
};

// ==================== ANNOTATIONS ====================

RustPlusWebUI.prototype.toggleAnnotating = function () {
    this.isAnnotating = !this.isAnnotating;
    const btn = document.getElementById('annotateBtn');
    if (btn) btn.classList.toggle('active', this.isAnnotating);
    this.canvas.style.cursor = this.isAnnotating ? 'crosshair' : '';

    if (this.isAnnotating) {
        this.currentAnnotation = { points: [], color: '#ff4444', width: 3 };
        this.showToast('Click and drag to draw. Press Escape or click ✏️ to finish.', 'info', 3000);
    } else {
        if (this.currentAnnotation && this.currentAnnotation.points.length > 1) {
            this.annotations.push({ ...this.currentAnnotation });
            this.saveAnnotations();
        }
        this.currentAnnotation = null;
    }
};

RustPlusWebUI.prototype.handleAnnotateMouseDown = function (e) {
    if (!this.isAnnotating) return;
    this._isDrawing = true;
    const world = this.canvasToWorld(e.clientX, e.clientY);
    if (world) {
        this.currentAnnotation = { points: [world], color: '#ff4444', width: 3 };
    }
};

RustPlusWebUI.prototype.handleAnnotateMouseMove = function (e) {
    if (!this.isAnnotating || !this._isDrawing) return;
    const world = this.canvasToWorld(e.clientX, e.clientY);
    if (world && this.currentAnnotation) {
        this.currentAnnotation.points.push(world);
        this.dirtyDynamic = true;
    }
};

RustPlusWebUI.prototype.handleAnnotateMouseUp = function () {
    if (!this.isAnnotating || !this._isDrawing) return;
    this._isDrawing = false;
    if (this.currentAnnotation && this.currentAnnotation.points.length > 1) {
        this.annotations.push({ ...this.currentAnnotation });
        this.saveAnnotations();
        this.showToast(`Annotation saved (${this.annotations.length} total)`, 'success', 2000);
    }
    this.currentAnnotation = { points: [], color: '#ff4444', width: 3 };
};

RustPlusWebUI.prototype.drawAnnotations = function (ctx) {
    this.annotations.forEach(ann => this.drawAnnotationPath(ctx, ann));
};

RustPlusWebUI.prototype.drawAnnotationPath = function (ctx, ann) {
    if (!ann.points || ann.points.length < 2) return;
    ctx.save();
    ctx.strokeStyle = ann.color || '#ff4444';
    ctx.lineWidth = (ann.width || 3) / this.scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    const first = this.worldToCanvas(ann.points[0].x, ann.points[0].y);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < ann.points.length; i++) {
        const pt = this.worldToCanvas(ann.points[i].x, ann.points[i].y);
        ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
    ctx.restore();
};

RustPlusWebUI.prototype.saveAnnotations = function () {
    localStorage.setItem('rustplus-annotations', JSON.stringify(this.annotations));
};

RustPlusWebUI.prototype.clearAnnotations = function () {
    this.annotations = [];
    this.saveAnnotations();
    this.showToast('All annotations cleared', 'info', 2000);
};
