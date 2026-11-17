import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProfiles, deleteProfile, setProfileActive } from '../api';
import BrandedQr from '../components/BrandedQr';
import usePublicBase from '../hooks/usePublicBase';
import { useI18n } from '../I18nContext';
import {
  IconEdit,
  IconExternal,
  IconMore,
  IconPlus,
  IconSearch,
  IconTrash,
} from '../components/Icons';
import { SHOP_NOS, parseShopNo, formatShopLabel } from '../constants/shops';

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function profileType(p) {
  if (p.photos?.length) return 'Product';
  if (p.branches?.length > 1) return 'Branches';
  if (p.facebookLink || p.tiktokLink || p.youtubeLink) return 'Social';
  return 'Profile';
}

function typeClass(type) {
  if (type === 'Product') return 'tag tag-product';
  if (type === 'Branches') return 'tag tag-branches';
  if (type === 'Social') return 'tag tag-social';
  return 'tag tag-profile';
}

/** Shop / branch names on the QR */
function profileBranchLabels(p) {
  const fromBranches = (p.branches || [])
    .map((b) => String(b.name || b.locationName || '').trim())
    .filter(Boolean);
  if (fromBranches.length) return fromBranches;
  const shop = String(p.shopName || p.locationName || '').trim();
  return shop ? [shop] : [];
}

function profileBranchText(p) {
  const labels = profileBranchLabels(p);
  return labels.length ? labels.join(', ') : '—';
}

function profileShopNo(p) {
  return parseShopNo(p.shopName || '');
}

export default function SavedPage() {
  const { t } = useI18n();
  const { publicBase } = usePublicBase();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [shopFilter, setShopFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [menuId, setMenuId] = useState(null);

  async function load() {
    try {
      setLoading(true);
      setError('');
      setProfiles(await getProfiles());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function close() {
      setMenuId(null);
    }
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const filtered = useMemo(() => {
    let list = [...profiles];
    const q = search.trim().toLowerCase();

    if (typeFilter !== 'all') {
      list = list.filter((p) => profileType(p) === typeFilter);
    }

    if (shopFilter !== 'all') {
      list = list.filter((p) => profileShopNo(p) === shopFilter);
    }

    if (q) {
      list = list.filter((p) => {
        const hay = [
          p.name,
          p.shopName,
          p.personalPhone,
          p.personalEmail,
          formatShopLabel(profileShopNo(p)),
          ...(p.branches || []).map((b) => `${b.name} ${b.address} ${b.phone}`),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'branch') {
        const sa = Number(profileShopNo(a) || 999);
        const sb = Number(profileShopNo(b) || 999);
        if (sa !== sb) return sa - sb;
        return profileBranchText(a).localeCompare(profileBranchText(b));
      }
      const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return db - da;
    });

    return list;
  }, [profiles, search, typeFilter, shopFilter, sortBy]);

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await deleteProfile(id);
      setProfiles((prev) => prev.filter((p) => p.id !== id));
      setMenuId(null);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleToggleActive(p) {
    try {
      const updated = await setProfileActive(p.id, !p.active);
      setProfiles((prev) => prev.map((row) => (row.id === p.id ? updated : row)));
      setMenuId(null);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div className="page-panel">
      <div className="welcome-banner erp-hero">
        <h2>{t('welcomeAdmin')}</h2>
        <p>
          Register Users, generate QR, edit/delete info, manage designs, and track scans.
        </p>
      </div>

      <header className="page-toolbar">
        <div>
          <h1 className="page-heading">QR Registry</h1>
          <p className="page-desc">
            {profiles.length} {t('recordsOnFile')}
          </p>
        </div>
        <div className="toolbar-actions">
          <Link to="/users" className="btn btn-secondary">
            Users list
          </Link>
          <Link to="/" className="btn btn-primary">
            <IconPlus />
            Generate Users QR
          </Link>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="panel-card">
        <div className="filter-bar filter-bar-erp">
          <label className="search-field">
            <IconSearch />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email…"
              aria-label="Search QR codes"
            />
          </label>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="QR type"
          >
            <option value="all">All types</option>
            <option value="Profile">Profile</option>
            <option value="Social">Social</option>
            <option value="Branches">Branches</option>
            <option value="Product">Product</option>
          </select>

          <select
            value={shopFilter}
            onChange={(e) => setShopFilter(e.target.value)}
            aria-label="Shop / Branches"
          >
            <option value="all">Branches: All</option>
            {SHOP_NOS.map((n) => (
              <option key={n} value={n}>
                Shop {n}
              </option>
            ))}
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort by">
            <option value="newest">Newest</option>
            <option value="name">Name A–Z</option>
            <option value="branch">Shop / Branch</option>
          </select>
        </div>

        {loading ? (
          <div className="loading">Loading saved codes…</div>
        ) : !filtered.length ? (
          <div className="empty-panel">
            <p>No Users records match your filters.</p>
            <Link to="/" className="btn btn-primary">
              <IconPlus />
              New Record
            </Link>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>QR</th>
                  <th>Name</th>
                  <th>Shop / Branch</th>
                  <th>Type</th>
                  <th>Scans</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const type = profileType(p);
                  const scanUrl = `${publicBase}/scan/${p.id}`;
                  const open = menuId === p.id;
                  const isActive = p.active !== false;

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="qr-thumb compact">
                          <BrandedQr
                            id={`saved-qr-${p.id}`}
                            value={scanUrl}
                            size={48}
                            bgColor="#ffffff"
                            fgColor={p.qrFgColor || '#111111'}
                            logoUrl={p.avatarUrl || ''}
                            frame={p.qrFrame || 'none'}
                          />
                        </div>
                      </td>
                      <td>
                        <div className="table-name">
                          <strong>{p.name}</strong>
                          {p.personalEmail ? <small>{p.personalEmail}</small> : null}
                        </div>
                      </td>
                      <td>
                        <div className="table-name">
                          {profileShopNo(p) ? (
                            <strong>{formatShopLabel(profileShopNo(p))}</strong>
                          ) : null}
                          <small>{profileBranchText(p)}</small>
                        </div>
                      </td>
                      <td>
                        <span className={typeClass(type)}>{type}</span>
                      </td>
                      <td>{p.scanCount || 0}</td>
                      <td>
                        <span className={`tag ${isActive ? 'tag-profile' : 'tag-social'}`}>
                          {isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>{formatDate(p.createdAt)}</td>
                      <td>
                        <div className="qr-actions table-actions">
                          <Link to={`/record/${p.id}`} className="btn btn-detail">
                            Design
                          </Link>
                          <div className="more-wrap">
                            <button
                              type="button"
                              className="btn-more"
                              aria-label="More actions"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuId(open ? null : p.id);
                              }}
                            >
                              <IconMore />
                            </button>
                            {open && (
                              <div className="more-menu" onClick={(e) => e.stopPropagation()}>
                                <Link to={`/edit/${p.id}`}>
                                  <IconEdit /> Edit info / design
                                </Link>
                                <a href={scanUrl} target="_blank" rel="noreferrer">
                                  <IconExternal /> Open scan
                                </a>
                                <button type="button" onClick={() => handleToggleActive(p)}>
                                  {isActive ? 'Deactivate QR' : 'Activate QR'}
                                </button>
                                <button type="button" onClick={() => handleDelete(p.id, p.name)}>
                                  <IconTrash /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
