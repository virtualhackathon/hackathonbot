const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

if(!fs.existsSync('./bot.db')) {
  let db = new sqlite3.Database('./bot.db', function(err) {
    if (err) {
      console.error(err.message);
    }
    else {
      db.run(`CREATE TABLE HACKERS(
                HACKER INTEGER PRIMARY KEY AUTOINCREMENT,
                NAME TEXT,
                NICKNAME TEXT,
                ONLINE INTEGER DEFAULT 0,
                LASTSEEN CHAR(12),
                GUILD INTEGER
              );`);
      db.run(`CREATE TABLE HACKATHONS(
                HACKATHON INTEGER PRIMARY KEY AUTOINCREMENT,
                HACKER INTEGER,
                HACKATHON_NAME TEXT,
                STARTTIME CHAR(12),
                ENDTIME CHAR(12),
                REGISTRATION_LENGTH INTEGER,
                REGISTRATION_FEE REAL,
                REGISTRATION_JUDGE_TYPE INTEGER,
                REGISTRATION_JUDGE_FEE REAL,
                RAKE REAL
              );`);
      db.run(`CREATE TABLE JUDGES(
                JUDGE INTEGER PRIMARY KEY AUTOINCREMENT,
                HACKER INTEGER,
                HACKATHON INTEGER
              );`);
      db.run(`CREATE TABLE GUILDS(
                GUILD INTEGER PRIMARY KEY AUTOINCREMENT,
                GUILD_NAME TEXT
              );`);
      db.run(`CREATE TABLE TOURNAMENTS(
                TOURNAMENT INTEGER PRIMARY KEY AUTOINCREMENT,
                HACKATHON INTEGER,
                TOURNAMENT_NAME TEXT,
                TOURNAMENT_DESC TEXT
              );`);
      db.run(`CREATE TABLE PRIZES(
                PRIZE INTEGER PRIMARY KEY AUTOINCREMENT,
                TOURNAMENT INTEGER,
                PRIZE_AMOUNT,
                HACKER INTEGER
              );`);
      db.run(`CREATE TABLE CHALLENGES(
                CHALLENGE INTEGER PRIMARY KEY AUTOINCREMENT,
                NICKNAME TEXT,
                NAME TEXT,
                MESSAGE TEXT,
                ADDRESS TEXT
                REQUESTAT CHAR(12)
              );`);
      console.log("Completed creation of bot.db");
    }
  });
}
else {
  console.log("bot.db file already exists.");
}
