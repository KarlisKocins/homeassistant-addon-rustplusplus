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
 *  Implementation of the Valve A2S query protocol, the same source Battlemetrics and the in-game
 *  server browser use to read Rust server state. Only the two queries we need are implemented:
 *  A2S_INFO (server details) and A2S_PLAYER (the connected player list).
 *
 *  https://developer.valvesoftware.com/wiki/Server_queries
 */

const Dgram = require('dgram');

const SINGLE_PACKET_HEADER = -1;    /* 0xFFFFFFFF */
const SPLIT_PACKET_HEADER = -2;     /* 0xFFFFFFFE */

const A2S_INFO_HEADER = 0x54;       /* 'T' */
const A2S_PLAYER_HEADER = 0x55;     /* 'U' */
const S2A_INFO_HEADER = 0x49;       /* 'I' */
const S2A_PLAYER_HEADER = 0x44;     /* 'D' */
const S2C_CHALLENGE_HEADER = 0x41;  /* 'A' */

const A2S_INFO_PAYLOAD = Buffer.from('Source Engine Query\0', 'ascii');
const EMPTY_CHALLENGE = Buffer.from([0xFF, 0xFF, 0xFF, 0xFF]);

const DEFAULT_TIMEOUT_MS = 5000;
const MAX_CHALLENGE_RETRIES = 2;

/**
 *  Sequential reader over a response buffer.
 */
class Reader {
    constructor(buffer) {
        this.buffer = buffer;
        this.offset = 0;
    }

    get remaining() {
        return this.buffer.length - this.offset;
    }

    byte() {
        if (this.remaining < 1) throw new Error('A2S response truncated (byte)');
        return this.buffer.readUInt8(this.offset++);
    }

    short() {
        if (this.remaining < 2) throw new Error('A2S response truncated (short)');
        const value = this.buffer.readInt16LE(this.offset);
        this.offset += 2;
        return value;
    }

    long() {
        if (this.remaining < 4) throw new Error('A2S response truncated (long)');
        const value = this.buffer.readInt32LE(this.offset);
        this.offset += 4;
        return value;
    }

    float() {
        if (this.remaining < 4) throw new Error('A2S response truncated (float)');
        const value = this.buffer.readFloatLE(this.offset);
        this.offset += 4;
        return value;
    }

    string() {
        const end = this.buffer.indexOf(0x00, this.offset);
        if (end === -1) throw new Error('A2S response truncated (string)');
        const value = this.buffer.toString('utf8', this.offset, end);
        this.offset = end + 1;
        return value;
    }
}

/**
 *  Reassemble a set of split packets into a single response body.
 *  @param {Array} packets The received split packets.
 *  @return {Buffer|null} The reassembled body, null if incomplete or compressed.
 */
function reassemble(packets) {
    const sorted = packets.slice().sort((a, b) => a.number - b.number);
    if (sorted.length === 0) return null;
    if (sorted.length !== sorted[0].total) return null;

    for (let i = 0; i < sorted.length; i += 1) {
        if (sorted[i].number !== i) return null;
    }

    const body = Buffer.concat(sorted.map(e => e.payload));

    /* The reassembled body still carries the single-packet header. */
    if (body.length < 4 || body.readInt32LE(0) !== SINGLE_PACKET_HEADER) return null;
    return body.subarray(4);
}

/**
 *  Parse a split packet into its parts.
 *  @param {Buffer} packet The raw datagram.
 *  @return {object|null} The parsed split packet, null if unusable.
 */
function parseSplitPacket(packet) {
    if (packet.length < 9) return null;

    const id = packet.readInt32LE(4);

    /* A set most significant bit signals bzip2 compression, which Rust does not use. */
    if ((id & 0x80000000) !== 0) return null;

    const total = packet.readUInt8(8);
    const number = packet.readUInt8(9);

    /* Source servers include a split size field that we do not need but must skip. */
    const payload = packet.subarray(12);

    return { id: id, total: total, number: number, payload: payload };
}

/**
 *  Send an A2S request and collect the response, transparently answering challenges.
 *  @param {string} host The host of the server.
 *  @param {number} port The query port of the server.
 *  @param {number} header The request header byte.
 *  @param {Buffer} payload The request payload.
 *  @param {number} timeout The timeout in milliseconds.
 *  @return {Promise<Reader>} A reader positioned at the response header byte.
 */
function request(host, port, header, payload, timeout) {
    return new Promise((resolve, reject) => {
        const socket = Dgram.createSocket('udp4');

        let splitPackets = [];
        let challengeRetries = 0;
        let settled = false;

        const timer = setTimeout(() => finish(new Error(`A2S query to ${host}:${port} timed out`)), timeout);

        function finish(error, result) {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try {
                socket.close();
            }
            catch (e) {
                /* Already closed. */
            }
            if (error) reject(error);
            else resolve(result);
        }

        function send(challenge) {
            const parts = [Buffer.from([0xFF, 0xFF, 0xFF, 0xFF, header])];
            if (payload.length > 0) parts.push(payload);
            if (challenge) parts.push(challenge);

            socket.send(Buffer.concat(parts), port, host, (error) => {
                if (error) finish(error);
            });
        }

        function handleBody(body) {
            const reader = new Reader(body);
            const responseHeader = reader.byte();

            if (responseHeader === S2C_CHALLENGE_HEADER) {
                if (challengeRetries >= MAX_CHALLENGE_RETRIES) {
                    finish(new Error(`A2S query to ${host}:${port} kept returning challenges`));
                    return;
                }
                challengeRetries += 1;
                splitPackets = [];

                const challenge = body.subarray(1, 5);
                /* A2S_INFO repeats its payload with the challenge appended, A2S_PLAYER does not. */
                send(challenge);
                return;
            }

            reader.offset = 0;
            finish(null, reader);
        }

        socket.on('error', (error) => finish(error));

        socket.on('message', (packet) => {
            try {
                if (packet.length < 5) return;

                const packetHeader = packet.readInt32LE(0);

                if (packetHeader === SINGLE_PACKET_HEADER) {
                    handleBody(packet.subarray(4));
                    return;
                }

                if (packetHeader === SPLIT_PACKET_HEADER) {
                    const split = parseSplitPacket(packet);
                    if (split === null) {
                        finish(new Error(`A2S query to ${host}:${port} returned a compressed or malformed packet`));
                        return;
                    }

                    /* Discard parts belonging to an earlier request. */
                    if (splitPackets.length > 0 && splitPackets[0].id !== split.id) splitPackets = [];
                    if (splitPackets.some(e => e.number === split.number)) return;

                    splitPackets.push(split);

                    const body = reassemble(splitPackets);
                    if (body !== null) handleBody(body);
                    return;
                }
            }
            catch (error) {
                finish(error);
            }
        });

        send(payload.length > 0 ? null : EMPTY_CHALLENGE);
    });
}

module.exports = {
    DEFAULT_QUERY_PORT: 28015,

    /**
     *  Query a server for its details.
     *  @param {string} host The host of the server.
     *  @param {number} port The query port of the server.
     *  @param {number} timeout The timeout in milliseconds.
     *  @return {Promise<object>} The server details.
     */
    queryInfo: async function (host, port, timeout = DEFAULT_TIMEOUT_MS) {
        const reader = await request(host, port, A2S_INFO_HEADER, A2S_INFO_PAYLOAD, timeout);

        const header = reader.byte();
        if (header !== S2A_INFO_HEADER) {
            throw new Error(`Unexpected A2S_INFO response header 0x${header.toString(16)}`);
        }

        reader.byte();                      /* Protocol */
        const name = reader.string();
        const map = reader.string();
        reader.string();                    /* Folder */
        reader.string();                    /* Game */
        reader.short();                     /* Steam application id */
        const players = reader.byte();
        const maxPlayers = reader.byte();
        const bots = reader.byte();

        return {
            name: name,
            map: map,
            players: players,
            maxPlayers: maxPlayers,
            bots: bots
        };
    },

    /**
     *  Query a server for its connected players.
     *
     *  Rust reports a name and a connected duration per player but no persistent identifier, and
     *  some servers return entries with an empty name that do not correspond to a real player.
     *  @param {string} host The host of the server.
     *  @param {number} port The query port of the server.
     *  @param {number} timeout The timeout in milliseconds.
     *  @return {Promise<Array>} The connected players, each with a name and a duration in seconds.
     */
    queryPlayers: async function (host, port, timeout = DEFAULT_TIMEOUT_MS) {
        const reader = await request(host, port, A2S_PLAYER_HEADER, Buffer.alloc(0), timeout);

        const header = reader.byte();
        if (header !== S2A_PLAYER_HEADER) {
            throw new Error(`Unexpected A2S_PLAYER response header 0x${header.toString(16)}`);
        }

        const count = reader.byte();
        const players = [];

        for (let i = 0; i < count; i += 1) {
            /* A truncated tail is common on busy servers, keep whatever parsed cleanly. */
            try {
                reader.byte();                      /* Index, not populated by Rust */
                const name = reader.string();
                reader.long();                      /* Score, not populated by Rust */
                const duration = reader.float();

                if (name === '') continue;

                players.push({
                    name: name,
                    duration: Number.isFinite(duration) && duration >= 0 ? duration : 0
                });
            }
            catch (e) {
                break;
            }
        }

        return players;
    }
};
