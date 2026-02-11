const Client = require('../../index');
const Timer = require('../util/timer');

module.exports = {
    key: 'timer',
    execute: async (rustplus, client, command) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandTimer = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxTimer')}`;
        const commandTimerEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxTimer')}`;
        const commandTimers = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxTimers')}`;
        const commandTimersEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxTimers')}`;
        const commandAdd = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxAdd')}`;
        const commandAddEn = `${Client.client.intlGet('en', 'commandSyntaxAdd')}`;
        const commandRemove = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxRemove')}`;
        const commandRemoveEn = `${Client.client.intlGet('en', 'commandSyntaxRemove')}`;

        if (command.toLowerCase() === `${commandTimers}` || command.toLowerCase() === `${commandTimersEn}`) {
            if (Object.keys(rustplus.timers).length === 0) {
                return Client.client.intlGet(rustplus.guildId, 'noActiveTimers');
            }

            const strings = [];
            for (const [id, content] of Object.entries(rustplus.timers)) {
                const timeLeft = Timer.getTimeLeftOfTimer(content.timer);
                strings.push(Client.client.intlGet(rustplus.guildId, 'timeLeftTimer', {
                    id: parseInt(id),
                    time: timeLeft,
                    message: content.message
                }));
            }
            return strings;
        }

        if (command.toLowerCase().startsWith(`${commandTimer} `)) {
            command = command.slice(`${commandTimer} `.length).trim();
        }
        else {
            command = command.slice(`${commandTimerEn} `.length).trim();
        }
        const subcommand = command.replace(/ .*/, '');
        const rest = command.slice(subcommand.length + 1);

        switch (subcommand.toLowerCase()) {
            case commandAddEn:
            case commandAdd: {
                const time = rest.replace(/ .*/, '');
                const message = rest.slice(time.length + 1);
                if (message === '') return Client.client.intlGet(rustplus.guildId, 'missingTimerMessage');

                const timeSeconds = Timer.getSecondsFromStringTime(time);
                if (timeSeconds === null) return Client.client.intlGet(rustplus.guildId, 'timeFormatInvalid');

                let id = 0;
                while (Object.keys(rustplus.timers).map(Number).includes(id)) {
                    id += 1;
                }

                rustplus.timers[id] = {
                    timer: new Timer.timer(
                        () => {
                            rustplus.sendInGameMessage(Client.client.intlGet(rustplus.guildId, 'timer',
                                { message: message }), 'TIMER');
                            delete rustplus.timers[id]
                        },
                        timeSeconds * 1000),
                    message: message
                };
                rustplus.timers[id].timer.start();

                return Client.client.intlGet(rustplus.guildId, 'timerSet', { time: time });
            } break;

            case commandRemoveEn:
            case commandRemove: {
                const id = parseInt(rest.replace(/ .*/, ''));
                if (isNaN(id)) return Client.client.intlGet(rustplus.guildId, 'timerIdInvalid');

                if (!Object.keys(rustplus.timers).map(Number).includes(id)) {
                    return Client.client.intlGet(rustplus.guildId, 'timerIdDoesNotExist', { id: id });
                }

                rustplus.timers[id].timer.stop();
                delete rustplus.timers[id];

                return Client.client.intlGet(rustplus.guildId, 'timerRemoved', { id: id });
            } break;

            default: {
                return null;
            } break;
        }
    }
};
