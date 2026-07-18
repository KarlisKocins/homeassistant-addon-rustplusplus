/* Raid Planner Manager for WebUI */
export class RaidPlannerManager {
    constructor() {
        this.selectedItems = {};
        this.container = null;

        // Rust raiding cost data: how many of each explosive to destroy each structure
        // Source: rustlabs.com (as of 2024)
        this.structures = {
            'wood_wall': {
                name: 'Wood Wall', icon: '🪵', hp: 250, category: 'walls',
                costs: { c4: 1, rocket: 2, satchel: 3, expAmmo: 49, incRocket: 1 }
            },
            'stone_wall': {
                name: 'Stone Wall', icon: '🧱', hp: 500, category: 'walls',
                costs: { c4: 2, rocket: 4, satchel: 10, expAmmo: 185, incRocket: 0 }
            },
            'metal_wall': {
                name: 'Metal Wall', icon: '🔩', hp: 1000, category: 'walls',
                costs: { c4: 4, rocket: 8, satchel: 23, expAmmo: 400, incRocket: 0 }
            },
            'hqm_wall': {
                name: 'HQM Wall', icon: '💎', hp: 2000, category: 'walls',
                costs: { c4: 8, rocket: 15, satchel: 46, expAmmo: 799, incRocket: 0 }
            },
            'wood_door': {
                name: 'Wooden Door', icon: '🚪', hp: 200, category: 'doors',
                costs: { c4: 1, rocket: 1, satchel: 2, expAmmo: 19, incRocket: 1 }
            },
            'sheet_door': {
                name: 'Sheet Metal Door', icon: '🚪', hp: 250, category: 'doors',
                costs: { c4: 1, rocket: 2, satchel: 4, expAmmo: 63, incRocket: 0 }
            },
            'armored_door': {
                name: 'Armored Door', icon: '🛡️', hp: 800, category: 'doors',
                costs: { c4: 2, rocket: 4, satchel: 12, expAmmo: 200, incRocket: 0 }
            },
            'garage_door': {
                name: 'Garage Door', icon: '🏗️', hp: 600, category: 'doors',
                costs: { c4: 2, rocket: 3, satchel: 9, expAmmo: 150, incRocket: 0 }
            },
            'ladder_hatch': {
                name: 'Ladder Hatch', icon: '🪜', hp: 250, category: 'doors',
                costs: { c4: 1, rocket: 2, satchel: 4, expAmmo: 63, incRocket: 0 }
            },
            'stone_foundation': {
                name: 'Stone Foundation', icon: '🏠', hp: 500, category: 'building',
                costs: { c4: 2, rocket: 4, satchel: 10, expAmmo: 185, incRocket: 0 }
            },
            'metal_foundation': {
                name: 'Metal Foundation', icon: '🏢', hp: 1000, category: 'building',
                costs: { c4: 4, rocket: 8, satchel: 23, expAmmo: 400, incRocket: 0 }
            },
            'stone_floor': {
                name: 'Stone Floor', icon: '⬜', hp: 500, category: 'building',
                costs: { c4: 2, rocket: 4, satchel: 10, expAmmo: 185, incRocket: 0 }
            },
            'metal_floor': {
                name: 'Metal Floor', icon: '⬛', hp: 1000, category: 'building',
                costs: { c4: 4, rocket: 8, satchel: 23, expAmmo: 400, incRocket: 0 }
            },
            'high_external_stone': {
                name: 'High External Stone Wall', icon: '🏰', hp: 500, category: 'external',
                costs: { c4: 2, rocket: 4, satchel: 10, expAmmo: 185, incRocket: 0 }
            },
            'high_external_wood': {
                name: 'High External Wood Wall', icon: '🌲', hp: 500, category: 'external',
                costs: { c4: 1, rocket: 2, satchel: 3, expAmmo: 49, incRocket: 1 }
            },
            'tc': {
                name: 'Tool Cupboard', icon: '📦', hp: 0, category: 'deployables',
                costs: { c4: 1, rocket: 1, satchel: 2, expAmmo: 30, incRocket: 0 }
            }
        };

        // Explosive crafting costs (sulfur required per unit)
        this.explosiveCosts = {
            c4: { name: 'Timed Explosive (C4)', sulfur: 2200, icon: '💣' },
            rocket: { name: 'Rocket', sulfur: 1400, icon: '🚀' },
            satchel: { name: 'Satchel Charge', sulfur: 480, icon: '🎒' },
            expAmmo: { name: 'Explosive 5.56 (x1)', sulfur: 25, icon: '🔫' },
            incRocket: { name: 'Incendiary Rocket', sulfur: 610, icon: '🔥' }
        };
    }

    show() {
        const modal = document.getElementById('raidPlannerModal');
        if (!modal) return;
        modal.style.display = 'flex';
        this.container = document.getElementById('raidPlannerContent');
        if (!this.container) return;

        // Load saved plans from localStorage
        const saved = localStorage.getItem('raidPlannerItems');
        if (saved) {
            try { this.selectedItems = JSON.parse(saved); } catch { this.selectedItems = {}; }
        }

        this.render();
    }

    hide() {
        const modal = document.getElementById('raidPlannerModal');
        if (modal) modal.style.display = 'none';
    }

    render() {
        if (!this.container) return;

        const categories = {
            walls: '🧱 Walls',
            doors: '🚪 Doors & Hatches',
            building: '🏠 Building Parts',
            external: '🏰 External',
            deployables: '📦 Deployables'
        };

        let html = '<div class="raid-planner-layout">';

        // Left column: structure selector
        html += '<div class="raid-structures-panel">';
        html += '<h3>Select Structures</h3>';

        for (const [catKey, catName] of Object.entries(categories)) {
            const items = Object.entries(this.structures).filter(([_, s]) => s.category === catKey);
            if (items.length === 0) continue;

            html += `<div class="raid-category"><div class="raid-category-title">${catName}</div>`;
            items.forEach(([key, struct]) => {
                const qty = this.selectedItems[key] || 0;
                html += `
                    <div class="raid-structure-item ${qty > 0 ? 'active' : ''}">
                        <span class="raid-item-icon">${struct.icon}</span>
                        <span class="raid-item-name">${struct.name}</span>
                        <div class="raid-qty-controls">
                            <button class="raid-qty-btn minus" onclick="window.raidPlanner.changeQty('${key}', -1)">−</button>
                            <span class="raid-qty-value">${qty}</span>
                            <button class="raid-qty-btn plus" onclick="window.raidPlanner.changeQty('${key}', 1)">+</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }
        html += '</div>';

        // Right column: cost breakdown
        html += '<div class="raid-costs-panel">';
        html += '<h3>Cost Breakdown</h3>';

        const totals = this.calculateTotals();
        const hasItems = Object.values(this.selectedItems).some(v => v > 0);

        if (hasItems) {
            // Summary of selected items
            html += '<div class="raid-selected-summary">';
            for (const [key, qty] of Object.entries(this.selectedItems)) {
                if (qty <= 0) continue;
                const struct = this.structures[key];
                html += `<div class="raid-selected-item">${struct.icon} ${struct.name} × ${qty}</div>`;
            }
            html += '</div>';

            // Cost comparison table
            html += '<div class="raid-comparison-title">Explosive Options</div>';
            html += '<div class="raid-comparison-grid">';

            for (const [expKey, expData] of Object.entries(this.explosiveCosts)) {
                const count = totals[expKey] || 0;
                if (count === 0) continue;
                const sulfurTotal = count * expData.sulfur;

                html += `
                    <div class="raid-cost-card">
                        <div class="raid-cost-header">
                            <span class="raid-cost-icon">${expData.icon}</span>
                            <span class="raid-cost-name">${expData.name}</span>
                        </div>
                        <div class="raid-cost-amount">× ${count}</div>
                        <div class="raid-cost-sulfur">
                            <span class="sulfur-icon">🟡</span>
                            <span>${sulfurTotal.toLocaleString()} sulfur</span>
                        </div>
                    </div>
                `;
            }
            html += '</div>';

            // Cheapest method highlight
            const cheapest = this.findCheapest(totals);
            if (cheapest) {
                html += `
                    <div class="raid-cheapest">
                        <div class="raid-cheapest-title">💡 Cheapest Method</div>
                        <div class="raid-cheapest-method">
                            ${this.explosiveCosts[cheapest.type].icon} ${cheapest.count}× ${this.explosiveCosts[cheapest.type].name}
                        </div>
                        <div class="raid-cheapest-sulfur">🟡 ${cheapest.sulfur.toLocaleString()} total sulfur</div>
                    </div>
                `;
            }

            // Action buttons
            html += `
                <div class="raid-actions">
                    <button class="raid-btn-clear" onclick="window.raidPlanner.clearAll()">🗑️ Clear All</button>
                    <button class="raid-btn-save" onclick="window.raidPlanner.savePlan()">💾 Save Plan</button>
                </div>
            `;
        } else {
            html += `
                <div class="raid-empty">
                    <span class="raid-empty-icon">🎯</span>
                    <span class="raid-empty-text">Select structures to raid</span>
                    <span class="raid-empty-hint">Add walls, doors, and other structures to calculate explosive costs</span>
                </div>
            `;
        }

        html += '</div>'; // costs panel
        html += '</div>'; // layout

        this.container.innerHTML = html;
    }

    changeQty(key, delta) {
        const current = this.selectedItems[key] || 0;
        const newQty = Math.max(0, current + delta);
        if (newQty === 0) {
            delete this.selectedItems[key];
        } else {
            this.selectedItems[key] = newQty;
        }
        this.render();
    }

    calculateTotals() {
        const totals = { c4: 0, rocket: 0, satchel: 0, expAmmo: 0, incRocket: 0 };

        for (const [key, qty] of Object.entries(this.selectedItems)) {
            if (qty <= 0) continue;
            const struct = this.structures[key];
            if (!struct) continue;

            for (const [expType, count] of Object.entries(struct.costs)) {
                totals[expType] += count * qty;
            }
        }

        return totals;
    }

    findCheapest(totals) {
        let cheapest = null;

        for (const [type, count] of Object.entries(totals)) {
            if (count === 0) continue;
            const sulfur = count * this.explosiveCosts[type].sulfur;
            if (!cheapest || sulfur < cheapest.sulfur) {
                cheapest = { type, count, sulfur };
            }
        }

        return cheapest;
    }

    clearAll() {
        this.selectedItems = {};
        localStorage.removeItem('raidPlannerItems');
        this.render();
    }

    savePlan() {
        localStorage.setItem('raidPlannerItems', JSON.stringify(this.selectedItems));
        // Brief visual feedback
        const btn = this.container.querySelector('.raid-btn-save');
        if (btn) {
            const original = btn.innerHTML;
            btn.innerHTML = '✅ Saved!';
            setTimeout(() => { btn.innerHTML = original; }, 1500);
        }
    }
}

// Initialize globally
window.raidPlanner = new RaidPlannerManager();
