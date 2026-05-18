'use strict';

const crypto  = require('crypto');
const bcrypt  = require('bcryptjs');
const db      = require('./db');

// --- Role admin ---
const existingRole = db.prepare("SELECT id FROM roles WHERE name = 'admin'").get();
let roleId;

if (existingRole) {
  roleId = existingRole.id;
  console.log('[skip]   Role "admin" đã tồn tại.');
} else {
  const r = db.prepare(
    "INSERT INTO roles (name, display_name, is_admin) VALUES ('admin', 'Quản trị viên', 1)"
  ).run();
  roleId = r.lastInsertRowid;
  console.log('[create] Role "admin" tạo xong.');
}

// --- User admin ---
const existingUser = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();

if (existingUser) {
  console.log('[skip]   User "admin" đã tồn tại, bỏ qua.');
} else {
  // hex(8 bytes) = 16 ký tự, luôn có cả chữ (a-f) lẫn số (0-9), đủ rule ≥10 ký tự
  const tempPassword = crypto.randomBytes(8).toString('hex');
  const hash = bcrypt.hashSync(tempPassword, 12);

  db.prepare(`
    INSERT INTO users (username, password_hash, full_name, role_id, must_change_password)
    VALUES ('admin', ?, 'Quản trị viên', ?, 1)
  `).run(hash, roleId);

  console.log('[create] User "admin" tạo xong.');
  console.log('');
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║  PASSWORD TẠM: ' + tempPassword + '  ║');
  console.log('  ║  Lưu lại — sẽ không hiển thị lại.  ║');
  console.log('  ╚══════════════════════════════════════╝');
  console.log('');
  console.log('  User "admin" sẽ bị buộc đổi password khi đăng nhập lần đầu.');
}

db.close();
