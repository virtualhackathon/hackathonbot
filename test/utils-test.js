/**
 * Utils tests for hackathonbot
 */

'use strict'

const utils = require('../lib/utils')
const assert = require('bsert');

describe('Parse Message Args', function() {
  it('should message to args', () => {
    const tests = [
      ['.newevent foo bar', 'foo bar'],
      ['newevent foo bar', null],
      ['.events bar bloo baz', 'bar bloo baz'],
      ['.events', '']
    ];

    for (const test of tests) {
      const [input, expect] = test;

      const tokens = utils.parseMsgArgs(input);
      assert.deepEqual(tokens, expect);
    }
  });
});
