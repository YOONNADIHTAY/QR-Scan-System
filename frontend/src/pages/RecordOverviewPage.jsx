import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProfile, getProfileScanStats } from '../api';
import { assetUrl } from '../apiBase';
import BrandedQr, { downloadBrandedQrPng } from '../components/BrandedQr';
import { formatShopLabel, parseShopNo } from '../constants/shops';
import usePublicBase from '../hooks/usePublicBase';
import { getStaffProfileId, isAdmin, isStaff } from '../auth';

function formatWhen(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelative(hours) {
  if (hours == null) return 'No scans yet';
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

function activityMeta(level) {
  if (level === 'Hot') {
    return { label: 'Hot', hint: 'High traffic this week', tone: 'hot' };
  }
  if (level === 'Active') {
    return { label: 'Active', hint: 'Users are scanning', tone: 'active' };
  }
  if (level === 'Steady') {
    return { label: 'Steady', hint: 'Some past scans recorded', tone: 'steady' };
  }
  return { label: 'Quiet', hint: 'Share your QR to get scans', tone: 'quiet' };
}

export default function RecordOverviewPage({ forcedId = null }) {
  const params = useParams();
  const staffOwnId = isStaff() ? getStaffProfileId() : null;
  const profileId = forcedId || params.id || staffOwnId;
  const admin = isAdmin();
  const { publicBase } = usePublicBase();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      getProfile(profileId),
      getProfileScanStats(profileId).catch(() => null),
    ])
      .then(([p, s]) => {
        if (cancelled) return;
        setProfile(p);
        setStats(s);
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const maxDay = useMemo(() => {
    if (!stats?.last7?.length) return 1;
    return Math.max(1, ...stats.last7.map((d) => d.count));
  }, [stats]);

  if (!profileId) {
    return (
      <div className="page-panel">
        <div className="panel-card sidebar-page-card empty-panel">
          <p>Your QR is not linked yet. Ask an admin to create your Users QR.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="loading">Loading record…</div>;
  if (!profile) {
    return (
      <div className="page-panel">
        <div className="error-banner">{error || 'Profile not found'}</div>
        {admin ? (
          <Link className="btn btn-ghost" to="/saved" style={{ marginTop: '0.75rem' }}>
            Back to QR Registry
          </Link>
        ) : null}
      </div>
    );
  }

  const scanUrl = `${publicBase}/scan/${profile.id}`;
  const total = stats?.total ?? profile.scanCount ?? 0;
  const today = stats?.today ?? 0;
  const week = stats?.week ?? 0;
  const activity = activityMeta(stats?.activity || (total > 0 ? 'Steady' : 'Quiet'));
  const qrOn = profile.active !== false && stats?.active !== false;
  const shopNo = parseShopNo(profile.shopName || '');
  const shopLabel = formatShopLabel(shopNo);
  const branchName = String(
    profile.branches?.[0]?.name ||
      profile.branches?.[0]?.locationName ||
      profile.locationName ||
      ''
  ).trim();
  const branchAddress = String(
    profile.branches?.[0]?.address || profile.branches?.[0]?.locationName || ''
  ).trim();
  async function copyScanUrl() {
    try {
      await navigator.clipboard.writeText(scanUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="page-panel staff-workspace">
      <div className="welcome-banner erp-hero">
        <h2>{admin ? 'Users record' : 'My QR'}</h2>
        <p>
          {admin
            ? 'Profile overview and scan statistics. Use Edit Record to change details or QR design.'
            : 'Your profile and QR scan statistics. Edit Record to update design and details.'}
        </p>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="staff-grid">
        <section className="panel-card sidebar-page-card profile-intel">
          <div className="profile-intel-head">
            <div>
              <h3>Profile</h3>
              <p className="scan-intel-sub">Users card · scan-ready overview</p>
            </div>
            <span className={`scan-activity-pill ${qrOn ? 'tone-active' : 'tone-quiet'}`}>
              {qrOn ? 'Active' : 'Off'}
            </span>
          </div>

          <div className="record-profile-top">
            <div className="record-profile-meta">
              <div className="profile-identity">
                {profile.avatarUrl ? (
                  <img
                    className="profile-identity-photo"
                    src={assetUrl(profile.avatarUrl)}
                    alt={profile.name || 'Profile'}
                  />
                ) : (
                  <div className="profile-identity-fallback" aria-hidden="true">
                    {(profile.name || 'C').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="profile-identity-copy">
                  <h4>{profile.name || 'Unnamed Users'}</h4>
                  <div className="profile-chip-row">
                    {(profile.position || profile.description) ? (
                      <span className="profile-chip">{profile.position || profile.description}</span>
                    ) : null}
                    {shopLabel ? <span className="profile-chip tone-shop">{shopLabel}</span> : null}
                    {branchName ? <span className="profile-chip">{branchName}</span> : null}
                  </div>
                </div>
              </div>

              <div className="profile-contact-grid">
                <article className="profile-contact-card">
                  <span>Email</span>
                  {profile.personalEmail ? (
                    <a href={`mailto:${profile.personalEmail}`}>{profile.personalEmail}</a>
                  ) : (
                    <strong>—</strong>
                  )}
                </article>
                <article className="profile-contact-card">
                  <span>Phone</span>
                  {(
                    Array.isArray(profile.personalPhones) && profile.personalPhones.length
                      ? profile.personalPhones
                      : profile.personalPhone
                        ? [profile.personalPhone]
                        : []
                  ).length ? (
                    <div className="profile-phone-stack">
                      {(
                        Array.isArray(profile.personalPhones) && profile.personalPhones.length
                          ? profile.personalPhones
                          : [profile.personalPhone]
                      ).map((phone) => (
                        <a href={`tel:${phone}`} key={phone}>
                          {phone}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <strong>—</strong>
                  )}
                </article>
                <article className="profile-contact-card wide">
                  <span>Shop / branch</span>
                  <strong>
                    {[shopLabel || profile.shopName, branchName].filter(Boolean).join(' · ') ||
                      '—'}
                  </strong>
                  {branchAddress && branchAddress !== branchName ? (
                    <em>{branchAddress}</em>
                  ) : null}
                </article>
              </div>

              <div className="profile-link-box">
                <div>
                  <span>Scan URL</span>
                  <a href={scanUrl} target="_blank" rel="noreferrer">
                    {scanUrl}
                  </a>
                </div>
                <button type="button" className="btn btn-ghost" onClick={copyScanUrl}>
                  {copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
            </div>

            <div className="record-profile-qr">
              <p className="record-qr-label">QR Scan</p>
              <BrandedQr
                id={`record-qr-${profile.id}`}
                value={scanUrl}
                size={168}
                bgColor={profile.qrBgColor || '#ffffff'}
                fgColor={profile.qrFgColor || '#111111'}
                logoUrl={profile.avatarUrl || ''}
                frame={profile.qrFrame || 'none'}
              />
              <div className="record-qr-actions">
                <a className="btn btn-ghost" href={scanUrl} target="_blank" rel="noreferrer">
                  Test scan
                </a>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    downloadBrandedQrPng(
                      `record-qr-${profile.id}`,
                      `${profile.name || 'Users'}-qr.png`
                    )
                  }
                >
                  Download QR
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="panel-card sidebar-page-card scan-intel">
          <div className="scan-intel-head">
            <div>
              <h3>QR scan statistics</h3>
              <p className="scan-intel-sub">Live performance · last 7 days</p>
            </div>
            <span className={`scan-activity-pill tone-${activity.tone}`}>
              {activity.label}
            </span>
          </div>

          <div className="scan-kpi-row">
            <article className="scan-kpi">
              <span>Today</span>
              <strong>{today}</strong>
            </article>
            <article className="scan-kpi">
              <span>This week</span>
              <strong>{week}</strong>
            </article>
            <article className="scan-kpi">
              <span>Total</span>
              <strong>{total}</strong>
            </article>
            <article className="scan-kpi">
              <span>Avg / day</span>
              <strong>{stats?.avgPerDay ?? 0}</strong>
            </article>
          </div>

          <div className="scan-insight-bar">
            <div>
              <span className="scan-insight-label">QR status</span>
              <strong className={qrOn ? 'ok' : 'off'}>{qrOn ? 'Active' : 'Off'}</strong>
            </div>
            <div>
              <span className="scan-insight-label">Last scan</span>
              <strong>{formatRelative(stats?.hoursSinceLast)}</strong>
              <em>{formatWhen(stats?.lastScannedAt || profile.lastScannedAt)}</em>
            </div>
            <div>
              <span className="scan-insight-label">Insight</span>
              <strong>{activity.hint}</strong>
              <em>
                {stats?.daysLive
                  ? `Live for ${stats.daysLive} day${stats.daysLive === 1 ? '' : 's'}`
                  : '—'}
              </em>
            </div>
          </div>

          {stats?.last7?.length ? (
            <div className="scan-week">
              <div className="scan-week-label">7-day trend</div>
              <div className="scan-bars" role="img" aria-label="Scans over the last 7 days">
                {stats.last7.map((d) => (
                  <div className="scan-bar-col" key={d.date} title={`${d.date}: ${d.count}`}>
                    <div className="scan-bar-track">
                      <div
                        className="scan-bar-fill"
                        style={{
                          height: `${Math.max(8, (d.count / maxDay) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="scan-bar-count">{d.count}</span>
                    <span className="scan-bar-day">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="scan-recent">
            <div className="scan-week-label">Recent scans</div>
            {stats?.recent?.length ? (
              <ul className="scan-recent-list">
                {stats.recent.map((row) => (
                  <li key={row.id}>
                    <span>{formatWhen(row.at)}</span>
                    <span className="scan-device">{row.device}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="scan-empty">No scans yet.</p>
            )}
          </div>
        </section>
      </div>

      <div className="record-overview-actions">
        {admin ? (
          <Link className="btn btn-ghost" to="/saved">
            Back to Registry
          </Link>
        ) : null}
        <Link className="btn btn-primary" to={`/edit/${profile.id}`}>
          Edit Record
        </Link>
      </div>
    </div>
  );
}
