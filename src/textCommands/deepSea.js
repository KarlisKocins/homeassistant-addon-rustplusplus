const Client = require('../../index');
const Timer = require('../util/timer');

module.exports = {
    key: 'deepsea',
    execute: async (rustplus, client, command, isInfoChannel = false) => {
        if (rustplus.lastDeepSeaEvent === null) {
            return isInfoChannel ? Client.client.intlGet(rustplus.guildId, 'notActive') :
                Client.client.intlGet(rustplus.guildId, 'deepSeaEventNotActive');
        } else {
            const secondsSince = (new Date() - rustplus.lastDeepSeaEvent) / 1000;
            // Assuming the event stays active for some time, but we only have start time.
            // Behaving like Chinook where we show time since last seen if not currently tracked?
            // User requested format: "0m since last." or "Not active." if null.

            if (isInfoChannel) {
                return Client.client.intlGet(rustplus.guildId, 'timeSinceLast', {
                    time: Timer.secondsToFullScale(secondsSince, 's')
                });
            } else {
                return Client.client.intlGet(rustplus.guildId, 'timeSinceDeepSeaEvent', {
                    time: Timer.secondsToFullScale(secondsSince)
                });
            }
        }
    }
};
