const Client = require('../../index');

module.exports = {
    key: 'pop',
    execute: async (rustplus, client, command, isInfoChannel = false) => {
        if (isInfoChannel) {
            return `${rustplus.info.players}${rustplus.info.isQueue() ? `(${rustplus.info.queuedPlayers})` : ''}` +
                `/${rustplus.info.maxPlayers}`;
        }
        else {
            const string = Client.client.intlGet(rustplus.guildId, 'populationPlayers', {
                current: rustplus.info.players,
                max: rustplus.info.maxPlayers
            });
            const queuedPlayers = rustplus.info.isQueue() ?
                ` ${Client.client.intlGet(rustplus.guildId, 'populationQueue', { number: rustplus.info.queuedPlayers })}` : '';

            return `${string}${queuedPlayers}`;
        }
    }
};
