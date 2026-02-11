const Client = require('../../index');
const Timer = require('../util/timer');

module.exports = {
    key: 'time',
    execute: async (rustplus, client, command, isInfoChannel = false) => {
        const time = Timer.convertDecimalToHoursMinutes(rustplus.time.time);
        if (isInfoChannel) {
            return [time, rustplus.time.getTimeTillDayOrNight('s')];
        }
        else {
            const currentTime = Client.client.intlGet(rustplus.guildId, 'inGameTime', { time: time });
            const timeLeft = rustplus.time.getTimeTillDayOrNight();

            if (timeLeft === null) return currentTime;

            const locString = rustplus.time.isDay() ? 'timeTillNightfall' : 'timeTillDaylight';
            const timeTilltransition = Client.client.intlGet(rustplus.guildId, locString, { time: timeLeft });

            return `${currentTime} ${timeTilltransition}`;
        }
    }
};
