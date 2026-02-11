const Client = require('../../index');

module.exports = {
    key: 'market',
    execute: async (rustplus, client, command) => {
        const instance = Client.client.getInstance(rustplus.guildId);
        const prefix = rustplus.generalSettings.prefix;
        const commandMarket = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxMarket')}`;
        const commandMarketEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxMarket')}`;
        const commandSearch = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxSearch')}`;
        const commandSearchEn = `${Client.client.intlGet('en', 'commandSyntaxSearch')}`;
        const commandSub = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxSubscribe')}`;
        const commandSubEn = `${Client.client.intlGet('en', 'commandSyntaxSubscribe')}`;
        const commandUnsub = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxUnsubscribe')}`;
        const commandUnsubEn = `${Client.client.intlGet('en', 'commandSyntaxUnsubscribe')}`;
        const commandList = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxList')}`;
        const commandListEn = `${Client.client.intlGet('en', 'commandSyntaxList')}`;

        if (command.toLowerCase().startsWith(`${commandMarket} `)) {
            command = command.slice(`${commandMarket} `.length).trim();
        }
        else {
            command = command.slice(`${commandMarketEn} `.length).trim();
        }
        const subcommand = command.replace(/ .*/, '');
        command = command.slice(subcommand.length + 1);

        const orderType = command.replace(/ .*/, '');
        const name = command.slice(orderType.length + 1);

        switch (subcommand) {
            case commandSearchEn:
            case commandSearch: {
                if (!['all', 'buy', 'sell'].includes(orderType)) {
                    return Client.client.intlGet(rustplus.guildId, 'notAValidOrderType', {
                        order: orderType
                    });
                }

                const itemId = Client.client.items.getClosestItemIdByName(name);
                if (itemId === null) {
                    return Client.client.intlGet(rustplus.guildId, 'noItemWithNameFound', {
                        name: name
                    });
                }

                const locations = [];
                for (const vendingMachine of rustplus.mapMarkers.vendingMachines) {
                    if (!vendingMachine.hasOwnProperty('sellOrders')) continue;

                    for (const order of vendingMachine.sellOrders) {
                        if (order.amountInStock === 0) continue;

                        const orderItemId =
                            (Object.keys(Client.client.items.items).includes(order.itemId.toString())) ?
                                order.itemId : null;
                        const orderCurrencyId =
                            (Object.keys(Client.client.items.items).includes(order.currencyId.toString())) ?
                                order.currencyId : null;

                        if ((orderType === 'all' &&
                            (orderItemId === parseInt(itemId) || orderCurrencyId === parseInt(itemId))) ||
                            (orderType === 'buy' && orderCurrencyId === parseInt(itemId)) ||
                            (orderType === 'sell' && orderItemId === parseInt(itemId))) {
                            if (locations.includes(vendingMachine.location.location)) continue;
                            locations.push(vendingMachine.location.location);
                        }
                    }
                }

                if (locations.length === 0) {
                    return Client.client.intlGet(rustplus.guildId, 'noItemFound');
                }

                return locations.join(', ');
            } break;

            case commandSubEn:
            case commandSub: {
                if (!['all', 'buy', 'sell'].includes(orderType)) {
                    return Client.client.intlGet(rustplus.guildId, 'notAValidOrderType', {
                        order: orderType
                    });
                }

                const itemId = Client.client.items.getClosestItemIdByName(name);
                if (itemId === null) {
                    return Client.client.intlGet(rustplus.guildId, 'noItemWithNameFound', {
                        name: name
                    });
                }
                const itemName = Client.client.items.getName(itemId);


                if (instance.marketSubscriptionList[orderType].includes(itemId)) {
                    return Client.client.intlGet(rustplus.guildId, 'alreadySubscribedToItem', {
                        name: itemName
                    });
                }
                else {
                    instance.marketSubscriptionList[orderType].push(itemId);
                    rustplus.firstPollItems[orderType].push(itemId);
                    Client.client.setInstance(rustplus.guildId, instance);

                    return Client.client.intlGet(rustplus.guildId, 'justSubscribedToItem', {
                        name: itemName
                    });
                }
            } break;

            case commandUnsubEn:
            case commandUnsub: {
                if (!['all', 'buy', 'sell'].includes(orderType)) {
                    return Client.client.intlGet(rustplus.guildId, 'notAValidOrderType', {
                        order: orderType
                    });
                }

                const itemId = Client.client.items.getClosestItemIdByName(name);
                if (itemId === null) {
                    return Client.client.intlGet(rustplus.guildId, 'noItemWithNameFound', {
                        name: name
                    });
                }
                const itemName = Client.client.items.getName(itemId);

                if (instance.marketSubscriptionList[orderType].includes(itemId)) {
                    instance.marketSubscriptionList[orderType] =
                        instance.marketSubscriptionList[orderType].filter(e => e !== itemId);
                    Client.client.setInstance(rustplus.guildId, instance);

                    return Client.client.intlGet(rustplus.guildId, 'removedSubscribeItem', {
                        name: itemName
                    });
                }
                else {
                    return Client.client.intlGet(rustplus.guildId, 'notExistInSubscription', {
                        name: itemName
                    });
                }
            } break;

            case commandListEn:
            case commandList: {
                const names = { all: '', buy: '', sell: '' };
                for (const [ot, itemIds] of Object.entries(instance.marketSubscriptionList)) {
                    let counter = 0;
                    for (const itemId of itemIds) {
                        if (counter === 0) names[ot] += `${Client.client.intlGet(rustplus.guildId, ot)}: `;
                        names[ot] += `${Client.client.items.getName(itemId)} (${itemId}), `;
                        counter += 1;
                    }
                    if (counter !== 0) names[ot] = names[ot].slice(0, -2);
                }

                if (names.all === '' && names.buy === '' && names.sell === '') {
                    return Client.client.intlGet(rustplus.guildId, 'subscriptionListEmpty');
                }

                let str = '';
                for (const [ot, otString] of Object.entries(names)) {
                    str += otString;
                }

                return str;
            } break;

            default: {
                return null;
            } break;
        }
    }
};
