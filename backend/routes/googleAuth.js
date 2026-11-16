const store = require('../db/database');

function getGoogleClientId() {
  return process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
}

async function verifyGoogleIdToken(idToken, clientId) {
  const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Invalid Google token');
  }
  if (clientId && data.aud !== clientId) {
    throw new Error('Google token audience mismatch. Check GOOGLE_CLIENT_ID.');
  }
  if (data.email_verified === 'false' || data.email_verified === false) {
    throw new Error('Google email is not verified');
  }
  const email = String(data.email || '').trim().toLowerCase();
  if (!email) throw new Error('Google account has no email');
  return {
    email,
    name: String(data.name || data.given_name || email).trim(),
    picture: data.picture || null,
    sub: data.sub,
  };
}

async function verifyGoogleAccessToken(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Invalid Google access token');
  }
  if (data.email_verified === false || data.email_verified === 'false') {
    throw new Error('Google email is not verified');
  }
  const email = String(data.email || '').trim().toLowerCase();
  if (!email) throw new Error('Google account has no email');
  return {
    email,
    name: String(data.name || data.given_name || email).trim(),
    picture: data.picture || null,
    sub: data.sub || data.id || email,
  };
}

/**
 * Any Google account can authenticate.
 * If email matches admin-registered QR Email → staff can edit that QR.
 * Admin users matched by email keep admin role.
 */
function resolveAppUser(googleUser) {
  let user = store.findUserByEmail(googleUser.email);
  const profile = store.findProfileByEmail(googleUser.email);

  if (!user) {
    if (profile) {
      // Admin put this Gmail on a QR → staff edit access for that QR
      const created = store.createUser({
        email: googleUser.email,
        password: `google:${googleUser.sub}`,
        name: googleUser.name || profile.name || googleUser.email,
        role: 'staff',
        profileId: profile.id,
      });
      user = store.findUserById(created.id);
    } else {
      // Signed in with Google, but no QR linked yet
      const created = store.createUser({
        email: googleUser.email,
        password: `google:${googleUser.sub}`,
        name: googleUser.name || googleUser.email,
        role: 'staff',
        profileId: null,
      });
      user = store.findUserById(created.id);
    }
  } else if (user.role === 'staff') {
    if (!user.profileId && profile) {
      store.updateUser(user.id, {
        profileId: profile.id,
        name: user.name || googleUser.name,
      });
      user = store.findUserById(user.id);
    } else if (user.profileId && profile && user.profileId !== profile.id) {
      // Prefer QR that currently has this email
      store.updateUser(user.id, { profileId: profile.id });
      user = store.findUserById(user.id);
    }
  }

  if (!user) {
    throw new Error('Unable to sign in with Google');
  }
  if (user.active === false) {
    throw new Error('This account is deactivated. Contact admin.');
  }

  const token = store.createSession(user.id);
  return {
    token,
    user: store.publicUser(user),
    qrLinked: Boolean(user.profileId || profile),
  };
}

async function loginWithGoogleIdToken(idToken) {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error(
      'Google Sign-In is not configured. Set GOOGLE_CLIENT_ID in backend .env'
    );
  }
  const googleUser = await verifyGoogleIdToken(idToken, clientId);
  return resolveAppUser(googleUser);
}

async function loginWithGoogleAccessToken(accessToken) {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error(
      'Google Sign-In is not configured. Set GOOGLE_CLIENT_ID in backend .env'
    );
  }
  const googleUser = await verifyGoogleAccessToken(accessToken);
  return resolveAppUser(googleUser);
}

async function loginWithGoogle({ idToken, accessToken }) {
  if (accessToken) return loginWithGoogleAccessToken(accessToken);
  if (idToken) return loginWithGoogleIdToken(idToken);
  throw new Error('Google credential is required');
}

/**
 * No Google Client ID needed.
 * Admin-added QR Email (Gmail) → staff session for that QR.
 */
function loginWithStaffEmail(rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    throw new Error('Enter the Gmail that admin put on your staff QR');
  }

  const existing = store.findUserByEmail(email);
  if (existing?.role === 'admin') {
    throw new Error('Admin accounts must sign in with email and password');
  }

  return resolveAppUser({
    email,
    name: existing?.name || email.split('@')[0],
    picture: null,
    sub: `email:${email}`,
  });
}

module.exports = {
  verifyGoogleIdToken,
  verifyGoogleAccessToken,
  loginWithGoogleIdToken,
  loginWithGoogleAccessToken,
  loginWithGoogle,
  loginWithStaffEmail,
};
