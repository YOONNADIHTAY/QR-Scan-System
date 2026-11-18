import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getProfile, updateProfileDesign } from '../api';
import { assetUrl } from '../apiBase';
import BrandedQr, { QR_FRAMES, downloadBrandedQrPng } from '../components/BrandedQr';
import { IconDownload, IconExternal, IconSave } from '../components/Icons';
import usePublicBase from '../hooks/usePublicBase';
import { isStaff } from '../auth';

const DESIGN_TABS = [
  { id: 'colors', label: 'Colors' },
  { id: 'frames', label: 'Frames' },
  { id: 'link', label: 'Link' },
];

const FG_SWATCHES = ['#111111', '#1f2937', '#0f172a', '#145a96', '#7c3aed', '#b91c1c'];
const BG_SWATCHES = ['#ffffff', '#f8fafc', '#f1f5f9', '#fff7ed', '#ecfeff', '#fef2f2'];

export default function QrDesignPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const staff = isStaff();
  const { publicBase, lanUrl, saveBaseUrl } = usePublicBase();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [tab, setTab] = useState('frames');
  const [qrFgColor, setQrFgColor] = useState('#111111');
  const [qrBgColor, setQrBgColor] = useState('#ffffff');
  const [qrFrame, setQrFrame] = useState('none');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('Missing profile id');
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    getProfile(id)
      .then((p) => {
        if (cancelled) return;
        setProfile(p);
        setQrFgColor(p.qrFgColor || '#111111');
        setQrBgColor(p.qrBgColor || '#ffffff');
        setQrFrame(p.qrFrame || 'none');
        setError('');
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load QR');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const scanUrl = id ? `${publicBase}/scan/${id}` : '';
  const isPublicLink = /^https:\/\//i.test(publicBase || '');
  const logoUrl = profile?.avatarUrl ? assetUrl(profile.avatarUrl) : '';

  const scannability = useMemo(() => {
    const fg = qrFgColor.replace('#', '');
    const bg = qrBgColor.replace('#', '');
    if (fg.length !== 6 || bg.length !== 6) return { label: 'GOOD', tone: 'good' };
    const lum = (hex) => {
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      const toLin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * toLin(r) + 0.7152 * toLin(g) + 0.0722 * toLin(b);
    };
    const contrast =
      (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05);
    if (contrast >= 7) return { label: 'EXCELLENT', tone: 'excellent' };
    if (contrast >= 4.5) return { label: 'GOOD', tone: 'good' };
    return { label: 'LOW', tone: 'low' };
  }, [qrFgColor, qrBgColor]);

  function resetDesign() {
    setQrFgColor('#111111');
    setQrBgColor('#ffffff');
    setQrFrame('none');
  }

  async function saveDesign() {
    if (!id) return false;
    setSaving(true);
    setError('');
    setNote('');
    try {
      const fd = new FormData();
      fd.append('qrFgColor', qrFgColor);
      fd.append('qrBgColor', qrBgColor);
      fd.append('qrFrame', qrFrame || 'none');
      const updated = await updateProfileDesign(id, fd);
      setProfile(updated);
      setNote('QR design saved');
      window.setTimeout(() => setNote(''), 2000);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to save design');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleDone() {
    const ok = await saveDesign();
    if (!ok) return;
    navigate(staff ? '/my-qr' : `/record/${id}`);
  }

  function downloadQr() {
    downloadBrandedQrPng('design-qr', `${profile?.name || 'Users'}-qr.png`);
  }

  if (loading) return <div className="loading">Loading QR design…</div>;
  if (!profile) {
    return (
      <div className="page-panel">
        <div className="error-banner">{error || 'Profile not found'}</div>
        <Link
          className="btn btn-ghost btn-compact"
          to={staff ? '/my-qr' : '/'}
          style={{ marginTop: '0.75rem' }}
        >
          Back
        </Link>
      </div>
    );
  }

  return (
    <div className="page-panel qr-studio">
      <nav className="qr-studio-steps" aria-label="QR creation steps">
        <Link className="qr-studio-step is-done" to={`/edit/${id}`}>
          <span>1</span> Setup
        </Link>
        <span className="qr-studio-step-sep" aria-hidden="true" />
        <div className="qr-studio-step is-active">
          <span>2</span> Customize
        </div>
        <span className="qr-studio-step-sep" aria-hidden="true" />
        <div className="qr-studio-step">
          <span>3</span> Done
        </div>
      </nav>

      <header className="qr-studio-toolbar">
        <div>
          <p className="qr-studio-kicker">QR codes / Customize</p>
          <h1 className="page-heading">Design · {profile.name || 'Users'}</h1>
        </div>
        <div className="toolbar-actions">
          <Link className="btn btn-ghost btn-compact" to={`/edit/${id}`}>
            Edit info
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={handleDone}
          >
            {saving ? 'Saving…' : 'Next'}
            <span aria-hidden="true"> →</span>
          </button>
        </div>
      </header>

      {error ? <div className="error-banner">{error}</div> : null}
      {note ? <div className="success-banner">{note}</div> : null}

      <div className="qr-design-layout qr-studio-layout">
        <section className="qr-studio-panel">
          <div className="qr-design-panel-head">
            <div>
              <h2>Design</h2>
              <p>Customize colors, logo center, and print-ready frames.</p>
            </div>
            <button type="button" className="qr-studio-reset" onClick={resetDesign}>
              Reset to default
            </button>
          </div>

          <div className="qr-studio-tabs" role="tablist" aria-label="Design tools">
            {DESIGN_TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                className={`qr-studio-tab ${tab === item.id ? 'is-active' : ''}`}
                onClick={() => setTab(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === 'colors' ? (
            <div className="qr-studio-section">
              <h3>QR color</h3>
              <p className="qr-studio-help">Pick a high-contrast foreground for reliable scans.</p>
              <div className="qr-studio-swatches">
                {FG_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`qr-studio-swatch ${qrFgColor.toLowerCase() === c ? 'is-active' : ''}`}
                    style={{ background: c }}
                    aria-label={`QR color ${c}`}
                    onClick={() => setQrFgColor(c)}
                  />
                ))}
                <label className="qr-studio-swatch is-picker" title="Custom QR color">
                  <input
                    type="color"
                    value={qrFgColor}
                    onChange={(e) => setQrFgColor(e.target.value)}
                  />
                </label>
              </div>

              <h3>Background</h3>
              <p className="qr-studio-help">Keep the background light for best scannability.</p>
              <div className="qr-studio-swatches">
                {BG_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`qr-studio-swatch ${qrBgColor.toLowerCase() === c ? 'is-active' : ''}`}
                    style={{ background: c }}
                    aria-label={`Background ${c}`}
                    onClick={() => setQrBgColor(c)}
                  />
                ))}
                <label className="qr-studio-swatch is-picker" title="Custom background">
                  <input
                    type="color"
                    value={qrBgColor}
                    onChange={(e) => setQrBgColor(e.target.value)}
                  />
                </label>
              </div>
            </div>
          ) : null}

          {tab === 'frames' ? (
            <div className="qr-studio-section">
              <h3>Select a frame</h3>
              <p className="qr-studio-help">
                Make your QR code print-ready by adding a clean frame.
              </p>
              <div className="qr-studio-frame-grid">
                {QR_FRAMES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`qr-studio-frame-card ${qrFrame === item.id ? 'is-active' : ''}`}
                    onClick={() => setQrFrame(item.id)}
                  >
                    <div className="qr-studio-frame-thumb">
                      <BrandedQr
                        id={`frame-thumb-${item.id}`}
                        value={scanUrl || 'https://qr.29jewellery.com'}
                        size={88}
                        fgColor={qrFgColor}
                        bgColor={qrBgColor}
                        logoUrl={logoUrl}
                        frame={item.id}
                      />
                    </div>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {tab === 'link' ? (
            <div className="qr-studio-section">
              <h3>Phone URL base</h3>
              <p className="qr-studio-help">
                Used when phones open the scan page from this QR.
              </p>
              <div className="location-search">
                <input
                  id="designQrBase"
                  value={publicBase}
                  onChange={(e) => saveBaseUrl(e.target.value)}
                />
                {lanUrl ? (
                  <button
                    type="button"
                    className="btn btn-ghost btn-compact"
                    onClick={() => saveBaseUrl(lanUrl)}
                  >
                    WiFi IP
                  </button>
                ) : null}
              </div>
              {isPublicLink ? (
                <p className="hint">Works on any network (mobile data OK).</p>
              ) : (
                <p className="hint warn-hint">
                  Not a public link yet. Set PUBLIC_URL / domain, then refresh.
                </p>
              )}
            </div>
          ) : null}

          <div className="qr-design-actions">
            <button
              type="button"
              className="btn btn-secondary btn-compact"
              disabled={saving}
              onClick={saveDesign}
            >
              <IconSave />
              {saving ? 'Saving…' : 'Save design'}
            </button>
            <button type="button" className="btn btn-ghost btn-compact" onClick={downloadQr}>
              <IconDownload /> Download
            </button>
            <a className="btn btn-ghost btn-compact" href={scanUrl} target="_blank" rel="noreferrer">
              <IconExternal /> Test scan
            </a>
          </div>
        </section>

        <aside className="qr-studio-preview">
          <div className="qr-design-panel-head">
            <div>
              <h2>Preview</h2>
              <p>Live look for {profile.name || 'Users'}</p>
            </div>
          </div>

          <div className="qr-studio-preview-stage">
            <BrandedQr
              id="design-qr"
              value={scanUrl}
              size={248}
              fgColor={qrFgColor}
              bgColor={qrBgColor}
              logoUrl={logoUrl}
              frame={qrFrame}
            />
          </div>

          <div className={`qr-studio-scan-bar is-${scannability.tone}`}>
            Scannability: <strong>{scannability.label}</strong>
          </div>

          <p className="qr-url">{scanUrl}</p>

          <button
            type="button"
            className="btn btn-primary qr-studio-next"
            disabled={saving}
            onClick={handleDone}
          >
            {saving ? 'Saving…' : 'Next'}
            <span aria-hidden="true"> →</span>
          </button>
        </aside>
      </div>
    </div>
  );
}
