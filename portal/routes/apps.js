'use strict';

const path    = require('path');
const express = require('express');
const db      = require('../lib/db');
const { audit } = require('../lib/audit');

const router = express.Router();

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,49}$/;

const MINIAPP_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "img-src 'self' data:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

const stmtApp  = db.prepare(`SELECT id, slug, name FROM apps WHERE slug = ? AND status != 'disabled'`);
const stmtPerm = db.prepare(`
  SELECT 1 FROM app_permissions ap
  JOIN users u ON u.role_id = ap.role_id
  WHERE u.id = ? AND ap.app_id = ?
`);

router.get('/:slug', (req, res) => {
  const { slug } = req.params;

  if (!SLUG_RE.test(slug)) return res.status(400).send('Slug không hợp lệ.');

  const app = stmtApp.get(slug);
  if (!app) return res.status(404).send('Ứng dụng không tồn tại hoặc đã bị vô hiệu hoá.');

  const allowed = stmtPerm.get(req.session.userId, app.id);
  if (!allowed) {
    audit(req, 'access_denied', { slug }, { app_slug: slug });
    return res.status(403).send('Bạn không có quyền sử dụng ứng dụng này.');
  }

  audit(req, 'open_app', null, { app_slug: slug });

  const filePath = path.resolve(__dirname, '..', '..', 'apps', slug, 'index.html');
  res.setHeader('Content-Security-Policy', MINIAPP_CSP);
  res.sendFile(filePath);
});

module.exports = router;
