const Client = require('../../index');

module.exports = {
    key: 'recycle',
    execute: async (rustplus, client, command) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandRecycle = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxRecycle')}`;
        const commandRecycleEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxRecycle')}`;

        if (command.toLowerCase().startsWith(`${commandRecycle} `)) {
            command = command.slice(`${commandRecycle} `.length).trim();
        }
        else {
            command = command.slice(`${commandRecycleEn} `.length).trim();
        }

        const words = command.split(' ');
        const lastWord = words[words.length - 1];
        const lastWordLength = lastWord.length;
        const restString = command.slice(0, -(lastWordLength)).trim();

        let itemSearchName = null, itemSearchQuantity = null;
        if (isNaN(lastWord)) {
            itemSearchName = command;
            itemSearchQuantity = 1;
        }
        else {
            itemSearchName = restString;
            itemSearchQuantity = parseInt(lastWord);
        }

        const item = Client.client.items.getClosestItemIdByName(itemSearchName)
        if (item === null || itemSearchName === '') {
            const str = Client.client.intlGet(rustplus.guildId, 'noItemWithNameFound', {
                name: itemSearchName
            });
            return str;
        }

        const itemId = item;
        const itemName = Client.client.items.getName(itemId);
        const quantity = itemSearchQuantity;

        const recycleDetails = Client.client.rustlabs.getRecycleDetailsById(itemId);
        if (recycleDetails === null) {
            const str = Client.client.intlGet(rustplus.guildId, 'couldNotFindRecycleDetails', {
                name: itemName
            });
            return str;
        }

        const recycleData = Client.client.rustlabs.getRecycleDataFromArray([
            { itemId: recycleDetails[0], quantity: quantity, itemIsBlueprint: false }
        ]);

        let str = `${itemName}: `;
        for (const item of recycleData['recycler']) {
            str += `${Client.client.items.getName(item.itemId)} x${item.quantity}, `;
        }
        str = str.slice(0, -2);

        return str;
    }
};
