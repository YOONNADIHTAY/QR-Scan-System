import { toGoogleMapsUrl } from './maps';

function extractPhone(extratags = {}) {
  return (
    extratags.phone ||
    extratags['contact:phone'] ||
    extratags['contact:mobile'] ||
    extratags.mobile ||
    ''
  )
    .split(';')[0]
    .trim();
}

function shortBranchName(displayName, typed) {
  if (typed?.trim()) return typed.trim();
  return displayName?.split(',')[0]?.trim() || 'Branch';
}

async function nominatimSearch(query) {
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2` +
    `&q=${encodeURIComponent(query)}` +
    `&limit=5&addressdetails=1&extratags=1`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function nominatimLookup(osmType, osmId) {
  const typeChar = String(osmType || '').toUpperCase().startsWith('R')
    ? 'R'
    : String(osmType || '').toUpperCase().startsWith('W')
      ? 'W'
      : 'N';
  const url =
    `https://nominatim.openstreetmap.org/lookup?format=json` +
    `&osm_ids=${typeChar}${osmId}&addressdetails=1&extratags=1`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return Array.isArray(data) && data[0] ? data[0] : null;
}

/** Search 29 Jewellery branch by area name like "Tamwe" */
export async function lookupJewelleryBranch(areaName) {
  const typed = (areaName || '').trim();
  if (!typed) return { results: [], error: 'Type a branch area, e.g. Tamwe' };

  const queries = [
    `29 Jewellery ${typed} Yangon Myanmar`,
    `29 Jewellery ${typed} Myanmar`,
    `29 ရတနာ ${typed}`,
    `${typed} 29 Jewellery`,
  ];

  const seen = new Set();
  const merged = [];

  for (const q of queries) {
    try {
      const list = await nominatimSearch(q);
      for (const item of list) {
        const key = `${item.osm_type}-${item.osm_id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      }
    } catch {
      // continue other queries
    }
  }

  if (!merged.length) {
    // fallback: just geocode the township, user can still set map there
    try {
      const fallback = await nominatimSearch(`${typed} Township Yangon Myanmar`);
      if (fallback[0]) merged.push(fallback[0]);
    } catch {
      /* ignore */
    }
  }

  if (!merged.length) {
    return {
      results: [],
      error: `No place found for “${typed}”. Try another spelling.`,
    };
  }

  const results = [];
  for (const item of merged.slice(0, 5)) {
    let detail = item;
    try {
      const looked = await nominatimLookup(item.osm_type, item.osm_id);
      if (looked) detail = { ...item, ...looked, extratags: { ...item.extratags, ...looked.extratags } };
    } catch {
      /* use item as-is */
    }

    const lat = Number(detail.lat);
    const lng = Number(detail.lon);
    const address = detail.display_name || '';
    const phone = extractPhone(detail.extratags || {});
    const name = shortBranchName(address, typed);

    results.push({
      name,
      address,
      phone,
      latitude: lat,
      longitude: lng,
      locationName: address,
      googleMapLink: toGoogleMapsUrl(lat, lng),
      label: address,
    });
  }

  return { results, error: '' };
}
