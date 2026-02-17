class VendingManager {
    constructor(app) {
        this.app = app;
        this.modal = document.getElementById('vendingModal');
        this.list = document.getElementById('vendingList');
        this.searchInput = document.getElementById('vendingSearch');
        this.countDisplay = document.getElementById('vendingCount');
        this.shopsBtn = document.getElementById('shopsButton');
        this.closeBtn = document.querySelector('.close-vending-btn');
        this.hideEmptyCheckbox = document.getElementById('hideEmptyShops');
        this.instantProfitCheckbox = document.getElementById('showInstantProfitOnly');

        this.vendingMachines = []; // Store raw data
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

        if (this.instantProfitCheckbox) {
            this.instantProfitCheckbox.addEventListener('change', () => this.renderList());
        }

        // Listen for language changes to update the modal if it's open
        window.addEventListener('languageChanged', () => {
            if (this.modal && this.modal.classList.contains('open')) {
                // Modal is open, re-render the list to update translations
                this.renderList();
            }
        });
    }

    open() {
        if (this.modal) {
            this.modal.classList.add('open');
            // Always fetch and render data to ensure current language is used
            this.fetchData();
        }
    }

    close() {
        if (this.modal) {
            this.modal.classList.remove('open');
        }
    }

    fetchData() {
        // Try to get data from main app state first
        if (this.app?.serverData?.mapMarkers?.vendingMachines) {
            this.vendingMachines = this.app.serverData.mapMarkers.vendingMachines;
            this.renderList();
        } else {
            // If data isn't ready or structured differently, show empty/loading state
            const noDataMsg = window.rustplusUI?.languageManager?.get('vending.noItems') || 'No vending machines found or data not loaded.';
            this.list.innerHTML = `<div class="vending-loading">${noDataMsg}</div>`;
        }
    }

    renderList() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const hideEmpty = this.hideEmptyCheckbox ? this.hideEmptyCheckbox.checked : false;
        const showInstantProfitOnly = this.instantProfitCheckbox ? this.instantProfitCheckbox.checked : false;
        this.list.innerHTML = '';

        let visibleCount = 0;

        // Ensure we have an array
        if (!Array.isArray(this.vendingMachines)) return;

        const instantProfitOrderKeys = this.getInstantProfitOrderKeys();

        // Filter and map logic
        // Note: Real vending items data structure depends on Rust+ API response.
        // Usually: { id, x, y, name, sellParams: [...], ... }
        // If we don't have full item details in marker data, we might need to fetch it separately 
        // or rely on what's available. Assuming markers contain basic info or items.

        // IMPORTANT: Common Rust maps only give location for markers. 
        // Full Vending info (items) usually requires a separate API call per machine or a bulk dump.
        // For this implementation, we will display what is available. 
        // If items are not available in mapMarkers, we'll display a placeholder or need a real backend proxy.
        // Assuming the `serverData` passed via socket includes vending contents for this customized backend.

        const machineData = this.vendingMachines.map(vm => {
            // Mock items if not present for UI testing purposes (remove in prod if real data flows)
            // Real Rust+ data usually nests items in `sell_orders` if enriched by backend
            const items = vm.sellOrders || [];
            const inStockItems = items.filter(item => (item.amountInStock ?? 0) > 0);

            return {
                vm,
                items,
                inStockItems
            };
        });

        machineData.forEach(({ vm, items, inStockItems }) => {

            // Filter empty shops if checkbox is checked
            if (hideEmpty && inStockItems.length === 0) return;

            // Basic Search: Match Machine Name or Item Names
            const matchesName = (vm.name || 'Vending Machine').toLowerCase().includes(searchTerm);
            const matchesItems = items.some(item =>
                (item.itemName || '').toLowerCase().includes(searchTerm)
            );

            if (searchTerm && !matchesName && !matchesItems) return;

            if (showInstantProfitOnly) {
                const hasInstantProfitOrder = inStockItems.some(item => instantProfitOrderKeys.has(this.buildOrderKey(item)));
                if (!hasInstantProfitOrder) return;
            }

            visibleCount++;

            // Create Card
            const card = document.createElement('div');
            card.className = 'vending-machine-card';

            // Calculate Grid Position
            const grid = this.app.worldToGrid ? this.app.worldToGrid(vm.x, vm.y) : '??';

            // Calculate distance if player pos is known
            let distanceHtml = '';
            // if (this.app.myPlayerPos) { ... calc distance ... }

            let itemsHtml = '';
            if (items.length > 0) {
                const productLabel = window.rustplusUI?.languageManager?.get('vending.product') || 'Producto';
                const priceLabel = window.rustplusUI?.languageManager?.get('vending.price') || 'Precio';
                const outOfStockLabel = window.rustplusUI?.languageManager?.get('vending.outOfStock') || '(Agotado)';

                const stockLabel = window.rustplusUI?.languageManager?.get('vending.stock') || 'Stock';

                itemsHtml = `
                <div class="vm-headers" style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #aaa; margin-bottom: 4px; padding: 0 8px;">
                    <span>${productLabel}</span>
                    <span>${priceLabel}</span>
                </div>
                <div class="vm-items">
                    ${items.map(item => `
                        <div class="vm-item ${item.amountInStock === 0 ? 'vm-out-of-stock' : ''}">
                            <div class="vm-item-name">
                                <span style="color: var(--text-primary); font-weight: bold;">x${item.quantity}</span> ${item.itemName}
                                ${item.amountInStock !== undefined && item.amountInStock !== null ? `<span style="color: var(--accent); margin-left: 4px; font-size: 0.85em;">(${item.amountInStock} ${stockLabel})</span>` : ''}
                                ${item.amountInStock === 0 ? `<span style="color: #f44336; margin-left: 4px; font-size: 0.8em;">${outOfStockLabel}</span>` : ''}
                            </div>
                            <div class="vm-item-cost">
                                ${item.costPerItem} ${item.currencyName || 'Scrap'}
                            </div>
                        </div>
                    `).join('')}
                </div>`;
            } else {
                const noItemsLabel = window.rustplusUI?.languageManager?.get('vending.noItems') || 'Sin productos en venta';
                itemsHtml = `<div class="vm-items" style="color: #666; font-style: italic;">${noItemsLabel}</div>`;
            }

            const shopLabel = window.rustplusUI?.languageManager?.get('vending.shop') || 'Tienda';
            card.innerHTML = `
                <div class="vm-name">
                    <span>${vm.name || shopLabel} <span style="color: var(--accent); font-size: 0.9em; margin-left: 6px;">[${grid}]</span></span>
                    <span class="vm-distance">${distanceHtml}</span>
                </div>
                ${itemsHtml}
            `;

            this.list.appendChild(card);
        });

        this.countDisplay.textContent = visibleCount;

        if (visibleCount === 0) {
            const notFoundLabel = window.rustplusUI?.languageManager?.get('vending.notFound') || 'No shops found matching';
            this.list.innerHTML = `<div class="vending-loading">${notFoundLabel} "${searchTerm}"</div>`;
        }
    }

    buildOrderKey(order) {
        if (!order) return '';

        const itemIdentity = [
            order.itemId ?? order.itemDefinitionId ?? order.itemDefId ?? order.itemShortName ?? order.itemName ?? '',
            order.isItemBlueprint ?? order.itemIsBlueprint ?? false
        ].join('|');

        const currencyIdentity = [
            order.currencyId ?? order.currencyDefinitionId ?? order.costItemId ?? order.currencyShortName ?? order.currencyName ?? '',
            order.currencyIsBlueprint ?? false
        ].join('|');

        return [
            itemIdentity,
            Number(order.quantity ?? 0),
            currencyIdentity,
            Number(order.costPerItem ?? order.price ?? 0)
        ].join('::');
    }

    getInstantProfitOrderKeys() {
        const keys = new Set();

        if (!Array.isArray(this.vendingMachines)) return keys;

        const allOrders = this.vendingMachines.flatMap(vm => (
            Array.isArray(vm.sellOrders)
                ? vm.sellOrders.filter(order => Number(order?.amountInStock ?? 0) > 0)
                : []
        ));

        allOrders.forEach(orderA => {
            const quantityA = Number(orderA?.quantity ?? 0);
            const costA = Number(orderA?.costPerItem ?? orderA?.price ?? 0);
            if (!quantityA || !costA) return;

            allOrders.forEach(orderB => {
                if (orderA === orderB) return;

                const quantityB = Number(orderB?.quantity ?? 0);
                const costB = Number(orderB?.costPerItem ?? orderB?.price ?? 0);
                if (!quantityB || !costB) return;

                const aItemId = orderA.itemId ?? orderA.itemDefinitionId ?? orderA.itemDefId ?? orderA.itemShortName ?? orderA.itemName;
                const bItemId = orderB.itemId ?? orderB.itemDefinitionId ?? orderB.itemDefId ?? orderB.itemShortName ?? orderB.itemName;
                const aCurrencyId = orderA.currencyId ?? orderA.currencyDefinitionId ?? orderA.costItemId ?? orderA.currencyShortName ?? orderA.currencyName;
                const bCurrencyId = orderB.currencyId ?? orderB.currencyDefinitionId ?? orderB.costItemId ?? orderB.currencyShortName ?? orderB.currencyName;

                const aItemBp = Boolean(orderA.isItemBlueprint ?? orderA.itemIsBlueprint ?? false);
                const bItemBp = Boolean(orderB.isItemBlueprint ?? orderB.itemIsBlueprint ?? false);
                const aCurrencyBp = Boolean(orderA.currencyIsBlueprint ?? false);
                const bCurrencyBp = Boolean(orderB.currencyIsBlueprint ?? false);

                const isReversePair =
                    aItemId === bCurrencyId &&
                    aCurrencyId === bItemId &&
                    aItemBp === bCurrencyBp &&
                    aCurrencyBp === bItemBp;

                if (!isReversePair) return;

                const aToBCost = costA / quantityA;
                const bToAValue = quantityB / costB;
                const netReturn = aToBCost * bToAValue;

                if (netReturn > 1) {
                    keys.add(this.buildOrderKey(orderA));
                    keys.add(this.buildOrderKey(orderB));
                }
            });
        });

        return keys;
    }

}
