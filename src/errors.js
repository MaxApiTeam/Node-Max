class MissingAuth extends Error {
  constructor() {
    super("Missing phone number or token to authorize");
  }
}

class InvalidPhoneError extends Error {
  constructor(phone) {
    super(`Invalid phone number format: ${phone}`);
    this.phone = phone;
  }
}

class AppOldError extends Error {
  constructor() {
    super("Your app version is too old");
  }
}

class FailedToLoginError extends Error {
  constructor() {
    super("Failed to login, token not received");
  }
}

class InvalidPayloadError extends Error {
  constructor() {
    super("Invalid payload data received");
  }
}

class InvalidQRDataError extends Error {
  constructor() {
    super("Invalid QR login data received");
  }
}

class QRExpiredError extends Error {
  constructor() {
    super("QR code expired before confirmation");
  }
}

module.exports = { MissingAuth, InvalidPhoneError, AppOldError, FailedToLoginError, InvalidPayloadError, InvalidQRDataError, QRExpiredError };