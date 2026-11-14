import { useState } from 'react';
import GoogleMapEmbed from './GoogleMapEmbed';
import {
  parseGoogleMapsLink,
  toGoogleMapsUrl,
} from '../utils/maps';

export { toGoogleMapsUrl, toGoogleDirectionsUrl } from '../utils/maps';

export default function LocationPicker({
  latitude,
  longitude,
  locationName,
  onChange,
}) {
  const [query, setQuery] = useState('');
  const [mapsLink, setMapsLink] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [geoError, setGeoError] = useState('');
  const [linkError, setLinkError] = useState('');

  const hasPin =
    latitude != null &&
    longitude != null &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude));

  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) return '';
      const data = await res.json();
      return (
        data.name ||
        data.display_name?.split(',').slice(0, 3).join(',') ||
        ''
      );
    } catch {
      return '';
    }
  }

  function applyLocation(lat, lng, name) {
    onChange({
      latitude: lat,
      longitude: lng,
      locationName: name || locationName || '',
      googleMapLink: toGoogleMapsUrl(lat, lng),
    });
  }

  async function searchPlaces() {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          query.trim()
        )}&limit=5`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function pickResult(item) {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    const name =
      item.display_name?.split(',').slice(0, 3).join(',') || item.name || '';
    setResults([]);
    setQuery(name);
    applyLocation(lat, lng, name);
  }

  function useMyLocation() {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported on this device.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const name = await reverseGeocode(lat, lng);
        applyLocation(lat, lng, name);
      },
      () =>
        setGeoError(
          'Could not get your location. Allow location access and try again.'
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function applyMapsLink() {
    setLinkError('');
    const parsed = parseGoogleMapsLink(mapsLink);
    if (parsed) {
      const name = (await reverseGeocode(parsed.lat, parsed.lng)) || locationName;
      applyLocation(parsed.lat, parsed.lng, name);
      return;
    }

    // Short links (maps.app.goo.gl) — try resolving via search if it looks like a place name
    if (/goo\.gl|maps\.app\.goo\.gl/i.test(mapsLink)) {
      setLinkError(
        'Short links may not include coordinates. Open the link, copy the full browser URL (with @lat,lng), then paste here.'
      );
      return;
    }

    setLinkError('Could not read coordinates from that link.');
  }

  function clearLocation() {
    setQuery('');
    setResults([]);
    setMapsLink('');
    onChange({
      latitude: null,
      longitude: null,
      locationName: '',
      googleMapLink: '',
    });
  }

  return (
    <div className="location-picker">
      <div className="location-toolbar">
        <div className="location-search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                searchPlaces();
              }
            }}
            placeholder="Search place"
            aria-label="Search place"
          />
          <button
            type="button"
            className="btn btn-ghost"
            disabled={searching}
            onClick={searchPlaces}
          >
            {searching ? '…' : 'Search'}
          </button>
        </div>
        <button type="button" className="btn btn-ghost" onClick={useMyLocation}>
          Use my location
        </button>
        {hasPin && (
          <button type="button" className="btn btn-danger" onClick={clearLocation}>
            Clear
          </button>
        )}
      </div>

      {results.length > 0 && (
        <ul className="location-results">
          {results.map((item) => (
            <li key={`${item.place_id}-${item.lat}`}>
              <button type="button" onClick={() => pickResult(item)}>
                {item.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {geoError && (
        <p className="hint" style={{ color: 'var(--danger)' }}>
          {geoError}
        </p>
      )}

      <div className="field">
        <label htmlFor="gmapsLink">Or paste Google Maps link</label>
        <div className="location-search">
          <input
            id="gmapsLink"
            type="url"
            value={mapsLink}
            onChange={(e) => setMapsLink(e.target.value)}
            placeholder="https://www.google.com/maps/place/..."
          />
          <button type="button" className="btn btn-ghost" onClick={applyMapsLink}>
            Use link
          </button>
        </div>
        {linkError && (
          <p className="hint" style={{ color: 'var(--danger)' }}>
            {linkError}
          </p>
        )}
      </div>

      {hasPin ? (
        <GoogleMapEmbed
          latitude={latitude}
          longitude={longitude}
          title="Selected location"
          className="map-canvas"
        />
      ) : (
        <div className="map-placeholder">
          Search a place, use GPS, or paste a Google Maps link to show the map.
        </div>
      )}

      <div className="field" style={{ marginTop: '0.75rem' }}>
        <label htmlFor="locationName">Location name</label>
        <input
          id="locationName"
          value={locationName || ''}
          onChange={(e) =>
            onChange({
              latitude,
              longitude,
              locationName: e.target.value,
              googleMapLink: hasPin
                ? toGoogleMapsUrl(Number(latitude), Number(longitude))
                : '',
            })
          }
          placeholder=""
        />
      </div>

      {hasPin && (
        <p className="hint">
          Pin: {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
        </p>
      )}
    </div>
  );
}
