/*
    Copyright (C) 2023 Alexander Emanuelsson (alexemanuelol)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    https://github.com/alexemanuelol/rustplusplus

*/

const A2S = require('./a2s.js');

module.exports = {
    /**
     *  Resolve the address to send A2S queries to for a server.
     *
     *  The serverList is keyed by the Rust+ companion port, not the game port that answers A2S
     *  queries, so the query port has to come from somewhere else. In order of preference:
     *    1. An explicit queryPort (and optional queryIp) configured on the server.
     *    2. The 'connect host:port' string, which earlier Battlemetrics updates populated.
     *    3. The Rust+ host with the default Rust game port.
     *  @param {object} server The serverList entry.
     *  @param {string|null} serverId The serverId of the server, used as a last resort for the host.
     *  @return {object|null} The host and port to query, null if no host could be determined.
     */
    resolveQueryAddress: function (server, serverId = null) {
        const fallbackHost = server && server.serverIp ? server.serverIp :
            module.exports.splitServerId(serverId)[0];

        if (server && server.queryPort) {
            const host = server.queryIp ? server.queryIp : fallbackHost;
            if (host) return { host: host, port: parseInt(server.queryPort), source: 'queryPort' };
        }

        if (server && typeof server.connect === 'string') {
            const match = server.connect.match(/(?:connect\s+)?(\S+):(\d+)\s*$/);
            if (match) return { host: match[1], port: parseInt(match[2]), source: 'connect' };
        }

        if (fallbackHost) {
            return { host: fallbackHost, port: A2S.DEFAULT_QUERY_PORT, source: 'default' };
        }

        return null;
    },

    /**
     *  Split a serverId of the form 'host-port' into its parts.
     *  @param {string|null} serverId The serverId to split.
     *  @return {Array} index 0: The host, index 1: The port. Both null if invalid.
     */
    splitServerId: function (serverId) {
        if (typeof serverId !== 'string') return [null, null];

        const index = serverId.lastIndexOf('-');
        if (index === -1) return [null, null];

        const host = serverId.slice(0, index);
        const port = serverId.slice(index + 1);
        if (host === '' || port === '') return [null, null];

        return [host, port];
    },

    /**
     *  Find the serverList entry that a Battlemetrics id belongs to.
     *  @param {object} instance The guild instance.
     *  @param {string} battlemetricsId The id of the Battlemetrics server.
     *  @return {Array} index 0: The serverId, index 1: The server. Both null if not found.
     */
    findServerListEntry: function (instance, battlemetricsId) {
        for (const [serverId, server] of Object.entries(instance.serverList)) {
            if (server.battlemetricsId === battlemetricsId) return [serverId, server];
        }
        return [null, null];
    },

    /**
     *  Find the first tracker that a Battlemetrics id belongs to.
     *  @param {object} instance The guild instance.
     *  @param {string} battlemetricsId The id of the Battlemetrics server.
     *  @return {object|null} The tracker, null if not found.
     */
    findTrackerEntry: function (instance, battlemetricsId) {
        for (const tracker of Object.values(instance.trackers)) {
            if (tracker.battlemetricsId === battlemetricsId) return tracker;
        }
        return null;
    },

    /**
     *  Resolve the server details for a Battlemetrics id, preferring live Battlemetrics data but
     *  falling back to the Rust+ connection and the persisted instance data when the Battlemetrics
     *  API is unavailable.
     *  @param {object} client The Discord client.
     *  @param {string} guildId The id of the guild.
     *  @param {string} battlemetricsId The id of the Battlemetrics server.
     *  @return {object} name, status, ip, port and streamerMode, plus live to indicate the source.
     *                   Any field that cannot be determined is null.
     */
    resolveServerInfo: function (client, guildId, battlemetricsId) {
        const bmInstance = client.battlemetricsInstances[battlemetricsId] ?
            client.battlemetricsInstances[battlemetricsId] : null;

        if (bmInstance !== null && bmInstance.lastUpdateSuccessful) {
            return {
                name: bmInstance.server_name,
                status: bmInstance.server_status,
                ip: bmInstance.server_ip,
                port: bmInstance.server_port,
                streamerMode: bmInstance.streamerMode,
                live: true
            };
        }

        const instance = client.getInstance(guildId);
        const [listServerId, listServer] = module.exports.findServerListEntry(instance, battlemetricsId);
        const tracker = module.exports.findTrackerEntry(instance, battlemetricsId);

        /* The Battlemetrics instance may still hold the address from an earlier successful update. */
        let serverId = null;
        if (bmInstance !== null && bmInstance.server_ip !== null && bmInstance.server_port !== null) {
            serverId = `${bmInstance.server_ip}-${bmInstance.server_port}`;
        }
        else if (listServerId !== null) {
            serverId = listServerId;
        }
        else if (tracker !== null && tracker.serverId) {
            serverId = tracker.serverId;
        }

        const [ip, port] = module.exports.splitServerId(serverId);

        /* Only the actively connected Rust+ server can tell us anything about itself. */
        const rustplus = client.rustplusInstances[guildId] ? client.rustplusInstances[guildId] : null;
        const isActiveServer = rustplus !== null && serverId !== null && rustplus.serverId === serverId;

        let name = null;
        if (isActiveServer && rustplus.info) name = rustplus.info.name;
        if (name === null && listServer !== null) name = listServer.title;
        if (name === null && tracker !== null) name = tracker.title;
        if (name === null && bmInstance !== null) name = bmInstance.server_name;

        return {
            name: name,
            status: isActiveServer ? rustplus.isOperational : null,
            ip: ip,
            port: port,
            streamerMode: null, /* Battlemetrics-only concept, no Rust+ equivalent. */
            live: false
        };
    }
};
