/*
    Copyright (C) 2026 Alexander Emanuelsson (alexemanuelol)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    https://github.com/alexemanuelol/rustplusplus

*/

const Discord = require('discord.js');

/* discord.js only emits shardDisconnect for close codes it will not reconnect from, and it does so
   without rejecting client.login(). Without this handler the bot just stays offline with nothing in
   the log, and the WebUI (started from the ready event) never comes up. */
const HINTS = {
    [Discord.GatewayCloseCodes.DisallowedIntents]:
        'Discord refused the connection: a privileged gateway intent is not enabled for this bot. ' +
        'Open the Discord Developer Portal -> your application -> Bot -> Privileged Gateway Intents, ' +
        'enable both "Server Members Intent" and "Message Content Intent", save, then restart the add-on.',
    [Discord.GatewayCloseCodes.AuthenticationFailed]:
        'Discord rejected the bot token. Reset the token in the Discord Developer Portal -> Bot, paste ' +
        'the new value into the add-on discord_token option, then restart the add-on.',
    [Discord.GatewayCloseCodes.InvalidIntents]:
        'Discord rejected the requested gateway intents as invalid.'
};

module.exports = {
    name: 'shardDisconnect',
    async execute(client, event, shardId) {
        const code = event?.code;
        const name = Discord.GatewayCloseCodes[code] ?? 'Unknown';
        const hint = HINTS[code] ?? 'The bot will not reconnect on its own; restart the add-on.';

        client.log(client.intlGet(null, 'errorCap'),
            `Discord gateway closed (shard ${shardId}, code ${code} ${name}). ${hint}`, 'error');
    },
}
