const Client = require('../../index');

module.exports = {
    key: 'upkeep',
    execute: async (rustplus) => {
        const instance = Client.client.getInstance(rustplus.guildId);
        let cupboardFound = false;
        const strings = [];
        for (const [key, value] of Object.entries(instance.serverList[rustplus.serverId].storageMonitors)) {
            if (value.type !== 'toolCupboard') continue;

            if (value.upkeep) {
                cupboardFound = true;
                const upkeepStr = Client.client.intlGet(rustplus.guildId, 'upkeep').toLowerCase();
                strings.push(`${value.name} [${key}] ${upkeepStr}: ${value.upkeep}`);
            }
        }

        if (!cupboardFound) return Client.client.intlGet(rustplus.guildId, 'noToolCupboardWereFound');

        return strings;
    }
};
