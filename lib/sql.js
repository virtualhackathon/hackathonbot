/**
 *
 */

const SQL = {};

SQL.REGISTER_NICK = '';

SQL.GET_EVENT_BY_NAME = '' +
`SELECT * FROM event WHERE name = :name`;

SQL.CREATE_EVENT = '' +
`INSERT INTO event(name, start, end, link, message)
VALUES(:name, :start, :end, :link, :message)`;

SQL.CREATE_USER = '' +
`INSERT INTO user(nick, link, is_sponsor, server)
VALUES(:nick, :link, :is_sponsor, :server)`;

SQL.GET_USER_BY_NICK_AND_SERVER = '' +
`SELECT id, nick, link, is_sponsor as isSponsor, server
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

SQL.GET_ALL_USERS_BY_EVENT_NAME = '' +
`SELECT nick, link, is_sponsor as isSponsor, server from user where id IN
  (SELECT user_id from user_event WHERE event_id = :event_id)
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


// TODO: figure out this query...
SQL.GET_USER_ADDRESSES_BY_EVENT = '' +
`
(SELECT address, pubkey, proof FROM address where user_id IN (
  SELECT user_id from user_event where event_id = (
    SELECT id from events where name = :name
  )
))`;
/*
UNION
(SELECT nick, link, is_sponsor as isSponser, server FROM  user where user_id IN (
  SELECT user_id from user_event where event_id = (
    SELECT id from events where name = :name
  )
))
`;
*/

// Create Table Statements
SQL.CREATE_EVENT_TABLE = '' +
`CREATE TABLE event(
   id integer PRIMARY KEY AUTOINCREMENT,
   name varchar(64) NOT NULL,
   start date,
   end date,
   link varchar(128),
   message varchar(128)
)`;

SQL.CREATE_USER_TABLE = '' +
`CREATE TABLE user(
   id integer PRIMARY KEY AUTOINCREMENT,
   nick varchar(64) NOT NULL,
   link varchar(128),
   is_sponsor boolean,
   server varchar(128) NOT NULL
)`;

SQL.CREATE_ADDRESS_TABLE = '' +
`CREATE TABLE address(
   id integer PRIMARY KEY AUTOINCREMENT,
   user_id integer NOT NULL,
   pubkey varchar(64),
   address varchar(128) NOT NULL,
   proof varchar(128),
   event_id integer NOT NULL,
   FOREIGN KEY(user_id) REFERENCES user(id),
   FOREIGN KEY(event_id) REFERENCES event(id)
)`;

SQL.CREATE_USER_EVENT_TABLE = '' +
`CREATE TABLE user_event(
  id integer PRIMARY KEY AUTOINCREMENT,
  event_id integer NOT NULL,
  user_id integer NOT NULL,
  FOREIGN KEY(event_id) REFERENCES event(id),
  FOREIGN KEY(user_id) REFERENCES user(id)
)`;

module.exports = SQL;
