/**
 *
 */

'use strict';

const description = '' +
`Welcome to IRCHackathon. To participate:
1. Add yourself as a user in the system with .newuser
2. Look up events with .events
3. Register for events with .register
4. Add address for event with .newaddress`;

// TODO: way for user to add link to themselves
// .updateuser <link>
const usage = {
  REGISTER: [
    '.register <name>',
    'Register for an event.'
  ],
  EVENTS: [
    '.events',
    'Display all events.'
  ],
  NEWUSER: [
    '.newuser <hyperlink>',
    'Please register with a hyperlink, can be http(s) or irc.'
  ],
  EVENT: [
    '.event <name>',
    'Look up event information by name.'
  ],
  TOURNAMENTS: [
    '.tournaments <event>',
    'List event tournaments.'
  ],
  USERS: [
    '.users <name>',
    'Display users in event.'
  ],
  NEWADDRESS: [
    '.newaddress <event> <address>',
    'Add new address for event.'
  ],
  EVENTADDRESSES: [
    '.eventaddresses <name>',
    'List event addresses.'
  ]
};

const adminUsage = {
  NEWEVENT: [
    '.newevent <name> <start> <end> <irc uri> <open=false>',
    'Create a new event. Start and end must be in mm/dd/yy format'
  ],
  NEWTOURNAMENT: [
    '.newtournament <event> <name> <link> <percent>',
    'Add a new tournament to an event.'
  ],
  UPDATETOURNAMENT: [
    '.updatetournament <event=str> <name=str> <link=str> <percent=str>',
    'Update tournament info.'
  ],
  UPDATEEVENT: [
    '.updateevent name=<str> open=<str> btcFee=<str> hnsFee=<str> hyperlink=<str> message=<str>',
    'Update event information, registration opening and entry fee.'
  ]
};

const ports = {
  hackathond: 7870,
  admin: 7871
};

const hsdPorts = {
  main: 12037,
  testnet: 13037,
  regtest: 14037,
  simnet: 15037
};

const hsdWalletPorts = {
  main: 12039,
  testnet: 13039,
  regtest: 14039,
  simnet: 15039
};

const bcoinPorts = {
  main: 8332,
  testnet: 18332,
  regtest: 48332,
  simnet: 18556
};

const bcoinWalletPorts = {
  main: 8334,
  testnet: 18334,
  regtest: 48334,
  simnet: 18558
}

module.exports = {
  description,
  usage,
  adminUsage,
  ports,
  hsdPorts,
  hsdWalletPorts,
  bcoinPorts,
  bcoinWalletPorts
}
