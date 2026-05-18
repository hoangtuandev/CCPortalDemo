'use strict';

const config      = require('../config');
const { audit }   = require('../lib/audit');

const absoluteMs = config.session.absoluteHours * 60 * 60 * 1000;

module.exports = function requireLogin(req, res, next) {
  if (!req.session.userId || !req.session.loginAt) {
    return res.redirect('/login');
  }

  if (Date.now() - req.session.loginAt > absoluteMs) {
    audit(req, 'session_expired');
    return req.session.destroy(() => res.redirect('/login'));
  }

  next();
};
