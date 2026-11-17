import { useEffect, useMemo, useState } from 'react';
import {
  geocodeAddress,
  toGoogleDirectionsQueryUrl,
  toGoogleDirectionsUrl,
  toGoogleEmbedQueryUrl,
  toGoogleEmbedUrl,
  toGoogleMapsQueryUrl,
  toGoogleMapsUrl,
} from '../utils/maps';

function shopSearchQuery(place) {
  const q = String(place || '').trim();
  if (!q) return '';
  if (/29\s*jewellery/i.test(q)) return q;
  return `29 Jewellery ${q}, Yangon`;
}

export default function LocationMap({
  latitude,
  longitude,
  locationName,
  address,
  googleMapLink,
}) {
  const place = String(address || locationName || '').trim();
  const searchQ = shopSearchQuery(place);
  const initialLat = Number(latitude);
  const initialLng = Number(longitude);
  const hasInitial =
    !Number.isNaN(initialLat) && !Number.isNaN(initialLng);

  const [coords, setCoords] = useState(
    hasInitial ? { lat: initialLat, lng: initialLng } : null
  );

  useEffect(() => {
    if (hasInitial) {
      setCoords({ lat: initialLat, lng: initialLng });
      return undefined;
    }
    if (!place) {
      setCoords(null);
      return undefined;
    }

    let cancelled = false;
    geocodeAddress(searchQ || place)
      .then((result) => {
        if (!cancelled && result) setCoords(result);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [hasInitial, initialLat, initialLng, place, searchQ]);

  const embedUrl = useMemo(() => {
    if (coords) return toGoogleEmbedUrl(coords.lat, coords.lng, 17, false);
    if (searchQ || place) return toGoogleEmbedQueryUrl(searchQ || place, 16, false);
    return '';
  }, [coords, searchQ, place]);

  const mapsUrl =
    googleMapLink ||
    (coords
      ? toGoogleMapsUrl(coords.lat, coords.lng)
      : toGoogleMapsQueryUrl(searchQ || place));
  const directionsUrl = coords
    ? toGoogleDirectionsUrl(coords.lat, coords.lng)
    : toGoogleDirectionsQueryUrl(searchQ || place);

  if (!embedUrl && !mapsUrl) return null;

  return (
    <div className="scan-location-map">
      <div className="scan-map-classic">
        {embedUrl ? (
          <iframe
            className="scan-google-embed"
            title={place || 'Shop map'}
            src={embedUrl}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <div className="scan-map-photo-fallback">
            <span>Map unavailable</span>
          </div>
        )}
      </div>

      <div className="map-actions">
        {mapsUrl ? (
          <a className="btn btn-primary" href={mapsUrl} target="_blank" rel="noreferrer">
            Open in Google Maps
          </a>
        ) : null}
        {directionsUrl ? (
          <a className="btn btn-ghost" href={directionsUrl} target="_blank" rel="noreferrer">
            Get directions
          </a>
        ) : null}
      </div>
    </div>
  );
}
