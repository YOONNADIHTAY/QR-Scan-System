import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  geocodeAddress,
  toGoogleDirectionsQueryUrl,
  toGoogleDirectionsUrl,
  toGoogleMapsQueryUrl,
  toGoogleMapsUrl,
} from '../utils/maps';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

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

  return (
    <div className="scan-location-map">
      <div className="scan-map-classic">
        {coords ? (
          <MapContainer
            key={`${coords.lat},${coords.lng}`}
            center={[coords.lat, coords.lng]}
            zoom={16}
            scrollWheelZoom={false}
            className="scan-leaflet-map"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[coords.lat, coords.lng]} icon={markerIcon} />
          </MapContainer>
        ) : (
          <div className={`scan-map-photo-fallback ${loading ? 'is-loading' : ''}`}>
            <span>{loading ? 'Loading map…' : 'Map unavailable'}</span>
          </div>
        )}
      </div>

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
