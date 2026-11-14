import { useEffect, useState } from 'react';
import { IconPhone, IconPlus, IconSearch, IconTrash } from './Icons';
import { lookupJewelleryBranch } from '../utils/branchLookup';
import { toGoogleMapsQueryUrl, toGoogleMapsUrl } from '../utils/maps';

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
    phone: '',
    phones: [''],
    address: '',
    googleMapLink: '',
    locationName: '',
    latitude: null,
    longitude: null,
  };
}

export default function BranchFields({ branch, index, onChange, onRemove, canRemove }) {
  const [query, setQuery] = useState(branch.name || '');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');
  const phones = normalizeBranchPhones(branch);

  useEffect(() => {
    setQuery(branch.name || '');
  }, [branch.name]);

  function setPhones(nextPhones) {
    const cleaned = nextPhones.length ? nextPhones : [''];
    onChange(index, {
      ...branch,
      phones: cleaned,
      phone: cleaned.find((p) => p.trim()) || '',
    });
  }

  function applyResult(item) {
    const nextPhones = item.phone
      ? [item.phone, ...phones.filter((p) => p.trim() && p.trim() !== item.phone)]
      : phones;
    onChange(index, {
      ...branch,
      name: item.name || query.trim(),
      phone: nextPhones.find((p) => p.trim()) || '',
      phones: nextPhones.length ? nextPhones : [''],
      address: item.address || '',
      locationName: item.address || item.locationName || '',
      latitude: item.latitude,
      longitude: item.longitude,
      googleMapLink: item.googleMapLink || '',
    });
    setQuery(item.name || query.trim());
    setResults([]);
    setError(item.phone ? '' : 'Address filled. Phone not found online — please type branch phone.');
  }

  async function findBranch() {
    setSearching(true);
    setError('');
    setResults([]);
    try {
      const { results: list, error: err } = await lookupJewelleryBranch(query);
      if (err) setError(err);
      if (list.length === 1) {
        applyResult(list[0]);
      } else {
        setResults(list);
      }
    } catch {
      setError('Lookup failed. Try again.');
    } finally {
      setSearching(false);
    }
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
          <div className="location-search">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  findBranch();
                }
              }}
              placeholder="Tamwe"
            />
            <button
              type="button"
              className="btn btn-ghost"
              disabled={searching || !query.trim()}
              onClick={findBranch}
            >
              <IconSearch />
              {searching ? '…' : 'Find'}
            </button>
          </div>
        </div>

        {results.length > 1 && (
          <ul className="location-results">
            {results.map((item, i) => (
              <li key={`${item.latitude}-${item.longitude}-${i}`}>
                <button type="button" onClick={() => applyResult(item)}>
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        {error && (
          <p
            className="hint"
            style={{ color: error.includes('filled') ? 'var(--text-muted)' : 'var(--danger)' }}
          >
            {error}
          </p>
        )}

        <div className="field">
          <label>Address</label>
          <textarea
            value={branch.address || branch.locationName || ''}
            onChange={(e) => {
              const address = e.target.value;
              onChange(index, {
                ...branch,
                address,
                locationName: address,
                name: query.trim() || branch.name,
                googleMapLink:
                  branch.latitude != null
                    ? branch.googleMapLink ||
                      toGoogleMapsUrl(branch.latitude, branch.longitude)
                    : toGoogleMapsQueryUrl(address),
              });
            }}
            rows={3}
            placeholder="Branch address"
          />
        </div>

        <div className="field field-phones">
          <label>
            <IconPhone /> Branch phone numbers
          </label>
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
                  placeholder="+959 ..."
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
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setPhones([...phones, ''])}
            >
              <IconPlus /> Add phone number
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
