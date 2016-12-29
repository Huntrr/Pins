"use strict";

const async = require('async');
const marked = require('marked');
const low = require('lowdb');
const WebClient = require('@slack/client').WebClient;
const web = new WebClient(process.env['SLACK_API_TOKEN']);

const db = low('db.json');
db.defaults({ tokens: [] })
  .value();

function filterChannel(channel, data) {
  let query = db.get('#' + data.channel);
  if(data.user) {
    query = query.filter({ pinee: data.user });
  }

  return query.sortBy('ts').value();
};

let self = {
  addPin(pinner, pinee, channel, ts, cb) {
    if(!db.has('#' + channel)) {
      db.set('#' + channel, []).value();
    }

    // rmeove the pin first if it's already there
    self.removePin(pinee, channel, ts, (err, res) => {
      // add the pin
      let val = db.get('#' + channel)
                  .push({channel, pinner, pinee, ts })
                  .value();

      cb(null, val);
    });
  },

  removePin(pinee, channel, ts, cb) {
    if(!db.has('#' + channel)) {
      db.set('#' + channel, []).value();
    }

    let val = db.get('#' + channel)
                .remove({ pinee, ts })
                .value();
    
    cb(null, val);
  },

  listPins(data, cb) {
    let tsList = [];
    if(data.channel) {
      tsList = filterChannel(data.channel, data);
    } else {
      Object.keys(db.getState())
      .filter(x => x.substring(0, 1) == '#')
      .map(x => x.substring(1))
      .forEach(key => { filterChannel(key, data).forEach(tsList.push); });
      
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
      async.map(['image', 'message', 'channel'], function(type, _callback) {
        if(type == 'image') {
          web.users.profile.get({ user: pin.pinee }, _callback);
        } else if(type == 'message') {
          web.channels.history(pin.channel, {
            latest: pin.ts,
            oldest: pin.ts,
            inclusive: 1
          }, _callback);
        } else if(type == 'channel') {
          web.channels.info(pin.channel, _callback);
        } else {
          _callback('invalid type', type);
        }

      }, function(err, results) {
        if(err) {
          return cb(err, null);
        }

        let result = {};
        result.image = results[0].profile['image_72'];
        result.author = results[0].profile['first_name'];

        result.channelName = results[2].channel.name;
        
        let msg = results[1].messages[0];
        if(msg) {
          result.content = marked(msg['text']);
          result.ts = msg['ts'];
          result.score = 0;
          if(msg.reactions) {
            msg.reactions.forEach(x => result.score += score['count']);
          }
        }

        callback(err, result);
      });
    }, cb);
  },

  getToken(user, channel, cb) {
    let val = Math.floor(Math.random() * 99999999999999999).toString(36);
    db.get('tokens')
      .push({ value: val })
      .value()

    return val;
  },

  checkToken(token, cb) {
    let count = db.get('tokens')
                  .filter({ value: token })
                  .size()
                  .value();

    db.get('tokens').remove({ value: token }).value();

    cb(null, count >= 1);
  }
};

// load existing pins ???

module.exports = self;
