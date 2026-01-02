import { EventEmitter } from "events";

declare class BaseClient extends EventEmitter {
  constructor(data?: {
    phone?: string
    uri?: string = "wss://api-ws.oneme.ru/websocket"
    headers?: any
    token?: string
    sendFakeTelemetry?: boolean = true
    host?: string = "api.oneme.ru"
    port?: number = 443
    proxy?: any
    workDir?: string = "."
    sessionName?: string = "session.json"
    registration?: boolean = false
    firstName?: string
    lastName?: string
    deviceId?: string
    reconnect?: boolean = true
    reconnectDelay?: number = 1
  })
  setLogLevel(level: "error" | "warn" | "info" | "debug")
  start(): Promise<undefined>
}

declare namespace NodeMax {
  class MaxClient extends BaseClient {}
  class SocketMaxClient extends BaseClient {}

  class InvalidPhoneError extends Error {
    phone: string;
  }
  class AppOldError extends Error {}
  class FailedToLoginError extends Error {}
  class InvalidPayloadError extends Error {}
  class InvalidQRDataError extends Error {}
  class QRExpiredError extends Error {}

  const Opcode: {
    "PING": 1,
    "DEBUG": 2,
    "RECONNECT": 3,
    "LOG": 5,
    "SESSION_INIT": 6,
    "PROFILE": 16,
    "AUTH_REQUEST": 17,
    "AUTH": 18,
    "LOGIN": 19,
    "LOGOUT": 20,
    "SYNC": 21,
    "CONFIG": 22,
    "AUTH_CONFIRM": 23,
    "PRESET_AVATARS": 25,
    "ASSETS_GET": 26,
    "ASSETS_UPDATE": 27,
    "ASSETS_GET_BY_IDS": 28,
    "ASSETS_ADD": 29,
    "SEARCH_FEEDBACK": 31,
    "CONTACT_INFO": 32,
    "CONTACT_ADD": 33,
    "CONTACT_UPDATE": 34,
    "CONTACT_PRESENCE": 35,
    "CONTACT_LIST": 36,
    "CONTACT_SEARCH": 37,
    "CONTACT_MUTUAL": 38,
    "CONTACT_PHOTOS": 39,
    "CONTACT_SORT": 40,
    "CONTACT_VERIFY": 42,
    "REMOVE_CONTACT_PHOTO": 43,
    "CONTACT_INFO_BY_PHONE": 46,
    "CHAT_INFO": 48,
    "CHAT_HISTORY": 49,
    "CHAT_MARK": 50,
    "CHAT_MEDIA": 51,
    "CHAT_DELETE": 52,
    "CHATS_LIST": 53,
    "CHAT_CLEAR": 54,
    "CHAT_UPDATE": 55,
    "CHAT_CHECK_LINK": 56,
    "CHAT_JOIN": 57,
    "CHAT_LEAVE": 58,
    "CHAT_MEMBERS": 59,
    "PUBLIC_SEARCH": 60,
    "CHAT_CLOSE": 61,
    "CHAT_CREATE": 63,
    "MSG_SEND": 64,
    "MSG_TYPING": 65,
    "MSG_DELETE": 66,
    "MSG_EDIT": 67,
    "CHAT_SEARCH": 68,
    "MSG_SHARE_PREVIEW": 70,
    "MSG_GET": 71,
    "MSG_SEARCH_TOUCH": 72,
    "MSG_SEARCH": 73,
    "MSG_GET_STAT": 74,
    "CHAT_SUBSCRIBE": 75,
    "VIDEO_CHAT_START": 76,
    "CHAT_MEMBERS_UPDATE": 77,
    "VIDEO_CHAT_HISTORY": 79,
    "PHOTO_UPLOAD": 80,
    "STICKER_UPLOAD": 81,
    "VIDEO_UPLOAD": 82,
    "VIDEO_PLAY": 83,
    "CHAT_PIN_SET_VISIBILITY": 86,
    "FILE_UPLOAD": 87,
    "FILE_DOWNLOAD": 88,
    "LINK_INFO": 89,
    "MSG_DELETE_RANGE": 92,
    "SESSIONS_INFO": 96,
    "SESSIONS_CLOSE": 97,
    "PHONE_BIND_REQUEST": 98,
    "PHONE_BIND_CONFIRM": 99,
    "CONFIRM_PRESENT": 101,
    "GET_INBOUND_CALLS": 103,
    "EXTERNAL_CALLBACK": 105,
    "AUTH_VALIDATE_PASSWORD": 107,
    "AUTH_VALIDATE_HINT": 108,
    "AUTH_VERIFY_EMAIL": 109,
    "AUTH_CHECK_EMAIL": 110,
    "AUTH_SET_2FA": 111,
    "AUTH_CREATE_TRACK": 112,
    "AUTH_LOGIN_CHECK_PASSWORD": 115,
    "CHAT_COMPLAIN": 117,
    "MSG_SEND_CALLBACK": 118,
    "SUSPEND_BOT": 119,
    "LOCATION_STOP": 124,
    "LOCATION_SEND": 125,
    "LOCATION_REQUEST": 126,
    "GET_LAST_MENTIONS": 127,
    "NOTIF_MESSAGE": 128,
    "NOTIF_TYPING": 129,
    "NOTIF_MARK": 130,
    "NOTIF_CONTACT": 131,
    "NOTIF_PRESENCE": 132,
    "NOTIF_CONFIG": 134,
    "NOTIF_CHAT": 135,
    "NOTIF_ATTACH": 136,
    "NOTIF_CALL_START": 137,
    "NOTIF_CONTACT_SORT": 139,
    "NOTIF_MSG_DELETE_RANGE": 140,
    "NOTIF_MSG_DELETE": 142,
    "NOTIF_CALLBACK_ANSWER": 143,
    "CHAT_BOT_COMMANDS": 144,
    "BOT_INFO": 145,
    "NOTIF_LOCATION": 147,
    "NOTIF_LOCATION_REQUEST": 148,
    "NOTIF_ASSETS_UPDATE": 150,
    "NOTIF_DRAFT": 152,
    "NOTIF_DRAFT_DISCARD": 153,
    "NOTIF_MSG_DELAYED": 154,
    "NOTIF_MSG_REACTIONS_CHANGED": 155,
    "NOTIF_MSG_YOU_REACTED": 156,
    "CALLS_TOKEN": 158,
    "NOTIF_PROFILE": 159,
    "WEB_APP_INIT_DATA": 160,
    "DRAFT_SAVE": 176,
    "DRAFT_DISCARD": 177,
    "MSG_REACTION": 178,
    "MSG_CANCEL_REACTION": 179,
    "MSG_GET_REACTIONS": 180,
    "MSG_GET_DETAILED_REACTIONS": 181,
    "STICKER_CREATE": 193,
    "STICKER_SUGGEST": 194,
    "VIDEO_CHAT_MEMBERS": 195,
    "CHAT_HIDE": 196,
    "CHAT_SEARCH_COMMON_PARTICIPANTS": 198,
    "PROFILE_DELETE": 199,
    "PROFILE_DELETE_TIME": 200,
    "ASSETS_REMOVE": 259,
    "ASSETS_MOVE": 260,
    "ASSETS_LIST_MODIFY": 261,
    "FOLDERS_GET": 272,
    "FOLDERS_GET_BY_ID": 273,
    "FOLDERS_UPDATE": 274,
    "FOLDERS_REORDER": 275,
    "FOLDERS_DELETE": 276,
    "NOTIF_FOLDERS": 277,
    "GET_QR": 288,
    "GET_QR_STATUS": 289,
    "LOGIN_BY_QR": 291
  };

  class Dialog {
    constructor(data: {
      public cid: int
      public owner: int
      public hasBots: boolean
      public joinTime: int
      public created: int
      lastMessage: {}
      public type: "CHANNEL" | "CHAT" | "DIALOG"
      public lastFireDelayedErrorTime: int
      public lastDelayedUpdateTime: int
      public prevMessageId: str | null
      public options: { [key: string]: boolean }
      public modified: int
      public lastEventTime: int
      public id: int
      public status: str
      public participants: { [key: string]: int }
    })
    lastMessage: Message
  }
  class Chat {}
  class Channel extends Chat {}
  class User {
    constructor(data: {
      public accountStatus: int
      public updateTime: int
      public id: int
      names: {
        name: string
        firstName: string
        lastName: string
        type: string
      }[]
      public options: string[]
      public baseUrl: string
      public baseRawUrl: string
      public photoId: int | null
      public description: string | null
      public gender: int | null
      public link: string | null
      public webApp: string
      public menuButton: { [key: string]: any } | null
    })
    names: Name[]
  }
  class Me {
    constructor(data: {
      public id: int
      public accountStatus: int
      names: {
        name: string
        firstName: string
        lastName: string
        type: string
      }[],
      public updateTime: int
      public options: string[]
    })
    names: Name[]
  }
  class Message {}
  class Name {
    constructor(data: {
      public name: string
      public firstName: string
      public lastName: string
      public type: string
    })
  }
}

export = NodeMax;