/**
 *
 */

const IRCClient = require('./ircclient');
const HackathondClient = require('./httpclient');
const Logger = require('blgr');
const Config = require('bcfg');
const EventEmitter = require('events');
const assert = require('bsert');

// TODO: fix copy
const USAGE = {
  NEWUSER: '' +
`.newuser <hyperlink>
Please register with a hyperlink to help other users trust you more.
Can be http(s) or irc`,
  EVENT: '' +
`.event <name>
Look up event information by name.`,
  REGISTER: '' +
`.register <event name>
Register with an event.`,
  USERS: '' +
`.users <name>
Get users in event.`
};

const ADMIN_USAGE = {
  NEWEVENT: '' +
`.newevent <name> <start> <end> <hyperlink> <message>
Example: .newevent NewWorldHackathon 4/20/20 4/22/20 https://nam.ek Hackwell!`
};

const ports = {
  hackathond: 7870,
  admin: 7871
};

class EventManager extends EventEmitter {
  constructor() {
    super();

    this.config = new Config('hackathond');

    this.config.load({
      argv: true,
      env: true
    });

    this.logger = new Logger();
    this.irc = null;

    this.nick = this.config.str('bot-nick');
    this.ircuri = this.config.str('irc-uri');
    this.ircport = this.config.uint('irc-port', 6697);
    this.secure = this.config.bool('irc-secure', false);
    this.channel = this.config.str('irc-channel');
    this.adminChannel = this.config.str('irc-admin-channel');

    assert(typeof this.nick === 'string', 'Must use --bot-nick');
    assert(typeof this.ircuri === 'string', 'Must use --irc-uri');
    assert(typeof this.secure === 'boolean');
    assert(typeof this.ircport === 'number');
    assert(typeof this.channel === 'string', 'Must use --irc-channel');
    assert(typeof this.adminChannel === 'string', 'Must use --irc-admin-channel');

    this.logger.set({
      filename: this.config.location(`event-manager.log`),
      level: this.config.str('log-level', 'info'),
      console: this.config.bool('log-console', true),
      shrink: this.config.bool('log-shrink')
    });

    this.client = new HackathondClient({
      url: this.config.str('url'),
      apiKey: this.config.str('api-key'),
      ssl: this.config.bool('ssl'),
      host: this.config.str('http-host'),
      port: this.config.uint('http-port') || ports.hackathond,
      timeout: this.config.uint('timeout'),
      admin: false
    });

    this.admin = new HackathondClient({
      url: this.config.str('admin-url'),
      apiKey: this.config.str('admin-api-key'),
      ssl: this.config.bool('admin-ssl'),
      host: this.config.str('admin-http-host'),
      port: this.config.uint('admin-http-port') || ports.admin,
      timeout: this.config.uint('timeout'),
      admin: true
    });
  }

  async open() {
    await this.logger.open();

    await this.openIRC();

    this.bind();

    await this.joinChannel(this.adminChannel);
    await this.joinChannel(this.channel);
  }

  async close() {
    this.logger.info('Disconnecting IRC Client...');
    this.irc.disconnect();
  }

  // TODO: make sure prefix directory exists
  async ensure() {
    ;
  }

  bind() {
    this.irc.addListener('error', (err) => {
      this.logger.error(err);
    });

    this.logger.info(`Adding listener for %s.`, this.channel);
    this.irc.addListener(`message${this.channel}`, async (from, msg) => {
      this.logger.spam('%s %s: %s', this.channel, from, msg);

      const cmd = this.getCMD(msg)

      if (!cmd)
        return;

      try {
        switch (cmd) {
          case 'register':
            await this.handleRegister(from, msg);
            break;
          case 'newuser':
            await this.handleNewUser(from, msg);
            break;
          case 'events':
            await this.handleEvents();
            break;
          case 'event':
            await this.handleEvent(msg);
            break;
          case 'users':
            await this.handleUsers(msg);
            break;
          case 'newaddress':
            await this.handleNewAddress(from, msg);
            break;
          case 'help':
            await this.handleHelp();
            break;
        }
      } catch (e) {
        this.logger.error(e);
      }
    });

    this.logger.info(`Adding admin listener for %s.`, this.adminChannel);
    this.irc.addListener(`message${this.adminChannel}`, async (from, msg) => {
      this.logger.spam('%s %s: %s', this.adminChannel, from, msg);

      const cmd = this.getCMD(msg);

      if (!cmd)
        return;

      try {
        switch (cmd) {
          case 'newevent':
            await this.handleNewEvent(msg);
            break;
          case 'help':
            await this.handleAdminHelp();
            break;
        }
      } catch (e) {
        this.logger.error(e);
      }
    });
  }

  // .users <name>
  async handleUsers(msg) {
    const tokens = msg.split(' ');
    const eventName = tokens[1];

    if (!eventName) {
      this.irc.say(this.channel, USAGE.USERS);
      return;
    }

    const info = await this.client.getEventInfo(eventName);

    if (!info) {
      this.irc.say(this.channel, `Event ${eventName} not found`);
      return;
    }

    if (info.users.length === 0) {
      this.irc.say(this.channel, 'No users registered.');
      return;
    }

    for (const user of info.users) {
      this.irc.say(this.channel, `${user.nick} ${user.link}`);
    }
  }

  // .newevent <name> <start> <end> <hyperlink> <message>
  async handleNewEvent(msg) {
    const tokens = msg.split(' ');

    if (tokens.length !== 6) {
      this.irc.say(this.adminChannel, 'Invalid usage, no spaces for now.');
      return;
    }

    let name = tokens[1];
    if (!name) {
      this.irc.say(this.adminChannel, 'Must pass name.');
      return;
    }

    let start = tokens[2];
    if (!start) {
      this.irc.say(this.adminChannel, 'Must pass start.');
      return;
    }
    start = new Date(start).getTime() / 1000;

    let end = tokens[3];
    if (!end) {
      this.irc.say(this.adminChannel, 'Must pass end.');
      return;
    }
    end = new Date(end).getTime() / 1000;

    let link = tokens[4];
    if (!link) {
      this.irc.say(this.adminChannel, 'Must pass link.');
      return;
    }

    let message = tokens[5];
    if (!message) {
      this.irc.say(this.adminChannel, 'Must pass message.');
      return;
    }

    const event = await this.admin.createEvent({
      name,
      start,
      end,
      link,
      message
    });

    if (!event) {
      this.irc.say(this.adminChannel, 'Error creating event.');
      return;
    }

    this.irc.say(this.adminChannel, `Event ${name} created.`);
  }

  // .register <event>
  async handleRegister(from, msg) {
    const tokens = msg.split(' ');
    const event = tokens[1];

    if (!event) {
      this.irc.say(this.channel, USAGE.REGISTER);
      return;
    }

    // Make sure user exists
    const user = await this.client.getUser(from, this.ircuri);

    if (!user) {
      this.irc.say(this.channel, `User ${from} not found. Please use .newuser before .register`);
      return;
    }

    // Make sure event exists
    const eventInfo = await this.client.getEventInfo(event);

    if (!eventInfo) {
      this.irc.say(this.channel, `Event ${event} not found`);
      return;
    }

    const register = await this.client.registerUser({
      nick: from,
      server: this.ircuri,
      event
    });

    if (!register) {
      this.irc.say(this.channel, 'Error registering');
      return;
    }

    this.irc.say(this.channel, `${from} registered with event ${event}`);
  }

  // .newuser <link>
  async handleNewUser(from, msg) {
    const tokens = msg.split(' ');
    const link = tokens[1];

    // Must pass link
    if (!link) {
      this.irc.say(this.channel, `Invalid command usage.`);
      this.irc.say(this.channel, USAGE.NEWUSER);
      return;
    }

    // Link must be formatted correctly.
    if (!link.match(/^http/) && !link.match(/^irc/)) {
      this.irc.say(this.channel, `Invalid link ${link}`);
      return;
    }

    const user = await this.client.createUser({
      nick: from,
      link,
      isSponsor: false,
      server: this.ircuri
    });

    if (!user) {
      this.irc.say(this.channel, 'Error adding new user');
      return;
    }

    this.irc.say(this.channel, `Welcome ${from}`);
  }

  // .events
  async handleEvents() {
    const events = await this.client.getEvents();
    let response = 'Name, Link\n';

    for (const event of events)
      response += `${event.name}, ${event.link}\n`

    this.irc.say(this.channel, response);
  }

  // .event <name>
  async handleEvent(msg) {
    const tokens = msg.split(' ');
    const name = tokens[1];

    if (!name) {
      this.irc.say(this.channel, USAGE.EVENT);
      return;
    }

    const info = await this.client.getEventInfo(name)

    if (!info) {
      this.irc.say(this.channel, `Event ${name} not found`);
      return;
    }

    const start = new Date(info.event.start).toTimeString();
    const end = new Date(info.event.end).toTimeString();

    let response = '' +
`${info.event.name}
${info.event.link}
Starts ${start}
Ends ${end}
${info.event.message}
${info.users.length} registered user`;

    if (info.users.length !== 1)
      response += 's';

    this.irc.say(this.channel, response);
  }

  // .newaddress <event> <address>
  // TODO: be sure that an address doesn't already
  // exist for the user at the event, allow for
  // update command?
  async handleNewAddress(from, msg) {
    const tokens = msg.split(' ');

    // Make sure user exists
    const user = await this.client.getUser(from, this.ircuri);

    if (!user) {
      this.irc.say(this.channel, 'Please use .newuser first');
      return;
    }

    const event = tokens[1];

    if (!event) {
      this.irc.say(this.channel, 'Must pass event');
      return;
    }

    // check to make sure user is in the event
    const info = await this.client.getEventInfo(event);

    if (!info) {
      this.irc.say(this.channel, `Event ${event} not found.`);
      return;
    }

    let found = false;
    for (const user of info.users) {
      if (user.nick === from)
        found = true;
    }

    if (!found) {
      this.irc.say(this.channel, 'Please register for event first');
      return;
    }

    const address = tokens[2];

    if (!address) {
      this.irc.say(this.channel, 'Must pass address');
      return;
    }

    // TODO: better error messaging when its a duplicate
    // address error.
    const result = await this.client.createAddress({
      nick: from,
      server: this.ircuri,
      event,
      address
    });

    if (!result) {
      this.irc.say(this.channel, 'Error registering address');
      return;
    }

    this.logger.debug('Address: %s %s', from, address);
    this.irc.say(this.channel, `Success ${from} registered ${address} for ${event}`);
  }

  // .help
  handleHelp() {
    for (const msg of Object.values(USAGE))
      this.irc.say(this.channel, msg);
  }

  // .adminhelp
  handleAdminHelp() {
    for (const msg of Object.values(ADMIN_USAGE))
      this.irc.say(this.adminChannel, msg);
  }

  getCMD(msg) {
    if (msg.match(/^.register/))
      return 'register';

    if (msg.match(/^.events/))
      return 'events';

    if (msg.match(/^.event/))
      return 'event';

    if (msg.match(/^.help/))
      return 'help';

    if (msg.match(/^.newuser/))
      return 'newuser';

    if (msg.match(/^.newevent/))
      return 'newevent';

    if (msg.match(/^.users/))
      return 'users';

    if (msg.match(/^.newaddress/))
      return 'newaddress';

    return null;
  }

  // TODO: handle error case
  async joinChannel(channel) {
    return new Promise((resolve, reject) => {
      this.irc.join(channel, (nick, res) => {
        this.logger.info(`Connection: ${res.prefix} to ${channel}`);
        resolve();
      })
    });
  }

  // can i defer the connect somehow?
  // will this throw an error?
  async openIRC() {
    return new Promise((resolve, reject) => {
      this.irc = new IRCClient(this.ircuri, this.nick, {
        userName: this.nick,
        realName: this.nick,
        debug: false,
        autoRejoin: true,
        retryCount: 100,
        retryDelay: 6000,
        channels: [],
        secure: this.secure,
        port: this.port
      });

      function err(error) {
        reject(error);
      }

      let irc = this.irc;
      function cleanup() {
        irc.removeListener('error', err);
      }

      this.irc.addListener('error', err)

      this.irc.addListener('registered', () => {
        cleanup();
        resolve();
      });
    })
  }
}

module.exports = EventManager;
