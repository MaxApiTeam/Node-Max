class Dialog {
  constructor(data) {
    this.cid = data.cid;
    this.owner = data.owner;
    this.hasBots = (data.hasBots || false);
    this.joinTime = data.joinTime;
    this.created = data.created;
    this.lastMessage = (data.lastMessage ? new Message(data.lastMessage) : null);
    this.type = data.type;
    this.lastFireDelayedErrorTime = data.lastFireDelayedErrorTime;
    this.lastDelayedUpdateTime = data.lastDelayedUpdateTime;
    this.prevMessageId = (data.prevMessageId || null);
    this.options = (data.options || {});
    this.modified = data.modified;
    this.lastEventTime = data.lastEventTime;
    this.id = data.id;
    this.status = data.status;
    this.participants = data.participants;
  }
}

class Chat {}

class Channel extends Chat {
  constructor(data) {
    super(data);
  }
}

class User {
  constructor(data) {
    this.accountStatus = data.accountStatus;
    this.updateTime = data.updateTime;
    this.id = data.id;
    this.names = data.names.map(name => new Name(name));
    this.options = (data.options || []);
    this.baseUrl = data.baseUrl;
    this.baseRawUrl = data.baseRawUrl;
    this.photoId = data.photoId;
    this.description = data.description;
    this.gender = data.gender;
    this.link = data.link;
    this.webApp = data.webApp;
    this.menuButton = data.menuButton;
  }
}

class Me {
  constructor(data) {
    this.id = data.id;
    this.accountStatus = data.accountStatus;
    this.phone = data.phone;
    this.names = data.names.map(name => new Name(name));
    this.updateTime = data.updateTime;
    this.options = data.options;
  }
}

// TODO
class Message {}

class Name {
  constructor(data) {
    this.name = data.name;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.type = data.type;
  }
}

module.exports = { Dialog, Chat, Channel, User, Me, Message, Name };