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

/**
 *  A player source backed by direct A2S queries against the Rust server, for use when the
 *  Battlemetrics API is unavailable. Exposes the same surface as the Battlemetrics class so that
 *  trackers, the /players command and the information channel can consume either one.
 *
 *  A2S reports player names and connected durations but no persistent player identifier, so the
 *  player name doubles as the id. The consequences are that a rename reads as a logout followed by
 *  a login rather than a name change, and that two players sharing a name collapse into one entry.
 */

const A2S = require('../util/a2s.js');
const Client = require('../../index.js');
const RandomUsernames = require('../staticFiles/RandomUsernames.json');
const Utils = require('../util/utils.js');

const SERVER_LOG_SIZE = 1000;
const CONNECTION_LOG_SIZE = 1000;
const PLAYER_CONNECTION_LOG_SIZE = 100;
const NAME_CHANGE_LOG_SIZE = 100;

class A2sServer {

    /**
     *  Constructor for the A2sServer class.
     *  @param {string} host The host of the server.
     *  @param {number} port The query port of the server.
     *  @param {string|null} name The name of the server, default null.
     */
    constructor(host, port, name = null) {
        /* Deliberately not numeric, so it is never mistaken for a Battlemetrics id. */
        this._id = `a2s:${host}:${port}`;
        this._name = name;

        this._host = host;
        this._port = port;

        this._data = null;

        this._ready = false;
        this._updatedAt = null;
        this._lastUpdateSuccessful = false;
        this._rustmapsAvailable = false;
        this._streamerMode = true; /* Until proven otherwise */
        this._serverLog = [];
        this._connectionLog = [];

        this._players = new Object();

        this._newPlayers = [];
        this._loginPlayers = [];
        this._logoutPlayers = [];
        this._nameChangedPlayers = []; /* Always empty, A2S cannot correlate a rename. */
        this._onlinePlayers = [];
        this._offlinePlayers = [];

        this._serverEvaluation = new Object();

        this.server_name = name;
        this.server_ip = host;
        this.server_port = port;
        this.server_players = null;
        this.server_maxPlayers = null;
        this.server_status = null;
        this.server_map = null;
    }

    /***********************************************************************************
     *  Getters and Setters
     **********************************************************************************/

    get id() { return this._id; }
    set id(id) { this._id = id; }
    get name() { return this._name; }
    set name(name) { this._name = name; }
    get host() { return this._host; }
    set host(host) { this._host = host; }
    get port() { return this._port; }
    set port(port) { this._port = port; }
    get data() { return this._data; }
    set data(data) { this._data = data; }
    get ready() { return this._ready; }
    set ready(ready) { this._ready = ready; }
    get updatedAt() { return this._updatedAt; }
    set updatedAt(updatedAt) { this._updatedAt = updatedAt; }
    get lastUpdateSuccessful() { return this._lastUpdateSuccessful; }
    set lastUpdateSuccessful(lastUpdateSuccessful) { this._lastUpdateSuccessful = lastUpdateSuccessful; }
    get rustmapsAvailable() { return this._rustmapsAvailable; }
    set rustmapsAvailable(rustmapsAvailable) { this._rustmapsAvailable = rustmapsAvailable; }
    get streamerMode() { return this._streamerMode; }
    set streamerMode(streamerMode) { this._streamerMode = streamerMode; }
    get serverLog() { return this._serverLog; }
    set serverLog(serverLog) { this._serverLog = serverLog; }
    get connectionLog() { return this._connectionLog; }
    set connectionLog(connectionLog) { this._connectionLog = connectionLog; }
    get players() { return this._players; }
    set players(players) { this._players = players; }
    get newPlayers() { return this._newPlayers; }
    set newPlayers(newPlayers) { this._newPlayers = newPlayers; }
    get loginPlayers() { return this._loginPlayers; }
    set loginPlayers(loginPlayers) { this._loginPlayers = loginPlayers; }
    get logoutPlayers() { return this._logoutPlayers; }
    set logoutPlayers(logoutPlayers) { this._logoutPlayers = logoutPlayers; }
    get nameChangedPlayers() { return this._nameChangedPlayers; }
    set nameChangedPlayers(nameChangedPlayers) { this._nameChangedPlayers = nameChangedPlayers; }
    get onlinePlayers() { return this._onlinePlayers; }
    set onlinePlayers(onlinePlayers) { this._onlinePlayers = onlinePlayers; }
    get offlinePlayers() { return this._offlinePlayers; }
    set offlinePlayers(offlinePlayers) { this._offlinePlayers = offlinePlayers; }
    get serverEvaluation() { return this._serverEvaluation; }
    set serverEvaluation(serverEvaluation) { this._serverEvaluation = serverEvaluation; }

    /***********************************************************************************
     *  Private methods
     **********************************************************************************/

    /**
     *  Update the server log of the server.
     *  @param {object} data The log entry.
     */
    #updateServerLog(data) {
        if (this.serverLog.length === SERVER_LOG_SIZE) {
            this.serverLog.pop();
        }
        this.serverLog.unshift(data);
    }

    /**
     *  Update the connection log of a player.
     *  @param {string} id The id of the player.
     *  @param {object} data Types 0 = Login, 1 = Logout. And time in iso format.
     */
    #updateConnectionLog(id, data) {
        if (!this.players.hasOwnProperty(id)) return;

        if (this.players[id]['connectionLog'].length === PLAYER_CONNECTION_LOG_SIZE) {
            this.players[id]['connectionLog'].pop();
        }
        this.players[id]['connectionLog'].unshift(data);

        if (this.connectionLog.length === CONNECTION_LOG_SIZE) {
            this.connectionLog.pop();
        }
        this.connectionLog.unshift({ id: id, data: data });
    }

    /**
     *  Evaluate if a server parameter have changed.
     *  @param {string} key The parameter key.
     *  @param {*} value1 The value of the current server setting.
     *  @param {*} value2 The value of the new server setting.
     *  @param {bool} firstTime True if it is the first time evaluating, else false.
     */
    #evaluateServerParameter(key, value1, value2, firstTime) {
        if (firstTime) return;
        if (value1 === value2) return;

        this.serverEvaluation[key] = { from: value1, to: value2 };
        this.#updateServerLog({ key: key, from: value1, to: value2, time: new Date().toISOString() });
    }

    /**
     *  Format the time from timestamp to now [seconds,HH:MM].
     *  @param {string} timestamp The timestamp from before.
     *  @return {Array} index 0: seconds, index 1: The formatted time, null if invalid.
     */
    #formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = Date.now();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs / (1000 * 60)) % 60);
        const hoursStr = diffHours.toString().padStart(2, '0');
        const minutesStr = diffMinutes.toString().padStart(2, '0');
        return [parseInt(diffMs / 1000), `${hoursStr}:${minutesStr}`];
    }

    /***********************************************************************************
     *  Public methods
     **********************************************************************************/

    /**
     *  Setup the A2sServer instance with a first evaluation.
     */
    async setup() {
        await this.evaluation(null, true);
    }

    /**
     *  A2S carries no player history, so no profile data can be provided.
     *  @return {Array} An empty array.
     */
    async getProfileData() {
        return [];
    }

    /**
     *  Query the server and evaluate the result to check for changes.
     *  @param {object} data Pre-fetched data, or null to query the server.
     *  @param {bool} firstTime True if it is the first time evaluating, else false.
     *  @return {bool} True if successful, else false.
     */
    async evaluation(data = null, firstTime = false) {
        if (data === null) {
            try {
                const [info, players] = await Promise.all([
                    A2S.queryInfo(this.host, this.port),
                    A2S.queryPlayers(this.host, this.port)
                ]);
                data = { info: info, players: players };
            }
            catch (e) {
                this.lastUpdateSuccessful = false;
                this.server_status = false;
                Client.client.log(Client.client.intlGet(null, 'errorCap'),
                    `A2S query to ${this.host}:${this.port} failed: ${e.message}`, 'error');
                return false;
            }
        }

        this.lastUpdateSuccessful = true;
        this.data = data;
        this.ready = true;

        const time = new Date().toISOString();
        this.updatedAt = time;

        /* Server evaluation */

        this.serverEvaluation = new Object();
        const name = Utils.removeInvisibleCharacters(data.info.name);

        this.#evaluateServerParameter('server_name', this.server_name, name, firstTime);
        this.#evaluateServerParameter('server_players', this.server_players, data.info.players, firstTime);
        this.#evaluateServerParameter('server_maxPlayers', this.server_maxPlayers, data.info.maxPlayers, firstTime);
        this.#evaluateServerParameter('server_map', this.server_map, data.info.map, firstTime);
        this.#evaluateServerParameter('server_status', this.server_status, true, firstTime);

        this.server_name = name;
        this.name = name;
        this.server_players = data.info.players;
        this.server_maxPlayers = data.info.maxPlayers;
        this.server_map = data.info.map;
        this.server_status = true;

        /* Players evaluation */

        this.newPlayers = [];
        this.loginPlayers = [];
        this.logoutPlayers = [];
        this.nameChangedPlayers = [];
        const prevOnlinePlayers = this.onlinePlayers;
        this.onlinePlayers = [];
        this.offlinePlayers = [];

        let allNamesRandom = true;

        for (const player of data.players) {
            const playerName = Utils.removeInvisibleCharacters(player.name);
            if (playerName === '') continue;

            if (!RandomUsernames.RandomUsernames.includes(playerName)) allNamesRandom = false;

            /* A2S has no player id, the name is the only thing that identifies a player. */
            const id = playerName;

            /* The reported duration lets us reconstruct when the player connected. */
            const connectedAt = new Date(Date.now() - Math.round(player.duration * 1000)).toISOString();

            if (!this.players.hasOwnProperty(id)) { /* New player */
                this.players[id] = new Object();

                this.players[id]['id'] = id;
                this.players[id]['name'] = playerName;
                this.players[id]['private'] = false;
                this.players[id]['positiveMatch'] = false;
                this.players[id]['createdAt'] = connectedAt;
                this.players[id]['updatedAt'] = connectedAt;

                /* No Battlemetrics profile exists for an A2S sourced player. */
                this.players[id]['url'] = null;
                this.players[id]['status'] = true;
                this.players[id]['nameChangeHistory'] = [];
                this.players[id]['connectionLog'] = [];
                this.players[id]['logoutDate'] = null;

                if (!firstTime) this.#updateConnectionLog(id, { type: 0, time: time }); /* 0 = Login event */

                this.newPlayers.push(id);
            }
            else { /* Existing player */
                this.players[id]['updatedAt'] = connectedAt;

                if (this.players[id]['status'] === false) {
                    this.players[id]['status'] = true;
                    this.#updateConnectionLog(id, { type: 0, time: time }); /* 0 = Login event */
                    this.loginPlayers.push(id);
                }
            }

            this.onlinePlayers.push(id);
        }

        /* A server that randomizes query names is the A2S equivalent of Battlemetrics streamer mode. */
        this.streamerMode = data.players.length > 0 ? allNamesRandom : this.streamerMode;

        const offlinePlayers = prevOnlinePlayers.filter(e => !this.onlinePlayers.includes(e));
        for (const id of offlinePlayers) {
            if (!this.players.hasOwnProperty(id)) continue;
            this.players[id]['status'] = false;
            this.players[id]['logoutDate'] = time;
            this.#updateConnectionLog(id, { type: 1, time: time }); /* 1 = Logout event */
            this.logoutPlayers.push(id);
        }

        for (const [playerId, content] of Object.entries(this.players)) {
            if (content['status'] === false) this.offlinePlayers.push(playerId);
        }

        return true;
    }

    /**
     *  Get the online time of a player.
     *  @param {string} playerId The id of the player to get online time from.
     *  @return {Array} index 0: seconds online, index 1: The formatted online time of a player.
     */
    getOnlineTime(playerId) {
        if (!this.lastUpdateSuccessful || !this.players.hasOwnProperty(playerId) ||
            !this.players[playerId]['updatedAt']) {
            return null;
        }

        return this.#formatTime(this.players[playerId]['updatedAt']);
    }

    /**
     *  Get the offline time of a player.
     *  @param {string} playerId The id of the player to get offline time from.
     *  @return {Array} index 0: seconds offline, index 1: The formatted offline time of a player.
     */
    getOfflineTime(playerId) {
        if (!this.lastUpdateSuccessful || !this.players.hasOwnProperty(playerId) ||
            !this.players[playerId]['logoutDate']) {
            return null;
        }

        return this.#formatTime(this.players[playerId]['logoutDate']);
    }

    /**
     *  Get an array of online players ordered by time played.
     *  @return {Array} An array of online players ordered by time played.
     */
    getOnlinePlayerIdsOrderedByTime() {
        const unordered = [];
        for (const playerId of this.onlinePlayers) {
            const seconds = this.#formatTime(this.players[playerId]['updatedAt']);
            unordered.push([seconds !== null ? seconds[0] : 0, playerId]);
        }
        const ordered = unordered.sort(function (a, b) { return b[0] - a[0] });
        return ordered.map(e => e[1]);
    }

    /**
     *  Get an array of offline players ordered by least time since online.
     *  @return {Array} An array of offline players ordered by least time since online.
     */
    getOfflinePlayerIdsOrderedByLeastTimeSinceOnline() {
        const unordered = [];
        for (const playerId of this.offlinePlayers) {
            const seconds = this.#formatTime(this.players[playerId]['logoutDate']);
            unordered.push([seconds !== null ? seconds[0] : 0, playerId]);
        }
        const ordered = unordered.sort(function (a, b) { return a[0] - b[0] });
        return ordered.map(e => e[1]);
    }
}

module.exports = A2sServer;
