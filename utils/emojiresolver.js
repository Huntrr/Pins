"use strict";

const WebClient = require('@slack/client').WebClient;

const api_token = process.env['SLACK_API_TOKEN'] || '';
const web = new WebClient(api_token);

let emojiList = {};

web.emoji.list((err, list) => {
  if(err) {
    return console.error("Error with emoji resolution: ", err);
  }

  emojiList = list.emoji;
});

let resolve = function(emoji) {
  let resolution = emojiList[emoji];

  if(!resolution) {
    return false;
  }

  if(resolution.substring(0, 6) == 'alias:') {
    return resolve(resolution.substring(6));
  } else {
    return `<img class="emoji" src="${resolution}" />`;
  }
}

module.exports = resolve;
