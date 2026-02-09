const Client = require('../../index');
const InstanceUtils = require('../util/instanceUtils');
const DiscordTools = require('../discordTools/discordTools');
const DiscordEmbeds = require('../discordTools/discordEmbeds');

module.exports = {
    key: 'send',
    execute: async (rustplus, client, command, ignored, callerName) => {
        const credentials = InstanceUtils.readCredentialsFile(rustplus.guildId);
        const prefix = rustplus.generalSettings.prefix;
        const commandSend = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxSend')}`;
        const commandSendEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxSend')}`;

        if (command.toLowerCase().startsWith(`${commandSend} `)) {
            command = command.slice(`${commandSend} `.length).trim();
        }
        else {
            command = command.slice(`${commandSendEn} `.length).trim();
        }
        const name = command.replace(/ .*/, '');
        const message = command.slice(name.length + 1).trim();

        if (name === '' || message === '') {
            return Client.client.intlGet(rustplus.guildId, 'missingArguments');
        }

        for (const player of rustplus.team.players) {
            if (player.name.includes(name)) {
                if (!(player.steamId in credentials)) {
                    return Client.client.intlGet(rustplus.guildId, 'userNotRegistered', {
                        user: player.name
                    });
                }

                const discordUserId = credentials[player.steamId].discord_user_id;
                const user = await DiscordTools.getUserById(rustplus.guildId, discordUserId);

                const content = {
                    embeds: [DiscordEmbeds.getUserSendEmbed(rustplus.guildId, rustplus.serverId, callerName, message)]
                }

                if (user) {
                    await Client.client.messageSend(user, content);
                    return Client.client.intlGet(rustplus.guildId, 'messageWasSent');
                }

                return Client.client.intlGet(rustplus.guildId, 'couldNotFindUser', {
                    userId: discordUserId
                });
            }
        }

        return Client.client.intlGet(rustplus.guildId, 'couldNotIdentifyMember', {
            name: name
        });
    }
};
