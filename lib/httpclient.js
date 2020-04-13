/*!
 * client.js - http client hackathond
 * Copyright (c) 2017, Christopher Jeffrey (MIT License).
 * Copyright (c) 2020, Mark Tyneway (MIT License).
 */

'use strict';

const assert = require('bsert');
const {Client} = require('bcurl');

/**
 * Node Client
 * @extends {bcurl.Client}
 */

class HackathondClient extends Client {
  /**
   * Creat a node client.
   * @param {Object?} options
   */

  constructor(options) {
    super(options);

    this.admin = false;
    if (options.admin)
      this.admin = true;
  }

  /**
   * Auth with server.
   * @returns {Promise}
   */

  async auth() {
    ;
  }

  /**
   * Get some info about the server
   * @returns {Promise}
   */

  getInfo() {
    return this.get('/');
  }

  /**
   *
   */

  getEvents() {
    assert(!this.admin);
    return this.get('/event');
  }

  /**
   *
   */

  getEventInfo(event) {
    assert(!this.admin);
    assert(typeof event === 'string');
    return this.get(`/event/${event}`);
  }

  /**
   *
   */

  getUser(nick, server) {
    assert(!this.admin);
    assert(typeof nick === 'string');
    assert(typeof server === 'string');
    return this.get(`/user/${nick}/${server}`);
  }

  /**
   *
   */

  createUser(options) {
    assert(!this.admin);
    assert(typeof options === 'object');
    return this.post('/user', options);
  }

  /**
   *
   */

  getAddressInfo(address) {
    assert(!this.admin);
    assert(typeof address === 'string');
    return this.get(`/address/${address}`);
  }

  /**
   *
   */

  createAddress(options) {
    assert(!this.admin);
    assert(typeof options === 'object');
    return this.post('/address', options);
  }

  /**
   *
   */

  createEvent(options) {
    assert(this.admin);
    assert(typeof options === 'object');
    return this.post('/event', options);
  }

  /**
   *
   */

  registerUser(options) {
    assert(typeof options === 'object');
    return this.post('/event/register', options);
  }

  /**
   *
   */

  getUserAddressesByEvent(event) {
    assert(typeof event === 'string');
    return this.get(`/user/address/event/${event}`);
  }
}

/*
 * Expose
 */

module.exports = HackathondClient;
