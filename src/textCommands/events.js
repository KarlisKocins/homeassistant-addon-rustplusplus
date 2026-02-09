const Client = require('../../index');

module.exports = {
    key: 'events',
    execute: async (rustplus, client, command) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandEvents = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxEvents')}`;
        const commandEventsEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxEvents')}`;
        const commandCargo = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxCargo')}`;
        const commandCargoEn = `${Client.client.intlGet('en', 'commandSyntaxCargo')}`;
        const commandHeli = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxHeli')}`;
        const commandHeliEn = `${Client.client.intlGet('en', 'commandSyntaxHeli')}`;
        const commandSmall = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxSmall')}`;
        const commandSmallEn = `${Client.client.intlGet('en', 'commandSyntaxSmall')}`;
        const commandLarge = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxLarge')}`;
        const commandLargeEn = `${Client.client.intlGet('en', 'commandSyntaxLarge')}`;
        const commandChinook = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxChinook')}`;
        const commandChinookEn = `${Client.client.intlGet('en', 'commandSyntaxChinook')}`;

        const EVENTS = [commandCargo, commandCargoEn, commandHeli, commandHeliEn, commandSmall,
            commandSmallEn, commandLarge, commandLargeEn, commandChinook, commandChinookEn];

        if (command.toLowerCase().startsWith(`${commandEvents}`)) {
            command = command.slice(`${commandEvents}`.length).trim();
        }
        else {
            command = command.slice(`${commandEventsEn}`.length).trim();
        }

        let event = command.replace(/ .*/, '').toLowerCase();
        let number = command.slice(event.length + 1);

        if (event === '') {
            event = 'all';
            number = 5;
        }
        else if (event !== '' && EVENTS.includes(event)) {
            if (number === '') {
                number = 5;
            }
            else {
                number = parseInt(number);
                if (isNaN(number)) {
                    number = 5;
                }
            }
        }
        else if (event !== '' && !EVENTS.includes(event)) {
            number = parseInt(event);
            event = 'all';
            if (isNaN(number)) {
                number = 5;
            }
        }
        else {
            event = 'all';
            number = 5;
        }

        switch (event) {
            case commandCargoEn:
            case commandCargo: {
                event = 'cargo';
            } break;

            case commandHeliEn:
            case commandHeli: {
                event = 'heli';
            } break;

            case commandSmallEn:
            case commandSmall: {
                event = 'small';
            } break;

            case commandLargeEn:
            case commandLarge: {
                event = 'large';
            } break;

            case commandChinookEn:
            case commandChinook: {
                event = 'chinook';
            } break;

            default: {
                event = 'all';
            } break;
        }

        const strings = [];
        let counter = 0;
        for (const e of rustplus.events[event]) {
            if (counter === 5 || counter === number) break;
            strings.push(e);
            counter += 1;
        }

        if (strings.length === 0) {
            return Client.client.intlGet(rustplus.guildId, 'noRegisteredEvents');
        }

        return strings;
    }
};
