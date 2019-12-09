/*
** Virtual Hackathon Bot
** Copyright (c) 2019 SEED
*/
const irc = require('irc');
const fs = require('fs');
const {NodeClient} = require('hs-client');
const {Network} = require('hsd');
const network = Network.get('regtest');
const sqlite3 = require('sqlite3').verbose();

const clientOptions = {
  network: network.type,
  port: network.rpcPort,
  apiKey: 'api-key'
}

const nodeclient = new NodeClient(clientOptions);

var client = new irc.Client('irc.freenode.net', 'vhackbot', {
  userName: "vhackbot",
  realName: "Virtual Hackathon Bot",
  channels: ['#vhackthon'],
  //secure: true,
  //sasl: true,
  //password: password
});
/*
TODO:
- auto clear CHALLENGES db with setinterval
- check if the sqlite and hs-client code works
- interval to check when to start hackathons
- check if user is offline and update lastseeen
*/

if(!fs.existsSync('./bot.db')) {
  console.error("DB not found.");
  process.exit();
}
let db = new sqlite3.Database('./bot.db');

client.addListener('pm',async function(sender,msg) {
  var words=msg.split(" ");
  var input=msg.substr(words[0].length+1);

  if(words.length>0) {
    switch(words[0].toUpperCase()) {
      case "HELP":
        client.notice(sender,"******** "+client.nick+" HELP ********");
        if(input.length>0) {
          input=input.replace(".","").replace("/","").replace(" ","/").toUpperCase();

          if(fs.existsSync(process.cwd()+"/help/"+input)) {
            if(fs.lstatSync(process.cwd()+"/help/"+input).isDirectory())
              input+="/HELP"
            arrayToClientNotice(sender,fileToStringArray(process.cwd()+"/help/"+input));
          }
          else
            arrayToClientNotice(sender,["Sorry, but "+input.replace("\/"," ")+" does not exist in our documentation.",
                                "Are you sure you typed it correctly?"]);
        }
        else
          arrayToClientNotice(sender,fileToStringArray(process.cwd()+"/help/HELP"));
        client.notice(sender,"******** END HELP ********");
        break;
      case "IDENTIFY":
        /* check if nameinfo shows an owner */
        let ownerHash, ownerIndex, address;
        await (async function() {
          const result = await nodeclient.execute('getnameinfo', [ input ]);
          ownerHash=result.owner.hash;
          ownerIndex=result.owner.index;
        })();
        if(ownerHash=="")
          client.notice(sender, "The name, "+input+", was not found on the blockchain.");
        else {
          await (async function() {
            const result = await nodeclient.getCoin(ownerHash, ownerIndex);
            address=result.address;
          })();
          /* Create and save a CHALLENGE and the owner address in DB */
          var challenge=randomString(64);
          db.run(`INSERT INTO CHALLENGES (NICKNAME, NAME, MESSAGE, ADDRESS, REQUEST_AT) VALUES(?, ?, ?, ?, ?);`,
                  [sender, input, challenge, address, Math.floor(Date.now() / 1000)]);

          /* Send CHALLENGE message, ask user to signmessagewithprivkey */
          client.notice(sender, "Please sign, with "+address+", the following challenge: "+challenge);
        }
        break;
      case "VERIFY":
        /* Check the CHALLENGE message and owner address in db against the submitted message */
        db.get(`SELECT * FROM CHALLENGES WHERE NICKNAME = ? ORDER BY REQUEST_AT DESC`,[sender],function(err,row) {
          if(err)
            client.notice(sender, "The challenge was not found.  Please use IDENTIFY first.");
          else {
            let verified=false;
            await (async () => {
              const result = await nodeclient.execute('verifymessage', [ row.ADDRESS, input, row.MESSAGE ]);
              verified=result;
            })();
            if(verified) {
              db.get(`SELECT * FROM HACKERS WHERE NICKNAME = ?`,[sender],function(verr,vrow) {
                if(verr)
                  /* Create an entry in db */
                  db.run(`INSERT INTO HACKERS (NAME, NICKNAME, ONLINE) VALUES(?,?,?);`,
                          [row.NAME, sender, 1]);
                else
                  /* Just update online status */
                  db.run(`UPDATE HACKERS SET ONLINE = 1 WHERE NAME = ?`,
                          [row.NAME]);
                client.notice(sender, "You are now verified as the owner of "+row.NAME);
              });
            }
            else
              client.notice(sender, "The challenge response was not signed correctly.");
          }
        });
        break;
      case "HACKATHON":
        words=input.split(" ");
        input=input.substr(words[0].length+1);
        if(words.length>0) {
          switch(words[0].toUpperCase()) {
            case "JOIN":
            case "GJOIN":
            case "LIST":
            case "FIND":
            case "CREATE":
/*              if(input.length>0) {
                if(input.indexOf(' ')==-1||) {
                createHackathon(sender,input,
                }
                el
              }
*/              break;
            case "SET":
              break;
            default:
              break;
          }
        }
        break;
      default:
        break;
    }
  }
});
function fileToString(filepath) {
  return String.fromCharCode.apply(null, new Uint16Array(fs.readFileSync(filepath)));
}
function fileToStringArray(filepath) {
  return fileToString(filepath).split("\n");
}
function arrayToClientNotice(target,payload) {
  payload.forEach(function(line) {
    client.notice(target,line);
  });
}
function randomString(size,word) {
  const letter="abcdefghijklmnopqrstuvwxyz0123456789";
  if(word==undefined || word.length!=size)
    return randomString(size,(word==undefined?"":word)+letter.substr((Math.floor(Math.random() * Math.floor(36))),1));
  return word;
}

