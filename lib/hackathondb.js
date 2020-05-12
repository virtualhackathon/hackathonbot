/**
 * hackathondb.js - database for virtualhackathon
 * Copyright (c) 2020, Mark Tyneway (MIT License).
 * Copyright (c) 2020, DNS.Live
 * https://github.com/virtualhackathon/hackathonbot
 */

'use strict';

const EventEmitter = require('events');
const Path = require('path');
const os = require('os');
const fs = require('bfile');
const assert = require('bsert');
const Logger = require('blgr');
const path = require('path')
const sqlite3 = require('sqlite3');
const {open} = require('sqlite');
const SQL = require('./sql');

/**
 * HackathonDB manages a sqlite db
 */

class HackathonDB extends EventEmitter {
  constructor(options) {
    super();

    this.options = new HackathonDBOptions(options);
    this.logger = this.options.logger.context('hackathondb');
    this.db = null;
  }

  bind() {
    assert(this.db);

    this.db.on('error', (error) => {
      this.logger.error(error);
    });
  }

  async open() {
    await this.ensureFs();

    this.logger.debug('Using database %s', this.options.path);

    this.db = await open({
      filename: this.options.path,
      driver: sqlite3.Database
    });

    this.bind();

    await this.ensureTables();
  }

  async close() {
    this.db.close();
  }

  async deleteDB() {
    await fs.rimraf(this.options.path);
  }

  async ensureFs() {
    if (fs.unsupported)
      return;

    if (this.memory)
      return;

    return fs.mkdirp(this.options.prefix);
  }

  // TODO (mark): good way to check if table exists?
  async ensureTables() {
    try {
      await this.createTables();
    } catch (e) {
      this.logger.spam('One or more table(s) already exist.');
    }
  }

  async createTables() {
    const creates = []

    for (const key of Object.keys(SQL)) {
      if (key.match(/TABLE/))
        creates.push(key);
    }

    let err = false;

    for (const create of creates) {
      try {
        await this.db.run(SQL[create]);
        this.logger.info('Created table. \n%s', SQL[create]);
      } catch (e) {
        this.logger.error(e);
        err = true;
      }
    }

    if (err)
      throw new Error(err);
  }

  /**
   * Get all events.
   */

  async getEvents() {
    const results = await this.db.all(SQL.GET_EVENTS);

    return results;
  }

  /**
   * Create an event.
   * TODO: should be able to accept all arguments,
   * updateEvent accepts all of the arguments.
   */

  async createEvent(options) {
    assert(typeof options === 'object');
    assert(typeof options.name === 'string');
    assert(typeof options.start === 'number');
    assert(typeof options.end === 'number');
    assert(typeof options.ircUri === 'string');

    if (options.link != null)
      assert(typeof options.link === 'string');

    if (options.message != null)
      assert(typeof options.message === 'string');

    if (options.open != null)
      assert(typeof options.open === 'boolean');

    const data = {
      ':name': options.name,
      ':start': options.start,
      ':end': options.end,
      ':link': options.link,
      ':message': options.message,
      ':ircUri': options.ircUri,
      ':open': options.open
    };

    const result = await this.db.run(SQL.CREATE_EVENT, data);

    return result;
  }

  /**
   * Update an event. Allows admins to turn on
   * fees.
   */

  async updateEvent(options) {
    // Do all validation first so that an
    // assertion doesn't fail with some of the
    // data being written. There has to be a better
    // way of doing this.
    assert(typeof options.name === 'string');

    if (options.open != null)
      assert(typeof options.open === 'boolean');

    if (options.btcFee != null)
      assert(typeof options.btcFee === 'number');

    if (options.hnsFee != null)
      assert(typeof options.hnsFee === 'number');

    if (options.message != null)
      assert(typeof options.message === 'string');

    if (options.link != null)
      assert(typeof options.link === 'string');

    const results = {};

    if (options.open != null) {
      await this.db.run(SQL.UPDATE_EVENT_OPEN, {
        ':name': options.name,
        ':open': options.open
      });

      results.open = options.open;
    }

    if (options.btcFee != null) {
      await this.db.run(SQL.UPDATE_EVENT_BTC_FEE, {
        ':name': options.name,
        ':btc_fee': options.btcFee
      });

      results.btcFee = options.btcFee;
    }

    if (options.hnsFee != null) {
      await this.db.run(SQL.UPDATE_EVENT_HNS_FEE, {
        ':name': options.name,
        ':hns_fee': options.hnsFee
      });

      results.hnsFee = options.hnsFee;
    }

    if (options.message != null) {
      await this.db.run(SQL.UPDATE_EVENT_MESSAGE, {
        ':name': options.name,
        ':message': options.message
      });

      results.message = options.message;
    }

    if (options.link != null) {
      await this.db.run(SQL.UPDATE_EVENT_LINK, {
        ':name': options.name,
        ':link': options.link
      });

      results.link = options.link;
    }

    let msg = '';
    for (const [key, value] of Object.entries(results)) {
      msg += `(${key}=${value}) `;
    }

    this.logger.info('Event %s updated: %s', options.name, msg);

    return options;
  }

  async setUserPaidForEvent(nick, server, paid) {
    assert(typeof nick === 'string');
    assert(typeof server === 'string');
    assert(typeof paid === 'boolean');

    const data = {
      ':nick': nick,
      ':server': server,
      ':paid': paid
    };

    const result = await this.db.run(SQL.SET_PAID_USER_EVENT_BY_NICK_SERVER, data);

    return result;
  }

  async getEventByName(name) {
    assert(typeof name === 'string');

    const data = {':name': name};
    const result = await this.db.get(SQL.GET_EVENT_BY_NAME, data);

    result.open = !!result.open;

    return result;
  }

  async getEventById(id) {
    assert(typeof id === 'number');

    const data = {':id': id};
    const result = await this.db.get(SQL.GET_EVENT_BY_ID, data);

    return result;
  }

  async createTournament(options) {
    assert(typeof options.name === 'string');
    assert(typeof options.event === 'string');
    assert(typeof options.link === 'string');
    assert(typeof options.message === 'string');
    assert(typeof options.percentage === 'string');

    // TODO: typecheck percentage here with a regex

    const data = {
      ':name': options.name,
      ':event': options.event,
      ':link': options.link,
      ':message': options.message,
      ':percentage': options.percentage
    };

    const result = await this.db.run(SQL.CREATE_TOURNAMENT_BY_EVENT_NAME, data);

    return result;
  }

  async updateTournament(options) {
    assert(typeof options.name === 'string');
    assert(typeof options.event === 'string');

    if (options.link != null)
      assert(typeof options.link === 'string');

    if (options.message != null)
      assert(typeof options.message === 'string');

    if (options.percentage != null)
      assert(typeof options.percentage === 'string');

    const results = {};

    if (options.link != null) {
      await this.db.run(SQL.UPDATE_TOURNAMENT_LINK, {
        ':link': options.link,
        ':name': options.name,
        ':event': options.event
      });

      results.link = options.link;
    }

    if (options.message != null) {
      await this.db.run(SQL.UPDATE_TOURNAMENT_MESSAGE, {
        ':message': options.message,
        ':name': options.name,
        ':event': options.event
      });

      results.message = options.message;
    }

    if (options.percentage != null) {
      await this.db.run(SQL.UPDATE_TOURNAMENT_PERCENTAGE, {
        ':percentage': options.percentage,
        ':name': options.name,
        ':event': options.event
      });

      results.percentage = options.percentage;
    }

    let msg = '';
    for (const [key, value] of Object.entries(results)) {
      msg += `(${key}=${value}) `;
    }

    this.logger.info('Tournament %s updated: %s', options.name, msg);

    return options;
  }

  async getTournamentsByEvent(event) {
    assert(typeof event === 'string');

    const data = {':event': event};

    const result = await this.db.all(SQL.GET_TOURNAMENTS_BY_EVENT_NAME, data);

    return result;
  }

  async getTournamentByNameAndEvent(name, event) {
    assert(typeof name === 'string');
    assert(typeof event === 'string');

    const data = {':name': name, ':event': event};

    const result = await this.db.get(SQL.GET_TOURNAMENT_BY_NAME_EVENT, data);
    result.event = event;

    return result;
  }

  async createUser(options) {
    assert(typeof options.nick === 'string');
    assert(typeof options.isSponsor === 'boolean');
    assert(typeof options.server === 'string');

    if (options.link != null)
      assert(typeof options.link === 'string');

    const data = {
      ':nick': options.nick,
      ':link': options.link,
      ':is_sponsor': options.isSponsor,
      ':server': options.server
    };

    const result = await this.db.run(SQL.CREATE_USER, data);

    return result;
  }

  async getUser(nick, server) {
    assert(typeof nick === 'string');
    assert(typeof server === 'string');

    const data = {':nick': nick, ':server': server}
    const result = await this.db.get(SQL.GET_USER_BY_NICK_AND_SERVER, data);

    if (!result)
      return null;

    // TODO (mark): how to do this in SQL syntax?
    // Type cast to boolean from integer
    result.isSponsor = !!result.isSponsor;

    return result;
  }

  async getUserById(id) {
    assert(typeof id === 'number');

    const data = {':id': id};
    const result = await this.db.get(SQL.GET_USER_BY_ID, data);

    if (!result)
      return null;

    result.isSponsor = !!result.isSponsor;

    return result;
  }

  async createAddress(options) {
    assert(typeof options.address === 'string');

    if (options.pubkey != null)
      assert(typeof options.pubkey === 'string');

    if (options.proof != null)
      assert(typeof options.proof === 'string');

    // Allow indexing using nick, server and event name
    // for simple API.
    if (typeof options.nick === 'string'
        && typeof options.server === 'string'
        && typeof options.event === 'string') {

      const data = {
        ':nick': options.nick,
        ':server': options.server,
        ':event': options.event,
        ':address': options.address,
        ':pubkey': options.pubkey ? options.pubkey : null,
        ':proof': options.proof ? options.proof : null
      };

      const result = await this.db.run(SQL.CREATE_ADDRESS_BY_NICK_SERVER_EVENT, data);
      return result;
    }

    // Otherwise, index using userId and eventId
    assert(typeof options.userId === 'number');
    assert(typeof options.eventId === 'number');

    const data = {
      ':user_id': options.userId,
      ':address': options.address,
      ':event_id': options.eventId,
      ':pubkey': options.pubkey ? options.pubkey : null,
      ':proof': options.proof ? options.proof : null
    };

    const result = await this.db.run(SQL.CREATE_ADDRESS, data);
    return result;
  }

  async getAddressByUserIdAndEventId(userId, eventId) {
    assert(typeof userId === 'number');
    assert(typeof eventId === 'number');

    const data = {':user_id': userId, ':event_id': eventId};

    const result = await this.db.get(SQL.GET_ADDRESS_BY_USERID_EVENTID, data);
    return result;
  }

  async getUserAddressesByEvent(event) {
    assert(typeof event === 'string');
    const data = {':name': event};

    const users = await this.getUsersByEvent(event);

    const result = [];

    for (const user of users) {
      const address = await this.getAddressByNickAndServerAndEvent(user.nick, user.server, event);

      result.push({
        user: user,
        address: address
      });
    }

    return result;
  }

  async getAddressByNickAndServerAndEvent(nick, server, event) {
    assert(typeof nick === 'string');
    assert(typeof server === 'string');
    assert(typeof event === 'string');

    const data = {
      ':nick': nick,
      ':server': server,
      ':name': event
    };

    const result = await this.db.get(SQL.GET_ADDRESS_BY_NICK_SERVER_EVENT, data);
    return result;
  }

  /**
   * Event can be a string (event name) or id (number)
   */

  async getAddressesByEvent(event) {
    if (typeof event === 'string') {
      const data = {':event': event};
      const result = await this.db.get(SQL.GET_ADDRESSES_BY_EVENT)

      return result;
    }

    assert(typeof event === 'number');
    const data = {':event_id': event};
    const result = await this.db.get(SQL.GET_ADDRESSES_BY_EVENT_ID, data);

    return result;
  }

  async getAddressesByNickAndServer(nick, server) {
    assert(typeof nick === 'string');
    assert(typeof server === 'string');

    const data = {':nick': nick, ':server': server};
    const result = await this.db.all(SQL.GET_ADDRESSES_BY_NICK_SERVER, data);

    return result;
  }

  // TODO: bug here, this isn't safe. Need
  // to account for the case of two nicks being the same.
  async getAddressByNickAndEvent(nick, event) {
    assert(typeof nick === 'string');
    assert(typeof event === 'string');

    const data = {':nick': nick, ':event': event};

    const result = await this.db.get(SQL.GET_ADDRESS_BY_NICK_EVENT, data);

    return result;
  }

  async getAddressInfo(address) {
    assert(typeof address === 'string');

    const data = {':address': address};

    const result = await this.db.get(SQL.GET_ADDRESS_INFO, data);

    return result;
  }

  async addUserToEventByNickAndServer(options) {
    assert(typeof options.nick === 'string');
    assert(typeof options.server === 'string');
    assert(typeof options.event === 'string');

    if (options.paid == null)
      options.paid = false;

    if (options.btcAddress)
      assert(typeof options.btcAddress === 'string');

    if (options.hnsAddress)
      assert(typeof options.hnsAddress === 'string');


    const data = {
      ':nick': options.nick,
      ':server': options.server,
      ':event': options.event,
      ':btcAddress': options.btcAddress,
      ':hnsAddress': options.hnsAddress,
      ':paid': options.paid
    };

    const result = await this.db.run(SQL.ADD_USER_TO_EVENT_BY_NICK_SERVER, data);
    return result;
  }

  async getPaymentAddress(nick, server, event) {
    assert(typeof nick === 'string');
    assert(typeof server === 'string');
    assert(typeof event === 'string');

    const data = {
      ':nick': nick,
      ':server': server,
      ':event': event
    };

    const result = await this.db.get(SQL.GET_PAYMENT_ADDRESS_BY_NICK_SERVER_EVENT, data);

    return result;
  }

  async getUserByPaymentAddress(options) {
    assert(options.btcAddress || options.hnsAddress);

    if (options.btcAddress)
      assert(typeof options.btcAddress === 'string');

    if (options.hnsAddress)
      assert(typeof options.hnsAddress === 'string');

    const results = {};

    if (options.btcAddress) {
      const result = await this.db.get(SQL.GET_USER_BY_BTC_PAYMENT_ADDRESS, {
        ':btc_address': options.btcAddress
      });

      results.btcUser = result;
    }

    if (options.hnsAddress) {
      const result = await this.db.get(SQL.GET_USER_BY_HNS_PAYMENT_ADDRESS, {
        ':hns_address': options.hnsAddress
      });

      results.hnsUser = result;
    }

    // If both, go with btc.
    if (results.btcUser) {
      const result = await this.db.get(SQL.GET_EVENT_BY_USER_BTC_PAYMENT_ADDRESS, {
        ':btc_address': options.btcAddress,
        ':nick': results.btcUser.nick,
        ':server': results.btcUser.server
      });

      return {
        event: result.name,
        nick: results.btcUser.nick,
        server: results.btcUser.server
      }
    }

    if (results.hnsUser) {
      const result = await this.db.get(SQL.GET_EVENT_BY_USER_HNS_PAYMENT_ADDRESS, {
        ':hns_address': options.hnsAddress,
        ':nick': results.hnsUser.nick,
        ':server': results.hnsUser.server
      });

      return {
        event: result.name,
        nick: results.hnsUser.nick,
        server: results.hnsUser.server
      }
    }

    return {nick: null, server: null, event: null};
  }

  async getAllUsersByEvent(event) {
    // When it is an event name
    if (typeof event === 'string') {
      const data = {':event': event};

      const result = await this.db.all(SQL.GET_ALL_USERS_BY_EVENT_NAME, data);

      // TODO(mark): figure out type corecion for boolean in the SQL
      return result.map(user => ({ ...user, isSponsor: !!user.isSponsor}));
    }

    // When it is an event_id
    assert(typeof event === 'number');

    const data = {':event_id': event};

    const result = await this.db.all(SQL.GET_ALL_USERS_BY_EVENTID, data);
    return result.map(user => ({ ...user, isSponsor: !!user.isSponsor }));
  }

  async getUsersByEvent(event) {
    // When it is an event name
    if (typeof event === 'string') {
      const data = {':event': event};

      const result = await this.db.all(SQL.GET_USERS_BY_EVENT_NAME, data);

      // TODO(mark): figure out type corecion for boolean in the SQL
      return result.map(user => ({ ...user, isSponsor: !!user.isSponsor}));
    }

    // When it is an event_id
    assert(typeof event === 'number');

    const data = {':event_id': event};

    const result = await this.db.all(SQL.GET_USERS_BY_EVENTID, data);
    return result.map(user => ({ ...user, isSponsor: !!user.isSponsor }));
  }

  async getSponsorsByEvent(event) {
    // When it is an event name
    if (typeof event === 'string') {
      const data = {':event': event};

      const result = await this.db.all(SQL.GET_SPONSORS_BY_EVENT_NAME, data);

      // TODO(mark): figure out type corecion for boolean in the SQL
      return result.map(user => ({ ...user, isSponsor: !!user.isSponsor}));
    }

    // When it is an event_id
    assert(typeof event === 'number');

    const data = {':event_id': event};

    const result = await this.db.all(SQL.GET_SPONSORS_BY_EVENTID, data);
    return result.map(user => ({ ...user, isSponsor: !!user.isSponsor }));
  }

  async createPayment(options) {
    assert(typeof options.nick === 'string');
    assert(typeof options.server === 'string');
    assert(typeof options.event === 'string');
    assert(typeof options.txid === 'string');
    assert(typeof options.type === 'string');
    assert(typeof options.value === 'number');

    // Making index optional allows for non UTXO based blockchains
    if (options.outputIndex != null)
      assert(typeof options.outputIndex === 'number');

    const data = {
      ':nick': options.nick,
      ':server': options.server,
      ':event': options.event,
      ':txid': options.txid,
      ':type': options.type,
      ':output_index': options.outputIndex,
      ':value': options.value
    };

    const result = await this.db.run(SQL.CREATE_PAYMENT, data);

    return result;
  }

  async getPaymentsByNickAndServerAndEvent(nick, server, event) {
    assert(typeof nick === 'string');
    assert(typeof server === 'string');
    assert(typeof event === 'string');

    const data = {
      ':nick': nick,
      ':server': server,
      ':event': event,
    };

    const result = await this.db.all(SQL.GET_PAYMENTS_BY_NICK_SERVER_EVENT, data);

    return result;
  }

  async getPaymentsByEvent(event) {
    assert(typeof event === 'string');

    const data = {':event': event};

    const result = await this.db.all(SQL.GET_PAYMENTS_BY_EVENT, data);

    return result;
  }

  async getUserIdByNickAndServer(nick, server) {
    assert(typeof nick === 'string');
    assert(typeof server === 'string');

    const data = {':nick': nick, ':server': server};

    const result = await this.db.get(SQL.GET_USER_ID_BY_NICK_AND_SERVER, data)

    return result;
  }

  async getEventIdByName(event) {
    assert(typeof event === 'string');

    const data = {':event': event}

    const result = await this.db.get(SQL.GET_EVENT_ID_BY_NAME, data);

    return result;
  }

  async getUserEventIdByUserIdAndEventId(userId, eventId) {
    assert(typeof userId === 'number');
    assert(typeof eventId === 'number');

    const data = {
      ':user_id': userId,
      ':event_id': eventId
    };

    const result = await this.db.get(SQL.GET_USER_EVENT_ID_BY_USER_ID_EVENT_ID, data);

    return result;
  }
}

class HackathonDBOptions {
  constructor(options) {

    this.logger = Logger.global;
    this.memory = false;
    this.filename = 'hackathon.db';
    this.prefix = path.join(os.homedir(), '.irchackathon');
    this.path = null;

    if (options)
      this.fromOptions(options);
  }

  fromOptions(options) {
    if (!options.memory) {
      assert(typeof options.prefix === 'string');
      this.prefix = options.prefix;
    }

    if (typeof options.filename === 'string')
      this.filename = options.filename;

    this.path = Path.join(this.prefix, this.filename);

    if (typeof options.path === 'string')
      this.path = options.path;

    if (typeof options.logger === 'object')
      this.logger = options.logger;

    return this;
  }
}

module.exports = HackathonDB;
