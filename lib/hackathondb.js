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
      this.logger.debug('One or more table(s) already exist.');
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
        this.logger.debug(e);
        err = true;
      }
    }

    if (err)
      throw new Error(err);
  }

  /**
   *
   */

  async getEvents() {
    const results = await this.db.all(SQL.GET_EVENTS);

    return results;
  }

  /**
   *
   */

  async createEvent(options) {
    assert(typeof options === 'object');
    assert(typeof options.name === 'string');
    assert(typeof options.start === 'number');
    assert(typeof options.end === 'number');
    assert(typeof options.link === 'string');
    assert(typeof options.message === 'string');

    const data = {
      ':name': options.name,
      ':start': options.start,
      ':end': options.end,
      ':link': options.link,
      ':message': options.message
    };

    const result = await this.db.run(SQL.CREATE_EVENT, data);

    return result;
  }

  async getEventByName(name) {
    assert(typeof name === 'string');

    const data = {':name': name};
    const result = await this.db.get(SQL.GET_EVENT_BY_NAME, data);

    return result;
  }

  async getEventById(id) {
    assert(typeof id === 'number');

    const data = {':id': id};
    const result = await this.db.get(SQL.GET_EVENT_BY_ID, data);

    return result;
  }

  async createUser(options) {
    assert(typeof options.nick === 'string');
    assert(typeof options.link === 'string');
    assert(typeof options.isSponsor === 'boolean');
    assert(typeof options.server === 'string');

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

    const data = {
      ':nick': options.nick,
      ':server': options.server,
      ':event': options.event
    };

    const result = await this.db.run(SQL.ADD_USER_TO_EVENT_BY_NICK_SERVER, data);
    return result;
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
