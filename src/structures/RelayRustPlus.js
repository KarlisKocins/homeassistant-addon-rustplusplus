/*
    Transport layer shared by RustPlus and RustPlusLite.

    Extends the rustplus.js client and overrides connect() only: it picks the Facepunch relay or
    the legacy direct connection (see util/rustRelay.js) and otherwise behaves exactly like the
    library, with the same events ('connecting', 'connected', 'message', 'disconnected', 'error')
    and the same request/response sequence handling.

    This class does not depend on the bot. Subclasses provide the data it needs through
    getRelayContext() and may override relayLog().
*/

const Path = require('path');

const RustPlusLib = require('@liamcottle/rustplus.js');
const RustRelay = require('../util/rustRelay.js');

/* Resolve ws/protobufjs from the library's own location so the versions always match it. */
const LIB_DIR = Path.dirname(require.resolve('@liamcottle/rustplus.js'));
const WebSocket = require(require.resolve('ws', { paths: [LIB_DIR] }));
const protobuf = require(require.resolve('protobufjs', { paths: [LIB_DIR] }));
const PROTO_PATH = Path.join(LIB_DIR, 'rustplus.proto');

class RelayRustPlus extends RustPlusLib {
    constructor(server, port, playerId, playerToken, useFacepunchProxy) {
        super(server, port, playerId, playerToken, useFacepunchProxy);

        this.relayBaseUrl = RustRelay.RELAY_BASE_URL;
        this.connectionMode = null;     /* 'relay' | 'direct' | 'blocked' | 'unavailable' */
    }

    /* Override: { guildId, instance, credentials } for the server this client connects to, or
       null when unknown (the client then connects directly). */
    getRelayContext() {
        return null;
    }

    relayLog(level, text) {
        if (typeof this.log === 'function') this.log('Relay', text, level);
    }

    getStateKey() {
        const context = this.getRelayContext();
        const guildId = context && context.guildId !== undefined ? context.guildId : '';
        return RustRelay.stateKey(guildId, `${this.server}-${this.port}`, this.playerId);
    }

    /* True when the relay rejected this player's token, or it is expired: retrying with the same
       token cannot succeed, so reconnect loops should stop until a new token is stored. */
    isRelayBlocked() {
        const state = RustRelay.getState(this.getStateKey());
        return state.authBlocked;
    }

    /* How long to wait before reconnecting: grows with consecutive failures, resets on success. */
    getReconnectDelayMs(baseMs) {
        return RustRelay.reconnectDelayMs(baseMs, RustRelay.getState(this.getStateKey()).failures);
    }

    connect() {
        let context = null;
        try {
            context = this.getRelayContext();
        }
        catch (e) {
            this.relayLog('warn', `Could not read relay data (${e.message}), connecting directly.`);
        }

        const key = this.getStateKey();
        const state = RustRelay.getState(key);
        const relay = context ?
            RustRelay.resolveConnection(
                context.instance, context.credentials, this.server, this.port, this.playerId) : null;
        const choice = RustRelay.chooseTransport({ relay, serverIp: this.server, state });

        this.connectionMode = choice.mode;

        switch (choice.mode) {
            case 'relay': {
                this.relayLog('info', `Connecting via Rust+ relay (server id ${relay.relayServerId}).`);
                this.connectRelay(relay, key);
            } break;

            case 'direct': {
                const hint = choice.reason === 'no relay server id' ?
                    ' Pair the server again in game to add it.' : '';
                this.relayLog('info', `Connecting directly (${choice.reason}).${hint}`);
                this.trackDirect(key);
                super.connect();
            } break;

            default: {
                /* blocked or unavailable: nothing to connect with, and trying again will not help
                   until a token is stored. Reported as an error; no websocket exists so no
                   'disconnected' event follows and no reconnect loop starts. */
                const error = new Error(choice.mode === 'blocked' ?
                    `Rust+ auth token ${choice.reason}. Add a fresh token to reconnect.` :
                    `Cannot connect: ${choice.reason}.`);
                error.code = choice.mode === 'blocked' ? 'RELAY_AUTH' : 'RELAY_UNAVAILABLE';
                error.relayAuth = choice.mode === 'blocked' || choice.reason === 'no auth token';
                error.relayReason = choice.reason;
                if (choice.mode === 'blocked') RustRelay.markAuthBlocked(key, choice.reason);
                setImmediate(() => this.emit('error', error));
            } break;
        }
    }

    trackDirect(key) {
        if (this.directTracked) return;
        this.directTracked = true;

        let connected = false;
        this.once('connected', () => {
            connected = true;
            RustRelay.markWorked(key, 'direct');
        });
        this.once('disconnected', () => {
            if (!connected) RustRelay.markFailure(key, 'direct');
        });
    }

    connectRelay(relay, key) {
        protobuf.load(PROTO_PATH).then((root) => {
            /* make sure an existing connection is disconnected before connecting again */
            if (this.websocket) this.disconnect();

            this.AppRequest = root.lookupType('rustplus.AppRequest');
            this.AppMessage = root.lookupType('rustplus.AppMessage');

            this.emit('connecting');

            const address = RustRelay.buildRelayUrl(this.relayBaseUrl, relay.relayServerId);
            const websocket = new WebSocket(address, RustRelay.relaySubprotocols(relay.authToken), {
                origin: RustRelay.RELAY_ORIGIN
            });
            this.websocket = websocket;

            /* An upgrade the relay accepts and then drops is not a working connection: it only counts
               as one after the first protobuf frame has arrived. */
            let opened = false;
            let confirmed = false;
            let failureCounted = false;
            const countFailure = () => {
                if (confirmed || failureCounted) return;
                failureCounted = true;
                RustRelay.markFailure(key, 'relay');
            };

            websocket.on('open', () => {
                opened = true;
                this.emit('connected');
            });

            websocket.on('error', (e) => {
                if (!opened && RustRelay.classifyFailure(e, relay) === 'auth') {
                    e.relayAuth = true;
                    e.relayReason = 'rejected';
                    RustRelay.markAuthBlocked(key, 'rejected');
                }
                else {
                    countFailure();
                }
                this.emit('error', e);
            });

            websocket.on('message', (data, isBinary) => {
                /* The relay may send text frames; only binary frames are protobuf AppMessages. */
                if (!isBinary) return;

                const message = this.AppMessage.decode(data);

                if (!confirmed) {
                    confirmed = true;
                    RustRelay.markWorked(key, 'relay');
                }

                if (message.response && message.response.seq && this.seqCallbacks[message.response.seq]) {
                    const callback = this.seqCallbacks[message.response.seq];
                    const result = callback(message);
                    delete this.seqCallbacks[message.response.seq];
                    if (result) return;
                }

                this.emit('message', this.AppMessage.decode(data));
            });

            websocket.on('close', () => {
                countFailure();
                this.emit('disconnected');
            });
        }).catch((e) => {
            this.emit('error', e);
        });
    }
}

module.exports = RelayRustPlus;
