const Client = require('../../index');

module.exports = {
    key: 'offline',
    execute: async (rustplus, client, command) => {
        let string = '';
        let counter = 0;
        for (const player of rustplus.team.players) {
            if (!player.isOnline) {
                string += `${player.name}, `;
                counter += 1;
            }
        }
        const amount = `(${counter}/${rustplus.team.players.length}) `;

        return string !== '' ? `${amount}${string.slice(0, -2)}.` :
            `${amount}${Client.client.intlGet(rustplus.guildId, 'noOneIsOffline')}`;
    }
};
