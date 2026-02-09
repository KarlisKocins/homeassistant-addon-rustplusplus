const Client = require('../../index');
const Timer = require('../util/timer');

module.exports = {
    key: 'travelingVendor',
    execute: async (rustplus, client, command, isInfoChannel = false) => {
        const strings = [];
        for (const travelingVendor of rustplus.mapMarkers.travelingVendors) {
            if (isInfoChannel) {
                return Client.client.intlGet(rustplus.guildId, 'atLocation', {
                    location: travelingVendor.location.string
                });
            }
            else {
                strings.push(Client.client.intlGet(rustplus.guildId, 'travelingVendorLocatedAt', {
                    location: travelingVendor.location.string
                }));
            }
        }

        if (strings.length === 0) {
            const wasOnMap = rustplus.mapMarkers.timeSinceTravelingVendorWasOnMap;

            if (wasOnMap == null) {
                return isInfoChannel ? Client.client.intlGet(rustplus.guildId, 'notActive') :
                    Client.client.intlGet(rustplus.guildId, 'travelingVendorNotCurrentlyOnMap');
            }
            else if (wasOnMap !== null) {
                const secondsSince = (new Date() - wasOnMap) / 1000;
                if (isInfoChannel) {
                    const timeSince = Timer.secondsToFullScale(secondsSince, 's');
                    return Client.client.intlGet(rustplus.guildId, 'timeSinceLast', {
                        time: timeSince
                    });
                }
                else {
                    const timeSince = Timer.secondsToFullScale(secondsSince);
                    return Client.client.intlGet(rustplus.guildId, 'timeSinceTravelingVendorWasOnMap', {
                        time: timeSince
                    });
                }
            }
        }

        return strings;
    }
};
