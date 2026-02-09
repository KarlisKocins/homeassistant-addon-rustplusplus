const Client = require('../../index');
const Timer = require('../util/timer');

module.exports = {
    key: 'craft',
    execute: async (rustplus, client, command) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandCraft = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxCraft')}`;
        const commandCraftEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxCraft')}`;

        if (command.toLowerCase().startsWith(`${commandCraft} `)) {
            command = command.slice(`${commandCraft} `.length).trim();
        }
        else {
            command = command.slice(`${commandCraftEn} `.length).trim();
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

        const craftDetails = Client.client.rustlabs.getCraftDetailsById(itemId);
        if (craftDetails === null) {
            const str = Client.client.intlGet(rustplus.guildId, 'couldNotFindCraftDetails', {
                name: itemName
            });
            return str;
        }

        let str = `${itemName} `;
        if (quantity === 1) {
            str += `(${craftDetails[2].timeString}): `;
        }
        else {
            const time = Timer.secondsToFullScale(craftDetails[2].time * quantity, '', true);
            str += `x${quantity} (${time}): `;
        }

        for (const ingredient of craftDetails[2].ingredients) {
            const ingredientName = Client.client.items.getName(ingredient.id);
            str += `${ingredientName} x${ingredient.quantity * quantity}, `;
        }

        str = str.slice(0, -2);

        return str;
    }
};
