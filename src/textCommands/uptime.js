const Client = require('../../index');
const Timer = require('../util/timer');

module.exports = {
    key: 'uptime',
    execute: async (rustplus) => {
        let uptimeBot = Client.client.uptimeBot;
        let uptimeServer = rustplus.uptimeServer;

        if (uptimeBot !== null) {
            const seconds = (new Date() - uptimeBot) / 1000;
            uptimeBot = Timer.secondsToFullScale(seconds);
        }
        else {
            uptimeBot = Client.client.intlGet(rustplus.guildId, 'offline');
        }

        if (uptimeServer !== null) {
            const seconds = (new Date() - uptimeServer) / 1000;
            uptimeServer = Timer.secondsToFullScale(seconds);
        }
        else {
            uptimeServer = Client.client.intlGet(rustplus.guildId, 'offline');
        }

        let string = `${Client.client.intlGet(rustplus.guildId, 'bot')}: ${uptimeBot} `;
        string += `${Client.client.intlGet(rustplus.guildId, 'server')}: ${uptimeServer}.`;

        return string.charAt(0).toUpperCase() + string.slice(1);
    }
};
