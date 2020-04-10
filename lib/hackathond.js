/**
 *
 */

const fs = require('bfile');
const Logger = require('blgr');
const Config = require('bcfg');
const assert = require('bsert');
const HTTP = require('./http');
const AdminHTTP = require('./adminhttp');
const HackathonDB = require('./hackathondb');

class Hackathond {
  constructor(options) {
    this.config = new Config('hackathond');
    this.config.inject(options);
    this.config.load(options);

    this._init();

    assert(this.logger);

    this.db = new HackathonDB({
      logger: this.logger,
      prefix: this.config.getPrefix()
    });

    this.http = new HTTP({
      db: this.db,
      logger: this.logger,
      ssl: this.config.bool('ssl'),
      keyFile: this.config.path('ssl-key'),
      certFile: this.config.path('ssl-cert'),
      host: this.config.str('http-host'),
      port: this.config.uint('http-port'),
      apiKey: this.config.str('api-key'),
      noAuth: this.config.bool('no-auth'),
      cors: this.config.bool('cors')
    });

    this.adminHttp = new AdminHTTP({
      db: this.db,
      logger: this.logger,
      ssl: this.config.bool('admin-ssl'),
      keyFile: this.config.path('admin-ssl-key'),
      certFile: this.config.path('admin-ssl-cert'),
      host: this.config.str('admin-http-host'),
      port: this.config.uint('admin-http-port'),
      apiKey: this.config.str('admin-api-key'),
      noAuth: this.config.bool('admin-no-auth'),
      cors: this.config.bool('admin-cors')
    });
  }

  _init() {
    const config = this.config;

    let logger = new Logger();

    if (config.has('logger'))
      logger = config.obj('logger');

    logger.set({
      filename: config.location('hackathond.log'),
      level: config.str('log-level'),
      console: config.bool('log-console'),
      shrink: config.bool('log-shrink')
    });

    this.logger = logger.context('hackathond');
  }

  async ensure() {
    if (fs.unsupported)
      return undefined;

    if (this.memory)
      return undefined;

    return fs.mkdirp(this.config.prefix);
  }

  async open() {
    await this.logger.open();
    await this.db.open();
    await this.http.open();
    await this.adminHttp.open();
  }

  async close() {
    this.logger.info('Closing hackathond');
    await this.adminHttp.close();
    await this.http.close();
    await this.db.close();
    await this.logger.close();
  }
}

module.exports = Hackathond;
