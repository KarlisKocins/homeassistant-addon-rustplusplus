const Client = require('../../index');
const Constants = require('../util/constants');

module.exports = {
    key: 'afk',
    execute: async (rustplus) => {
        let string = '';
        for (const player of rustplus.team.players) {
            if (player.isOnline) {
                if (player.getAfkSeconds() >= Constants.AFK_TIME_SECONDS) {
                    string += `${player.name} [${player.getAfkTime('dhs')}], `;
                }
            }
        }

        return string !== '' ? `${string.slice(0, -2)}.` : Client.client.intlGet(rustplus.guildId, 'noOneIsAfk');
    }
};
