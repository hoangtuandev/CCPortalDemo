'use strict';

const path         = require('path');
const fs           = require('fs');
const http         = require('http');
const https        = require('https');
const express      = require('express');
const config          = require('./config');
const securityHeaders = require('./middleware/securityHeaders');
const sessionMw    = require('./middleware/session');
const csrf         = require('./middleware/csrf');
const requireLogin          = require('./middleware/requireLogin');
const requirePasswordChange = require('./middleware/requirePasswordChange');
const requireAdmin          = require('./middleware/requireAdmin');
const db           = require('./lib/db');
const authRouter   = require('./routes/auth');
const adminRouter  = require('./routes/admin');
const appsRouter   = require('./routes/apps');

const app  = express();
const PORT = config.port;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security headers — toàn bộ response
app.use(securityHeaders);

// Static — không cần auth
app.use(express.static(path.join(__dirname, 'public')));

// Body parsers
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Session + CSRF
app.use(sessionMw);
app.use(csrf);

// Auth routes (/login, /logout) — exempt khỏi requireLogin
app.use(authRouter);

// Mọi route dưới đây đều phải login
app.use(requireLogin);
app.use(requirePasswordChange);

// --- Protected routes ---

const stmtGetUser = db.prepare(`
  SELECT u.username, u.full_name, r.display_name AS role_name, r.is_admin
  FROM users u JOIN roles r ON r.id = u.role_id
  WHERE u.id = ?
`);

const stmtGetApps = db.prepare(`
  SELECT a.slug, a.name, a.icon, a.description, a.status
  FROM apps a
  JOIN app_permissions ap ON ap.app_id = a.id
  JOIN users u ON u.role_id = ap.role_id
  WHERE u.id = ? AND a.status != 'disabled'
  ORDER BY a.sort_order
`);

app.get('/', (req, res) => {
  const user = stmtGetUser.get(req.session.userId);
  if (!user) return res.redirect('/login');
  const apps = stmtGetApps.all(req.session.userId);
  res.render('dashboard', {
    fullName: user.full_name || user.username,
    roleName: user.role_name,
    isAdmin:  !!user.is_admin,
    apps,
  });
});

app.use('/apps', appsRouter);
app.use('/admin', requireAdmin, adminRouter);

// --- Server ---

const servers = [];

if (config.https.enabled) {
  const tls = {
    key:  fs.readFileSync(config.https.keyPath),
    cert: fs.readFileSync(config.https.certPath),
  };
  servers.push(
    https.createServer(tls, app).listen(443, () => {
      console.log('Portal running on https://localhost');
    })
  );
  servers.push(
    http.createServer((req, res) => {
      res.writeHead(301, { Location: `https://${req.headers.host || 'localhost'}${req.url}` });
      res.end();
    }).listen(80, () => {
      console.log('HTTP redirect listening on port 80');
    })
  );
} else {
  servers.push(
    app.listen(PORT, () => {
      console.log(`Portal running on http://localhost:${PORT}`);
    })
  );
}

process.on('SIGINT', () => {
  Promise.all(servers.map(s => new Promise(r => s.close(r))))
    .then(() => process.exit(0));
});
