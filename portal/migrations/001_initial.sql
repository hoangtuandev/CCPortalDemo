-- 001_initial.sql
-- V1 schema: roles, users, activity_logs, active_sessions
-- apps / app_permissions / app_storage thuộc V1.5+ — không tạo ở đây

-- -------------------------------------------------------
-- roles — tạo trước vì users có FK tới roles
-- -------------------------------------------------------
CREATE TABLE roles (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL UNIQUE,
  display_name TEXT    NOT NULL,
  description  TEXT,
  is_admin     INTEGER NOT NULL DEFAULT 0
);

-- -------------------------------------------------------
-- users
-- -------------------------------------------------------
CREATE TABLE users (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  username             TEXT    NOT NULL UNIQUE,
  password_hash        TEXT    NOT NULL,
  full_name            TEXT    NOT NULL,
  barcode              TEXT    UNIQUE,
  role_id              INTEGER NOT NULL REFERENCES roles(id),
  is_active            INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  failed_login_count   INTEGER NOT NULL DEFAULT 0,
  locked_until         TEXT,
  created_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- -------------------------------------------------------
-- activity_logs
-- -------------------------------------------------------
CREATE TABLE activity_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER REFERENCES users(id),
  username   TEXT,
  action     TEXT NOT NULL,
  app_slug   TEXT,
  ip_address TEXT,
  details    TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX idx_activity_logs_user_id    ON activity_logs(user_id);

-- -------------------------------------------------------
-- active_sessions — V1.5+, tạo sẵn bảng, V1 chưa dùng
-- -------------------------------------------------------
CREATE TABLE active_sessions (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id),
  username      TEXT NOT NULL,
  current_app   TEXT,
  last_activity TEXT NOT NULL,
  ip_address    TEXT
);
