const Client = require('../../index');
const TeamHandler = require('../handlers/teamHandler');
const Map = require('../util/map');

module.exports = {
    key: 'prox',
    execute: async (rustplus, client, command, callerSteamId) => {
        const caller = rustplus.team.getPlayer(callerSteamId);
        const prefix = rustplus.generalSettings.prefix;
        const commandProx = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxProx')}`;
        const commandProxEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxProx')}`;

        if ((command.toLowerCase() !== `${commandProx}` && !command.toLowerCase().startsWith(`${commandProx} `)) &&
            (command.toLowerCase() !== `${commandProxEn}` && !command.toLowerCase().startsWith(`${commandProxEn} `))) {
            return null;
        }

        const teamInfo = await rustplus.getTeamInfoAsync();
        if (!(await rustplus.isResponseValid(teamInfo))) return null;
        TeamHandler.handler(rustplus, Client.client, teamInfo.teamInfo);
        rustplus.team.updateTeam(teamInfo.teamInfo);

        if (command.toLowerCase() === `${commandProx}` || command.toLowerCase() === `${commandProxEn}`) {
            const closestPlayers = [];
            let players = [...rustplus.team.players].filter(e => e.steamId !== callerSteamId && e.isAlive === true);
            if (players.length === 0) {
                return Client.client.intlGet(rustplus.guildId, 'onlyOneInTeam');
            }

            for (let i = 0; i < 3; i++) {
                if (players.length > 0) {
                    const player = players.reduce(function (prev, curr) {
                        if (Map.getDistance(prev.x, prev.y, caller.x, caller.y) <
                            Map.getDistance(curr.x, curr.y, caller.x, caller.y)) {
                            return prev;
                        }
                        else {
                            return curr;
                        }
                    });
                    closestPlayers.push(player);
                    players = players.filter(e => e.steamId !== player.steamId);
                }
            }

            let string = '';
            for (const player of closestPlayers) {
                const distance = Math.floor(Map.getDistance(player.x, player.y, caller.x, caller.y));
                string += `${player.name} (${distance}m [${player.pos.location}]), `;
            }

            return string === '' ? Client.client.intlGet(rustplus.guildId, 'allTeammatesAreDead') :
                `${string.slice(0, -2)}.`
        }

        let memberName = null;
        if (command.toLowerCase().startsWith(`${commandProx}`)) {
            memberName = command.slice(`${commandProx} `.length).trim();
        }
        else {
            memberName = command.slice(`${commandProxEn} `.length).trim();
        }

        for (const player of rustplus.team.players) {
            if (player.name.includes(memberName)) {
                const distance = Math.floor(Map.getDistance(caller.x, caller.y, player.x, player.y));
                const direction = Map.getAngleBetweenPoints(caller.x, caller.y, player.x, player.y);
                return Client.client.intlGet(rustplus.guildId, 'proxLocation', {
                    name: player.name,
                    distance: distance,
                    caller: caller.name,
                    direction: direction,
                    location: player.pos.location
                });
            }
        }

        return Client.client.intlGet(rustplus.guildId, 'couldNotIdentifyMember', {
            name: memberName
        });
    }
};
