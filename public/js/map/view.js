/* Extracted from app.js - methods are verbatim; they are copied onto RustPlusWebUI.prototype below. */
import { RustPlusWebUI } from '../../app.js';

const Methods = class {
    handleResize() {
        if (!this.mapImage) return;

        const wrapper = document.getElementById('mapWrapper');
        const containerWidth = wrapper.clientWidth;
        const containerHeight = wrapper.clientHeight;

        // Set canvas dimensions to fill the container
        [this.backgroundCanvas, this.staticCanvas, this.dynamicCanvas].forEach(canvas => {
            canvas.width = containerWidth;
            canvas.height = containerHeight;
        });

        // Compute base scale to fit map image into container
        const prevBaseScale = this.baseScale || 1;
        const zoomRatio = this.scale / prevBaseScale;
        this.baseScale = Math.min(containerWidth / this.mapImage.width, containerHeight / this.mapImage.height);
        this.scale = this.baseScale * zoomRatio;

        // Recalculate world rect based on the original map image size
        if (this.serverData?.info) {
            this.worldRect = this.computeWorldRectFromWorldSize(this.mapImage.width, this.mapImage.height, this.serverData.info.mapSize);
        }

        // Redraw everything
        this.dirtyStatic = true;
        this.dirtyDynamic = true;
        this.needsRender = true;
    }

    zoom(factor) {
        this.scale *= factor;
        const minScale = this.baseScale * 0.1;
        const maxScale = this.baseScale * 20;
        this.scale = Math.max(minScale, Math.min(maxScale, this.scale));
        this.dirtyStatic = true;
        this.dirtyDynamic = true;
        this.needsRender = true;
    }

    zoomAt(clientX, clientY, factor) {
        if (!this.mapImage) return;

        const rect = this.dynamicCanvas.getBoundingClientRect();
        const scaleX = this.dynamicCanvas.width / rect.width;
        const scaleY = this.dynamicCanvas.height / rect.height;
        const canvasX = (clientX - rect.left) * scaleX;
        const canvasY = (clientY - rect.top) * scaleY;

        const centerX = this.dynamicCanvas.width / 2;
        const centerY = this.dynamicCanvas.height / 2;

        const imageX = (canvasX - centerX) / this.scale - this.offsetX + this.mapImage.width / 2;
        const imageY = (canvasY - centerY) / this.scale - this.offsetY + this.mapImage.height / 2;

        const prevScale = this.scale;
        this.scale *= factor;
        const minScale = this.baseScale * 0.1;
        const maxScale = this.baseScale * 20;
        this.scale = Math.max(minScale, Math.min(maxScale, this.scale));

        if (this.scale === prevScale) return;

        this.offsetX = (canvasX - centerX) / this.scale - imageX + this.mapImage.width / 2;
        this.offsetY = (canvasY - centerY) / this.scale - imageY + this.mapImage.height / 2;

        this.dirtyStatic = true;
        this.dirtyDynamic = true;
        this.needsRender = true;
    }

    resetView() {
        this.scale = this.baseScale || 1;
        this.offsetX = 0;
        this.offsetY = 0;
        this.dirtyStatic = true;
        this.dirtyDynamic = true;
        this.needsRender = true;
    }

    toggleFullscreen() {
        const content = document.querySelector('.content');
        content.classList.toggle('fullscreen-map');

        // Trigger resize to adjust canvas to new container size
        setTimeout(() => {
            this.handleResize();
        }, 100);
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(RustPlusWebUI.prototype, descriptors);
