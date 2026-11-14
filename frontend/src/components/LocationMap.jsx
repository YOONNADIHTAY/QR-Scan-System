import { useEffect, useState } from 'react';
import {
  geocodeAddress,
  toGoogleDirectionsQueryUrl,
  toGoogleDirectionsUrl,
  toGoogleMapsQueryUrl,
  toGoogleMapsUrl,
  toStaticMapImageUrl,
} from '../utils/maps';

export default function LocationMap({
  latitude,
  longitude,
  locationName,
  address,
  googleMapLink,
}) {
  const place = String(address || locationName || '').trim();
  const initialLat = Number(latitude);
  const initialLng = Number(longitude);
  const hasInitial =
    !Number.isNaN(initialLat) && !Number.isNaN(initialLng);

  const [coords, setCoords] = useState(
    hasInitial ? { lat: initialLat, lng: initialLng } : null
  );
  const [loading, setLoading] = useState(!hasInitial && Boolean(place));

  useEffect(() => {
    if (hasInitial) {
      setCoords({ lat: initialLat, lng: initialLng });
      setLoading(false);
      return;
    }
    if (!place) {
      setCoords(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    setLoading(true);
    geocodeAddress(place)
      .then((result) => {
        if (!cancelled) setCoords(result);
      })
      .catch(() => {
        if (!cancelled) setCoords(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hasInitial, initialLat, initialLng, place]);

  if (!coords && !place && !googleMapLink) return null;

  const mapsUrl =
    googleMapLink ||
    (coords ? toGoogleMapsUrl(coords.lat, coords.lng) : toGoogleMapsQueryUrl(place));
  const directionsUrl = coords
    ? toGoogleDirectionsUrl(coords.lat, coords.lng)
    : toGoogleDirectionsQueryUrl(place);
  const photoUrl = coords
    ? toStaticMapImageUrl(coords.lat, coords.lng, { zoom: 16, width: 720, height: 420 })
    : '';

  return (
    <div className="scan-location-map">
      <a
        className="scan-map-photo-link"
        href={mapsUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="Open location in Google Maps"
      >
        {photoUrl ? (
          <img
            className="scan-map-photo"
            src={photoUrl}
            alt={place || 'Map location'}
            loading="eager"
          />
        ) : (
          <div className={`scan-map-photo-fallback ${loading ? 'is-loading' : ''}`}>
            <span>{loading ? 'Loading map…' : 'Open map'}</span>
          </div>
        )}
        <span className="scan-map-photo-badge">Google Maps</span>
      </a>

      <div className="map-actions">
        {mapsUrl && (
          <a className="btn btn-primary" href={mapsUrl} target="_blank" rel="noreferrer">
            Open in Google Maps
          </a>
        )}
        {directionsUrl && (
          <a className="btn btn-ghost" href={directionsUrl} target="_blank" rel="noreferrer">
            Get directions
          </a>
        )}
      </div>
    </div>
  );
}
