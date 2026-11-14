import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProfile, getProfile, updateProfile } from '../api';
import BranchFields, { emptyBranch, normalizeBranchPhones } from '../components/BranchFields';
import BrandedQr, { downloadBrandedQrPng } from '../components/BrandedQr';
import {
  IconDownload,
  IconExternal,
  IconFacebook,
  IconIdCard,
  IconMail,
  IconMap,
  IconPhone,
  IconPhoto,
  IconPlus,
  IconSave,
  IconStore,
  IconTikTok,
  IconYouTube,
} from '../components/Icons';
import usePublicBase from '../hooks/usePublicBase';

const SHOP_NOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

function parseShopName(full) {
  const raw = String(full || '').trim();
  const match = raw.match(/^(.*?)(?:\s*(?:Shop|No\.?)\s*(\d+))\s*$/i);
  if (match) {
    return {
      shopName: (match[1] || '29 Jewellery').trim() || '29 Jewellery',
      shopNo: match[2] || '',
    };
  }
  return { shopName: raw || '29 Jewellery', shopNo: '' };
}

function formatShopName(name, shopNo) {
  const base = String(name || '').trim() || '29 Jewellery';
  const no = String(shopNo || '').trim();
  return no ? `${base} Shop ${no}` : base;
}

const empty = {
  name: '',
  description: '',
  personalPhone: '',
  personalEmail: '',
  includeShop: true,
  shopName: '29 Jewellery',
  shopNo: '',
  facebookLink: '',
  tiktokLink: '',
  youtubeLink: '',
  branches: [emptyBranch()],
  qrFgColor: '#111111',
  qrBgColor: '#ffffff',
};

function normalizeBranches(p) {
  if (p.branches?.length) {
    return p.branches.map((b) => {
      const phones = normalizeBranchPhones(b);
      return {
        name: b.name || '',
        phone: phones.find((x) => x.trim()) || '',
        phones,
        address: b.address || b.locationName || '',
        googleMapLink: b.googleMapLink || '',
        locationName: b.locationName || b.address || b.name || '',
        latitude: b.latitude ?? null,
        longitude: b.longitude ?? null,
      };
    });
  }
  const phones = p.phoneNumbers?.length ? p.phoneNumbers.map(String) : [''];
  return [
    {
      name: p.locationName || '',
      phone: phones.find((x) => x.trim()) || '',
      phones,
      address: p.locationName || '',
      googleMapLink: p.googleMapLink || '',
      locationName: p.locationName || '',
      latitude: p.latitude ?? null,
      longitude: p.longitude ?? null,
    },
  ];
}

export default function GeneratePage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { publicBase, lanUrl, saveBaseUrl } = usePublicBase();
  const isPublicLink = /^https:\/\//i.test(publicBase);

  const [form, setForm] = useState(empty);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [removePhotoIds, setRemovePhotoIds] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(isEdit);
  const [savedId, setSavedId] = useState(id || null);

  useEffect(() => {
    setSavedId(id || null);
    if (!isEdit) {
      setForm(empty);
      setExistingPhotos([]);
      setRemovePhotoIds([]);
      setNewFiles([]);
      setAvatarUrl('');
      setAvatarFile(null);
      setAvatarPreview('');
      setRemoveAvatar(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    getProfile(id)
      .then((p) => {
        const shop = parseShopName(p.shopName || '29 Jewellery');
        setForm({
          name: p.name || '',
          description: p.description || '',
          personalPhone: p.personalPhone || '',
          personalEmail: p.personalEmail || '',
          includeShop: p.includeShop !== false,
          shopName: shop.shopName,
          shopNo: shop.shopNo,
          facebookLink: p.facebookLink || '',
          tiktokLink: p.tiktokLink || '',
          youtubeLink: p.youtubeLink || '',
          branches: normalizeBranches(p),
          qrFgColor: p.qrFgColor || '#111111',
          qrBgColor: p.qrBgColor || '#ffffff',
        });
        setExistingPhotos(p.photos || []);
        setAvatarUrl(p.avatarUrl || '');
        setAvatarFile(null);
        setAvatarPreview('');
        setRemoveAvatar(false);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  useEffect(() => {
    const urls = newFiles.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [newFiles]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(avatarFile);
    setAvatarPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatarFile]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateBranch(index, next) {
    setForm((prev) => {
      const branches = [...prev.branches];
      branches[index] = next;
      return { ...prev, branches };
    });
  }

  function addBranch() {
    setForm((prev) => ({ ...prev, branches: [...prev.branches, emptyBranch()] }));
  }

  function removeBranch(index) {
    setForm((prev) => {
      const branches = prev.branches.filter((_, i) => i !== index);
      return { ...prev, branches: branches.length ? branches : [emptyBranch()] };
    });
  }

  function markPhotoRemove(photoId) {
    setRemovePhotoIds((prev) => [...prev, photoId]);
    setExistingPhotos((prev) => prev.filter((p) => p.id !== photoId));
  }

  function clearAvatar() {
    setAvatarFile(null);
    setAvatarPreview('');
    setAvatarUrl('');
    setRemoveAvatar(true);
  }

  const scanUrl = savedId ? `${publicBase}/scan/${savedId}` : '';
  const logoSrc = avatarPreview || (!removeAvatar ? avatarUrl : '');

  function downloadQr() {
    downloadBrandedQrPng('preview-qr', `${form.name || 'qr'}-qr.png`);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('description', form.description);
      fd.append('personalPhone', form.personalPhone.trim());
      fd.append('personalEmail', form.personalEmail.trim());
      fd.append('includeShop', form.includeShop ? 'true' : 'false');
      fd.append('shopName', formatShopName(form.shopName, form.shopNo));
      fd.append('facebookLink', form.facebookLink.trim());
      fd.append('tiktokLink', form.tiktokLink.trim());
      fd.append('youtubeLink', form.youtubeLink.trim());
      const branchesPayload = form.includeShop
        ? form.branches.map((b) => {
            const phones = normalizeBranchPhones(b)
              .map((p) => p.trim())
              .filter(Boolean);
            return {
              ...b,
              phones,
              phone: phones[0] || '',
            };
          })
        : [];
      fd.append('branches', JSON.stringify(branchesPayload));
      fd.append('qrFgColor', form.qrFgColor);
      fd.append('qrBgColor', form.qrBgColor);
      fd.append('removePhotoIds', JSON.stringify(removePhotoIds));
      fd.append('removeAvatar', removeAvatar ? 'true' : 'false');
      if (avatarFile) fd.append('avatar', avatarFile);
      newFiles.forEach((file) => fd.append('photos', file));

      const saved =
        isEdit || savedId
          ? await updateProfile(savedId || id, fd)
          : await createProfile(fd);

      setSavedId(saved.id);
      setExistingPhotos(saved.photos || []);
      setAvatarUrl(saved.avatarUrl || '');
      setAvatarFile(null);
      setAvatarPreview('');
      setRemoveAvatar(false);
      setNewFiles([]);
      setRemovePhotoIds([]);
      setForm((prev) => ({
        ...prev,
        qrFgColor: saved.qrFgColor || prev.qrFgColor,
        qrBgColor: saved.qrBgColor || prev.qrBgColor,
      }));
      navigate('/saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="page-panel">
      <div className="welcome-banner compact">
        <h2>{isEdit ? 'Edit staff QR' : 'Create staff QR'}</h2>
        <p>Personal information and 29 Jewellery shop details for the scan page.</p>
      </div>
      <header className="page-toolbar">
        <div>
          <h1 className="page-heading">{isEdit ? 'Edit QR Code' : 'Create QR Code'}</h1>
          <p className="page-desc">Fill personal + shop info, then save.</p>
        </div>
        <div className="toolbar-actions">
          <button type="submit" form="generate-form" className="btn btn-primary" disabled={saving}>
            <IconSave />
            {saving ? 'Saving…' : 'Save QR'}
          </button>
        </div>
      </header>

      <form id="generate-form" className="generate-layout" onSubmit={handleSubmit}>
      {error && <div className="error-banner generate-error">{error}</div>}

      <div className="generate-main">
        <section className="step-card">
          <h2 className="step-title">
            <span className="section-logo personal">
              <IconIdCard />
            </span>
            Personal information
          </h2>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="name">Name *</label>
              <input
                id="name"
                required
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="description">Role / title</label>
              <input
                id="description"
                value={form.description}
                onChange={(e) => setField('description', e.target.value)}
                placeholder="Sales consultant"
              />
            </div>
            <div className="field">
              <label htmlFor="personalPhone">
                <IconPhone /> Phone no.
              </label>
              <input
                id="personalPhone"
                type="tel"
                value={form.personalPhone}
                onChange={(e) => setField('personalPhone', e.target.value)}
                placeholder="+959 ..."
              />
            </div>
            <div className="field">
              <label htmlFor="personalEmail">
                <IconMail /> Email
              </label>
              <input
                id="personalEmail"
                type="email"
                value={form.personalEmail}
                onChange={(e) => setField('personalEmail', e.target.value)}
                placeholder="name@example.com"
              />
            </div>
            <div className="field">
              <label htmlFor="avatar">
                <IconPhoto /> Profile photo (QR center)
              </label>
              <div className="file-row">
                <input
                  id="avatar"
                  className="file-input"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setAvatarFile(file);
                    setRemoveAvatar(false);
                  }}
                />
              </div>
              {logoSrc && (
                <div className="avatar-preview-row">
                  <img className="avatar-preview" src={logoSrc} alt="Profile" />
                  <button type="button" className="btn btn-danger" onClick={clearAvatar}>
                    Remove photo
                  </button>
                </div>
              )}
            </div>
            <div className="field">
              <label htmlFor="facebook">
                <IconFacebook /> Facebook link
              </label>
              <input
                id="facebook"
                type="url"
                value={form.facebookLink}
                onChange={(e) => setField('facebookLink', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="tiktok">
                <IconTikTok /> TikTok link
              </label>
              <input
                id="tiktok"
                type="url"
                value={form.tiktokLink}
                onChange={(e) => setField('tiktokLink', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="youtube">
                <IconYouTube /> YouTube link
              </label>
              <input
                id="youtube"
                type="url"
                value={form.youtubeLink}
                onChange={(e) => setField('youtubeLink', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="step-card">
          <div className="step-title-row">
            <h2 className="step-title">
              <img
                className="section-logo shop"
                src="/29-jewellery-logo.png"
                alt=""
              />
              29 Jewellery shop information
            </h2>
            <label className="section-toggle" htmlFor="includeShop">
              <input
                id="includeShop"
                type="checkbox"
                checked={form.includeShop}
                onChange={(e) => setField('includeShop', e.target.checked)}
              />
              <span>Include shop info</span>
            </label>
          </div>

          {form.includeShop ? (
            <>
              <div className="form-grid">
                <div className="field shop-name-field">
                  <label htmlFor="shopName">
                    <IconStore /> Shop name
                  </label>
                  <div className="shop-name-row">
                    <input
                      id="shopName"
                      value={form.shopName}
                      onChange={(e) => setField('shopName', e.target.value)}
                      placeholder="29 Jewellery"
                    />
                    <label className="shop-no-wrap" htmlFor="shopNo">
                      <span>Shop</span>
                      <select
                        id="shopNo"
                        value={form.shopNo}
                        onChange={(e) => setField('shopNo', e.target.value)}
                      >
                        <option value="">—</option>
                        {SHOP_NOS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {form.shopNo && (
                    <p className="shop-name-preview">
                      {formatShopName(form.shopName, form.shopNo)}
                    </p>
                  )}
                </div>
              </div>

              <h3 className="step-subtitle">
                <IconMap /> Shop locations
              </h3>
              <div className="branch-list">
                {form.branches.map((branch, index) => (
                  <BranchFields
                    key={index}
                    branch={branch}
                    index={index}
                    onChange={updateBranch}
                    onRemove={removeBranch}
                    canRemove={form.branches.length > 1}
                  />
                ))}
              </div>
              <button type="button" className="btn btn-ghost" onClick={addBranch}>
                <IconPlus /> Add location
              </button>
            </>
          ) : (
            <p className="section-off-note">
              Shop information is off. Scan page will show personal info only.
            </p>
          )}
        </section>

        <section className="step-card">
          <h2 className="step-title">Best-selling products</h2>
          <div className="field">
            <input
              id="photos"
              className="file-input-hidden"
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const picked = Array.from(e.target.files || []);
                if (!picked.length) return;
                setNewFiles((prev) => [...prev, ...picked]);
                e.target.value = '';
              }}
            />
            {(existingPhotos.length > 0 || previews.length > 0) && (
              <>
                <p className="hint">{existingPhotos.length + previews.length} product(s)</p>
                <div className="photo-grid">
                  {existingPhotos.map((p) => (
                    <div className="photo-thumb" key={p.id}>
                      <img src={p.url} alt={p.originalName || 'Best-selling product'} />
                      <button type="button" onClick={() => markPhotoRemove(p.id)}>
                        ×
                      </button>
                    </div>
                  ))}
                  {previews.map((src, i) => (
                    <div className="photo-thumb" key={`new-${i}`}>
                      <img src={src} alt={`Best-selling product ${i + 1}`} />
                      <button
                        type="button"
                        onClick={() =>
                          setNewFiles((prev) => prev.filter((_, idx) => idx !== i))
                        }
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
            <button
              type="button"
              className="btn btn-ghost"
              style={{ marginTop: existingPhotos.length || previews.length ? '0.75rem' : 0 }}
              onClick={() => document.getElementById('photos')?.click()}
            >
              <IconPlus /> Add products
            </button>
          </div>
        </section>
      </div>

      <aside className="generate-side">
        <section className="step-card preview-card">
          <h2 className="step-title">Customize & Save QR</h2>

          <div className="qr-colors">
            <div className="field">
              <label htmlFor="qrFg">QR color</label>
              <input
                id="qrFg"
                type="color"
                value={form.qrFgColor}
                onChange={(e) => setField('qrFgColor', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="qrBg">Background</label>
              <input
                id="qrBg"
                type="color"
                value={form.qrBgColor}
                onChange={(e) => setField('qrBgColor', e.target.value)}
              />
            </div>
          </div>

          <div className="qr-preview">
            {scanUrl ? (
              <BrandedQr
                id="preview-qr"
                value={scanUrl}
                size={220}
                fgColor={form.qrFgColor}
                bgColor={form.qrBgColor}
                logoUrl={logoSrc}
              />
            ) : (
              <div className="qr-placeholder">Save to generate QR</div>
            )}
          </div>

          {scanUrl && (
            <>
              <p className="qr-url">{scanUrl}</p>
              {isPublicLink ? (
                <p className="hint">Works on any network (mobile data OK).</p>
              ) : (
                <p className="hint warn-hint">
                  Not a public link yet. Run the tunnel script, set PUBLIC_URL, then refresh.
                </p>
              )}
              <div className="field">
                <label htmlFor="qrBase">Phone URL base</label>
                <div className="location-search">
                  <input
                    id="qrBase"
                    value={publicBase}
                    onChange={(e) => saveBaseUrl(e.target.value)}
                  />
                  {lanUrl && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => saveBaseUrl(lanUrl)}
                    >
                      WiFi IP
                    </button>
                  )}
                </div>
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
            <IconSave />
            {saving ? 'Saving…' : 'Save'}
          </button>

          {scanUrl && (
            <div className="preview-actions">
              <button type="button" className="btn btn-ghost" onClick={downloadQr}>
                <IconDownload /> Download QR
              </button>
              <a className="btn btn-ghost" href={scanUrl} target="_blank" rel="noreferrer">
                <IconExternal /> Test scan page
              </a>
            </div>
          )}

          <p className="save-note">IMPORTANT: Don&apos;t forget to test your QR</p>
        </section>
      </aside>
    </form>
    </div>
  );
}
