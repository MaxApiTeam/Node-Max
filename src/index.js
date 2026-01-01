const { MaxClient, SocketMaxClient } = require("./core.js");
const { InvalidPhoneError, AppOldError, FailedToLoginError, InvalidPayloadError, InvalidQRDataError, QRExpiredError } = require("./errors.js");
const { Opcode } = require("./enums.js");
const { Dialog, Chat, Channel, User, Me } = require("./types.js");

module.exports = { MaxClient, SocketMaxClient, InvalidPhoneError, AppOldError, FailedToLoginError, InvalidPayloadError, InvalidQRDataError, QRExpiredError, Opcode, Dialog, Chat, Channel, User, Me };