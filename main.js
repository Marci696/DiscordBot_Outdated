const version = require(__dirname + "/package.json").version;

const winston = require("winston");
const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)(),
    new (winston.transports.File)({ filename: __dirname + '/logs/log' })
  ]
});
const config = require(__dirname + '/config.json');
const strings = require(__dirname + "/strings.json");

const mysql = require('mysql');
var connection;
var language;
var suffix;
var reminderTimeouts = {};
var reminderInterval;


const fs = require('fs');
const Discord = require('discord.js');
const commands = require(__dirname + '/commands')(strings, config, logger, fs, version, reminderTimeouts);

writeHelp(commands);


var bot = new Discord.Client();
bot.options.autoReconnect= true;
// TODO Maximale Zeichen mit der Datenbank abgleichen
// TODO sicherheitschecks machen



bot.on("disconnected", function(){
  clearInterval(reminderInterval);
  for (let timeout in reminderInterval) {
    clearTimeout(reminderInterval[timeout]);
    delete reminderInterval[timeout];
  }
});

bot.on("ready", function(){
    logger.info("Bot is ready");
    handleReminders();
    reminderInterval = setInterval(handleReminders, 60*1000*1.8);
});

bot.on('serverCreated', function(server){
  bot.sendMessage(server.channels['0'], "Hey I'm Marcis Test Bot (WIP),\nIf you want to know what kind of cool stuff I'm able to do, type **'§help'**\nYou can give me a Feedback by sending an EMail to marci.bot.discord@gmail.com\nHave fun :yum:");
});

bot.on("serverDeleted", function(server){
  connection.query("DELETE FROM server_settings WHERE Server_ID = ?", [server.id], function(err){
      if(err)console.log(err);
  });
});

bot.on("channelDeleted", function(channel){
  connection.query("DELETE FROM polls WHERE Channel_ID = ?", [channel.id], function(err){
    if(err)console.log(err);
  });
});

bot.on('message', function(message){
    if(bot.user.id === message.author.id)return;
    if(message.channel.constructor.name === "TextChannel"){
      connection.query("SELECT * FROM server_settings WHERE Server_ID ='" + message.server.id + "';", function(err, rows){
          if(err)console.log(err);
          else{
              if(rows.length === 0){
                  language = "en";
                  suffix = "$";
                  connection.query("INSERT INTO server_settings (Server_ID) VALUES (?)", [message.server.id], function(err){
                      if(err)console.log(err);
                  });
              } else{
                  language = rows[0].Language;
                  suffix = rows[0].Suffix;
              }

              let permission = message.channel.permissionsOf(message.author.id).hasPermission(config.permissionRequired);
              for(let i = 0; config.admin.length > i; i++){
                  if(message.author.id === config.admin[i])permission = true;
              }

              if(message.content.indexOf(suffix) === 0){
                  let input = message.content.slice(suffix.length);
                  let pos = input.indexOf(' ');
                  let text = '';
                  if(pos >= 0) text = input.slice(pos+1);

                  // Regular Commands
                  let commandFoundFlag = false;
                  for(let commandNames in commands){
                    if(input.indexOf(commands[commandNames].name) === 0){
                        commands[commandNames].process(bot, connection, message, text, permission, language, suffix);
                        commandFoundFlag = true;
                        break;
                    }
                  }
                  // Custom Commands
                  if(!commandFoundFlag){
                      connection.query("SELECT * FROM custom_commands WHERE Server_ID = ?", [message.server.id], function(err, rows){
                        if(err)console.log(err);
                        for (var i = 0; i < rows.length; i++) {
                          if(input === rows[i].Name){
                              commandFoundFlag = true;
                              let custComMessage = rows[i].Content
                                .replace("$(user)", "<@"+ message.author.id + ">");
                              bot.sendMessage(message, custComMessage);
                              break;
                          }
                        }
                      if(!commandFoundFlag)bot.reply(message, strings[language].commandNotFound.replace("$(trigger)", suffix));
                      });
                  }
              }
          }
      });
    } else{
      console.log(message.content);
    }
});


function writeHelp(commands){
    let languageInfoList = '';
    for(let langInfo in strings){
      languageInfoList+= " '" + langInfo + "'";
    }
    let infos;
    for (let lang in strings) {
      infos = '```glsl\n';
      let counter = 1;
      let lines = 0;
      for(let names in commands){
          if(lines >= 10*counter){
            counter++;
            infos += "```";
            infos += "$;*"; // For splitting the List into multiple Pieces to avoid maximum Message-Length of 2000
            infos += "```glsl\n";
          }
          infos += "$(suffix)" + strings[lang].commands[names].name + "  ";
          infos += strings[lang].commands[names].usage + "\n";
          infos += "\t# " + strings[lang].commands[names].description + "\n";
          lines++;
      }
      infos += "```";
      let helpPath = __dirname + config.helpList.replace("$(lang)", lang);
      let wholeList = infos.replace("$(languageList)", languageInfoList);
      fs.writeFileSync(helpPath, strings[lang].listHelp.replace("$(helpList)", wholeList), {encoding: "utf8"}, function(err){
          if(err)console.log(err);
      });
    }

    logger.info("Writing HelpList has finished");
}

function handleReminders(){
  connection.query("SELECT * FROM reminders WHERE Timestamp < DATE_ADD(now(), INTERVAL 2 MINUTE)", function(err, rows){
    if(err)console.log(err);
    else{
      for (let i = 0; i < rows.length; i++) {
        if(!reminderTimeouts.hasOwnProperty(rows[i].ID)){
          let messageString;
          if(rows[i].Receiver === rows[i].Author)messageString = strings[rows[i].Language].remindMeMessage;
          else messageString = strings[rows[i].Language].remindSomeoneMessage;
          messageString = messageString.replace("$(reminder)", rows[i].Message);
          messageString = messageString.replace("$(author)", "<@!" + rows[i].Author + ">");

          let now = new Date();
          let timeToSend = rows[i].Timestamp - now.getTime();
          if(timeToSend < 0)timeToSend = 0;
          reminderTimeouts[rows[i].ID] = setTimeout(function(strings){
            bot.sendMessage(rows[i].Receiver, messageString, function(err, data){
              delete reminderTimeouts[rows[i].ID];
              connection.query("DELETE FROM reminders WHERE ID = ?", rows[i].ID);
            });
          }, timeToSend, strings);
        }
      }
    }
  });
}

function connectAll(){
  logger.info("Starting to connect");
  connection = mysql.createConnection(config.mysql);

  connection.connect(function(err){
    if(err){
      console.log("Can't Connect to MySQL", err);
      setTimeout(connectAll, 3000);
    } else{
      logger.info("Mysql connected");
      if(config.discord.token === '')bot.login(config.discord.account, config.discord.password, function(err){
          if(err){
            console.log("Can't Connect to Discord", err);
            setTimeout(connectAll, 3000);
          }
          else logger.info("Bot connected to Discord");
      });
      else bot.loginWithToken(config.discord.token, function(err){
          if(err){
            console.log("Can't Connect to Discord", err);
            setTimeout(connectAll, 3000);
          }
          else logger.info("Bot connected to Discord");
      });
    }
  });

  connection.on('error', function(err){
    bot.logout();
    console.log('Mysql error', err);
    logger.error("Mysql Disconnected");
    if(err.code === 'PROTOCOL_CONNECTION_LOST'){
      connectAll();
    } else{
      throw err;
    }
  });
}

// Starts Discord and MySQL aswell as reconnecting them if an Error occurs
connectAll();
