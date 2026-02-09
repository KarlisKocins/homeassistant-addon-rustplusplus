/*
    Copyright (C) 2022 Alexander Emanuelsson (alexemanuelol)

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

const fs = require('fs');
const path = require('path');
const SmartAlarmHandler = require('./smartAlarmHandler.js');
const SmartSwitchGroupHandler = require('./smartSwitchGroupHandler.js');
const SmartSwitchHandler = require('./smartSwitchHandler.js');
const COMMAND_CONFIG = require('../util/textCommandConfig');

// Load commands
const commands = new Map();
const commandFiles = fs.readdirSync(path.join(__dirname, '../textCommands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`../textCommands/${file}`);
    commands.set(command.key, command);
}

module.exports = {
    inGameCommandHandler: async function (rustplus, client, message) {
        const guildId = rustplus.guildId;
        const instance = client.getInstance(guildId);

        let commandString = message.broadcast.teamMessage.message.message;
        for (const alias of instance.aliases) {
            commandString = commandString.replace(alias.alias, alias.value);
        }

        const callerSteamId = message.broadcast.teamMessage.message.steamId.toString();
        const callerName = message.broadcast.teamMessage.message.name;
        const commandLowerCase = commandString.toLowerCase();
        const prefix = rustplus.generalSettings.prefix;

        if (!rustplus.isOperational) {
            return false;
        }
        else if (!rustplus.generalSettings.inGameCommandsEnabled) {
            return false;
        }

        let isTextCommandMatched = false;

        for (const [key, config] of Object.entries(COMMAND_CONFIG)) {
            const commandModule = commands.get(key);
            if (!commandModule) continue;

            let isMatch = false;
            for (const syntaxKey of config.syntax) {
                const syntaxEn = `${prefix}${client.intlGet('en', syntaxKey)}`;
                const syntaxLocal = `${prefix}${client.intlGet(guildId, syntaxKey)}`;

                if (commandLowerCase === syntaxEn.toLowerCase() ||
                    commandLowerCase === syntaxLocal.toLowerCase()) {
                    isMatch = true;
                    break;
                }

                if (commandLowerCase.startsWith(`${syntaxEn.toLowerCase()} `) ||
                    commandLowerCase.startsWith(`${syntaxLocal.toLowerCase()} `)) {
                    isMatch = true;
                    break;
                }
            }

            if (isMatch) {
                isTextCommandMatched = true;
                const response = await commandModule.execute(rustplus, client, commandString, callerSteamId, callerName);
                if (response !== null) {
                    rustplus.sendInGameMessage(response);
                }
                break;
            }
        }

        if (!isTextCommandMatched) {
            /* Maybe a custom command? */

            if (SmartAlarmHandler.smartAlarmCommandHandler(rustplus, client, commandString)) {
                rustplus.logInGameCommand('Smart Alarm', message);
                return true;
            }

            if (await SmartSwitchHandler.smartSwitchCommandHandler(rustplus, client, commandString)) {
                rustplus.logInGameCommand('Smart Switch', message);
                return true;
            }

            if (await SmartSwitchGroupHandler.smartSwitchGroupCommandHandler(rustplus, client, commandString)) {
                rustplus.logInGameCommand('Smart Switch Group', message);
                return true;
            }

            return false;
        }

        rustplus.logInGameCommand('Default', message);

        return true;
    },
};
