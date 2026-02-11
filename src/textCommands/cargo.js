const Client = require('../../index');
const Timer = require('../util/timer');

module.exports = {
    key: 'cargo',
    execute: async (rustplus, client, command, isInfoChannel = false) => {
        const strings = [];
        let unhandled = rustplus.mapMarkers.cargoShips.map(e => e.id);
        for (const [id, timer] of Object.entries(rustplus.mapMarkers.cargoShipEgressTimers)) {
            const cargoShip = rustplus.mapMarkers.getMarkerByTypeId(rustplus.mapMarkers.types.CargoShip, parseInt(id));
            const time = Timer.getTimeLeftOfTimer(timer);
            if (time) {
                if (isInfoChannel) {
                    return Client.client.intlGet(rustplus.guildId, 'egressInTime', {
                        time: Timer.getTimeLeftOfTimer(timer, 's'),
                        location: cargoShip.location.string
                    });
                }
                else {
                    strings.push(Client.client.intlGet(rustplus.guildId, 'timeBeforeCargoEntersEgress', {
                        time: time,
                        location: cargoShip.location.string
                    }));
                }
            }
            unhandled = unhandled.filter(e => e != parseInt(id));
        }

        if (unhandled.length > 0) {
            for (const id of unhandled) {
                const cargoShip = rustplus.mapMarkers.getMarkerByTypeId(rustplus.mapMarkers.types.CargoShip, id);
                if (cargoShip.onItsWayOut) {
                    if (isInfoChannel) {
                        return Client.client.intlGet(rustplus.guildId, 'leavingMapAt', {
                            location: cargoShip.location.string
                        });
                    }
                    else {
                        strings.push(Client.client.intlGet(rustplus.guildId, 'cargoLeavingMapAt', {
                            location: cargoShip.location.string
                        }));
                    }
                }
                else {
                    if (isInfoChannel) {
                        return Client.client.intlGet(rustplus.guildId, 'cargoAt', {
                            location: cargoShip.location.string
                        });
                    }
                    else {
                        strings.push(Client.client.intlGet(rustplus.guildId, 'cargoLocatedAt', {
                            location: cargoShip.location.string
                        }));
                    }
                }
            }
        }

        if (strings.length === 0) {
            if (rustplus.mapMarkers.timeSinceCargoShipWasOut === null) {
                if (isInfoChannel) {
                    return Client.client.intlGet(rustplus.guildId, 'notActive');;
                }
                else {
                    return Client.client.intlGet(rustplus.guildId, 'cargoNotCurrentlyOnMap');
                }
            }
            else {
                const secondsSince = (new Date() - rustplus.mapMarkers.timeSinceCargoShipWasOut) / 1000;
                if (isInfoChannel) {
                    return Client.client.intlGet(rustplus.guildId, 'timeSinceLast', {
                        time: Timer.secondsToFullScale(secondsSince)
                    });
                }
                else {
                    return Client.client.intlGet(rustplus.guildId, 'timeSinceCargoLeft', {
                        time: Timer.secondsToFullScale(secondsSince)
                    });
                }
            }
        }

        return strings;
    }
};
