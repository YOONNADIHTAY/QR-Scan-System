import { authHeaders } from './auth';
import { apiUrl } from './apiBase';

const API = () => apiUrl('/api/profiles');
const AUTH_API = () => apiUrl('/api/auth');

async function readJson(res) {
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Server returned an invalid response. Is the backend running?');
    }
  }
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

export async function getProfiles() {
  const res = await fetch(API(), { headers: authHeaders() });
  return readJson(res);
}

export async function getProfile(id, options = {}) {
  const headers = authHeaders(options.headers || {});
  const res = await fetch(`${API()}/${id}`, { ...options, headers });
  return readJson(res);
}

/** Public camera-scan profile — no auth (avoids "own QR only" when logged in) */
export async function getPublicScanProfile(id, options = {}) {
  const res = await fetch(apiUrl(`/api/scan/${id}`), { ...options });
  return readJson(res);
}

export async function createProfile(formData) {
  const res = await fetch(API(), {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return readJson(res);
}

export async function updateProfile(id, formData) {
  const res = await fetch(`${API()}/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: formData,
  });
  return readJson(res);
}

export async function deleteProfile(id) {
  const res = await fetch(`${API()}/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return readJson(res);
}

export async function getUsers() {
  const res = await fetch(`${AUTH_API()}/users`, { headers: authHeaders() });
  return readJson(res);
}

export async function createUser(payload) {
  const res = await fetch(`${AUTH_API()}/users`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return readJson(res);
}

export async function updateUser(id, payload) {
  const res = await fetch(`${AUTH_API()}/users/${id}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  return readJson(res);
}

export async function deleteUser(id) {
  const res = await fetch(`${AUTH_API()}/users/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return readJson(res);
}

export async function setUserActive(id, active) {
  return updateUser(id, { active: Boolean(active) });
}

export async function setProfileActive(id, active) {
  const res = await fetch(`${API()}/${id}/active`, {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ active: Boolean(active) }),
  });
  return readJson(res);
}

export async function getAdminStats() {
  const res = await fetch(`${AUTH_API()}/stats`, { headers: authHeaders() });
  return readJson(res);
}

export async function getMyScanStats() {
  const res = await fetch(`${AUTH_API()}/my-stats`, { headers: authHeaders() });
  return readJson(res);
}

export async function getProfileScanStats(id) {
  const res = await fetch(`${API()}/${id}/stats`, { headers: authHeaders() });
  return readJson(res);
}

export async function updateProfileDesign(id, formData) {
  const res = await fetch(`${API()}/${id}/design`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: formData,
  });
  return readJson(res);
}
