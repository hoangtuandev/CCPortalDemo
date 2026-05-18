'use strict';

const fs       = require('fs');
const path     = require('path');
const Database = require('better-sqlite3');

const ROOT       = path.join(__dirname, '..', '..');
const DB_PATH    = path.join(ROOT, 'data', 'portal.db');
const BACKUP_DIR = path.join(ROOT, 'backup');
const KEEP_DAYS  = 30;

function pad2(n) { return String(n).padStart(2, '0'); }

function nowStamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}`;
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function main() {
  if (!fs.existsSync(DB_PATH)) {
    log(`Database not found: ${DB_PATH}`);
    process.exit(1);
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const dest = path.join(BACKUP_DIR, `portal-${nowStamp()}.db`);
  log(`Backup start → ${path.relative(ROOT, dest)}`);

  const db = new Database(DB_PATH, { readonly: true });
  try {
    await db.backup(dest);
  } finally {
    db.close();
  }

  log(`Backup complete: ${path.relative(ROOT, dest)}`);

  // Purge backups older than KEEP_DAYS days
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  let purged = 0;
  for (const file of fs.readdirSync(BACKUP_DIR)) {
    if (!/^portal-\d{8}-\d{4}\.db$/.test(file)) continue;
    const full = path.join(BACKUP_DIR, file);
    if (fs.statSync(full).mtimeMs < cutoff) {
      fs.unlinkSync(full);
      log(`Purged: ${file}`);
      purged++;
    }
  }
  if (purged === 0) log('No old backups to purge.');

  log('Done.');
}

main().catch(err => {
  console.error(`[${new Date().toISOString()}] Backup FAILED: ${err.message}`);
  process.exit(1);
});
