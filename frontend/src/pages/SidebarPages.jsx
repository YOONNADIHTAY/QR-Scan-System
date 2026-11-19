import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  createProfile,
  createUser,
  deleteUser,
  getAdminStats,
  getProfiles,
  getUsers,
  setUserActive,
  updateUser,
} from '../api';
import {
  getAuthProfile,
  getAuthUser,
  getSecurityHistory,
  isAdmin,
  isStaff,
  logout,
} from '../auth';
import usePublicBase from '../hooks/usePublicBase';
import { useI18n } from '../I18nContext';
import { useTheme } from '../ThemeContext';
import { IconPlus, IconQrCodes, IconStats, IconUser, IconShield } from '../components/Icons';

function PageFrame({ title, desc, actions, children }) {
  return (
    <div className="page-panel">
      <header className="page-toolbar">
        <div>
          <h1 className="page-heading">{title}</h1>
          {desc ? <p className="page-desc">{desc}</p> : null}
        </div>
        {actions ? <div className="toolbar-actions">{actions}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function BulkPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [shopName, setShopName] = useState('29 Jewellery');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Excel: one name per line; if a row has tabs/commas, use first cell
  const names = useMemo(() => {
    const lines = String(text || '')
      .split(/\r?\n/)
      .map((line) => {
        const cell = String(line || '')
          .split(/[\t,;]/)[0]
          .trim();
        return cell;
      })
      .filter(Boolean);
    if (lines.length && /^(name|staff|နာမည်)$/i.test(lines[0])) {
      return lines.slice(1);
    }
    return lines;
  }, [text]);

  function downloadTemplate() {
    const csv = 'Name\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '29-jewellery-bulk-names.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onGenerate(e) {
    e.preventDefault();
    if (!names.length) {
      setError('Enter at least one Users name.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    setProgress(0);
    let created = 0;
    try {
      for (const name of names) {
        const fd = new FormData();
        fd.append('name', name);
        fd.append('description', '');
        fd.append('department', '');
        fd.append('includeShop', 'true');
        fd.append('shopName', shopName.trim() || '29 Jewellery');
        await createProfile(fd);
        created += 1;
        setProgress(created);
      }
      setMessage(`Created ${created} QR profile(s). Opening registry…`);
      setText('');
      setTimeout(() => navigate('/saved'), 700);
    } catch (err) {
      setError(
        err.message
          ? `${err.message} (${created}/${names.length} created)`
          : 'Bulk create failed'
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageFrame
      title={t('bulkTitle')}
      desc={t('bulkDesc')}
      actions={
        <button type="button" className="btn btn-secondary" onClick={downloadTemplate}>
          {t('bulkTemplate')}
        </button>
      }
    >
      <form className="bulk-layout" onSubmit={onGenerate}>
        <section className="panel-card sidebar-page-card bulk-panel">
          <header className="bulk-section-head">
            <h3>{t('bulkStep1')}</h3>
            <p className="muted-note">{t('bulkExcelHint')}</p>
          </header>
          <label className="field">
            <span>{t('staffNames')}</span>
            <textarea
              className="bulk-textarea"
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder=""
            />
          </label>
          <div className="bulk-toolbar">
            <span className="bulk-count">
              {names.length} {t('namesReady')}
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={!text || busy}
              onClick={() => {
                setText('');
                setError('');
                setMessage('');
                setProgress(0);
              }}
            >
              {t('bulkClear')}
            </button>
          </div>
        </section>

        <div className="bulk-side">
          <section className="panel-card sidebar-page-card bulk-panel">
            <header className="bulk-section-head">
              <h3>{t('bulkStep2')}</h3>
            </header>
            <div className="bulk-options">
              <label className="field">
                <span>{t('bulkShop')}</span>
                <input
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="panel-card sidebar-page-card bulk-panel">
            <header className="bulk-section-head">
              <h3>{t('bulkStep3')}</h3>
            </header>
            <div className="bulk-preview">
              <div className="bulk-preview-head">
                <strong>{t('bulkPreview')}</strong>
                <span>{names.length}</span>
              </div>
              {names.length ? (
                <ol className="bulk-name-list">
                  {names.slice(0, 40).map((name, i) => (
                    <li key={`${name}-${i}`}>
                      <span className="bulk-name-index">{i + 1}</span>
                      <span>{name}</span>
                    </li>
                  ))}
                  {names.length > 40 ? (
                    <li className="muted-note">+{names.length - 40} more…</li>
                  ) : null}
                </ol>
              ) : (
                <p className="muted-note bulk-empty">{t('bulkEmptyPreview')}</p>
              )}
            </div>

            {busy ? (
              <p className="muted-note bulk-progress">
                {t('bulkProgress')} {progress}/{names.length}
              </p>
            ) : null}
            {error ? <div className="error-banner">{error}</div> : null}
            {message ? <div className="success-banner">{message}</div> : null}

            <button
              className="btn btn-primary bulk-submit"
              type="submit"
              disabled={busy || !names.length}
            >
              {busy
                ? `${t('creating')} ${progress}/${names.length}`
                : `${t('generateQr')}${names.length ? ` (${names.length})` : ''}`}
            </button>
          </section>
        </div>
      </form>
    </PageFrame>
  );
}

function formatDashTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function relativeScanTime(iso) {
  if (!iso) return { label: 'Never', tone: 'quiet', hours: null };
  const ms = Date.now() - Date.parse(iso);
  if (!Number.isFinite(ms) || ms < 0) return { label: '—', tone: 'quiet', hours: null };
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return { label: 'Just now', tone: 'hot', hours: 0 };
  if (mins < 60) return { label: `${mins}m ago`, tone: 'hot', hours: mins / 60 };
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return {
      label: `${hours}h ago`,
      tone: hours < 6 ? 'hot' : 'active',
      hours,
    };
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return { label: 'Yesterday', tone: 'active', hours };
  if (days < 7) return { label: `${days}d ago`, tone: 'steady', hours };
  return { label: `${days}d ago`, tone: 'quiet', hours };
}

function activityLabel(iso, scanCount) {
  const rel = relativeScanTime(iso);
  if (!scanCount) return { label: 'Quiet', tone: 'quiet' };
  if (rel.tone === 'hot') return { label: 'Live', tone: 'hot' };
  if (rel.tone === 'active') return { label: 'Active', tone: 'active' };
  if (rel.tone === 'steady') return { label: 'Steady', tone: 'steady' };
  return { label: 'Quiet', tone: 'quiet' };
}

function ActivityLineChart({ series }) {
  const points = Array.isArray(series) && series.length ? series : [];
  const width = 560;
  const height = 220;
  const padX = 36;
  const padY = 24;
  const maxY = Math.max(5, ...points.map((p) => Number(p.count) || 0));
  const step = Math.ceil(maxY / 4) || 1;
  const top = step * 4;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const coords = points.map((p, i) => {
    const x =
      points.length <= 1
        ? padX + innerW / 2
        : padX + (i / (points.length - 1)) * innerW;
    const y = padY + innerH - ((Number(p.count) || 0) / top) * innerH;
    return { x, y, label: p.label || '', count: Number(p.count) || 0 };
  });
  const path = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const grid = [0, 1, 2, 3, 4].map((i) => {
    const y = padY + (innerH * i) / 4;
    const value = top - step * i;
    return { y, value };
  });

  return (
    <div className="dash-overview-chart-wrap">
      <svg
        className="dash-overview-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Weekly scan activity"
      >
        {grid.map((g) => (
          <g key={`g-${g.value}`}>
            <line
              x1={padX}
              x2={width - padX}
              y1={g.y}
              y2={g.y}
              className="dash-chart-grid"
            />
            <text x={8} y={g.y + 4} className="dash-chart-axis">
              {g.value}
            </text>
          </g>
        ))}
        {path ? <path d={path} className="dash-chart-line" fill="none" /> : null}
        {coords.map((c) => (
          <g key={`${c.label}-${c.x}`}>
            <circle cx={c.x} cy={c.y} r="4.5" className="dash-chart-dot" />
            <text x={c.x} y={height - 4} textAnchor="middle" className="dash-chart-axis">
              {c.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function StatsPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const weekScans = useMemo(
    () => (stats?.last7 || []).reduce((sum, d) => sum + (Number(d.count) || 0), 0),
    [stats]
  );

  const ranked = useMemo(() => {
    const rows = [...(stats?.byProfile || [])];
    rows.sort((a, b) => {
      const ta = Date.parse(a.lastScannedAt || '') || 0;
      const tb = Date.parse(b.lastScannedAt || '') || 0;
      if (tb !== ta) return tb - ta;
      return (Number(b.scanCount) || 0) - (Number(a.scanCount) || 0);
    });
    return rows;
  }, [stats]);

  return (
    <PageFrame
      title={t('dashTitle')}
      desc={t('dashDesc')}
    >
      {error ? <div className="error-banner">{error}</div> : null}
      {loading || !stats ? (
        <div className="loading">Loading stats…</div>
      ) : (
        <div className="stats-classic">
          <div className="stats-grid">
            <article className="stat-card tone-ink">
              <span className="stat-kicker">Today</span>
              <strong>{stats.scansToday || 0}</strong>
              <span>Scans today</span>
            </article>
            <article className="stat-card tone-blue">
              <span className="stat-kicker">This week</span>
              <strong>{weekScans}</strong>
              <span>Last 7 days</span>
            </article>
            <article className="stat-card tone-gold">
              <span className="stat-kicker">All time</span>
              <strong>{stats.totalScans || 0}</strong>
              <span>Total QR scans</span>
            </article>
            <article className="stat-card tone-green">
              <span className="stat-kicker">Live cards</span>
              <strong>
                {stats.activeProfiles || 0}/{stats.totalProfiles || 0}
              </strong>
              <span>Active QR codes</span>
            </article>
          </div>

          <div className="stats-classic-panels">
            <section className="panel-card sidebar-page-card stats-panel">
              <div className="stats-panel-head">
                <div>
                  <h3>Weekly activity</h3>
                  <p>Scan trend over the last 7 days</p>
                </div>
                <span className="stats-live-pill">Time active</span>
              </div>
              <ActivityLineChart series={stats.last7 || []} />
            </section>

            <section className="panel-card sidebar-page-card stats-panel">
              <div className="stats-panel-head">
                <div>
                  <h3>Recent activity</h3>
                  <p>Latest QR, Users, and scan events</p>
                </div>
              </div>
              <ul className="dash-activity-list">
                {(stats.recent || []).length ? (
                  (stats.recent || []).slice(0, 8).map((row) => (
                    <li key={row.id}>
                      <div>
                        <strong>{row.title}</strong>
                        <small>{formatDashTime(row.at)}</small>
                      </div>
                      <span className={`dash-activity-badge tone-${row.tone || 'qr'}`}>
                        {row.badge}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="dash-activity-empty">
                    <strong>No recent activity</strong>
                    <small>Scans and new QR will appear here.</small>
                  </li>
                )}
              </ul>
            </section>
          </div>

          <section className="panel-card sidebar-page-card stats-panel">
            <div className="stats-panel-head">
              <div>
                <h3>Scans by Users QR</h3>
                <p>Sorted by most recently active</p>
              </div>
            </div>
            <div className="data-table-wrap">
              <table className="data-table stats-active-table">
                <thead>
                  <tr>
                    <th>Users / QR</th>
                    <th>Scans</th>
                    <th>Last active</th>
                    <th>Activity</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((row) => {
                    const rel = relativeScanTime(row.lastScannedAt);
                    const act = activityLabel(row.lastScannedAt, row.scanCount);
                    return (
                      <tr key={row.id}>
                        <td>
                          <Link to={`/record/${row.id}`}>{row.name}</Link>
                        </td>
                        <td>{row.scanCount || 0}</td>
                        <td>
                          <div className="stats-time-cell">
                            <strong>{rel.label}</strong>
                            <small>
                              {row.lastScannedAt ? formatDashTime(row.lastScannedAt) : '—'}
                            </small>
                          </div>
                        </td>
                        <td>
                          <span className={`stats-activity-pill tone-${act.tone}`}>
                            {act.label}
                          </span>
                        </td>
                        <td>
                          <span className={`tag ${row.active ? 'tag-profile' : 'tag-social'}`}>
                            {row.active ? 'Active' : 'Off'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </PageFrame>
  );
}

const TEMPLATES = [
  {
    id: 'staff',
    title: 'Users profile',
    text: 'Name, role, phone, and shop map — classic Users QR card.',
  },
  {
    id: 'product',
    title: 'Product showcase',
    text: 'Best for jewellery photos Users can browse after scan.',
  },
  {
    id: 'branches',
    title: 'Multi-branch',
    text: 'List several shop locations with maps on one QR.',
  },
  {
    id: 'social',
    title: 'Social + contact',
    text: 'Facebook, TikTok, YouTube and contact icons together.',
  },
];

export function TemplatesPage() {
  const { t } = useI18n();
  return (
    <PageFrame
      title={t('templatesTitle')}
      desc={t('templatesDesc')}
      actions={
        <Link to="/" className="btn btn-primary">
          <IconPlus />
          {t('navNewQr')}
        </Link>
      }
    >
      <div className="template-grid">
        {TEMPLATES.map((item) => (
          <article key={item.id} className="template-card">
            <h3>{item.title}</h3>
            <p>{item.text}</p>
            <Link to={`/?template=${item.id}`} className="btn btn-secondary">
              {t('useTemplate')}
            </Link>
          </article>
        ))}
      </div>
    </PageFrame>
  );
}

export function DomainsPage() {
  const { t } = useI18n();
  const { publicBase, lanUrl, serverPublicUrl, saveBaseUrl } = usePublicBase();
  const [value, setValue] = useState(publicBase);

  useEffect(() => {
    setValue(publicBase);
  }, [publicBase]);

  return (
    <PageFrame title={t('domainsTitle')} desc={t('domainsDesc')}>
      <section className="panel-card sidebar-page-card">
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault();
            saveBaseUrl(value);
          }}
        >
          <label className="field">
            <span>{t('publicHttps')}</span>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="https://….trycloudflare.com"
            />
          </label>
          <p className="muted-note">
            {t('serverUrl')}: {serverPublicUrl || '—'}
            <br />
            {t('lanUrl')}: {lanUrl || '—'}
          </p>
          <button className="btn btn-primary" type="submit">
            {t('saveDomain')}
          </button>
        </form>
      </section>
    </PageFrame>
  );
}

export function DashboardOverviewPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch((err) => setError(err.message || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => {
    if (!stats) return [];
    return [
      {
        key: 'qr',
        tone: 'blue',
        value: stats.totalProfiles ?? 0,
        label: t('dashTotalQr'),
        icon: <IconQrCodes />,
      },
      {
        key: 'scans',
        tone: 'gold',
        value: stats.totalScans ?? 0,
        label: t('dashTotalScans'),
        icon: <IconStats />,
      },
      {
        key: 'staff',
        tone: 'green',
        value: stats.totalStaff ?? 0,
        label: t('dashStaff'),
        icon: <IconUser />,
      },
      {
        key: 'members',
        tone: 'purple',
        value: stats.activeProfiles ?? 0,
        label: t('dashMembers'),
        icon: <IconShield />,
      },
    ];
  }, [stats, t]);

  return (
    <PageFrame title={t('dashTitle')} desc={t('dashDesc')}>
      {error ? <div className="error-banner">{error}</div> : null}
      {loading || !stats ? (
        <div className="loading">Loading dashboard…</div>
      ) : (
        <section className="dash-overview-shell">
          <header className="dash-overview-head">
            <div>
              <h2>29 Jewellery</h2>
              <p>Premium QR Management</p>
            </div>
            <span className="dash-overview-badge">{t('roleAdmin')}</span>
          </header>

          <div className="dash-overview-kpis">
            {kpis.map((card) => (
              <article key={card.key} className={`dash-kpi-card tone-${card.tone}`}>
                <span className="dash-kpi-icon" aria-hidden="true">
                  {card.icon}
                </span>
                <strong>{Number(card.value).toLocaleString()}</strong>
                <span>{card.label}</span>
              </article>
            ))}
          </div>

          <div className="dash-overview-panels">
            <article className="dash-overview-panel">
              <div className="dash-overview-panel-head">
                <h3>{t('dashActivity')}</h3>
                <span>{t('dashActivityHint')}</span>
              </div>
              <ActivityLineChart series={stats.last7 || []} />
            </article>

            <article className="dash-overview-panel">
              <div className="dash-overview-panel-head">
                <h3>{t('dashRecent')}</h3>
                <span>{stats.scansToday || 0} {t('dashScansToday')}</span>
              </div>
              <ul className="dash-activity-list">
                {(stats.recent || []).length ? (
                  (stats.recent || []).map((row) => (
                    <li key={row.id}>
                      <div>
                        <strong>{row.title}</strong>
                        <small>{formatDashTime(row.at)}</small>
                      </div>
                      <span className={`dash-activity-badge tone-${row.tone || 'qr'}`}>
                        {row.badge}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="dash-activity-empty">
                    <strong>{t('dashNoActivity')}</strong>
                    <small>{t('dashNoActivityHint')}</small>
                  </li>
                )}
              </ul>
            </article>
          </div>
        </section>
      )}
    </PageFrame>
  );
}

/** @deprecated kept as alias for old /plans links */
export function PlansPage() {
  return <DashboardOverviewPage />;
}

export function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const profile = getAuthProfile();
  const user = profile?.email || getAuthUser() || '—';
  const admin = isAdmin();
  const staff = isStaff();
  const roleLabel = admin ? t('roleAdmin') : staff ? t('roleStaff') : 'User';
  const linkedId = profile?.profileId || null;

  async function onSignOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <PageFrame
      title={t('settingsTitle')}
      desc={admin ? t('settingsDescAdmin') : t('settingsDescStaff')}
    >
      <section className="panel-card sidebar-page-card settings-panel">
        <div className="settings-grid">
          <article className="settings-section">
            <header className="settings-section-head">
              <h3>{t('signedInAccount')}</h3>
            </header>
            <div className="settings-rows">
              <div className="settings-row">
                <span className="settings-label">{t('signedInAccount')}</span>
                <div className="settings-value">
                  <strong className="settings-email">{user}</strong>
                  {profile?.name ? (
                    <span className="muted-note">{profile.name}</span>
                  ) : null}
                </div>
              </div>
              <div className="settings-row">
                <span className="settings-label">{t('accountRole')}</span>
                <div className="settings-value">
                  <span className={`tag ${admin ? 'tag-branches' : 'tag-profile'}`}>
                    {roleLabel}
                  </span>
                </div>
              </div>
              <div className="settings-row">
                <span className="settings-label">{t('googleSignIn')}</span>
                <div className="settings-value muted-note">
                  {admin ? t('googleSignInAdmin') : t('googleSignInStaff')}
                </div>
              </div>
            </div>
          </article>

          <article className="settings-section">
            <header className="settings-section-head">
              <h3>{t('defaultLanguage')}</h3>
            </header>
            <div className="settings-rows">
              <div className="settings-row">
                <span className="settings-label">{t('defaultLanguage')}</span>
                <div className="settings-value">
                  <p className="muted-note lang-hint">{t('languageHint')}</p>
                  <div
                    className="lang-switch"
                    role="group"
                    aria-label={t('defaultLanguage')}
                  >
                    <button
                      type="button"
                      className={lang === 'en' ? 'is-active' : ''}
                      onClick={() => setLang('en')}
                    >
                      {t('english')}
                    </button>
                    <button
                      type="button"
                      className={lang === 'my' ? 'is-active' : ''}
                      onClick={() => setLang('my')}
                    >
                      {t('myanmar')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article className="settings-section">
            <header className="settings-section-head">
              <h3>{t('appearance')}</h3>
            </header>
            <div className="settings-rows">
              <div className="settings-row">
                <span className="settings-label">{t('appearance')}</span>
                <div className="settings-value">
                  <p className="muted-note lang-hint">{t('appearanceHint')}</p>
                  <div
                    className="lang-switch theme-switch"
                    role="group"
                    aria-label={t('appearance')}
                  >
                    <button
                      type="button"
                      className={theme === 'light' ? 'is-active' : ''}
                      onClick={() => setTheme('light')}
                    >
                      {t('themeLight')}
                    </button>
                    <button
                      type="button"
                      className={theme === 'dark' ? 'is-active' : ''}
                      onClick={() => setTheme('dark')}
                    >
                      {t('themeDark')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>

          {admin ? (
            <>
              <article className="settings-section settings-section-wide">
                <header className="settings-section-head">
                  <h3>{t('adminTools')}</h3>
                </header>
                <div className="settings-tool-grid">
                  <Link className="settings-tool-card" to="/users">
                    <strong>{t('toolStaffRegister')}</strong>
                    <span>{t('toolStaffRegisterHint')}</span>
                  </Link>
                  <Link className="settings-tool-card" to="/">
                    <strong>{t('toolNewQr')}</strong>
                    <span>{t('toolNewQrHint')}</span>
                  </Link>
                  <Link className="settings-tool-card" to="/saved">
                    <strong>{t('toolRegistry')}</strong>
                    <span>{t('toolRegistryHint')}</span>
                  </Link>
                  <Link className="settings-tool-card" to="/dashboard">
                    <strong>{t('navDashboard')}</strong>
                    <span>{t('dashDesc')}</span>
                  </Link>
                  <Link className="settings-tool-card" to="/domains">
                    <strong>{t('toolDomains')}</strong>
                    <span>{t('toolDomainsHint')}</span>
                  </Link>
                  <Link className="settings-tool-card" to="/security">
                    <strong>{t('toolSecurity')}</strong>
                    <span>{t('toolSecurityHint')}</span>
                  </Link>
                  <Link className="settings-tool-card" to="/help">
                    <strong>{t('toolHelp')}</strong>
                    <span>{t('qrDestination')}</span>
                  </Link>
                </div>
                <p className="settings-foot-note">
                  {t('managedInDomains')}{' '}
                  <Link to="/domains">{t('myDomainsLink')}</Link>
                </p>
              </article>
            </>
          ) : (
            <>
              <article className="settings-section settings-section-wide">
                <header className="settings-section-head">
                  <h3>{t('staffTools')}</h3>
                </header>
                <div className="settings-tool-grid">
                  <Link className="settings-tool-card" to="/my-qr">
                    <strong>{t('toolMyQr')}</strong>
                    <span>{t('toolMyQrHint')}</span>
                  </Link>
                  <Link className="settings-tool-card" to="/help">
                    <strong>{t('toolHelp')}</strong>
                    <span>{t('designUrlNote')}</span>
                  </Link>
                </div>
              </article>

              <article className="settings-section">
                <header className="settings-section-head">
                  <h3>{t('linkedQr')}</h3>
                </header>
                <div className="settings-rows">
                  <div className="settings-row">
                    <span className="settings-label">{t('linkedQr')}</span>
                    <div className="settings-value">
                      {linkedId ? (
                        <div className="settings-linked">
                          <code className="settings-code">{linkedId}</code>
                          <Link className="btn btn-primary settings-open-qr" to="/my-qr">
                            {t('linkedQrOpen')}
                          </Link>
                        </div>
                      ) : (
                        <span className="muted-note">{t('linkedQrMissing')}</span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            </>
          )}

          <article className="settings-section">
            <header className="settings-section-head">
              <h3>{t('signOutLabel')}</h3>
            </header>
            <div className="settings-rows">
              <div className="settings-row">
                <span className="settings-label">{t('signOutLabel')}</span>
                <div className="settings-value">
                  <p className="muted-note" style={{ marginBottom: '0.55rem' }}>
                    {t('signOutHint')}
                  </p>
                  <button
                    type="button"
                    className="btn settings-signout"
                    onClick={onSignOut}
                  >
                    {t('signOutNow')}
                  </button>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>
    </PageFrame>
  );
}

export function UsersPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    profileId: '',
  });
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [u, p] = await Promise.all([getUsers(), getProfiles()]);
      setUsers(u);
      setProfiles(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin()) load();
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await createUser({
        name: form.name,
        email: form.email,
        password: form.password || 'google:pending',
        role: 'staff',
        profileId: form.profileId || null,
      });
      setForm({ name: '', email: '', password: '', profileId: '' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onLink(userId, profileId) {
    try {
      await updateUser(userId, { profileId: profileId || null });
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onToggleActive(user) {
    try {
      await setUserActive(user.id, !user.active);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onDelete(id) {
    if (!window.confirm('Delete this Users account?')) return;
    try {
      await deleteUser(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <PageFrame
      title="Users register"
      desc="Register Users accounts, link QR profiles, activate or deactivate access."
      actions={
        <button type="button" className="btn btn-primary" onClick={() => navigate('/')}>
          <IconPlus />
          New Users QR
        </button>
      }
    >
      {error ? <div className="error-banner">{error}</div> : null}

      <section className="panel-card sidebar-page-card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 0.75rem' }}>Register new Users</h3>
        <form className="stack-form" onSubmit={onCreate}>
          <div className="form-grid">
            <label className="field">
              <span>{t('name')}</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>{t('email')} (Gmail for Sign in with Google)</span>
              <input
                required
                type="email"
                value={form.email}
                placeholder="name@gmail.com"
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Password (optional — Google preferred)</span>
              <input
                value={form.password}
                placeholder="Leave blank for Google-only"
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
            </label>
            <label className="field">
              <span>Link QR profile</span>
              <select
                value={form.profileId}
                onChange={(e) => setForm((p) => ({ ...p, profileId: e.target.value }))}
              >
                <option value="">— none yet —</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Register Users'}
          </button>
        </form>
      </section>

      <section className="panel-card sidebar-page-card">
        <h3 style={{ margin: '0 0 0.75rem' }}>Users list</h3>
        {loading ? (
          <div className="loading">Loading users…</div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('name')}</th>
                  <th>{t('email')}</th>
                  <th>{t('role')}</th>
                  <th>Linked QR</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className="tag tag-profile">
                        {u.role === 'staff' ? 'Users' : u.role}
                      </span>
                    </td>
                    <td>
                      {u.role === 'admin' ? (
                        '—'
                      ) : (
                        <select
                          value={u.profileId || ''}
                          onChange={(e) => onLink(u.id, e.target.value)}
                        >
                          <option value="">— none —</option>
                          {profiles.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td>
                      <span className={`tag ${u.active !== false ? 'tag-profile' : 'tag-social'}`}>
                        {u.active !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {u.role !== 'admin' ? (
                        <div className="table-actions-inline">
                          {u.profileId ? (
                            <Link className="btn btn-secondary" to={`/edit/${u.profileId}`}>
                              Edit QR
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={() => onToggleActive(u)}
                          >
                            {u.active !== false ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => onDelete(u.id)}
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageFrame>
  );
}

export function SecurityPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    setRows(getSecurityHistory());
  }, []);

  return (
    <PageFrame title={t('securityTitle')} desc={t('securityDesc')}>
      <section className="panel-card sidebar-page-card">
        {!rows.length ? (
          <div className="empty-panel">
            <p>{t('noSecurity')}</p>
          </div>
        ) : (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('action')}</th>
                  <th>{t('user')}</th>
                  <th>{t('detail')}</th>
                  <th>{t('when')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.action}</td>
                    <td>{row.user}</td>
                    <td>{row.detail}</td>
                    <td>{new Date(row.at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageFrame>
  );
}

export function ContactPage() {
  const { t } = useI18n();
  return (
    <PageFrame title={t('contactTitle')} desc={t('contactDesc')}>
      <section className="panel-card sidebar-page-card">
        <dl className="settings-list">
          <div>
            <dt>{t('email')}</dt>
            <dd>admin@29jewellery.com</dd>
          </div>
          <div>
            <dt>{t('workspace')}</dt>
            <dd>29 Jewellery QR System</dd>
          </div>
          <div>
            <dt>{t('support')}</dt>
            <dd>{t('helpDesc')}</dd>
          </div>
        </dl>
      </section>
    </PageFrame>
  );
}

export function HelpPage() {
  const { t } = useI18n();
  return (
    <PageFrame title={t('helpTitle')} desc={t('helpDesc')}>
      <section className="panel-card sidebar-page-card help-list">
        <article>
          <h3>{t('navNewQr')}</h3>
          <p>Open New QR, fill Users details, save, then download or print the code.</p>
        </article>
        <article>
          <h3>{t('navDomains')}</h3>
          <p>Set your Cloudflare / public HTTPS URL under My domains before printing.</p>
        </article>
        <article>
          <h3>{t('navBulk')}</h3>
          <p>Paste many Users names in Bulk QR generation to create profiles quickly.</p>
        </article>
        <article>
          <h3>{t('signIn')}</h3>
          <p>Admin: admin@29jewellery.com / 123456</p>
        </article>
      </section>
    </PageFrame>
  );
}
