var fs = require("fs");
//var path = require("path");
var { EventEmitter } = require("events");
var util = require("./util.js");
var { Opcode } = require("./enums.js");
var { InvalidPhoneError, AppOldError, FailedToLoginError, InvalidPayloadError, InvalidQRDataError, QRExpiredError } = require("./errors.js");
var { Dialog, Chat, Channel, User, Me } = require("./types.js");
var chalk = require("chalk");
var WebSocket = require("ws");
var UserAgent = require("user-agents");
var uuid = require("uuid");
var qrcode = require("qrcode-terminal");

class BaseClient extends EventEmitter {
  //#databasePath;
  //#database;
  #logLevel;

  constructor({ phone, uri, headers, token, sendFakeTelemetry, host, port, proxy, workDir, sessionName, registration, firstName, lastName, deviceId, reconnect, reconnectDelay }) {
    super();

    if (typeof sendFakeTelemetry === "undefined") {
      sendFakeTelemetry = true;
    }
    if (typeof workDir === "undefined") {
      workDir = ".";
    }
    if (typeof sessionName === "undefined") {
      sessionName = "session.db";
    }
    if (typeof deviceId === "undefined") {
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
    if (!fs.existsSync(workDir)) {
      fs.mkdirSync(workDir, {
        "recursive": true
      });
    }
    // TODO: Database
    //this.#databasePath = path.join(workDir, sessionName);
    //this.#database = null;
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
    var data = await this._sendAndWait(Opcode.LOGIN, {
      "interactive": true,
      "token": this.token,
      "chatsSync": 0,
      "contactsSync": 0,
      "presenceSync": 0,
      "draftsSync": 0,
      "chatsCount": 40,
      "userAgent": this.userAgent
    });
    data = data.payload;
    for (var chat of data.chats) {
      if (chat.type == "DIALOG") {
        this.dialogs.append(new Dialog(chat));
      } else if (chat.type == "CHAT") {
        this.chats.append(new Chat(chat));
      } else if (chat.type == "CHANNEL") {
        this.channels.append(new Channel(chat));
      }
    }
    for (var user of data.contacts) {
      this.contacts.push(new User(user));
    }
    if (data.profile && data.profile.contact) {
      this.me = new Me(data.profile.contact);
    }
    this._log("info", `Sync completed: dialogs=${this.dialogs.length} chats=${this.chats.length} channels=${this.channels.length}`);
  }
}

class MaxClient extends BaseClient {
  constructor({ uri, ...options }) {
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
      this._log("info", `WebSocket connection closed with error: ${code}, ${reason}; exiting recv loop`);
      if (this.reconnect) {
        setTimeout(() => this.start(), this.reconnectDelay * 1000);
      }
    });
    return new Promise(res => {
      this._connection.on("open", () => {
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
  _sendAndWait(opcode, payload, cmd) {
    this._send(opcode, payload, cmd);
    return new Promise(res => {
      this._connection.once("message", data => res(JSON.parse(data.toString("utf-8"))))
    });
  }
}

// TODO
class SocketMaxClient extends BaseClient {
  constructor({ host, port, ...options }) {
    if (typeof host === "undefined") {
      host = "api.oneme.ru";
    }
    if (typeof port === "undefined") {
      port = 443;
    }
    super({ host, port, ...options });
    this._log("debug", `Initialized SocketMaxClient host=${this.host} port=${this.port} workDir=${options.workDir || "."}`);
  }
}

module.exports = { MaxClient, SocketMaxClient };