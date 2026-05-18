'use strict';

module.exports = function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) {
    return res.status(403).send('403 — Bạn không có quyền truy cập trang này.');
  }
  next();
};
