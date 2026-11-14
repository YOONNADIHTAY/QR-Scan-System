import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { getProfiles, deleteProfile } from '../api';
import usePublicBase from '../hooks/usePublicBase';
import {
  IconEdit,
  IconExternal,
  IconMore,
  IconPlus,
  IconSearch,
  IconTrash,
} from '../components/Icons';

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

export default function SavedPage() {
  const { publicBase } = usePublicBase();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
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

    if (q) {
      list = list.filter((p) => {
        const hay = [
          p.name,
          p.description,
          p.shopName,
          p.personalPhone,
          p.personalEmail,
          ...(p.branches || []).map((b) => `${b.name} ${b.address} ${b.phone}`),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      const da = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const db = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return db - da;
    });

    return list;
  }, [profiles, search, typeFilter, sortBy]);

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

  return (
    <div className="page-panel">
      <div className="welcome-banner">
        <h2>Welcome to 29 Jewellery QR Studio</h2>
        <p>Create staff QR profiles and manage saved codes in one clean workspace.</p>
      </div>

      <header className="page-toolbar">
        <div>
          <h1 className="page-heading">My QR Codes</h1>
          <p className="page-desc">{profiles.length} staff QR profile(s) saved</p>
        </div>
        <div className="toolbar-actions">
          <Link to="/" className="btn btn-primary">
            <IconPlus />
            Create QR Code
          </Link>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="panel-card">
        <div className="filter-bar">
          <label className="search-field">
            <IconSearch />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email…"
              aria-label="Search QR codes"
            />
          </label>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="QR type">
            <option value="all">All types</option>
            <option value="Profile">Profile</option>
            <option value="Social">Social</option>
            <option value="Branches">Branches</option>
            <option value="Product">Product</option>
          </select>

          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} aria-label="Sort by">
            <option value="newest">Newest</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        {loading ? (
          <div className="loading">Loading saved codes…</div>
        ) : !filtered.length ? (
          <div className="empty-panel">
            <p>No QR codes match your filters.</p>
            <Link to="/" className="btn btn-primary">
              <IconPlus />
              Create QR Code
            </Link>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>QR</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Shop</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const type = profileType(p);
                  const scanUrl = `${publicBase}/scan/${p.id}`;
                  const open = menuId === p.id;

                  return (
                    <tr key={p.id}>
                      <td>
                        <div className="qr-thumb compact">
                          <QRCodeCanvas
                            value={scanUrl}
                            size={44}
                            bgColor="#ffffff"
                            fgColor={p.qrFgColor || '#111111'}
                            level="M"
                          />
                        </div>
                      </td>
                      <td>
                        <div className="table-name">
                          <strong>{p.name}</strong>
                          {p.description && <small>{p.description}</small>}
                        </div>
                      </td>
                      <td>
                        <span className={typeClass(type)}>{type}</span>
                      </td>
                      <td>{p.shopName || '29 Jewellery'}</td>
                      <td>{formatDate(p.createdAt)}</td>
                      <td>
                        <div className="qr-actions table-actions">
                          <Link to={`/edit/${p.id}`} className="btn btn-detail">
                            Detail
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
                                  <IconEdit /> Edit
                                </Link>
                                <a href={scanUrl} target="_blank" rel="noreferrer">
                                  <IconExternal /> Open scan
                                </a>
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
