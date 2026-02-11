const Client = require('../../index');

module.exports = {
    key: 'connection',
    execute: async (rustplus, client, command) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandConnection = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxConnection')}`;
        const commandConnectionEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxConnection')}`;
        const commandConnections = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxConnections')}`;
        const commandConnectionsEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxConnections')}`;

        if (command.toLowerCase().startsWith(`${commandConnections}`) ||
            command.toLowerCase().startsWith(`${commandConnectionsEn}`)) {
            let number = null;
            if (command.toLowerCase().startsWith(`${commandConnections}`)) {
                number = parseInt(command.slice(`${commandConnections}`.length).trim());
            }
            else {
                number = parseInt(command.slice(`${commandConnectionsEn}`.length).trim());
            }

            if (rustplus.allConnections.length === 0) {
                return Client.client.intlGet(rustplus.guildId, 'noRegisteredConnectionEvents');
            }

            const strings = [];
            let counter = 1;
            for (const event of rustplus.allConnections) {
                if (counter === 6) break;
                if (number === counter) return event;

                strings.push(event);
                counter += 1;
            }

            return strings;
        }
        else if (command.toLowerCase().startsWith(`${commandConnection} `) ||
            command.toLowerCase().startsWith(`${commandConnectionEn} `)) {
            if (command.toLowerCase().startsWith(`${commandConnection} `)) {
                command = command.slice(`${commandConnection} `.length).trim();
            }
            else {
                command = command.slice(`${commandConnectionEn} `.length).trim();
            }
            const name = command.replace(/ .*/, '');
            const number = parseInt(command.slice(name.length + 1));

            for (const player of rustplus.team.players) {
                if (player.name.includes(name)) {
                    if (!rustplus.playerConnections.hasOwnProperty(player.steamId)) {
                        rustplus.playerConnections[player.steamId] = [];
                    }

                    if (rustplus.playerConnections[player.steamId].length === 0) {
                        return Client.client.intlGet(rustplus.guildId, 'noRegisteredConnectionEventsUser', {
                            user: player.name
                        });
                    }

                    const strings = [];
                    let counter = 1;
                    for (const event of rustplus.playerConnections[player.steamId]) {
                        if (counter === 6) break;
                        if (number === counter) return event;

                        strings.push(event);
                        counter += 1;
                    }

                    return strings;
                }
            }

            return Client.client.intlGet(rustplus.guildId, 'couldNotFindTeammate', {
                name: name
            });
        }

        return null;
    }
};
