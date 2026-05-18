'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hash, verify, validate } = require('../lib/password');

// --- validate() — 6 cases ---

test('validate: ngắn hơn 10 ký tự', () => {
  const r = validate('Ab12345', 'user1');
  assert.equal(r.ok, false);
  assert.ok(r.reason);
});

test('validate: thiếu chữ cái', () => {
  const r = validate('1234567890', 'user1');
  assert.equal(r.ok, false);
  assert.ok(r.reason);
});

test('validate: thiếu chữ số', () => {
  const r = validate('abcdefghij', 'user1');
  assert.equal(r.ok, false);
  assert.ok(r.reason);
});

test('validate: trùng username', () => {
  const username = 'abc123defgh'; // 11 ký tự, có chữ + số
  const r = validate(username, username);
  assert.equal(r.ok, false);
  assert.ok(r.reason);
});

test('validate: hợp lệ', () => {
  const r = validate('Password123', 'user1');
  assert.equal(r.ok, true);
  assert.equal(r.reason, undefined);
});

test('validate: hợp lệ có ký tự đặc biệt', () => {
  const r = validate('P@ssw0rd!!', 'user1');
  assert.equal(r.ok, true);
  assert.equal(r.reason, undefined);
});

// --- hash() + verify() ---

test('hash + verify: password đúng', async () => {
  const h = await hash('Password123');
  assert.equal(await verify('Password123', h), true);
});

test('hash + verify: password sai', async () => {
  const h = await hash('Password123');
  assert.equal(await verify('WrongPass99', h), false);
});
