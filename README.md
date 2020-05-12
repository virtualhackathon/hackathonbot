# hackathonbot

Virtual Hackathon Bot for running Virtual Hackathons.

## Installation

Requires Node.js and `npm`.

```bash
$ git clone https://github.com/virtualhackathon/hackathonbot.git
$ cd hackathonbot
$ npm install
```

To manage payments, this also depends on a Bitcoin full node and
a Handshake full node. [bcoin](https://github.com/bcoin-org/bcoin)
and [hsd](https://github.com/handshake-org/hsd) must be set up
and with wallets. By default, both use the wallets. This app
will use addresses in the default wallet/account and it is
recommended that the corresponding mnemonic is backed up and not
used with any other applications.

## Set up

There are two main applications in `bin`, `hackathond` and the
`event-daemon`. `hackathond` maintains a database behind a REST
server and the `event-daemon` has an IRC Client, a `hackathond`
REST client, a `bcoin` client and a `hsd` client. The `event-daemone
will listen to IRC for commands and call out to `hackathond`, `bcoin`
and `hsd`. The state of the hackathons is stored in `hackathond`
and `bcoin`/`hsd` are used for payments.

To start a `bcoin` node, use the command:

```bash
$ git clone https://github.com/bcoin-org/bcoin
$ cd bcoin
$ npm rebuild
$ ./bin/bcoin --witness true
```

The [bcoin developer docs](https://github.com/bcoin-org/bcoin/blob/master/docs/configuration.md)
are useful for seeing the various ways to configure `bcoin`. Note that `hsd` is a
fork of `bcoin`, so most of the configuration options apply.

To start an `hsd` node, use the command:

```bash
$ git clone https://github.com/handshake-org/hsd
$ cd hsd
$ npm install
$ ./bin/hsd
```

The [hsd developer docs](https://hsd-dev.org/guides/config.html) explain how
to fully configure `hsd`.


Note that these can run on the same machine as `hackathond` if it
is a relatively beefy machine, otherwise they should be ran on
different machines. The `bcoin` and `hsd` HTTP/RPC clients
support TLS, so using something like Let's Encrypt should be able
to work if you name the machines that `bcoin`/`hsd` are running on.
The appropriate ssl flags must be passed to `bcoin`/`hsd` for this
to work. Please see the docs on Github for 

`hackathond` will manage storing all of the information related
to the hackathons themselves. The default HTTP server will
listen on port `7870` and the admin HTTP server will listen on port
`7871`. The default directory used by `hackathond` is `~/.hackathond`.
It uses a SQLite database which can be found in `~/.hackathond/hackathon.db`.
To manually see entries in the database, use the command:

```bash
$ sqlite3 ~/.hackathond/hackathon.db
```

See `lib.sql.js` for useful SQL commands to run, along with
the schemas for the tables.


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
outside of IRC. This is useful for pulling various information
out of the database without using the `sqlite3` command with
raw SQL commands.

```
$ ./bin/cli --help
```

## Usage

Users must first register with `hackathond`. They will then be able
to join events. The admins must create events for users to join.
Users will be able to register an address to use for a particular
event.

The following commands are available from within the `irc-channel`:

- .newuser
- .register
- .events
- .event
- .tournaments
- .users
- .user
- .newaddress
- .eventaddresses
- .paymentinfo
- .bitcoininfo
- .handshakeinfo
- .help

The following commands are available from within the `irc-admin-channel`:

- .newevent
- .updateevent
- .newtournament
- .updatetournament
- .events
- .event
- .adminhelp

## Running a Hackathon

Admins must create events and tournaments. These can only be created
in the admin channel. Users will not be able to join the event until
it is updated to be opened. The `.newevent` command is used to create
events and the `.updateevent` is used to update the event information.
Events are made up of tournaments. A tournament is defined by an actionable
task that must be completed by the end of the hackathon. A tournament
has a percentage which corresponds to the total percentage of the event
pot that will be paid out to the winner of that tournament. The tournaments
can be updated by admins with the `.updatetournament` command.

Users must first register into the system using the `.newuser` command
before they are able to participate in any hackathons. The user must
then use `.register` with an event. It is possible to see all of the
possible events with the `.event` command.

The `.eventinfo` command will print more detailed information about
an event. This is useful to see all of the information you would want
to know about a particular event.

When a user registers for an event, if the event is pay to join then the
user will get an address that they must send funds to. When the funds
are received, the user will be marked as paid for that event.

Users can also upload addresses that they control so that the admins
can pay out the prize money to the winners. This is done with the
`.newaddress` command.

# License
Copyright (c) 2019 SEED
Copyright (c) 2020 Mark Tyneway

