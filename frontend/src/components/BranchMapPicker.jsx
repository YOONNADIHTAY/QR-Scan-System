import { useState } from 'react';
import GoogleMapEmbed from './GoogleMapEmbed';
import { parseGoogleMapsLink, toGoogleMapsUrl } from '../utils/maps';

export default function BranchMapPicker({ latitude, longitude, locationName, onSelect }) {
  const [query, setQuery] = useState(locationName || '29 Jewellery');
  const [mapsLink, setMapsLink] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  const hasPin =
    latitude != null &&
    longitude != null &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude));

  async function searchBranches() {
    const q = query.trim() || '29 Jewellery';
    setSearching(true);
    setResults([]);
    setError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
          q
        )}&limit=6`,
        { headers: { Accept: 'application/json' } }
      );
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setResults(list);
      if (!list.length) setError('No places found. Try “29 Jewellery Tamwe”.');
    } catch {
      setError('Search failed. Try again.');
    } finally {
      setSearching(false);
    }
  }

  function pickResult(item) {
    const lat = Number(item.lat);
    const lng = Number(item.lon);
    const name =
      item.name ||
      item.display_name?.split(',').slice(0, 2).join(',') ||
      'Branch';
    setResults([]);
    setQuery(name);
    onSelect({
      latitude: lat,
      longitude: lng,
      locationName: name,
      googleMapLink: toGoogleMapsUrl(lat, lng),
    });
  }

  async function useMapsLink() {
    setError('');
    const parsed = parseGoogleMapsLink(mapsLink);
    if (!parsed) {
      setError('Could not read that Google Maps link. Paste the full maps URL.');
      return;
    }
    onSelect({
      latitude: parsed.lat,
      longitude: parsed.lng,
      locationName: locationName || query || 'Branch',
      googleMapLink: toGoogleMapsUrl(parsed.lat, parsed.lng),
    });
  }

  function clearPin() {
    setQuery('29 Jewellery');
    setMapsLink('');
    setResults([]);
    onSelect({
      latitude: null,
      longitude: null,
      locationName: '',
      googleMapLink: '',
    });
  }

  return (
    <div className="branch-map-picker">
      <div className="location-search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              searchBranches();
            }
          }}
          placeholder="Search 29 Jewellery branch"
        />
        <button type="button" className="btn btn-ghost" disabled={searching} onClick={searchBranches}>
          {searching ? '…' : 'Search'}
        </button>
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

      <div className="location-search" style={{ marginTop: '0.5rem' }}>
        <input
          type="url"
          value={mapsLink}
          onChange={(e) => setMapsLink(e.target.value)}
          placeholder="Or paste Google Maps branch link"
        />
        <button type="button" className="btn btn-ghost" onClick={useMapsLink}>
          Use link
        </button>
      </div>

      {error && (
        <p className="hint" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}

      {hasPin ? (
        <div className="branch-map-preview">
          <div className="branch-map-meta">
            <strong>{locationName || 'Selected branch'}</strong>
            <button type="button" className="btn btn-danger" onClick={clearPin}>
              Clear
            </button>
          </div>
          <GoogleMapEmbed
            latitude={latitude}
            longitude={longitude}
            title={locationName || 'Branch map'}
            className="map-canvas map-canvas-view"
          />
        </div>
      ) : (
        <div className="map-placeholder compact">
          Search “29 Jewellery …” or paste a Google Maps branch link.
        </div>
      )}
    </div>
  );
}
