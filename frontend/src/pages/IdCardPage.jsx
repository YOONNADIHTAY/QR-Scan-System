import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getProfiles, getProfile } from '../api';
import { assetUrl } from '../apiBase';
import BrandedQr from '../components/BrandedQr';
import { IconIdCard, IconUser } from '../components/Icons';
import usePublicBase from '../hooks/usePublicBase';
import { isAdmin } from '../auth';

const ID_BADGE_LAYOUTS = [
  { id: 'portrait', label: 'Portrait', hint: 'Tall card' },
  { id: 'landscape', label: 'Landscape', hint: 'Wide card' },
  { id: 'split', label: 'Split', hint: 'Photo side' },
  { id: 'strip', label: 'Strip', hint: 'Slim badge' },
];

function phoneOf(p) {
  if (Array.isArray(p?.personalPhones) && p.personalPhones.length) {
    return String(p.personalPhones.find((x) => String(x || '').trim()) || '').trim();
  }
  return String(p?.personalPhone || '').trim();
}

export default function IdCardPage() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const admin = isAdmin();
  const { publicBase } = usePublicBase();
  const [profiles, setProfiles] = useState([]);
  const [selectedId, setSelectedId] = useState(routeId || '');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [badgeLayout, setBadgeLayout] = useState(() => {
    try {
      const saved = localStorage.getItem('id-badge-layout');
      if (saved && ID_BADGE_LAYOUTS.some((d) => d.id === saved)) return saved;
    } catch {
      /* ignore */
    }
    return 'portrait';
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const load = admin
      ? getProfiles()
      : routeId
        ? getProfile(routeId).then((p) => [p])
        : Promise.resolve([]);
    load
      .then((list) => {
        if (cancelled) return;
        const rows = Array.isArray(list) ? list : [];
        setProfiles(rows);
        const initial =
          routeId ||
          rows.find((p) => p.active !== false)?.id ||
          rows[0]?.id ||
          '';
        setSelectedId(initial);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load profiles');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [admin, routeId]);

  useEffect(() => {
    if (!selectedId) {
      setProfile(null);
      return undefined;
    }
    let cancelled = false;
    const cached = profiles.find((p) => p.id === selectedId);
    if (cached) setProfile(cached);
    getProfile(selectedId)
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load profile');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, profiles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter((p) => {
      const hay = [p.name, p.position, p.shopName, phoneOf(p), p.personalEmail]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [profiles, query]);

  const scanUrl = profile?.id ? `${publicBase}/scan/${profile.id}` : '';
  const avatarSrc = profile?.avatarUrl ? assetUrl(profile.avatarUrl) : '';
  const phone = phoneOf(profile);

  function selectProfile(nextId) {
    setSelectedId(nextId);
    if (admin) navigate(`/id-card/${nextId}`, { replace: true });
  }

  function printCard() {
    window.print();
  }

  function chooseLayout(nextId) {
    setBadgeLayout(nextId);
    try {
      localStorage.setItem('id-badge-layout', nextId);
    } catch {
      /* ignore */
    }
  }

  const qrSize = badgeLayout === 'strip' ? 72 : badgeLayout === 'landscape' ? 92 : 104;

  if (loading) return <div className="loading">Loading ID cards…</div>;

  return (
    <div className="page-panel id-card-page">
      <header className="id-card-toolbar">
        <h1 className="id-card-toolbar-title">ID Card studio</h1>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="id-card-layout">
        {admin ? (
          <section className="step-card id-card-picker">
            <div className="qr-design-panel-head">
              <div>
                <h2>Users</h2>
                <p>QR Registry</p>
              </div>
            </div>
            <input
              className="id-card-search"
              type="search"
              placeholder="Search name, phone, position…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="id-card-list">
              {filtered.length ? (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`id-card-list-item ${selectedId === p.id ? 'is-active' : ''}`}
                    onClick={() => selectProfile(p.id)}
                  >
                    <span className="id-card-list-avatar">
                      {p.avatarUrl ? (
                        <img src={assetUrl(p.avatarUrl)} alt="" />
                      ) : (
                        <IconUser />
                      )}
                    </span>
                    <span className="id-card-list-meta">
                      <strong>{p.name || 'Untitled'}</strong>
                      <small>{p.position || p.shopName || 'No position'}</small>
                    </span>
                    <span className={`id-card-list-status ${p.active === false ? 'off' : 'on'}`}>
                      {p.active === false ? 'Off' : 'Live'}
                    </span>
                  </button>
                ))
              ) : (
                <p className="hint">No matching Users. Create one from New QR first.</p>
              )}
            </div>
          </section>
        ) : null}

        <section className="step-card id-card-stage">
          <div className="qr-design-panel-head">
            <div>
              <h2>Preview</h2>
              <p>Compact badge · scan opens digital card</p>
            </div>
          </div>

          {profile ? (
            <>
              <div className="id-badge-design-picker" role="group" aria-label="Card ID design">
                <span className="id-badge-design-label">Card ID design</span>
                <div className="id-badge-design-options">
                  {ID_BADGE_LAYOUTS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      className={`id-badge-design-option ${badgeLayout === d.id ? 'is-active' : ''}`}
                      onClick={() => chooseLayout(d.id)}
                      title={d.hint}
                    >
                      <span className={`id-badge-layout-thumb id-badge-layout-thumb--${d.id}`} aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      <small>{d.label}</small>
                    </button>
                  ))}
                </div>
              </div>

              <div className={`id-card-stage-inner id-card-stage-inner--${badgeLayout}`}>
                <article
                  className={`id-badge id-badge-layout--${badgeLayout}`}
                  id="print-id-card"
                >
                  <header className="id-badge-top">
                    <img src="/29-jewellery-logo.png" alt="" />
                    <div>
                      <strong>29 Jewellery</strong>
                      <small>Scan QR</small>
                    </div>
                  </header>

                  <div className="id-badge-photo">
                    {avatarSrc ? (
                      <img src={avatarSrc} alt={profile.name || 'Photo'} />
                    ) : (
                      <div className="id-badge-photo-fallback" aria-hidden="true">
                        <IconUser />
                      </div>
                    )}
                  </div>

                  <div className="id-badge-identity">
                    <h3>{profile.name || 'Users'}</h3>
                    {profile.position ? <p className="id-badge-role">{profile.position}</p> : null}
                    {phone ? <p className="id-badge-phone">{phone}</p> : null}
                    {profile.personalEmail ? (
                      <p className="id-badge-email">{profile.personalEmail}</p>
                    ) : null}
                  </div>

                  <div className="id-badge-qr">
                    <BrandedQr
                      id={`idcard-qr-${profile.id}`}
                      value={scanUrl}
                      size={qrSize}
                      fgColor={profile.qrFgColor || '#111111'}
                      bgColor={profile.qrBgColor || '#ffffff'}
                      logoUrl={profile.avatarUrl || ''}
                      frame={profile.qrFrame || 'none'}
                    />
                  </div>

                  <footer className="id-badge-foot">
                    <span>Scan for digital card</span>
                    <small>qr.29jewellery.com</small>
                  </footer>
                </article>
              </div>

              <div className="id-card-meta">
                <div>
                  <span>Scan URL</span>
                  <a href={scanUrl} target="_blank" rel="noreferrer">
                    {scanUrl}
                  </a>
                </div>
                <div className="id-card-meta-actions">
                  <Link className="btn btn-ghost btn-compact" to={`/record/${profile.id}`}>
                    Open record
                  </Link>
                  <Link className="btn btn-ghost btn-compact" to={`/edit/${profile.id}`}>
                    Edit info
                  </Link>
                  <button type="button" className="btn btn-primary btn-compact" onClick={printCard}>
                    Print ID card
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="id-card-empty">
              <IconIdCard />
              <strong>Select a Users record</strong>
              <p>Each ID card QR opens that person’s scan page.</p>
              {admin ? (
                <Link className="btn btn-primary btn-compact" to="/">
                  Create New QR
                </Link>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
