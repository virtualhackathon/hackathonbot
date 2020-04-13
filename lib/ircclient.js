/*!
 * ircclient.js - irc client for virtualhackathon
 * Copyright (c) 2020, Mark Tyneway (MIT License).
 * https://github.com/virtualhackathon/hackathonbot
 */

'use strict';

const IRC = require('irc');


class Client extends IRC.Client {
  constructor(...options) {
    super(...options);
  }
}

module.exports = Client;
