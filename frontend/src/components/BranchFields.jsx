import { useEffect, useState } from 'react';
import { IconPhone, IconTrash } from './Icons';
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

  function setArea(value) {
    setQuery(value);
    onChange(index, {
      ...branch,
      name: value.trim(),
    });
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
          <input value={query} onChange={(e) => setArea(e.target.value)} />
        </div>

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
          />
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
