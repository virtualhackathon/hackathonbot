/**
 * utils.js - utils for hackathonbot
 * Copyright (c) 2020, Mark Tyneway
 * https://github.com/virtualhackathon/hackathonbot
 */

const BTCAddress = require('./btcAddress');
const HNSAddress = require('./hnsAddress');

function parseMsgArgs(msg) {
  if (msg.indexOf('.') !== 0)
    return null;

  const index = msg.indexOf(' ');

  if (index === -1)
    return '';

  return msg.slice(index + 1);
}

function isBTCAddress(address) {
  try {
    BTCAddress.fromString(address);
    return true;
  } catch (e) {
    return false;
  }
}

function isHNSAddress(address) {
  try {
    HNSAddress.fromString(address);
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = {
  parseMsgArgs,
  isBTCAddress,
  isHNSAddress
}
