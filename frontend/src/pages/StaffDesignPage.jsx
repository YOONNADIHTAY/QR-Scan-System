import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProfile, updateProfileDesign } from '../api';
import BrandedQr, {
  QR_FRAMES,
  downloadBrandedQrPng,
  printBrandedQr,
} from '../components/BrandedQr';
import { IconDownload, IconExternal } from '../components/Icons';
import usePublicBase from '../hooks/usePublicBase';
import { getStaffProfileId } from '../auth';

export default function StaffDesignPage() {
  const profileId = getStaffProfileId();
  const { publicBase } = usePublicBase();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [fg, setFg] = useState('#111111');
  const [bg, setBg] = useState('#ffffff');
  const [frame, setFrame] = useState('none');
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [removeLogo, setRemoveLogo] = useState(false);

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    getProfile(profileId)
      .then((p) => {
        setProfile(p);
        setFg(p.qrFgColor || '#111111');
        setBg(p.qrBgColor || '#ffffff');
        setFrame(p.qrFrame || 'none');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profileId]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  if (!profileId) {
    return (
      <div className="page-panel">
        <div className="panel-card sidebar-page-card empty-panel">
          <p>Your QR is not linked yet. Ask an admin to create your staff QR.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="loading">Loading your QR…</div>;
  if (!profile) {
    return (
      <div className="page-panel">
        <div className="error-banner">{error || 'Profile not found'}</div>
      </div>
    );
  }

  const scanUrl = `${publicBase}/scan/${profile.id}`;
  const logoSrc = logoPreview || (!removeLogo ? profile.avatarUrl : '');

  async function saveDesign(e) {
    e?.preventDefault?.();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('qrFgColor', fg);
      fd.append('qrBgColor', bg);
      fd.append('qrFrame', frame);
      fd.append('removeAvatar', removeLogo ? 'true' : 'false');
      if (logoFile) fd.append('avatar', logoFile);
      const saved = await updateProfileDesign(profile.id, fd);
      setProfile(saved);
      setLogoFile(null);
      setRemoveLogo(false);
      setMessage('Design saved. Your profile URL stayed the same.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function onDownload() {
    downloadBrandedQrPng('staff-preview-qr', `${profile.name || 'my'}-qr.png`);
  }

  function onPrint() {
    printBrandedQr('.qr-print-area');
  }

  return (
    <div className="page-panel staff-workspace">
      <div className="welcome-banner erp-hero">
        <h2>My QR design</h2>
        <p>
          Color, frame, and center logo only — scan URL never changes.
        </p>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}
      {message ? <div className="success-banner">{message}</div> : null}

      <form className="staff-design-layout staff-design-only" onSubmit={saveDesign}>
        <aside className="panel-card sidebar-page-card preview-card staff-qr-hero">
          <h3>QR code</h3>
          <div className="qr-print-area" data-url={scanUrl}>
            <div className="qr-preview">
              <BrandedQr
                id="staff-preview-qr"
                value={scanUrl}
                size={260}
                fgColor={fg}
                bgColor={bg}
                logoUrl={logoSrc}
                frame={frame}
              />
            </div>
          </div>
          <p className="qr-url">{scanUrl}</p>
          <div className="preview-actions">
            <button type="button" className="btn btn-ghost" onClick={onDownload}>
              <IconDownload /> Download
            </button>
            <button type="button" className="btn btn-ghost" onClick={onPrint}>
              Print
            </button>
            <a className="btn btn-ghost" href={scanUrl} target="_blank" rel="noreferrer">
              <IconExternal /> Open scan page
            </a>
          </div>
        </aside>

        <section className="panel-card sidebar-page-card">
          <h3>Customize</h3>
          <p className="muted-note">
            Profile text is on <Link to="/my-profile">My profile</Link>. Here you only style the
            QR.
          </p>

          <div className="qr-colors">
            <div className="field">
              <label htmlFor="staffQrFg">QR color</label>
              <input
                id="staffQrFg"
                type="color"
                value={fg}
                onChange={(e) => setFg(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="staffQrBg">Background</label>
              <input
                id="staffQrBg"
                type="color"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
              />
            </div>
          </div>

          <div className="field" style={{ marginTop: '0.9rem' }}>
            <span className="field-label">QR frame</span>
            <div className="frame-picker">
              {QR_FRAMES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`frame-option ${frame === item.id ? 'is-active' : ''}`}
                  onClick={() => setFrame(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field" style={{ marginTop: '0.9rem' }}>
            <label htmlFor="staffLogo">Profile photo</label>
            <div className="file-pick">
              <input
                id="staffLogo"
                className="file-input-hidden"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setLogoFile(file);
                  setRemoveLogo(false);
                }}
              />
              <label htmlFor="staffLogo" className="file-pick-btn">
                Choose photo
              </label>
              {(logoFile?.name || (!removeLogo && profile.avatarUrl)) && (
                <span className="file-pick-name">
                  {logoFile?.name || 'Current photo'}
                </span>
              )}
            </div>
            {logoSrc ? (
              <img className="staff-logo-thumb" src={logoSrc} alt="Profile photo" />
            ) : (
              <p className="muted-note" style={{ marginTop: '0.45rem' }}>
                Add a profile photo — it appears in the center of the QR.
              </p>
            )}
            {logoSrc ? (
              <button
                type="button"
                className="link-add-btn"
                onClick={() => {
                  setLogoFile(null);
                  setRemoveLogo(true);
                }}
              >
                Remove photo
              </button>
            ) : null}
          </div>

          <div className="section-save-row" style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save design'}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
