const Client = require('../../index');

module.exports = {
    key: 'despawn',
    execute: async (rustplus, client, command) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandDespawn = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxDespawn')}`;
        const commandDespawnEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxDespawn')}`;

        if (command.toLowerCase().startsWith(`${commandDespawn} `)) {
            command = command.slice(`${commandDespawn} `.length).trim();
        }
        else {
            command = command.slice(`${commandDespawnEn} `.length).trim();
        }

        const itemId = Client.client.items.getClosestItemIdByName(command);
        if (itemId === null) {
            return Client.client.intlGet(rustplus.guildId, 'noItemWithNameFound', {
                name: command
            });
        }

        const itemName = Client.client.items.getName(itemId);
        const despawnDetails = Client.client.rustlabs.getDespawnDetailsById(itemId);
        if (despawnDetails === null) {
            return Client.client.intlGet(rustplus.guildId, 'couldNotFindDespawnDetails', {
                name: itemName
            });
        }

        const despawnTime = despawnDetails[2].timeString;

        return Client.client.intlGet(rustplus.guildId, 'despawnTimeOfItem', {
            item: itemName,
            time: despawnTime
        });
    }
};
