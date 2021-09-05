# notion-twilio-integration

## Description
This notion twilio integration sends a reminder message on the deadline date of tasks in a specified notion database 

## Running locally 
Clone this repo and make sure to install the dependencies with ``` npm install ```

Set up environment variables 

Create an ```.env``` file and add the following, while replacing everything in ```<...>``` with your own id or key

```
NOTION_KEY= <add your notion api key here>
TWILIO_ACCOUNT_SID=<add your twilio account sid here>
NOTION_DATABASE_ID=<add your notion database id here>
TWILIO_AUTH_TOKEN=<add your twilio auth token here>
MESSAGE_TO=<add the number to send message to>
MESSAGE_FROM=<add the number to send message from>
```
