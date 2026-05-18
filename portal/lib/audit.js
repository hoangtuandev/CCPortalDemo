'use strict';

const db = require('./db');

const SENSITIVE_KEY_RE = /^(password|passwd|pwd|secret|token|hash|key|credential)$/i;
const LONG_DIGIT_RE    = /\b\d{12,19}\b/g;
const MAX_BYTES        = 1024;

function scrub(value) {
  if (typeof value === 'string') return value.replace(LONG_DIGIT_RE, '[REDACTED]');
  if (Array.isArray(value))      return value.map(scrub);
  if (value !== null && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SENSITIVE_KEY_RE.test(k) ? '[REDACTED]' : scrub(v);
    }
    return out;
  }
  return value;
}

const stmtInsert = db.prepare(
  'INSERT INTO activity_logs (user_id, username, action, app_slug, ip_address, details) VALUES (?, ?, ?, ?, ?, ?)'
);

/**
 * @param {import('express').Request} req
 * @param {string} action
 * @param {object} [details]
 * @param {{ userId?: number, username?: string, app_slug?: string }} [overrides]
 */
function audit(req, action, details, overrides = {}) {
  const userId   = overrides.userId   ?? req.session?.userId   ?? null;
  const username = overrides.username ?? req.session?.username ?? null;
  const appSlug  = overrides.app_slug ?? null;
  const ip       = req.ip ?? null;

  let detailsStr = null;
  if (details != null) {
    let json = JSON.stringify(scrub(details));
    if (Buffer.byteLength(json, 'utf8') > MAX_BYTES) {
      // Truncate to fit; append marker (may produce invalid JSON — intentional for storage)
      json = Buffer.from(json, 'utf8').slice(0, MAX_BYTES).toString('utf8') + '…[truncated]';
    }
    detailsStr = json;
  }

  try {
    stmtInsert.run(userId, username, action, appSlug, ip, detailsStr);
  } catch (err) {
    console.error('[audit] write failed:', err.message);
  }
}

module.exports = { audit };
