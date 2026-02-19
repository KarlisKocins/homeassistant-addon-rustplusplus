/*
    Copyright (C) 2022 Alexander Emanuelsson (alexemanuelol)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    https://github.com/alexemanuelol/rustplusplus

*/

const DiscordMessages = require('../discordTools/discordMessages.js');
const Constants = require('../util/constants.js');
const Map = require('../util/map.js');

const SAFE_ZONE_MONUMENT_TOKENS = new Set([
    'bandit_camp',
    'bandit_camp_display_name',
    'outpost',
    'outpost_display_name',
    'mining_outpost_display_name'
]);

module.exports = {
    handler: async function (rustplus, client, mapMarkers) {
        /* Handle Vending Machine changes */
        await module.exports.checkChanges(rustplus, client, mapMarkers);
    },

    checkChanges: async function (rustplus, client, mapMarkers) {
        const guildId = rustplus.guildId;
        const instance = client.getInstance(guildId);
        const subscriptionList = instance.marketSubscriptionList;
        const vendingMachineType = rustplus.mapMarkers.types.VendingMachine;
        const vendingMachines = rustplus.mapMarkers.getMarkersOfType(vendingMachineType, mapMarkers.markers);

        for (const vendingMachine of vendingMachines) {
            const x = vendingMachine.x;
            const y = vendingMachine.y;
            const vId = `${x}:${y}`;
            const sellOrders = vendingMachine.sellOrders;

            for (const order of sellOrders) {
                const itemId = order.itemId.toString();
                const currencyId = order.currencyId.toString();
                const amountInStock = order.amountInStock;

                for (const orderType of ['all', 'buy', 'sell']) {
                    const found = rustplus.foundSubscriptionItems[orderType].find(e =>
                        e.vId === vId && e.itemId === itemId && e.currencyId === currencyId);

                    const allCond = orderType === 'all' && (!(subscriptionList[orderType].includes(itemId) ||
                        subscriptionList[orderType].includes(currencyId)) || amountInStock === 0);
                    const buyCond = orderType === 'buy' && (!subscriptionList[orderType].includes(currencyId) ||
                        amountInStock === 0);
                    const sellCond = orderType === 'sell' && (!subscriptionList[orderType].includes(itemId) ||
                        amountInStock === 0);

                    if (allCond || buyCond || sellCond) {
                        rustplus.foundSubscriptionItems[orderType] = rustplus.foundSubscriptionItems[orderType]
                            .filter(e => e.vId !== vId || e.itemId !== itemId || e.currencyId !== currencyId);
                        continue;
                    }

                    if (found) continue;

                    rustplus.foundSubscriptionItems[orderType].push({
                        vId: vId,
                        itemId: itemId,
                        currencyId: currencyId
                    });

                    if (rustplus.isFirstPoll || rustplus.firstPollItems[orderType].includes(itemId) ||
                        rustplus.firstPollItems[orderType].includes(currencyId)) {
                        continue;
                    }

                    const location = Map.getPos(x, y, rustplus.info.correctedMapSize, rustplus);
                    const itemName = client.items.getName(itemId);
                    const currencyName = client.items.getName(currencyId);

                    const items = [];
                    if (subscriptionList[orderType].includes(itemId)) items.push(itemName)
                    if (subscriptionList[orderType].includes(currencyId)) items.push(currencyName)

                    const str = client.intlGet(guildId, 'itemAvailableInVendingMachine', {
                        items: items.join(', '),
                        location: location.location
                    });

                    await DiscordMessages.sendItemAvailableInVendingMachineMessage(rustplus, str);

                    if (rustplus.generalSettings.itemAvailableInVendingMachineNotifyInGame) {
                        rustplus.sendInGameMessage(str);
                    }
                    rustplus.log(client.intlGet(null, 'infoCap'), str);
                }
            }
        }

        await module.exports.checkFertilizerScrapMaxStock(rustplus, client, vendingMachines);

        for (const orderType of ['all', 'buy', 'sell']) {
            for (const foundItem of rustplus.foundSubscriptionItems[orderType]) {
                let stillPresent = false;
                for (const vendingMachine of vendingMachines) {
                    const vId = `${vendingMachine.x}:${vendingMachine.y}`;
                    if (foundItem.vId === vId) {
                        stillPresent = true;
                        break;
                    }
                }

                if (!stillPresent) {
                    rustplus.foundSubscriptionItems[orderType] = rustplus.foundSubscriptionItems[orderType]
                        .filter(e => e.vId !== foundItem.vId);
                }
            }
        }

        rustplus.firstPollItems = { all: [], buy: [], sell: [] };
    },

    checkFertilizerScrapMaxStock: async function (rustplus, client, vendingMachines) {
        const setting = rustplus.notificationSettings.fertilizerScrapMaxStockSetting;
        if (!setting) return;

        const scrapId = client.items.getIdByName('Scrap');
        const fertilizerId = client.items.getIdByName('Fertilizer');
        if (scrapId === undefined || fertilizerId === undefined) return;

        const activeOrderKeys = new Set();

        for (const vendingMachine of vendingMachines) {
            if (!module.exports.isNpcVendingMachine(vendingMachine)) continue;

            const nearestMonumentToken = module.exports.getNearestMonumentToken(rustplus, vendingMachine.x, vendingMachine.y);
            if (!SAFE_ZONE_MONUMENT_TOKENS.has(nearestMonumentToken)) continue;

            const location = Map.getPos(vendingMachine.x, vendingMachine.y, rustplus.info.correctedMapSize, rustplus);
            const sellOrders = Array.isArray(vendingMachine.sellOrders) ? vendingMachine.sellOrders : [];
            for (const order of sellOrders) {
                if (parseInt(order.itemId) !== parseInt(scrapId) || parseInt(order.currencyId) !== parseInt(fertilizerId)) {
                    continue;
                }

                const stock = Number(order.amountInStock);
                const amountInStock = Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
                const orderKey = module.exports.buildFertilizerScrapOrderKey(vendingMachine, order);
                activeOrderKeys.add(orderKey);

                if (!rustplus.fertilizerScrapStockState.hasOwnProperty(orderKey)) {
                    rustplus.fertilizerScrapStockState[orderKey] = {
                        peakStock: amountInStock,
                        alertedAtPeak: true
                    };
                    continue;
                }

                const state = rustplus.fertilizerScrapStockState[orderKey];

                if (amountInStock > state.peakStock) {
                    state.peakStock = amountInStock;
                    state.alertedAtPeak = false;
                }
                else if (amountInStock < state.peakStock) {
                    state.alertedAtPeak = false;
                }

                if (state.peakStock > 0 && amountInStock === state.peakStock && !state.alertedAtPeak) {
                    const shop = vendingMachine.name || client.intlGet(rustplus.guildId, 'vendingMachine');
                    const str = client.intlGet(rustplus.guildId, 'fertilizerScrapMaxStockReached', {
                        location: location.location,
                        stock: `${state.peakStock}`,
                        shop: shop
                    });

                    await rustplus.sendEvent(
                        setting,
                        str,
                        null,
                        Constants.COLOR_FERTILIZER_SCRAP_MAX_STOCK
                    );
                    state.alertedAtPeak = true;
                }
            }
        }

        for (const key of Object.keys(rustplus.fertilizerScrapStockState)) {
            if (!activeOrderKeys.has(key)) {
                delete rustplus.fertilizerScrapStockState[key];
            }
        }
    },

    getNearestMonumentToken: function (rustplus, x, y) {
        if (!rustplus.map || !Array.isArray(rustplus.map.monuments) || rustplus.map.monuments.length === 0) {
            return null;
        }

        let nearestToken = null;
        let shortestDistance = Number.MAX_SAFE_INTEGER;
        for (const monument of rustplus.map.monuments) {
            if (!monument || monument.x === undefined || monument.y === undefined) continue;

            const distance = Map.getDistance(x, y, monument.x, monument.y);
            if (distance < shortestDistance) {
                shortestDistance = distance;
                nearestToken = monument.token;
            }
        }

        return nearestToken;
    },

    isNpcVendingMachine: function (vendingMachine) {
        if (!vendingMachine || !vendingMachine.hasOwnProperty('steamId')) return true;
        return vendingMachine.steamId === null || vendingMachine.steamId.toString() === '0';
    },

    getBlueprintFlag: function (value) {
        return (value === true || value === 1 || value === '1' || value === 'true') ? 1 : 0;
    },

    buildFertilizerScrapOrderKey: function (vendingMachine, order) {
        const itemIsBlueprint = module.exports.getBlueprintFlag(order.itemIsBlueprint);
        const currencyIsBlueprint = module.exports.getBlueprintFlag(order.currencyIsBlueprint);
        return `${vendingMachine.x}:${vendingMachine.y}|${order.itemId}|${order.currencyId}` +
            `|${order.quantity}|${order.costPerItem}|${itemIsBlueprint}|${currencyIsBlueprint}`;
    }
}
