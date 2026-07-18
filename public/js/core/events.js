/* Extracted from app.js - methods are verbatim; they are copied onto RustPlusWebUI.prototype below. */
import { RustPlusWebUI } from '../../app.js';

const Methods = class {
    setupEventListeners() {
        document.getElementById('serverSelect').addEventListener('change', (e) => this.selectServer(e.target.value));

        Object.keys(this.controls).forEach(key => {
            const checkbox = document.getElementById(key);
            if (checkbox) {
                // Restore state from persistence
                checkbox.checked = this.controls[key];

                checkbox.addEventListener('change', (e) => {
                    this.controls[key] = e.target.checked;
                    this.savePersistentControls(); // Save on change

                    this.needsRender = true;
                    const staticControls = ['showGrid', 'showMonuments', 'showVendingMachines'];
                    if (staticControls.includes(key)) {
                        this.dirtyStatic = true;
                    }
                    this.dirtyDynamic = true;

                    // Show/hide death markers config and fetch data
                    if (key === 'showDeathMarkers') {
                        const config = document.getElementById('deathMarkersConfig');
                        if (config) {
                            config.style.display = e.target.checked ? 'block' : 'none';
                        }
                        if (e.target.checked) {
                            this.fetchDeathMarkers();
                            this.startDeathMarkerAutoRefresh();
                        } else {
                            this.stopDeathMarkerAutoRefresh();
                        }
                    }

                    // Heatmap needs death markers data
                    if (key === 'showHeatmap' && e.target.checked) {
                        if (!this.deathMarkersData?.length) this.fetchDeathMarkers();
                    }
                });

                // Trigger initial visibility for special controls
                if (key === 'showDeathMarkers') {
                    const config = document.getElementById('deathMarkersConfig');
                    if (config) {
                        config.style.display = this.controls[key] ? 'block' : 'none';
                    }
                }
            }
        });

        // Death markers time range selector
        const timeRangeSelect = document.getElementById('deathMarkersTimeRange');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.deathMarkersTimeRange = parseInt(e.target.value);
                if (this.controls.showDeathMarkers) {
                    this.fetchDeathMarkers();
                }
            });
        }

        // Refresh death markers button
        const refreshBtn = document.getElementById('refreshDeathMarkers');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                if (this.controls.showDeathMarkers) {
                    this.fetchDeathMarkers();
                }
            });
        }

        // Trail duration slider
        const trailSlider = document.getElementById('trailDurationSlider');
        const trailValue = document.getElementById('trailDurationValue');
        if (trailSlider && trailValue) {
            // Initialize slider with current value
            const currentMinutes = Math.round(this.trailDuration / 60000);
            trailSlider.value = currentMinutes;
            trailValue.textContent = currentMinutes;

            trailSlider.addEventListener('input', (e) => {
                const minutes = parseInt(e.target.value);
                trailValue.textContent = minutes;
                this.trailDuration = minutes * 60000; // Convert to milliseconds
                localStorage.setItem('trailDuration', this.trailDuration.toString());

                // Clear existing trails to apply new duration immediately
                Object.keys(this.playerTrails).forEach(steamId => {
                    const trails = this.playerTrails[steamId] || [];
                    this.playerTrails[steamId] = trails.filter(t => t.time > Date.now() - this.trailDuration);
                });

                this.dirtyDynamic = true;
                this.needsRender = true;
            });
        }

        document.getElementById('zoomIn').addEventListener('click', () => this.zoom(1.2));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoom(0.8));
        document.getElementById('resetZoom').addEventListener('click', () => this.resetView());
        document.getElementById('toggleFullscreen').addEventListener('click', () => this.toggleFullscreen());

        // Annotation button
        document.getElementById('annotateBtn')?.addEventListener('click', () => this.toggleAnnotating());
        document.getElementById('undoAnnotationBtn')?.addEventListener('click', () => this.undoLastAnnotation());
        document.getElementById('clearAnnotationsBtn')?.addEventListener('click', () => this.clearAnnotations());

        const wrapper = this.dynamicCanvas;

        wrapper.addEventListener('mousedown', (e) => {
            if (this.isAnnotating) {
                this.handleAnnotateMouseDown(e);
                return;
            }
            this.isDragging = true;
            this.lastX = e.clientX;
            this.lastY = e.clientY;
        });

        wrapper.addEventListener('mousemove', (e) => {
            if (this.isAnnotating) {
                this.handleAnnotateMouseMove(e);
            }
            if (this.isDragging) {
                this.offsetX += (e.clientX - this.lastX) / this.scale;
                this.offsetY += (e.clientY - this.lastY) / this.scale;
                this.lastX = e.clientX;
                this.lastY = e.clientY;
                this.dirtyDynamic = true;
                this.needsRender = true;
            }
            this.updateCoordinateTooltip(e);
        });

        wrapper.addEventListener('mouseup', (e) => {
            if (this.isAnnotating) {
                this.handleAnnotateMouseUp();
                return;
            }
            this.isDragging = false;
        });
        wrapper.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.hideCoordinateTooltip();
        });

        document.getElementById('mapWrapper').addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoomAt(e.clientX, e.clientY, zoomFactor);
        });

        document.getElementById('pipButton')?.addEventListener('click', () => this.enterPictureInPicture());
        document.getElementById('followPlayer')?.addEventListener('change', (e) => {
            this.followedPlayerId = e.target.value || null;
            this.dirtyDynamic = true;
            this.needsRender = true;
        });

        document.getElementById('minimapZoomIn')?.addEventListener('click', () => {
            this.minimapZoom = Math.min(this.minimapZoomMax, this.minimapZoom * 1.2);
            this.dirtyDynamic = true;
            this.needsRender = true;
        });

        document.getElementById('minimapZoomOut')?.addEventListener('click', () => {
            this.minimapZoom = Math.max(this.minimapZoomMin, this.minimapZoom / 1.2);
            this.dirtyDynamic = true;
            this.needsRender = true;
        });

        document.getElementById('minimapReset')?.addEventListener('click', () => {
            this.minimapZoom = 1.0;
            this.minimapPanX = 0;
            this.minimapPanY = 0;
            this.dirtyDynamic = true;
            this.needsRender = true;
        });

        // Predictions nav button
        document.getElementById('predictionsNavBtn')?.addEventListener('click', () => {
            if (this.currentGuildId && this.eventPredictions) {
                this.eventPredictions.show(this.currentGuildId, this.serverData?.serverId);
            }
        });

        // Raid Planner nav button
        document.getElementById('raidPlannerNavBtn')?.addEventListener('click', () => {
            if (window.raidPlanner) {
                window.raidPlanner.show();
            }
        });

        document.getElementById('hideMainMap')?.addEventListener('change', (e) => {
            const mapContainer = document.querySelector('.map-container');
            if (mapContainer) mapContainer.style.display = e.target.checked ? 'none' : 'flex';
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

            switch (e.key) {
                case 'Escape':
                    // Close any open modal
                    document.querySelectorAll('.modal-overlay.open, .edit-modal-overlay.open').forEach(m => m.classList.remove('open'));
                    if (this.isAnnotating) this.toggleAnnotating();
                    // Close mobile nav
                    document.querySelector('.header-nav')?.classList.remove('mobile-open');
                    break;
                case 'f':
                case 'F':
                    if (!e.ctrlKey && !e.metaKey) this.toggleFullscreen();
                    break;
                case 'g':
                case 'G':
                    if (!e.ctrlKey && !e.metaKey) {
                        const gridCb = document.getElementById('showGrid');
                        if (gridCb) { gridCb.checked = !gridCb.checked; gridCb.dispatchEvent(new Event('change')); }
                    }
                    break;
                case 'm':
                case 'M':
                    if (!e.ctrlKey && !e.metaKey) {
                        const monCb = document.getElementById('showMonuments');
                        if (monCb) { monCb.checked = !monCb.checked; monCb.dispatchEvent(new Event('change')); }
                    }
                    break;
                case 't':
                case 'T':
                    if (!e.ctrlKey && !e.metaKey) this.toggleTheme();
                    break;
                case 'a':
                case 'A':
                    if (!e.ctrlKey && !e.metaKey) this.toggleAnnotating();
                    break;
            }
        });

        // Theme toggle button
        document.getElementById('themeToggleBtn')?.addEventListener('click', () => this.toggleTheme());
        this.initTheme();

        // Hamburger menu
        document.getElementById('hamburgerBtn')?.addEventListener('click', () => this.toggleMobileNav());
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(RustPlusWebUI.prototype, descriptors);
