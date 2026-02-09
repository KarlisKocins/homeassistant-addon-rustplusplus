const Client = require('../../index');

module.exports = {
    key: 'leader',
    execute: async (rustplus, client, command, callerSteamId) => {
        const prefix = rustplus.generalSettings.prefix;
        const commandLeader = `${prefix}${Client.client.intlGet(rustplus.guildId, 'commandSyntaxLeader')}`;
        const commandLeaderEn = `${prefix}${Client.client.intlGet('en', 'commandSyntaxLeader')}`;

        if (!rustplus.generalSettings.leaderCommandEnabled) {
            return Client.client.intlGet(rustplus.guildId, 'leaderCommandIsDisabled');
        }

        const instance = Client.client.getInstance(rustplus.guildId);
        if (!Object.keys(instance.serverListLite[rustplus.serverId]).includes(rustplus.team.leaderSteamId)) {
            let names = '';
            for (const player of rustplus.team.players) {
                if (Object.keys(instance.serverListLite[rustplus.serverId]).includes(player.steamId)) {
                    names += `${player.name}, `
                }
            }
            names = names.slice(0, -2);

            return Client.client.intlGet(rustplus.guildId, 'leaderCommandOnlyWorks', {
                name: names
            });
        }

        if (command.toLowerCase() === `${commandLeader}` || command.toLowerCase() === `${commandLeaderEn}`) {
            if (callerSteamId === null) return null;

            if (rustplus.team.leaderSteamId !== callerSteamId) {
                if (rustplus.generalSettings.leaderCommandOnlyForPaired) {
                    if (!Object.keys(instance.serverListLite[rustplus.serverId]).includes(callerSteamId)) {
                        return Client.client.intlGet(rustplus.guildId, 'youAreNotPairedWithServer');
                    }
                }

                if (rustplus.team.leaderSteamId === rustplus.playerId) {
                    await rustplus.team.changeLeadership(callerSteamId);
                }
                else {
                    rustplus.leaderRustPlusInstance.promoteToLeaderAsync(callerSteamId);
                }

                const player = rustplus.team.getPlayer(callerSteamId);
                return Client.client.intlGet(rustplus.guildId, 'leaderTransferred', {
                    name: player.name
                });
            }
            else {
                return Client.client.intlGet(rustplus.guildId, 'youAreAlreadyLeader');
            }
        }
        else if (command.toLowerCase().startsWith(`${commandLeader} `) ||
            command.toLowerCase().startsWith(`${commandLeaderEn} `)) {
            let name = null;
            if (command.toLowerCase().startsWith(`${commandLeader} `)) {
                name = command.slice(`${commandLeader} `.length).trim();
            }
            else {
                name = command.slice(`${commandLeaderEn} `.length).trim();
            }

            for (const player of rustplus.team.players) {
                if (player.name.includes(name)) {
                    if (rustplus.team.leaderSteamId === player.steamId) {
                        return Client.client.intlGet(rustplus.guildId, 'leaderAlreadyLeader', {
                            name: player.name
                        });
                    }
                    else {
                        if (rustplus.generalSettings.leaderCommandOnlyForPaired) {
                            if (!Object.keys(instance.serverListLite[rustplus.serverId]).includes(player.steamId)) {
                                return Client.client.intlGet(rustplus.guildId, 'playerNotPairedWithServer', {
                                    name: player.name
                                });
                            }
                        }

                        if (rustplus.team.leaderSteamId === rustplus.playerId) {
                            await rustplus.team.changeLeadership(player.steamId);
                        }
                        else {
                            rustplus.leaderRustPlusInstance.promoteToLeaderAsync(player.steamId);
                        }

                        return Client.client.intlGet(rustplus.guildId, 'leaderTransferred', {
                            name: player.name
                        });
                    }
                }
            }

            return Client.client.intlGet(rustplus.guildId, 'couldNotIdentifyMember', {
                name: name
            });
        }

        return null;
    }
};
