const {Client} = require('@notionhq/client');
const express = require('express');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messageTo = process.env.MESSAGE_TO;
const messageFrom = process.env.MESSAGE_FROM;

require('dotenv').config()

// require the Twilio module and create a REST client
const twilioClient = require('twilio')(accountSid, authToken);


const notion = new Client({ auth: process.env.NOTION_KEY })
const schedule = require('node-schedule');

const databaseId = process.env.NOTION_DATABASE_ID;

app = express();

const jobs = {};

// call notion api to grab tasks with a deadline property
async function getTasksFromNotion() {
    const pages = [];
    let cursor = undefined; 

    while(true) {
        const response = await notion.databases.query({
            database_id: databaseId,
            start_cursor: cursor,
            filter: {
                "property": "Deadline",
                "date": {
                    "is_not_empty": true
                }
            }, 
            sort: {
                "timestamp": "last_edited_time",
                "direction": "descending"
            }
        });

        pages.push(...response['results']);
        
        if (response['has_true']) {
            cursor = response['next_cursor'];
        } else {
            break;
        }
    }

    const pagesProperties = pages.map((page) => {
        const pageProperties = page["properties"]
        const deadline = pageProperties["Deadline"]["date"]["end"] ? pageProperties["Deadline"]["date"]["end"] : pageProperties["Deadline"]["date"]["start"]
        const title = pageProperties['Name'].title.map(({plain_text}) => plain_text).join("");
        const id = page.id 
       return  {
            deadline,
            title,
            id
        }
   
    });

    return pagesProperties;
}

// schedule a reminder on deadline date
const scheduleReminder = (date, title, id) => {
    jobs[id] = {};

    jobs[id]['job'] = schedule.scheduleJob(date, () => {
        sendReminder(title);
    });
    jobs[id]['title'] = title;
    date.setDate(date.getDate() - 1);
    jobs[id]['deadline'] = date.toISOString().split('T')[0];
}

// check for updates for each task (Eg. changed deadline, changed title) and if any, create new jobs in place of the old ones
const updateTasks = (newTasks) => {
    const updatedTasksArr = [];

    if (Object.keys(jobs).length > 0) {
        for(i = 0; i < newTasks.length; i++) {
            id = newTasks[i]['id'];
            updatedTitle = newTasks[i]['title'];
            updatedDeadline = newTasks[i]['deadline'];
            title = jobs[id]['title'];
            deadline = jobs[id]['deadline'];
            isUpdated = ((updatedTitle.trim() !== title.trim()) || (updatedDeadline.trim() !== deadline.trim()))
            if (Object.keys(jobs).includes(id) && isUpdated) {
                if (jobs[id]['job']) {
                    jobs[id]['job'].cancel();
                    updatedTasksArr.push(newTasks[i]);
                }
            } else if (!Object.keys(jobs).includes(id)) {
                updatedTasksArr.push(newTasks[i]);
            }
        }
    } else {
        return newTasks;
    }
    return updatedTasksArr;
}

// invoke the process of scheduling reminders
async function invokeScheduleReminder() {
    tasks = await getTasksFromNotion();

    reqScheduleTasks = updateTasks(tasks);

    for (i = 0; i < reqScheduleTasks.length; i++) {
            const date = new Date(reqScheduleTasks[i]['deadline']);
            const day = date.getDate() + 1;
            date.setDate(day);
            const title = reqScheduleTasks[i]['title'];
            const id = reqScheduleTasks[i]['id'];
            scheduleReminder(date, title, id);
    }
}

// call twilio api to send reminder 
function sendReminder(title) {
    twilioClient.messages.create({
    to: messageTo,
    from: messageFrom,
    body: `Reminder: ${title} is due today!`,
  })
  .then(message => console.log(message.sid));
}

// invoke schedule reminder every 30 seconds
setInterval(invokeScheduleReminder, 30000);

app.listen(8000);