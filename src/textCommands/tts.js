const Client = require('../../index');
const DiscordMessages = require('../discordTools/discordMessages');

module.exports = {
    key: 'tts',
    execute: async (rustplus, client, command, ignored, callerName) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandTTS = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxTTS')}`;
        const commandTTSEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxTTS')}`;

        let text = null;
        if (command.toLowerCase().startsWith(`${commandTTS}`)) {
            text = command.slice(`${commandTTS} `.length).trim();
        }
        else {
            text = command.slice(`${commandTTSEn} `.length).trim();
        }

        await DiscordMessages.sendTTSMessage(rustplus.guildId, callerName, text);
        return Client.client.intlGet(rustplus.guildId, 'sentTextToSpeech');
    }
};
