const Client = require('../../index');
const Map = require('../util/map');

module.exports = {
    key: 'marker',
    execute: async (rustplus, client, command, callerSteamId) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandMarker = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxMarker')}`;
        const commandMarkerEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxMarker')}`;
        const commandMarkers = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxMarkers')}`;
        const commandMarkersEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxMarkers')}`;
        const commandAdd = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxAdd')}`;
        const commandAddEn = `${Client.client.intlGet('en', 'commandSyntaxAdd')}`;
        const commandRemove = `${Client.client.intlGet(rustplus.guildId, 'commandSyntaxRemove')}`;
        const commandRemoveEn = `${Client.client.intlGet('en', 'commandSyntaxRemove')}`;

        if (command.toLowerCase() === `${commandMarkers}` || command.toLowerCase() === `${commandMarkersEn}`) {
            let str = '';
            for (const name in rustplus.markers) str += `${name} [${rustplus.markers[name].location}], `;

            return str !== '' ? str.slice(0, -2) : Client.client.intlGet(rustplus.guildId, 'noRegisteredMarkers');
        }

        if (command.toLowerCase().startsWith(`${commandMarker} `)) {
            command = command.slice(`${commandMarker} `.length).trim();
        }
        else {
            command = command.slice(`${commandMarkerEn} `.length).trim();
        }
        const subcommand = command.replace(/ .*/, '');
        const name = command.slice(subcommand.length + 1);

        switch (subcommand.toLowerCase()) {
            case commandAddEn:
            case commandAdd: {
                if (name.startsWith(commandAdd) || name.startsWith(commandRemove)) return null;
                if (name.startsWith(commandAddEn) || name.startsWith(commandRemoveEn)) return null;
                if (name === '') return null;

                const teamInfo = await rustplus.getTeamInfoAsync();
                if (!(await rustplus.isResponseValid(teamInfo))) return null;

                for (const player of teamInfo.teamInfo.members) {
                    if (player.steamId.toString() === callerSteamId) {
                        const instance = Client.client.getInstance(rustplus.guildId);
                        const location = Map.getPos(player.x, player.y, rustplus.info.correctedMapSize, rustplus);
                        instance.serverList[rustplus.serverId].markers[name] =
                            { x: player.x, y: player.y, location: location.location };
                        Client.client.setInstance(rustplus.guildId, instance);
                        rustplus.markers[name] = { x: player.x, y: player.y, location: location.location };

                        return Client.client.intlGet(rustplus.guildId, 'markerAdded', {
                            name: name,
                            location: location.location
                        });
                    }
                }
            } break;

            case commandRemoveEn:
            case commandRemove: {
                const instance = Client.client.getInstance(rustplus.guildId);

                if (name in rustplus.markers) {
                    const location = rustplus.markers[name].location;
                    delete rustplus.markers[name];
                    delete instance.serverList[rustplus.serverId].markers[name];
                    Client.client.setInstance(rustplus.guildId, instance);

                    return Client.client.intlGet(rustplus.guildId, 'markerRemoved', {
                        name: name,
                        location: location
                    });
                }
                return Client.client.intlGet(rustplus.guildId, 'markerDoesNotExist', {
                    name: name
                });
            } break;

            default: {
                if (!(command in rustplus.markers)) {
                    return Client.client.intlGet(rustplus.guildId, 'markerDoesNotExist', {
                        name: command
                    });
                }

                const teamInfo = await rustplus.getTeamInfoAsync();
                if (!(await rustplus.isResponseValid(teamInfo))) return null;

                for (const player of teamInfo.teamInfo.members) {
                    if (player.steamId.toString() === callerSteamId) {
                        const direction = Map.getAngleBetweenPoints(player.x, player.y, rustplus.markers[command].x,
                            rustplus.markers[command].y);
                        const distance = Math.floor(Map.getDistance(player.x, player.y, rustplus.markers[command].x,
                            rustplus.markers[command].y));
                        console.log(rustplus.markers[command])

                        return Client.client.intlGet(rustplus.guildId, 'markerLocation', {
                            name: command,
                            location: rustplus.markers[command].location,
                            distance: distance,
                            player: player.name,
                            direction: direction
                        });
                    }
                }
            } break;
        }

        return null;
    }
};
