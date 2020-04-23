/**
 * sql.js - SQL statements for virtualhackathon
 * Copyright (c) 2020, Mark Tyneway (MIT License).
 * Copyright (c) 2020, DNS.Live
 * https://github.com/virtualhackathon/hackathonbot
 */

const SQL = {};

SQL.GET_EVENT_BY_NAME = '' +
`
SELECT name, start, end, irc_uri as ircUri, link, message,
  btc_fee as btcFee, hns_fee as hnsFee, open
FROM event
WHERE name = :name
`;

SQL.CREATE_EVENT = '' +
`INSERT INTO event(name, start, end, link, message, irc_uri, open)
VALUES(:name, :start, :end, :link, :message, :ircUri, :open)`;

// TODO: remove this
SQL.UPDATE_EVENT_REGISTRATION = '' +
`
UPDATE event
SET open = :open
WHERE name = :name
`;

// Be safe by combining first
// Will a null value break this?
SQL.UPDATE_EVENT = '' +
`
UPDATE event
SET open = :open, btc_fee = :btc_fee, hns_fee = :hns_fee, start = :start,
  end = :end, link = :link, irc_uri = :irc_uri, message = :message
WHERE name = :name
`;

// name: tournament.name,
// event: tournament.event,
// link: tournament.link + '12',
// message: 'Updated message',
// percentage: '0.50'
//
// INSERT INTO tournament(name, event_id, link, message, percentage)
// VALUES (
// :name,
// (SELECT id FROM event WHERE name = :event),
// :link,
// :message,
// :percentage
// )
SQL.UPDATE_TOURNAMENT = '' +
`
UPDATE tournament
SET name = :name,
  event_id = (SELECT id FROM event WHERE name = :event),
  link = :link, message = :message, percentage = :percentage
WHERE name = :name
`;

SQL.CREATE_USER = '' +
`INSERT INTO user(nick, link, is_sponsor, server)
VALUES(:nick, :link, :is_sponsor, :server)`;

SQL.GET_USER_BY_NICK_AND_SERVER = '' +
`SELECT nick, link, is_sponsor as isSponsor, server
FROM user WHERE nick = :nick AND server = :server`;

SQL.GET_ADDRESS_BY_NICK_SERVER_EVENT = '' +
`SELECT user_id as userId, pubkey, address, proof, event_id as eventId
FROM address WHERE user_id = (
  SELECT id from user WHERE nick = :nick AND server = :server
) AND event_id = (
  SELECT id from event where name = :name
)`;

SQL.GET_ADDRESSES_BY_NICK_SERVER = '' +
`
SELECT user_id as userId, pubkey, address, proof, event_id as eventId
FROM address WHERE user_id = (
  SELECT id from user WHERE nick = :nick AND server = :server
)
`;

SQL.CREATE_ADDRESS_BY_NICK_SERVER_EVENT = '' +
`INSERT INTO address(user_id, event_id, address, pubkey, proof)
VALUES(
  (SELECT id FROM user WHERE nick = :nick AND server = :server),
  (SELECT id FROM event WHERE name = :event),
  :address, :pubkey, :proof
)`;

SQL.GET_ADDRESS_BY_USERID_EVENTID = '' +
`SELECT user_id as userId, pubkey, address, proof, event_id as eventId
FROM address
WHERE user_id = :user_id AND event_id = :event_id`;

SQL.CREATE_ADDRESS = '' +
`INSERT INTO address(user_id, pubkey, address, proof, event_id)
VALUES(:user_id, :pubkey, :address, :proof, :event_id)`;

SQL.CREATE_TOURNAMENT_BY_EVENT_NAME = '' +
`
INSERT INTO tournament(name, event_id, link, message, percentage)
VALUES (
  :name,
  (SELECT id FROM event WHERE name = :event),
  :link,
  :message,
  :percentage
)
`;

SQL.GET_TOURNAMENT_BY_NAME_EVENT = '' +
`
SELECT name, link, message, percentage FROM tournament
WHERE :name = name AND event_id = (SELECT id FROM event WHERE name = :event)
`;

SQL.GET_TOURNAMENTS_BY_EVENT_NAME = '' +
`
SELECT name, link, message, percentage FROM tournament
WHERE event_id = (SELECT id FROM event WHERE name = :event)
`;

SQL.ADD_USER_TO_EVENT_BY_NICK_SERVER = '' +
`INSERT INTO user_event(event_id, user_id)
VALUES(
  (SELECT id FROM event WHERE name = :event),
  (SELECT id FROM user WHERE nick = :nick AND server = :server)
)`;

SQL.GET_USERS_BY_EVENT_NAME = '' +
`
SELECT nick, link, is_sponsor as isSponsor, server FROM user WHERE id IN
  (SELECT user_id from user_event WHERE event_id =
    (SELECT id FROM event WHERE name = :event)
  ) AND isSponsor = false
`;

SQL.GET_USERS_BY_EVENTID = '' +
`SELECT nick, link, is_sponsor as isSponsor, server from user where id IN
  (SELECT user_id from user_event WHERE event_id = :event_id) AND isSponsor = false
`;

SQL.GET_ALL_USERS_BY_EVENT_NAME = '' +
`
SELECT nick, link, is_sponsor as isSponsor, server FROM user WHERE id IN
  (SELECT user_id from user_event WHERE event_id =
    (SELECT id FROM event WHERE name = :event)
  )
`;

SQL.GET_ALL_USERS_BY_EVENTID = '' +
`SELECT nick, link, is_sponsor as isSponsor, server from user where id IN
  (SELECT user_id from user_event WHERE event_id = :event_id)
`;

SQL.GET_EVENTS = '' +
`
SELECT name, irc_uri as ircUri, link,
  start, end, message
FROM event
`;

SQL.GET_SPONSORS_BY_EVENT_NAME = '' +
`
SELECT nick, link, is_sponsor as isSponsor, server FROM user WHERE id IN
  (SELECT user_id from user_event WHERE event_id =
    (SELECT id FROM event WHERE name = :event) AND isSponsor = true
  )
`;

SQL.GET_SPONSORS_BY_EVENTID = '' +
`SELECT nick, link, is_sponsor as isSponsor, server from user where id IN
  (SELECT user_id from user_event WHERE event_id = :event_id) AND isSponsor = true
`;

SQL.GET_ADDRESS_INFO = '' +
`
SELECT user_id AS userId, pubkey, proof, event_id as eventId
FROM address WHERE address = :address
`;

SQL.GET_USER_BY_ID = '' +
`
SELECT nick, link, is_sponsor as isSponsor, server
FROM user WHERE id = :id
`;

SQL.GET_EVENT_BY_ID = '' +
`
SELECT name, start, end, link, message, irc_uri as ircUri
FROM event WHERE id = :id
`;

SQL.GET_EVENT_OPEN = '' +
`SELECT open FROM event WHERE name = :name`;

SQL.SET_EVENT_OPEN = '' +
`
UPDATE event
SET open = :open
WHERE name = :name
`;

SQL.CREATE_PAYMENT = '' +
`
INSERT INTO payment(user_event_id, type, txid, output_index)
VALUES(
  (SELECT id FROM user_event
    WHERE
      user_id = (SELECT id FROM user WHERE nick = :nick AND server = :server)
    AND
      event_id = (SELECT id FROM event WHERE name = :event)
  ),
  :type,
  :txid,
  :output_index
)
`;

SQL.GET_PAYMENTS_BY_NICK_SERVER_EVENT = '' +
`
SELECT type, txid, output_index as outputIndex FROM payment
WHERE user_event_id = (
  SELECT id FROM user_event WHERE
    user_id = (SELECT id FROM user WHERE nick = :nick AND server = :server)
  AND
    event_id = (SELECT id FROM event WHERE name = :event)
)
`;

SQL.GET_USER_EVENT_ID_BY_NICK_SERVER_EVENT_ID = '' +
`
SELECT id FROM user_event WHERE user_id = (
  SELECT id FROM user WHERE nick = :nick AND server = :server
) AND event_id = (
  SELECT id FROM event WHERE name = :event
)
`;

SQL.GET_USER_ID_BY_NICK_AND_SERVER = '' +
`SELECT id FROM user WHERE nick = :nick AND server = :server`;

SQL.GET_EVENT_ID_BY_NAME = '' +
`SELECT id FROM event WHERE name = :event`;

SQL.GET_USER_EVENT_ID_BY_USER_ID_EVENT_ID = '' +
`
SELECT id FROM user_event WHERE user_id = :user_id AND event_id = :event_id
`;

// need to also get the user ids...
SQL.GET_PAYMENTS_BY_EVENT = '' +
`
SELECT p.user_event_id, p.type, p.txid, p.output_index AS outputIndex FROM payment as p
WHERE user_event_id IN (
  SELECT id FROM user_event WHERE event_id =
    (SELECT id FROM event WHERE name = :event)
)
`;

// Create Table Statements
SQL.CREATE_EVENT_TABLE = '' +
`
CREATE TABLE event(
  id integer PRIMARY KEY AUTOINCREMENT,
  name varchar(64) NOT NULL UNIQUE,
  start date,
  end date,
  open boolean,
  link varchar(128),
  irc_uri varchar(128),
  message varchar(256),
  btc_fee integer,
  hns_fee integer
)
`;

SQL.CREATE_USER_TABLE = '' +
`
CREATE TABLE user(
  id integer PRIMARY KEY AUTOINCREMENT,
  nick varchar(64) NOT NULL,
  link varchar(128),
  is_sponsor boolean,
  server varchar(128) NOT NULL
)
`;

SQL.CREATE_ADDRESS_TABLE = '' +
`
CREATE TABLE address(
  id integer PRIMARY KEY AUTOINCREMENT,
  user_id integer NOT NULL,
  pubkey varchar(64),
  address varchar(128) NOT NULL UNIQUE,
  proof varchar(128),
  event_id integer NOT NULL,
  FOREIGN KEY(user_id) REFERENCES user(id),
  FOREIGN KEY(event_id) REFERENCES event(id)
)
`;

SQL.CREATE_USER_EVENT_TABLE = '' +
`
CREATE TABLE user_event(
  id integer PRIMARY KEY AUTOINCREMENT,
  event_id integer NOT NULL,
  user_id integer NOT NULL,
  btc_address varchar(128),
  hns_address varchar(128),
  FOREIGN KEY(event_id) REFERENCES event(id),
  FOREIGN KEY(user_id) REFERENCES user(id)
)
`;

SQL.CREATE_PAYMENT_TABLE = '' +
`
CREATE TABLE payment(
  id integer PRIMARY KEY AUTOINCREMENT,
  user_event_id integer NOT NULL,
  type varchar(32) NOT NULL,
  txid varchar(64) NOT NULL,
  output_index integer,
  FOREIGN KEY(user_event_id) REFERENCES user_event(id)
)
`;

SQL.CREATE_TOURNAMET_TABLE = '' +
`
CREATE TABLE tournament(
  id integer PRIMARY KEY AUTOINCREMENT,
  name varchar(64) NOT NULL UNIQUE,
  event_id integer NOT NULL,
  link varchar(128),
  message varchar(256),
  percentage varchar(16),
  FOREIGN KEY(event_id) REFERENCES event(id)
)
`;

module.exports = SQL;
