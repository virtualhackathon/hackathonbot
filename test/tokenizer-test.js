/**
 *
 */

'use strict';

const assert = require('bsert');
const Tokenizer = require('../lib/tokenizer');

describe('Tokenizer', function() {
  it('should tokenize from pairs', () => {
    const tests = [
      ['key=value key2=value2', {key: 'value', key2: 'value2'}],
      ['key=value', {key: 'value'}],
      ['key=value=foo=test', {key: 'value', foo: 'test'}],
      ['key=value=foo', {key: 'value'}],
      [
        'key=value key2="this is a test"',
        {key: 'value', key2: '"this is a test"'}
      ],
      ['key=0.001', {key: '0.001'}]
    ];

    for (const test of tests) {
      const [input, expect] = test;
      const tokenizer = Tokenizer.fromPairs(input);

      for (const [key, value] of Object.entries(expect)) {
        assert(tokenizer.has(key));
        assert.equal(tokenizer.get(key), value);
      }
    }
  });

  it('should tokenize from pairs (failures)', () => {
    const tests = [
      'key= "foo"',
      'key="foo""',
    ];

    for (const test of tests) {
      let error = false;
      try {
        const tokenizer = Tokenizer.fromPairs(test);
      } catch(e) {
        error = true;
      }

      assert.equal(error, true);
    }
  });

  it('should tokenize from schema', () => {
    const tests = [
      [
        'foo bar baz',
        'key1 key2 key3',
        {key1: 'foo', key2: 'bar', key3: 'baz'}
      ],
      [
        'foo "bar ten" baz',
        'key1 key2 key3',
        {key1: 'foo', key2: '"bar ten"', key3: 'baz'}
      ]
    ];

    for (const test of tests) {
      const [str, schema, expect] = test;
      const tokenizer = Tokenizer.fromSchema(str, schema);

      for (const [key, value] of Object.entries(expect)) {
        assert(tokenizer.has(key));
        assert.equal(tokenizer.get(key), value);
      }
    }
  });

  it('should tokenize from schema (failures)', () => {
    const tests = [
      // uneven amount of keys with schema
      [
        'foo bar baz',
        'key1 key2'
      ],
      // no ending "
      [
        'foo "bars',
        'key1 key2'
      ]
    ];

    for (const test of tests) {
      const [str, schema, expect] = test;

      let error = false
      try {
        const tokenizer = Tokenizer.fromSchema(str, schema);
      } catch (e) {
        error = true;
      }

      assert.equal(error, true);
    }
  });
});
