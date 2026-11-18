const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { randomUUID } = require('crypto');
const store = require('../db/database');
const { geocodeQuery } = require('../geocode');
const {
  attachUser,
  requireAuth,
  requireAdmin,
  requireProfileAccess,
} = require('../middleware/auth');

const router = express.Router();
router.use(attachUser);

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

async function enrichBranches(branches) {
  const list = Array.isArray(branches) ? branches : [];
  const out = [];
  for (const b of list) {
    if (b.latitude != null && b.longitude != null) {
      out.push(b);
      continue;
    }
    const raw = String(b.address || b.locationName || b.name || '').trim();
    const q = raw
      ? /29\s*jewellery/i.test(raw)
        ? raw
        : `29 Jewellery ${raw}, Yangon, Myanmar`
      : '';
    const coords = q ? await geocodeQuery(q) : null;
    if (coords) {
      out.push({
        ...b,
        latitude: coords.lat,
        longitude: coords.lng,
        googleMapLink:
          b.googleMapLink ||
          `https://www.google.com/maps?q=${coords.lat},${coords.lng}`,
      });
    } else if (raw) {
      // Keep a Google search link so scan page can embed the street even without lat/lng
      out.push({
        ...b,
        googleMapLink:
          b.googleMapLink ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            /29\s*jewellery/i.test(raw) ? raw : `29 Jewellery ${raw}, Yangon`
          )}`,
      });
    } else {
      out.push(b);
    }
  }
  return out;
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

function parsePersonalPhones(value, fallback = '') {
  if (Array.isArray(value) && value.length) {
    return value.map((p) => String(p || '').trim()).filter(Boolean);
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((p) => String(p || '').trim()).filter(Boolean);
      }
    } catch {
      /* plain string or comma-separated */
    }
    return value
      .split(/[,;\n]+/)
      .map((p) => p.trim())
      .filter(Boolean);
  }
  const single = String(fallback || '').trim();
  return single ? [single] : [];
}

function mapProfile(row) {
  const branches =
    Array.isArray(row.branches) && row.branches.length
      ? row.branches
      : legacyBranches(row);

  const first = branches[0] || {};
  const includeShop = row.include_shop !== false;
  const personalPhones = parsePersonalPhones(
    row.personal_phones,
    row.personal_phone
  );
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    position: row.description || '',
    aboutMe: row.about_me || '',
    department: row.department || '',
    personalPhone: personalPhones[0] || row.personal_phone || '',
    personalPhones,
    personalEmail: row.personal_email || '',
    personalLocation: row.personal_location || '',
    includeShop,
    shopName: row.shop_name || '29 Jewellery',
    facebookLink: row.facebook_link || '',
    tiktokLink: row.tiktok_link || '',
    youtubeLink: row.youtube_link || '',
    viberNumber: row.viber_number || '',
    whatsappLink: row.whatsapp_link || row.whatsapp_number || '',
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
    qrFrame: row.qr_frame || 'none',
    active: row.active !== false,
    scanCount: Number(row.scan_count) || 0,
    lastScannedAt: row.last_scanned_at || null,
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

router.get('/', requireAuth, (req, res) => {
  try {
    if (req.user.role === 'admin') {
      return res.json(store.getAllProfiles().map(mapProfile));
    }
    if (!req.user.profileId) {
      return res.json([]);
    }
    const row = store.getProfile(req.user.profileId);
    return res.json(row ? [mapProfile(row)] : []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

router.get('/:id', requireAuth, requireProfileAccess, (req, res) => {
  try {
    const row = store.getProfile(req.params.id);
    if (!row) return res.status(404).json({ error: 'Profile not found' });
    res.json(mapProfile(row));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.get('/:id/stats', requireAuth, requireProfileAccess, (req, res) => {
  try {
    const stats = store.getProfileScanStats(req.params.id);
    if (!stats) return res.status(404).json({ error: 'Profile not found' });
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load scan statistics' });
  }
});

router.post('/', requireAdmin, uploadFields, async (req, res) => {
  try {
    const id = randomUUID();
    const {
      name,
      description,
      position,
      aboutMe,
      department,
      personalPhone,
      personalPhones,
      personalEmail,
      personalLocation,
      includeShop,
      shopName,
      facebookLink,
      tiktokLink,
      youtubeLink,
      viberNumber,
      whatsappLink,
      whatsappNumber,
      branches,
      qrFgColor,
      qrBgColor,
      staffEmail,
      staffPassword,
      createStaffLogin,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Employee name is required' });
    }

    const shopEnabled = parseBool(includeShop, true);
    const branchList = shopEnabled
      ? await enrichBranches(parseBranches(branches))
      : [];
    const first = branchList[0] || {};
    const now = new Date().toISOString();
    const avatarFile = req.files?.avatar?.[0];
    const departmentValue = String(department || '').trim() || null;
    const positionValue =
      String(position || description || '').trim() || null;
    const phoneList = parsePersonalPhones(personalPhones, personalPhone);

    const profile = {
      id,
      name: name.trim(),
      description: positionValue,
      about_me: String(aboutMe || '').trim() || null,
      department: departmentValue,
      personal_phone: phoneList[0] || null,
      personal_phones: phoneList,
      personal_email: String(personalEmail || '').trim() || null,
      personal_location: String(personalLocation || '').trim() || null,
      include_shop: shopEnabled,
      shop_name: (shopName || '29 Jewellery').trim(),
      facebook_link: facebookLink || null,
      tiktok_link: tiktokLink || null,
      youtube_link: youtubeLink || null,
      viber_number: String(viberNumber || '').trim() || null,
      whatsapp_link:
        String(whatsappLink || whatsappNumber || '').trim() || null,
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
      qr_frame: req.body.qrFrame || 'none',
      active: true,
      scan_count: 0,
      last_scanned_at: null,
      created_at: now,
      updated_at: now,
    };

    store.createProfile(profile);

    const photos = req.files?.photos || [];
    for (const file of photos) {
      store.addPhoto(id, file.filename, file.originalname);
    }

    let staffUser = null;
    // Staff access = profile Email (Gmail). Sign in with Google matches this address.
    const googleLoginEmail = String(personalEmail || staffEmail || '')
      .trim()
      .toLowerCase();
    const skipStaffLogin =
      createStaffLogin === 'false' || createStaffLogin === false;
    if (googleLoginEmail && !skipStaffLogin) {
      try {
        staffUser = store.createUser({
          email: googleLoginEmail,
          password: String(staffPassword || 'google:pending'),
          name: name.trim(),
          role: 'staff',
          profileId: id,
        });
      } catch (err) {
        return res.status(201).json({
          ...mapProfile(store.getProfile(id)),
          staffLoginError: err.message,
        });
      }
    }

    res.status(201).json({
      ...mapProfile(store.getProfile(id)),
      staffUser,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to create profile' });
  }
});

router.put('/:id', requireAuth, requireProfileAccess, uploadFields, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = store.getProfile(id);
    if (!existing) return res.status(404).json({ error: 'Profile not found' });

    const {
      name,
      description,
      position,
      aboutMe,
      department,
      personalPhone,
      personalPhones,
      personalEmail,
      personalLocation,
      includeShop,
      shopName,
      facebookLink,
      tiktokLink,
      youtubeLink,
      viberNumber,
      whatsappLink,
      whatsappNumber,
      branches,
      removePhotoIds,
      removeAvatar,
      qrFgColor,
      qrBgColor,
      qrFrame,
      active,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Employee name is required' });
    }

    const shopEnabled = parseBool(includeShop, true);
    const branchList = shopEnabled
      ? await enrichBranches(parseBranches(branches))
      : [];
    const first = branchList[0] || {};
    const avatarFile = req.files?.avatar?.[0];
    let avatarFilename = existing.avatar_filename || null;
    const departmentValue = String(department || '').trim() || null;
    const positionValue =
      String(position || description || '').trim() || null;
    const phoneList = parsePersonalPhones(personalPhones, personalPhone);

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
      description: positionValue,
      about_me: String(aboutMe || '').trim() || null,
      department: departmentValue,
      personal_phone: phoneList[0] || null,
      personal_phones: phoneList,
      personal_email: String(personalEmail || '').trim() || null,
      personal_location: String(personalLocation || '').trim() || null,
      include_shop: shopEnabled,
      shop_name: (shopName || '29 Jewellery').trim(),
      facebook_link: facebookLink || null,
      tiktok_link: tiktokLink || null,
      youtube_link: youtubeLink || null,
      viber_number: String(viberNumber || '').trim() || null,
      whatsapp_link:
        String(whatsappLink || whatsappNumber || '').trim() || null,
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
      qr_frame: qrFrame || existing.qr_frame || 'none',
      updated_at: new Date().toISOString(),
      ...(active !== undefined
        ? { active: !(active === 'false' || active === false || active === '0') }
        : {}),
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

router.patch('/:id/design', requireAuth, requireProfileAccess, upload.single('avatar'), (req, res) => {
  try {
    const { id } = req.params;
    const existing = store.getProfile(id);
    if (!existing) return res.status(404).json({ error: 'Profile not found' });

    const qrFgColor = req.body.qrFgColor || existing.qr_fg_color || '#111111';
    const qrBgColor = req.body.qrBgColor || existing.qr_bg_color || '#ffffff';
    const qrFrame = req.body.qrFrame || existing.qr_frame || 'none';
    let avatarFilename = existing.avatar_filename || null;

    if (req.body.removeAvatar === 'true' || req.body.removeAvatar === true) {
      removeFileIfExists(avatarFilename);
      avatarFilename = null;
    }
    if (req.file) {
      removeFileIfExists(avatarFilename);
      avatarFilename = req.file.filename;
    }

    // Design-only: never change profile id / scan URL fields
    store.updateProfile(id, {
      qr_fg_color: qrFgColor,
      qr_bg_color: qrBgColor,
      qr_frame: qrFrame,
      avatar_filename: avatarFilename,
      updated_at: new Date().toISOString(),
    });

    res.json(mapProfile(store.getProfile(id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Failed to update design' });
  }
});

router.patch('/:id/active', requireAdmin, (req, res) => {
  try {
    const existing = store.getProfile(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Profile not found' });
    const active = !(
      req.body?.active === false ||
      req.body?.active === 'false' ||
      req.body?.active === 0 ||
      req.body?.active === '0'
    );
    store.updateProfile(req.params.id, {
      active,
      updated_at: new Date().toISOString(),
    });
    res.json(mapProfile(store.getProfile(req.params.id)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.delete('/:id', requireAdmin, (req, res) => {
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
module.exports.mapProfile = mapProfile;
