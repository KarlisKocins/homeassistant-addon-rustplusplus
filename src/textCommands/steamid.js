const Client = require('../../index');

module.exports = {
    key: 'steamid',
    execute: async (rustplus, client, command, callerSteamId, callerName) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandSteamid = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxSteamid')}`;
        const commandSteamidEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxSteamid')}`;

        if (command.toLowerCase() === `${commandSteamid}` || command.toLowerCase() === `${commandSteamidEn}`) {
            if (callerSteamId === null || callerName === null) return null;

            return `${callerName}: ${callerSteamId}`;
        }
        else if (command.toLowerCase().startsWith(`${commandSteamid} `) ||
            command.toLowerCase().startsWith(`${commandSteamidEn} `)) {
            let name = null;
            if (command.toLowerCase().startsWith(`${commandSteamid} `)) {
                name = command.slice(`${commandSteamid} `.length).trim();
            }
            else {
                name = command.slice(`${commandSteamidEn} `.length).trim();
            }

            for (const player of rustplus.team.players) {
                if (player.name.includes(name)) {
                    return `${player.name}: ${player.steamId}`;
                }
            }

            return Client.client.intlGet(rustplus.guildId, 'couldNotIdentifyMember', {
                name: name
            });
        }

        return null;
    }
};
