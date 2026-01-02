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

class Message {
  constructor(data) {
    if (data.id) {
      data = {
        "message": data
      };
    }
    this.chatId = data.chatId;
    this.sender = data.message.sender;
    this.elements = (data.elements || []).map(element => new Element(element));
    this.options = data.message.options;
    this.id = data.message.id;
    this.time = data.message.time;
    this.text = data.message.text;
    this.type = data.message.type;
    // TODO
    this.attaches = [];
    this.status = data.message.status;
    this.link = (data.message.link ? new MessageLink(data.message.link) : null);
    this.reactionInfo = (data.message.reactionInfo ? new ReactionInfo(data.message.reactionInfo) : null);
  }
}

class Name {
  constructor(data) {
    this.name = data.name;
    this.firstName = data.firstName;
    this.lastName = data.lastName;
    this.type = data.type;
  }
}

class Element {
  constructor(data) {
    this.type = data.type;
    this.length = data.length;
    this.from = data.from;
  }
}

class MessageLink {
  constructor(data) {
    this.chatId = data.chatId;
    this.message = (data.message ? new Message(data.message) : null);
    this.type = data.type;
  }
}

class ReactionInfo {
  constructor(data) {
    this.totalCount = data.totalCount;
    this.counters = (data.counters || []).map(counter => new ReactionCounter(counter));
    this.yourReaction = data.yourReaction;
  }
}

class ReactionCounter {
  constructor(data) {
    this.count = data.count;
    this.reaction = data.reaction;
  }
}

module.exports = { Dialog, Chat, Channel, User, Me, Message, Name, Element, MessageLink, ReactionInfo, ReactionCounter };