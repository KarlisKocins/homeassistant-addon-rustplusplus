class VendingManager {
    constructor(app) {
        this.app = app;

        this.modal = document.getElementById('vendingModal');
        this.list = document.getElementById('vendingList');
        this.searchInput = document.getElementById('vendingSearch');
        this.countDisplay = document.getElementById('vendingCount');
        this.shopsBtn = document.getElementById('shopsButton');
        this.closeBtn = this.modal ? this.modal.querySelector('.close-vending-btn') : null;
        this.hideEmptyCheckbox = document.getElementById('hideEmptyShops');

        this.instaProfitBtn = document.getElementById('instaProfitNavBtn');
        this.instaProfitModal = document.getElementById('instaProfitModal');
        this.instaProfitList = document.getElementById('instaProfitList');
        this.instaProfitSearchInput = document.getElementById('instaProfitSearch');
        this.instaProfitCountDisplay = document.getElementById('instaProfitCount');
        this.closeInstaProfitBtn = this.instaProfitModal ? this.instaProfitModal.querySelector('.close-vending-btn') : null;

        this.vendingMachines = [];
        this.init();
    }

    init() {
        if (this.shopsBtn) {
            this.shopsBtn.addEventListener('click', () => this.open());
        }

        if (this.closeBtn) {
            this.closeBtn.addEventListener('click', () => this.close());
        }

        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.close();
            });
        }

        if (this.searchInput) {
            this.searchInput.addEventListener('input', () => this.renderList());
        }

        if (this.hideEmptyCheckbox) {
            this.hideEmptyCheckbox.addEventListener('change', () => this.renderList());
        }

        if (this.instaProfitBtn) {
            this.instaProfitBtn.addEventListener('click', () => this.openInstaProfit());
        }

        if (this.closeInstaProfitBtn) {
            this.closeInstaProfitBtn.addEventListener('click', () => this.closeInstaProfit());
        }

        if (this.instaProfitModal) {
            this.instaProfitModal.addEventListener('click', (e) => {
                if (e.target === this.instaProfitModal) this.closeInstaProfit();
            });
        }

        if (this.instaProfitSearchInput) {
            this.instaProfitSearchInput.addEventListener('input', () => this.renderInstaProfitRoutes());
        }

        window.addEventListener('languageChanged', () => {
            if (this.modal && this.modal.classList.contains('open')) {
                this.renderList();
            }

            if (this.instaProfitModal && this.instaProfitModal.classList.contains('open')) {
                this.renderInstaProfitRoutes();
            }
        });
    }

    open() {
        this.closeInstaProfit();

        if (this.modal) {
            this.modal.classList.add('open');
            this.fetchData();
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('open');
        }
    }

    openInstaProfit() {
        this.close();

        if (this.instaProfitModal) {
            this.instaProfitModal.classList.add('open');
            this.syncVendingMachinesFromApp();
            this.renderInstaProfitRoutes();
        }
    }

    closeInstaProfit() {
        if (this.instaProfitModal) {
            this.instaProfitModal.classList.remove('open');
        }
    }

    syncVendingMachinesFromApp() {
        if (this.app?.serverData?.mapMarkers?.vendingMachines &&
            Array.isArray(this.app.serverData.mapMarkers.vendingMachines)) {
            this.vendingMachines = this.app.serverData.mapMarkers.vendingMachines;
            return true;
        }

        this.vendingMachines = [];
        return false;
    }

    fetchData() {
        if (this.syncVendingMachinesFromApp()) {
            this.renderList();
        } else if (this.list) {
            const noDataMsg = this.t('vending.noItems', 'No vending machines found or data not loaded.');
            this.list.innerHTML = `<div class="vending-loading">${this.escapeHtml(noDataMsg)}</div>`;
        }
    }

    renderList() {
        if (!this.list) return;
        this.syncVendingMachinesFromApp();

        const searchTerm = (this.searchInput?.value || '').toLowerCase().trim();
        const hideEmpty = this.hideEmptyCheckbox ? this.hideEmptyCheckbox.checked : false;

        this.list.innerHTML = '';
        let visibleCount = 0;

        if (!Array.isArray(this.vendingMachines)) return;

        this.vendingMachines.forEach((vm) => {
            const items = Array.isArray(vm.sellOrders) ? vm.sellOrders : [];
            if (hideEmpty && items.length === 0) return;

            const matchesName = (vm.name || 'Vending Machine').toLowerCase().includes(searchTerm);
            const matchesItems = items.some(item =>
                (item.itemName || '').toLowerCase().includes(searchTerm) ||
                (item.currencyName || '').toLowerCase().includes(searchTerm)
            );

            if (searchTerm && !matchesName && !matchesItems) return;

            visibleCount++;

            const card = document.createElement('div');
            card.className = 'vending-machine-card';

            const grid = this.app.worldToGrid ? this.app.worldToGrid(vm.x, vm.y) : '??';
            let itemsHtml;

            if (items.length > 0) {
                const productLabel = this.t('vending.product', 'Product');
                const priceLabel = this.t('vending.price', 'Price');
                const outOfStockLabel = this.t('vending.outOfStock', '(Out of Stock)');
                const stockLabel = this.t('vending.stock', 'Stock');

                itemsHtml = `
                <div class="vm-headers" style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #aaa; margin-bottom: 4px; padding: 0 8px;">
                    <span>${this.escapeHtml(productLabel)}</span>
                    <span>${this.escapeHtml(priceLabel)}</span>
                </div>
                <div class="vm-items">
                    ${items.map(item => {
                        const outOfStock = this.toPositiveInt(item.amountInStock) === 0;
                        return `
                            <div class="vm-item ${outOfStock ? 'vm-out-of-stock' : ''}">
                                <div class="vm-item-name">
                                    <span style="color: var(--text-primary); font-weight: bold;">x${this.toPositiveInt(item.quantity)}</span>
                                    ${this.escapeHtml(item.itemName || this.fallbackItemLabel(item.itemId))}
                                    ${item.amountInStock !== undefined && item.amountInStock !== null
                                ? `<span style="color: var(--accent); margin-left: 4px; font-size: 0.85em;">(${this.toPositiveInt(item.amountInStock)} ${this.escapeHtml(stockLabel)})</span>`
                                : ''}
                                    ${outOfStock ? `<span style="color: #f44336; margin-left: 4px; font-size: 0.8em;">${this.escapeHtml(outOfStockLabel)}</span>` : ''}
                                </div>
                                <div class="vm-item-cost">
                                    ${this.toPositiveInt(item.costPerItem)} ${this.escapeHtml(item.currencyName || 'Scrap')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>`;
            } else {
                const noItemsLabel = this.t('vending.noItems', 'No items for sale');
                itemsHtml = `<div class="vm-items" style="color: #666; font-style: italic;">${this.escapeHtml(noItemsLabel)}</div>`;
            }

            const shopLabel = this.t('vending.shop', 'Shop');
            card.innerHTML = `
                <div class="vm-name">
                    <span>${this.escapeHtml(vm.name || shopLabel)} <span style="color: var(--accent); font-size: 0.9em; margin-left: 6px;">[${this.escapeHtml(grid)}]</span></span>
                </div>
                ${itemsHtml}
            `;

            this.list.appendChild(card);
        });

        if (this.countDisplay) {
            this.countDisplay.textContent = visibleCount;
        }

        if (visibleCount === 0) {
            const notFoundLabel = this.t('vending.notFound', 'No shops found matching');
            this.list.innerHTML = `<div class="vending-loading">${this.escapeHtml(notFoundLabel)} "${this.escapeHtml(searchTerm)}"</div>`;
        }
    }

    renderInstaProfitRoutes() {
        if (!this.instaProfitList) return;

        this.syncVendingMachinesFromApp();

        const searchTerm = (this.instaProfitSearchInput?.value || '').toLowerCase().trim();
        const noRoutesLabel = this.t('instaProfit.noRoutes', this.t('vending.profit.noRoutes', 'No profitable reciprocal route found.'));

        const allRoutes = this.getAllProfitableRoutes();
        const routes = searchTerm ? allRoutes.filter(route => this.routeMatchesSearch(route, searchTerm)) : allRoutes;

        if (this.instaProfitCountDisplay) {
            this.instaProfitCountDisplay.textContent = routes.length;
        }

        if (routes.length === 0) {
            this.instaProfitList.innerHTML = `<div class="vending-loading">${this.escapeHtml(noRoutesLabel)}</div>`;
            return;
        }

        const buyFrom = this.t('vending.profit.buyFrom', 'Buy From');
        const sellTo = this.t('vending.profit.sellTo', 'Sell To');
        const perCycle = this.t('vending.profit.perCycle', 'Per cycle');
        const cyclesNow = this.t('vending.profit.cyclesNow', 'Cycles now');
        const totalNow = this.t('vending.profit.totalNow', 'Total now');
        const shopLabel = this.t('vending.shop', 'Shop');

        this.instaProfitList.innerHTML = routes.map((route) => {
            const buyGrid = this.app.worldToGrid ? this.app.worldToGrid(route.buy.vm.x, route.buy.vm.y) : '??';
            const sellGrid = this.app.worldToGrid ? this.app.worldToGrid(route.sell.vm.x, route.sell.vm.y) : '??';
            const buyName = route.buy.vm.name || shopLabel;
            const sellName = route.sell.vm.name || shopLabel;
            const buyTradeText = this.formatTradeText(route.buy.order);
            const sellTradeText = this.formatTradeText(route.sell.order);

            return `
                <div class="vending-profit-route">
                    <div class="vending-profit-route-sides">
                        <div class="vending-profit-side">
                            <div class="vending-profit-side-label">${this.escapeHtml(buyFrom)}</div>
                            <div class="vending-profit-shop">${this.escapeHtml(buyName)} <span>[${this.escapeHtml(buyGrid)}]</span></div>
                            <div class="vending-profit-trade">${this.escapeHtml(buyTradeText)}</div>
                            <div class="vending-profit-cycle-trades">x${route.buy.tradesPerCycle} / cycle</div>
                        </div>
                        <div class="vending-profit-side">
                            <div class="vending-profit-side-label">${this.escapeHtml(sellTo)}</div>
                            <div class="vending-profit-shop">${this.escapeHtml(sellName)} <span>[${this.escapeHtml(sellGrid)}]</span></div>
                            <div class="vending-profit-trade">${this.escapeHtml(sellTradeText)}</div>
                            <div class="vending-profit-cycle-trades">x${route.sell.tradesPerCycle} / cycle</div>
                        </div>
                    </div>
                    <div class="vending-profit-metrics">
                        <div><strong>${this.escapeHtml(perCycle)}:</strong> +${route.cycle.profit} ${this.escapeHtml(route.cycle.currencyName)}</div>
                        <div><strong>${this.escapeHtml(cyclesNow)}:</strong> ${route.stock.cycles}</div>
                        <div><strong>${this.escapeHtml(totalNow)}:</strong> +${route.stock.totalProfit} ${this.escapeHtml(route.cycle.currencyName)}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    routeMatchesSearch(route, searchTerm) {
        const haystack = [
            route.buy.vm.name || '',
            route.sell.vm.name || '',
            route.buy.order.itemName || '',
            route.buy.order.currencyName || '',
            route.sell.order.itemName || '',
            route.sell.order.currencyName || ''
        ].join(' ').toLowerCase();

        return haystack.includes(searchTerm);
    }

    getAllProfitableRoutes() {
        if (!Array.isArray(this.vendingMachines)) return [];

        const routes = [];
        const seen = new Set();

        this.vendingMachines.forEach(sourceVm => {
            const sourceVmId = this.getVendingMachineId(sourceVm);
            const sourceOrders = Array.isArray(sourceVm.sellOrders) ? sourceVm.sellOrders : [];

            sourceOrders.forEach(sourceOrderRaw => {
                const sourceOrder = this.normalizeOrder(sourceOrderRaw);
                if (sourceOrder.quantity <= 0 || sourceOrder.costPerItem <= 0 || sourceOrder.amountInStock <= 0) return;

                this.vendingMachines.forEach(candidateVm => {
                    const candidateVmId = this.getVendingMachineId(candidateVm);
                    if (candidateVmId === sourceVmId) return;

                    const candidateOrders = Array.isArray(candidateVm.sellOrders) ? candidateVm.sellOrders : [];
                    candidateOrders.forEach(candidateOrderRaw => {
                        const candidateOrder = this.normalizeOrder(candidateOrderRaw);
                        const route = this.buildProfitableRoute(sourceVm, sourceOrder, candidateVm, candidateOrder);
                        if (!route) return;

                        const routeKey = `${sourceVmId}|${this.getOrderKey(sourceOrder)}->${candidateVmId}|${this.getOrderKey(candidateOrder)}`;
                        if (seen.has(routeKey)) return;
                        seen.add(routeKey);

                        routes.push(route);
                    });
                });
            });
        });

        routes.sort((a, b) => {
            if (b.cycle.profit !== a.cycle.profit) {
                return b.cycle.profit - a.cycle.profit;
            }
            return b.stock.totalProfit - a.stock.totalProfit;
        });

        return routes;
    }

    buildProfitableRoute(sourceVm, source, candidateVm, candidate) {
        if (candidate.quantity <= 0 || candidate.costPerItem <= 0 || candidate.amountInStock <= 0) return null;

        const reciprocalMatch =
            candidate.itemId === source.currencyId &&
            candidate.currencyId === source.itemId &&
            candidate.itemIsBlueprint === source.currencyIsBlueprint &&
            candidate.currencyIsBlueprint === source.itemIsBlueprint;

        if (!reciprocalMatch) return null;

        const g = this.gcd(source.quantity, candidate.costPerItem);
        if (g <= 0) return null;

        const buyTrades = candidate.costPerItem / g;
        const sellTrades = source.quantity / g;
        if (buyTrades <= 0 || sellTrades <= 0) return null;

        const cycleSpent = buyTrades * source.costPerItem;
        const cycleReturn = sellTrades * candidate.quantity;
        const cycleProfit = cycleReturn - cycleSpent;
        if (cycleProfit <= 0) return null;

        const maxBuyCycles = Math.floor(source.amountInStock / buyTrades);
        const maxSellCycles = Math.floor(candidate.amountInStock / sellTrades);
        const stockCycles = Math.min(maxBuyCycles, maxSellCycles);
        if (stockCycles <= 0) return null;

        return {
            buy: {
                vm: sourceVm,
                order: source,
                tradesPerCycle: buyTrades
            },
            sell: {
                vm: candidateVm,
                order: candidate,
                tradesPerCycle: sellTrades
            },
            cycle: {
                spent: cycleSpent,
                returned: cycleReturn,
                profit: cycleProfit,
                currencyName: source.currencyName
            },
            stock: {
                cycles: stockCycles,
                totalProfit: cycleProfit * stockCycles
            }
        };
    }

    normalizeOrder(order) {
        return {
            itemId: this.toPositiveInt(order?.itemId),
            currencyId: this.toPositiveInt(order?.currencyId),
            quantity: this.toPositiveInt(order?.quantity),
            costPerItem: this.toPositiveInt(order?.costPerItem),
            amountInStock: this.toPositiveInt(order?.amountInStock),
            itemIsBlueprint: this.toBoolean(order?.itemIsBlueprint),
            currencyIsBlueprint: this.toBoolean(order?.currencyIsBlueprint),
            itemName: order?.itemName || this.fallbackItemLabel(order?.itemId),
            currencyName: order?.currencyName || this.fallbackItemLabel(order?.currencyId)
        };
    }

    formatTradeText(order) {
        const bpItem = order.itemIsBlueprint ? ' (BP)' : '';
        const bpCurrency = order.currencyIsBlueprint ? ' (BP)' : '';
        return `${order.quantity}x ${order.itemName}${bpItem} for ${order.costPerItem}x ${order.currencyName}${bpCurrency}`;
    }

    getVendingMachineId(vm) {
        return `${vm?.x ?? 0}:${vm?.y ?? 0}`;
    }

    getOrderKey(order) {
        const normalized = this.normalizeOrder(order);
        return [
            normalized.itemId,
            normalized.currencyId,
            normalized.quantity,
            normalized.costPerItem,
            normalized.itemIsBlueprint ? 1 : 0,
            normalized.currencyIsBlueprint ? 1 : 0
        ].join('|');
    }

    gcd(a, b) {
        let x = Math.abs(a);
        let y = Math.abs(b);
        while (y !== 0) {
            const temp = y;
            y = x % y;
            x = temp;
        }
        return x;
    }

    toPositiveInt(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) return 0;
        return Math.max(0, Math.floor(num));
    }

    toBoolean(value) {
        return value === true || value === 1 || value === '1' || value === 'true';
    }

    fallbackItemLabel(itemId) {
        const safeId = Number.isFinite(Number(itemId)) ? Math.floor(Number(itemId)) : 0;
        return `Item ${safeId}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text === undefined || text === null ? '' : String(text);
        return div.innerHTML;
    }

    t(key, fallback) {
        return window.rustplusUI?.languageManager?.get(key) || fallback;
    }
}
