/**
 *
 */

'use strict';

const Client = require('../lib/client');

const server = '127.0.0.1';
const nick = 'testbot';
let client;

describe('Client', function() {
  // TODO: temp
  this.timeout(10000000);

  it('should', async () => {
    client = new Client('localhost', nick, {
      userName: 'testbot',
      nick: nick,
      localAddress: server,
      debug: false,
      channels: ['#foobartest']
    });

    client.addListener('error', (err) => {
      console.log('Error!')
      console.log(err);
    });

    client.addListener('registered', () => {
      console.log('registered!');
    });

    client.addListener('message#foobartest', (from, message) => {
      console.log(`from: ${from}`);
      console.log(`message: ${message}`);
      client.say('#foobartest', `right back at you ${from}, ${message}`);
    });

    await sleep(100000);
  });
});


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
