const Client = require('../../index');

module.exports = {
    key: 'unmute',
    execute: async (rustplus) => {
        const instance = Client.client.getInstance(rustplus.guildId);
        instance.generalSettings.muteInGameBotMessages = false;
        rustplus.generalSettings.muteInGameBotMessages = false;
        Client.client.setInstance(rustplus.guildId, instance);

        return Client.client.intlGet(rustplus.guildId, 'inGameBotMessagesUnmuted');
    }
};
