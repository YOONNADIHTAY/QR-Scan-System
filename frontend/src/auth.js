import { apiUrl } from './apiBase';

const AUTH_KEY = 'qr_auth_session';

function readSession() {
  try {
    const raw =
      localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.token || !data?.user) return null;
    return data;
  } catch {
    return null;
  }
}

function writeSession(session, remember = true) {
  const payload = JSON.stringify(session);
  if (remember) {
    localStorage.setItem(AUTH_KEY, payload);
    sessionStorage.removeItem(AUTH_KEY);
  } else {
    sessionStorage.setItem(AUTH_KEY, payload);
    localStorage.removeItem(AUTH_KEY);
  }
}

function pushSecurity(user, remember) {
  try {
    const key = 'qr_security_history';
    const prev = JSON.parse(localStorage.getItem(key) || '[]');
    const next = [
      {
        id: `${Date.now()}`,
        action: 'Sign in',
        user: user.email,
        at: Date.now(),
        detail: `${user.role}${remember ? ' · Remember me' : ' · Session only'}`,
      },
      ...(Array.isArray(prev) ? prev : []),
    ].slice(0, 40);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function getSession() {
  return readSession();
}

export function getToken() {
  return readSession()?.token || null;
}

export function isAuthenticated() {
  return Boolean(readSession()?.token);
}

function saveLoginSession(data, remember = true) {
  const session = {
    token: data.token,
    user: data.user,
    at: Date.now(),
  };
  writeSession(session, remember);
  pushSecurity(data.user, remember);
  return { ok: true, session };
}

export async function login(username, password, remember = true) {
  const loginId = String(username || '').trim();
  const pass = String(password || '');
  if (!loginId || !pass) {
    return { ok: false, error: 'Email and password are required' };
  }

  try {
    const res = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginId, password: pass }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Invalid username or password' };
    }
    return saveLoginSession(data, remember);
  } catch {
    return { ok: false, error: 'Cannot reach server. Is the backend running?' };
  }
}

/** Staff Gmail from QR Email — no Google Client ID */
export async function loginWithStaffEmail(username, remember = true) {
  const email = String(username || '').trim().toLowerCase();
  if (!email) {
    return { ok: false, error: 'Enter the Gmail from your Users QR Email field' };
  }
  try {
    const res = await fetch(apiUrl('/api/auth/staff-email'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Staff sign-in failed' };
    }
    return saveLoginSession(data, remember);
  } catch {
    return { ok: false, error: 'Cannot reach server. Is the backend running?' };
  }
}

export async function loginWithGoogle(credential, remember = true) {
  const value = String(credential || '').trim();
  if (!value) {
    return { ok: false, error: 'Google credential missing' };
  }
  // Access tokens are opaque; id tokens are JWT (three dot-separated parts)
  const isJwt = value.split('.').length === 3;
  const body = isJwt ? { idToken: value } : { accessToken: value };
  try {
    const res = await fetch(apiUrl('/api/auth/google'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || 'Google sign-in failed' };
    }
    return saveLoginSession(data, remember);
  } catch {
    return { ok: false, error: 'Cannot reach server. Is the backend running?' };
  }
}

export function getSecurityHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem('qr_security_history') || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export async function logout() {
  const token = getToken();
  try {
    if (token) {
      await fetch(apiUrl('/api/auth/logout'), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  } catch {
    /* ignore */
  }
  localStorage.removeItem(AUTH_KEY);
  sessionStorage.removeItem(AUTH_KEY);
}

export function getAuthUser() {
  return readSession()?.user?.email || null;
}

export function getAuthProfile() {
  return readSession()?.user || null;
}

export function getUserRole() {
  return readSession()?.user?.role || null;
}

export function isAdmin() {
  return getUserRole() === 'admin';
}

export function isStaff() {
  return getUserRole() === 'staff';
}

export function getStaffProfileId() {
  return readSession()?.user?.profileId || null;
}

export function authHeaders(extra = {}) {
  const token = getToken();
  return token
    ? { ...extra, Authorization: `Bearer ${token}` }
    : { ...extra };
}
