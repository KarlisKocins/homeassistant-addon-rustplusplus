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
        this.profitPanel = document.getElementById('vendingProfitPanel');

        this.vendingMachines = [];
        this.selectedTrade = null;
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

        if (this.list) {
            this.list.addEventListener('click', (event) => this.handleTradeRowClick(event));
        }

        if (this.profitPanel) {
            this.profitPanel.addEventListener('click', (event) => {
                const closeBtn = event.target.closest('[data-action="close-profit-panel"]');
                if (closeBtn) {
                    this.selectedTrade = null;
                    this.renderList();
                }
            });
        }

        // Listen for language changes to update the modal if it's open
        window.addEventListener('languageChanged', () => {
            if (this.modal && this.modal.classList.contains('open')) {
                this.renderList();
            }
        });
    }

    open() {
        if (this.modal) {
            this.modal.classList.add('open');
            this.fetchData();
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('open');
        }
        this.selectedTrade = null;
        this.clearProfitPanel();
    }

    fetchData() {
        if (this.app?.serverData?.mapMarkers?.vendingMachines) {
            this.vendingMachines = this.app.serverData.mapMarkers.vendingMachines;
            this.renderList();
        } else {
            const noDataMsg = window.rustplusUI?.languageManager?.get('vending.noItems') || 'No vending machines found or data not loaded.';
            if (this.list) {
                this.list.innerHTML = `<div class="vending-loading">${this.escapeHtml(noDataMsg)}</div>`;
            }
            this.clearProfitPanel();
        }
    }

    renderList() {
        const searchTerm = (this.searchInput?.value || '').toLowerCase().trim();
        const hideEmpty = this.hideEmptyCheckbox ? this.hideEmptyCheckbox.checked : false;
        if (!this.list) return;
        this.list.innerHTML = '';

        let visibleCount = 0;

        if (!Array.isArray(this.vendingMachines)) return;

        this.vendingMachines.forEach((vm, vmIndex) => {
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
            const vmId = this.getVendingMachineId(vm);
            let itemsHtml;
            if (items.length > 0) {
                const productLabel = window.rustplusUI?.languageManager?.get('vending.product') || 'Producto';
                const priceLabel = window.rustplusUI?.languageManager?.get('vending.price') || 'Precio';
                const outOfStockLabel = window.rustplusUI?.languageManager?.get('vending.outOfStock') || '(Agotado)';
                const stockLabel = window.rustplusUI?.languageManager?.get('vending.stock') || 'Stock';
                const tradeRows = items.map((item, orderIndex) => {
                    const orderKey = this.getOrderKey(item);
                    const isSelected = this.selectedTrade &&
                        this.selectedTrade.vmId === vmId &&
                        this.selectedTrade.orderKey === orderKey;
                    const outOfStock = this.toPositiveInt(item.amountInStock) === 0;

                    return `
                        <div class="vm-item vm-item-clickable ${outOfStock ? 'vm-out-of-stock' : ''} ${isSelected ? 'vm-item-selected' : ''}"
                            data-vm-index="${vmIndex}"
                            data-order-index="${orderIndex}"
                            data-vm-id="${this.escapeAttribute(vmId)}"
                            data-order-key="${this.escapeAttribute(orderKey)}">
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
                }).join('');

                itemsHtml = `
                <div class="vm-headers" style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #aaa; margin-bottom: 4px; padding: 0 8px;">
                    <span>${this.escapeHtml(productLabel)}</span>
                    <span>${this.escapeHtml(priceLabel)}</span>
                </div>
                <div class="vm-items">
                    ${tradeRows}
                </div>`;
            } else {
                const noItemsLabel = window.rustplusUI?.languageManager?.get('vending.noItems') || 'Sin productos en venta';
                itemsHtml = `<div class="vm-items" style="color: #666; font-style: italic;">${this.escapeHtml(noItemsLabel)}</div>`;
            }

            const shopLabel = window.rustplusUI?.languageManager?.get('vending.shop') || 'Tienda';
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
            const notFoundLabel = window.rustplusUI?.languageManager?.get('vending.notFound') || 'No shops found matching';
            this.list.innerHTML = `<div class="vending-loading">${this.escapeHtml(notFoundLabel)} "${this.escapeHtml(searchTerm)}"</div>`;
        }

        this.renderProfitPanelFromSelection();
    }

    handleTradeRowClick(event) {
        const row = event.target.closest('.vm-item[data-vm-index][data-order-index]');
        if (!row || !this.list || !this.list.contains(row)) return;

        const vmIndex = Number.parseInt(row.dataset.vmIndex, 10);
        const orderIndex = Number.parseInt(row.dataset.orderIndex, 10);
        if (!Number.isInteger(vmIndex) || !Number.isInteger(orderIndex)) return;

        const vm = this.vendingMachines[vmIndex];
        const orders = Array.isArray(vm?.sellOrders) ? vm.sellOrders : [];
        const order = orders[orderIndex];
        if (!vm || !order) return;

        this.selectedTrade = {
            vmId: row.dataset.vmId || this.getVendingMachineId(vm),
            orderKey: row.dataset.orderKey || this.getOrderKey(order)
        };

        this.renderList();
    }

    renderProfitPanelFromSelection() {
        if (!this.profitPanel) return;
        if (!this.selectedTrade) {
            this.clearProfitPanel();
            return;
        }

        const selected = this.findSelectedTrade();
        if (!selected) {
            this.selectedTrade = null;
            this.clearProfitPanel();
            return;
        }

        const routes = this.findProfitableRoutes(selected.vm, selected.order);
        this.renderProfitPanel(selected.vm, selected.order, routes);
    }

    findSelectedTrade() {
        if (!this.selectedTrade || !Array.isArray(this.vendingMachines)) return null;

        for (const vm of this.vendingMachines) {
            const vmId = this.getVendingMachineId(vm);
            if (vmId !== this.selectedTrade.vmId) continue;

            const orders = Array.isArray(vm.sellOrders) ? vm.sellOrders : [];
            for (const order of orders) {
                if (this.getOrderKey(order) === this.selectedTrade.orderKey) {
                    return { vm, order };
                }
            }
        }

        return null;
    }

    findProfitableRoutes(sourceVm, sourceOrder) {
        const source = this.normalizeOrder(sourceOrder);
        const sourceVmId = this.getVendingMachineId(sourceVm);
        const routes = [];

        if (source.quantity <= 0 || source.costPerItem <= 0 || source.amountInStock <= 0) {
            return routes;
        }

        this.vendingMachines.forEach((candidateVm) => {
            const candidateVmId = this.getVendingMachineId(candidateVm);
            if (candidateVmId === sourceVmId) return;

            const candidateOrders = Array.isArray(candidateVm.sellOrders) ? candidateVm.sellOrders : [];
            candidateOrders.forEach((candidateOrder) => {
                const candidate = this.normalizeOrder(candidateOrder);
                if (candidate.quantity <= 0 || candidate.costPerItem <= 0 || candidate.amountInStock <= 0) return;

                const reciprocalMatch =
                    candidate.itemId === source.currencyId &&
                    candidate.currencyId === source.itemId &&
                    candidate.itemIsBlueprint === source.currencyIsBlueprint &&
                    candidate.currencyIsBlueprint === source.itemIsBlueprint;

                if (!reciprocalMatch) return;

                const g = this.gcd(source.quantity, candidate.costPerItem);
                if (g <= 0) return;

                const buyTrades = candidate.costPerItem / g;
                const sellTrades = source.quantity / g;
                if (buyTrades <= 0 || sellTrades <= 0) return;

                const cycleSpent = buyTrades * source.costPerItem;
                const cycleReturn = sellTrades * candidate.quantity;
                const cycleProfit = cycleReturn - cycleSpent;
                if (cycleProfit <= 0) return;

                const maxBuyCycles = Math.floor(source.amountInStock / buyTrades);
                const maxSellCycles = Math.floor(candidate.amountInStock / sellTrades);
                const stockCycles = Math.min(maxBuyCycles, maxSellCycles);
                if (stockCycles <= 0) return;

                const stockTotalProfit = cycleProfit * stockCycles;
                routes.push({
                    buy: {
                        vm: sourceVm,
                        vmId: sourceVmId,
                        order: source,
                        tradesPerCycle: buyTrades
                    },
                    sell: {
                        vm: candidateVm,
                        vmId: candidateVmId,
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
                        totalProfit: stockTotalProfit
                    }
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

    renderProfitPanel(sourceVm, sourceOrder, routes) {
        if (!this.profitPanel) return;

        const title = this.t('vending.profit.title', 'Insta-Profit Routes');
        const buyFrom = this.t('vending.profit.buyFrom', 'Buy From');
        const sellTo = this.t('vending.profit.sellTo', 'Sell To');
        const selectedTrade = this.t('vending.profit.selectedTrade', 'Selected Trade');
        const perCycle = this.t('vending.profit.perCycle', 'Per cycle');
        const cyclesNow = this.t('vending.profit.cyclesNow', 'Cycles now');
        const totalNow = this.t('vending.profit.totalNow', 'Total now');
        const noRoutes = this.t('vending.profit.noRoutes', 'No profitable reciprocal route found.');
        const close = this.t('vending.profit.close', 'Close');
        const shopLabel = this.t('vending.shop', 'Shop');

        const sourceGrid = this.app.worldToGrid ? this.app.worldToGrid(sourceVm.x, sourceVm.y) : '??';
        const sourceName = sourceVm.name || shopLabel;
        const sourceTrade = this.formatTradeText(this.normalizeOrder(sourceOrder));

        const routeHtml = routes.length === 0
            ? `<div class="vending-profit-empty">${this.escapeHtml(noRoutes)}</div>`
            : routes.map((route) => {
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

        this.profitPanel.innerHTML = `
            <div class="vending-profit-header">
                <h3>${this.escapeHtml(title)}</h3>
                <button type="button" class="vending-profit-close" data-action="close-profit-panel">${this.escapeHtml(close)}</button>
            </div>
            <div class="vending-profit-selected">
                <span class="vending-profit-selected-label">${this.escapeHtml(selectedTrade)}:</span>
                <span>${this.escapeHtml(sourceName)} <span>[${this.escapeHtml(sourceGrid)}]</span> - ${this.escapeHtml(sourceTrade)}</span>
            </div>
            <div class="vending-profit-routes">
                ${routeHtml}
            </div>
        `;

        this.profitPanel.classList.add('active');
    }

    clearProfitPanel() {
        if (!this.profitPanel) return;
        this.profitPanel.classList.remove('active');
        this.profitPanel.innerHTML = '';
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

    escapeAttribute(text) {
        return this.escapeHtml(text).replace(/"/g, '&quot;');
    }

    t(key, fallback) {
        return window.rustplusUI?.languageManager?.get(key) || fallback;
    }
}
