"use strict";
const express = require('express');
const router = express.Router();
const db = require('../models/db.js');
const dateformat = require('dateformat');

const ResolveChannel = require('../utils/channelresolver.js');

let renderList = (req, res) => {
  db.listPins(genParams(req), function(err, pins) {
    if(err) {
      console.error(err);
      return res.render('error.ejs', {error: err});
    }

    let channelName = 'All Channels';
    if(req.params.channel) {
      channelName = ResolveChannel.formatted(req.params.channel);
    }
    res.render('main.ejs', { pins, dateformat, channelName });
  });
};

router.get('/all', renderList);
router.get('/:channel', renderList);

router.get('/404', function(req, res) {
  res.render('404.ejs');
});

function genParams(req) {
  let obj = {};
  if(req.params.channel) {
    obj.channel = req.params.channel;
  }

  if(req.query.user) {
    obj.user = req.query.user;
  }

  if(req.query.since) {
    obj.since = req.query.since;
  }

  if(req.query.until) {
    obj.until = req.query.until;
  }

  return obj;
};

module.exports = router;
