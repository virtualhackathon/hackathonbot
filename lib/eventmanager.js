/**
 *
 */

const IRCClient = require('./ircclient');
const HackathondClient = require('./httpclient');
const Logger = require('blgr');
const Config = require('bcfg');
const EventEmitter = require('events');
const assert = require('bsert');

// TODO:
//   import irc client
//   import http client
//   import logger
//   import config
//
//   create irc client event listeners
//   assert the event exists
//   connect to the irc channel
//   how to get irc server info from irc client?
//     useful for "server" field for users
//
//   user commands:
//     register <address> <pubkey>
//     events
//     event <name>
//     proof <address> <proof>
//
//  new strategy
//    - admin channel on irc, all messages in there assumed
//      to be from admins

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

    this.event = this.config.str('event');

    this.logger = new Logger();
    this.irc = null;
    this.nick = this.config.str('bot-nick');
    this.uri = this.config.str('irc-uri');
    this.channel = this.config.str('irc-channel');

    assert(typeof this.event === 'string', 'Must use --event');
    assert(typeof this.nick === 'string', 'Must use --bot-nick');
    assert(typeof this.uri === 'string', 'Must use --irc-uri');
    assert(typeof this.channel === 'string', 'Must use --irc-channel');

    this.logger.set({
      filename: this.config.location(`event-manager-${this.event}.log`),
      level: this.config.str('log-level'),
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

    const info = await this.client.getEventInfo(this.event);

    if (!info)
      throw new Error(`event ${this.event} does not exist. Please create it first.`);

    await this.openIRC();

    this.bind();

    await this.joinChannel();
  }

  async close() {

  }

  async ensure() {

  }

  bind() {
    this.irc.addListener('error', (err) => {
      console.log(err);
    });

    // TODO: add listener for admin channel

    // TODO: convert to regular logger.debug
    console.log(`Adding listener for ${this.channel}`);

    this.irc.addListener(`message${this.channel}`, async (from, msg) => {
      this.logger.spam('%s: %s', from, msg);

      const cmd = this.getCMD(msg)

      if (!cmd)
        return;

      switch (cmd) {
        case 'register':
          await this.handleRegister(from, msg);
          break;
        case 'events':
          await this.handleEvents();
          break;
        case 'event':
          await this.handleEvent(msg);
          break;
      }
    });
  }

  // .register <link>
  handleRegister(nick, msg) {

    const link = '';
    const isSponsor = '';
    const server = '';

    const user = await this.client.createUser({
      nick,
      link,
      isSponsor,
      server
    });

    client.say(this.channel, `Registered ${nick}`);
  }

  async handleEvents() {
    const events = await this.client.getEvents();
    let response = 'Name, Link\n';

    for (const event of events)
      response += `${event.name}, ${event.link}\n`

    this.irc.say(this.channel, response);
  }

  handleEvent(msg) {


  }

  getCMD(msg) {
    if (msg.match(/^.register/))
      return 'register';

    if (msg.match(/^.events/))
      return 'events';

    if (msg.match(/^.event/))
      return 'event';

    return null;
  }

  // TODO: handle error case
  async joinChannel() {
    return new Promise((resolve, reject) => {
      this.irc.join(this.channel, (nick, res) => {
        this.logger.info(`Connected with ${res.prefix}`);
        resolve();
      })
    });
  }

  // can i defer the connect somehow?
  // will this throw an error?
  async openIRC() {
    return new Promise((resolve, reject) => {
      this.irc = new IRCClient(this.uri, this.nick, {
        userName: this.nick,
        realName: this.nick,
        debug: false,
        autoRejoin: true,
        retryCount: 100,
        retryDelay: 6000,
        channels: []
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
