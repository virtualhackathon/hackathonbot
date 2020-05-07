/**
 * eventmanager.js - irc management for virtualhackathon
 * Copyright (c) 2020, Mark Tyneway (MIT License).
 * Copyright (c) 2020, DNS.Live
 * https://github.com/virtualhackathon/hackathonbot
 */

'use strict';

const IRCClient = require('./ircclient');
const fs = require('bfile');
const HackathondClient = require('./httpclient');
const Tokenizer = require('./tokenizer');
const utils = require('./utils');
const schemas = require('./schemas');
const Logger = require('blgr');
const Config = require('bcfg');
const EventEmitter = require('events');
const AsciiTable = require('ascii-table-unicode')
const assert = require('bsert');
const {Lock} = require('bmutex');
const HSClient = require('hs-client');
const BClient = require('bclient');
const constants = require('./constants');

const {
  description,
  usage,
  adminUsage,
  ports,
  hsdPorts,
  hsdWalletPorts,
  bcoinPorts,
  bcoinWalletPorts
} = constants;

class EventManager extends EventEmitter {
  constructor() {
    super();

    this.config = new Config('hackathond');

    this.config.load({
      argv: true,
      env: true
    });

    this.logger = new Logger();
    this.lock = new Lock();
    this.adminLock = new Lock();
    this.irc = null;

    this.lastHelp = Date.now() - 10;

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

    this.hsd = {
      nclient: new HSClient.NodeClient({
        url: this.config.str('hsd-url'),
        apiKey: this.config.str('hsd-api-key'),
        ssl: this.config.str('hsd-ssl'),
        host: this.config.str('hsd-http-host'),
        port: this.config.uint('hsd-http-port')
          || hsdPorts[this.config.str('hsd-network')]
          || hsdPorts.main,
        timeout: this.config.uint('hsd-timeout')
      }),
      wclient: new HSClient.WalletClient({
        url: this.config.str('hsd-wallet-url'),
        apiKey: this.config.str('hsd-wallet-api-key'),
        ssl: this.config.str('hsd-wallet-ssl'),
        host: this.config.str('hsd-wallet-http-host'),
        port: this.config.uint('hsd-wallet-http-port')
          || hsdWalletPorts[this.config.str('hsd-network')]
          || hsdWalletPorts.main,
        timeout: this.config.uint('hsd-wallet-timeout')
      })
    }

    this.hsd.wallet = this.hsd.wclient.wallet('primary');

    this.bcoin = {
      nclient: new BClient.NodeClient({
        url: this.config.str('bcoin-url'),
        apiKey: this.config.str('bcoin-api-key'),
        ssl: this.config.str('bcoin-ssl'),
        host: this.config.str('bcoin-http-host'),
        port: this.config.uint('bcoin-http-port')
          || bcoinPorts[this.config.str('bcoin-network')]
          || bcoinPorts.main,
        timeout: this.config.uint('bcoin-timeout')
      }),
      wclient: new BClient.WalletClient({
        url: this.config.str('bcoin-wallet-url'),
        apiKey: this.config.str('bcoin-wallet-api-key'),
        ssl: this.config.str('bcoin-wallet-ssl'),
        host: this.config.str('bcoin-wallet-http-host'),
        port: this.config.uint('bcoin-wallet-http-port')
          || bcoinWalletPorts[this.config.str('bcoin-network')]
          || bcoinWalletPorts.main,
        timeout: this.config.uint('bcoin-wallet-timeout')
      })
    }

    this.bcoin.wallet = this.bcoin.wclient.wallet('primary');
  }

  async open() {
    await this.logger.open();
    await this.openIRC();
    this.bind();

    try {
      await this.bcoin.nclient.getInfo();
      this.bcoin.wclient.open();
      this.logger.info('Connected to bcoin.');
    } catch (e) {
      this.logger.error(e);
      this.logger.error('Cannot connect to bcoin.');
    }

    try {
      await this.hsd.nclient.getInfo();
      this.hsd.wclient.open();
      this.logger.info('Connected to hsd.');
    } catch (e) {
      this.logger.error(e);
      this.logger.error('Cannot connect to hsd.');
    }

    await this.joinChannel(this.adminChannel);
    await this.joinChannel(this.channel);
  }

  async close() {
    this.logger.info('Disconnecting IRC Client...');
    this.irc.disconnect();
  }

  async ensure() {
     if (fs.unsupported)
      return undefined;

    if (this.memory)
      return undefined;

    return fs.mkdirp(this.config.prefix);
  }

  say(msg) {
    this.irc.say(this.channel, msg);
  }

  adminSay(msg) {
    this.irc.say(this.adminChannel, msg);
  }

  bind() {
    this.irc.on('error', (err) => {
      this.logger.error(err);
    });

    this.logger.info(`Adding listener for %s.`, this.channel);
    this.irc.on(`message${this.channel}`, async (from, msg) => {
      this.logger.spam('%s %s: %s', this.channel, from, msg);

      // TODO: break cmds out into an enum
      const cmd = this.getCMD(msg)

      if (!cmd)
        return;

      const unlock = await this.lock.lock();

      let toSay = '';
      try {
        switch (cmd) {
          case 'register':
            toSay = await this.handleRegister(from, msg);
            break;
          case 'newuser':
            toSay = await this.handleNewUser(from, msg);
            break;
          case 'events':
            toSay = await this.handleEvents();
            break;
          case 'event':
            toSay = await this.handleEvent(msg);
            break;
          case 'users':
            toSay = await this.handleUsers(msg);
            break;
          case 'user':
            toSay = await this.handleUser(from, msg);
            break;
          case 'newaddress':
            toSay = await this.handleNewAddress(from, msg);
            break;
          case 'eventaddresses':
            toSay = await this.handleEventAddresses(msg);
            break;
          case 'tournaments':
            toSay = await this.handleTournaments(msg)
            break;
          case 'bitcoininfo':
            toSay = await this.handleBitcoinInfo();
            break;
          case 'handshakeinfo':
            toSay = await this.handleHandshakeInfo();
            break;
          case 'paymentinfo':
            toSay = await this.handlePaymentInfo();
          case 'help':
            toSay = await this.handleHelp();
            break;
        }
      } catch (e) {
        this.logger.error(e);
      }

      this.say(toSay);
      unlock();
    });

    this.logger.info(`Adding admin listener for %s.`, this.adminChannel);
    this.irc.on(`message${this.adminChannel}`, async (from, msg) => {

      this.logger.spam('%s %s: %s', this.adminChannel, from, msg);

      const cmd = this.getCMD(msg);

      if (!cmd)
        return;

      const unlock = await this.adminLock.lock();

      let toSay;
      try {
        switch (cmd) {
          case 'adminhelp':
            toSay = await this.handleAdminHelp();
            break;
          case 'newevent':
            toSay = await this.handleNewEvent(msg);
            break;
          case 'newtournament':
            toSay = await this.handleNewTournament(msg);
            break;
          case 'updateevent':
            toSay = await this.handleUpdateEvent(msg);
            break;
          case 'updatetournament':
            toSay = await this.handleUpdateTournament(msg);
            break;
          case 'events':
            toSay = await this.handleEvents();
            break;
          case 'event':
            toSay = await this.handleEvent(msg);
            break;
          case 'tournaments':
            toSay = await this.handleTournaments(msg)
            break;
        }
      } catch (e) {
        this.logger.error(e);
      }

      this.adminSay(toSay);
      unlock();
    });

    this.bcoin.wclient.on('connect', async () => {
      const info = await this.bcoin.wallet.getInfo();
      await this.bcoin.wclient.call('join', 'primary', info.token);
      this.logger.info('Listening to bcoin wallet.');
    });

    this.hsd.wclient.on('connect', async () => {
      const info = await this.hsd.wallet.getInfo();
      await this.hsd.wclient.call('join', 'primary', info.token);
      this.logger.info('Listening to hsd wallet.');
    });

    // TODO(mark): this code could be deduped
    // Set up wallet listeners
    this.bcoin.wclient.bind('tx', async (walletid, details) => {
      if (walletid === 'primary') {
        for (const [i, output] of details.outputs.entries()) {
          if (output.path) {
            let user;
            try {
              user = await this.client.getUserByPaymentAddress(output.address);
            } catch (e) {
              this.logger.error(e);
              continue;
            }

            if (!user) {
              this.logger.error('Payment: user not found for %s', output.address);
              continue;
            }

            if (!user.nick) {
              this.logger.info('Payment: unknown user (address=%s)', output.address);
              continue;
            }

            this.logger.info('Payment: (user=%s) (address=%s)', user.nick, output.address);

            let payment;
            try {
              payment = this.client.createPayment({
                nick: user.nick,
                server: user.server,
                event: user.event,
                txid: details.hash,
                outputIndex: i,
                type: 'btc'
              });
            } catch (e) {
              this.logger.error(e);
              this.logger.error('Payment indexing failed.');
              continue;
            }
            this.logger.info('Payment indexing success.');


          }
        }
      }
    });

    this.hsd.wclient.bind('tx', async (walletid, details) => {
      if (walletid === 'primary') {
        for (const [i, output] of details.outputs.entries()) {
          if (output.path) {
            let user;
            try {
              user = await this.client.getUserByPaymentAddress(output.address);
            } catch (e) {
              this.logger.error(e);
              continue;
            }

            if (!user) {
              this.logger.error('Payment: user not found for %s', output.address);
              continue;
            }

            if (!user.nick) {
              this.logger.info('Payment: unknown user (address=%s)', output.address);
              continue;
            }

            this.logger.info('Payment: (user=%s) (address=%s)', user.nick, output.address);

            let payment;
            try {
              payment = this.client.createPayment({
                nick: user.nick,
                server: user.server,
                event: user.event,
                txid: details.hash,
                outputIndex: i,
                type: 'hns',
                value: output.value
              });
            } catch (e) {
              this.logger.error(e);
              this.logger.error('Payment indexing failed.');
              continue;
            }
            this.logger.info('Payment indexing success.');
          }
        }
      }
    });
  }

  // .bitcoininfo
  async handleBitcoinInfo() {
    let info;

    try {
      info = await this.bcoin.nclient.getInfo();
    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Could not fetch bitcoin info.');
    }

    if (!info)
      return this.errorTable('Could not fetch bitcoin info.');

    const response = new AsciiTable('Bitcoin Status')
      .setHeading('Height', 'Tip')
      response.addRow(info.chain.height, info.chain.tip);

    return response.toString();
  }

  // .handshakeinfo
  async handleHandshakeInfo() {
    let info;

    try {
      info = await this.hsd.nclient.getInfo();
    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Could not fetch handshake info.');
    }

    if (!info)
      return this.errorTable('Could not fetch handshake info.');

    const response = new AsciiTable('Handshake Status')
      .setHeading('Height', 'Tip')
      response.addRow(info.chain.height, info.chain.tip);

    return response.toString();
  }

  // TODO: implement
  // should anybody be able to query anybody?
  async handlePaymentInfo(from, msg) {
    return 'TODO: implement';
  }

  // .eventaddresses <event>
  async handleEventAddresses(msg) {
    const tokens = msg.split(' ');
    const eventName = tokens[1];

    if (!eventName)
      return this.usageTable('EVENTADDRESSES', 'Must pass event name');

    let info;
    try {
      info = await this.client.getUserAddressesByEvent(eventName);
    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Error');
    }

    if (info.length === 0)
      return this.sucessTable('No addresses registered yet.');

    const response = new AsciiTable('Addresses')
      .setHeading('', 'Nick', 'Address');

    for (const [i, data] of info.entries()) {
      let nick, address
      if (!data.user)
        nick = null;
      else
        nick = data.user.nick;

      if (!data.address)
        address = 'None Registered';
      else
        address = data.address.address;

      response.addRow(i, nick, address);
    }

    return response.toString();
  }

  // .users <name>
  async handleUsers(msg) {
    const tokens = msg.split(' ');
    const eventName = tokens[1];

    if (!eventName)
      return this.usageTable('USERS', 'Must pass event name');

    let info;
    try {
      info = await this.client.getEventInfo(eventName);
    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Error');
    }

    if (!info)
      return this.errorTable(`Event ${eventName} not found`);

    if (info.users.length === 0)
      return this.successTable('No users registered.');

    const response = new AsciiTable('Users')

    response.setHeading('', 'Name', 'Link');
    for (const [i, user] of info.users.entries())
      response.addRow(i, user.nick, user.link);


    return response.toString();
  }

  // .newevent name start end irc uri open
  async handleNewEvent(msg) {
    const str = utils.parseMsgArgs(msg);
    const tokenizer = Tokenizer.fromSchema(str, schemas.NEWEVENT);

    const name = tokenizer.get('name');

    if (!name)
      return this.usageTable('NEWEVENT', 'Must pass name.');

    let start = tokenizer.get('start');
    if (!start)
      return this.usageTable('NEWEVENT', 'Must pass start.');

    // TODO: validate with regex
    start = new Date(start).getTime() / 1000;

    let end = tokenizer.get('end');
    if (!end)
      return this.usageTable('NEWEVENT', 'Must pass end.');

    // TODO: validate with regex
    end = new Date(end).getTime() / 1000;

    let ircUri = tokenizer.get('ircUri');
    if (!ircUri)
      return this.usageTable('NEWEVENT', 'Must pass ircUri.');

    // TODO(mark): add bool method to tokenizer
    let open = tokenizer.get('open', false);
    if (open === 'true')
      open = true;
    else if (open === 'false')
      open = false;

    try {
      await this.admin.createEvent({
        name,
        start,
        end,
        ircUri,
        open,
      });
    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Error creating event.');
    }

    return this.successTable(`Event ${name} created.`);
  }

  // .user <name>
  async handleUser(from, msg) {
    const str = utils.parseMsgArgs(msg);

    const tokenizer = Tokenizer.fromSchema(str, schemas.USER);

    const name = tokenizer.get('name', from);

    let user;
    try {
      user = await this.client.getUser(name, this.ircuri);
    } catch (e) {
      return this.errorTable(`Error fetching user info for ${name}`);
    }

    if (!user)
      return this.errorTable(`User ${name} not found`);

    const response = new AsciiTable('User')
      .setHeading('', 'Nick', 'Link', 'Server', 'Sponsor')
      response.addRow('', user.nick, user.link, user.server, user.isSponsor);

    return response.toString();
  }

  // .tournaments <event>
  async handleTournaments(msg) {
    const tokens = msg.split(' ');

    const event = tokens[1];

    if (!event)
      return this.errorTable('Must pass event.');

    let tournaments;
    try {
      tournaments = await this.client.getTournaments(event);
    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Unable to get tournaments');
    }

    const response = new AsciiTable('Tournaments')

    if (tournaments.length === 0)
      return this.successTable('No tournaments yet.');

    response.setHeading('', 'Name', 'Link', 'Percentage');
    for (const [i, t] of tournaments.entries())
      response.addRow(i, t.name, t.link, t.percentage);

    return response.toString();
  }

  // admin command
  // .newtournament <event> <name> <link> <percent> <message>
  async handleNewTournament(msg) {
    const tokens = msg.split(' ');

    const event = tokens[1];

    if (!event)
      return this.usageTable('NEWTOURNAMENT', 'Must pass event name.');

    const name = tokens[2];

    if (!name)
      return this.usageTable('NEWTOURNAMENT', 'Must pass tournament name.');

    const link = tokens[3];

    if (!link)
      return this.usageTable('NEWTOURNAMENT', 'Must pass link describing tournament (Github Issue).');

    const percentage = tokens[4];

    if (!percentage)
      return this.usageTable('NEWTOURNAMENT', 'Must pass percentage of pot assigned to tournament');

    let message = tokens.slice(5).join(' ');
    if (!message)
      message = '';

    try {
      await this.admin.createTournament({
        name,
        event,
        link,
        percentage,
        message
      });

    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Error creating tournament. Must have unique name.');
    }

    return this.successTable(`Created tournament ${name}`);
  }


  // admin command
  // .updatetournament <event=str> <name=str> <link=str> <percent=str>
  async handleUpdateTournament(msg) {
    const str = utils.parseMsgArgs(msg);
    const tokenizer = Tokenizer.fromPairs(str);

    const event = tokenizer.get('event');

    if (!event)
      return this.usageTable('UPDATETOURNAMENT', 'Must pass event.');

    const name = tokenizer.get('name');

    if (!name)
      return this.usageTable('UPDATETOURNAMENT', 'Must pass tournament name.');

    const link = tokenizer.get('link');
    const percentage = tokenizer.get('percentage');

    try {
      await this.admin.updateTournament({
        event,
        name,
        link,
        percentage
      });
    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Error updating tournament.');
    }

    return this.successTable(`Updated tournament ${name}`);
  }

  // admin command
  // .updateevent name=<str> open=<str> btcFee=<str> hnsFee=<str> hyperlink=<str> message=<str>
  async handleUpdateEvent(msg) {
    const str = utils.parseMsgArgs(msg);
    const tokenizer = Tokenizer.fromPairs(str);

    const name = tokenizer.get('name');

    if (!name)
      return this.errorTable('Must pass name.');

    let open = tokenizer.get('open');

    if (open === 'true')
      open = true;
    else if (open === 'false')
      open = false;
    else
      open = undefined;

    let btcFee = tokenizer.get('btcFee');
    btcFee = parseInt(btcFee, 10);

    let hnsFee = tokenizer.get('hnsFee');
    hnsFee = parseInt(hnsFee, 10);

    const link = tokenizer.get('link');
    const message = tokenizer.get('message');

    try {
      await this.admin.updateEvent({
        name,
        open,
        btcFee,
        hnsFee,
        link,
        message
      });
    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Unable to update event.');
    }

    return this.successTable(`Updated event ${name}`);
  }

  // .register <event>
  // TODO: auto invite to the correct channel
  async handleRegister(from, msg) {
    const tokens = msg.split(' ');
    const event = tokens[1];

    if (!event)
      return this.usageTable('REGISTER', 'Must pass event.');

    // Make sure user exists
    const user = await this.client.getUser(from, this.ircuri);

    if (!user)
      return this.errorTable(`User ${from} not found. Please use .newuser before .register`);

    // Make sure event exists
    const eventInfo = await this.client.getEventInfo(event);

    if (!eventInfo)
      return this.errorTable(`Event ${event} not found`);

    // Check to make sure the user isn't already registered.
    for (const user of eventInfo.users) {
      if (user.nick === from && user.server === this.ircuri) {
        let paymentInfo;
        try {
          paymentInfo = await this.client.getPaymentAddress(from, user.server, event);
        } catch (e) {
          this.logger.error(e);
          return this.errorMessage('Already registered.');
        }

        if (!paymentInfo)
          return this.errorMessage('Error.');

        const {btcAddress, hnsAddress} = paymentInfo;
        const response = new AsciiTable('Already Registered')

        // TODO(mark): this code is copy/pasted from below
        if (btcAddress && !hnsAddress) {
          response.setHeading('Nick', 'Pay to BTC Address', 'Entry Fee');
          response.addRow(from, btcAddress, eventInfo.btcFee);
          return response.toString();
        }

        if (!btcAddress && hnsAddress) {
          response.setHeading('Nick', 'Pay to HNS Address', 'Entry Fee');
          response.addRow(from, hnsAddress, eventInfo.hnsFee);
          return response.toString();
        }

        // Allow payment in either
        if (btcAddress && hnsAddress) {
          response.setHeading('Nick', 'Pay to BTC Address', 'BTC Entry Fee', 'Pay to HNS Address', 'HNS Entry Fee');
          response.addRow(from, btcAddress, eventInfo.event.btcFee, hnsAddress, eventInfo.event.hnsFee);
          return response.toString();
        }
      }
    }

    // Make sure the event is open first.
    if (!eventInfo.event.open)
      return this.errorTable('Event is not open for registration');

    // Only create addresses if there is a join fee.
    let btcAddress, hnsAddress;
    if (eventInfo.event.btcFee) {
      try {
        const info = await this.bcoin.wallet.createAddress('default');
        btcAddress = info.address;
        this.logger.info('New Address (nick=%s) (event=%s) (address=%s)', from, event, btcAddress);
      } catch (e) {
        this.logger.error(e);
      }
    }

    if (eventInfo.event.hnsFee) {
      try {
        const info = await this.hsd.wallet.createAddress('default');
        hnsAddress = info.address;
        this.logger.info('New Address (nick=%s) (event=%s) (address=%s)', from, event, hnsAddress);
      } catch (e) {
        this.logger.error(e);
      }
    }

    try {
      await this.client.registerUser({
        nick: from,
        server: this.ircuri,
        event,
        btcAddress,
        hnsAddress
      });
    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Error registering user.');
    }

    const response = new AsciiTable('Register');

    if (btcAddress && !hnsAddress) {
      response.setHeading('Nick', 'Pay to BTC Address', 'Entry Fee');
      response.addRow(from, btcAddress, eventInfo.btcFee);
      return response.toString();
    }

    if (!btcAddress && hnsAddress) {
      response.setHeading('Nick', 'Pay to HNS Address', 'Entry Fee');
      response.addRow(from, hnsAddress, eventInfo.hnsFee);
      return response.toString();
    }

    // Allow payment in either
    if (btcAddress && hnsAddress) {
      response.setHeading('Nick', 'Pay to BTC Address', 'BTC Entry Fee', 'Pay to HNS Address', 'HNS Entry Fee');
      response.addRow(from, btcAddress, eventInfo.event.btcFee, hnsAddress, eventInfo.event.hnsFee);
      return response.toString();
    }

    response.setHeading('Nick');
    response.addRow(from);
    return response.toString();
  }

  // .newuser <link>
  async handleNewUser(from, msg) {
    const str = utils.parseMsgArgs(msg);
    const tokenizer = Tokenizer.fromSchema(str, schemas.NEWUSER);
    const link = tokenizer.get('link');

    try {
      await this.client.createUser({
        nick: from,
        link,
        isSponsor: false,
        server: this.ircuri
      });
    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Error adding new user');
    }

    return this.successTable(`Welcome ${from}`);
  }

  // .events
  async handleEvents() {
    let events;
    try {
      events = await this.client.getEvents();
    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Error');
    }

    if (events.length === 0)
      return this.successTable('No Events');

    const response = new AsciiTable('Events')
      .setHeading('', 'Name', 'Link');

    for (const [i, event] of events.entries())
      response.addRow(i, event.name, event.link);

    return response.toString();
  }

  // .event <name>
  async handleEvent(msg) {
    const str = utils.parseMsgArgs(msg);
    const tokenizer = Tokenizer.fromSchema(str, schemas.EVENT);

    const name = tokenizer.get('name');

    if (!name)
      return this.usageTable('EVENT', 'Must pass name');

    let info;
    try {
      info = await this.client.getEventInfo(name)
    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Error getting event info.')
    }

    if (!info)
      return this.errorTable(`Event ${name} not found`);

    const start = new Date(info.event.start).toTimeString();
    const end = new Date(info.event.end).toTimeString();

    const response = new AsciiTable('Event')
      .addRow('Name', info.event.name)
      .addRow('IRC URI', info.event.ircUri || 'No IRC URI')
      .addRow('Start', start)
      .addRow('End', end)
      .addRow('Open to Join', info.event.open)
      .addRow('BTC Entry Fee', info.event.btcFee || 'None')
      .addRow('HNS Entry Fee', info.event.hnsFee || 'None')
      .addRow('Link', info.event.link || 'No link')
      .addRow('User Count', info.users.length);

    if (info.event.message)
      response.addRow('Message', info.event.message);

    return response.toString();
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
  async handleNewAddress(from, msg) {
    const tokens = msg.split(' ');

    // Make sure user exists
    let user;
    try {
      user = await this.client.getUser(from, this.ircuri);
    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Error getting user info.');
    }

    if (!user)
      return this.errorTable('User not found');

    const event = tokens[1];

    if (!event)
      return this.usageTable('NEWADDRESS', 'Must pass event');

    // check to make sure user is in the event
    let info;
    try {
      info = await this.client.getEventInfo(event);
    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Error getting event info');
    }

    if (!info)
      return this.errorTable(`Event ${event} not found.`);

    let found = false;
    for (const user of info.users) {
      if (user.nick === from)
        found = true;
    }

    if (!found)
      return this.errorTable('Please register for event first');

    const address = tokens[2];

    if (!address)
      return this.errorTable('Must pass address');

    // TODO: better error messaging when its a duplicate
    // address error.
    let result;
    try {
      result = await this.client.createAddress({
        nick: from,
        server: this.ircuri,
        event,
        address
      });
    } catch (e) {
      this.logger.error(e);
      return this.errorTable('Error creating address.');
    }


    if (!result)
      return this.errorTable('Error registering address');

    this.logger.debug('Address: %s %s', from, address);
    return this.successTable(`Success ${from} registered ${address} for ${event}`);
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
    // rate limit the help notices
    const now = Date.now();

    if (now - this.lastHelp < 10000)
      return;

    this.lastHelp = now;

    this.irc.say(this.channel, description);

    const response = new AsciiTable('Help')
      .setHeading('Command', 'Usage');

    for (const [cmd, msg] of Object.values(usage))
      response.addRow(cmd, msg);

    return response.toString();
  }

  // .adminhelp
  handleAdminHelp() {
    const response = new AsciiTable('Help')
      .setHeading('Command', 'Usage');

    for (const [cmd, msg] of Object.values(adminUsage))
      response.addRow(cmd, msg);

    return response.toString();
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

    if (msg.match(/^.user/))
      return 'user';

    if (msg.match(/^.newaddress/))
      return 'newaddress';

    if (msg.match(/^.newtournament/))
      return 'newtournament';

    if (msg.match(/^.updatetournament/))
      return 'updatetournament';

    if (msg.match(/^.updateevent/))
      return 'updateevent';

    if (msg.match(/^.tournaments/))
      return 'tournaments';

    if (msg.match(/^.bitcoininfo/))
      return 'bitcoininfo';

    if (msg.match(/^.handshakeinfo/))
      return 'handshakeinfo';

    if (msg.match(/^.paymentinfo/))
      return 'paymentinfo';

    return null;
  }

  // TODO: handle error case
  async joinChannel(channel) {
    return new Promise((resolve, reject) => {
      this.irc.join(channel, (nick, res) => {
        this.logger.info(`Connection: ${res.prefix} to ${channel}`);
        resolve();
      });
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
