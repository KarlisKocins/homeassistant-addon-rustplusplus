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
        const buyAction = this.t('vending.profit.buyAction', 'Buy');
        const sellAction = this.t('vending.profit.sellAction', 'Sell');
        const totalNow = this.t('vending.profit.totalNow', 'Total profit now');
        const tradesLabel = this.t('vending.profit.trades', 'trades');
        const leftoverLabel = this.t('vending.profit.leftover', 'Leftover');
        const shopLabel = this.t('vending.shop', 'Shop');

        this.instaProfitList.innerHTML = routes.map((route) => {
            const buyGrid = this.app.worldToGrid ? this.app.worldToGrid(route.buy.vm.x, route.buy.vm.y) : '??';
            const sellGrid = this.app.worldToGrid ? this.app.worldToGrid(route.sell.vm.x, route.sell.vm.y) : '??';
            const buyName = route.buy.vm.name || shopLabel;
            const sellName = route.sell.vm.name || shopLabel;
            const buyTradeText = this.formatBuyCycleTradeText(route.buyCycle, buyAction);
            const sellTradeText = this.formatSellCycleTradeText(route.sellCycle, sellAction);

            return `
                <div class="vending-profit-route">
                    <div class="vending-profit-route-sides">
                        <div class="vending-profit-side">
                            <div class="vending-profit-side-label">${this.escapeHtml(buyFrom)}</div>
                            <div class="vending-profit-shop">${this.escapeHtml(buyName)} <span>[${this.escapeHtml(buyGrid)}]</span></div>
                            <div class="vending-profit-trade">${this.escapeHtml(buyTradeText)}</div>
                            <div class="vending-profit-cycle-trades">x${route.buy.tradesPerCycle} ${this.escapeHtml(tradesLabel)}</div>
                        </div>
                        <div class="vending-profit-side">
                            <div class="vending-profit-side-label">${this.escapeHtml(sellTo)}</div>
                            <div class="vending-profit-shop">${this.escapeHtml(sellName)} <span>[${this.escapeHtml(sellGrid)}]</span></div>
                            <div class="vending-profit-trade">${this.escapeHtml(sellTradeText)}</div>
                            <div class="vending-profit-cycle-trades">x${route.sell.tradesPerCycle} ${this.escapeHtml(tradesLabel)}</div>
                        </div>
                    </div>
                    <div class="vending-profit-metrics">
                        <div><strong>${this.escapeHtml(totalNow)}:</strong> +${route.stock.totalProfit} ${this.escapeHtml(route.cycle.currencyName)}</div>
                        ${route.stock.midLeftover > 0
                            ? `<div><strong>${this.escapeHtml(leftoverLabel)}:</strong> ${route.stock.midLeftover} ${this.escapeHtml(route.buyCycle.getItemName)}</div>`
                            : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    routeMatchesSearch(route, searchTerm) {
        const buyAction = this.t('vending.profit.buyAction', 'Buy');
        const sellAction = this.t('vending.profit.sellAction', 'Sell');

        const haystack = [
            route.buy.vm.name || '',
            route.sell.vm.name || '',
            route.buy.order.itemName || '',
            route.buy.order.currencyName || '',
            route.sell.order.itemName || '',
            route.sell.order.currencyName || '',
            route.buyCycle?.getItemName || '',
            route.buyCycle?.spendItemName || '',
            route.sellCycle?.getItemName || '',
            route.sellCycle?.spendItemName || '',
            this.formatBuyCycleTradeText(route.buyCycle, buyAction),
            this.formatSellCycleTradeText(route.sellCycle, sellAction)
        ].join(' ').toLowerCase();

        return haystack.includes(searchTerm);
    }

    getAllProfitableRoutes() {
        if (!Array.isArray(this.vendingMachines)) return [];

        const shops = this.vendingMachines.map((vm) => ({
            vm,
            orders: this.getAggregatedOrders(vm)
        }));

        const routes = [];
        const seen = new Set();

        /*
            Two-step flip A->B->A: start with a currency, buy a middle item in shop1,
            then spend that middle item as currency in shop2 to get the original currency back.
            Every ordered (shop1, shop2) pair is evaluated, so the reverse direction is covered
            when the indices swap; the signature dedupes the two.
        */
        for (let i = 0; i < shops.length; i++) {
            const s1 = shops[i];
            for (let j = 0; j < shops.length; j++) {
                const s2 = shops[j];

                for (const o1 of s1.orders) {
                    if (o1.amountInStock <= 0) continue;
                    for (const o2 of s2.orders) {
                        if (o2.amountInStock <= 0) continue;

                        const route = this.simulateSequence(s1.vm, o1, s2.vm, o2);
                        if (!route) continue;

                        const sig = this.makeFlipSignature(route, i, j);
                        if (seen.has(sig)) continue;
                        seen.add(sig);

                        routes.push(route);
                    }
                }
            }
        }

        routes.sort((a, b) => {
            if (b.cycle.profit !== a.cycle.profit) {
                return b.cycle.profit - a.cycle.profit;
            }
            return b.stock.totalProfit - a.stock.totalProfit;
        });

        return routes;
    }

    /*
        Simulate running (shop1, o1) `runs1` times, then spending the produced middle item in
        (shop2, o2). Leftover middle item is allowed. Returns the run count that maximizes profit
        within current stock, or null if no profitable combination exists.
    */
    simulateSequence(shop1, o1, shop2, o2) {
        const startId = o1.currencyId;          // currency we start and end with
        const startAmt = o1.costPerItem;        // start currency spent per step-1 trade
        const startName = o1.currencyName;
        const startIsBp = o1.currencyIsBlueprint;

        const midId = o1.itemId;                // middle item produced by step 1
        const midAmt = o1.quantity;             // middle item gained per step-1 trade
        const midName = o1.itemName;
        const midIsBp = o1.itemIsBlueprint;

        const stock1 = o1.amountInStock;
        const pay2Amt = o2.costPerItem;         // middle item spent per step-2 trade
        const get2Amt = o2.quantity;            // start currency gained per step-2 trade
        const stock2 = o2.amountInStock;

        /* Guards */
        if (startAmt <= 0 || midAmt <= 0 || stock1 <= 0) return null;
        if (pay2Amt <= 0 || get2Amt <= 0 || stock2 <= 0) return null;
        if (startId === 0 || midId === 0 || startId === midId) return null;

        /* Chain must link by item id (and blueprint state), not by name */
        if (o2.currencyId !== midId || o2.currencyIsBlueprint !== midIsBp) return null;
        if (o2.itemId !== startId || o2.itemIsBlueprint !== startIsBp) return null;

        let best = null;
        for (let runs1 = 1; runs1 <= stock1; runs1++) {
            const spentStart = runs1 * startAmt;
            const midProduced = runs1 * midAmt;

            const runs2 = Math.min(Math.floor(midProduced / pay2Amt), stock2);
            if (runs2 <= 0) continue;

            const midConsumed = runs2 * pay2Amt;
            const startBack = runs2 * get2Amt;
            const profit = startBack - spentStart;
            if (profit <= 0) continue;

            if (!best || profit > best.profit) {
                best = { runs1, runs2, spentStart, midProduced, midConsumed, startBack, profit };
            }
        }

        if (!best) return null;

        return {
            buy: {
                vm: shop1,
                order: o1,
                tradesPerCycle: best.runs1
            },
            sell: {
                vm: shop2,
                order: o2,
                tradesPerCycle: best.runs2
            },
            buyCycle: {
                spendAmount: best.spentStart,
                spendItemName: startName,
                spendItemIsBlueprint: startIsBp,
                getAmount: best.midProduced,
                getItemName: midName,
                getItemIsBlueprint: midIsBp
            },
            sellCycle: {
                spendAmount: best.midConsumed,
                spendItemName: midName,
                spendItemIsBlueprint: midIsBp,
                getAmount: best.startBack,
                getItemName: startName,
                getItemIsBlueprint: startIsBp
            },
            cycle: {
                spent: best.spentStart,
                returned: best.startBack,
                profit: best.profit,
                currencyName: startName
            },
            stock: {
                cycles: 1,
                totalProfit: best.profit,
                midLeftover: best.midProduced - best.midConsumed
            }
        };
    }

    makeFlipSignature(route, i, j) {
        let a = i;
        let b = j;
        if (a > b) { const tmp = a; a = b; b = tmp; }

        const startId = route.buy.order.currencyId;
        const midId = route.buy.order.itemId;
        return `${startId}|${midId}|${a}|${b}`;
    }

    normalizeOrder(order) {
        return {
            /* Rust item ids are signed hashes and usually negative - never clamp them */
            itemId: this.toInt(order?.itemId),
            currencyId: this.toInt(order?.currencyId),
            quantity: this.toPositiveInt(order?.quantity),
            costPerItem: this.toPositiveInt(order?.costPerItem),
            amountInStock: this.toPositiveInt(order?.amountInStock),
            itemIsBlueprint: this.toBoolean(order?.itemIsBlueprint),
            currencyIsBlueprint: this.toBoolean(order?.currencyIsBlueprint),
            itemName: order?.itemName || this.fallbackItemLabel(order?.itemId),
            currencyName: order?.currencyName || this.fallbackItemLabel(order?.currencyId)
        };
    }

    getAggregatedOrders(vm) {
        const rawOrders = Array.isArray(vm?.sellOrders) ? vm.sellOrders : [];
        const mergedOrders = new Map();

        rawOrders.forEach((rawOrder) => {
            const normalized = this.normalizeOrder(rawOrder);
            const key = this.getOrderKey(normalized);
            const existing = mergedOrders.get(key);

            if (!existing) {
                mergedOrders.set(key, normalized);
                return;
            }

            existing.amountInStock += normalized.amountInStock;
        });

        return Array.from(mergedOrders.values());
    }

    formatBuyCycleTradeText(cycle, buyAction) {
        if (!cycle) return '';
        const getText = this.formatCycleAmountText(cycle.getAmount, cycle.getItemName, cycle.getItemIsBlueprint);
        const spendText = this.formatCycleAmountText(cycle.spendAmount, cycle.spendItemName, cycle.spendItemIsBlueprint);
        return `${buyAction} ${getText} for ${spendText}`;
    }

    formatSellCycleTradeText(cycle, sellAction) {
        if (!cycle) return '';
        const spendText = this.formatCycleAmountText(cycle.spendAmount, cycle.spendItemName, cycle.spendItemIsBlueprint);
        const getText = this.formatCycleAmountText(cycle.getAmount, cycle.getItemName, cycle.getItemIsBlueprint);
        return `${sellAction} ${spendText} for ${getText}`;
    }

    formatCycleAmountText(amount, itemName, isBlueprint) {
        const bpItem = isBlueprint ? ' (BP)' : '';
        return `${amount}x ${itemName}${bpItem}`;
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

    toPositiveInt(value) {
        const num = Number(value);
        if (!Number.isFinite(num)) return 0;
        return Math.max(0, Math.floor(num));
    }

    toInt(value) {
        const num = Number(value);
        return Number.isFinite(num) ? Math.trunc(num) : 0;
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
