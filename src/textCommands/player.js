const Client = require('../../index');
const Constants = require('../util/constants');

module.exports = {
    key: 'player',
    execute: async (rustplus, client, command) => {
        const instance = Client.client.getInstance(rustplus.guildId);
        const battlemetricsId = instance.serverList[rustplus.serverId].battlemetricsId;
        const prefix = rustplus.generalSettings.prefix;
        const commandPlayer = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxPlayer')}`;
        const commandPlayerEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxPlayer')}`;
        const commandPlayers = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxPlayers')}`;
        const commandPlayersEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxPlayers')}`;

        const bmInstance = Client.client.battlemetricsInstances[battlemetricsId];

        if (!bmInstance || !bmInstance.lastUpdateSuccessful) {
            return Client.client.intlGet(rustplus.guildId, 'battlemetricsInstanceCouldNotBeFound', {
                id: battlemetricsId
            });
        }

        let foundPlayers = [];
        if (command.toLowerCase() === `${commandPlayers}` || command.toLowerCase() === `${commandPlayersEn}`) {
            foundPlayers = bmInstance.getOnlinePlayerIdsOrderedByTime();
            if (foundPlayers.length === 0) {
                return Client.client.intlGet(rustplus.guildId, 'couldNotFindAnyPlayers');
            }
        }
        else if (command.toLowerCase().startsWith(`${commandPlayer} `) ||
            command.toLowerCase().startsWith(`${commandPlayerEn} `)) {

            let name = null;
            if (command.toLowerCase().startsWith(`${commandPlayer}`)) {
                name = command.slice(`${commandPlayer} `.length).trim();
            }
            else {
                name = command.slice(`${commandPlayerEn} `.length).trim();
            }

            for (const playerId of bmInstance.getOnlinePlayerIdsOrderedByTime()) {
                if (bmInstance.players[playerId]['name'].includes(name)) foundPlayers.push(playerId);
            }

            if (foundPlayers.length === 0) {
                return Client.client.intlGet(rustplus.guildId, 'couldNotFindPlayer', {
                    name: name
                });
            }
        }
        else {
            return null;
        }

        const trademark = rustplus.generalSettings.trademark;
        const trademarkString = (trademark === 'NOT SHOWING') ? '' : `${trademark} | `;
        const messageMaxLength = Constants.MAX_LENGTH_TEAM_MESSAGE - trademarkString.length;
        const leftLength = `...xxx ${Client.client.intlGet(rustplus.guildId, 'more')}.`.length;

        let string = '';
        let playerIndex = 0;
        for (const playerId of foundPlayers) {
            const time = bmInstance.getOnlineTime(playerId);
            const playerString = `${bmInstance.players[playerId]['name']} [${time[1]}], `;

            if ((string.length + playerString.length + leftLength) < messageMaxLength) {
                string += playerString;
            }
            else if ((string.length + playerString.length + leftLength) > messageMaxLength) {
                break;
            }

            playerIndex += 1;
        }

        if (string !== '') {
            string = string.slice(0, -2);

            if (playerIndex < foundPlayers.length) {
                return Client.client.intlGet(rustplus.guildId, 'morePlayers', {
                    players: string,
                    number: foundPlayers.length - playerIndex
                });
            }
            else {
                return `${string}.`;
            }
        }

        return null;
    }
};
