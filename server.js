"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const expressSession = require('express-session');
const db = require('./models/db.js');

/**
 * constants
 */
const PORT = process.env.PORT || 3000;


/**
 * initialize express
 */
let app = express();
app.locals.year = (new Date()).getFullYear();
app.locals.name = "Pins";
app.locals.org = process.env['ORG'];

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.use(expressSession({
  secret: process.env['SESSION_SECRET'],
  resave: false,
  saveUninitialized: true
}));

// serves all files in public at localhost:3000/public/URI
app.use('/public', express.static('public'));

// adds a req.flash function to show a message ONLY on the next page render
app.use(function(req, res, next) {
  // defines the flash function
  req.flash = function(msg) {
    req.session.flash = msg;
  };

  // extends render to inject the flash into the local variables
  var render = res.render;
  res.render = function () {
    res.locals.flash = false;

    if(req.session.flash) {
      res.locals.flash = req.session.flash
      req.session.flash = false;
    }

    // call the old render with the updated res as the context
    // and the previous args as arguments
    render.apply(res, arguments);
  }

  // continue on
  next();
});

app.use(function(req, res, next) {
  // should parse req.query.t to figure out if the user
  // is auth'd or not
  
  if(req.session.verified) {
    let timeElapsed = Date.now() - req.session.tvs;
    timeElapsed /= 1000;
    timeElapsed /= 60;

    if(timeElapsed > 60) {
      req.session.verified = false;
      res.render('404.ejs');
    } else {
      next();
    }
  } else {
    db.checkToken(req.query.t, (err, result) => {
      if(err || !result) {
        res.render('404.ejs');
      } else {
        req.session.verified = true;
        req.session.vts = Date.now();
        next();
      }
    });
  }

});


// sets up routers
app.use('/', require('./routes/main'));

app.use(function(req, res) {
  res.render('404.ejs');
});

app.listen(PORT || 3000, function() {
  console.log(`Server running on port ${PORT || 3000}. Open http://${process.env.URL}:${PORT || 3000}/`);
});
