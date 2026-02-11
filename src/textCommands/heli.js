const Client = require('../../index');
const Timer = require('../util/timer');

module.exports = {
    key: 'heli',
    execute: async (rustplus, client, command, isInfoChannel = false) => {
        const strings = [];
        for (const patrolHelicopter of rustplus.mapMarkers.patrolHelicopters) {
            if (isInfoChannel) {
                return Client.client.intlGet(rustplus.guildId, 'atLocation', {
                    location: patrolHelicopter.location.string
                });
            }
            else {
                strings.push(Client.client.intlGet(rustplus.guildId, 'patrolHelicopterLocatedAt', {
                    location: patrolHelicopter.location.string
                }));
            }
        }

        if (strings.length === 0) {
            const wasOnMap = rustplus.mapMarkers.timeSincePatrolHelicopterWasOnMap;
            const wasDestroyed = rustplus.mapMarkers.timeSincePatrolHelicopterWasDestroyed;

            if (wasOnMap == null && wasDestroyed === null) {
                return isInfoChannel ? Client.client.intlGet(rustplus.guildId, 'notActive') :
                    Client.client.intlGet(rustplus.guildId, 'patrolHelicopterNotCurrentlyOnMap');
            }
            else if (wasOnMap !== null && wasDestroyed === null) {
                const secondsSince = (new Date() - wasOnMap) / 1000;
                if (isInfoChannel) {
                    const timeSince = Timer.secondsToFullScale(secondsSince, 's');
                    return Client.client.intlGet(rustplus.guildId, 'timeSinceLast', {
                        time: timeSince
                    });
                }
                else {
                    const timeSince = Timer.secondsToFullScale(secondsSince);
                    return Client.client.intlGet(rustplus.guildId, 'timeSincePatrolHelicopterWasOnMap', {
                        time: timeSince
                    });
                }
            }
            else if (wasOnMap !== null && wasDestroyed !== null) {
                if (isInfoChannel) {
                    const timeSinceOnMap = Timer.secondsToFullScale((new Date() - wasOnMap) / 1000, 's');
                    const timeSinceDestroyed = Timer.secondsToFullScale((new Date() - wasDestroyed) / 1000, 's');
                    return Client.client.intlGet(rustplus.guildId, 'timeSinceLastSinceDestroyedShort', {
                        time1: timeSinceOnMap,
                        time2: timeSinceDestroyed,
                        location: rustplus.mapMarkers.patrolHelicopterDestroyedLocation === null ? '' :
                            ` [${rustplus.mapMarkers.patrolHelicopterDestroyedLocation}]`
                    });
                }
                else {
                    const timeSinceOnMap = Timer.secondsToFullScale((new Date() - wasOnMap) / 1000);
                    const timeSinceDestroyed = Timer.secondsToFullScale((new Date() - wasDestroyed) / 1000);
                    return Client.client.intlGet(rustplus.guildId, 'timeSinceLastSinceDestroyedLong', {
                        time1: timeSinceOnMap,
                        time2: timeSinceDestroyed,
                        location: rustplus.mapMarkers.patrolHelicopterDestroyedLocation === null ? '' :
                            ` [${rustplus.mapMarkers.patrolHelicopterDestroyedLocation}]`
                    });
                }
            }
        }

        return strings;
    }
};
