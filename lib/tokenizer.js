/**
 * Tokenizer for hackathonbot
 */

'use strict';

const assert = require('bsert');

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
    const pairs = str.match(/(([\w.]+)=([\w.]+))/g);

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
    for (const key of keys) {
      if (!key.match(/^<[\w.]+>$/))
        required++;
    }

    assert(this.tokens.size === required);

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
