const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { randomUUID } = require('crypto');
const store = require('../db/database');

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const uploadFields = upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'photos', maxCount: 10 },
]);

function parseCoord(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseBranches(value) {
  let list = [];
  if (!value) list = [];
  else if (Array.isArray(value)) list = value;
  else {
    try {
      const parsed = JSON.parse(value);
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      list = [];
    }
  }

  return list
    .map((b) => {
      const phones = Array.isArray(b.phones)
        ? b.phones.map((p) => String(p || '').trim()).filter(Boolean)
        : [];
      if (!phones.length && b.phone) phones.push(String(b.phone).trim());
      return {
        name: String(b.name || b.locationName || '').trim(),
        phone: phones[0] || '',
        phones,
        address: String(b.address || b.locationName || '').trim(),
        googleMapLink: String(b.googleMapLink || '').trim(),
        locationName: String(b.locationName || b.address || b.name || '').trim(),
        latitude: parseCoord(b.latitude),
        longitude: parseCoord(b.longitude),
      };
    })
    .filter(
      (b) =>
        b.name ||
        b.phone ||
        b.phones.length ||
        b.address ||
        b.googleMapLink ||
        b.latitude != null
    );
}

function parseBool(value, defaultValue = true) {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (typeof value === 'boolean') return value;
  const s = String(value).trim().toLowerCase();
  if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
  if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
  return defaultValue;
}

function legacyBranches(row) {
  const phones = Array.isArray(row.phone_numbers) ? row.phone_numbers : [];
  if (
    !row.location_name &&
    !row.google_map_link &&
    row.latitude == null &&
    !phones.length
  ) {
    return [];
  }
  return [
    {
      name: row.location_name || 'Branch',
      phone: phones[0] || '',
      phones: phones.filter(Boolean),
      address: row.location_name || '',
      googleMapLink: row.google_map_link || '',
      locationName: row.location_name || '',
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
    },
  ];
}

function getPhotos(profileId) {
  return store.getPhotos(profileId).map((p) => ({
    id: p.id,
    filename: p.filename,
    originalName: p.original_name,
    url: `/uploads/${p.filename}`,
  }));
}

function avatarUrl(filename) {
  return filename ? `/uploads/${filename}` : '';
}

function mapProfile(row) {
  const branches =
    Array.isArray(row.branches) && row.branches.length
      ? row.branches
      : legacyBranches(row);

  const first = branches[0] || {};
  const includeShop = row.include_shop !== false;
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    personalPhone: row.personal_phone || '',
    personalEmail: row.personal_email || '',
    includeShop,
    shopName: row.shop_name || '29 Jewellery',
    facebookLink: row.facebook_link || '',
    tiktokLink: row.tiktok_link || '',
    youtubeLink: row.youtube_link || '',
    branches: includeShop ? branches : [],
    googleMapLink: includeShop
      ? first.googleMapLink || row.google_map_link || ''
      : '',
    locationName: includeShop
      ? first.locationName || row.location_name || ''
      : '',
    latitude: includeShop ? first.latitude ?? row.latitude ?? null : null,
    longitude: includeShop ? first.longitude ?? row.longitude ?? null : null,
    phoneNumbers: includeShop
      ? branches.flatMap((b) =>
          Array.isArray(b.phones) && b.phones.length
            ? b.phones
            : b.phone
              ? [b.phone]
              : []
        ).filter(Boolean)
      : [],
    avatarUrl: avatarUrl(row.avatar_filename),
    qrFgColor: row.qr_fg_color || '#111111',
    qrBgColor: row.qr_bg_color || '#ffffff',
    photos: getPhotos(row.id),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function removeFileIfExists(filename) {
  if (!filename) return;
  const filePath = path.join(uploadsDir, filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
}

router.get('/', (_req, res) => {
  try {
    res.json(store.getAllProfiles().map(mapProfile));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const row = store.getProfile(req.params.id);
    if (!row) return res.status(404).json({ error: 'Profile not found' });
    res.json(mapProfile(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.post('/', uploadFields, (req, res) => {
  try {
    const id = randomUUID();
    const {
      name,
      description,
      personalPhone,
      personalEmail,
      includeShop,
      shopName,
      facebookLink,
      tiktokLink,
      youtubeLink,
      branches,
      qrFgColor,
      qrBgColor,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Employee name is required' });
    }

    const shopEnabled = parseBool(includeShop, true);
    const branchList = shopEnabled ? parseBranches(branches) : [];
    const first = branchList[0] || {};
    const now = new Date().toISOString();
    const avatarFile = req.files?.avatar?.[0];

    const profile = {
      id,
      name: name.trim(),
      description: description || null,
      personal_phone: String(personalPhone || '').trim() || null,
      personal_email: String(personalEmail || '').trim() || null,
      include_shop: shopEnabled,
      shop_name: (shopName || '29 Jewellery').trim(),
      facebook_link: facebookLink || null,
      tiktok_link: tiktokLink || null,
      youtube_link: youtubeLink || null,
      branches: branchList,
      google_map_link: first.googleMapLink || null,
      location_name: first.locationName || first.name || null,
      latitude: first.latitude ?? null,
      longitude: first.longitude ?? null,
      phone_numbers: branchList.flatMap((b) =>
        Array.isArray(b.phones) && b.phones.length
          ? b.phones
          : b.phone
            ? [b.phone]
            : []
      ),
      avatar_filename: avatarFile?.filename || null,
      qr_fg_color: qrFgColor || '#111111',
      qr_bg_color: qrBgColor || '#ffffff',
      created_at: now,
      updated_at: now,
    };

    store.createProfile(profile);

    const photos = req.files?.photos || [];
    for (const file of photos) {
      store.addPhoto(id, file.filename, file.originalname);
    }

    res.status(201).json(mapProfile(store.getProfile(id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create profile' });
  }
});

router.put('/:id', uploadFields, (req, res) => {
  try {
    const { id } = req.params;
    const existing = store.getProfile(id);
    if (!existing) return res.status(404).json({ error: 'Profile not found' });

    const {
      name,
      description,
      personalPhone,
      personalEmail,
      includeShop,
      shopName,
      facebookLink,
      tiktokLink,
      youtubeLink,
      branches,
      removePhotoIds,
      removeAvatar,
      qrFgColor,
      qrBgColor,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Employee name is required' });
    }

    const shopEnabled = parseBool(includeShop, true);
    const branchList = shopEnabled ? parseBranches(branches) : [];
    const first = branchList[0] || {};
    const avatarFile = req.files?.avatar?.[0];
    let avatarFilename = existing.avatar_filename || null;

    if (removeAvatar === 'true' || removeAvatar === true) {
      removeFileIfExists(avatarFilename);
      avatarFilename = null;
    }

    if (avatarFile) {
      removeFileIfExists(avatarFilename);
      avatarFilename = avatarFile.filename;
    }

    store.updateProfile(id, {
      name: name.trim(),
      description: description || null,
      personal_phone: String(personalPhone || '').trim() || null,
      personal_email: String(personalEmail || '').trim() || null,
      include_shop: shopEnabled,
      shop_name: (shopName || '29 Jewellery').trim(),
      facebook_link: facebookLink || null,
      tiktok_link: tiktokLink || null,
      youtube_link: youtubeLink || null,
      branches: branchList,
      google_map_link: first.googleMapLink || null,
      location_name: first.locationName || first.name || null,
      latitude: first.latitude ?? null,
      longitude: first.longitude ?? null,
      phone_numbers: branchList.flatMap((b) =>
        Array.isArray(b.phones) && b.phones.length
          ? b.phones
          : b.phone
            ? [b.phone]
            : []
      ),
      avatar_filename: avatarFilename,
      qr_fg_color: qrFgColor || '#111111',
      qr_bg_color: qrBgColor || '#ffffff',
      updated_at: new Date().toISOString(),
    });

    let idsToRemove = [];
    if (removePhotoIds) {
      try {
        idsToRemove = Array.isArray(removePhotoIds)
          ? removePhotoIds
          : JSON.parse(removePhotoIds);
      } catch {
        idsToRemove = [];
      }
    }

    if (idsToRemove.length) {
      const removed = store.removePhotos(id, idsToRemove);
      for (const photo of removed) {
        removeFileIfExists(photo.filename);
      }
    }

    const photos = req.files?.photos || [];
    for (const file of photos) {
      store.addPhoto(id, file.filename, file.originalname);
    }

    res.json(mapProfile(store.getProfile(id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = store.getProfile(id);
    if (!existing) return res.status(404).json({ error: 'Profile not found' });

    const photos = store.getAllPhotosForProfile(id);
    store.deleteProfile(id);

    removeFileIfExists(existing.avatar_filename);
    for (const photo of photos) {
      removeFileIfExists(photo.filename);
    }

    res.json({ message: 'Profile deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete profile' });
  }
});

module.exports = router;
