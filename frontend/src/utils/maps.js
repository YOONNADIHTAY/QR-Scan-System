export function toGoogleMapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function toGoogleMapsQueryUrl(query) {
  const q = String(query || '').trim();
  if (!q) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

export function toGoogleDirectionsUrl(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function toGoogleDirectionsQueryUrl(query) {
  const q = String(query || '').trim();
  if (!q) return '';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

export function toGoogleEmbedUrl(lat, lng, zoom = 17, satellite = true) {
  const layer = satellite ? '&t=k' : '';
  return `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}${layer}&hl=en&output=embed`;
}

export function toGoogleEmbedQueryUrl(query, zoom = 17, satellite = true) {
  const q = String(query || '').trim();
  if (!q) return '';
  const layer = satellite ? '&t=k' : '';
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}${layer}&hl=en&output=embed`;
}

/** OpenStreetMap embed (works without API key) */
export function toOsmEmbedUrl(lat, lng, zoom = 16) {
  const la = Number(lat);
  const ln = Number(lng);
  if (Number.isNaN(la) || Number.isNaN(ln)) return '';
  const delta = Math.max(0.004, 0.18 / 2 ** Math.max(zoom - 10, 0));
  const west = ln - delta;
  const south = la - delta * 0.7;
  const east = ln + delta;
  const north = la + delta * 0.7;
  return (
    `https://www.openstreetmap.org/export/embed.html` +
    `?bbox=${west}%2C${south}%2C${east}%2C${north}` +
    `&layer=mapnik&marker=${la}%2C${ln}`
  );
}

/** Photo-style static map image fallbacks */
export function toStaticMapImageUrl(lat, lng, { zoom = 16, width = 720, height = 420 } = {}) {
  const la = Number(lat);
  const ln = Number(lng);
  if (Number.isNaN(la) || Number.isNaN(ln)) return '';
  return (
    `https://staticmap.openstreetmap.de/staticmap.php` +
    `?center=${la},${ln}&zoom=${zoom}&size=${width}x${height}` +
    `&maptype=mapnik&markers=${la},${ln},red-pushpin`
  );
}

export async function geocodeAddress(query) {
  const q = String(query || '').trim();
  if (!q) return null;
  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    const data = await res.json();
    const lat = Number(data?.lat);
    const lng = Number(data?.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/** Extract lat/lng from common Google Maps share / place URLs */
export function parseGoogleMapsLink(input) {
  if (!input || typeof input !== 'string') return null;
  const url = input.trim();

  const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
  }

  const qMatch = url.match(/[?&]q=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (qMatch) {
    return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) };
  }

  const destMatch = url.match(/[?&]destination=(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (destMatch) {
    return { lat: Number(destMatch[1]), lng: Number(destMatch[2]) };
  }

  const bangMatch = url.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (bangMatch) {
    return { lat: Number(bangMatch[1]), lng: Number(bangMatch[2]) };
  }

  const llMatch = url.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (llMatch) {
    return { lat: Number(llMatch[1]), lng: Number(llMatch[2]) };
  }

  return null;
}
