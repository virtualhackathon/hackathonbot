/**
 *
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
    await logger.open();

    db = new HackathonDB({
      memory: true, // TODO: memory isn't being applied
      path: tmpdb,
      logger: logger
    });

    await db.open();
  });

  after(async () => {
    await logger.close();
    await db.close();
  });

  beforeEach(async () => {
    //
  });

  afterEach(async () => {
    // clear the db
  });

  it('should create/get event', async () => {
    const event = {
      name: 'foobar',
      start: 1586372294397,
      end: 1586372196415,
      link: 'https://bitcoin.com',
      message: 'this is a test!'
    };

    await db.createEvent(event);

    const result = await db.getEventByName('foobar');

    // The id is an autoincrementing primary key
    delete result.id;
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

    delete result.id;
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
    delete result.id;

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
      message: 'this is a not a drill!'
    };

    await db.createEvent(event);

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
      const userResult = await db.getUser(user.nick, user.server);
      assert.equal(result.userId, userResult.id);
    }

    {
      const eventResult = await db.getEventByName(event.name);
      assert.equal(result.eventId, eventResult.id);
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
      message: 'this is a message'
    };

    await db.createEvent(event);

    const addresses = [
      `hs1q3hgrv7em307swjp5h2cdlhk3x050ah6sxje5uu${str}`,
      `hs1q3hgrv7em307swjp5h2cdlhk3x050ah6sxje5uu${str}`,
      `hs1q3hgrv7em307swjp5h2cdlhk3x050ah6sxje5uu${str}`
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
      message: 'this is a message'
    };

    await db.createEvent(event);

    await db.addUserToEventByNickAndServer({
      nick: user.nick,
      server: user.server,
      event: event.name
    });

    const result = await db.getUsersByEvent(event.name);

    {
      const eventByName = await db.getEventByName(event.name);
      const byEventId = await db.getUsersByEvent(eventByName.id);
      assert.deepEqual(result, byEventId);
    }
  });

  it('should get many users for event', async () => {
    // Create event
    const event = {
      name: 'abc',
      start: 1586372294397,
      end: 1586372196415,
      link: 'https://sia.tech',
      message: 'my message'
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
      message: 'do you know?'
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

  it('should get address user pairs for event', async () => {
    this.skip();

    const str = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5);

    // Create event
    const event = {
      name: `address-user-pairs-${str}`,
      start: 1586372294397,
      end: 1586372196415,
      link: 'https://winner.ogh',
      message: 'open your eyes'
    };

    await db.createEvent(event);

    // create 2 users
    // loop over the users

    const users = [];
    for (let i = 0; i < 2; i++) {
      const user = {
        nick: `user-${str}-${i}`,
        server: 'irc.freenode.net',
        isSponsor: false,
        link: `twitter.com/user-${str}-${i}`
      };

      await db.createUser(user);
      users.push(user);
    }

    for (let [i, user] of users.entries()) {
      const addresses = [
        `hs1q3hgrv7em307swjp5h2cdlhk3x050ah6sxje5uu${str}-${i}`,
        `hs1q3hgrv7em307swjp5h2cdlhk3x050ah6sxje5uu${str}-${i}`,
        `hs1q3hgrv7em307swjp5h2cdlhk3x050ah6sxje5uu${str}-${i}`
      ];

      // add addresses
      for (let i = 0; i < 3; i++) {
        const address = {
          nick: user.nick,
          server: user.server,
          event: `address-user-pairs-${str}`,
          address: addresses[i]
        };

        await db.createAddress(address);
      }
    }

    // TODO: fix this
    const result = await db.getUserAddressesByEvent(event.name);

    console.log(result);
  });

  it('should get proven addresses', async () => {
    this.skip();

  });
});
