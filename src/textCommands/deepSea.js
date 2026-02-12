const Client = require('../../index');
const Timer = require('../util/timer');

const DEEP_SEA_DURATION_SECONDS = 3 * 60 * 60; // 3 hours

module.exports = {
    key: 'deepsea',
    execute: async (rustplus, client, command, isInfoChannel = false) => {
        const mapMarkers = rustplus.mapMarkers;

        if (mapMarkers && mapMarkers.isDeepSeaActive && mapMarkers.deepSeaStartTime) {
            // Event is currently active - show remaining time
            const elapsedSeconds = (new Date() - mapMarkers.deepSeaStartTime) / 1000;
            const remainingSeconds = Math.max(0, DEEP_SEA_DURATION_SECONDS - elapsedSeconds);

            if (isInfoChannel) {
                return Client.client.intlGet(rustplus.guildId, 'deepSeaEventActive', {
                    time: Timer.secondsToFullScale(remainingSeconds, 's')
                });
            } else {
                return Client.client.intlGet(rustplus.guildId, 'deepSeaEventActive', {
                    time: Timer.secondsToFullScale(remainingSeconds)
                });
            }
        } else if (mapMarkers && mapMarkers.timeSinceDeepSeaEvent) {
            // Event ended - show time since last event
            const secondsSince = (new Date() - mapMarkers.timeSinceDeepSeaEvent) / 1000;

            if (isInfoChannel) {
                return Client.client.intlGet(rustplus.guildId, 'timeSinceLast', {
                    time: Timer.secondsToFullScale(secondsSince, 's')
                });
            } else {
                return Client.client.intlGet(rustplus.guildId, 'timeSinceDeepSeaEvent', {
                    time: Timer.secondsToFullScale(secondsSince)
                });
            }
        } else {
            // Never detected
            return isInfoChannel ? Client.client.intlGet(rustplus.guildId, 'notActive') :
                Client.client.intlGet(rustplus.guildId, 'deepSeaEventNotActive');
        }
    }
};
