/*!
 * server.js - http server for hackathonbot
 * Copyright (c) 2017-2018, Christopher Jeffrey (MIT License).
 * Copyright (c) 2019-2020, Mark Tyneway (MIT License).
 * https://github.com/virtualhackathon/hackathonbot
 */

'use strict';

const assert = require('bsert');
const path = require('path');
const {Server} = require('bweb');
const Validator = require('bval');
const base58 = require('bcrypto/lib/encoding/base58');
const sha256 = require('bcrypto/lib/sha256');
const random = require('bcrypto/lib/random');
const {safeEqual} = require('bcrypto/lib/safe');

/**
 * HTTP
 * @alias module:http.Server
 */

class HTTP extends Server {
  /**
   * Create an http server.
   * @constructor
   * @param {Object} options
   */

  constructor(options) {
    super(new HTTPOptions(options));

    this.logger = this.options.logger.context('hackathond-http');
    this.db = this.options.db;

    this.counter = 0;

    this.init();
  }

  /**
   * Initialize routes.
   * @private
   */

  init() {
    this.on('request', (req, res) => {
      if (req.method === 'POST' && req.pathname === '/')
        return;

      this.counter++;

      this.logger.debug('Request for method=%s path=%s (%s).',
        req.method, req.pathname, req.socket.remoteAddress);
    });

    this.on('listening', (address) => {
      this.logger.info('HTTP server listening on %s (port=%d).',
        address.address, address.port);
    });

    this.initRouter();
    this.initSockets();
  }

  /**
   * Initialize routes.
   * @private
   */

  initRouter() {
    if (this.options.cors)
      this.use(this.cors());

    if (!this.options.noAuth) {
      this.use(this.basicAuth({
        hash: sha256.digest,
        password: this.options.apiKey,
        realm: 'node'
      }));
    }

    this.use(this.bodyParser({
      type: 'json'
    }));

    this.use(this.router());

    this.error((err, req, res) => {
      const code = err.statusCode || 500;
      res.json(code, {
        error: {
          type: err.type,
          code: err.code,
          message: err.message
        }
      });
    });

    this.get('/', async (req, res) => {
      res.json(200, {
        requests: this.counter,
        memory: this.logger.memoryUsage()
      });
    });

    // Get all events
    this.get('/event', async (req, res) => {
      const valid = Validator.fromRequest(req);
      const events = await this.db.getEvents();

      if (!events) {
        res.json(404);
        return;
      }

      res.json(200, events);
    });

    // Get event info
    // Return an object that includes the event info
    // along with the users involved in the event
    this.get('/event/:name', async (req, res) => {
      const valid = Validator.fromRequest(req);
      const name = valid.str('name');

      const event = await this.db.getEventByName(name);
      if (!event) {
        res.json(404);
        return;
      }

      const users = await this.db.getUsersByEvent(name);

      res.json(200, {
        event: event,
        users: users
      });
    });

    // Get user info
    this.get('/user/:nick/:server', async (req, res) => {
      const valid = Validator.fromRequest(req);
      const nick = valid.str('nick');
      const server = valid.str('server');

      enforce(nick, 'Must pass nick.');
      enforce(server, 'Must pass server.');

      const info = await this.db.getUser(nick, server);

      if (!info) {
        res.json(404);
        return;
      }

      res.json(200, info);
    });

    // Create user
    this.post('/user', async (req, res) => {
      const valid = Validator.fromRequest(req);

      const nick = valid.str('nick');
      const link = valid.str('link');
      const isSponsor = valid.bool('isSponsor', false);
      const server = valid.str('server');

      enforce(nick);
      enforce(link);
      enforce(typeof isSponsor === 'boolean');
      enforce(server);

      const result = await this.db.createUser({
        nick,
        link,
        isSponsor,
        server
      });

      res.json(200, {nick, link, isSponsor, server});
    });

    this.post('/event/register', async (req, res) => {
      const valid = Validator.fromRequest(req);
      const nick = valid.str('nick');
      const server = valid.str('server');

      const event = valid.str('event');

      // check to make sure user exists first
      const user = await this.db.getUser(nick, server);

      if (!user) {
        res.json(404);
        return;
      }

      const result = await this.db.addUserToEventByNickAndServer({
        nick,
        server,
        event
      });

      res.json(200, {
        nick,
        server,
        event,
      });
    });

    // Get user + event by address
    this.get('/address/:address', async (req, res) => {
      const valid = Validator.fromRequest(req);
      const address = valid.str('address');

      enforce(address, 'Must pass address');

      const info = await this.db.getAddressInfo(address);

      if (!info) {
        res.json(404);
        return;
      }

      const user = await this.db.getUserById(info.userId);

      if (!user) {
        res.json(404);
        return;
      }

      const event = await this.db.getEventById(info.eventId);

      if (!event) {
        res.json(404);
        return;
      }

      res.json(200, {
        user: user,
        event: event
      });
    });

    // Create address
    this.post('/address', async (req, res) => {
      const valid = Validator.fromRequest(req);
      const nick = valid.str('nick');
      const server = valid.str('server');
      const event = valid.str('event');
      const address = valid.str('address');

      enforce(nick, 'Must pass nick');
      enforce(server, 'Must pass server.');
      enforce(event, 'Must pass event.');
      enforce(address, 'Must pass address.');

      // check to make sure user exists first
      const user = await this.db.getUser(nick, server);

      if (!user) {
        res.json(404);
        return;
      }

      // check to make sure event exists first
      const hasEvent = await this.db.getEventByName(event);

      if (!hasEvent) {
        res.json(404);
        return;
      }

      try {
        await this.db.createAddress({
          nick,
          server,
          event,
          address
        })
      } catch (e) {
        this.logger.error(e);
        // Addresses must be unique
        res.json(403, {message: 'Invalid address. Must be unique.'});
        return;
      }

      res.json(200, {nick, server, event, address});
    });

    // Get user addresses by event
    this.get('/user/address/event/:event', async (req, res) => {
      const valid = Validator.fromRequest(req);
      const event = valid.str('event');

      enforce(event, 'Must pass event.');

      const result = await this.db.getUserAddressesByEvent(event);

      if (!result) {
        res.json(404);
        return;
      }

      res.json(200, result)
    });

    // Get addresses by user
    this.get('/address/:user/:server', async (req, res) => {
      res.json(400);
    });

    // Post proof to server
    this.post('/address/proof', async (req, res) => {
      res.json(400);
    });
  }

  /**
   * Handle new websocket.
   * @private
   * @param {WebSocket} socket
   */

  handleSocket(socket) {
    ;
  }

  /**
   * Handle new auth'd websocket.
   * @private
   * @param {WebSocket} socket
   */

  handleAuth(socket) {
    ;
  }

  /**
   * Bind to chain events.
   * @private
   */

  initSockets() {
    ;
  }
}

class HTTPOptions {
  /**
   * HTTPOptions
   * @alias module:http.HTTPOptions
   * @constructor
   * @param {Object} options
   */

  constructor(options) {
    this.logger = null;
    this.node = null;
    this.apiKey = base58.encode(random.randomBytes(20));
    this.apiHash = sha256.digest(Buffer.from(this.apiKey, 'ascii'));
    this.noAuth = false;
    this.cors = false;

    this.prefix = null;
    this.host = '127.0.0.1';
    this.port = 8080;
    this.ssl = false;
    this.keyFile = null;
    this.certFile = null;

    this.fromOptions(options);
  }

  /**
   * Inject properties from object.
   * @private
   * @param {Object} options
   * @returns {HTTPOptions}
   */

  fromOptions(options) {
    assert(options);
    assert(options.db);

    this.db = options.db;

    this.port = 7870;

    if (options.logger != null) {
      assert(typeof options.logger === 'object');
      this.logger = options.logger;
    }

    if (options.apiKey != null) {
      assert(typeof options.apiKey === 'string',
        'API key must be a string.');
      assert(options.apiKey.length <= 255,
        'API key must be under 256 bytes.');
      this.apiKey = options.apiKey;
      this.apiHash = sha256.digest(Buffer.from(this.apiKey, 'ascii'));
    }

    if (options.noAuth != null) {
      assert(typeof options.noAuth === 'boolean');
      this.noAuth = options.noAuth;
    }

    if (options.cors != null) {
      assert(typeof options.cors === 'boolean');
      this.cors = options.cors;
    }

    if (options.prefix != null) {
      assert(typeof options.prefix === 'string');
      this.prefix = options.prefix;
      this.keyFile = path.join(this.prefix, 'key.pem');
      this.certFile = path.join(this.prefix, 'cert.pem');
    }

    if (options.host != null) {
      assert(typeof options.host === 'string');
      this.host = options.host;
    }

    if (options.port != null) {
      assert((options.port & 0xffff) === options.port,
        'Port must be a number.');
      this.port = options.port;
    }

    if (options.ssl != null) {
      assert(typeof options.ssl === 'boolean');
      this.ssl = options.ssl;
    }

    if (options.keyFile != null) {
      assert(typeof options.keyFile === 'string');
      this.keyFile = options.keyFile;
    }

    if (options.certFile != null) {
      assert(typeof options.certFile === 'string');
      this.certFile = options.certFile;
    }

    // Allow no-auth implicitly
    // if we're listening locally.
    if (!options.apiKey) {
      if (this.host === '127.0.0.1' || this.host === '::1')
        this.noAuth = true;
    }

    return this;
  }

  /**
   * Instantiate http options from object.
   * @param {Object} options
   * @returns {HTTPOptions}
   */

  static fromOptions(options) {
    return new HTTPOptions().fromOptions(options);
  }
}

/*
 * Helpers
 */

function enforce(value, msg) {
  if (!value) {
    const err = new Error(msg);
    err.statusCode = 400;
    throw err;
  }
}

/*
 * Expose
 */

module.exports = HTTP;

