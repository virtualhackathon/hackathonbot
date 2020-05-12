/*!
 * ircclient.js - irc client for virtualhackathon
 * Copyright (c) 2020, Mark Tyneway (MIT License).
 * https://github.com/virtualhackathon/hackathonbot
 */

'use strict';

const IRC = require('irc');

/**
 * This is a very light wrapper around the IRC
 * Client. Add application specific helpers here.
 */

class Client extends IRC.Client {
  constructor(...options) {
    super(...options);
  }
}

module.exports = Client;
