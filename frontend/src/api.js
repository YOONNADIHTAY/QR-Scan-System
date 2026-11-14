const API = '/api/profiles';

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
  const res = await fetch(API);
  return readJson(res);
}

export async function getProfile(id) {
  const res = await fetch(`${API}/${id}`);
  return readJson(res);
}

export async function createProfile(formData) {
  const res = await fetch(API, { method: 'POST', body: formData });
  return readJson(res);
}

export async function updateProfile(id, formData) {
  const res = await fetch(`${API}/${id}`, { method: 'PUT', body: formData });
  return readJson(res);
}

export async function deleteProfile(id) {
  const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
  return readJson(res);
}
