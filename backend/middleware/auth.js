const store = require('../db/database');

function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1].trim();
  return String(req.headers['x-auth-token'] || '').trim() || null;
}

function attachUser(req, _res, next) {
  const token = getBearerToken(req);
  req.authToken = token;
  req.user = token ? store.getUserByToken(token) : null;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Sign in required' });
  }
  if (req.user.active === false) {
    return res.status(403).json({ error: 'This account is deactivated. Contact admin.' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Sign in required' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireProfileAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Sign in required' });
  }
  if (req.user.role === 'admin') return next();
  const profileId = req.params.id;
  if (!req.user.profileId || req.user.profileId !== profileId) {
    return res.status(403).json({ error: 'You can only access your own QR' });
  }
  next();
}

module.exports = {
  attachUser,
  requireAuth,
  requireAdmin,
  requireProfileAccess,
  getBearerToken,
};
