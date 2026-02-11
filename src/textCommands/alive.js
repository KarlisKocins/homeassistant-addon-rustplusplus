const Client = require('../../index');

module.exports = {
    key: 'alive',
    execute: async (rustplus, client, command) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandAlive = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxAlive')}`;
        const commandAliveEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxAlive')}`;
        let name = null;

        if (command.toLowerCase() === `${commandAlive}` || command.toLowerCase() === `${commandAliveEn}`) {
            const player = rustplus.team.getPlayerLongestAlive();
            return Client.client.intlGet(rustplus.guildId, 'hasBeenAliveLongest', {
                name: player.name,
                time: player.getAliveTime()
            });
        }
        else if (command.toLowerCase().startsWith(`${commandAlive} `)) {
            name = command.slice(`${commandAlive} `.length).trim();
        }
        else if (command.toLowerCase().startsWith(`${commandAliveEn} `)) {
            name = command.slice(`${commandAliveEn} `.length).trim();
        }

        if (name === null) return null;

        for (const player of rustplus.team.players) {
            if (player.name.includes(name)) {
                return Client.client.intlGet(rustplus.guildId, 'playerHasBeenAliveFor', {
                    name: player.name,
                    time: player.getAliveTime()
                });
            }
        }

        return Client.client.intlGet(rustplus.guildId, 'couldNotFindTeammate', {
            name: name
        });
    }
};
