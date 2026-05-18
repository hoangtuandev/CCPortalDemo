'use strict';

const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '..', '..', 'logs');

const SENSITIVE_KEYS = new Set([
  'password', 'passwordHash', 'password_hash',
  'token', 'secret', 'sessionSecret', 'session_secret',
]);

function scrub(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [k, v] of Object.entries(obj)) {
    result[k] = SENSITIVE_KEYS.has(k) ? '[REDACTED]' : v;
  }
  return result;
}

function getLogPath() {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(LOGS_DIR, `portal-${date}.log`);
}

function write(level, msg, meta) {
  const ts = new Date().toISOString();
  const metaPart = meta !== undefined ? ' ' + JSON.stringify(scrub(meta)) : '';
  const line = `${ts} [${level}] ${msg}${metaPart}\n`;

  process.stdout.write(line);

  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    fs.appendFileSync(getLogPath(), line, 'utf8');
  } catch (err) {
    process.stderr.write(`[logger] Failed to write log file: ${err.message}\n`);
  }
}

const logger = {
  info:  (msg, meta) => write('INFO ', msg, meta),
  warn:  (msg, meta) => write('WARN ', msg, meta),
  error: (msg, meta) => write('ERROR', msg, meta),
};

module.exports = logger;
