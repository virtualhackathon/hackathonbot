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

  async getInfo() {
    return this.get('/');
  }

  /**
   *
   */

  async getEvents() {
    assert(!this.admin);
    return this.get('/event');
  }

  /**
   *
   */

  async getEventInfo(event) {
    assert(!this.admin);
    assert(typeof event === 'string');
    return this.get(`/event/${event}`);
  }

  /**
   *
   */

  async getUser(nick, server) {
    assert(!this.admin);
    assert(typeof nick === 'string');
    assert(typeof server === 'string');
    return this.get(`/user/${nick}/${server}`);
  }

  /**
   *
   */

  async createUser(options) {
    assert(!this.admin);
    assert(typeof options === 'object');
    return this.post('/user', options);
  }

  /**
   *
   */

  async getAddressInfo(address) {
    assert(!this.admin);
    assert(typeof address === 'string');
    return this.get(`/address/${address}`);
  }

  /**
   *
   */

  async getPaymentAddress(nick, server, event) {
    assert(!this.admin);
    assert(typeof nick === 'string');
    assert(typeof server === 'string');
    assert(typeof event === 'string');
    return this.get(`/payment/address/${nick}/${server}/${event}`);
  }

  /**
   *
   */

  async getUserByPaymentAddress(address) {
    assert(!this.admin);
    assert(typeof address === 'string');
    return this.get(`/payment/user/${address}`);
  }

  /**
   *
   */

  async createPayment(options) {
    assert(!this.admin);
    assert(typeof options === 'object');
    return this.post('/payment', options);
  }

  /**
   *
   */

  async getPayments(nick, server, event) {
    assert(!this.admin);
    assert(typeof nick === 'string');
    assert(typeof server === 'string');
    assert(typeof event === 'string');
    return this.get(`/payment/user`, {nick, server, event});
  }

  /**
   *
   */

  async createAddress(options) {
    assert(!this.admin);
    assert(typeof options === 'object');
    return this.post('/address', options);
  }

  /**
   *
   */

  async createEvent(options) {
    assert(this.admin);
    assert(typeof options === 'object');
    return this.post('/event', options);
  }

  /**
   *
   */

  async createTournament(options) {
    assert(this.admin);
    assert(typeof options === 'object');
    return this.post('/event/tournament', options);
  }

  async updateTournament(options) {
    assert(this.admin);
    assert(typeof options === 'object');
    return this.put('/event/tournament', options);
  }

  async getTournaments(event) {
    assert(!this.admin);
    assert(typeof event === 'string');
    return this.get(`/event/${event}/tournament`);
  }

  async updateEvent(options) {
    assert(this.admin);
    assert(typeof options === 'object');
    this.put('/event', options);
  }

  /**
   *
   */

  async registerUser(options) {
    assert(typeof options === 'object');
    return this.post('/event/register', options);
  }

  /**
   *
   */

  async getUserAddressesByEvent(event) {
    assert(typeof event === 'string');
    return this.get(`/user/address/event/${event}`);
  }
}

/*
 * Expose
 */

module.exports = HackathondClient;
