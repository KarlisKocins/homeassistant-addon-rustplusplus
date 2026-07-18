/* Extracted from app.js - methods are verbatim; they are copied onto RustPlusWebUI.prototype below. */
import { RustPlusWebUI } from '../../app.js';

const Methods = class {
    computeWorldRectFromWorldSize(imgW, imgH, worldSize, padWorld = 2000) {
        if (worldSize <= 0) {
            return { x: 0, y: 0, width: imgW, height: imgH };
        }

        const minSidePx = Math.min(imgW, imgH);
        const scale = worldSize / (worldSize + padWorld);
        const sidePx = minSidePx * scale;

        const ox = (imgW - sidePx) / 2.0;
        const oy = (imgH - sidePx) / 2.0;

        return { x: ox, y: oy, width: sidePx, height: sidePx };
    }

    worldToCanvas(worldX, worldY) {
        if (!this.worldRect || !this.serverData?.info?.mapSize) {
            return { x: 0, y: 0 };
        }

        const worldSize = this.serverData.info.mapSize;
        if (worldSize <= 0 || this.worldRect.width <= 0) {
            return { x: 0, y: 0 };
        }

        const x = this.worldRect.x + (worldX / worldSize) * this.worldRect.width;
        const y = this.worldRect.y + ((worldSize - worldY) / worldSize) * this.worldRect.height;

        return { x, y };
    }

    columnLabel(index) {
        let s = '';
        do {
            s = String.fromCharCode('A'.charCodeAt(0) + (index % 26)) + s;
            index = Math.floor(index / 26) - 1;
        } while (index >= 0);
        return s;
    }

    worldToGrid(worldX, worldY) {
        if (!this.serverData?.info?.mapSize) return '??';

        const mapSize = this.serverData.info.mapSize;
        const gridSize = 150;
        const numCells = Math.ceil(mapSize / gridSize);

        const cellX = Math.floor(worldX / gridSize);
        const cellY = Math.floor((mapSize - worldY) / gridSize);

        const col = this.columnLabel(cellX);
        const row = cellY;

        return `${col}${row}`;
    }

    gameToCanvasX(x, worldWidth, oceanMargin) {
        if (!this.mapImage) return 0;
        // Convert game coordinates (0 to worldWidth) to normalized map coordinates (0 to 1)
        const normalized = x / worldWidth;
        // Convert to canvas coordinates using map image dimensions and current transform
        return normalized * this.mapImage.width * this.baseScale * this.scale;
    }

    gameToCanvasY(y, worldHeight, oceanMargin) {
        if (!this.mapImage) return 0;
        // Convert game coordinates (0 to worldHeight) to normalized map coordinates (0 to 1)
        // Note: Rust coordinates are inverted (0 at bottom), so we flip them
        const normalized = (worldHeight - y) / worldHeight;
        // Convert to canvas coordinates using map image dimensions and current transform
        return normalized * this.mapImage.height * this.baseScale * this.scale;
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(RustPlusWebUI.prototype, descriptors);
