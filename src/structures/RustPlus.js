/*
    Copyright (C) 2022 Alexander Emanuelsson (alexemanuelol)

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

const Fs = require('fs');
const Path = require('path');
const RustPlusLib = require('@liamcottle/rustplus.js');
const Translate = require('translate').default;

const Client = require('../../index.js');
const Constants = require('../util/constants.js');
const Decay = require('../util/decay.js');
const DiscordEmbeds = require('../discordTools/discordEmbeds');
const DiscordMessages = require('../discordTools/discordMessages.js');
const DiscordVoice = require('../discordTools/discordVoice.js');
const DiscordTools = require('../discordTools/discordTools.js');
const InGameChatHandler = require('../handlers/inGameChatHandler.js');
const InstanceUtils = require('../util/instanceUtils.js');
const Languages = require('../util/languages.js');
const Logger = require('./Logger.js');
const Map = require('../util/map.js');
const RustPlusLite = require('../structures/RustPlusLite');
const TeamHandler = require('../handlers/teamHandler.js');
const Timer = require('../util/timer.js');

/* Text command modules for getCommand wrappers */
const TimeCommand = require('../textCommands/time.js');
const PopCommand = require('../textCommands/pop.js');
const WipeCommand = require('../textCommands/wipe.js');
const CargoCommand = require('../textCommands/cargo.js');
const HeliCommand = require('../textCommands/heli.js');
const SmallCommand = require('../textCommands/small.js');
const LargeCommand = require('../textCommands/large.js');
const ChinookCommand = require('../textCommands/chinook.js');
const DeepSeaCommand = require('../textCommands/deepSea.js');
const TravelingVendorCommand = require('../textCommands/travelingVendor.js');

const TOKENS_LIMIT = 24;        /* Per player */
const TOKENS_REPLENISH = 3;     /* Per second */

class RustPlus extends RustPlusLib {
    constructor(guildId, serverIp, appPort, steamId, playerToken) {
        super(serverIp, appPort, steamId, playerToken);

        this.serverId = `${this.server}-${this.port}`;
        this.guildId = guildId;

        this.leaderRustPlusInstance = null;
        this.uptimeServer = null;

        /* Status flags */
        this.isOperational = false;         /* Connected to the server, and request is verified. */
        this.isDeleted = false;             /* Is the rustplus instance deleted? */
        this.isNewConnection = false;       /* Is it an actively selected connection (pressed CONNECT button)? */
        this.isFirstPoll = true;            /* Is this the first poll since connection started? */

        /* Interval ids */
        this.pollingTaskId = 0;             /* The id of the main polling mechanism of the rustplus instance. */
        this.tokensReplenishTaskId = 0;     /* The id of the replenish task for rustplus tokens. */

        /* Other variable initializations */
        this.tokens = 24;                           /* The amount of tokens that is available at start. */
        this.timers = new Object();                 /* Stores all custom timers that are created. */
        this.markers = new Object();                /* Stores all custom markers that are created. */
        this.storageMonitors = new Object();        /* Contain content information of paired storage monitors. */
        this.currentSwitchTimeouts = new Object();  /* Stores timer ids for auto ON/OFF Smart Switch timeouts. */
        this.passedFirstSunriseOrSunset = false;    /* Becomes true when first sunrise/sunset. */
        this.startTimeObject = new Object();        /* Stores in-game time points before first sunrise/sunset. */
        this.informationIntervalCounter = 0;        /* Counter to decide when information should be updated. */
        this.storageMonitorIntervalCounter = 0;     /* Counter to decide when storage monitors should be updated */
        this.smartSwitchIntervalCounter = 10;       /* Counter to decide when smart switches should be updated */
        this.smartAlarmIntervalCounter = 20;        /* Counter to decide when smart alarms should be updated */
        this.interactionSwitches = [];              /* Stores the ids of smart switches that are interacted in-game. */
        this.messagesSentByBot = [];                /* Stores the last messages sent by the bot to the team chat */

        /* Chat handler variables */
        this.inGameChatQueue = [];
        this.inGameChatTimeout = null;

        /* Stores found vending machine items that are subscribed to */
        this.foundSubscriptionItems = { all: [], buy: [], sell: [] };

        /* When a new item is added to subscription list, dont notify about the already available items. */
        this.firstPollItems = { all: [], buy: [], sell: [] };

        /* Tracks observed max stock state for Scrap-for-Fertilizer vending orders. */
        this.fertilizerScrapStockState = {};

        this.allConnections = [];
        this.playerConnections = new Object();
        this.allDeaths = [];
        this.playerDeaths = new Object();
        this.events = {
            all: [],
            cargo: [],
            heli: [],
            small: [],
            large: [],
            chinook: [],
            deepsea: []
        };
        this.patrolHelicopterTracers = new Object();
        this.cargoShipTracers = new Object();


        /* Rustplus structures */
        this.map = null;            /* Stores the Map structure. */
        this.info = null;           /* Stores the Info structure. */
        this.time = null;           /* Stores the Time structure. */
        this.team = null;           /* Stores the Team structure. */
        this.mapMarkers = null;     /* Stores the MapMarkers structure. */

        this.loadRustPlusEvents();
    }

    loadRustPlusEvents() {
        const eventFiles = Fs.readdirSync(
            Path.join(__dirname, '..', 'rustplusEvents')).filter(file => file.endsWith('.js'));
        for (const file of eventFiles) {
            const event = require(`../rustplusEvents/${file}`);
            this.on(event.name, (...args) => event.execute(this, Client.client, ...args));
        }
    }

    loadMarkers() {
        const instance = Client.client.getInstance(this.guildId);

        for (const [name, location] of Object.entries(instance.serverList[this.serverId].markers)) {
            this.markers[name] = { x: location.x, y: location.y, location: location.location };
        }
    }

    build() {
        const instance = Client.client.getInstance(this.guildId);

        /* Setup the logger */
        this.logger = new Logger(Path.join(__dirname, '..', '..', `logs/${this.guildId}.log`), 'guild');
        this.logger.setGuildId(this.guildId);
        this.logger.serverName = instance.serverList[this.serverId].title;

        /* Setup settings */
        this.generalSettings = instance.generalSettings;
        this.notificationSettings = instance.notificationSettings;

        this.connect();
    }

    updateLeaderRustPlusLiteInstance() {
        if (this.leaderRustPlusInstance !== null) {
            if (Client.client.rustplusLiteReconnectTimers[this.guildId]) {
                clearTimeout(Client.client.rustplusLiteReconnectTimers[this.guildId]);
                Client.client.rustplusLiteReconnectTimers[this.guildId] = null;
            }
            this.leaderRustPlusInstance.isActive = false;
            this.leaderRustPlusInstance.disconnect();
            this.leaderRustPlusInstance = null;
        }

        const instance = Client.client.getInstance(this.guildId);
        const leader = this.team.leaderSteamId;
        if (leader === this.playerId) return;
        if (!(leader in instance.serverListLite[this.serverId])) return;
        const serverLite = instance.serverListLite[this.serverId][leader];

        this.leaderRustPlusInstance = new RustPlusLite(
            this.guildId,
            this.logger,
            this,
            serverLite.serverIp,
            serverLite.appPort,
            serverLite.steamId,
            serverLite.playerToken
        );
        this.leaderRustPlusInstance.connect();
    }

    isServerAvailable() {
        const instance = Client.client.getInstance(this.guildId);
        return instance.serverList.hasOwnProperty(this.serverId);
    }

    updateConnections(steamId, str) {
        const time = Timer.getCurrentDateTime();
        const savedString = `${time} - ${str}`;

        if (this.allConnections.length === 10) {
            this.allConnections.pop();
        }
        this.allConnections.unshift(savedString)

        if (!this.playerConnections.hasOwnProperty(steamId)) {
            this.playerConnections[steamId] = [];
        }

        if (this.playerConnections[steamId].length === 10) {
            this.playerConnections[steamId].pop();
        }
        this.playerConnections[steamId].unshift(savedString);
    }

    updateDeaths(steamId, data) {
        const time = Timer.getCurrentDateTime();
        data['time'] = time;

        if (this.allDeaths.length === 10) {
            this.allDeaths.pop();
        }
        this.allDeaths.unshift(data)

        if (!this.playerDeaths.hasOwnProperty(steamId)) {
            this.playerDeaths[steamId] = [];
        }

        if (this.playerDeaths[steamId].length === 10) {
            this.playerDeaths[steamId].pop();
        }
        this.playerDeaths[steamId].unshift(data);
    }

    updateEvents(event, message) {
        const commandCargoEn = `${Client.client.intlGet('en', 'commandSyntaxCargo')}`;
        const commandHeliEn = `${Client.client.intlGet('en', 'commandSyntaxHeli')}`;
        const commandSmallEn = `${Client.client.intlGet('en', 'commandSyntaxSmall')}`;
        const commandLargeEn = `${Client.client.intlGet('en', 'commandSyntaxLarge')}`;
        const commandChinookEn = `${Client.client.intlGet('en', 'commandSyntaxChinook')}`;
        const commandDeepSeaEn = `${Client.client.intlGet('en', 'commandSyntaxDeepSea')}`;
        if (![commandCargoEn, commandHeliEn, commandSmallEn, commandLargeEn, commandChinookEn, commandDeepSeaEn].includes(event)) return;

        const str = `${Timer.getCurrentDateTime()} - ${message}`;

        if (this.events['all'].length === 10) {
            this.events['all'].pop();
        }
        this.events['all'].unshift(str);

        if (this.events[event].length === 10) {
            this.events[event].pop();
        }
        this.events[event].unshift(str);
    }

    updateBotMessages(message) {
        if (this.messagesSentByBot.length >= Constants.BOT_MESSAGE_HISTORY_LIMIT) {
            this.messagesSentByBot.pop();
        }
        this.messagesSentByBot.unshift(message);
    }

    deleteThisRustplusInstance() {
        this.isDeleted = true;
        this.disconnect();

        if (Client.client.rustplusInstances.hasOwnProperty(this.guildId)) {
            if (Client.client.rustplusInstances[this.guildId].serverId === this.serverId) {
                delete Client.client.rustplusInstances[this.guildId];
                return true;
            }
        }
        return false;
    }

    log(title, text, level = 'info') {
        this.logger.log(title, text, level);
    }

    logInGameCommand(type = 'Default', message) {
        const args = new Object();
        args['type'] = type;
        args['command'] = message.broadcast.teamMessage.message.message;
        args['user'] = `${message.broadcast.teamMessage.message.name}`;
        args['user'] += ` (${message.broadcast.teamMessage.message.steamId.toString()})`;

        this.log(Client.client.intlGet(null, 'infoCap'), Client.client.intlGet(null, `logInGameCommand`, args));
    }

    sendInGameMessage(message) {
        InGameChatHandler.inGameChatHandler(this, Client.client, message);
    }

    async sendEvent(setting, text, event, embed_color, firstPoll = false, image = null) {
        const img = (image !== null) ? image : setting.image;

        this.updateEvents(event, text);

        // Persist event to database for prediction engine
        if (!firstPoll && Client.client.statisticsTracker) {
            try {
                const eventTypeMap = {
                    [Client.client.intlGet('en', 'commandSyntaxCargo')]: 'cargo',
                    [Client.client.intlGet('en', 'commandSyntaxHeli')]: 'heli',
                    [Client.client.intlGet('en', 'commandSyntaxSmall')]: 'small',
                    [Client.client.intlGet('en', 'commandSyntaxLarge')]: 'large',
                    [Client.client.intlGet('en', 'commandSyntaxChinook')]: 'chinook',
                    [Client.client.intlGet('en', 'commandSyntaxDeepSea')]: 'deepsea',
                };
                const normalizedType = eventTypeMap[event] || event;
                Client.client.statisticsTracker.trackEvent(
                    this.guildId, this.serverId, normalizedType, setting.id || normalizedType, text
                );
            } catch (e) {
                this.log(Client.client.intlGet(null, 'errorCap'), `Failed to record event: ${e.message}`, 'error');
            }
        }

        if (!firstPoll && setting.discord) {
            await DiscordMessages.sendDiscordEventMessage(this.guildId, this.serverId, text, img, embed_color);
        }
        if (!firstPoll && setting.inGame) {
            await this.sendInGameMessage(`${text}`);
        }
        if (!firstPoll && setting.voice) {
            await DiscordVoice.sendDiscordVoiceMessage(this.guildId, text);
        }
        this.log(Client.client.intlGet(null, 'eventCap'), text);
    }

    replenishTokens() {
        this.tokens += TOKENS_REPLENISH;
        if (this.tokens > TOKENS_LIMIT) this.tokens = TOKENS_LIMIT;
    }

    async waitForAvailableTokens(cost) {
        let timeoutCounter = 0;
        while (this.tokens < cost) {
            if (timeoutCounter === 90) return false;

            await Timer.sleep(1000 / 3);
            timeoutCounter += 1;
        }
        this.tokens -= cost;
        return true;
    }

    async turnSmartSwitchAsync(id, value, timeout = 10000) {
        if (value) {
            return await this.turnSmartSwitchOnAsync(id, timeout);
        }
        else {
            return await this.turnSmartSwitchOffAsync(id, timeout);
        }
    }

    async turnSmartSwitchOnAsync(id, timeout = 10000) {
        try {
            return await this.setEntityValueAsync(id, true, timeout);
        }
        catch (e) {
            return e;
        }
    }

    async turnSmartSwitchOffAsync(id, timeout = 10000) {
        try {
            return await this.setEntityValueAsync(id, false, timeout);
        }
        catch (e) {
            return e;
        }
    }

    async setEntityValueAsync(id, value, timeout = 10000) {
        try {
            if (!(await this.waitForAvailableTokens(1))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                entityId: id,
                setEntityValue: {
                    value: value
                }
            }, timeout).then((response) => {
                if (Client.ha) {
                    Client.ha.publishEvent('entity_update', {
                        entityId: id,
                        value: value,
                        guildId: this.guildId,
                        serverIp: this.server,
                        port: this.port
                    });
                }
                return response;
            }).catch((e) => {
                return e;
            });
        }
        catch (e) {
            return e;
        }
    }

    async sendTeamMessageAsync(message, timeout = 10000) {
        try {
            if (!(await this.waitForAvailableTokens(2))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                sendTeamMessage: {
                    message: message
                }
            }, timeout).catch((e) => {
                return e;
            });
        }
        catch (e) {
            return e;
        }
    }

    async getEntityInfoAsync(id, timeout = 10000) {
        try {
            if (!(await this.waitForAvailableTokens(1))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                entityId: id,
                getEntityInfo: {}
            }, timeout).catch((e) => {
                return e;
            });
        }
        catch (e) {
            return e;
        }
    }

    async getMapAsync(timeout = 30000) {
        try {
            if (!(await this.waitForAvailableTokens(5))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                getMap: {}
            }, timeout).catch((e) => {
                return e;
            });
        }
        catch (e) {
            return e;
        }
    }

    async getTimeAsync(timeout = 10000) {
        try {
            if (!(await this.waitForAvailableTokens(1))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                getTime: {}
            }, timeout).catch((e) => {
                return e;
            });
        }
        catch (e) {
            return e;
        }
    }

    async getMapMarkersAsync(timeout = 10000) {
        try {
            if (!(await this.waitForAvailableTokens(1))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                getMapMarkers: {}
            }, timeout).catch((e) => {
                return e;
            });
        }
        catch (e) {
            return e;
        }
    }

    async getInfoAsync(timeout = 10000) {
        try {
            if (!(await this.waitForAvailableTokens(1))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                getInfo: {}
            }, timeout).catch((e) => {
                return e;
            });
        }
        catch (e) {
            return e;
        }
    }

    async getTeamInfoAsync(timeout = 10000) {
        try {
            if (!(await this.waitForAvailableTokens(1))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                getTeamInfo: {}
            }, timeout).catch((e) => {
                return e;
            });
        }
        catch (e) {
            return e;
        }
    }

    async subscribeToCameraAsync(identifier, timeout = 10000) {
        try {
            if (!(await this.waitForAvailableTokens(1))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                cameraSubscribe: {
                    cameraId: identifier
                }
            }, timeout).catch((e) => {
                return e;
            });
        }
        catch (e) {
            return e;
        }
    }

    async unsubscribeFromCameraAsync(timeout = 10000) {
        try {
            if (!(await this.waitForAvailableTokens(1))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                cameraUnsubscribe: {}
            }, timeout).catch((e) => {
                return e;
            });
        }
        catch (e) {
            return e;
        }
    }

    async sendCameraInputAsync(buttons, x, y, timeout = 1000) {
        try {
            if (!(await this.waitForAvailableTokens(0.01))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                cameraInput: {
                    buttons: buttons,
                    mouseDelta: {
                        x: x,
                        y: y
                    }
                }
            }, timeout).catch((e) => {
                return e;
            });
        }
        catch (e) {
            return e;
        }
    }

    async promoteToLeaderAsync(steamId, timeout = 10000) {
        try {
            if (!(await this.waitForAvailableTokens(1))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                promoteToLeader: {
                    steamId: steamId
                }
            }, timeout).catch((e) => {
                return e;
            });
        }
        catch (e) {
            return e;
        }
    }

    async getTeamChatAsync(timeout = 10000) {
        try {
            if (!(await this.waitForAvailableTokens(1))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                getTeamChat: {}
            }, timeout).catch((e) => {
                return e;
            })
        }
        catch (e) {
            return e;
        }
    }

    async checkSubscriptionAsync(id, timeout = 10000) {
        try {
            if (!(await this.waitForAvailableTokens(1))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                entityId: id,
                checkSubscription: {}
            }, timeout).catch((e) => {
                return e;
            });
        }
        catch (e) {
            return e;
        }
    }

    async setSubscriptionAsync(id, value, timeout = 10000) {
        try {
            if (!(await this.waitForAvailableTokens(1))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                entityId: id,
                setSubscription: {
                    value: value
                }
            }, timeout).catch((e) => {
                return e;
            });
        }
        catch (e) {
            return e;
        }
    }

    async getCameraFrameAsync(identifier, frame, timeout = 10000) {
        try {
            if (!(await this.waitForAvailableTokens(2))) {
                return { error: Client.client.intlGet(null, 'tokensDidNotReplenish') };
            }

            return await this.sendRequestAsync({
                getCameraFrame: {
                    identifier: identifier,
                    frame: frame
                }
            }, timeout).catch((e) => {
                return e;
            });
        }
        catch (e) {
            return e;
        }
    }

    async isResponseValid(response) {
        if (response === undefined) {
            this.log(Client.client.intlGet(null, 'errorCap'),
                Client.client.intlGet(null, 'responseIsUndefined'), 'error');
            return false;
        }
        else if (response.toString() === 'Error: Timeout reached while waiting for response') {
            this.log(Client.client.intlGet(null, 'errorCap'),
                Client.client.intlGet(null, 'responseTimeout'), 'error');
            return false;
        }
        else if (response.hasOwnProperty('error')) {
            this.log(Client.client.intlGet(null, 'errorCap'), Client.client.intlGet(null, 'responseContainError', {
                error: response.error
            }), 'error');
            return false;
        }
        else if (Object.keys(response).length === 0) {
            this.log(Client.client.intlGet(null, 'errorCap'),
                Client.client.intlGet(null, 'responseIsEmpty'), 'error');
            clearInterval(this.pollingTaskId);
            return false;
        }
        return true;
    }

    /* Wrapper methods for text commands - used by discordEmbeds.js */
    getCommandTime(isInfoChannel = false) {
        return TimeCommand.execute(this, Client.client, '', isInfoChannel);
    }

    getCommandPop(isInfoChannel = false) {
        return PopCommand.execute(this, Client.client, '', isInfoChannel);
    }

    getCommandWipe(isInfoChannel = false) {
        return WipeCommand.execute(this, Client.client, '', isInfoChannel);
    }

    getCommandCargo(isInfoChannel = false) {
        return CargoCommand.execute(this, Client.client, '', isInfoChannel);
    }

    getCommandHeli(isInfoChannel = false) {
        return HeliCommand.execute(this, Client.client, '', isInfoChannel);
    }

    getCommandSmall(isInfoChannel = false) {
        return SmallCommand.execute(this, Client.client, '', isInfoChannel);
    }

    getCommandLarge(isInfoChannel = false) {
        return LargeCommand.execute(this, Client.client, '', isInfoChannel);
    }

    getCommandChinook(isInfoChannel = false) {
        return ChinookCommand.execute(this, Client.client, '', isInfoChannel);
    }

    getCommandDeepSea(isInfoChannel = false) {
        return DeepSeaCommand.execute(this, Client.client, '', isInfoChannel);
    }

    getCommandTravelingVendor(isInfoChannel = false) {
        return TravelingVendorCommand.execute(this, Client.client, '', isInfoChannel);
    }
}

module.exports = RustPlus;
