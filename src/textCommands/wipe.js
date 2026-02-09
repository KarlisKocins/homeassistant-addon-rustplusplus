const Client = require('../../index');

module.exports = {
    key: 'wipe',
    execute: async (rustplus, client, command, isInfoChannel = false) => {
        if (isInfoChannel) {
            return Client.client.intlGet(rustplus.guildId, 'dayOfWipe', {
                day: Math.ceil(rustplus.info.getSecondsSinceWipe() / (60 * 60 * 24))
            });
        }
        else {
            return Client.client.intlGet(rustplus.guildId, 'timeSinceWipe', {
                time: rustplus.info.getTimeSinceWipe()
            });
        }
    }
};
