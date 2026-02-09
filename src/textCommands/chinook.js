const Client = require('../../index');
const Timer = require('../util/timer');

module.exports = {
    key: 'chinook',
    execute: async (rustplus, client, command, isInfoChannel = false) => {
        const strings = [];
        for (const ch47 of rustplus.mapMarkers.ch47s) {
            if (ch47.ch47Type === 'crate') {
                if (isInfoChannel) {
                    return Client.client.intlGet(rustplus.guildId, 'atLocation', {
                        location: ch47.location.string
                    });
                }
                else {
                    strings.push(Client.client.intlGet(rustplus.guildId, 'chinook47Located', {
                        location: ch47.location.string
                    }));
                }
            }
        }

        if (strings.length === 0) {
            if (rustplus.mapMarkers.timeSinceCH47WasOut === null) {
                return isInfoChannel ? Client.client.intlGet(rustplus.guildId, 'notActive') :
                    Client.client.intlGet(rustplus.guildId, 'chinook47NotOnMap');
            }
            else {
                const secondsSince = (new Date() - rustplus.mapMarkers.timeSinceCH47WasOut) / 1000;
                if (isInfoChannel) {
                    return Client.client.intlGet(rustplus.guildId, 'timeSinceLast', {
                        time: Timer.secondsToFullScale(secondsSince, 's')
                    });
                }
                else {
                    strings.push(Client.client.intlGet(rustplus.guildId, 'timeSinceChinook47OnMap', {
                        time: Timer.secondsToFullScale(secondsSince)
                    }));
                }
            }
        }

        return strings;
    }
};
