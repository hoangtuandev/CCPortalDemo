'use strict';

const session = require('express-session');
const config  = require('../config');
const store   = require('../lib/session-store');

module.exports = session({
  store,
  secret:            config.sessionSecret,
  resave:            false,
  saveUninitialized: false,
  rolling:           true,
  cookie: {
    httpOnly:  true,
    sameSite:  'strict',
    secure:    config.https.enabled,
    maxAge:    config.session.idleMinutes * 60 * 1000,
  },
});
