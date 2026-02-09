const Client = require('../../index');
const Translate = require('translate');
const Languages = require('../util/languages');

module.exports = {
    key: 'translateTo',
    execute: async (rustplus, client, command) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandTr = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxTranslateTo')}`;
        const commandTrEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxTranslateTo')}`;
        const commandLanguage = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxLanguage')}`;
        const commandLanguageEn = `${Client.client.intlGet('en', 'commandSyntaxLanguage')}`;

        if (command.toLowerCase().startsWith(`${commandTr} ${commandLanguage} `) ||
            command.toLowerCase().startsWith(`${commandTrEn} ${commandLanguageEn} `)) {

            let language = null;
            if (command.toLowerCase().startsWith(`${commandTr} ${commandLanguage} `)) {
                language = command.slice(`${commandTr} ${commandLanguage} `.length).trim();
            }
            else {
                language = command.slice(`${commandTrEn} ${commandLanguageEn} `.length).trim();
            }

            if (language in Languages) {
                return Client.client.intlGet(rustplus.guildId, 'languageCode', {
                    code: Languages[language]
                });
            }
            else {
                return Client.client.intlGet(rustplus.guildId, 'couldNotFindLanguage', {
                    language: language
                });
            }
        }

        if (command.toLowerCase().startsWith(`${commandTr} `)) {
            command = command.slice(`${commandTr} `.length).trim();
        }
        else {
            command = command.slice(`${commandTrEn} `.length).trim();
        }
        const language = command.replace(/ .*/, '');
        const text = command.slice(language.length).trim();

        if (language === '' || text === '') {
            return Client.client.intlGet(rustplus.guildId, 'missingArguments');
        }

        try {
            return await Translate(text, language);
        }
        catch (e) {
            return Client.client.intlGet(rustplus.guildId, 'languageLangNotSupported', {
                language: language
            });
        }
    }
};
