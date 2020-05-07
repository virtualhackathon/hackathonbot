/*!
 * server.js - admin http server for virtualhackathon
 * Copyright (c) 2017-2018, Christopher Jeffrey (MIT License).
 * Copyright (c) 2020, Mark Tyneway (MIT License).
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

class AdminHTTP extends Server {
  /**
   * Create an http server.
   * @constructor
   * @param {Object} options
   */

  constructor(options) {
    super(new HTTPOptions(options));

    this.logger = this.options.logger.context('hackathond-admin-http');
    this.db = this.options.db;

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

      this.logger.debug('Request for method=%s path=%s (%s).',
        req.method, req.pathname, req.socket.remoteAddress);
    });

    this.on('listening', (address) => {
      this.logger.info('Admin HTTP server listening on %s (port=%d).',
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
      res.json(200, {});
    });

    // Create an event
    this.post('/event', async (req, res) => {
      const valid = Validator.fromRequest(req);

      const name = valid.str('name');
      const start = valid.uint('start');
      const end = valid.uint('end');
      const ircUri = valid.str('ircUri');
      const message = valid.str('message', '');
      const open = valid.bool('open', true);

      enforce(name, 'Must pass name.');
      enforce(typeof start === 'number', 'Must pass start.');
      enforce(typeof end === 'number', 'Must pass end.');
      enforce(ircUri, 'Must pass irc uri.');

      try {
        await this.db.createEvent({
          name,
          start,
          end,
          ircUri,
          open
        });

      } catch (e) {
        this.logger.error(e.message);
        res.json(400);
        return;
      }

      res.json(200, {
        name,
        start,
        end,
        ircUri,
        message
      })
    });

    this.put('/event', async (req, res) => {
      const valid = Validator.fromRequest(req);

      const name = valid.str('name');
      const start = valid.uint('start');
      const end = valid.uint('end');
      const ircUri = valid.str('ircUri');
      const message = valid.str('message');
      const open = valid.bool('open');
      const btcFee = valid.uint('btcFee', 0);
      const hnsFee = valid.uint('hnsFee', 0);

      try {
        await this.db.updateEvent({
          name,
          start,
          end,
          ircUri,
          message,
          open,
          btcFee,
          hnsFee,
        });
      } catch (e) {
        this.logger.error(e);
        res.json(400);
        return;
      }

      res.json(200, {
        name,
        start,
        end,
        ircUri,
        message,
        open,
        btcFee,
        hnsFee
      });
    });

    this.put('/event/tournament', async (req, res) => {
      const valid = Validator.fromRequest(req);

      // The fallback value must be undefined so that
      // null values do not end up in the database.
      const name = valid.str('name', undefined);
      const event = valid.str('event', undefined);
      const link = valid.str('link', undefined);
      const percentage = valid.str('percentage', undefined);
      const message = valid.str('message', undefined);

      enforce(name);

      try {
        await this.db.updateTournament({
          name,
          event,
          link,
          message,
          percentage
        });
      } catch (e) {
        this.logger.error(e);
        res.json(400);
        return
      }

      res.json(200, {
        name,
        event,
        link,
        message,
        percentage
      });
    });

    this.post('/event/tournament', async (req, res) => {
      const valid = Validator.fromRequest(req);

      const name = valid.str('name');
      const event = valid.str('event');
      const link = valid.str('link');
      const percentage = valid.str('percentage');
      const message = valid.str('message');

      try {
        await this.db.createTournament({
          name,
          event,
          link,
          percentage,
          message
        });
      } catch (e) {
        this.logger.error(e);
        res.json(400);
        return;
      }

      res.json(200, {
        name,
        link,
        message,
        percentage
      });
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

    this.port = 7871

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

module.exports = AdminHTTP;
