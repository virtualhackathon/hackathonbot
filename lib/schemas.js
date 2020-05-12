/**
 * schemas.js - tokenizer schemas for hackathonbot
 * Copyright (c) 2020, Mark Tyneway
 * https://github.com/virtualhackathon/hackathonbot
 */

// These schemas are used by the tokenizer.
// A space delimited string will be converted into an object
// where the keys are the names below and the values are the
// values in the incoming string.
//
// This is useful for parsing commands that take multiple
// arguments and being able to easily parse it.

const schemas = {};

schemas.NEWUSER = '<link>';
schemas.EVENT = 'name';
schemas.NEWEVENT = 'name start end ircUri <open>';
schemas.USER = '<name>';

module.exports = schemas;
