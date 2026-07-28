const Client = require('../../index');
const Translate = require('translate').default;

module.exports = {
    key: 'translateFromTo',
    execute: async (rustplus, client, command) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandTrf = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxTranslateFromTo')}`;
        const commandTrfEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxTranslateFromTo')}`;

        if (command.toLowerCase().startsWith(`${commandTrf}`)) {
            command = command.slice(`${commandTrf} `.length).trim();
        }
        else {
            command = command.slice(`${commandTrfEn} `.length).trim();
        }

        const languageFrom = command.replace(/ .*/, '');
        command = command.slice(languageFrom.length).trim();
        const languageTo = command.replace(/ .*/, '');
        const text = command.slice(languageTo.length).trim();

        if (languageFrom === '' || languageTo === '' || text === '') {
            return Client.client.intlGet(rustplus.guildId, 'missingArguments');
        }

        try {
            return await Translate(text, { from: languageFrom, to: languageTo });
        }
        catch (e) {
            const regex = new RegExp('The language "(.*?)"');
            const invalidLanguage = regex.exec(e.message);

            if (invalidLanguage.length === 2) {
                return Client.client.intlGet(rustplus.guildId, 'languageLangNotSupported', {
                    language: invalidLanguage[1]
                });
            }

            return Client.client.intlGet(rustplus.guildId, 'languageNotSupported');
        }
    }
};
