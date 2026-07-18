/* Map shop hover cards: hovering a vending machine icon shows its sell
   orders (with item icons) in a floating HTML card, desktop-app style.
   Methods are copied onto RustPlusWebUI.prototype below. */
import { RustPlusWebUI } from '../../app.js';

const HOVER_HIT_RADIUS = 14; /* screen pixels */

const Methods = class {
    setupShopHover() {
        document.getElementById('shopHoverCard')?.remove();
        this._shopCard = document.createElement('div');
        this._shopCard.id = 'shopHoverCard';
        this._shopCard.className = 'shop-hover-card';
        this._shopCard.style.display = 'none';
        document.body.appendChild(this._shopCard);

        this._shopHoverVm = null;

        const canvas = this.dynamicCanvas;
        if (!canvas) return;

        canvas.addEventListener('mousemove', (e) => this.updateShopHover(e));
        canvas.addEventListener('mouseleave', () => this.hideShopHover());
        canvas.addEventListener('mousedown', () => this.hideShopHover());
        canvas.addEventListener('wheel', () => this.hideShopHover(), { passive: true });
    }

    updateShopHover(e) {
        if (!this.controls?.showVendingMachines || this.isAnnotating) return this.hideShopHover();

        const machines = this.serverData?.mapMarkers?.vendingMachines;
        if (!machines?.length || this.scale < 0.9) return this.hideShopHover();

        const coords = this.canvasToWorld(e.clientX, e.clientY);
        if (!coords) return this.hideShopHover();

        /* Hit-test in map-pixel space; radius converts screen px -> map px */
        const hitR = HOVER_HIT_RADIUS / this.scale;
        let best = null;
        let bestDist = hitR;
        for (const vm of machines) {
            const pt = this.worldToCanvas(vm.x, vm.y);
            const dist = Math.hypot(pt.x - coords.mapPixelX, pt.y - coords.mapPixelY);
            if (dist < bestDist) { best = vm; bestDist = dist; }
        }

        if (!best) return this.hideShopHover();

        if (this._shopHoverVm !== best) {
            this._shopHoverVm = best;
            this.renderShopHoverCard(best);
        }
        this.positionShopHoverCard(e.clientX, e.clientY);
    }

    renderShopHoverCard(vm) {
        const esc = t => this.escapeHtml(String(t ?? ''));
        const vendor = this.vendingManager;
        const icon = (id) => vendor?.itemIconHtml ? vendor.itemIconHtml(id, 'item-icon item-icon-sm') : '';
        const grid = this.worldToGrid(vm.x, vm.y);
        const orders = Array.isArray(vm.sellOrders) ? vm.sellOrders : [];

        const rows = orders.slice(0, 8).map(o => {
            const stock = Number(o.amountInStock) || 0;
            const out = stock === 0;
            return `
                <div class="shop-hover-row${out ? ' shop-hover-out' : ''}">
                    <span class="shop-hover-item">${icon(o.itemId)} x${o.quantity} ${esc(o.itemName || 'Item')}</span>
                    <span class="shop-hover-price">${o.costPerItem} ${icon(o.currencyId)} ${esc(o.currencyName || '')}
                        <span class="shop-hover-stock">(${stock})</span></span>
                </div>`;
        }).join('');

        const more = orders.length > 8
            ? `<div class="shop-hover-more">+${orders.length - 8} more…</div>` : '';
        const empty = orders.length === 0
            ? `<div class="shop-hover-more">No items for sale</div>` : '';

        this._shopCard.innerHTML = `
            <div class="shop-hover-title">${esc(vm.name || 'Shop')} <span>[${esc(grid)}]</span></div>
            ${rows}${more}${empty}`;
        this._shopCard.style.display = 'block';
    }

    positionShopHoverCard(clientX, clientY) {
        const card = this._shopCard;
        const pad = 14;
        let x = clientX + pad;
        let y = clientY + pad;
        const rect = card.getBoundingClientRect();
        if (x + rect.width > window.innerWidth - 8) x = clientX - rect.width - pad;
        if (y + rect.height > window.innerHeight - 8) y = clientY - rect.height - pad;
        card.style.left = `${Math.max(8, x)}px`;
        card.style.top = `${Math.max(8, y)}px`;
    }

    hideShopHover() {
        if (this._shopCard && this._shopCard.style.display !== 'none') {
            this._shopCard.style.display = 'none';
        }
        this._shopHoverVm = null;
    }
};

const descriptors = Object.getOwnPropertyDescriptors(Methods.prototype);
delete descriptors.constructor;
Object.defineProperties(RustPlusWebUI.prototype, descriptors);
