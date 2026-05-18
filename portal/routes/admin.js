'use strict';

const express            = require('express');
const db                 = require('../lib/db');
const { hash, validate } = require('../lib/password');
const { audit }          = require('../lib/audit');
const store              = require('../lib/session-store');

const router = express.Router();

const PAGE_SIZE   = 50;
const USERNAME_RE = /^[a-z][a-z0-9_]{2,29}$/;
const BARCODE_RE  = /^\d{8,20}$/;
const ROLE_RE     = /^[a-z][a-z0-9_]{2,29}$/;
const SLUG_RE     = /^[a-z][a-z0-9-]{0,48}$/;
const STATUSES    = ['stable', 'beta', 'disabled'];

const ACTIONS = [
  'login', 'login_failed', 'logout', 'session_expired', 'password_changed',
  'admin_user_created', 'admin_user_modified',
  'admin_role_created', 'admin_role_modified', 'admin_role_deleted',
  'admin_app_created', 'admin_app_modified', 'admin_app_deleted',
  'admin_permissions_modified',
];

router.get('/', (req, res) => res.redirect('/admin/overview'));

router.get('/overview', (req, res) => {
  const { activeUsers }  = db.prepare("SELECT COUNT(*) AS activeUsers  FROM users WHERE is_active = 1").get();
  const { lockedUsers }  = db.prepare("SELECT COUNT(*) AS lockedUsers  FROM users WHERE is_active = 0").get();
  const { totalRoles }   = db.prepare("SELECT COUNT(*) AS totalRoles   FROM roles").get();

  const today = "date('now', 'localtime')";
  const { loginToday }   = db.prepare(
    `SELECT COUNT(*) AS loginToday  FROM activity_logs WHERE action = 'login'        AND date(created_at, 'localtime') = ${today}`
  ).get();
  const { failedToday }  = db.prepare(
    `SELECT COUNT(*) AS failedToday FROM activity_logs WHERE action = 'login_failed' AND date(created_at, 'localtime') = ${today}`
  ).get();

  const recentLogs = db.prepare(`
    SELECT id, username, action, ip_address, created_at
    FROM activity_logs
    ORDER BY id DESC
    LIMIT 10
  `).all();

  res.render('admin/overview', {
    username: req.session.username,
    stats: { activeUsers, lockedUsers, totalRoles, loginToday, failedToday },
    recentLogs,
  });
});

// ─── Activity logs ────────────────────────────────────────────────────────────

router.get('/logs', (req, res) => {
  const page     = Math.max(1, parseInt(req.query.page) || 1);
  const username = (req.query.username ?? '').trim();
  const action   = req.query.action ?? '';
  const from     = req.query.from   ?? '';
  const to       = req.query.to     ?? '';

  const conditions = [];
  const params     = [];

  if (username) {
    conditions.push('username LIKE ?');
    params.push(`%${username}%`);
  }
  if (action && ACTIONS.includes(action)) {
    conditions.push('action = ?');
    params.push(action);
  }
  if (from) {
    conditions.push("created_at >= ?");
    params.push(from + ' 00:00:00');
  }
  if (to) {
    conditions.push("created_at <= ?");
    params.push(to + ' 23:59:59');
  }

  const where  = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (page - 1) * PAGE_SIZE;

  const { total } = db.prepare(
    `SELECT COUNT(*) AS total FROM activity_logs ${where}`
  ).get(...params);

  const logs = db.prepare(`
    SELECT id, username, action, ip_address, details, created_at
    FROM activity_logs
    ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, PAGE_SIZE, offset);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  res.render('admin/logs', {
    username:   req.session.username,
    logs,
    filter:     { username, action, from, to },
    pagination: { page, totalPages, total },
    actions:    ACTIONS,
  });
});

// ─── Roles list ──────────────────────────────────────────────────────────────

router.get('/roles', (req, res) => {
  const flash = req.session.flash ?? {};
  delete req.session.flash;

  const roles = db.prepare(`
    SELECT r.id, r.name, r.display_name, r.description, r.is_admin,
           COUNT(u.id) AS user_count
    FROM roles r
    LEFT JOIN users u ON u.role_id = r.id
    GROUP BY r.id
    ORDER BY r.display_name
  `).all();

  res.render('admin/roles', {
    username: req.session.username,
    roles,
    success: flash.success ?? null,
  });
});

// ─── Create role ─────────────────────────────────────────────────────────────

router.get('/roles/new', (req, res) => {
  const flash = req.session.flash ?? {};
  delete req.session.flash;

  res.render('admin/roles-new', {
    username: req.session.username,
    error: flash.error ?? null,
    form:  flash.form  ?? {},
  });
});

router.post('/roles', (req, res) => {
  const nameRaw        = (req.body.name         ?? '').trim().toLowerCase();
  const displayNameRaw = (req.body.display_name  ?? '').trim();
  const descriptionRaw = (req.body.description   ?? '').trim() || null;
  const isAdmin        = req.body.is_admin === '1' ? 1 : 0;

  const fail = (message) => {
    req.session.flash = {
      error: message,
      form: { name: nameRaw, display_name: displayNameRaw, description: descriptionRaw ?? '', is_admin: isAdmin },
    };
    return res.redirect('/admin/roles/new');
  };

  if (!ROLE_RE.test(nameRaw)) {
    return fail('Mã vai trò phải bắt đầu bằng chữ thường, chỉ dùng a–z, 0–9, dấu gạch dưới, dài 3–30 ký tự.');
  }
  if (!displayNameRaw) return fail('Tên hiển thị không được để trống.');

  if (db.prepare('SELECT id FROM roles WHERE name = ?').get(nameRaw)) {
    return fail(`Mã vai trò "${nameRaw}" đã tồn tại.`);
  }

  db.prepare(
    'INSERT INTO roles (name, display_name, description, is_admin) VALUES (?, ?, ?, ?)'
  ).run(nameRaw, displayNameRaw, descriptionRaw, isAdmin);

  audit(req, 'admin_role_created', { name: nameRaw, display_name: displayNameRaw, is_admin: isAdmin });

  req.session.flash = { success: `Đã tạo vai trò "${displayNameRaw}" thành công.` };
  res.redirect('/admin/roles');
});

// ─── Edit role ───────────────────────────────────────────────────────────────

router.get('/roles/:id/edit', (req, res) => {
  const flash = req.session.flash ?? {};
  delete req.session.flash;

  const role = db.prepare('SELECT id, name, display_name, description, is_admin FROM roles WHERE id = ?')
    .get(parseInt(req.params.id) || 0);
  if (!role) {
    req.session.flash = { error: 'Không tìm thấy vai trò.' };
    return res.redirect('/admin/roles');
  }

  const { userCount } = db.prepare('SELECT COUNT(*) AS userCount FROM users WHERE role_id = ?').get(role.id);

  res.render('admin/roles-edit', {
    username:  req.session.username,
    role,
    userCount,
    error:   flash.error   ?? null,
    success: flash.success ?? null,
    form:    flash.form    ?? null,
  });
});

router.post('/roles/:id', (req, res) => {
  const roleId = parseInt(req.params.id) || 0;
  const role   = db.prepare('SELECT id, name, display_name, description, is_admin FROM roles WHERE id = ?').get(roleId);
  if (!role) {
    req.session.flash = { error: 'Không tìm thấy vai trò.' };
    return res.redirect('/admin/roles');
  }

  const displayNameRaw = (req.body.display_name ?? '').trim();
  const descriptionRaw = (req.body.description  ?? '').trim() || null;
  const isAdmin        = req.body.is_admin === '1' ? 1 : 0;

  const fail = (message) => {
    req.session.flash = {
      error: message,
      form: { display_name: displayNameRaw, description: descriptionRaw ?? '', is_admin: isAdmin },
    };
    return res.redirect(`/admin/roles/${roleId}/edit`);
  };

  if (!displayNameRaw) return fail('Tên hiển thị không được để trống.');

  // Bảo vệ admin cuối: không cho hạ is_admin nếu role này chứa admin active duy nhất
  if (role.is_admin && !isAdmin) {
    const { cnt } = db.prepare(`
      SELECT COUNT(*) AS cnt FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE r.is_admin = 1 AND u.is_active = 1 AND u.role_id != ?
    `).get(roleId);
    if (cnt === 0) {
      return fail('Không thể bỏ quyền admin: vai trò này đang chứa admin hoạt động duy nhất của hệ thống.');
    }
  }

  const diff = {};
  if (role.display_name !== displayNameRaw)        diff.display_name = { from: role.display_name, to: displayNameRaw };
  if ((role.description ?? null) !== descriptionRaw) diff.description = { from: role.description ?? null, to: descriptionRaw };
  if (role.is_admin !== isAdmin)                   diff.is_admin = { from: role.is_admin, to: isAdmin };

  if (Object.keys(diff).length === 0) {
    req.session.flash = { success: 'Không có thay đổi nào được ghi nhận.' };
    return res.redirect('/admin/roles');
  }

  db.prepare('UPDATE roles SET display_name = ?, description = ?, is_admin = ? WHERE id = ?')
    .run(displayNameRaw, descriptionRaw, isAdmin, roleId);

  audit(req, 'admin_role_modified', { role_name: role.name, diff });

  req.session.flash = { success: `Đã cập nhật vai trò "${role.name}".` };
  res.redirect('/admin/roles');
});

// ─── Delete role ─────────────────────────────────────────────────────────────

router.post('/roles/:id/delete', (req, res) => {
  const roleId = parseInt(req.params.id) || 0;
  const role   = db.prepare('SELECT id, name, display_name FROM roles WHERE id = ?').get(roleId);
  if (!role) {
    req.session.flash = { error: 'Không tìm thấy vai trò.' };
    return res.redirect('/admin/roles');
  }

  const { userCount } = db.prepare('SELECT COUNT(*) AS userCount FROM users WHERE role_id = ?').get(roleId);
  if (userCount > 0) {
    req.session.flash = { error: `Không thể xóa: vai trò "${role.display_name}" còn ${userCount} tài khoản. Hãy chuyển tất cả tài khoản sang vai trò khác trước.` };
    return res.redirect(`/admin/roles/${roleId}/edit`);
  }

  db.prepare('DELETE FROM roles WHERE id = ?').run(roleId);
  audit(req, 'admin_role_deleted', { role_name: role.name, display_name: role.display_name });

  req.session.flash = { success: `Đã xóa vai trò "${role.display_name}".` };
  res.redirect('/admin/roles');
});

// ─── Users list ──────────────────────────────────────────────────────────────

router.get('/users', (req, res) => {
  const flash  = req.session.flash ?? {};
  delete req.session.flash;

  const roles = db.prepare('SELECT id, display_name FROM roles ORDER BY display_name').all();

  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const roleId = req.query.role   ? parseInt(req.query.role) : null;
  const status = req.query.status || '';
  const now    = new Date().toISOString();

  const conditions = [];
  const params = [];

  if (roleId) {
    conditions.push('u.role_id = ?');
    params.push(roleId);
  }

  if (status === 'active') {
    conditions.push('u.is_active = 1 AND (u.locked_until IS NULL OR u.locked_until <= ?)');
    params.push(now);
  } else if (status === 'locked') {
    conditions.push('u.is_active = 0');
  } else if (status === 'temp-locked') {
    conditions.push('u.locked_until IS NOT NULL AND u.locked_until > ?');
    params.push(now);
  }

  const where  = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const offset = (page - 1) * PAGE_SIZE;

  const { total } = db.prepare(
    `SELECT COUNT(*) AS total FROM users u ${where}`
  ).get(...params);

  const users = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.is_active, u.locked_until, u.created_at,
           r.display_name AS role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    ${where}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, PAGE_SIZE, offset);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  const usersWithStatus = users.map(u => ({
    ...u,
    statusLabel: !u.is_active                               ? 'locked'
               : (u.locked_until && u.locked_until > now)  ? 'temp-locked'
               : 'active',
  }));

  res.render('admin/users', {
    username: req.session.username,
    users: usersWithStatus,
    roles,
    filter: { roleId, status },
    pagination: { page, totalPages, total },
    success: flash.success ?? null,
  });
});

// ─── Create user ─────────────────────────────────────────────────────────────

router.get('/users/new', (req, res) => {
  const flash = req.session.flash ?? {};
  delete req.session.flash;

  const roles = db.prepare('SELECT id, display_name FROM roles ORDER BY display_name').all();
  res.render('admin/users-new', {
    username: req.session.username,
    roles,
    error: flash.error ?? null,
    form:  flash.form  ?? {},
  });
});

router.post('/users', async (req, res) => {
  const usernameRaw  = (req.body.username  ?? '').trim().toLowerCase();
  const fullNameRaw  = (req.body.full_name ?? '').trim();
  const passwordRaw  = req.body.password   ?? '';
  const roleIdRaw    = parseInt(req.body.role_id) || 0;
  const barcodeRaw   = (req.body.barcode   ?? '').trim() || null;

  const fail = (message) => {
    req.session.flash = {
      error: message,
      form: { username: usernameRaw, full_name: fullNameRaw, role_id: roleIdRaw, barcode: barcodeRaw ?? '' },
    };
    return res.redirect('/admin/users/new');
  };

  if (!USERNAME_RE.test(usernameRaw)) {
    return fail('Tên đăng nhập phải bắt đầu bằng chữ thường, chỉ dùng a–z, 0–9, dấu gạch dưới, dài 3–30 ký tự.');
  }
  if (!fullNameRaw) {
    return fail('Họ tên không được để trống.');
  }

  const pwCheck = validate(passwordRaw, usernameRaw);
  if (!pwCheck.ok) return fail(pwCheck.reason);

  if (!roleIdRaw) return fail('Vui lòng chọn vai trò.');

  const roleExists = db.prepare('SELECT id FROM roles WHERE id = ?').get(roleIdRaw);
  if (!roleExists) return fail('Vai trò không hợp lệ.');

  if (barcodeRaw && !BARCODE_RE.test(barcodeRaw)) {
    return fail('Barcode chỉ được gồm chữ số, dài 8–20 ký tự.');
  }

  if (db.prepare('SELECT id FROM users WHERE username = ?').get(usernameRaw)) {
    return fail(`Tên đăng nhập "${usernameRaw}" đã tồn tại.`);
  }

  if (barcodeRaw && db.prepare('SELECT id FROM users WHERE barcode = ?').get(barcodeRaw)) {
    return fail(`Barcode "${barcodeRaw}" đã được dùng bởi tài khoản khác.`);
  }

  const passwordHash = await hash(passwordRaw);

  db.prepare(`
    INSERT INTO users (username, password_hash, full_name, barcode, role_id, must_change_password)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(usernameRaw, passwordHash, fullNameRaw, barcodeRaw, roleIdRaw);

  audit(req, 'admin_user_created', { username: usernameRaw, full_name: fullNameRaw, role_id: roleIdRaw });

  req.session.flash = { success: `Đã tạo tài khoản "${usernameRaw}" thành công.` };
  res.redirect('/admin/users');
});

// ─── Edit user ───────────────────────────────────────────────────────────────

const stmtUserForEdit = db.prepare(`
  SELECT u.id, u.username, u.full_name, u.barcode, u.role_id, u.is_active, u.locked_until,
         r.is_admin AS role_is_admin
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE u.id = ?
`);

router.get('/users/:id/edit', (req, res) => {
  const flash  = req.session.flash ?? {};
  delete req.session.flash;

  const user = stmtUserForEdit.get(parseInt(req.params.id) || 0);
  if (!user) {
    req.session.flash = { error: 'Không tìm thấy tài khoản.' };
    return res.redirect('/admin/users');
  }

  const { logCount } = db.prepare(
    'SELECT COUNT(*) AS logCount FROM activity_logs WHERE user_id = ?'
  ).get(user.id);

  const roles = db.prepare('SELECT id, display_name, is_admin FROM roles ORDER BY display_name').all();
  res.render('admin/users-edit', {
    username: req.session.username,
    user,
    roles,
    hasLogs:  logCount > 0,
    now:      new Date().toISOString(),
    error:    flash.error   ?? null,
    success:  flash.success ?? null,
    form:     flash.form    ?? null,
  });
});

router.post('/users/:id', (req, res) => {
  const userId = parseInt(req.params.id) || 0;
  const user   = stmtUserForEdit.get(userId);
  if (!user) {
    req.session.flash = { error: 'Không tìm thấy tài khoản.' };
    return res.redirect('/admin/users');
  }

  const fullNameRaw = (req.body.full_name ?? '').trim();
  const roleIdRaw   = parseInt(req.body.role_id) || 0;
  const barcodeRaw  = (req.body.barcode ?? '').trim() || null;

  const fail = (message) => {
    req.session.flash = {
      error: message,
      form:  { full_name: fullNameRaw, role_id: roleIdRaw, barcode: barcodeRaw ?? '' },
    };
    return res.redirect(`/admin/users/${userId}/edit`);
  };

  if (!fullNameRaw) return fail('Họ tên không được để trống.');
  if (!roleIdRaw)   return fail('Vui lòng chọn vai trò.');

  const newRole = db.prepare('SELECT id, is_admin FROM roles WHERE id = ?').get(roleIdRaw);
  if (!newRole) return fail('Vai trò không hợp lệ.');

  if (barcodeRaw && !BARCODE_RE.test(barcodeRaw)) {
    return fail('Barcode chỉ được gồm chữ số, dài 8–20 ký tự.');
  }

  if (barcodeRaw) {
    const conflict = db.prepare('SELECT id FROM users WHERE barcode = ? AND id != ?').get(barcodeRaw, userId);
    if (conflict) return fail(`Barcode "${barcodeRaw}" đã được dùng bởi tài khoản khác.`);
  }

  // Bảo vệ admin cuối: không cho hạ role nếu đây là admin active duy nhất
  if (user.role_is_admin && !newRole.is_admin) {
    const { cnt } = db.prepare(`
      SELECT COUNT(*) AS cnt FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE r.is_admin = 1 AND u.is_active = 1 AND u.id != ?
    `).get(userId);
    if (cnt === 0) {
      return fail('Không thể thay đổi vai trò: đây là admin đang hoạt động duy nhất của hệ thống.');
    }
  }

  // Tính diff — chỉ log những gì thực sự thay đổi
  const diff = {};
  if (user.full_name !== fullNameRaw)          diff.full_name = { from: user.full_name,    to: fullNameRaw };
  if (user.role_id   !== roleIdRaw)            diff.role_id   = { from: user.role_id,      to: roleIdRaw };
  if ((user.barcode ?? null) !== barcodeRaw)   diff.barcode   = { from: user.barcode ?? null, to: barcodeRaw };

  if (Object.keys(diff).length === 0) {
    req.session.flash = { success: 'Không có thay đổi nào được ghi nhận.' };
    return res.redirect('/admin/users');
  }

  db.prepare('UPDATE users SET full_name = ?, role_id = ?, barcode = ? WHERE id = ?')
    .run(fullNameRaw, roleIdRaw, barcodeRaw, userId);

  audit(req, 'admin_user_modified', { target_username: user.username, diff });

  req.session.flash = { success: `Đã cập nhật tài khoản "${user.username}".` };
  res.redirect('/admin/users');
});

// ─── Reset password ──────────────────────────────────────────────────────────

router.post('/users/:id/reset-password', async (req, res) => {
  const userId = parseInt(req.params.id) || 0;
  const user   = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
  if (!user) {
    req.session.flash = { error: 'Không tìm thấy tài khoản.' };
    return res.redirect('/admin/users');
  }

  const passwordRaw = req.body.new_password ?? '';
  const pwCheck     = validate(passwordRaw, user.username);
  if (!pwCheck.ok) {
    req.session.flash = { error: pwCheck.reason };
    return res.redirect(`/admin/users/${userId}/edit`);
  }

  const passwordHash = await hash(passwordRaw);
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?')
    .run(passwordHash, userId);

  // Invalidate toàn bộ session của user này (truyền '' để không exempt session nào)
  store.destroyByUser(userId, '');

  audit(req, 'password_changed', { target_username: user.username, context: 'admin_reset' });

  req.session.flash = { success: `Đã đặt lại mật khẩu cho "${user.username}". User sẽ bị yêu cầu đổi mật khẩu khi đăng nhập.` };
  res.redirect('/admin/users');
});

// ─── Delete user ─────────────────────────────────────────────────────────────

router.post('/users/:id/delete', (req, res) => {
  const userId = parseInt(req.params.id) || 0;
  const user   = db.prepare(`
    SELECT u.id, u.username, r.is_admin
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.id = ?
  `).get(userId);

  if (!user) {
    req.session.flash = { error: 'Không tìm thấy tài khoản.' };
    return res.redirect('/admin/users');
  }

  const fail = (message) => {
    req.session.flash = { error: message };
    return res.redirect(`/admin/users/${userId}/edit`);
  };

  const { logCount } = db.prepare(
    'SELECT COUNT(*) AS logCount FROM activity_logs WHERE user_id = ?'
  ).get(userId);
  if (logCount > 0) {
    return fail(`Không thể xóa: tài khoản "${user.username}" đã có hoạt động trong hệ thống. Hãy khóa tài khoản thay vì xóa.`);
  }

  // Bảo vệ admin cuối
  if (user.is_admin) {
    const { cnt } = db.prepare(`
      SELECT COUNT(*) AS cnt FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE r.is_admin = 1 AND u.is_active = 1 AND u.id != ?
    `).get(userId);
    if (cnt === 0) {
      return fail('Không thể xóa: đây là admin đang hoạt động duy nhất của hệ thống.');
    }
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);

  audit(req, 'admin_user_modified', { action: 'deleted', username: user.username });

  req.session.flash = { success: `Đã xóa tài khoản "${user.username}".` };
  res.redirect('/admin/users');
});

// ─── Lock / unlock account ───────────────────────────────────────────────────

router.post('/users/:id/unlock-temp', (req, res) => {
  const userId = parseInt(req.params.id) || 0;
  const user   = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
  if (!user) {
    req.session.flash = { error: 'Không tìm thấy tài khoản.' };
    return res.redirect('/admin/users');
  }

  db.prepare('UPDATE users SET locked_until = NULL, failed_login_count = 0 WHERE id = ?').run(userId);
  audit(req, 'admin_user_modified', { target_username: user.username, action: 'unlock_temp' });

  req.session.flash = { success: `Đã mở khóa tạm thời cho "${user.username}".` };
  res.redirect(`/admin/users/${userId}/edit`);
});

router.post('/users/:id/lock', (req, res) => {
  const userId = parseInt(req.params.id) || 0;
  const user   = db.prepare(`
    SELECT u.id, u.username, r.is_admin
    FROM users u JOIN roles r ON r.id = u.role_id
    WHERE u.id = ?
  `).get(userId);
  if (!user) {
    req.session.flash = { error: 'Không tìm thấy tài khoản.' };
    return res.redirect('/admin/users');
  }

  // Bảo vệ admin cuối: không cho khóa nếu đây là admin active duy nhất
  if (user.is_admin) {
    const { cnt } = db.prepare(`
      SELECT COUNT(*) AS cnt FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE r.is_admin = 1 AND u.is_active = 1 AND u.id != ?
    `).get(userId);
    if (cnt === 0) {
      req.session.flash = { error: 'Không thể khóa: đây là admin đang hoạt động duy nhất của hệ thống.' };
      return res.redirect(`/admin/users/${userId}/edit`);
    }
  }

  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(userId);
  audit(req, 'admin_user_modified', { target_username: user.username, action: 'lock' });

  req.session.flash = { success: `Đã khóa tài khoản "${user.username}".` };
  res.redirect(`/admin/users/${userId}/edit`);
});

router.post('/users/:id/unlock', (req, res) => {
  const userId = parseInt(req.params.id) || 0;
  const user   = db.prepare('SELECT id, username FROM users WHERE id = ?').get(userId);
  if (!user) {
    req.session.flash = { error: 'Không tìm thấy tài khoản.' };
    return res.redirect('/admin/users');
  }

  db.prepare('UPDATE users SET is_active = 1 WHERE id = ?').run(userId);
  audit(req, 'admin_user_modified', { target_username: user.username, action: 'unlock' });

  req.session.flash = { success: `Đã kích hoạt lại tài khoản "${user.username}".` };
  res.redirect(`/admin/users/${userId}/edit`);
});

// ─── Apps list ───────────────────────────────────────────────────────────────

router.get('/apps', (req, res) => {
  const flash = req.session.flash ?? {};
  delete req.session.flash;

  const apps = db.prepare(`
    SELECT a.id, a.slug, a.name, a.description, a.icon, a.status, a.sort_order,
           COUNT(ap.role_id) AS role_count
    FROM apps a
    LEFT JOIN app_permissions ap ON ap.app_id = a.id
    GROUP BY a.id
    ORDER BY a.sort_order, a.name
  `).all();

  res.render('admin/apps', {
    username: req.session.username,
    apps,
    success: flash.success ?? null,
  });
});

// ─── Create app ──────────────────────────────────────────────────────────────

router.get('/apps/new', (req, res) => {
  const flash = req.session.flash ?? {};
  delete req.session.flash;

  res.render('admin/apps-new', {
    username: req.session.username,
    statuses: STATUSES,
    error: flash.error ?? null,
    form:  flash.form  ?? {},
  });
});

router.post('/apps', (req, res) => {
  const slugRaw        = (req.body.slug        ?? '').trim().toLowerCase();
  const nameRaw        = (req.body.name        ?? '').trim();
  const descriptionRaw = (req.body.description ?? '').trim() || null;
  const iconRaw        = (req.body.icon        ?? '').trim() || '📦';
  const statusRaw      = req.body.status ?? 'stable';
  const sortOrderRaw   = parseInt(req.body.sort_order) || 0;

  const fail = (message) => {
    req.session.flash = {
      error: message,
      form: { slug: slugRaw, name: nameRaw, description: descriptionRaw ?? '', icon: iconRaw, status: statusRaw, sort_order: sortOrderRaw },
    };
    return res.redirect('/admin/apps/new');
  };

  if (!SLUG_RE.test(slugRaw)) {
    return fail('Slug phải bắt đầu bằng chữ thường, chỉ dùng a–z, 0–9, dấu gạch ngang, tối đa 49 ký tự.');
  }
  if (!nameRaw)                          return fail('Tên ứng dụng không được để trống.');
  if (!STATUSES.includes(statusRaw))     return fail('Trạng thái không hợp lệ.');
  if (db.prepare('SELECT id FROM apps WHERE slug = ?').get(slugRaw)) {
    return fail(`Slug "${slugRaw}" đã tồn tại.`);
  }

  db.prepare(
    'INSERT INTO apps (slug, name, description, icon, status, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(slugRaw, nameRaw, descriptionRaw, iconRaw, statusRaw, sortOrderRaw);

  audit(req, 'admin_app_created', { slug: slugRaw, name: nameRaw, status: statusRaw });

  req.session.flash = { success: `Đã tạo ứng dụng "${nameRaw}" thành công.` };
  res.redirect('/admin/apps');
});

// ─── Edit app ────────────────────────────────────────────────────────────────

router.get('/apps/:id/edit', (req, res) => {
  const flash = req.session.flash ?? {};
  delete req.session.flash;

  const app = db.prepare('SELECT id, slug, name, description, icon, status, sort_order FROM apps WHERE id = ?')
    .get(parseInt(req.params.id) || 0);
  if (!app) {
    req.session.flash = { error: 'Không tìm thấy ứng dụng.' };
    return res.redirect('/admin/apps');
  }

  res.render('admin/apps-edit', {
    username: req.session.username,
    app,
    statuses: STATUSES,
    error:   flash.error   ?? null,
    success: flash.success ?? null,
    form:    flash.form    ?? null,
  });
});

router.post('/apps/:id', (req, res) => {
  const appId = parseInt(req.params.id) || 0;
  const app   = db.prepare('SELECT id, slug, name, description, icon, status, sort_order FROM apps WHERE id = ?').get(appId);
  if (!app) {
    req.session.flash = { error: 'Không tìm thấy ứng dụng.' };
    return res.redirect('/admin/apps');
  }

  const nameRaw        = (req.body.name        ?? '').trim();
  const descriptionRaw = (req.body.description ?? '').trim() || null;
  const iconRaw        = (req.body.icon        ?? '').trim() || '📦';
  const statusRaw      = req.body.status ?? 'stable';
  const sortOrderRaw   = parseInt(req.body.sort_order) || 0;

  const fail = (message) => {
    req.session.flash = {
      error: message,
      form: { name: nameRaw, description: descriptionRaw ?? '', icon: iconRaw, status: statusRaw, sort_order: sortOrderRaw },
    };
    return res.redirect(`/admin/apps/${appId}/edit`);
  };

  if (!nameRaw)                      return fail('Tên ứng dụng không được để trống.');
  if (!STATUSES.includes(statusRaw)) return fail('Trạng thái không hợp lệ.');

  const diff = {};
  if (app.name !== nameRaw)                          diff.name        = { from: app.name,        to: nameRaw };
  if ((app.description ?? null) !== descriptionRaw)  diff.description = { from: app.description, to: descriptionRaw };
  if (app.icon !== iconRaw)                          diff.icon        = { from: app.icon,        to: iconRaw };
  if (app.status !== statusRaw)                      diff.status      = { from: app.status,      to: statusRaw };
  if (app.sort_order !== sortOrderRaw)               diff.sort_order  = { from: app.sort_order,  to: sortOrderRaw };

  if (Object.keys(diff).length === 0) {
    req.session.flash = { success: 'Không có thay đổi nào được ghi nhận.' };
    return res.redirect('/admin/apps');
  }

  db.prepare('UPDATE apps SET name = ?, description = ?, icon = ?, status = ?, sort_order = ? WHERE id = ?')
    .run(nameRaw, descriptionRaw, iconRaw, statusRaw, sortOrderRaw, appId);

  audit(req, 'admin_app_modified', { slug: app.slug, diff });

  req.session.flash = { success: `Đã cập nhật ứng dụng "${app.slug}".` };
  res.redirect('/admin/apps');
});

// ─── Delete app ──────────────────────────────────────────────────────────────

router.post('/apps/:id/delete', (req, res) => {
  const appId = parseInt(req.params.id) || 0;
  const app   = db.prepare('SELECT id, slug, name FROM apps WHERE id = ?').get(appId);
  if (!app) {
    req.session.flash = { error: 'Không tìm thấy ứng dụng.' };
    return res.redirect('/admin/apps');
  }

  // app_permissions cascade delete theo ON DELETE CASCADE trong schema
  db.prepare('DELETE FROM apps WHERE id = ?').run(appId);
  audit(req, 'admin_app_deleted', { slug: app.slug, name: app.name });

  req.session.flash = { success: `Đã xóa ứng dụng "${app.name}".` };
  res.redirect('/admin/apps');
});

// ─── Permissions matrix ──────────────────────────────────────────────────────

router.get('/apps/:id/permissions', (req, res) => {
  const flash = req.session.flash ?? {};
  delete req.session.flash;

  const app = db.prepare('SELECT id, slug, name FROM apps WHERE id = ?')
    .get(parseInt(req.params.id) || 0);
  if (!app) {
    req.session.flash = { error: 'Không tìm thấy ứng dụng.' };
    return res.redirect('/admin/apps');
  }

  const roles = db.prepare('SELECT id, name, display_name, is_admin FROM roles ORDER BY display_name').all();
  const grantedIds = new Set(
    db.prepare('SELECT role_id FROM app_permissions WHERE app_id = ?').all(app.id).map(r => r.role_id)
  );

  res.render('admin/apps-permissions', {
    username: req.session.username,
    app,
    roles: roles.map(r => ({ ...r, has_access: grantedIds.has(r.id) })),
    success: flash.success ?? null,
  });
});

router.post('/apps/:id/permissions', (req, res) => {
  const appId = parseInt(req.params.id) || 0;
  const app   = db.prepare('SELECT id, slug, name FROM apps WHERE id = ?').get(appId);
  if (!app) {
    req.session.flash = { error: 'Không tìm thấy ứng dụng.' };
    return res.redirect('/admin/apps');
  }

  const allRoleIds = db.prepare('SELECT id FROM roles').all().map(r => r.id);
  const rawIds     = [].concat(req.body.role_ids ?? []).map(id => parseInt(id)).filter(Boolean);
  const newIds     = rawIds.filter(id => allRoleIds.includes(id));
  const oldIds     = db.prepare('SELECT role_id FROM app_permissions WHERE app_id = ?').all(appId).map(r => r.role_id);

  const toAdd    = newIds.filter(id => !oldIds.includes(id));
  const toRemove = oldIds.filter(id => !newIds.includes(id));

  const stmtAdd = db.prepare('INSERT OR IGNORE INTO app_permissions (role_id, app_id) VALUES (?, ?)');
  const stmtDel = db.prepare('DELETE FROM app_permissions WHERE role_id = ? AND app_id = ?');

  db.transaction(() => {
    for (const rid of toAdd)    stmtAdd.run(rid, appId);
    for (const rid of toRemove) stmtDel.run(rid, appId);
  })();

  if (toAdd.length > 0 || toRemove.length > 0) {
    audit(req, 'admin_permissions_modified', { app_slug: app.slug, added: toAdd, removed: toRemove });
  }

  req.session.flash = { success: `Đã cập nhật quyền truy cập cho "${app.name}".` };
  res.redirect(`/admin/apps/${appId}/permissions`);
});

module.exports = router;
