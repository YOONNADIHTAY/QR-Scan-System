import { useEffect, useRef, useState } from 'react';
import { IconPhone, IconTrash } from './Icons';
import {
  geocodeAddress,
  toGoogleMapsQueryUrl,
  toGoogleMapsUrl,
} from '../utils/maps';

export function normalizeBranchPhones(branch) {
  if (Array.isArray(branch?.phones) && branch.phones.length) {
    return branch.phones.map((p) => String(p || ''));
  }
  if (branch?.phone) return [String(branch.phone)];
  return [''];
}

export function emptyBranch() {
  return {
    name: '',
    shopNo: '',
    phone: '',
    phones: [''],
    address: '',
    googleMapLink: '',
    locationName: '',
    latitude: null,
    longitude: null,
  };
}

function mapsQueryForAddress(address) {
  const q = String(address || '').trim();
  if (!q) return '';
  if (/29\s*jewellery/i.test(q)) return toGoogleMapsQueryUrl(q);
  return toGoogleMapsQueryUrl(`29 Jewellery ${q}, Yangon`);
}

export default function BranchFields({ branch, index, onChange, onRemove, canRemove }) {
  const [query, setQuery] = useState(branch.name || '');
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoNote, setGeoNote] = useState('');
  const phones = normalizeBranchPhones(branch);
  const geoTimer = useRef(null);

  useEffect(() => {
    setQuery(branch.name || '');
  }, [branch.name]);

  useEffect(() => () => {
    if (geoTimer.current) window.clearTimeout(geoTimer.current);
  }, []);

  function setPhones(nextPhones) {
    const cleaned = nextPhones.length ? nextPhones : [''];
    onChange(index, {
      ...branch,
      phones: cleaned,
      phone: cleaned.find((p) => p.trim()) || '',
    });
  }

  function setArea(value) {
    setQuery(value);
    onChange(index, {
      ...branch,
      name: value.trim(),
    });
  }

  function applyAddress(address, { geocode = false } = {}) {
    const trimmed = String(address || '').trim();
    const next = {
      ...branch,
      address,
      locationName: address,
      name: query.trim() || branch.name,
      // Reset old pin when street text changes so map follows the new address
      latitude: null,
      longitude: null,
      googleMapLink: mapsQueryForAddress(trimmed),
    };
    onChange(index, next);

    if (!geocode || !trimmed) {
      setGeoNote('');
      return;
    }

    if (geoTimer.current) window.clearTimeout(geoTimer.current);
    geoTimer.current = window.setTimeout(async () => {
      setGeoBusy(true);
      setGeoNote('Finding shop on Google Maps…');
      const search = /29\s*jewellery/i.test(trimmed)
        ? trimmed
        : `29 Jewellery ${trimmed}, Yangon`;
      const coords = await geocodeAddress(search);
      if (coords) {
        onChange(index, {
          ...next,
          latitude: coords.lat,
          longitude: coords.lng,
          googleMapLink: toGoogleMapsUrl(coords.lat, coords.lng),
        });
        setGeoNote('Map location found — will show on scan page.');
      } else {
        // Keep Google search link so scan page still embeds the address query
        setGeoNote('Using street name for Google Maps on scan page.');
      }
      setGeoBusy(false);
    }, 450);
  }

  return (
    <div className="branch-card">
      <div className="branch-card-head">
        <h3>Location</h3>
        {canRemove && (
          <button type="button" className="btn btn-danger" onClick={() => onRemove(index)}>
            <IconTrash /> Remove
          </button>
        )}
      </div>

      <div className="form-grid">
        <div className="field">
          <label>Branch area</label>
          <input value={query} onChange={(e) => setArea(e.target.value)} placeholder="e.g. Tamwe" />
        </div>

        <div className="field">
          <label>Address</label>
          <textarea
            value={branch.address || branch.locationName || ''}
            onChange={(e) => applyAddress(e.target.value, { geocode: false })}
            onBlur={(e) => applyAddress(e.target.value, { geocode: true })}
            placeholder="e.g. U Chit Maung Rd, Tamwe"
            rows={3}
          />
          {(geoBusy || geoNote) && (
            <p className="field-hint">{geoBusy ? 'Finding shop on Google Maps…' : geoNote}</p>
          )}
        </div>

        <div className="field field-phones">
          <div className="field-label-row">
            <label>
              <IconPhone /> Branch phone numbers
            </label>
            <button
              type="button"
              className="link-add-phone"
              onClick={() => setPhones([...phones, ''])}
            >
              + Add phone
            </button>
          </div>
          <div className="phone-list">
            {phones.map((phone, phoneIndex) => (
              <div className="phone-row" key={`phone-${phoneIndex}`}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const next = [...phones];
                    next[phoneIndex] = e.target.value;
                    setPhones(next);
                  }}
                />
                {phones.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => setPhones(phones.filter((_, i) => i !== phoneIndex))}
                    aria-label="Remove phone"
                  >
                    <IconTrash />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
