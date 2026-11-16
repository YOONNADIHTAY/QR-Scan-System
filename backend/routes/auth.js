const express = require('express');
const store = require('../db/database');
const {
  attachUser,
  requireAuth,
  requireAdmin,
  getBearerToken,
} = require('../middleware/auth');
const { loginWithGoogle, loginWithStaffEmail } = require('./googleAuth');

const router = express.Router();
router.use(attachUser);

router.post('/google', async (req, res) => {
  try {
    const idToken = String(req.body.idToken || req.body.credential || '').trim();
    const accessToken = String(req.body.accessToken || '').trim();
    if (!idToken && !accessToken) {
      return res.status(400).json({ error: 'Google credential is required' });
    }
    const result = await loginWithGoogle({ idToken, accessToken });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: err.message || 'Google sign-in failed' });
  }
});

/** Staff: Gmail from QR Email field — no Google Client ID / no password */
router.post('/staff-email', (req, res) => {
  try {
    const email = String(req.body.email || req.body.username || '').trim();
    const result = loginWithStaffEmail(email);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: err.message || 'Staff sign-in failed' });
  }
});

router.post('/login', (req, res) => {
  try {
    const email = String(req.body.email || req.body.username || '')
      .trim()
      .toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = store.findUserByEmail(email);
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    if (String(user.password || '').startsWith('google:')) {
      return res.status(401).json({
        error: 'This account uses Sign in with Google.',
      });
    }
    if (user.active === false) {
      return res
        .status(403)
        .json({ error: 'This account is deactivated. Contact admin.' });
    }

    const token = store.createSession(user.id);
    res.json({
      token,
      user: store.publicUser(user),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/logout', (req, res) => {
  const token = getBearerToken(req);
  if (token) store.destroySession(token);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: store.publicUser(req.user) });
});

router.get('/users', requireAdmin, (_req, res) => {
  try {
    res.json(store.getAllUsers());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load users' });
  }
});

router.get('/stats', requireAdmin, (_req, res) => {
  try {
    res.json(store.getScanStats());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

router.post('/users', requireAdmin, (req, res) => {
  try {
    const {
      email,
      password,
      name,
      role = 'staff',
      profileId = null,
    } = req.body || {};

    const user = store.createUser({
      email,
      password: password || '123456',
      name,
      role: role === 'admin' ? 'admin' : 'staff',
      profileId,
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to create user' });
  }
});

router.put('/users/:id', requireAdmin, (req, res) => {
  try {
    const updated = store.updateUser(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update user' });
  }
});

router.delete('/users/:id', requireAdmin, (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const ok = store.deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
