require('dotenv').config();
const express = require('express');
const cors = require('cors');
const os = require('os');
const path = require('path');
const profilesRouter = require('./routes/profiles');
const authRouter = require('./routes/auth');
const store = require('./db/database');
const { renderScanHtml } = require('./scanHtml');
const { geocodeQuery } = require('./geocode');

const app = express();
const PORT = process.env.PORT || 5000;
const { mapProfile } = profilesRouter;

function getLanIp() {
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) {
    for (const net of entries || []) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
}

const lanIp = getLanIp();
const publicUrl = (
  process.env.PUBLIC_URL || `http://${lanIp}:${PORT}`
).replace(/\/$/, '');

app.use(
  cors({
    origin: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/auth', authRouter);
app.use('/api/profiles', profilesRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/config', (_req, res) => {
  res.json({
    publicUrl,
    lanUrl: `http://${lanIp}:${PORT}`,
    googleClientId:
      process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '',
  });
});

function parseCoord(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function enrichScanBranches(branches) {
  const list = Array.isArray(branches) ? branches : [];
  const out = [];
  for (const branch of list) {
    const lat = parseCoord(branch.latitude);
    const lng = parseCoord(branch.longitude);
    if (lat != null && lng != null) {
      out.push({ ...branch, latitude: lat, longitude: lng });
      continue;
    }
    const place = String(
      branch.address || branch.locationName || branch.name || ''
    ).trim();
    if (!place) {
      out.push(branch);
      continue;
    }
    const hit = await geocodeQuery(place);
    if (hit) {
      out.push({
        ...branch,
        latitude: hit.lat,
        longitude: hit.lng,
        googleMapLink:
          branch.googleMapLink ||
          `https://www.google.com/maps?q=${hit.lat},${hit.lng}`,
      });
    } else {
      out.push(branch);
    }
  }
  return out;
}

app.get('/api/geocode', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Query is required' });

    const hit = await geocodeQuery(q);
    if (hit) return res.json(hit);
    res.json({ lat: null, lng: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Geocode failed' });
  }
});

async function loadPublicScanProfile(id, userAgent = '') {
  const row = store.getProfile(id);
  if (!row) return { status: 404, error: 'Profile not found' };
  if (row.active === false) {
    return { status: 403, error: 'This QR is deactivated' };
  }
  store.recordScan(row.id, { userAgent });
  const profile = mapProfile(store.getProfile(row.id) || row);
  profile.branches = await enrichScanBranches(profile.branches);
  return { status: 200, profile };
}

/** Public JSON for camera / SPA scan page (no login required) */
app.get('/api/scan/:id', async (req, res) => {
  try {
    const result = await loadPublicScanProfile(
      req.params.id,
      req.headers['user-agent'] || ''
    );
    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json(result.profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load scan profile' });
  }
});

const distPath = path.join(__dirname, '..', 'frontend', 'dist');
const publicAssets = path.join(__dirname, '..', 'frontend', 'public');

// Lightweight HTML scan page (no large JS bundle) — reliable over free tunnels
app.get('/scan/:id', async (req, res) => {
  try {
    const result = await loadPublicScanProfile(
      req.params.id,
      req.headers['user-agent'] || ''
    );
    if (result.status === 404) {
      res
        .status(404)
        .type('html')
        .send(
          '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not found</title><p style="font-family:sans-serif;padding:2rem">Profile not found.</p>'
        );
      return;
    }
    if (result.status === 403) {
      res
        .status(403)
        .type('html')
        .send(
          '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>Inactive</title><p style="font-family:sans-serif;padding:2rem">This QR is deactivated.</p>'
        );
      return;
    }
    res.type('html').send(renderScanHtml(result.profile));
  } catch (err) {
    console.error(err);
    res.status(500).type('html').send('<p>Failed to load scan page.</p>');
  }
});

app.use(express.static(distPath));
app.use(express.static(publicAssets));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next();
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`QR Generator running on http://localhost:${PORT}`);
  console.log(`Phone (same WiFi): ${publicUrl}`);
});
