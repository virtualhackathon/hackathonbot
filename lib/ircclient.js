const IRC = require('irc');

class Client extends IRC.Client {
  constructor(...options) {
    super(...options);
  }
}

module.exports = Client;
