/**
 * eventmanager.js - irc management for virtualhackathon
 * Copyright (c) 2020, Mark Tyneway (MIT License).
 * Copyright (c) 2020, DNS.Live
 * https://github.com/virtualhackathon/hackathonbot
 */

'use strict';

const IRCClient = require('./ircclient');
const HackathondClient = require('./httpclient');
const Logger = require('blgr');
const Config = require('bcfg');
const EventEmitter = require('events');
const AsciiTable = require('ascii-table-unicode')
const assert = require('bsert');

const description = '' +
`Welcome to IRCHackathon. To participate:
1. Add yourself as a user in the system with .newuser
2. Look up events with .events
3. Register for events with .register
4. Add address for event with .newaddress`;

const usage = {
  REGISTER: ['.register <name>', 'Register for an event.'],
  EVENTS: ['.events', 'Display all events.'],
  NEWUSER: ['.newuser <hyperlink>', 'Please register with a hyperlink, can be http(s) or irc.'],
  EVENT: ['.event <name>', 'Look up event information by name.'],
  USERS: ['.users <name>', 'Display users in event.'],
  NEWADDRESS: ['.newaddress <event> <address>', 'Add new address for event.'],
  EVENTADDRESSES: ['.eventaddresses <name>', 'List event addresses.']
};

const adminUsage = {
  NEWEVENT: ['.newevent <name> <start> <end> <hyperlink> <message>', 'Create a new event. Start and end must be in mm/dd/yy format']
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
    this.ircport = this.config.uint('irc-port', 6667);
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
          case 'eventaddresses':
            await this.handleEventAddresses(msg);
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
          case 'adminhelp':
            await this.handleAdminHelp();
            break;
        }
      } catch (e) {
        this.logger.error(e);
      }
    });
  }

  // .eventaddresses <event>
  async handleEventAddresses(msg) {
    const tokens = msg.split(' ');
    const eventName = tokens[1];

    if (!eventName) {
      this.irc.say(this.channel, this.usageTable('EVENTADDRESSES', 'Must pass event name'));
      return;
    }

    const info = await this.client.getUserAddressesByEvent(eventName);

    if (info.length === 0) {

      return;
    }

    const response = new AsciiTable('Addresses')
      .setHeading('', 'Nick', 'Address')

    for (const [i, data] of info.entries())
      response.addRow(i, data.user.nick, data.address.address);

    this.irc.say(this.channel, response.toString());
  }

  // .users <name>
  async handleUsers(msg) {
    const tokens = msg.split(' ');
    const eventName = tokens[1];

    if (!eventName) {
      this.irc.say(this.channel, this.usageTable('USERS', 'Must pass event name'));
      return;
    }

    const info = await this.client.getEventInfo(eventName);

    if (!info) {
      this.irc.say(this.channel, this.errorTable(`Event ${eventName} not found`));
      return;
    }

    const response = new AsciiTable('Users')

    if (info.users.length === 0) {
      response.setHeading('No users registered.');
      this.irc.say(this.channel, response.toString());
      return;
    }

    response.setHeading('', 'Name', 'Link');
    for (const [i, user] of info.users.entries())
      response.addRow(i, user.nick, user.link);


    this.irc.say(this.channel, response.toString());
  }

  // .newevent <name> <start> <end> <hyperlink> <message>
  async handleNewEvent(msg) {
    const tokens = msg.split(' ');

    if (tokens.length !== 6) {
      this.irc.say(this.adminChannel, this.usageTable('NEWEVENT', 'Invalid usage, incorrect arguments. No spaces for now.'));
      return;
    }

    let name = tokens[1];
    if (!name) {
      this.irc.say(this.adminChannel, tihs.usageTable('NEWEVENT', 'Must pass name.'));
      return;
    }

    let start = tokens[2];
    if (!start) {
      this.irc.say(this.adminChannel, this.usageTable('NEWEVENT', 'Must pass start.'));
      return;
    }
    start = new Date(start).getTime() / 1000;

    let end = tokens[3];
    if (!end) {
      this.irc.say(this.adminChannel, this.usageTable('NEWEVENT', 'Must pass end.'));
      return;
    }
    end = new Date(end).getTime() / 1000;

    let link = tokens[4];
    if (!link) {
      this.irc.say(this.adminChannel, this.usageTable('NEWEVENT', 'Must pass link.'));
      return;
    }

    let message = tokens[5];
    if (!message) {
      this.irc.say(this.adminChannel, this.usageTable('NEWEVENT', 'Must pass message.'));
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
      this.irc.say(this.adminChannel, this.errorTable('Error creating event.'));
      return;
    }

    this.irc.say(this.adminChannel, this.successTable(`Event ${name} created.`));
  }

  // .register <event>
  async handleRegister(from, msg) {
    const tokens = msg.split(' ');
    const event = tokens[1];

    if (!event) {
      this.irc.say(this.channel, this.usageTable('REGISTER', 'Must pass event.'));
      return;
    }

    // Make sure user exists
    const user = await this.client.getUser(from, this.ircuri);

    if (!user) {
      this.irc.say(this.channel, this.errorTable(`User ${from} not found. Please use .newuser before .register`));
      return;
    }

    // Make sure event exists
    const eventInfo = await this.client.getEventInfo(event);

    if (!eventInfo) {
      this.irc.say(this.channel, this.errorTable(`Event ${event} not found`));
      return;
    }

    const register = await this.client.registerUser({
      nick: from,
      server: this.ircuri,
      event
    });

    if (!register) {
      this.irc.say(this.channel, this.errorTable('Error registering'));
      return;
    }

    this.irc.say(this.channel, this.successTable(`${from} registered with event ${event}`));
  }

  // .newuser <link>
  async handleNewUser(from, msg) {
    const tokens = msg.split(' ');
    const link = tokens[1];

    // TODO: fix this with usageTable

    // Must pass link
    if (!link) {
      this.irc.say(this.channel, this.usageTable('NEWUSER', 'Must pass link'));
      return;
    }

    // Link must be formatted correctly.
    if (!link.match(/^http/) && !link.match(/^irc/)) {
      this.irc.say(this.channel, this.errorTable(`Invalid link ${link}`));
      return;
    }

    const user = await this.client.createUser({
      nick: from,
      link,
      isSponsor: false,
      server: this.ircuri
    });

    if (!user) {
      this.irc.say(this.channel, this.errorTable('Error adding new user'));
      return;
    }

    this.irc.say(this.channel, this.successTable(`Welcome ${from}`));
  }

  // .events
  async handleEvents() {
    const events = await this.client.getEvents();

    const response = new AsciiTable('Events')
      .setHeading('', 'Name', 'Link');

    for (const [i, event] of events.entries())
      response.addRow(i, event.name, event.link);

    this.irc.say(this.channel, response.toString());
  }

  // .event <name>
  async handleEvent(msg) {
    const tokens = msg.split(' ');
    const name = tokens[1];

    if (!name) {
      this.irc.say(this.channel, this.usageTable('EVENT', 'Must pass name'));
      return;
    }

    const info = await this.client.getEventInfo(name)

    if (!info) {
      this.irc.say(this.channel, this.errorTable(`Event ${name} not found`));
      return;
    }

    const start = new Date(info.event.start).toTimeString();
    const end = new Date(info.event.end).toTimeString();

    const response = new AsciiTable('Event')
      .addRow('Name', info.event.name)
      .addRow('Link', info.event.link)
      .addRow('Start', start)
      .addRow('End', end)
      .addRow('Message', info.event.message)
      .addRow('User Count', info.users.length);

    this.irc.say(this.channel, response.toString());
  }

  /**
   * Render an error table
   */

  errorTable(message) {
    const header = new AsciiTable('Error')
      .addRow('Message', message);

    return header.toString();
  }

  /**
   * Render a success table
   */

  successTable(message) {
    const header = new AsciiTable('Success')
      .addRow('Message', message);

    return header.toString();
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
      this.irc.say(this.channel, this.errorTable('User not found'));
      return;
    }

    const event = tokens[1];

    if (!event) {
      this.irc.say(this.channel, this.usageTable('NEWADDRESS', 'Must pass event'));
      return;
    }

    // check to make sure user is in the event
    const info = await this.client.getEventInfo(event);

    if (!info) {
      this.irc.say(this.channel, this.errorTable(`Event ${event} not found.`));
      return;
    }

    let found = false;
    for (const user of info.users) {
      if (user.nick === from)
        found = true;
    }

    if (!found) {
      this.irc.say(this.channel, this.errorTable('Please register for event first'));
      return;
    }

    const address = tokens[2];

    if (!address) {
      this.irc.say(this.channel, this.errorTable('Must pass address'));
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
      this.irc.say(this.channel, this.errorTable('Error registering address'));
      return;
    }

    this.logger.debug('Address: %s %s', from, address);
    this.irc.say(this.channel, this.successTable(`Success ${from} registered ${address} for ${event}`));
  }

  usageTable(command, header) {
    let cmd = usage[command];

    if (!cmd)
      cmd = adminUsage[command];

    assert(cmd)

    const table = new AsciiTable('Usage')

    if (header)
      table.setHeading('Message', header);

    table.addRow(cmd[0], cmd[1]);

    return table.toString();
  }

  // .help
  handleHelp() {
    this.irc.say(this.channel, description);

    const response = new AsciiTable('Help')
      .setHeading('Command', 'Usage');

    for (const [cmd, msg] of Object.values(usage))
      response.addRow(cmd, msg);

    this.irc.say(this.channel, response.toString());
  }

  // .adminhelp
  handleAdminHelp() {
    const response = new AsciiTable('Help')
      .setHeading('Command', 'Usage');

    for (const [cmd, msg] of Object.values(adminUsage))
      response.addRow(cmd, msg);

    this.irc.say(this.adminChannel, response.toString());
  }

  getCMD(msg) {
    if (msg.match(/^.register/))
      return 'register';

    if (msg.match(/^.events/))
      return 'events';

    if (msg.match(/^.eventaddresses/))
      return 'eventaddresses';

    if (msg.match(/^.event/))
      return 'event';

    if (msg.match(/^.help/))
      return 'help';

    if (msg.match(/^.adminhelp/))
      return 'adminhelp';

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

      this.logger.info(`Connecting IRC client to ${this.ircuri} as ${this.nick}`);

      function err(error) {
        reject(error);
      }

      let irc = this.irc;
      function cleanup() {
        irc.removeListener('error', err);
      }

      this.irc.addListener('error', err)

      this.irc.addListener('registered', () => {
        this.logger.info('IRC Client Registered.');
        cleanup();
        resolve();
      });
    })
  }
}

module.exports = EventManager;
