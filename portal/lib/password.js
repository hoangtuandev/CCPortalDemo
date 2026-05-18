'use strict';

const bcrypt = require('bcryptjs');

const COST = 12;

async function hash(plain) {
  return bcrypt.hash(plain, COST);
}

async function verify(plain, storedHash) {
  return bcrypt.compare(plain, storedHash);
}

function validate(plain, username) {
  if (plain.length < 10) {
    return { ok: false, reason: 'Mật khẩu phải có ít nhất 10 ký tự' };
  }
  if (!/[a-zA-Z]/.test(plain)) {
    return { ok: false, reason: 'Mật khẩu phải có ít nhất 1 chữ cái' };
  }
  if (!/[0-9]/.test(plain)) {
    return { ok: false, reason: 'Mật khẩu phải có ít nhất 1 chữ số' };
  }
  if (plain === username) {
    return { ok: false, reason: 'Mật khẩu không được trùng với tên đăng nhập' };
  }
  return { ok: true };
}

module.exports = { hash, verify, validate };
