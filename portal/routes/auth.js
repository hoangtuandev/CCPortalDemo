'use strict';

const express = require('express');
const db      = require('../lib/db');
const { hash, verify, validate } = require('../lib/password');
const logger  = require('../lib/logger');
const store   = require('../lib/session-store');
const config  = require('../config');

const { audit } = require('../lib/audit');

const router = express.Router();

const stmtFindUser = db.prepare(`
  SELECT u.id, u.username, u.full_name, u.password_hash,
         u.is_active, u.must_change_password,
         u.failed_login_count, u.locked_until,
         r.is_admin
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.username = ?
`);

const stmtResetCounter = db.prepare(
  'UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?'
);

const stmtIncrCounter = db.prepare(
  'UPDATE users SET failed_login_count = failed_login_count + 1 WHERE id = ?'
);

const stmtLockUser = db.prepare(
  'UPDATE users SET locked_until = ?, failed_login_count = 0 WHERE id = ?'
);

// GET /login
router.get('/login', (req, res) => {
  if (req.session.userId) return res.redirect('/');

  const error = req.session.flash?.error ?? null;
  delete req.session.flash;

  res.render('login', { error });
});

// POST /login
router.post('/login', async (req, res) => {
  const username = (req.body.username ?? '').trim();
  const password = req.body.password ?? '';
  const ip = req.ip;

  const fail = (reason, message) => {
    logger.warn('login_failed', { username, reason, ip });
    audit(req, 'login_failed', { reason }, { username });
    req.session.flash = { error: message };
    return res.redirect('/login');
  };

  const user = stmtFindUser.get(username);
  if (!user) return fail('user_not_found', 'Tên đăng nhập hoặc mật khẩu không đúng');

  if (!user.is_active) return fail('account_inactive', 'Tài khoản đã bị khóa. Liên hệ quản trị viên.');

  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return fail('temp_locked', 'Tài khoản tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau.');
  }

  const passwordOk = await verify(password, user.password_hash);
  if (!passwordOk) {
    const newCount = user.failed_login_count + 1;
    if (newCount >= config.lock.threshold) {
      const lockedUntil = new Date(Date.now() + config.lock.durationMinutes * 60 * 1000).toISOString();
      stmtLockUser.run(lockedUntil, user.id);
      logger.warn('account_temp_locked', { username, ip });
      return fail('temp_locked', `Tài khoản bị tạm khóa ${config.lock.durationMinutes} phút do nhập sai quá nhiều lần.`);
    }
    stmtIncrCounter.run(user.id);
    return fail('wrong_password', 'Tên đăng nhập hoặc mật khẩu không đúng');
  }

  // Đăng nhập thành công
  stmtResetCounter.run(user.id);

  req.session.regenerate((err) => {
    if (err) {
      logger.error('session_regenerate_failed', { username, error: err.message });
      req.session.flash = { error: 'Lỗi hệ thống. Vui lòng thử lại.' };
      return res.redirect('/login');
    }

    req.session.userId   = user.id;
    req.session.username = user.username;
    req.session.loginAt  = Date.now();
    req.session.isAdmin  = !!user.is_admin;

    audit(req, 'login');
    logger.info('login', { username, ip });
    res.redirect('/');
  });
});

// GET /change-password
router.get('/change-password', (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  const error = req.session.flash?.error ?? null;
  delete req.session.flash;
  res.render('change-password', { error });
});

// POST /change-password
const stmtGetUserById = db.prepare(
  'SELECT id, username, password_hash FROM users WHERE id = ?'
);
const stmtUpdatePassword = db.prepare(
  'UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?'
);

router.post('/change-password', async (req, res) => {
  if (!req.session.userId) return res.redirect('/login');

  const oldPassword     = req.body.oldPassword ?? '';
  const newPassword     = req.body.newPassword ?? '';
  const confirmPassword = req.body.confirmPassword ?? '';

  const fail = (message) => {
    req.session.flash = { error: message };
    return res.redirect('/change-password');
  };

  const user = stmtGetUserById.get(req.session.userId);
  if (!user) return fail('Không tìm thấy tài khoản.');

  const oldOk = await verify(oldPassword, user.password_hash);
  if (!oldOk) return fail('Mật khẩu hiện tại không đúng.');

  if (newPassword !== confirmPassword) return fail('Mật khẩu mới nhập lại không khớp.');

  const validation = validate(newPassword, user.username);
  if (!validation.ok) return fail(validation.reason);

  const sameAsOld = await verify(newPassword, user.password_hash);
  if (sameAsOld) return fail('Mật khẩu mới phải khác mật khẩu hiện tại.');

  const newHash = await hash(newPassword);
  stmtUpdatePassword.run(newHash, user.id);

  store.destroyByUser(user.id, req.sessionID);

  audit(req, 'password_changed');
  logger.info('password_changed', { username: user.username, ip: req.ip });

  res.redirect('/');
});

// POST /logout
router.post('/logout', (req, res) => {
  const username = req.session.username;
  const ip = req.ip;
  audit(req, 'logout');
  req.session.destroy((err) => {
    if (err) logger.error('session_destroy_failed', { error: err.message });
    logger.info('logout', { username, ip });
    res.redirect('/login');
  });
});

module.exports = router;
