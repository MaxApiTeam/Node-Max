var fs = require("fs");
var path = require("path");
var { EventEmitter } = require("events");
var tls = require("tls");
var util = require("./util.js");
var { Opcode } = require("./enums.js");
var { InvalidPhoneError, AppOldError, FailedToLoginError, InvalidPayloadError, InvalidQRDataError, QRExpiredError } = require("./errors.js");
var { Dialog, Chat, Channel, User, Me, Message } = require("./types.js");
var chalk = require("chalk");
var WebSocket = require("ws");
var UserAgent = require("user-agents");
var uuid = require("uuid");
var qrcode = require("qrcode-terminal");
var { pack, unpack } = require("msgpackr");
var LZ4 = require("lz4");

class BaseClient extends EventEmitter {
  #databasePath;
  #logLevel;

  constructor({ phone, uri, headers, token, sendFakeTelemetry, host, port, proxy, workDir, sessionName, registration, firstName, lastName, deviceId, reconnect, reconnectDelay } = {}) {
    super();

    if (typeof sendFakeTelemetry === "undefined") {
      sendFakeTelemetry = true;
    }
    if (typeof workDir === "undefined") {
      workDir = ".";
    }
    if (typeof sessionName === "undefined") {
      sessionName = "session.json";
    }
    if (!fs.existsSync(workDir)) {
      fs.mkdirSync(workDir, {
        "recursive": true
      });
    }
    this.#databasePath = path.join(workDir, sessionName);
    if (!fs.existsSync(this.#databasePath)) {
      fs.writeFileSync(this.#databasePath, "{}");
    }

    if (typeof token === "undefined") {
      var database = JSON.parse(fs.readFileSync(this.#databasePath).toString("utf-8"));
      token = database.token;
      deviceId = database.deviceId;
    }
    if (!deviceId) {
      deviceId = uuid.v4();
    }

    if (phone && !util.checkPhone(phone)) {
      throw new InvalidPhoneError(phone);
    }

    this.phone = phone;
    this.uri = uri;
    this.userAgent = (headers || {
      "deviceType": "WEB",
      "locale": "ru",
      "deviceLocale": "ru",
      "osVersion": util.choice(util.OS_VERSIONS),
      "deviceName": util.choice(util.DEVICE_NAMES),
      "headerUserAgent": (new UserAgent).toString(),
      "appVersion": "25.12.14",
      "screen": util.choice(util.SCREEN_SIZES),
      "timezone": util.choice(util.TIMEZONES),
      "clientSessionId": Math.floor(Math.random() *15) + 1,
      "buildNumber": 0x97CB
    });
    this.token = token;
    this.sendFakeTelemetry = sendFakeTelemetry;
    this.host = host;
    this.port = port;
    this.proxy = proxy;
    this.registration = registration;
    this.firstName = firstName;
    this.lastName = lastName;
    this.deviceId = deviceId;
    this.reconnect = reconnect;
    this.reconnectDelay = reconnectDelay;

    this.isConnected = false;
    this.chats = [];
    this.dialogs = [];
    this.channels = [];
    this.contacts = [];
    this.me = null;

    this._connection = null;
    this._seq = 0;
    this._users = {};
    this.#logLevel = 2;
  }

  setLogLevel(level) {
    this.#logLevel = ["error", "warn", "info", "debug"].indexOf(level.toLowerCase());
    return this;
  }

  _log(level, text) {
    if (this.#logLevel < ["error", "warn", "info", "debug"].indexOf(level)) {
      return;
    }
    var color = "white";
    if (level == "info") {
      color = "blue";
    }
    if (level == "warn") {
      color = "yellow";
    }
    if (level == "error") {
      color = "red";
    }
    console.log(`${chalk.gray((new Date).toLocaleTimeString())} [${chalk[color](level.toUpperCase())}] ${chalk.magenta("nodemax")}: ${text}`);
  }
  async start() {
    this._log("info", "Client starting");
    await this._connect();
    if (!this.token) {
      await this._login();
    }
    if (this.token) {
      fs.writeFileSync(this.#databasePath, JSON.stringify({
        "deviceId": this.deviceId,
        "token": this.token
      }));
    }
    await this._sync();
    this._log("debug", `is_connected=${this.isConnected} before starting ping`);
    var pingInterval = setInterval(async () => {
      if (this.isConnected) {
        await this._sendAndWait(Opcode.PING, {
          "interactive": true
        });
        this._log("debug", "Interactive ping sent successfully");
      } else {
        clearInterval(pingInterval);
      }
    }, 30000);
    if (this.sendFakeTelemetry) {
      // TODO: Fake telemetry
    }
    this._log("debug", "Calling on_start handler");
    this.emit("start");
  }
  async _handshake() {
    this._log("debug", `Sending handshake with user_agent keys=[${Object.keys(this.userAgent).map(key => `'${key}'`).join(", ")}]]`);
    var resp = await this._sendAndWait(Opcode.SESSION_INIT, {
      "deviceId": this.deviceId,
      "userAgent": this.userAgent
    });
    this._log("info", "Handshake completed");
    return resp;
  }
  async _loginQR() {
    this._log("info", "Requesting QR login data");
    var data = await this._sendAndWait(Opcode.GET_QR);
    this._log("debug", `QR login data response opcode=${data.opcode} seq=${data.seq}`);
    if (typeof data.payload !== "object") {
      this._log("error", "Invalid payload data received");
      throw new InvalidPayloadError;
    }
    data = data.payload;
    if (!data.pollingInterval || !data.qrLink || !data.trackId || !data.expiresAt) {
      this._log("error", "Invalid QR login data received");
      throw new InvalidQRDataError;
    }
    this._log("info", "Starting QR login flow");
    qrcode.generate(data.qrLink, {
      "small": true
    });
    await new Promise((res, rej) => {
      var pollInterval = setInterval(async () => {
        this._log("info", "Polling for QR login confirmation");
        var pollData = await this._sendAndWait(Opcode.GET_QR_STATUS, {
          "trackId": data.trackId
        });
        if (pollData.payload.status.loginAvailable) {
          this._log("info", "QR login confirmed");
          clearInterval(pollInterval);
          return res();
        }
        if (Date.now() >= data.expiresAt) {
          this._log("error", "QR code expired before confirmation");
          rej(new QRExpiredError);
        }
      }, data.pollingInterval);
    });
    this._log("info", "QR login successful");
    this._log("info", "Getting QR login data");
    data = await this._sendAndWait(Opcode.LOGIN_BY_QR, {
      "trackId": data.trackId
    });
    this._log("debug", `QR login data response opcode=${data.opcode} seq=${data.seq}`);
    return data.payload;
  }
  async _login() {
    this._log("info", "Starting login flow");
    if (this.userAgent.appVersion.split(".")[0] < 25 || this.userAgent.appVersion.split(".")[1] < 12 || this.userAgent.appVersion.split(".")[2] < 13) {
      this._log("error", "Your app version is too old");
      throw new AppOldError;
    }
    var loginResp = await this._loginQR();
    if (loginResp.passwordChallenge && !loginResp.tokenAttrs.LOGIN) {
      this.token = await this._handle2FA();
    } else {
      this.token = loginResp.tokenAttrs.LOGIN.token;
    }
    if (!this.token) {
      this._log("error", "Failed to login, token not received");
      throw new FailedToLoginError;
    }
    this._log("info", "Login successful, token saved to database");
  }
  async _sync() {
    this._log("info", "Starting initial sync");
    await this._sendAndWait(Opcode.LOGIN, {
      "interactive": true,
      "token": this.token,
      "chatsSync": 0,
      "contactsSync": 0,
      "presenceSync": 0,
      "draftsSync": 0,
      "chatsCount": 40,
      "userAgent": this.userAgent
    });
    var data = await this._waitPacket();
    data = data.payload;
    for (var chat of (data.chats || [])) {
      if (chat.type == "DIALOG") {
        this.dialogs.push(new Dialog(chat));
      } else if (chat.type == "CHAT") {
        this.chats.push(new Chat(chat));
      } else if (chat.type == "CHANNEL") {
        this.channels.push(new Channel(chat));
      }
    }
    for (var user of (data.contacts || [])) {
      this.contacts.push(new User(user));
    }
    if (data.profile && data.profile.contact) {
      this.me = new Me(data.profile.contact);
    }
    this._log("info", `Sync completed: dialogs=${this.dialogs.length} chats=${this.chats.length} channels=${this.channels.length}`);
  }
  async _handlePacket(packet) {
    var { payload } = packet;
    if (packet.opcode == Opcode.NOTIF_MESSAGE) {
      var msg = new Message(payload);
      if (msg.chatId && msg.id) {
        this._send(Opcode.NOTIF_MESSAGE, {
          "chatId": msg.chatId,
          "messageId": msg.id.toString()
        }, 1);
        this._log("debug", `Sent NOTIF_MESSAGE_RECEIVED for chat_id=${msg.chatId} message_id=${msg.id}`);
      }
      if (payload.status == "EDITED") {
        this.emit("messageEdit", msg);
      } else if (payload.status == "REMOVED") {
        this.emit("messageDelete", msg);
      } else {
        this.emit("message", msg);
      }
    }
  }
  sendMessage(chatId, data) {
    if (typeof data === "string") {
      data = {
        "text": data
      };
    }
    if (typeof data.notify === "undefined") {
      data.notify = true;
    }
    this._log("info", `Sending message to chat_id=${chatId} notify=${data.notify}`);
    this._send(Opcode.MSG_SEND, {
      chatId,
      "message": {
        "text": data.text,
        "cid": -Date.now(),
        "elements": [],
        "attaches": []
      },
      "notify": data.notify
    });
  }
  _sendAndWait(opcode, payload, cmd) {
    this._send(opcode, payload, cmd);
    return this._waitPacket();
  }
}

class MaxClient extends BaseClient {
  constructor({ uri, ...options } = {}) {
    if (typeof uri === "undefined") {
      uri = "wss://ws-api.oneme.ru/websocket";
    }
    super({ uri, ...options });
    this._log("debug", `Initialized MaxClient uri=${this.uri} workDir=${options.workDir || "."}`);
  }
  async _connect() {
    this._log("info", `Connecting to WebSocket ${this.uri}`);
    if (this.isConnected) {
      return this._log("warn", "WebSocket already connected");
    }
    this._connection = new WebSocket(this.uri, {
      "origin": "https://web.max.ru",
      "headers": {
        "User-Agent": this.userAgent.headerUserAgent
      }
    });
    this._connection.on("close", (code, reason) => {
      this.isConnected = false;
      this._log("info", `WebSocket connection closed with error: ${code}, ${reason}; exiting recv loop`);
      if (this.reconnect) {
        setTimeout(() => this.start(), this.reconnectDelay * 1000);
      }
    });
    this._connection.on("message", data => {
      this._handlePacket(JSON.parse(data.toString("utf-8")));
    });
    return new Promise(res => {
      this._connection.on("open", () => {
        this.isConnected = true;
        this._log("info", "WebSocket connected, starting handshake");
        this._handshake().then(() => res());
      });
    });
  }
  _send(opcode, payload, cmd) {
    if (typeof payload === "undefined") {
      payload = {};
    }
    if (typeof cmd === "undefined") {
      cmd = 0;
    }
    this._log("debug", `make_message opcode=${opcode} cmd=${cmd} seq=${this._seq}`)
    this._connection.send(JSON.stringify({
      "ver": 11,
      cmd,
      "seq": this._seq,
      opcode, payload
    }));
    this._seq++;
  }
  _waitPacket() {
    return new Promise(res => {
      this._connection.once("message", data => res(JSON.parse(data.toString("utf-8"))));
    });
  }
}

class SocketMaxClient extends BaseClient {
  constructor({ host, port, ...options } = {}) {
    if (typeof host === "undefined") {
      host = "api.oneme.ru";
    }
    if (typeof port === "undefined") {
      port = 443;
    }
    super({ host, port, ...options });
    this._log("debug", `Initialized SocketMaxClient host=${this.host} port=${this.port} workDir=${options.workDir || "."}`);
    this._socketQueue = [];
  }
  _connect() {
    this._log("info", `Connecting to socket ${this.host}:${this.port}`);
    this._connection = tls.connect({
      "host": this.host,
      "port": this.port,
      "servername": this.host,
      "rejectUnauthorized": true,
      "timeout": 15000
    });
    this._connection.setKeepAlive(true);
    this._connection.on("error", err => {
      this._log("error", `SSL handshake failed: ${err}`);
    });
    this._connection.on("timeout", () => {
      this._log("error", "SSL handshake timeout");
      this._connection.destroy();
    });
    this._connection.on("end", () => {
      this.isConnected = false;
      this._log("info", `Socket connection closed; exiting recv loop`);
      if (this.reconnect) {
        setTimeout(() => this.start(), this.reconnectDelay * 1000);
      }
    });
    this._connection.on("data", data => {
      this._handlePacket(this._unpackPacket(data));
    });
    return new Promise(res => {
      this._connection.on("secureConnect", () => {
        this._connection.setTimeout(60000);
        this.isConnected = true;
        this._log("info", "Socket connected, starting handshake");
        this._handshake().then(() => res());
      });
    });
  }
  _packPacket(ver, cmd, seq, opcode, payload) {
    var payloadBytes = pack(payload) || Buffer.alloc(0);
    var payloadLen = payloadBytes.length & 0xFFFFFF;
    this._log("debug", `Packing message: payload size=${payloadBytes.length} bytes`);
    var header = Buffer.alloc(10);
    var offset = 0;
    offset = header.writeUInt8(ver, offset);
    offset = header.writeUInt16BE(cmd, offset);
    offset = header.writeUInt8(seq % 256, offset);
    offset = header.writeUInt16BE(opcode, offset);
    offset = header.writeUInt32BE(payloadLen, offset);
    return Buffer.concat([header, payloadBytes]);
  }
  _unpackPacket(data) {
    var offset = 0;
    var ver = data.readUInt8(offset);
    offset += 1;
    var cmd = data.readUInt16BE(offset);
    offset += 2;
    var seq = data.readUInt8(offset);
    offset += 1;
    var opcode = data.readUInt16BE(offset);
    offset += 2;
    var packedLen = data.readUInt32BE(offset);
    offset += 4;
    var compFlag = packedLen >> 24;
    var payloadLength = packedLen & 0xFFFFFF;
    var payloadBytes = data.slice(offset, offset + payloadLength);
    var payload = null;
    if (payloadBytes.length > 0) {
      if (compFlag !== 0) {
        var decompressedBytes = Buffer.alloc(9999);
        var decompressedSize = LZ4.decodeBlock(payloadBytes, decompressedBytes);
        payloadBytes = decompressedBytes.subarray(0, decompressedSize);
      }
      payload = unpack(payloadBytes);
    }
    return { ver, cmd, seq, opcode, payload };
  }
  _send(opcode, payload, cmd) {
    if (typeof payload === "undefined") {
      payload = {};
    }
    if (typeof cmd === "undefined") {
      cmd = 0;
    }
    this._log("debug", `Sending frame opcode=${opcode} cmd=${cmd} seq=${this._seq}`);
    var packet = this._packPacket(11, cmd, this._seq, opcode, payload);
    if (!this._socketLocked) {
      this._socketLocked = true;
      if (this._connection.write(packet)) {
        this._socketLocked = false;
      } else {
        this._connection.once("drain", () => {
          this._socketLocked = false;
          var queue = this._socketQueue;
          this._socketQueue = [];
          queue.forEach(queuedPacket => this._send(queuedPacket));
        });
      }
    } else {
      this._socketQueue.push(packet);
    }
    this._seq++;
  }
  _waitPacket() {
    return new Promise(res => {
      this._connection.once("data", data => {
        try {
          res(this._unpackPacket(data));
        } catch(err) {
          console.error(err);
          this._log("warn", "Failed to unpack packet, skipping");
        }
      });
    });
  }
}

module.exports = { MaxClient, SocketMaxClient };