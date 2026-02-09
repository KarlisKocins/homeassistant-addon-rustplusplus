const Client = require('../../index');
const Timer = require('../util/timer');

module.exports = {
    key: 'large',
    execute: async (rustplus, client, command, isInfoChannel = false) => {
        const strings = [];
        if (rustplus.mapMarkers.crateLargeOilRigTimer) {
            const time = Timer.getTimeLeftOfTimer(rustplus.mapMarkers.crateLargeOilRigTimer);
            if (time) {
                if (isInfoChannel) {
                    return Client.client.intlGet(rustplus.guildId, 'timeUntilUnlocksAt', {
                        time: Timer.getTimeLeftOfTimer(rustplus.mapMarkers.crateLargeOilRigTimer, 's'),
                        location: rustplus.mapMarkers.crateLargeOilRigLocation
                    });
                }
                else {
                    strings.push(Client.client.intlGet(rustplus.guildId, 'timeBeforeCrateAtLargeOilRigUnlocks', {
                        time: time,
                        location: rustplus.mapMarkers.crateLargeOilRigLocation
                    }));
                }
            }
        }

        if (strings.length === 0) {
            if (rustplus.mapMarkers.timeSinceLargeOilRigWasTriggered === null) {
                return isInfoChannel ? Client.client.intlGet(rustplus.guildId, 'noData') :
                    Client.client.intlGet(rustplus.guildId, 'noDataOnLargeOilRig');
            }
            else {
                const secondsSince = (new Date() - rustplus.mapMarkers.timeSinceLargeOilRigWasTriggered) / 1000;
                if (isInfoChannel) {
                    return Client.client.intlGet(rustplus.guildId, 'timeSinceLastEvent', {
                        time: Timer.secondsToFullScale(secondsSince, 's')
                    });
                }
                else {
                    return Client.client.intlGet(rustplus.guildId, 'timeSinceHeavyScientistsOnLarge', {
                        time: Timer.secondsToFullScale(secondsSince)
                    });
                }
            }
        }

        return strings;
    }
};
