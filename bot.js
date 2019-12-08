/*
** Virtual Hackathon Bot
** Copyright (c) 2019 SEED
*/
const irc = require('irc');
const fs = require('fs');

var client = new irc.Client('irc.freenode.net', 'vhackbot', {
  userName: "vhackbot",
  realName: "Virtual Hackathon Bot",
  channels: ['#vhackthon'],
  //secure: true,
  //sasl: true,
  //password: password
});


client.addListener('pm',function(sender,msg) {
  var words=msg.split(" ");
  var input=msg.substr(words[0].length+1);

  if(words.length>0) {
    switch(words[0].toUpperCase()) {
      case "HELP":
        client.notice(sender,"******** "+client.nick+" HELP ********");
        if(input.length>0) {
          input=input.replace(".","").replace("/","").replace(" ","/").toUpperCase();

          if(fs.existsSync(process.cwd()+"/help/"+input)) {
            if(fs.lstatSync(process.cwd()+"/help/"+input).isDirectory()) {
              input+="/HELP"
            }
            arrayToClientNotice(sender,fileToStringArray(process.cwd()+"/help/"+input));
          }
          else {
            arrayToClientNotice(sender,["Sorry, but "+input.replace("\/"," ")+" does not exist in our documentation.",
                                "Are you sure you typed it correctly?"]);
          }
        }
        else
          arrayToClientNotice(sender,fileToStringArray(process.cwd()+"/help/HELP"));
        client.notice(sender,"******** END HELP ********");
        break;
      case "IDENTIFY":
      case "VERIFY":
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

