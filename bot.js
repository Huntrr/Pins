"use strict";

const RtmClient = require('@slack/client').RtmClient;
const WebClient = require('@slack/client').WebClient;
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;
const WebServer = require('./server');
const db = require('./models/db');
const _ = require('lodash');

const bot_token = process.env['SLACK_BOT_TOKEN'] || '';

const rtm = new RtmClient(bot_token);
const web = new WebClient(bot_token);

function sendMessage(msg, user) {
  web.im.open(user, (err, res) => {
    rtm.sendMessage(msg, res.channel.id);
  });
}

// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload if you want to cache it
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}`);
});

rtm.on(RTM_EVENTS.REACTION_ADDED, function handleRtmReactionAdded(reaction) {
  console.log('Got reaction', reaction);
  if(reaction.reaction == 'pin') {
    db.addPin(reaction.user, reaction.item_user, reaction.item.channel,
              reaction.item.ts, (err) => {
                if(err) {
                  console.error(err);
                } else {
                  console.log('Message successfully pinned');
                  sendMessage(`Pin'd! See all the pins in ` +
                                  `<#${reaction.item.channel}> over at ` +
                                  getPinUrl(reaction.user, reaction.item.channel),
                                  reaction.user);
                }
              });
  }
});

rtm.on(RTM_EVENTS.PIN_ADDED, function handleRtmPinAdded(pin) {
  console.log('Got pin', pin);
    db.addPin(pin.user, pin.item_user, pin.item.channel,
              reaction.item.message.ts, (err) => {
                if(err) {
                  console.error(err);
                } else {
                  console.log('Message successfully pinned');
                  sendMessage(`Pin'd! See all the pins in ` +
                                  `<#${message.channel}> over at ` +
                                  getPinUrl(pin.user, pin.item.channel),
                                  pin.user);
                }
              });
});

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  console.log('Got message', message);
  let uniq = _.uniq(_.words(message.text.toLowerCase()));
  if(_.intersection(uniq, ['pins', 'pin']).length >= 1) {
    if(_.intersection(uniq, ['show', 'list', 'all']).length >= 1) {
      sendMessage(`Hey <@${message.user}>! ` +
                      `You can view the pins in <#${message.channel}> over at ` +
                     `${getPinUrl(message.user, message.channel)}`,
                     message.user);
    }
  }
});

function getPinUrl(user, channel) {
  return `http://${process.env.URL}` +
    ((process.env.PORT && process.env.PORT != 80) ? ':' + process.env.PORT : '') +
    `/${channel}?t=${db.getToken(user, channel)}`;
}

rtm.start();

