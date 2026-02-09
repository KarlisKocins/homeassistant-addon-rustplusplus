const Client = require('../../index');
const TeamHandler = require('../handlers/teamHandler');
const Map = require('../util/map');

module.exports = {
    key: 'death',
    execute: async (rustplus, client, command, callerSteamId) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandDeath = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxDeath')}`;
        const commandDeathEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxDeath')}`;
        const commandDeaths = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxDeaths')}`;
        const commandDeathsEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxDeaths')}`;

        const teamInfo = await rustplus.getTeamInfoAsync();
        if (!(await rustplus.isResponseValid(teamInfo))) return null;
        TeamHandler.handler(rustplus, Client.client, teamInfo.teamInfo);
        rustplus.team.updateTeam(teamInfo.teamInfo);

        const caller = rustplus.team.getPlayer(callerSteamId);

        if (command.toLowerCase().startsWith(`${commandDeaths}`) ||
            command.toLowerCase().startsWith(`${commandDeathsEn}`)) {
            let number = null;
            if (command.toLowerCase().startsWith(`${commandDeaths}`)) {
                number = parseInt(command.slice(`${commandDeaths}`.length).trim());
            }
            else {
                number = parseInt(command.slice(`${commandDeathsEn}`.length).trim());
            }

            if (rustplus.allDeaths.length === 0) {
                return Client.client.intlGet(rustplus.guildId, 'noRegisteredDeathEvents');
            }

            const strings = [];
            let counter = 1;
            for (const event of rustplus.allDeaths) {
                if (counter === 6) break;
                const location = event.location;

                let str = `${event.time} - ${event.name}: `;
                if (event.location === null) {
                    if (counter === number) return `${str}${Client.client.intlGet(rustplus.guildId, 'unknown')}`;
                    strings.push(`${str}${Client.client.intlGet(rustplus.guildId, 'unknown')}`);
                }
                else {
                    const distance = Math.floor(Map.getDistance(caller.x, caller.y, location.x, location.y));
                    const direction = Map.getAngleBetweenPoints(caller.x, caller.y, location.x, location.y);
                    const grid = location.location;
                    str += Client.client.intlGet(rustplus.guildId, 'distanceDirectionGrid', {
                        distance: distance, direction: direction, grid: grid
                    });
                    if (counter === number) return str;
                    strings.push(str);
                }

                counter += 1;
            }

            return strings;
        }

        if (command.toLowerCase().startsWith(`${commandDeath} `)) {
            command = command.slice(`${commandDeath} `.length).trim();
        }
        else {
            command = command.slice(`${commandDeathEn} `.length).trim();
        }
        const name = command.replace(/ .*/, '');
        const number = parseInt(command.slice(name.length + 1));

        for (const player of rustplus.team.players) {
            if (player.name.includes(name)) {
                if (!rustplus.playerDeaths.hasOwnProperty(player.steamId)) {
                    rustplus.playerDeaths[player.steamId] = [];
                }

                if (rustplus.playerDeaths[player.steamId].length === 0) {
                    return Client.client.intlGet(rustplus.guildId, 'noRegisteredDeathEventsUser', {
                        user: player.name
                    });
                }

                const strings = [];
                let counter = 1;
                for (const event of rustplus.playerDeaths[player.steamId]) {
                    if (counter === 6) break;
                    const location = event.location;

                    let str = `${event.time} - `;
                    if (event.location === null) {
                        if (counter === number) return `${str}${Client.client.intlGet(rustplus.guildId, 'unknown')}`;
                        strings.push(`${str}${Client.client.intlGet(rustplus.guildId, 'unknown')}`);
                    }
                    else {
                        const distance = Math.floor(Map.getDistance(caller.x, caller.y, location.x, location.y));
                        const direction = Map.getAngleBetweenPoints(caller.x, caller.y, location.x, location.y);
                        const grid = location.location;
                        str += Client.client.intlGet(rustplus.guildId, 'distanceDirectionGrid', {
                            distance: distance, direction: direction, grid: grid
                        });
                        if (counter === number) return str;
                        strings.push(str);
                    }

                    counter += 1;
                }

                return strings;
            }
        }

        return Client.client.intlGet(rustplus.guildId, 'couldNotIdentifyMember', {
            name: name
        });
    }
};
