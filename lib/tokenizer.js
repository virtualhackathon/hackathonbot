/**
 * tokenizer.js - Tokenizer for hackathonbot
 * Copyright (c) 2020, Mark Tyneway
 * https://github.com/virtualhackathon/hackathonbot
 */

'use strict';

const assert = require('bsert');

/**
 * The tokenizer is useful for parsing incoming
 * strings into objects. It is combined with a schema
 * from schemas.js to allow for new commands to be
 * defined easily. The `get` command is used to get
 * parsed tokens.
 *
 * It can be created fromPairs, meaning that the
 * key/value pairs are defined by the incoming string.
 * This means that the incoming string must include
 * key=value delimited by spaces. Values not matching
 * this will be skipped.
 */

class Tokenizer {
  constructor() {
    this.tokens = new Map();
  }

  get(key, fallback) {
    const value = this.tokens.get(key);

    if (value == null)
      return fallback;

    return value;
  }

  has(key) {
    return this.tokens.has(key);
  }

  fromPairs(str) {
    assert(typeof str === 'string');
    const pairs = str.match(/(([\w.]+)=([\w.:/\-_]+))/g);

    pairs.push(...alternateDelimiter(str, '"'));
    pairs.push(...alternateDelimiter(str, '\''));

    for (const pair of pairs) {
      const [key, value] = pair.split('=');
      this.tokens.set(key, value);
    }

    return this;
  }

  fromSchema(str, schema) {
    const words = str.split(' ').filter(w => w !== '');
    const keys = schema.split(' ');

    let keyIdx = 0;
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (word[0] === '"') {
        let j = i + 1;
        let next = words[j];
        while (next[next.length - 1] !== '"') {
          next = word[j++];
          assert(j < words.length);
        }
        const token = words.slice(i, j + 1).join(' ');
        let key = keys[keyIdx++];
        if (key.match(/^<\w+>$/)) {
          key = key.replace('<', '');
          key = key.replace('>', '');
        }

        this.tokens.set(key, token);
      } else if (word[0] !== '"' && word[word.length - 1] !== '"') {
        let key = keys[keyIdx++];
        if (key.match(/^<\w+>$/)) {
          key = key.replace('<', '');
          key = key.replace('>', '');
        }

        this.tokens.set(key, word);
      }
    }

    let required = 0;
    let optional = 0;
    for (const key of keys) {
      if (!key.match(/^<[\w.]+>$/))
        required++;
      else
        optional++
    }

    // TODO: good assertion here on number of tokens

    return this;
  }

  static fromPairs(str) {
    return new this().fromPairs(str);
  }

  static fromSchema(str, schema) {
    return new this().fromSchema(str, schema);
  }
}

function countCharacter(str, target) {
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === target)
      count++;
  }

  return count;
}

function alternateDelimiter(str, char) {
  const pairs = [];

  if (str.includes(char)) {
    const count = countCharacter(str, char);
    assert(count % 2 === 0);

    let offset = 0;
    for (let i = 0; i < count; i+=2) {

      const start = str.indexOf(char, offset);
      assert(str[start - 1] === '=');

      const sub = str.slice(0, start - 1);
      const space = sub.lastIndexOf(' ');
      const key = sub.slice(space + 1);

      offset = start + 1;
      const end = str.indexOf(char, offset);
      offset = end + 1;

      const value = str.slice(start, end + 1);

      pairs.push(`${key}=${value}`)
    }
  }

  return pairs;
}

module.exports = Tokenizer;
