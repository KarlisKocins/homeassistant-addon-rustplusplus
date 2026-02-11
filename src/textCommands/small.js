const Client = require('../../index');
const Timer = require('../util/timer');

module.exports = {
    key: 'small',
    execute: async (rustplus, client, command, isInfoChannel = false) => {
        const strings = [];
        if (rustplus.mapMarkers.crateSmallOilRigTimer) {
            const time = Timer.getTimeLeftOfTimer(rustplus.mapMarkers.crateSmallOilRigTimer);
            if (time) {
                if (isInfoChannel) {
                    return Client.client.intlGet(rustplus.guildId, 'timeUntilUnlocksAt', {
                        time: Timer.getTimeLeftOfTimer(rustplus.mapMarkers.crateSmallOilRigTimer, 's'),
                        location: rustplus.mapMarkers.crateSmallOilRigLocation
                    });
                }
                else {
                    strings.push(Client.client.intlGet(rustplus.guildId, 'timeBeforeCrateAtSmallOilRigUnlocks', {
                        time: time,
                        location: rustplus.mapMarkers.crateSmallOilRigLocation
                    }));
                }
            }
        }

        if (strings.length === 0) {
            if (rustplus.mapMarkers.timeSinceSmallOilRigWasTriggered === null) {
                return isInfoChannel ? Client.client.intlGet(rustplus.guildId, 'noData') :
                    Client.client.intlGet(rustplus.guildId, 'noDataOnSmallOilRig');
            }
            else {
                const secondsSince = (new Date() - rustplus.mapMarkers.timeSinceSmallOilRigWasTriggered) / 1000;
                if (isInfoChannel) {
                    return Client.client.intlGet(rustplus.guildId, 'timeSinceLastEvent', {
                        time: Timer.secondsToFullScale(secondsSince, 's')
                    });
                }
                else {
                    return Client.client.intlGet(rustplus.guildId, 'timeSinceHeavyScientistsOnSmall', {
                        time: Timer.secondsToFullScale(secondsSince)
                    });
                }
            }
        }

        return strings;
    }
};
