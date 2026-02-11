const Client = require('../../index');

module.exports = {
    key: 'mute',
    execute: async (rustplus, client, command) => {
        const instance = Client.client.getInstance(rustplus.guildId);
        instance.generalSettings.muteInGameBotMessages = true;
        rustplus.generalSettings.muteInGameBotMessages = true;
        Client.client.setInstance(rustplus.guildId, instance);

        return Client.client.intlGet(rustplus.guildId, 'inGameBotMessagesMuted');
    }
};
