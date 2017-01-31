const unirest = require("unirest");
const querystring = require("querystring");
const parseString = require("xml2js").parseString;
const replaceAll = require("replaceall");
const Entities = require("html-entities").AllHtmlEntities;
const after = require("after");
const entities = new Entities();
const urlDelete = new RegExp("http.*]", "g");


module.exports = function(strings, config, logger, fs, version, reminderTimeouts){
    var commands = {
        changeLanguage:{
            name: "changeLanguage",
            process: function(bot, connection, message, text, permission, language, suffix){
                if(permission){
                    let requestedLang = text.slice(0, 2);
                    if(requestedLang !== ''){
                        if(strings.hasOwnProperty(requestedLang)){
                            connection.query("UPDATE server_settings SET Language = ? WHERE Server_ID = ?",[requestedLang, message.server.id], function(err){
                                if(err)console.log(err);
                                else{
                                    bot.reply(message, strings[requestedLang].languageChanged.replace("$(text)", requestedLang));
                                }
                            });
                        } else{
                            bot.reply(message, strings[language].languageNotAvailable.replace("$(text)", requestedLang));
                        }
                    }
                    else{
                        bot.reply(message, strings[language].wrongUseOfCommand.replace("$(trigger)", suffix).replace("$(usage)", strings[language].commands[this.name].usage).replace("$(commandName)", strings[language].commands[this.name].name));
                    }
                } else bot.reply(message, strings[language].permissionDenied);
            }
        },
        changeSuffix:{
                name: "changeSuffix",
                process: function(bot, connection, message, text, permission, language, suffix){
                    if(permission){
                        if(text !== ''){
                            connection.query("UPDATE server_settings SET Suffix = ? WHERE Server_ID = ?", [text, message.server.id], function(err){
                                if(err)console.log(err);
                                else{
                                    let messageToSend = strings[language].suffixChanged;
                                    messageToSend = messageToSend.replace("$(suffix)", text);
                                    bot.sendMessage(message, messageToSend);
                                }
                            });
                        } else {
                            bot.reply(message, strings[language].wrongUseOfCommand.replace("$(trigger)", suffix).replace("$(usage)", strings[language].commands[this.name].usage).replace("$(commandName)", strings[language].commands[this.name].name));
                        }
                    } else bot.reply(message, strings[language].permissionDenied);
                }
        },
        addCom:{
            name: "addCom",
            process: function(bot, connection, message, text, permission, language, suffix){
                if(text === '' || text.indexOf(" ") < 0){
                    bot.reply(message, strings[language].wrongUseOfCommand.replace("$(trigger)", suffix).replace("$(usage)", strings[language].commands[this.name].usage).replace("$(commandName)", strings[language].commands[this.name].name));
                    return;
                }
                let reqCommandName = text.slice(0, text.indexOf(" "));
                let content = text.slice(text.indexOf(" ")+1);
                let commandNameLimit = 30;
                if(reqCommandName.length > commandNameLimit){
                    let tooLongMessage = strings[language].commandTooLong.replace("$(limit)", commandNameLimit);
                    bot.reply(message, tooLongMessage);
                    return;
                }

                connection.query("INSERT INTO custom_commands (Server_ID, Name, Content) VALUES (?, ?, ?)", [message.server.id, reqCommandName, content], function(err){
                    if(err && err.code === "ER_DUP_ENTRY"){
                        let duplicateMessage = strings[language].addComAlreadyExists
                            .replace("$(suffix)", suffix)
                            .replace("$(reqCommandName)", reqCommandName);
                        bot.reply(message, duplicateMessage);
                    } else if(!err){
                        let successfulMessage = strings[language].addComSuccessful
                            .replace("$(suffix)", suffix)
                            .replace("$(reqCommandName)", reqCommandName);
                        bot.reply(message, successfulMessage);
                    } else{
                        console.log(err);
                    }
                });
            }
        },
        changeCom:{
            name: "changeCom",
            process: function(bot, connection, message, text, permission, language, suffix){
                if(text === '' || text.indexOf(" ") < 0){
                    bot.reply(message, strings[language].wrongUseOfCommand.replace("$(trigger)", suffix).replace("$(usage)", strings[language].commands[this.name].usage).replace("$(commandName)", strings[language].commands[this.name].name));
                    return;
                }
                let reqCommandName = text.slice(0, text.indexOf(" "));
                let content = text.slice(text.indexOf(" ")+1);
                let commandNameLimit = 30;
                if(reqCommandName.length > commandNameLimit){
                    let tooLongMessage = strings[language].commandTooLong.replace("$(limit)", commandNameLimit);
                    bot.reply(message, tooLongMessage);
                    return;
                }

                connection.query("UPDATE custom_commands SET Content = ? WHERE Server_ID = ? AND Name = ?", [content, message.server.id, reqCommandName], function(err, status){
                    if(err)console.log(err);
                    if(status.affectedRows === 1){
                        let successfulMessage = strings[language].changeComSuccessful
                            .replace("$(suffix)", suffix)
                            .replace("$(reqCommandName)", reqCommandName);
                        bot.reply(message, successfulMessage);
                    } else{
                        let errorMessage = strings[language].changeComError
                            .replace("$(suffix)", suffix)
                            .replace("$(reqCommandName)", reqCommandName);
                        bot.reply(message, errorMessage);
                    }
                });
            }
        },
        delCom:{
            name: "delCom",
            process: function(bot, connection, message, text, permission, language, suffix){
                if(text === ''){
                    bot.reply(message, strings[language].wrongUseOfCommand.replace("$(trigger)", suffix).replace("$(usage)", strings[language].commands[this.name].usage).replace("$(commandName)", strings[language].commands[this.name].name));
                    return;
                }
                connection.query("DELETE FROM custom_commands WHERE Server_ID = ? AND Name = ?", [message.server.id, text], function(err, status){
                    if(err)console.log(err);
                    if(status.affectedRows === 1){
                        let successfulMessage = strings[language].delComSuccessful
                            .replace("$(suffix)", suffix)
                            .replace("$(reqCommandName)", text);
                        bot.reply(message, successfulMessage);
                    } else{
                        let errorMessage = strings[language].delComError
                            .replace("$(suffix)", suffix)
                            .replace("$(reqCommandName)", text);
                        bot.reply(message, errorMessage);
                    }
                });
            }
        },
        clear:{
            name: "clear",
            usage: "<Number of Messages to be deleted>",
            description: "Deletes Messages to clear your Chat-Room (Needs rights to Manage Messages and Read Message History)",
            process: function(bot, connection, message, text, permission, language, suffix){
                if(permission){
                    if(message.channel.permissionsOf(bot.internal.user.id).hasPermission("manageMessages") && message.channel.permissionsOf(bot.internal.user.id).hasPermission("readMessageHistory")){
                        if(text !== '' && !isNaN(text) ){
                            deleteAllMessages(text);
                        } else if(text.toUpperCase().indexOf("ALL") > -1){
                            deleteAllMessages("all");
                        }
                         else{
                            bot.reply(message, strings[language].wrongUseOfCommand.replace("$(trigger)", suffix).replace("$(usage)", strings[language].commands[this.name].usage).replace("$(commandName)", strings[language].commands[this.name].name));
                        }
                    } else{
                        bot.reply(message, strings[language].clearPermissionMissing);
                    }
                } else{
                    bot.reply(message, strings[language].permissionDenied);
                }

                function deleteAllMessages(amount){
                    if(amount === "all"){
                        bot.getChannelLogs(message.channel.id, 100, {before: message}, function(err, data){
                          if(err)console.log(err);
                          else{
                              if(data.length > 0){
                                 bot.deleteMessages(data, function(err){
                                      if(err)console.log(err);
                                      deleteAllMessages("all");
                                  });
                              }
                          }
                        });
                    } else{
                        let amountMessages;
                        if(amount > 100)amountMessages = 100;
                        else amountMessages = amount;

                        amount -= amountMessages;
                        bot.getChannelLogs(message.channel.id, 100, {before: message}, function(err, data){
                          if(err)console.log(err);
                          else{
                              if(data.length > 0){
                                 bot.deleteMessages(data, function(err){
                                      if(err)console.log(err);
                                      if(amount > 0)deleteAllMessages(amount);
                                  });
                              }
                          }
                        });
                    }
                }
            }
        },
        startPoll:{
            name: "startPoll",
            usage: "<Description of Poll>",
            description: "Starts a new Poll.",
            process: function(bot, connection, message, text, permission, language, suffix){
                if(permission){
                    connection.query("SELECT * FROM polls WHERE Finish IS NULL AND Channel_ID = ?",[message.channel.id], function(err, rows){
                    if(err)console.log(err);
                        if(rows[0] === undefined){
                            connection.query("INSERT INTO polls (Channel_ID,Server_ID, Description) VALUES (?, ?, ?)", [message.channel.id, message.server.id, text], function(err){
                                if(err)console.log(err);
                                else{
                                    bot.sendMessage(message, strings[language].pollStarted.replace("$(text)", text));
                                }
                            });

                        } else{
                            bot.reply(message, strings[language].pollAlreadyActive);
                        }
                    });
                } else{
                    bot.reply(message, strings[language].permissionDenied);
                }
            }
        },
        finishPoll:{
            name: "finishPoll",
            usage: "",
            description: "Finishes an ongoing Poll.",
            process: function(bot, connection, message, text, permission, language, suffix){
                if(permission){
                    connection.query("SELECT * FROM polls WHERE Finish IS NULL AND Channel_ID = ?", [message.channel.id], function(err, rows){
            			if(err)console.log(err);
            			if(rows[0] === undefined){
            				bot.reply(message, strings[language].pollNotActive);
            			} else{
                            connection.query("SELECT list_items.Name, COUNT(votes.User_ID) AS Votes From list_items LEFT JOIN votes ON list_items.ID = votes.Item_ID WHERE list_items.Poll_ID = ? GROUP BY list_items.ID ORDER BY Votes DESC", [rows[0].ID], function(err, results){
                                if(err)console.log(err);
                                bot.sendMessage(message, strings[language].pollFinished.replace("$(poll)",createTablePoll(rows, results, strings[language])) );
                            });
            				connection.query("UPDATE polls SET Finish = NOW() WHERE Finish IS NULL AND Channel_ID = ?", [message.channel.id], function(err, rows){
            				if(err)console.log(err);
            				});
            			}
            		});
                } else{
                    bot.reply(message, strings[language].permissionDenied);
                }
            }
        },
        showPoll:{
            name: "showPoll",
            usage: "",
            description: "Shows the ongoing Poll and the registered Items.",
            process: function(bot, connection, message, text, permission, language, suffix){
                connection.query("SELECT * FROM polls WHERE Finish IS NULL AND Channel_ID = ?", [message.channel.id], function(err, rows){
                    if(err)console.log(err);
                    if(rows[0] === undefined){
                          bot.reply(message, strings[language].pollNotActive);
                     }
                    else{
                      connection.query("SELECT list_items.Name, COUNT(votes.User_ID) AS Votes From list_items LEFT JOIN votes ON list_items.ID = votes.Item_ID WHERE list_items.Poll_ID = ? GROUP BY list_items.ID ORDER BY Votes DESC", [rows[0].ID ], function(err, results){
                          if(err)console.log(err);
                          bot.reply(message, strings[language].pollShow.replace("$(poll)",createTablePoll(rows, results, strings[language]) ) );
                      });
                    }
                });
            }
        },
        lastPoll:{
            name: "lastPoll",
            usage: "<Number or nothing>",
            description: "Can show 1 out of the 30 last Polls, the Number decides which one.",
            process: function(bot, connection, message, text, permission, language, suffix){
                if(text === '' || isNaN(text)  || Number(text) < 1)text = 1;
                else text = Math.floor(Number(text) );
                text-= 1;
                connection.query("SELECT * FROM polls WHERE Finish IS NOT NULL AND Channel_ID = ? ORDER BY Finish DESC LIMIT 30", [message.channel.id], function(err, rows){
                    if(err)console.log(err);

                    if(rows[0] === undefined)bot.reply(message, strings[language].pollNoHistory);
                    else if(rows[text] === undefined)bot.reply(message, strings[language].pollNotExist);
                    else {

                        connection.query("SELECT list_items.Name, COUNT(votes.User_ID) AS Votes From list_items LEFT JOIN votes ON list_items.ID = votes.Item_ID WHERE list_items.Poll_ID = ? GROUP BY list_items.ID ORDER BY Votes DESC", [rows[text].ID], function(err, results){
                            if(err)console.log(err);
                            else{
                                let pollDescription = [{Description: rows[text].Description}];
                                bot.reply(message, strings[language].pollLastInfo.replace("$(start)", rows[text].Start).replace("$(finish)", rows[text].Finish).replace("$(poll)", createTablePoll(pollDescription, results, strings[language])));
                            }
                        });
                    }
                });
            }
        },
        addItem:{
            name: "addItem",
            usage: "<Name of Item>",
            description: "Adds a new Item to the ongoing Poll.",
            process: function(bot, connection, message, text, permission, language, suffix){
                if(text.length > 0){
    				connection.query("SELECT * FROM polls WHERE Finish IS NULL AND Channel_ID = ?", [message.channel.id], function(err, rows){
    					if(err)console.log(err);
    					if(rows[0] === undefined){
    						bot.reply(message, strings[language].pollNotActive);
    					} else{
    						connection.query("SELECT ID FROM list_items WHERE Name = ? AND Poll_ID = ?", [text, rows[0].ID], function(err, results){
    							if(err)console.log(err);
    							if(results[0] === undefined){
    								connection.query("INSERT INTO list_items (Poll_ID, Name, User_ID) VALUES (?, ?, ?)", [rows[0].ID, text, message.author.id], function(err){
    	                                if(err)console.log(err);
                                        else bot.reply(message, strings[language].addedToPoll.replace("$(text)", text));
    	                            });
    							} else{
    	                            bot.reply(message, strings[language].alreadyInPoll);
    	                        }
    						});
    					}
    				});
    			} else{
                    bot.reply(message, strings[language].wrongUseOfCommand.replace("$(trigger)", suffix).replace("$(usage)", strings[language].commands[this.name].usage).replace("$(commandName)", strings[language].commands[this.name].name));
                }
            }
        },
        vote:{
            name: "vote",
            usage: "<Name of Item>",
            description: "Vote for an Item of the Poll, make sure to write it down exactly like it is set in the Poll.",
            process: function(bot, connection, message, text, permission, language, suffix){
                connection.query("SELECT * FROM polls WHERE Finish IS NULL AND Channel_ID = ?", [message.channel.id], function(err, rows){
                    if(err)console.log(err);
                    if(rows[0] === undefined){
                        bot.reply(message, strings[language].pollNotActive);
                    } else{
                        connection.query("SELECT ID FROM list_items WHERE Poll_ID = ? AND Name = ?", [rows[0].ID, text], function(err, results){
                            if(err)console.log(err);
                            if(results[0] === undefined)bot.reply(message, strings[language].notInThePoll.replace("$(text)", text));
                            else{
                                connection.query("SELECT Item_ID FROM votes WHERE Poll_ID = ? AND User_ID = ?", [rows[0].ID, message.author.id], function(err, checkResult){
                                    if(err)console.log(err);
                                    else{
                                        if(checkResult[0] === undefined){
                                            connection.query("INSERT INTO votes (Item_ID, Poll_ID, User_ID) VALUES(?, ?, ?)", [results[0].ID, rows[0].ID, message.author.id], function(err){
                                                if(err)console.log(err);
                                            });
                                        }else {
                                            connection.query("UPDATE votes SET Item_ID = ? WHERE Poll_ID = ? AND User_ID = ?", [results[0].ID, rows[0].ID, message.author.id], function(err){
                                                if(err)console.log(err);
                                            });
                                        }
                                        bot.reply(message, strings[language].pollVoteCounted.replace("$(text)", text) );
                                    }
                                });
                            }
                        });
                    }
                });
            }
        },
        remindMe:{
            name: "remindMe",
            usage: "<Number in Minutes>\t<Message>",
            description: "Makes the bot remind you something after a specified time.",
            process: function(bot, connection, message, text, permission, language, suffix){
                let splitter = text.lastIndexOf("after");
                let reminder = text.slice(0, splitter);
                let time = text.slice(splitter);
                time = parseTime(time);
    			if(time > 0){
                    let point = new Date();
                    point.setTime(point.getTime() + time);

                    let allTimes = timeToObject(time);
                    let finishedMessage = strings[language].remindMeConfirmation;
                    finishedMessage = finishedMessage.replace("$(days)", allTimes.days);
                    finishedMessage = finishedMessage.replace("$(hours)", allTimes.hours);
                    finishedMessage = finishedMessage.replace("$(minutes)", allTimes.minutes);
                    finishedMessage = finishedMessage.replace("$(seconds)", allTimes.seconds);

                    connection.query("INSERT INTO reminders (Author, Receiver, Message, Language, Timestamp) VALUES (?, ?, ?, ?, ?)", [message.author.id, message.author.id, reminder, language, point], function(err, data){
                        if(err)console.log(err);
                        bot.reply(message, finishedMessage);
                        if(time <= 60*1000*2 && !reminderTimeouts.hasOwnProperty(data.insertId)){
                            reminderTimeouts[data.insertId] = setTimeout(function(){
                                bot.sendMessage(message.author.id, strings[language].remindMeMessage.replace("$(reminder)", reminder), function(){
                                    delete reminderTimeouts[data.insertId];
                                    connection.query("DELETE FROM reminders WHERE ID = ?", data.insertId);
                                });
                            }, time-500);
                        }
                    });
    			} else{
    				    bot.reply(message, strings[language].wrongUseOfCommand.replace("$(trigger)", suffix).replace("$(usage)",strings[language].commands[this.name].usage).replace("$(commandName)", strings[language].commands[this.name].name));
    			}
            }
        },
        remindEveryone:{
            name: "remindEveryone",
            usage: "<Number in Minutes>\t<Message>",
            description: "Makes the bot remind everyone something after a specified time.",
            process: function(bot, connection, message, text, permission, language, suffix){
                let splitter = text.lastIndexOf("after");
                let reminder = text.slice(0, splitter);
                let time = text.slice(splitter);
                time = parseTime(time);
    			if(time > 0){
                    let point = new Date();
                    point.setTime(point.getTime() + time);

                    let allTimes = timeToObject(time);
                    let finishedMessage = strings[language].remindEveryoneConfirmation;
                    finishedMessage = finishedMessage.replace("$(days)", allTimes.days);
                    finishedMessage = finishedMessage.replace("$(hours)", allTimes.hours);
                    finishedMessage = finishedMessage.replace("$(minutes)", allTimes.minutes);
                    finishedMessage = finishedMessage.replace("$(seconds)", allTimes.seconds);

                    connection.query("INSERT INTO reminders (Author, Receiver, Message, Language, Timestamp) VALUES (?, ?, ?, ?, ?)", [message.author.id, message.channel.id, reminder, language, point], function(err, data){
                        if(err)console.log(err);
                        bot.reply(message, finishedMessage);
                        if(time <= 60*1000*2 && !reminderTimeouts.hasOwnProperty(data.insertId)){
                            let receiver = bot.channels.get("id", message.channel.id);
                            let messageString = strings[language].remindSomeoneMessage;
                            messageString = messageString.replace("$(reminder)", reminder);
                            messageString = messageString.replace("$(author)", "<@!" + message.author.id + ">");

                            reminderTimeouts[data.insertId] = setTimeout(function(){
                                bot.sendMessage(receiver, messageString, function(){
                                    delete reminderTimeouts[data.insertId];
                                    connection.query("DELETE FROM reminders WHERE ID = ?", data.insertId);
                                });
                            }, time-500);
                        }
                    });
    			} else{
    				    bot.reply(message, strings[language].wrongUseOfCommand.replace("$(trigger)", suffix).replace("$(usage)",strings[language].commands[this.name].usage).replace("$(commandName)", strings[language].commands[this.name].name));
    			}
            }
        },
        remindSomeone:{
            name: "remindSomeone",
            usage: "<Mentions of Persons>\t**;**\t<Number in Minutes>\t<Message>",
            description: "Makes the bot remind 1 or more Persons something after a specified time.",
            process: function(bot, connection, message, text, permission, language, suffix){
                let splitter = text.lastIndexOf("after");
                let reminder = text.slice(0, splitter);
                let time = text.slice(splitter);
                time = parseTime(time);
    			if(time > 0 && message.mentions.length > 0){
                    let point = new Date();
                    point.setTime(point.getTime() + time);

                    let allTimes = timeToObject(time);
                    let finishedMessage;
                    if(message.mentions.length === 1)finishedMessage = strings[language].remindSomeoneOneConfirmation;
                    else finishedMessage = strings[language].remindSomeoneMultipleConfirmation;
                    finishedMessage = finishedMessage.replace("$(days)", allTimes.days);
                    finishedMessage = finishedMessage.replace("$(hours)", allTimes.hours);
                    finishedMessage = finishedMessage.replace("$(minutes)", allTimes.minutes);
                    finishedMessage = finishedMessage.replace("$(seconds)", allTimes.seconds);
                    bot.reply(message, finishedMessage);
                    for(let i = 0; i < message.mentions.length; i++){
                        let receiver = message.mentions[i].id;
                        connection.query("INSERT INTO reminders (Author, Receiver, Message, Language, Timestamp) VALUES (?, ?, ?, ?, ?)", [message.author.id, receiver, reminder, language, point], function(err, data){
                            if(err)console.log(err);
                            if(time <= 60*1000*2 && !reminderTimeouts.hasOwnProperty(data.insertId)){
                                let messageString = strings[language].remindSomeoneMessage;
                                messageString = messageString.replace("$(reminder)", reminder);
                                messageString = messageString.replace("$(author)", "<@!" + message.author.id + ">");

                                reminderTimeouts[data.insertId] = setTimeout(function(){
                                    bot.sendMessage(receiver, messageString, function(){
                                        delete reminderTimeouts[data.insertId];
                                        connection.query("DELETE FROM reminders WHERE ID = ?", data.insertId);
                                    });
                                }, time-500);
                            }
                        });
                    }
    			} else{
    				    bot.reply(message, strings[language].wrongUseOfCommand.replace("$(trigger)", suffix).replace("$(usage)",strings[language].commands[this.name].usage).replace("$(commandName)", strings[language].commands[this.name].name));
    			}
            }
        },
        showReminders:{
            name: "showReminder",
            process: function(bot, connection, message, text, permission, language, suffix){
                connection.query("SELECT ID, Receiver, Timestamp FROM reminders WHERE Author = ? ORDER BY Timestamp ASC", [message.author.id], function(err, data){
                    if(err){
                        console.log(err);
                        return;
                    }
                    if(data.length === 0){
                        bot.sendMessage(message.author.id, strings[language].removeReminderNone);
                        return;
                    }
                    if(text === '' || isNaN(text) || text < 1){
                        let messageString = strings[language].removeReminderListTitle;
                        let now = Date.now();
                        for (var i = 0; i < data.length; i++) {
                            let timeObject = timeToObject(data[i].Timestamp - now);
                            let listItem = strings[language].removeReminderListItem;
                            let receiver = bot.users.get("id", data[i].Receiver) ||  bot.channels.get("id", data[i].Receiver);
                            listItem = listItem.replace("$(position)", i+1)
                                .replace("$(receiver)", receiver)
                                .replace("$(days)", timeObject.days)
                                .replace("$(hours)", timeObject.hours)
                                .replace("$(minutes)", timeObject.minutes)
                                .replace("$(seconds)", timeObject.seconds);
                            messageString += listItem;
                        }
                        messageString += strings[language].removeReminderListEnd;

                        bot.sendMessage(message.author.id, messageString);
                    }
                });
            }
        },
        removeReminder:{
            name: "removeReminder",
            process: function(bot, connection, message, text, permission, language, suffix){
                var commandName = this.name;
                connection.query("SELECT ID, Receiver, Timestamp FROM reminders WHERE Author = ? ORDER BY Timestamp ASC", [message.author.id], function(err, data){
                    if(err){
                        console.log(err);
                        return;
                    }
                    if(data.length === 0){
                        bot.sendMessage(message.author.id, strings[language].removeReminderNone);
                        return;
                    }
                    if(text === '' || isNaN(text) || text < 1){
                        bot.reply(message, strings[language].wrongUseOfCommand.replace("$(trigger)", suffix).replace("$(usage)", strings[language].commands[commandName].usage).replace("$(commandName)", strings[language].commands[commandName].name));
                    }
                    else{
                        text = Number(text);
                        text--;
                        if(!data[text]){
                            let messageString = strings[language].removeReminderNotFound
                                .replace("$(number)", text+1);
                            bot.sendMessage(message.author.id, messageString);
                        } else{
                            connection.query("DELETE FROM reminders WHERE ID = ?", [data[text].ID], function(err){
                                if(err)console.log(err);
                                if(reminderTimeouts.hasOwnProperty(data[text].ID)){
                                    clearTimeout(reminderTimeouts[data[text].ID]);
                                    delete reminderTimeouts[data[text].ID];
                                }
                                let now = Date.now();
                                let timeObject = timeToObject(data[text].Timestamp - now);
                                let receiver = bot.users.get("id", data[text].Receiver) ||  bot.channels.get("id", data[text].Receiver);
                                let messageString = strings[language].removeReminderDeleted
                                    .replace("$(receiver)", receiver)
                                    .replace("$(days)", timeObject.days)
                                    .replace("$(hours)", timeObject.hours)
                                    .replace("$(minutes)", timeObject.minutes)
                                    .replace("$(seconds)", timeObject.seconds);
                                bot.sendMessage(message.author.id, messageString);
                            });
                        }
                    }
                });
            }
        },
        ud:{
            name:"ud",
            process: function(bot, connection, message, text, permission, language, suffix){
                if(text !== ''){
                    unirest.get("https://mashape-community-urban-dictionary.p.mashape.com/define?term=" + querystring.escape(text))
                    .header("X-Mashape-Key", "") // API Key needed
                    .header("Accept", "text/plain")
                    .end(function (results) {
                      if(results.body.list.length > 0){
                          let article = results.body.list[0];
                          let finishedMessage = strings[language].urbanDictionaryArticle.replace("$(title)", article.word).replace("$(definition)", article.definition).replace("$(example)", article.example).replace("$(thumbsUp)", article.thumbs_up).replace("$(thumbsDown)", article.thumbs_down);
                          if(finishedMessage.length >= 2000){
                              finishedMessage = strings[language].urbanDictionaryTooLong.replace("$(link)","http://www.urbandictionary.com/define.php?term=" + article.word);
                          }
                          bot.sendMessage(message, finishedMessage, function(err){
                              if(err)console.log(err);
                          });
                      } else{
                          bot.sendMessage(message, strings[language].urbanDictionaryNoResult.replace("$(text)", text));
                      }
                    });
                } else{
                    bot.reply(message, strings[language].wrongUseOfCommand.replace("$(trigger)", suffix).replace("$(usage)", strings[language].commands[this.name].usage).replace("$(commandName)", strings[language].commands[this.name].name));
                }
            }
        },
        malAnime:{
            name: "malAnime",
            process: function(bot, connection, message, text, permission, language, suffix){
                unirest.get("https://myanimelist.net/api/anime/search.xml?q=" + entities.encode(text) )
                .header("method", "GET")
                .header("Host", "myanimelist.net")
                .header("Authorization", config.malAcc)
                .header("Accept", "text/xml, text/*")
                .end(function(data){
                    if(data.code === 200){
                        parseString(data.raw_body, function(err, results){
                            if(err)console.log(err);
                            else{
                                let anime = results.anime.entry[0];

                                let animeInfo = strings[language].malAnimeArticle.replace("$(title)", anime.title[0]).replace("$(description)", anime.synopsis[0]).replace("$(img)", anime.image[0]).replace("$(score)", anime.score[0]).replace("$(status)", anime.status[0]).replace("$(type)", anime.type[0]);
                                if(anime.synonyms[0] !== '')animeInfo = animeInfo.replace("$(synonyms)", "*" +  anime.synonyms[0] + "*");
                                else animeInfo = animeInfo.replace("$(synonyms)", '');
                                animeInfo = replaceAll("<br />", "\n", animeInfo );
                                animeInfo = replaceAll("[i]", "*", animeInfo);
                                animeInfo = replaceAll("[/i]", "*", animeInfo);
                                animeInfo = replaceAll("[b]", "**", animeInfo);
                                animeInfo = replaceAll("[/b]", "**", animeInfo);
                                animeInfo = replaceAll("[url=", "", animeInfo);
                                animeInfo = replaceAll("[/url]", "", animeInfo);
                                animeInfo = animeInfo.replace(urlDelete, "");


                                let finishedMessage = entities.decode(animeInfo);

                                bot.sendMessage(message, finishedMessage);
                            }
                        });
                    } else{
                        bot.sendMessage(message, strings[language].malAnimeNoResult.replace("$(text)", text));
                    }
                });
            }
        },
        malManga:{
            name: "malManga",
            process: function(bot, connection, message, text, permission, language, suffix){
                unirest.get("https://myanimelist.net/api/manga/search.xml?q=" + entities.encode(text) )
                .header("method", "GET")
                .header("Host", "myanimelist.net")
                .header("Authorization", config.malAcc)
                .header("Accept", "text/xml, text/*")
                .end(function(data){
                    if(data.code === 200){
                        parseString(data.raw_body, function(err, results){
                            if(err)console.log(err);
                            else{
                                let manga = results.manga.entry[0];

                                let mangaInfo = strings[language].malMangaArticle.replace("$(title)", manga.title[0]).replace("$(description)", manga.synopsis[0]).replace("$(img)", manga.image[0]).replace("$(score)", manga.score[0]).replace("$(status)", manga.status[0]).replace("$(type)", manga.type[0]);
                                if(manga.synonyms[0] !== '')mangaInfo = mangaInfo.replace("$(synonyms)", "*" +  manga.synonyms[0] + "*");
                                else mangaInfo = mangaInfo.replace("$(synonyms)", '');
                                mangaInfo = replaceAll("<br />", "\n", mangaInfo );
                                mangaInfo = replaceAll("[i]", "*", mangaInfo);
                                mangaInfo = replaceAll("[/i]", "*", mangaInfo);
                                mangaInfo = replaceAll("[b]", "**", mangaInfo);
                                mangaInfo = replaceAll("[/b]", "**", mangaInfo);
                                mangaInfo = replaceAll("[url=", "", mangaInfo);
                                mangaInfo = replaceAll("[/url]", "", mangaInfo);
                                mangaInfo = mangaInfo.replace(urlDelete, "");


                                let finishedMessage = entities.decode(mangaInfo);

                                bot.sendMessage(message, finishedMessage);
                            }
                        });
                    } else{
                        bot.sendMessage(message, strings[language].malMangaNoResult.replace("$(text)", text));
                    }
                });
            }
        },
        malUser:{
            name:"malUser",
            process: function(bot, connection, message, text, permission, language, suffix){
                if(text !== ''){
                    let next = after(2, showMalUser);
                    var anime, manga;

                    unirest.get("https://myanimelist.net/malappinfo.php?u=" + entities.encode(text) + " &status=all&type=anime" )
                    .header("method", "GET")
                    .header("Host", "myanimelist.net")
                    .header("Authorization", strings.malAcc)
                    .header("Accept", "text/xml, text/*")
                    .end(function(data){
                        parseString(data.body, function(err, results){
                            if(err){
                                next(err);
                            }
                            else{
                                anime = results;
                                next();
                            }
                        });
                    });

                    unirest.get("https://myanimelist.net/malappinfo.php?u=" + entities.encode(text) + " &status=all&type=manga" )
                    .header("method", "GET")
                    .header("Host", "myanimelist.net")
                    .header("Authorization", strings.malAcc)
                    .header("Accept", "text/xml, text/*")
                    .end(function(data){
                        parseString(data.body, function(err, results){
                            if(err){
                                next(err);
                            }
                            else{
                                manga = results;
                                next();
                            }
                        });
                    });
                } else{
                    bot.reply(message, strings[language].wrongUseOfCommand.replace("$(trigger)", suffix).replace("$(usage)", strings[language].commands[this.name].usage).replace("$(commandName)", strings[language].commands[this.name].name));
                }
                function showMalUser(err){
                    if(err)console.log(err);
                    else{
                        if(anime.myanimelist.error === undefined){
                            let finishedMessage = strings[language].malUserArticle;
                            finishedMessage = replaceAll("$(malName)", anime.myanimelist.myinfo[0].user_name[0], finishedMessage)
                                .replace("$(watchingAn)", anime.myanimelist.myinfo[0].user_watching[0])
                                .replace("$(completedAn)", anime.myanimelist.myinfo[0].user_completed)
                                .replace("$(onHoldAn)", anime.myanimelist.myinfo[0].user_onhold[0])
                                .replace("$(droppedAn)", anime.myanimelist.myinfo[0].user_dropped[0])
                                .replace("$(ptwAn)", anime.myanimelist.myinfo[0].user_plantowatch[0])
                                .replace("$(dswAn)", anime.myanimelist.myinfo[0].user_days_spent_watching[0])
                                // Manga
                                .replace("$(readingMa)", manga.myanimelist.myinfo[0].user_reading[0])
                                .replace("$(completedMa)", manga.myanimelist.myinfo[0].user_completed)
                                .replace("$(onHoldMa)", manga.myanimelist.myinfo[0].user_onhold[0])
                                .replace("$(droppedMa)", manga.myanimelist.myinfo[0].user_dropped[0])
                                .replace("$(ptrMa)", manga.myanimelist.myinfo[0].user_plantoread[0])
                                .replace("$(dsrMa)", manga.myanimelist.myinfo[0].user_days_spent_watching[0]);
                            bot.sendMessage(message, finishedMessage);
                        } else{
                            bot.reply(message, strings[language].malUserNotFound.replace("$(text)", text));
                        }
                    }
                }
            }
        },
        ping:{
            name:"ping",
            process: function(bot, connection, message, text, permission, language, suffix){
                let timeStart = message.timestamp;
                let author = "<@!" + message.author.id + ">";

                bot.sendMessage(message, "pong", function(err, data){
                    let responseTime = Math.round( data.timestamp - timeStart );
                    let finishedMessage = strings[language].pingMessage;
                    finishedMessage = finishedMessage.replace("$(user)", author);
                    finishedMessage = finishedMessage.replace("$(time)", responseTime);

                    bot.updateMessage(data, finishedMessage);
                });
            }
        },
        about:{
            name:"about",
            process: function(bot, connection, message, text, permission, language, suffix){
                let allTimes = timeToObject(bot.internal.uptime);
                let finishedMessage = strings[language].aboutMessage
                    .replace("$(version)", version)
                    .replace("$(botName)", bot.internal.user.name)
                    .replace("$(developerName)", "<@"+config.admin[0]+">")
                    .replace("$(servers)", bot.internal.servers.length)
                    .replace("$(channels)", bot.internal.channels.length)
                    .replace("$(users)", bot.internal.users.length)
                    .replace("$(days)", allTimes.days)
                    .replace("$(hours)", allTimes.hours)
                    .replace("$(minutes)", allTimes.minutes)
                    .replace("$(seconds)", allTimes.seconds);

                bot.sendMessage(message, finishedMessage);
            }
        },
        help:{
            name: "help",
            usage: "",
            description: "Shows the List of all the Commands.",
            process: function(bot, connection, message, text, permission, language, suffix){
                fs.readFile(__dirname + config.helpList.replace("$(lang)", language), {encoding: "utf8"}, function(err, data){
                    if(err)console.log(err);
                    data = replaceAll("$(suffix)", suffix, data);
                    let listArray = data.split("$;*");
                    querySend(bot, message, listArray);
                });
            }
        }
    };
    return commands;
};

function createTablePoll(rows1, rows2, strings){
    let textblock;
    if(rows1[0].Description !== undefined && rows1[0].Description !== '') textblock = "\n\n*" + rows1[0].Description + "*\n\n";
    else textblock = "\n\n-----------\n\n";
    textblock += strings.pollHeadline;
    if(rows2.length > 0){
        textblock += "```ruby\n";
        for(let i = 0; rows2.length > i; i++){
            textblock += "" + (i+1) + ".\t\t";
            textblock += rows2[i].Votes;
            textblock += "\t\t" + rows2[i].Name;
            textblock += "\n";
        }
        textblock += "```";
    } else{
        textblock += "```\n-\t\t-\t\t-```";
    }
    return textblock;
}

function querySend(bot,message, MessageList){
    let i = 0;
    waitToSend();
    function waitToSend(){
        bot.sendMessage(message, MessageList[i], function(err){
            if(err)console.log(err);
            if(MessageList.length-1 > i){
                i++;
                waitToSend();
            }
        });
    }
}

function parseTime(toParsingString){
    toParsingString = replaceAll(",", ".", toParsingString);
    let days = toParsingString.match(/\d*\.{0,1}\d+d/i);
    let hours = toParsingString.match(/\d*\.{0,1}\d+h/i);
    let minutes = toParsingString.match(/\d*\.{0,1}\d+m/i);
    let seconds = toParsingString.match(/\d*\.{0,1}\d+s/i);

    let time = 0;
    if(days !== null)time += days[0].slice(0, -1) * 1000 * 60 * 60 * 24;
    if(hours !== null)time += hours[0].slice(0, -1) * 1000 * 60 * 60;
    if(minutes !== null)time += minutes[0].slice(0, -1) * 1000 * 60;
    if(seconds !== null)time += seconds[0].slice(0, -1) * 1000;
    return time;
}

function timeToObject(time){
    let timeObject = {};
    timeObject.days = Math.floor(time / (1000 * 60 * 60 * 24));
    timeObject.hours = Math.floor( (time / (1000 * 60 *60) ) %24);
    timeObject.minutes = Math.floor( (time / (1000 * 60) ) %60);
    timeObject.seconds = Math.floor( (time / (1000)) %60);
    return timeObject;
}
