/**
 * constants.js - http server for hackathonbot
 * Copyright (c) 2020, Mark Tyneway (MIT License).
 * https://github.com/virtualhackathon/hackathonbot
 */

'use strict';

const description = '' +
`Welcome to IRCHackathon. To participate:
1. Add yourself as a user in the system with .newuser
2. Look up events with .events
3. Register for events with .register
4. Add address for event with .newaddress`;

const adminDescription = '' +
`Welcome to IRCHackathon Admin Channel. Use
the command .adminhelp to see the possible commands.`;

// TODO: way for user to add link to themselves
// .updateuser <link>

// Commands for irc-channel
const usage = {
  NEWUSER: [
    '.newuser <hyperlink>',
    'Please register with a hyperlink, can be http(s) or irc.'
  ],
  REGISTER: [
    '.register <name>',
    'Register for an event.'
  ],
  EVENTS: [
    '.events',
    'Display all events.'
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
    '.users <event>',
    'Display users in event.'
  ],
  USER: [
    '.user <name>',
    'Get registered user info.'
  ],
  NEWADDRESS: [
    '.newaddress <event> <address>',
    'Add new address for event.'
  ],
  EVENTADDRESSES: [
    '.eventaddresses <name>',
    'List event addresses.'
  ],
  PAYMENTINFO: [
    '.paymentinfo <user>',
    'List addresses payment addresses by user.'
  ],
  BITCOININFO: [
    '.bitcoininfo',
    'Fetch bitcoin node info'
  ],
  HANDSHAKEINFO: [
    '.handshakeinfo',
    'Fetch handshake node info'
  ]
};

// Commands for admin-irc-channel
const adminUsage = {
  NEWEVENT: [
    '.newevent <name> <start> <end> <irc uri> <open>',
    'Create a new event. Start and end must be mm/dd/yy format. Open is bool.'
  ],
  UPDATEEVENT: [
    '.updateevent <name=str> <open=str> <btcFee=str> <hnsFee=str> <hyperlink=str> <message=str>',
    'Update event information, registration opening and entry fee.'
  ],
  NEWTOURNAMENT: [
    '.newtournament <event> <name> <link> <percentage>',
    'Add a new tournament to an event.'
  ],
  UPDATETOURNAMENT: [
    '.updatetournament <event=str> <name=str> <link=str> <percentage=str>',
    'Update tournament info.'
  ],
  EVENTS: [
    '.events',
    'Display all events.'
  ],
  EVENT: [
    '.event <name>',
    'Look up event information by name.'
  ],
  TOURNAMENTS: [
    '.tournaments <event>',
    'List event tournaments.'
  ]
};

// Ports for hackathond
const ports = {
  hackathond: 7870,
  admin: 7871
};

// Ports for hsd by network
const hsdPorts = {
  main: 12037,
  testnet: 13037,
  regtest: 14037,
  simnet: 15037
};

// Ports for hsd wallet by network
const hsdWalletPorts = {
  main: 12039,
  testnet: 13039,
  regtest: 14039,
  simnet: 15039
};

// Ports for bcoin by network
const bcoinPorts = {
  main: 8332,
  testnet: 18332,
  regtest: 48332,
  simnet: 18556
};

// Ports for bcoin wallet by network
const bcoinWalletPorts = {
  main: 8334,
  testnet: 18334,
  regtest: 48334,
  simnet: 18558
};

module.exports = {
  description,
  usage,
  adminUsage,
  ports,
  hsdPorts,
  hsdWalletPorts,
  bcoinPorts,
  bcoinWalletPorts
};
