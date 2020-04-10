/**
 *
 */

const IRCClient = require('./ircclient');
const HackathondClient = require('./httpclient');
const Logger = require('blgr');
const Config = require('bcfg');

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

class EventManager {
  constructor() {
    super();

    this.config = new Config('hackathond');

    this.config.load({
      argv: true,
      env: true
    });

  }

  async open() {

  }

  async close() {

  }

  async ensure() {

  }
}

module.exports = EventManager;
