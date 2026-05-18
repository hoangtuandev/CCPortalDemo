'use strict';

const fs   = require('fs');
const path = require('path');
const db   = require('./db');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

db.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    filename   TEXT    NOT NULL UNIQUE,
    applied_at TEXT    NOT NULL
  )
`);

const files = fs.readdirSync(MIGRATIONS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

const applied = new Set(
  db.prepare('SELECT filename FROM _migrations').all().map(r => r.filename)
);

const runMigration = db.transaction((file, sql) => {
  db.exec(sql);
  db.prepare('INSERT INTO _migrations (filename, applied_at) VALUES (?, ?)')
    .run(file, new Date().toISOString());
});

let count = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`[skip]  ${file}`);
    continue;
  }
  const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
  runMigration(file, sql);
  console.log(`[apply] ${file}`);
  count++;
}

console.log(`Done. ${count} migration(s) applied.`);
db.close();
