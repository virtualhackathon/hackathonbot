# hackathonbot

Virtual Hackathon Bot for running Virtual Hackathons.

## Installation

Requires Node.js and `npm`.

```bash
$ git clone https://github.com/virtualhackathon/hackathonbot.git
$ cd hackathonbot
$ npm install
```

## Set up

There are two main applications in `bin`, `hackathond` and the
`event-daemon`. `hackathond` maintains a database behind a REST
server and the `event-daemon` has an IRC Client and a `hackathond`
REST client. The `event-daemon` will listen to IRC and call out
to `hackathond` via HTTP to get/post information to the database.

First start by running `hackathond`. The default HTTP server will
listen on port `7870` and the admin HTTP server will listen on port
`7871`.

It depends on both `bcoin` and `hsd` running. The usual `bclient`
and `hs-client` arguments can be passed, with the `bcoin-` and
`hsd-` prefixes. The wallet clients accept similar configuration
but with `hsd-wallet-` and `bcoin-wallet-` prefixes. See
[hsd-cli](https://github.com/handshake-org/hs-client/blob/master/bin/hsd-cli)
and [bcoin-cli](https://github.com/bcoin-org/bclient/blob/master/bin/bcoin-cli)
for the full list of arguments that can be passed to the `NodeClient`.

```bash
$ ./bin/hackathond
```

Now start up the `event-daemon`.

```
$ ./bin/event-daemon \
    --bot-nick HACKATHON_BOT \
    --irc-uri 127.0.0.1 \
    --irc-channel '#hackathon' \
    --irc-admin-channel '#hackathon-admin' \
    --log-level spam \
    --hsd-url "127.0.0.1" \
    --hsd-network regtest \
    --bcoin-url "127.0.0.1" \
    --bcoin-network regtest
```

The `event-daemon` will listen to two channels, the `irc-channel`
and the `irc-admin-channel`. Admin only commands will be available
in the `irc-admin-channel` and commands for participants will
be available in the `irc-channel`. Note the `'` surrounding the
channel names, this is required since there is a `#` prefix.

The `spam` log level will log all messages in the IRC channels
that the bot is connected to.

There is also a CLI tool to interact with `hackathond` from
outside of IRC.

```
$ ./bin/cli --help
```

## Usage

Users must first register with `hackathond`. They will then be able
to join events. The admins must create events for users to join.
Users will be able to register an address to use for a particular
event.

The following commands are available from within the `irc-channel`:

- .register
- .newuser
- .events
- .event
- .eventaddresses
- .users
- .newaddress
- .help

The following commands are available from within the `irc-admin-channel`:

- .newevent
- .adminhelp

# License
Copyright (c) 2019 SEED

