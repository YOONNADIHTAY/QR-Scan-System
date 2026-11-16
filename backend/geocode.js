function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function expandAbbreviations(text) {
  return String(text || '')
    .replace(/\bSt\.?\b/gi, 'Street')
    .replace(/\bRd\.?\b/gi, 'Road')
    .replace(/\bAve\.?\b/gi, 'Avenue')
    .replace(/\bBlvd\.?\b/gi, 'Boulevard')
    .replace(/\bDr\.?\b/gi, 'Drive')
    .replace(/\bLn\.?\b/gi, 'Lane')
    .replace(/\bHwy\.?\b/gi, 'Highway');
}

function splitCompactWords(text) {
  return String(text || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHouseNumber(text) {
  return String(text || '')
    .replace(/^(no\.?|number|#)\s*/i, '')
    .replace(/^\d+[A-Za-z]?\s*[,/-]?\s*/, '')
    .trim();
}

function pushUnique(list, value) {
  const v = String(value || '').trim();
  if (!v) return;
  if (!list.includes(v)) list.push(v);
}

function isStreetLike(text) {
  return /\b(Street|Road|Avenue|Boulevard|Drive|Lane|Highway|St|Rd)\b/i.test(
    text || ''
  );
}

function isWeakPlaceResult(hit) {
  if (!hit?.displayName) return false;
  const top = String(hit.displayName)
    .split(',')
    .slice(0, 2)
    .join(', ')
    .trim();
  return /^(ရန်ကုန်မြို့|Yangon)(,|\s|$)/i.test(top);
}

function geocodeCandidates(raw) {
  const q = String(raw || '').trim();
  if (!q) return [];

  const expanded = expandAbbreviations(q);
  const spaced = splitCompactWords(expanded);
  const noHouse = stripHouseNumber(spaced);
  const parts = spaced
    .split(',')
    .map((p) => splitCompactWords(expandAbbreviations(p.trim())))
    .filter(Boolean);

  const streets = [];
  const others = [];

  pushUnique(others, q);
  pushUnique(others, expanded);
  pushUnique(others, spaced);
  pushUnique(others, noHouse);

  if (parts.length > 1) {
    pushUnique(others, parts.slice(0, 2).join(', '));
    pushUnique(others, parts.slice(-2).join(', '));
  }

  for (const part of parts.length ? parts : [spaced]) {
    const cleaned = stripHouseNumber(part);
    const streetish = cleaned.match(
      /^(.+?\b(?:Street|Road|Avenue|Boulevard|Drive|Lane|Highway|St\.?|Rd\.?))\b/i
    );
    if (streetish) {
      pushUnique(streets, expandAbbreviations(streetish[1]));
    } else if (isStreetLike(cleaned)) {
      pushUnique(streets, expandAbbreviations(cleaned));
    } else {
      pushUnique(others, cleaned);
    }
  }

  const prioritized = [];
  for (const street of streets) {
    pushUnique(prioritized, `${street}, Yangon, Myanmar`);
    pushUnique(prioritized, `${street}, Yangon`);
    pushUnique(prioritized, street);
  }
  for (const item of others) {
    if (!/yangon|myanmar|ရန်ကုန်/i.test(item)) {
      pushUnique(prioritized, `${item}, Yangon, Myanmar`);
      pushUnique(prioritized, `${item}, Yangon`);
    }
    pushUnique(prioritized, item);
  }
  return prioritized;
}

async function photonSearch(q) {
  try {
    const url =
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
      `&limit=1&lang=en`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data?.features?.[0];
    if (!feature) return null;
    const [lng, lat] = feature.geometry?.coordinates || [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const props = feature.properties || {};
    const displayName = [props.name, props.city, props.state, props.country]
      .filter(Boolean)
      .join(', ');
    return { lat, lng, displayName: displayName || q };
  } catch {
    return null;
  }
}

async function nominatimRequest(q, { countrycodes } = {}) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    q,
    limit: '1',
    addressdetails: '1',
  });
  if (countrycodes) params.set('countrycodes', countrycodes);
  try {
    const upstream = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': '29JewelleryQRStudio/1.0 (local-dev)',
        },
      }
    );
    if (!upstream.ok) return null;
    const text = await upstream.text();
    if (!text || text.trim().startsWith('<')) return null;
    const data = JSON.parse(text);
    if (!Array.isArray(data) || !data[0]) return null;
    const lat = Number(data[0].lat);
    const lng = Number(data[0].lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng, displayName: data[0].display_name || q };
  } catch {
    return null;
  }
}

async function geocodeQuery(q) {
  const candidates = geocodeCandidates(q).slice(0, 10);
  let weakHit = null;

  // Photon first — faster and less rate-limited
  for (const candidate of candidates) {
    const hit = await photonSearch(candidate);
    if (!hit) continue;
    if (isWeakPlaceResult(hit)) {
      if (!weakHit) weakHit = hit;
      continue;
    }
    return hit;
  }

  for (let i = 0; i < Math.min(candidates.length, 5); i += 1) {
    if (i > 0) await sleep(700);
    const hit = await nominatimRequest(candidates[i], { countrycodes: 'mm' });
    if (!hit) continue;
    if (isWeakPlaceResult(hit)) {
      if (!weakHit) weakHit = hit;
      continue;
    }
    return hit;
  }

  return (
    weakHit || {
      lat: 16.8409,
      lng: 96.1735,
      displayName: 'Yangon, Myanmar',
    }
  );
}

module.exports = {
  geocodeCandidates,
  geocodeQuery,
};
