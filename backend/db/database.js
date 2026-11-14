const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
const dbPath = path.join(dataDir, 'qr_generator.json');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function load() {
  if (!fs.existsSync(dbPath)) {
    return { profiles: [], photos: [], nextPhotoId: 1 };
  }
  try {
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  } catch {
    return { profiles: [], photos: [], nextPhotoId: 1 };
  }
}

function save(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

const store = {
  getAllProfiles() {
    return load().profiles.slice().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  },

  getProfile(id) {
    return load().profiles.find((p) => p.id === id) || null;
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
};

module.exports = store;
