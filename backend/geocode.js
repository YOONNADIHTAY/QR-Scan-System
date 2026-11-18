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

/** Common Yangon township aliases (EN + MY) for result filtering */
const TOWNSHIPS = [
  { key: 'tamwe', patterns: [/\btamwe\b/i, /\btarmwe\b/i, /တာမွေ/] },
  { key: 'dala', patterns: [/\bdala\b/i, /ဒလ/] },
  { key: 'twante', patterns: [/\btwante\b/i, /\btwante\b/i, /တွံတေး/] },
  { key: 'bahan', patterns: [/\bbahan\b/i, /ဗဟန်း/] },
  { key: 'sanchaung', patterns: [/\bsanchaung\b/i, /စမ်းချောင်း/] },
  { key: 'kamayut', patterns: [/\bkamayut\b/i, /ကမာရွတ်/] },
  { key: 'mayangone', patterns: [/\bmayangone\b/i, /\bmayangon\b/i, /မရမ်းကုန်း/] },
  { key: 'thingangyun', patterns: [/\bthingangyun\b/i, /သင်္ဃန်းကျွန်း/] },
  { key: 'yankin', patterns: [/\byankin\b/i, /ရန်ကင်း/] },
  { key: 'mingaladon', patterns: [/\bmingaladon\b/i, /မင်္ဂလာဒုံ/] },
  { key: 'hlaiing', patterns: [/\bhlaing\b/i, /လှိုင်/] },
  { key: 'insein', patterns: [/\binsein\b/i, /အင်းစိန်/] },
  { key: 'kyauktada', patterns: [/\bkyauktada\b/i, /ကျောက်တံတား/] },
  { key: 'pabedan', patterns: [/\bpabedan\b/i, /ပန်းဘဲတန်း/] },
  { key: 'lanmadaw', patterns: [/\blanmadaw\b/i, /လမ်းမတော်/] },
  { key: 'botataung', patterns: [/\bbotataung\b/i, /ဗိုလ်တထောင်/] },
  { key: 'pazundaung', patterns: [/\bpazundaung\b/i, /ပုဇွန်တောင်/] },
  { key: 'dawbon', patterns: [/\bdawbon\b/i, /ဒေါပုံ/] },
  { key: 'thaketa', patterns: [/\bthaketa\b/i, /သာကေတ/] },
  { key: 'south okkalapa', patterns: [/\bsouth\s*okkalapa\b/i, /တောင်ဥက္ကလာပ/] },
  { key: 'north okkalapa', patterns: [/\bnorth\s*okkalapa\b/i, /မြောက်ဥက္ကလာပ/] },
];

function detectTownships(text) {
  const s = String(text || '');
  return TOWNSHIPS.filter((t) => t.patterns.some((re) => re.test(s))).map(
    (t) => t.key
  );
}

function hitMatchesTownship(hit, wanted) {
  if (!wanted.length) return true;
  const found = detectTownships(hit?.displayName || '');
  if (!found.length) return true; // unknown — keep as soft candidate
  return found.some((t) => wanted.includes(t));
}

function hitConflictsTownship(hit, wanted) {
  if (!wanted.length) return false;
  const found = detectTownships(hit?.displayName || '');
  if (!found.length) return false;
  return found.every((t) => !wanted.includes(t));
}

function stripShopBrand(text) {
  return String(text || '')
    .replace(/\b29\s*jewellery\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function geocodeCandidates(raw) {
  const q = stripShopBrand(raw);
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

  const townships = detectTownships(q);
  const townshipLabel = townships[0]
    ? townships[0].replace(/\b\w/g, (c) => c.toUpperCase())
    : '';

  const prioritized = [];
  for (const street of streets) {
    if (townshipLabel) {
      pushUnique(prioritized, `${street}, ${townshipLabel}, Yangon, Myanmar`);
      pushUnique(prioritized, `${street}, ${townshipLabel}, Yangon`);
    }
    pushUnique(prioritized, `${street}, Yangon, Myanmar`);
    pushUnique(prioritized, `${street}, Yangon`);
    pushUnique(prioritized, street);
  }
  for (const item of others) {
    if (!/yangon|myanmar|ရန်ကုန်/i.test(item)) {
      if (townshipLabel && !new RegExp(townshipLabel, 'i').test(item)) {
        pushUnique(prioritized, `${item}, ${townshipLabel}, Yangon, Myanmar`);
      }
      pushUnique(prioritized, `${item}, Yangon, Myanmar`);
      pushUnique(prioritized, `${item}, Yangon`);
    }
    pushUnique(prioritized, item);
  }
  return prioritized;
}

async function photonSearch(q, { limit = 5 } = {}) {
  try {
    const url =
      `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
      `&limit=${limit}&lang=en`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const features = Array.isArray(data?.features) ? data.features : [];
    return features
      .map((feature) => {
        const [lng, lat] = feature.geometry?.coordinates || [];
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const props = feature.properties || {};
        const displayName = [props.name, props.city, props.state, props.country]
          .filter(Boolean)
          .join(', ');
        return { lat, lng, displayName: displayName || q };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

async function nominatimRequest(q, { countrycodes, limit = 5 } = {}) {
  const params = new URLSearchParams({
    format: 'jsonv2',
    q,
    limit: String(limit),
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
    if (!upstream.ok) return [];
    const text = await upstream.text();
    if (!text || text.trim().startsWith('<')) return [];
    const data = JSON.parse(text);
    if (!Array.isArray(data) || !data.length) return [];
    return data
      .map((row) => {
        const lat = Number(row.lat);
        const lng = Number(row.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng, displayName: row.display_name || q };
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function pickBestHit(hits, wantedTownships) {
  if (!hits?.length) return null;
  const matching = hits.filter((h) => hitMatchesTownship(h, wantedTownships));
  const pool = matching.length ? matching : hits;
  const nonConflicting = pool.filter(
    (h) => !hitConflictsTownship(h, wantedTownships)
  );
  const finalPool = nonConflicting.length ? nonConflicting : [];
  if (!finalPool.length && wantedTownships.length) return null;

  for (const hit of finalPool.length ? finalPool : pool) {
    if (!isWeakPlaceResult(hit)) return hit;
  }
  return (finalPool.length ? finalPool : pool)[0] || null;
}

async function geocodeQuery(q) {
  const wantedTownships = detectTownships(q);
  const candidates = geocodeCandidates(q).slice(0, 10);
  let weakHit = null;
  let softHit = null;

  // Prefer Nominatim when a township is named — Photon often mismatches Myanmar roads
  if (wantedTownships.length) {
    for (let i = 0; i < Math.min(candidates.length, 6); i += 1) {
      if (i > 0) await sleep(700);
      const hits = await nominatimRequest(candidates[i], {
        countrycodes: 'mm',
        limit: 5,
      });
      const best = pickBestHit(hits, wantedTownships);
      if (!best) continue;
      if (isWeakPlaceResult(best)) {
        if (!weakHit) weakHit = best;
        continue;
      }
      if (hitConflictsTownship(best, wantedTownships)) continue;
      return best;
    }
  }

  for (const candidate of candidates) {
    const hits = await photonSearch(candidate, { limit: 5 });
    const best = pickBestHit(hits, wantedTownships);
    if (!best) continue;
    if (hitConflictsTownship(best, wantedTownships)) continue;
    if (isWeakPlaceResult(best)) {
      if (!weakHit) weakHit = best;
      continue;
    }
    if (wantedTownships.length && !hitMatchesTownship(best, wantedTownships)) {
      if (!softHit) softHit = best;
      continue;
    }
    return best;
  }

  if (!wantedTownships.length) {
    for (let i = 0; i < Math.min(candidates.length, 5); i += 1) {
      if (i > 0) await sleep(700);
      const hits = await nominatimRequest(candidates[i], {
        countrycodes: 'mm',
        limit: 5,
      });
      const best = pickBestHit(hits, wantedTownships);
      if (!best) continue;
      if (isWeakPlaceResult(best)) {
        if (!weakHit) weakHit = best;
        continue;
      }
      return best;
    }
  }

  // No reliable pin — return null so the UI can fall back to Google text search
  // instead of dropping a wrong pin (e.g. Dala for a Tamwe street).
  if (wantedTownships.length) return null;

  return softHit || weakHit || null;
}

module.exports = {
  geocodeCandidates,
  geocodeQuery,
  detectTownships,
};
