/**
 *
 */

'use strict';

const EventEmitter = require('events');
const Path = require('path');
const os = require('os');
const assert = require('bsert');
const Logger = require('blgr');
const path = require('path')
const sqlite3 = require('sqlite3');

class HackathonDB extends EventEmitter {
  constructor(options) {
    super();

    this.options = new HackathonDBOptions(options);
    this.logger = this.options.logger.context('hackathondb');

    // TODO: need to await this...
    this.db = new sqlite3.Database(this.options.path);

    this.bind();
  }

  bind() {
    this.db.on('error', (error) => {
      this.logger.error(error);
    });
  }

  async open() {
    await this.createTable();
  }

  async close() {
    this.db.close();
  }

  async createTable() {
    return new Promise((resolve, reject) => {
      this.db.exec('CREATE TABLE tbl (col TEXT)', (err, res) => {
        console.log(res);
        if (err)
          reject(err);
        resolve(res);
      });
    });
  }
}

class HackathonDBOptions {
  constructor(options) {

    this.logger = Logger.global;
    this.memory = false;
    this.filename = 'hackathon.db';
    this.prefix = path.join(os.homedir(), '.irchackathon');
    this.path = null;

    if (options)
      this.fromOptions(options);
  }

  fromOptions(options) {
    if (!options.memory) {
      assert(typeof options.prefix === 'string');
      this.prefix = options.prefix;
    }

    if (typeof options.filename === 'string')
      this.filename = options.filename;

    this.path = Path.join(this.prefix, this.filename);

    if (typeof options.path === 'string')
      this.path = options.path;

    if (typeof options.logger === 'object')
      this.logger = options.logger;

    return this;
  }
}

module.exports = HackathonDB;
