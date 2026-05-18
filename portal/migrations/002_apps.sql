-- 002_apps.sql
-- Apps registry và phân quyền theo role

CREATE TABLE apps (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  slug        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  description TEXT,
  icon        TEXT    NOT NULL DEFAULT '📦',
  status      TEXT    NOT NULL DEFAULT 'stable'
              CHECK (status IN ('stable', 'beta', 'disabled')),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE app_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  app_id  INTEGER NOT NULL REFERENCES apps(id)  ON DELETE CASCADE,
  PRIMARY KEY (role_id, app_id)
);

CREATE INDEX idx_app_permissions_role_id ON app_permissions(role_id);
CREATE INDEX idx_app_permissions_app_id  ON app_permissions(app_id);
