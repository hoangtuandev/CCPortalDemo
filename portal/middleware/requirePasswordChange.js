'use strict';

const db = require('../lib/db');

const stmtMustChange = db.prepare(
  'SELECT must_change_password FROM users WHERE id = ?'
);

const EXEMPT = new Set(['/change-password', '/logout']);

module.exports = function requirePasswordChange(req, res, next) {
  if (EXEMPT.has(req.path)) return next();

  const row = stmtMustChange.get(req.session.userId);
  if (row?.must_change_password) {
    return res.redirect('/change-password');
  }

  next();
};
