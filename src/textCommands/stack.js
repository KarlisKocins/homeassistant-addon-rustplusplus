const Client = require('../../index');

module.exports = {
    key: 'stack',
    execute: async (rustplus, client, command) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandStack = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxStack')}`;
        const commandStackEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxStack')}`;

        if (command.toLowerCase().startsWith(`${commandStack} `)) {
            command = command.slice(`${commandStack} `.length).trim();
        }
        else {
            command = command.slice(`${commandStackEn} `.length).trim();
        }

        const itemId = Client.client.items.getClosestItemIdByName(command);
        if (itemId === null) {
            return Client.client.intlGet(rustplus.guildId, 'noItemWithNameFound', {
                name: command
            });
        }

        const itemName = Client.client.items.getName(itemId);
        const stackDetails = Client.client.rustlabs.getStackDetailsById(itemId);
        if (stackDetails === null) {
            return Client.client.intlGet(rustplus.guildId, 'couldNotFindStackDetails', {
                name: itemName
            });
        }

        const quantity = stackDetails[2].quantity;

        return Client.client.intlGet(rustplus.guildId, 'stackSizeOfItem', {
            item: itemName,
            quantity: quantity
        });
    }
};
