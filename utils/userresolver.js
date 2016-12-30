"use strict";

const WebClient = require('@slack/client').WebClient;

const api_token = process.env['SLACK_API_TOKEN'] || '';
const web = new WebClient(api_token);

let userList = {};

web.users.list((err, users) => {
  if(err) {
    return console.error("Error with user resolution: ", err);
  }

  users.members.forEach((user) => {
    userList[user.id] = [user.color, user.name, user.profile['image_72']];
  });
});

module.exports = {
  pure(userId) {
    if(userList[userId]) {
      return userList[userId][1];
    } else {
      return userId;
    }
  },
  formatted(userId) {
    if(userList[userId]) {
      let user = userList[userId];
      return `<span style="color:#${user[0]}">@${user[1]}</span>`
    } else {
      return `<@${userId}>`;
    }
  },
  image(userId) {
    if(userList[userId]) {
      let user = userList[userId];
      return user[2];
    } else {
      return null;
    }
  }
}
