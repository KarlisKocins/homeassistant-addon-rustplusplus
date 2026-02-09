const Client = require('../../index');

module.exports = {
    key: 'note',
    execute: async (rustplus, client, command) => {
        const instance = Client.client.getInstance(rustplus.guildId);
        const prefix = rustplus.generalSettings.prefix;
        const commandNote = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxNote')}`;
        const commandNoteEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxNote')}`;
        const commandNotes = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxNotes')}`;
        const commandNotesEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxNotes')}`;
        const commandAdd = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxAdd')}`;
        const commandAddEn = `${Client.client.intlGet('en', 'commandSyntaxAdd')}`;
        const commandRemove = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxRemove')}`;
        const commandRemoveEn = `${Client.client.intlGet('en', 'commandSyntaxRemove')}`;

        if (command.toLowerCase() === `${commandNotes}` || command.toLowerCase() === `${commandNotesEn}`) {
            if (Object.keys(instance.serverList[rustplus.serverId].notes).length === 0) {
                return Client.client.intlGet(rustplus.guildId, 'noSavedNotes');
            }

            const strings = [];
            for (const [id, note] of Object.entries(instance.serverList[rustplus.serverId].notes)) {
                strings.push(`${id}: ${note}`);
            }
            return strings;
        }

        if (command.toLowerCase().startsWith(`${commandNote} `)) {
            command = command.slice(`${commandNote} `.length).trim();
        }
        else {
            command = command.slice(`${commandNoteEn} `.length).trim();
        }
        const subcommand = command.replace(/ .*/, '');
        const rest = command.slice(subcommand.length + 1);

        switch (subcommand.toLowerCase()) {
            case commandAddEn:
            case commandAdd: {
                let index = 0;
                while (Object.keys(instance.serverList[rustplus.serverId].notes).map(Number).includes(index)) {
                    index += 1;
                }

                instance.serverList[rustplus.serverId].notes[index] = `${rest}`;
                Client.client.setInstance(rustplus.guildId, instance);
                return Client.client.intlGet(rustplus.guildId, 'noteSaved');
            } break;

            case commandRemoveEn:
            case commandRemove: {
                const id = parseInt(rest.trim());

                if (!isNaN(id)) {
                    if (!Object.keys(instance.serverList[rustplus.serverId].notes).map(Number).includes(id)) {
                        return Client.client.intlGet(rustplus.guildId, 'noteIdDoesNotExist', { id: id });
                    }

                    delete instance.serverList[rustplus.serverId].notes[id];
                    Client.client.setInstance(rustplus.guildId, instance);
                    return Client.client.intlGet(rustplus.guildId, 'noteIdWasRemoved', { id: id });
                }
                else {
                    return Client.client.intlGet(rustplus.guildId, 'noteIdInvalid');
                }
            } break;

            default: {
                return null;
            } break;
        }
    }
};
