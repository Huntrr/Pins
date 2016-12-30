"use strict";

const WebClient = require('@slack/client').WebClient;

const api_token = process.env['SLACK_API_TOKEN'] || '';
const web = new WebClient(api_token);

let channelList = {};

web.channels.list((err, list) => {
  if(err) {
    return console.error("Error with channel resolution: ", err);
  }

  list.channels.forEach((channel) => {
    channelList[channel.id] = channel.name;
  });
});

module.exports = {
  pure(channelId) {
    if(channelList[channelId]) {
      return channelList[channelId];
    } else {
      return null;
    }
  },

  formatted(channelId) {
    if(channelList[channelId]) {
      return `<span style="color:#4286f4">#${channelList[channelId]}</span>`
    } else {
      return null;
    }
  }
}
