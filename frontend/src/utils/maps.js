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

export function toGoogleEmbedUrl(lat, lng, zoom = 16) {
  return `https://www.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;
}

export function toGoogleEmbedQueryUrl(query, zoom = 16) {
  const q = String(query || '').trim();
  if (!q) return '';
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=${zoom}&output=embed`;
}

/** Photo-style static map image (no Google API key needed) */
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
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2` +
    `&q=${encodeURIComponent(q)}&limit=1`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || !data[0]) return null;
  const lat = Number(data[0].lat);
  const lng = Number(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
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
