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
    --log-level spam
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

