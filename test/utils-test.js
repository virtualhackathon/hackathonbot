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

describe('Address Validation', function() {
  it('should check is btc address', () => {
    const tests = [
      // mainnet
      // p2pkh
      ['1KuYrkQChnoa8g7GdNhRXRbHQFYk9VjhXv', true],
      // nested
      ['3GXoxEVkZ4sbdZZPYHBEpqs8UiUVXPrEiU', true],
      // p2wpkh
      ['bc1qea38e4zr3yvu3cvfrrshjmrwlrtyrwkudpllv2', true],
      // p2sh
      ['32FX8ajKsaYyz3UcWFpWDCcGnVTn4BLrYX', true],
      // p2wsh
      ['bc1q7rpedynhtnrm7p5aj6g6vf5xqgswvuy0z8ysglmskpps7q8uc23qwhuyew', true],

      // testnet
      // p2pkh
      ['mmdRUNhYt5VagG4r6caRqxi4PELWxsEwKK', true],
      // nested
      ['2N8Ph91auewextjsMYqcZsDSN7A3YJ1Xcxp', true],
      // p2wpkh
      ['tb1qgvy7llkq852vf4uj7evz837dpzhajcjf9l4dfk', true],
      // p2sh
      ['2NCNF1pehC1tFeP1XW6USr7N6km5fBwAxpb', true],
      // p2wsh
      ['tb1qafulxs5mr6qn3ykw83mmu7x8afwnvcqksxsak5sk4c7s4an5ezcsmw7wg3', true],

      // regtest
      // p2pkh
      ['mpUBPo7w7Qxd6XztXYFzD7KAfiZzjGjqAR', true],
      // nested
      ['2MuKGqJYHHvyei5XXvNKsGEz8m3tG6FG85w', true],
      // p2wpkh
      ['bcrt1qvgedry7l8sywflmsys42z0zvajq0xrgphuucvc', true],
      // p2sh
      ['2MxgTGx3sRgRVcHJk4qe6djPovNPvLrnkdY', true],
      // p2wsh
      ['bcrt1qflhtg4lhehy4p5g4xz8my2hhjyrvds8lektv3dvsw5fzujq3wnhs0zu48u', true],

      // simnet
      // p2pkh
      ['SUKdi1cqks9SGu2SftbhfCTWRcNkvSM3kr', true],
      // nested
      ['rk59ipSM8L282yax7JeiQACXUAH5NTLvFf', true],
      // p2wpkh
      ['sb1qf5t7j445r58yvma9zt3q8wc584ue0rznj4nsxu', true],
      // p2sh
      ['rcKEANmVkFDeWY9eEPignuBiMULFhXeAw5', true],
      // p2wsh
      ['sb1q2n732a72ehe8dutednxkn7kr60l70clk8pdjlfl907fer94wewqsmcplx2', true],

      // invalid
      ['foobar', false]
    ];

    for (const test of tests) {
      const [input, expect] = test;

      const result = utils.isBTCAddress(input);
      assert.equal(result, expect);
    }
  });

  it('should check is hns address', () => {
    const tests = [
      // mainnet
      // p2wpkh
      ['hs1q05chdg4fq0uqe99m78detxzxtra7kz3t2hfewz', true],
      // p2wsh
      ['hs1qu5qfme0xxjjx8asfmafgrs9s9tqjfxldqg2xy3r2h74qkg9hnczquxc56t', true],

      // testnet
      // p2wpkh
      ['ts1q7v6j833828wm0zdw0688pnlj7vkxysyjfaszrt', true],
      // p2wsh
      ['ts1qa4j5w4wt4ul7ac7hl0xmx36z3juj8slycrr68njxa3wv34z6ecdqhhaq4m', true],

      // regtest
      // p2wpkh
      ['rs1qnky7gctxatnsncjuyn3kh7ppf9gam2fjc02glc', true],
      // p2wsh
      ['rs1qwyhvmdegh74jp675avwkj2dg5c6mv7drn6dvehqd9rzl5lca9vxs2jkv4y', true],

      // simnet
      // p2wpkh
      ['ss1qzhkhchw9hyc28e5w5ak2chjehkdsnr9adj4gnl', true],
      // p2wsh
      ['ss1q4ctq8pepkcn47pakata6dv0x5x3zxxs2gnlha8060lj4apnauf3sp5m2gu', true],

      ['foobar', false]
    ];

    for (const test of tests) {
      const [input, expect] = test;

      const result = utils.isHNSAddress(input);
      assert.equal(result, expect);
    }
  });
});
