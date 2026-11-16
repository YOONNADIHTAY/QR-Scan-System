const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'qr_generator.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function emptyData() {
  return {
    profiles: [],
    photos: [],
    nextPhotoId: 1,
    users: [],
    sessions: [],
    scans: [],
  };
}

function ensureDefaults(data) {
  if (!Array.isArray(data.profiles)) data.profiles = [];
  if (!Array.isArray(data.photos)) data.photos = [];
  if (!data.nextPhotoId) data.nextPhotoId = 1;
  if (!Array.isArray(data.users)) data.users = [];
  if (!Array.isArray(data.sessions)) data.sessions = [];
  if (!Array.isArray(data.scans)) data.scans = [];

  data.users = data.users.map((u) => ({
    ...u,
    active: u.active !== false,
  }));
  data.profiles = data.profiles.map((p) => ({
    ...p,
    active: p.active !== false,
    scan_count: Number(p.scan_count) || 0,
    last_scanned_at: p.last_scanned_at || null,
  }));

  const hasAdmin = data.users.some((u) => u.role === 'admin');
  if (!hasAdmin) {
    data.users.push({
      id: randomUUID(),
      email: 'admin@29jewellery.com',
      password: '123456',
      name: 'Administrator',
      role: 'admin',
      profileId: null,
      active: true,
      created_at: new Date().toISOString(),
    });
  }

  // Keep legacy "admin" username usable
  const hasAdminAlias = data.users.some(
    (u) => String(u.email || '').toLowerCase() === 'admin'
  );
  if (!hasAdminAlias) {
    data.users.push({
      id: randomUUID(),
      email: 'admin',
      password: '123456',
      name: 'Administrator',
      role: 'admin',
      profileId: null,
      active: true,
      created_at: new Date().toISOString(),
    });
  }

  return data;
}

function load() {
  if (!fs.existsSync(dbPath)) {
    const data = ensureDefaults(emptyData());
    save(data);
    return data;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    const data = ensureDefaults({ ...emptyData(), ...parsed });
    // Persist seeded admin if file was old format
    save(data);
    return data;
  } catch {
    const data = ensureDefaults(emptyData());
    save(data);
    return data;
  }
}

function save(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name || '',
    role: user.role,
    profileId: user.profileId || null,
    active: user.active !== false,
    createdAt: user.created_at,
  };
}

const store = {
  getAllProfiles() {
    return load()
      .profiles.slice()
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  },

  getProfile(id) {
    return load().profiles.find((p) => p.id === id) || null;
  },

  findProfileByEmail(email) {
    const key = String(email || '').trim().toLowerCase();
    if (!key) return null;
    return (
      load().profiles.find(
        (p) => String(p.personal_email || '').trim().toLowerCase() === key
      ) || null
    );
  },

  createProfile(profile) {
    const data = load();
    data.profiles.push(profile);
    save(data);
    return profile;
  },

  updateProfile(id, fields) {
    const data = load();
    const index = data.profiles.findIndex((p) => p.id === id);
    if (index === -1) return null;
    data.profiles[index] = { ...data.profiles[index], ...fields };
    save(data);
    return data.profiles[index];
  },

  deleteProfile(id) {
    const data = load();
    const before = data.profiles.length;
    data.profiles = data.profiles.filter((p) => p.id !== id);
    data.photos = data.photos.filter((p) => p.profile_id !== id);
    data.users = data.users.map((u) =>
      u.profileId === id ? { ...u, profileId: null } : u
    );
    if (data.profiles.length === before) return false;
    save(data);
    return true;
  },

  getPhotos(profileId) {
    return load()
      .photos.filter((p) => p.profile_id === profileId)
      .sort((a, b) => a.id - b.id);
  },

  addPhoto(profileId, filename, originalName) {
    const data = load();
    const photo = {
      id: data.nextPhotoId++,
      profile_id: profileId,
      filename,
      original_name: originalName,
      created_at: new Date().toISOString(),
    };
    data.photos.push(photo);
    save(data);
    return photo;
  },

  removePhotos(profileId, ids) {
    const data = load();
    const idSet = new Set(ids.map(Number));
    const removed = data.photos.filter(
      (p) => p.profile_id === profileId && idSet.has(p.id)
    );
    data.photos = data.photos.filter(
      (p) => !(p.profile_id === profileId && idSet.has(p.id))
    );
    save(data);
    return removed;
  },

  getAllPhotosForProfile(profileId) {
    return load().photos.filter((p) => p.profile_id === profileId);
  },

  getAllUsers() {
    return load().users.map(publicUser);
  },

  findUserByEmail(email) {
    const key = String(email || '').trim().toLowerCase();
    return (
      load().users.find((u) => String(u.email || '').toLowerCase() === key) ||
      null
    );
  },

  findUserById(id) {
    return load().users.find((u) => u.id === id) || null;
  },

  createUser({ email, password, name, role, profileId }) {
    const data = load();
    const key = String(email || '').trim().toLowerCase();
    if (!key || !password) {
      throw new Error('Email and password are required');
    }
    if (data.users.some((u) => String(u.email || '').toLowerCase() === key)) {
      throw new Error('Email already exists');
    }
    const user = {
      id: randomUUID(),
      email: key,
      password: String(password),
      name: String(name || '').trim() || key,
      role: role === 'admin' ? 'admin' : 'staff',
      profileId: profileId || null,
      active: true,
      created_at: new Date().toISOString(),
    };
    data.users.push(user);
    save(data);
    return publicUser(user);
  },

  updateUser(id, fields) {
    const data = load();
    const index = data.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    const next = { ...data.users[index] };
    if (fields.email != null) next.email = String(fields.email).trim().toLowerCase();
    if (fields.password != null && String(fields.password)) {
      next.password = String(fields.password);
    }
    if (fields.name != null) next.name = String(fields.name).trim();
    if (fields.role != null) next.role = fields.role === 'admin' ? 'admin' : 'staff';
    if (fields.profileId !== undefined) next.profileId = fields.profileId || null;
    if (fields.active !== undefined) next.active = Boolean(fields.active);
    data.users[index] = next;
    save(data);
    return publicUser(next);
  },

  recordScan(profileId, meta = {}) {
    const data = load();
    const index = data.profiles.findIndex((p) => p.id === profileId);
    if (index === -1) return null;
    const now = new Date().toISOString();
    const profile = data.profiles[index];
    profile.scan_count = (Number(profile.scan_count) || 0) + 1;
    profile.last_scanned_at = now;
    data.profiles[index] = profile;
    data.scans.push({
      id: randomUUID(),
      profileId,
      at: now,
      userAgent: String(meta.userAgent || '').slice(0, 180),
    });
    if (data.scans.length > 2000) {
      data.scans = data.scans.slice(-2000);
    }
    save(data);
    return profile;
  },

  getScanStats() {
    const data = load();
    const totalScans = data.profiles.reduce(
      (sum, p) => sum + (Number(p.scan_count) || 0),
      0
    );
    const today = new Date().toISOString().slice(0, 10);
    const scansToday = data.scans.filter((s) =>
      String(s.at || '').startsWith(today)
    ).length;
    const byProfile = data.profiles
      .map((p) => ({
        id: p.id,
        name: p.name,
        scanCount: Number(p.scan_count) || 0,
        lastScannedAt: p.last_scanned_at || null,
        active: p.active !== false,
      }))
      .sort((a, b) => b.scanCount - a.scanCount);
    return {
      totalProfiles: data.profiles.length,
      activeProfiles: data.profiles.filter((p) => p.active !== false).length,
      totalStaff: data.users.filter((u) => u.role === 'staff').length,
      activeStaff: data.users.filter(
        (u) => u.role === 'staff' && u.active !== false
      ).length,
      totalScans,
      scansToday,
      byProfile,
    };
  },

  deleteUser(id) {
    const data = load();
    const before = data.users.length;
    data.users = data.users.filter((u) => u.id !== id);
    data.sessions = data.sessions.filter((s) => s.userId !== id);
    if (data.users.length === before) return false;
    save(data);
    return true;
  },

  createSession(userId) {
    const data = load();
    const token = randomUUID();
    data.sessions.push({
      token,
      userId,
      at: Date.now(),
    });
    // keep last 200 sessions
    if (data.sessions.length > 200) {
      data.sessions = data.sessions.slice(-200);
    }
    save(data);
    return token;
  },

  getUserByToken(token) {
    if (!token) return null;
    const data = load();
    const session = data.sessions.find((s) => s.token === token);
    if (!session) return null;
    const user = data.users.find((u) => u.id === session.userId);
    return user || null;
  },

  destroySession(token) {
    const data = load();
    data.sessions = data.sessions.filter((s) => s.token !== token);
    save(data);
  },

  publicUser,
};

module.exports = store;
