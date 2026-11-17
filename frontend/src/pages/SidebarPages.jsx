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
import { IconPlus } from '../components/Icons';

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

  return (
    <PageFrame
      title={t('statsTitle')}
      desc="QR scan statistics and Users registry overview."
    >
      {error ? <div className="error-banner">{error}</div> : null}
      {loading || !stats ? (
        <div className="loading">Loading stats…</div>
      ) : (
        <>
          <div className="stats-grid">
            <article className="stat-card">
              <strong>{stats.totalScans}</strong>
              <span>Total QR scans</span>
            </article>
            <article className="stat-card">
              <strong>{stats.scansToday}</strong>
              <span>Scans today</span>
            </article>
            <article className="stat-card">
              <strong>{stats.totalProfiles}</strong>
              <span>{t('totalQr')}</span>
            </article>
            <article className="stat-card">
              <strong>
                {stats.activeStaff}/{stats.totalStaff}
              </strong>
              <span>Active Users accounts</span>
            </article>
          </div>

          <section className="panel-card sidebar-page-card" style={{ marginTop: '1rem' }}>
            <h3 style={{ margin: '0 0 0.75rem' }}>Scans by Users QR</h3>
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Users / QR</th>
                    <th>Scans</th>
                    <th>Last scan</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.byProfile || []).map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link to={`/edit/${row.id}`}>{row.name}</Link>
                      </td>
                      <td>{row.scanCount}</td>
                      <td>
                        {row.lastScannedAt
                          ? new Date(row.lastScannedAt).toLocaleString()
                          : '—'}
                      </td>
                      <td>
                        <span className={`tag ${row.active ? 'tag-profile' : 'tag-social'}`}>
                          {row.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
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

export function PlansPage() {
  const { t } = useI18n();
  return (
    <PageFrame title={t('plansTitle')} desc={t('plansDesc')}>
      <section className="panel-card sidebar-page-card plan-card">
        <p className="plan-badge">{t('planActive')}</p>
        <h3>{t('planName')}</h3>
        <p>{t('planText')}</p>
        <ul className="plan-list">
          <li>Users QR create / edit / delete</li>
          <li>Bulk generation</li>
          <li>Cloudflare public scan links</li>
          <li>Local admin sign-in</li>
        </ul>
      </section>
    </PageFrame>
  );
}

export function SettingsPage() {
  const { t, lang, setLang } = useI18n();
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
                  <Link className="settings-tool-card" to="/stats">
                    <strong>{t('toolStats')}</strong>
                    <span>{t('toolStatsHint')}</span>
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
