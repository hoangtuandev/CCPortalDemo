'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { Store } = require('express-session');

const DATA_DIR  = path.join(__dirname, '..', '..', 'data');
const SESS_PATH = path.join(DATA_DIR, 'sessions.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

class SQLiteStore extends Store {
  constructor() {
    super();

    this.db = new Database(SESS_PATH);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid        TEXT    PRIMARY KEY,
        sess       TEXT    NOT NULL,
        expired_at INTEGER NOT NULL
      )
    `);

    this._stmtGet          = this.db.prepare('SELECT sess FROM sessions WHERE sid = ? AND expired_at > ?');
    this._stmtSet          = this.db.prepare('INSERT OR REPLACE INTO sessions (sid, sess, expired_at) VALUES (?, ?, ?)');
    this._stmtDestroy      = this.db.prepare('DELETE FROM sessions WHERE sid = ?');
    this._stmtTouch        = this.db.prepare('UPDATE sessions SET expired_at = ? WHERE sid = ?');
    this._stmtDestroyOther = this.db.prepare(
      "DELETE FROM sessions WHERE json_extract(sess, '$.userId') = ? AND sid != ?"
    );

    // Dọn session hết hạn mỗi 5 phút
    const cleanup = this.db.prepare('DELETE FROM sessions WHERE expired_at <= ?');
    setInterval(() => cleanup.run(Date.now()), 5 * 60 * 1000).unref();
  }

  get(sid, cb) {
    try {
      const row = this._stmtGet.get(sid, Date.now());
      cb(null, row ? JSON.parse(row.sess) : null);
    } catch (e) { cb(e); }
  }

  set(sid, session, cb) {
    try {
      const ttl = session.cookie?.maxAge ?? 86400000;
      this._stmtSet.run(sid, JSON.stringify(session), Date.now() + ttl);
      cb(null);
    } catch (e) { cb(e); }
  }

  destroy(sid, cb) {
    try {
      this._stmtDestroy.run(sid);
      cb(null);
    } catch (e) { cb(e); }
  }

  touch(sid, session, cb) {
    try {
      const ttl = session.cookie?.maxAge ?? 86400000;
      this._stmtTouch.run(Date.now() + ttl, sid);
      cb(null);
    } catch (e) { cb(e); }
  }

  // Xóa toàn bộ session của userId, ngoại trừ session hiện tại
  destroyByUser(userId, exceptSid) {
    try {
      this._stmtDestroyOther.run(userId, exceptSid);
    } catch (e) {
      // Non-critical — log nếu cần, không throw để tránh break đổi password
    }
  }
}

module.exports = new SQLiteStore();
