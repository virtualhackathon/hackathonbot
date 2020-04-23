/**
 * HackathonDB tests
 */

const HackathonDB = require('../lib/hackathondb.js');
const os = require('os');
const path = require('path');
const Logger = require('blgr');
const assert = require('bsert');

const logger = new Logger('debug');
const tmpdb = path.join(os.tmpdir(), 'irchackathon.db');

let db;
describe('HackathonDB', function() {
  this.timeout(10000);

  before(async () => {
    //await logger.open();

    db = new HackathonDB({
      memory: true, // TODO: memory isn't being applied
      path: tmpdb,
      logger: logger
    });

  });

  after(async () => {
    await logger.close();
    await db.close();
  });

  beforeEach(async () => {
    await db.open();
  });

  afterEach(async () => {
    await db.deleteDB();
    await db.close();
  });

  it('should create/get event', async () => {
    const event = {
      name: 'foobar',
      start: 1586372294397,
      end: 1586372196415,
      link: 'https://bitcoin.com',
      ircUri: 'irc://irc.freenode.net:6667/#truth',
      message: 'this is a test!',
      open: false,
      btcFee: null,
      hnsFee: null
    };

    await db.createEvent(event);

    const result = await db.getEventByName('foobar');

    assert.deepEqual(event, result);
  });

  it('should create/get user', async () => {
    const user = {
      nick: 'satoshi',
      link: 'github.com/satoshi',
      isSponsor: false,
      server: 'irc.freenode.net'
    };

    await db.createUser(user);

    const result = await db.getUser('satoshi', 'irc.freenode.net');

    assert.deepEqual(user, result);
  });

  it('should create/get address', async () => {
    const address = {
      userId: 0,
      eventId: 0,
      address: 'hs1q3hgrv7em307swjp5h2cdlhk3x050ah6sxje5uk',
      proof: null,
      pubkey: null
    };

    await db.createAddress(address);

    const result = await db.getAddressByUserIdAndEventId(0, 0);

    assert.deepEqual(address, result);
  });

  it('should create/get address by nick, server and event', async () => {
    // Create user
    const user = {
      nick: 'testnick',
      server: 'irc.freenode.net',
      isSponsor: false,
      link: 'twitter.com/bitcoin'
    };

    await db.createUser(user);

    // Create event
    const event = {
      name: 'hackathon20',
      start: 1586372294397,
      end: 1586372196415,
      link: 'https://dns.live',
      message: 'this is a not a drill!',
      open: false,
      ircUri: 'irc://irc.freenode.net:6667/#truth',
    };

    await db.createEvent(event);

    await db.addUserToEventByNickAndServer({
      nick: user.nick,
      server: user.server,
      event: event.name
    });

    const address = {
      nick: 'testnick',
      server: 'irc.freenode.net',
      event: 'hackathon20',
      address: 'hs1q3hgrv7em307swjp5h2cdlhk3x050ah6sxje5uu'
    };

    await db.createAddress(address);

    const result = await db.getAddressByNickAndServerAndEvent(
      address.nick,
      address.server,
      address.event
    );

    assert.equal(address.address, result.address);

    {
      const info = await db.getUser(user.nick, user.server);
      assert(info);
    }

    {
      // get users by event
      const info = await db.getUserAddressesByEvent(event.name);
      assert.equal(info.length, 1);

      assert.equal(info[0].user.nick, user.nick);
      assert.equal(info[0].address.address, address.address);
    }
  });

  it('should get all user addresses', async () => {
    const str = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);

    // Create user
    const user = {
      nick: `get-all-user-addresses-${str}`,
      server: 'irc.freenode.net',
      isSponsor: false,
      link: 'twitter.com/bitcoin'
    };

    await db.createUser(user);

    // Create event
    const event = {
      name: 'get-user-addresses-event',
      start: 1586372294397,
      end: 1586372196415,
      link: 'https://dns.live',
      message: 'this is a message',
      ircUri: 'irc://irc.freenode.net:6667/#truth',
      open: false
    };

    await db.createEvent(event);

    const addresses = [
      `hs1q3hgrv7em307swjp5h2cdlhk3x050ah6sxje5uu${randomStr(3)}`,
      `hs1q3hgrv7em307swjp5h2cdlhk3x050ah6sxje5uu${randomStr(3)}`,
      `hs1q3hgrv7em307swjp5h2cdlhk3x050ah6sxje5uu${randomStr(3)}`
    ];

    // add addresses
    for (let i = 0; i < 3; i++) {
      const address = {
        nick: user.nick,
        server: user.server,
        event: 'get-user-addresses-event',
        address: addresses[i]
      };

      await db.createAddress(address);
    }

    const result = await db.getAddressesByNickAndServer(
      user.nick,
      user.server
    );

    assert.equal(result.length, 3);
  });

  it('should add user to event', async () => {
    // Create user
    const user = {
      nick: 'myfirstnick',
      server: 'irc.freenode.net',
      isSponsor: false,
      link: 'twitter.com/hns'
    };

    await db.createUser(user);

    // Create event
    const event = {
      name: '123',
      start: 1586372294397,
      end: 1586372196415,
      link: 'https://dns.live',
      message: 'this is a message',
      ircUri: 'irc://irc.freenode.net:6667/#truth',
      open: false
    };

    await db.createEvent(event);

    await db.addUserToEventByNickAndServer({
      nick: user.nick,
      server: user.server,
      event: event.name
    });

    const result = await db.getUsersByEvent(event.name);
    assert.equal(result.length, 1);
    assert.equal(result[0].nick, user.nick);
  });

  it('should get many users for event', async () => {
    // Create event
    const event = {
      name: 'abc',
      start: 1586372294397,
      end: 1586372196415,
      link: 'https://sia.tech',
      message: 'my message',
      ircUri: 'irc://irc.freenode.net:6667/#truth',
      open: false
    };

    await db.createEvent(event);

    for (let i = 0; i < 5; i++) {
      // Create user
      const user = {
        nick: `user-${i}`,
        server: 'irc.freenode.net',
        isSponsor: false,
        link: `twitter.com/user-${i}`
      };

      await db.createUser(user);

      await db.addUserToEventByNickAndServer({
        nick: user.nick,
        server: user.server,
        event: event.name
      });
    }

    const result = await db.getUsersByEvent(event.name);
    assert.equal(result.length, 5);

    for (const [i, user] of result.entries()) {
      assert.equal(user.nick, `user-${i}`);
      assert.equal(user.server, 'irc.freenode.net');
      assert.equal(user.isSponsor, false);
      assert.equal(user.link, `twitter.com/user-${i}`);
    }
  });

  it('should get sponsors for event', async () => {
    // Create event
    const event = {
      name: 'sponsors-or-users',
      start: 1586372294397,
      end: 1586372196415,
      link: 'https://leader.xi',
      message: 'do you know?',
      ircUri: 'irc://irc.freenode.net:6667/#truth',
      open: false
    };

    await db.createEvent(event);

    {
      const user = {
        nick: 'user',
        server: 'irc.freenode.net',
        isSponsor: false,
        link: `twitter.com/user`
      };

      await db.createUser(user);

      await db.addUserToEventByNickAndServer({
        nick: user.nick,
        server: user.server,
        event: event.name
      });
    }

    const sponsor = {
      nick: 'sponsor',
      server: 'irc.freenode.net',
      isSponsor: true,
      link: 'twitter.com/sponsor'
    };

    await db.createUser(sponsor);

    await db.addUserToEventByNickAndServer({
      nick: sponsor.nick,
      server: sponsor.server,
      event: event.name
    });

    const sponsors = await db.getSponsorsByEvent(event.name);
    assert.equal(sponsors.length, 1);

    assert.deepEqual(sponsors[0], sponsor);
  });

  it('should get users (non-sponsors) for event', async () => {
    // Create event
    const event = {
      name: 'sponsors-or-users',
      start: 1586372294397,
      end: 1586372196415,
      link: 'https://leader.xi',
      ircUri: 'irc://irc.freenode.net:6667/#truth',
      message: 'do you know?'
    };

    await db.createEvent(event);

    {
      const sponsor = {
        nick: 'sponsor',
        server: 'irc.freenode.net',
        isSponsor: true,
        link: 'twitter.com/sponsor'
      };

      await db.createUser(sponsor);

      await db.addUserToEventByNickAndServer({
        nick: sponsor.nick,
        server: sponsor.server,
        event: event.name
      });
    }

    const user = {
      nick: 'user',
      server: 'irc.freenode.net',
      isSponsor: false,
      link: `twitter.com/user`
    };

    await db.createUser(user);

    await db.addUserToEventByNickAndServer({
      nick: user.nick,
      server: user.server,
      event: event.name
    });

    const users = await db.getUsersByEvent(event.name);
    assert.equal(users.length, 1);

    assert.deepEqual(users[0], user);
  });

  it('should update event', async () => {
    const event = {
      name: 'update-event',
      start: 1586372294397,
      end: 1586372196415,
      ircUri: 'irc://irc.freenode.net:6667/#truth',
      open: false
    };

    await db.createEvent(event);

    const pre = await db.getEventByName(event.name);
    assert.equal(pre.name, event.name);

    const update = {
      name: event.name,
      open: true,
      btcFee: 100000,
      hnsFee: 1000,
      link: 'https://leader.xy',
      message: 'do you know?'
    };

    await db.updateEvent(update);

    const post = await db.getEventByName(event.name);
    assert.equal(post.name, event.name);
    assert.equal(post.open, update.open);
    assert.equal(post.btcFee, update.btcFee);
    assert.equal(post.hnsFee, update.hnsFee);
    assert.equal(post.link, update.link);
    assert.equal(post.message, update.message);
  });

  it('should create tournament', async () => {
    const event = {
      name: 'create-tournament',
      start: 1586372294397,
      end: 1586372196415,
      ircUri: 'irc://irc.freenode.net:6667/#truth',
      open: false
    };

    await db.createEvent(event);

    const tournament = {
      name: 'big-pr',
      event: event.name,
      link: 'https://github.com/bcoin-org/bcoin/issues/555',
      message: 'Do this for the win',
      percentage: '0.25'
    };

    await db.createTournament(tournament);

    const tournaments = await db.getTournamentsByEvent(event.name);
    assert.equal(tournaments.length, 1);
    assert.equal(tournaments[0].name, tournament.name);
    assert.equal(tournaments[0].link, tournament.link);
    assert.equal(tournaments[0].message, tournament.message);
    assert.equal(tournaments[0].percentage, tournament.percentage);

    const t = await db.getTournamentByNameAndEvent(tournament.name, event.name);
    assert.equal(tournament.name, t.name);
    assert.equal(tournament.link, t.link);
    assert.equal(tournament.message, t.message);
    assert.equal(tournament.percentage, t.percentage);
  });

  it('should update tournament', async () => {
    const event = {
      name: 'update-tournament',
      start: 1586372294397,
      end: 1586372196415,
      ircUri: 'irc://irc.freenode.net:6667/#truth',
      open: false
    };

    await db.createEvent(event);

    const tournament = {
      name: 'update-test',
      event: event.name,
      link: 'https://github.com/bcoin-org/bcoin/issues/555',
      message: 'Do this for the win',
      percentage: '0.25'
    };

    await db.createTournament(tournament);

    const pre = await db.getTournamentByNameAndEvent(tournament.name, event.name);

    const update = {
      name: tournament.name,
      event: tournament.event,
      link: tournament.link + '12',
      message: 'Updated message',
      percentage: '0.50'
    }

    await db.updateTournament(update);

    const post = await db.getTournamentByNameAndEvent(tournament.name, event.name);

    assert.deepEqual(post, update);
  });

  it('should get all events', async () => {
    const events = [];

    for (let i = 0; i < 5; i++) {
      const event = {
        name: `${i}a`,
        start: 1586372294397,
        end: 1586372196415,
        ircUri: 'irc://irc.freenode.net:6667/#truth',
        open: false
      };

      await db.createEvent(event);
      events.push(event);
    }

    const indexed = await db.getEvents();
    assert.equal(indexed.length, events.length);
  });

  it('should create/get payments', async () => {
    const event = {
      name: 'get-payments',
      start: 1586372294397,
      end: 1586372196415,
      ircUri: 'irc://irc.freenode.net:6667/#truth',
      open: false
    };

    await db.createEvent(event);

    const user = {
      nick: 'create',
      server: 'irc.freenode.net',
      isSponsor: false
    };

    await db.createUser(user);

    await db.addUserToEventByNickAndServer({
      nick: user.nick,
      server: user.server,
      event: event.name
    });

    const payment = {
      nick: user.nick,
      server: user.server,
      event: event.name,
      txid: '00'.repeat(32),
      type: 'btc',
      outputIndex: 0
    };

    await db.createPayment(payment);

    const result = await db.getPaymentsByNickAndServerAndEvent(user.nick, user.server, event.name);

    assert.equal(result.length, 1);
    assert.equal(result[0].type, payment.type);
    assert.equal(result[0].txid, payment.txid);
    assert.equal(result[0].outputIndex, payment.outputIndex);
  });

  it('should get address user pairs for event', async () => {
    const event = {
      name: `address-user-pairs`,
      start: 1586372294397,
      end: 1586372196415,
      link: 'https://winner.ogh',
      message: 'open your eyes',
      ircUri: 'irc://irc.freenode.net:6667/#truth',
      open: false
    };

    await db.createEvent(event);

    const users = [];
    const addrs = [];

    for (let i = 0; i < 2; i++) {
      const user = {
        nick: `user-${i}`,
        server: 'irc.freenode.net',
        isSponsor: false,
        link: `twitter.com/user-${i}`
      };

      await db.createUser(user);
      await db.addUserToEventByNickAndServer({
        nick: user.nick,
        server: user.server,
        event: event.name
      });
      users.push(user);
    }

    for (let [i, user] of users.entries()) {
      const addresses = [
        `hs1q3hgrv7em307swjp5h2cdlhk3x050ah6sxje5uu${randomStr(3)}`,
        `hs1q3hgrv7em307swjp5h2cdlhk3x050ah6sxje5uu${randomStr(3)}`
      ];

      const address = {
        nick: user.nick,
        server: user.server,
        event: event.name,
        address: addresses[i]
      };

      await db.createAddress(address);
      addrs.push(addresses[i]);
    }

    const result = await db.getUserAddressesByEvent(event.name);
    assert.equal(result.length, 2);

    const [pair1, pair2] = result;

    assert.equal(pair1.user.nick, users[0].nick);
    assert.equal(pair2.user.nick, users[1].nick);

    assert.equal(pair1.address.address, addrs[0])
    assert.equal(pair2.address.address, addrs[1])
  });

  it('should get proven addresses', async () => {
    this.skip();
  });
});

function randomStr(len) {
  assert(len <= 36);
  return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, len);
}
