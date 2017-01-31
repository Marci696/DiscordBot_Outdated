# Outdated Discord Bot
A bot I was working on for quite a while but is now completely outdated due to changes in the DiscordJS API.
Currently available in German and English. More languages can be added quite easily. 


## How does it work?
When an user and the bot are in the same channel, the user can adress instructions to the bot via text chat. 
The bot will parse the message and execute the instructions if it fits to one of the predefined methods.

## Implemented Methods
### Change Language
``` ?changeLanguage  <2 letters for the language>```

Changes the Server Language. Currently available are:  'en' 'de'.

### Change Suffix
``` ?changeSuffix  <Your desired Suffix> ``` 

Changes the Suffix (the '?' infront of every command) to what you want.

### Add Custom Command
``` ?addCom  <Command Name (without Suffix)>	<Content you want me to send (use '$(user)' to mention the sender)>```

Adds a Custom-Command.

### Change Custom Command
``` ?changeCom  <Command Name (without Suffix)>	<Content you want me to send (use '$(user)' to mention the sender)>```

Changes the Content of an existing Custom-Command.

### Delete Custom Command
``` ?delCom  <Command Name (without Suffix)>```

Deletes a Custom-Command.

### Clear Chat
``` ?clear  <Amount to be deleted OR 'All' to clear everything>```

Deletes Messages to clear your Chat-Room (Needs rights to 'Manage Messages' and 'Read Message History').

### Start Poll
``` ?startPoll  <Description of Poll>```

Starts a new Poll.

### Finish Poll
``` ?finishPoll ```

Finishes an ongoing Poll.

### Show Poll
``` ?showPoll ```
Shows the ongoing Poll and the registered Items.

### Show an already ended Poll
``` ?lastPoll  <Number or nothing>```

Can show 1 out of the 30 last Polls, the Number decides which one.

### Add an Item to the Poll
``` ?addItem  <Name of Item>```

Adds a new Item to the ongoing Poll.

### Vote for an Item of the Poll
``` ?vote  <Name of Item> ```

Votes for an Item of the Poll, make sure to write it down exactly like it is set in the Poll.

### Send me an Reminder
``` ?remindMe  <Message>	after	<Time f.e. '0d 1h 30m 0s' or also possible '1.5h'>```

Sends you the typed in Message as Private Message after a specified time.

### Send everyone in this Chat-Room an Reminder
``` ?remindEveryone  <Message>	after	<Time f.e. '0d 1h 30m 0s' or also possible '1.5h'> ``` 

Repeats the typed in Message in the TextChannel to everyone after a specified time.

### Send the ones who are mentioned in this Message an Reminder
``` ?remindSomeone  <Message with Mention(s)>	after	<Time f.e. '0d 1h 30m 0s' or also possible '1.5h'> ```

Sends the typed in Message to the Person(s) you mentioned after a specified time.

### Show all planned Reminders
``` ?showReminders ``` 

Shows a List (Ascending) with all set Reminders together with the Number used for Removing a Reminder.

###  Remove an planned Reminder
``` ?removeReminder  <Number of the Reminder to delete> ``` 

Removes a Reminder so it won't remind you.

### Get a Definition of Urban Dictionary
``` ?ud  <Search term> ``` 

Returns the first result from Urban Dictionary.

### Get a Link for an Anime on MyAnimeList
``` ?malAnime  <Search term> ```

Shows the first entry of the searched Anime title.

### Get a Link for a Manga on MyAnimeList
``` ?malManga  <Search term> ```

Shows the first entry of the searched Manga title.

### Get a Link of an User on MyAnimeList
``` ?malUser  <User-Name> ``` 

Shows Informations about the MyAnimeList User.

### Check the response time of the bot
``` ?ping ``` 

Ping me to see the Response Time.

### About
``` ?about  ```

Informations about the bot.

### Show Commands
``` ?help ```

Shows the List of all the Commands.
