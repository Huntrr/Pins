"use strict";

const async = require('async');
const marked = require('marked');
const low = require('lowdb');
const WebClient = require('@slack/client').WebClient;
const web = new WebClient(process.env['SLACK_API_TOKEN']);

const ResolveUser = require('../utils/userresolver.js');
const ResolveChannel = require('../utils/channelresolver.js');
const ResolveEmoji = require('../utils/emojiresolver.js');

const db = low('db.json');
db.defaults({ tokens: [] })
  .value();

function filterChannel(channel, data) {
  let query = db.get(TOKEN + channel);
  if(data.user) {
    query = query.filter({ pinee: data.user });
  }

  return query.sortBy('ts').value();
};

// formats channel and user and emojis
function preprocess(content) {
  // first process channel names
  let i = content.indexOf('<#');
  while(i >= 0) {
    let j = content.indexOf('|', i);
    let channelId = content.substring(i + 2, j);
    j = content.indexOf('>',  j);

    if(ResolveChannel.formatted(channelId)) {
      content = content.substring(0, i) + ResolveChannel.formatted(channelId) +
        content.substring(j + 1);
    }

    i = content.indexOf('<#', i + 1);
  }

  // then process names
  i = content.indexOf('<@');
  while(i >= 0) {
    let j = content.indexOf('>', i);
    let userId = content.substring(i + 2, j);

    content = content.substring(0, i) + ResolveUser.formatted(userId) +
      content.substring(j + 1);

    i = content.indexOf('<@', i + 1);
  }

  // and finally emojis
  i = content.indexOf(':');
  while(i >= 0) {
    let j = content.indexOf(':', i + 1);
    let emoji = content.substring(i + 1, j);

    let formatted = ResolveEmoji(emoji);
    if(formatted) {
      content = content.substring(0, i) + formatted +
        content.substring(j + 1);
      i = content.indexOf(':', j + 1);
    } else {
      i = j;
    }

  }

  return content;
}

const TOKEN = '#';



let self = {
  addPin(pinner, pinee, channel, ts, cb) {
    if(!db.has(TOKEN + channel).value()) {
      db.set(TOKEN + channel, []).value();
    }

    console.log('Removing pin from ', channel);
    // rmeove the pin first if it's already there
    self.removePin(pinee, channel, ts, (err, res) => {
      // add the pin
      console.log('(Re)adding pin to ', channel);
      console.log(db.get(TOKEN + channel).value());
      let val = db.get(TOKEN + channel)
                  .push({channel, pinner, pinee, ts })
                  .value();

      cb(null, val);
    });
  },

  removePin(pinee, channel, ts, cb) {
    if(!db.has(TOKEN + channel)) {
      db.set(TOKEN + channel, []).value();
    }

    let val = db.get(TOKEN + channel)
                .remove({ pinee, ts })
                .value();
    
    cb(null, val);
  },

  loadFromSlack(botId) {
    console.log('LOADING FROM SLACK');
    // get all channel names
    let channelIds = Object.keys(db.getState())
    .filter(x => x.substring(0, 1) == TOKEN)
    .map(x => x.substring(1))

    async.forEach(channelIds, function(id) {
      console.log('Loading pins for ', ResolveChannel.pure(id));
      web.pins.list(id, function(err, data) {
        let items = data.items;
        if(items) {
          items.filter(x => x.created_by != botId && x.type == 'message')
          .forEach(function(item) {
            console.log(' - adding item with ts ', item.message.ts);
            self.addPin(item.created_by, item.message.user, item.channel,
                   item.message.ts, (err, res) => {});
          });
        }
      });
    });
  },

  listPins(data, cb) {
    let tsList = [];
    if(data.channel) {
      tsList = filterChannel(data.channel, data);
    } else {
      Object.keys(db.getState())
      .filter(x => x.substring(0, 1) == TOKEN)
      .map(x => x.substring(1))
      .forEach(key => { 
        filterChannel(key, data).forEach((d) => {
          tsList.push(d)
        }); 
      });
      
      tsList = tsList.sort((x, y) => y - x);
    }

    // tsList now contains everything sorted by date. 
    if(data.since) {
      tsList = tsList.filter(pin => pin.ts >= data.since);
    }

    if(data.until) {
      tsList = tsList.filter(pin => pin.ts <= data.until);
    }

    // need to map each pin to the format
    // { image, author, content, ts, score, channelName }
    async.map(tsList, function(pin, callback) {
      web.channels.history(pin.channel, {
        latest: pin.ts,
        oldest: pin.ts,
        inclusive: 1
      }, function(err, results) {
        if(err) {
          return cb(err, null);
        }

        let result = {};
        result.image = ResolveUser.image(pin.pinee);
        result.author = ResolveUser.pure(pin.pinee);

        result.channelName = ResolveChannel.pure(pin.channel);

        let msg = results.messages[0];
        if(msg) {
          result.content = (marked(preprocess(msg['text'])));
          result.ts = msg['ts'];
          result.score = 0;
          if(msg.reactions) {
            msg.reactions.forEach(x => result.score += x['count']);
          }
        }

        callback(err, result);
      });
    }, function(err, list) {
      if(list) {
        list = list.sort((x, y) => y.score - x.score);
      }

      cb(err, list);
    });
  },

  getToken(user, channel, cb) {
    let val = Math.floor(Math.random() * 9999999999999999999).toString(36);
   /* let cur = db.get('tokens').value();
    cur.push({ value: val });
    db.set('tokens', cur).value();

    cur = db.get('tokens').value();
    cur.push({ value: "10" });
    db.set('tokens', cur).value();
    console.log("AFTER: ", db.get('tokens').value());
    db.write();*/

    setTimeout(() => {
      db.get('tokens').push({ value: val }).value();
      console.log("AFTER: ", db.get('tokens').value());
    }, 100);

    return val;
  },

  checkToken(token, cb) {
    console.log("CHECKING TOKEN", token);
    let count = db.get('tokens')
                  .filter({ value: token })
                  .size()
                  .value();

    db.get('tokens').remove({ value: token }).value();

    cb(null, count >= 1);
  },

  clearTokens(cb) {
    cb(null, db.set('tokens', []).value());
  }
};

// load existing pins ???

module.exports = self;
