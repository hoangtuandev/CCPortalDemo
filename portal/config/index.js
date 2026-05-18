'use strict';

const fs   = require('fs');
const path = require('path');

const CERT_KEY  = path.resolve(__dirname, '..', '..', 'cert', 'server.key');
const CERT_CRT  = path.resolve(__dirname, '..', '..', 'cert', 'server.crt');

// Load .env nếu tồn tại (dev)
require('dotenv').config();

// Load config.json nếu tồn tại (prod) — env var có độ ưu tiên cao hơn
let fileConfig = {};
const configJsonPath = path.join(__dirname, '..', 'config.json');
if (fs.existsSync(configJsonPath)) {
  fileConfig = JSON.parse(fs.readFileSync(configJsonPath, 'utf8'));
}

// Đọc giá trị: process.env > config.json > default
const get = (key, fallback) => {
  if (process.env[key] !== undefined) return process.env[key];
  if (fileConfig[key] !== undefined) return fileConfig[key];
  return fallback;
};

const sessionSecret = get('SESSION_SECRET', null);
if (!sessionSecret) {
  throw new Error(
    'SESSION_SECRET chưa được cấu hình. ' +
    'Thêm SESSION_SECRET vào file .env (dev) hoặc config.json (prod).'
  );
}

const config = {
  port: Number(get('PORT', 3000)),
  sessionSecret,
  session: {
    idleMinutes:    Number(get('SESSION_IDLE_MINUTES', 60)),
    absoluteHours:  Number(get('SESSION_ABSOLUTE_HOURS', 8)),
  },
  lock: {
    threshold:        Number(get('LOCK_THRESHOLD', 5)),
    durationMinutes:  Number(get('LOCK_DURATION_MINUTES', 15)),
  },
  https: {
    enabled:  fs.existsSync(CERT_KEY) && fs.existsSync(CERT_CRT),
    keyPath:  CERT_KEY,
    certPath: CERT_CRT,
  },
};

module.exports = config;
