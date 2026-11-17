import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProfile, getProfile, updateProfile } from '../api';
import BranchFields, { emptyBranch, normalizeBranchPhones } from '../components/BranchFields';
import BrandedQr, { QR_FRAMES, downloadBrandedQrPng } from '../components/BrandedQr';
import {
  IconDownload,
  IconExternal,
  IconFacebook,
  IconIdCard,
  IconMail,
  IconMap,
  IconPhone,
  IconPlus,
  IconSave,
  IconStore,
  IconTikTok,
  IconTrash,
  IconYouTube,
} from '../components/Icons';
import usePublicBase from '../hooks/usePublicBase';
import { isStaff } from '../auth';
import { POSITION_OPTIONS } from '../constants/positions';
import { SHOP_NOS } from '../constants/shops';

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

function normalizePersonalPhones(p) {
  if (Array.isArray(p?.personalPhones) && p.personalPhones.length) {
    return p.personalPhones.map((x) => String(x || ''));
  }
  if (p?.personalPhone) return [String(p.personalPhone)];
  return [''];
}

const empty = {
  name: '',
  position: '',
  personalPhones: [''],
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
  qrFrame: 'none',
};

function normalizeBranches(p) {
  if (p.branches?.length) {
    return p.branches.map((b) => {
      const phones = normalizeBranchPhones(b);
      return {
        name: b.name || '',
        shopNo: b.shopNo ? String(b.shopNo) : '',
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
      shopNo: '',
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

export default function GeneratePage({ forcedId = null, staffMode = false }) {
  const params = useParams();
  const id = forcedId || params.id;
  const isEdit = Boolean(id);
  const staffView = staffMode || isStaff();
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
  const [positionOther, setPositionOther] = useState(false);
  const standardPositions = POSITION_OPTIONS.filter((p) => p !== 'Other');

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
      setPositionOther(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    getProfile(id)
      .then((p) => {
        const shop = parseShopName(p.shopName || '29 Jewellery');
        setForm({
          name: p.name || '',
          position: p.position || p.description || '',
          personalPhones: normalizePersonalPhones(p),
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
          qrFrame: p.qrFrame || 'none',
        });
        const loadedPosition = p.position || p.description || '';
        setExistingPhotos(p.photos || []);
        setAvatarUrl(p.avatarUrl || '');
        setAvatarFile(null);
        setAvatarPreview('');
        setRemoveAvatar(false);
        setPositionOther(
          Boolean(loadedPosition) &&
            !POSITION_OPTIONS.filter((x) => x !== 'Other').includes(loadedPosition)
        );
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

  async function saveProfile() {
    if (!form.name.trim()) {
      setError('Name is required');
      return null;
    }

    setSaving(true);
    setError('');

    try {
      const fd = new FormData();
      const phones = (form.personalPhones || [])
        .map((p) => String(p || '').trim())
        .filter(Boolean);
      fd.append('name', form.name.trim());
      fd.append('position', form.position.trim());
      fd.append('description', form.position.trim());
      fd.append('department', '');
      fd.append('personalPhone', phones[0] || '');
      fd.append('personalPhones', JSON.stringify(phones));
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
      fd.append('qrFrame', form.qrFrame || 'none');
      fd.append('removePhotoIds', JSON.stringify(removePhotoIds));
      fd.append('removeAvatar', removeAvatar ? 'true' : 'false');
      if (!isEdit && !savedId && !staffView) {
        const googleEmail = (form.personalEmail || '').trim();
        if (googleEmail) {
          fd.append('createStaffLogin', 'true');
          fd.append('staffEmail', googleEmail);
          fd.append('staffPassword', 'google:pending');
        }
      }
      if (avatarFile) fd.append('avatar', avatarFile);
      newFiles.forEach((file) => fd.append('photos', file));

      const saved =
        isEdit || savedId
          ? await updateProfile(savedId || id, fd)
          : await createProfile(fd);

      if (saved.staffLoginError) {
        setError(`QR saved, but customer login failed: ${saved.staffLoginError}`);
      }

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
        qrFrame: saved.qrFrame || prev.qrFrame,
      }));
      return saved;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateQr(e) {
    e?.preventDefault?.();
    const saved = await saveProfile();
    if (saved?.id) {
      requestAnimationFrame(() => {
        document.querySelector('.generate-side')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    }
  }

  async function handleSaveQrToList() {
    const saved = await saveProfile();
    if (saved?.id) {
      navigate(staffView ? '/my-qr' : `/record/${saved.id || savedId || id}`);
    }
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="page-panel">
      <div className="welcome-banner erp-hero">
        <h2>
          {staffView
            ? 'My QR design'
            : isEdit
              ? 'Edit Customer Record'
              : 'Create Customer Record'}
        </h2>
        <p>
          {staffView
            ? 'Update your details and customize your QR look.'
            : 'Enter customer and shop details to generate a scan profile.'}
        </p>
      </div>
      <header className="page-toolbar">
        <div>
          <h1 className="page-heading">
            {staffView ? 'Customize QR' : isEdit ? 'Edit Record' : 'New Record'}
          </h1>
          <p className="page-desc">
            {staffView
              ? 'Change photo, colors, and contact info for your QR card.'
              : 'Complete the form, then save to issue the QR.'}
          </p>
        </div>
        <div className="toolbar-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={handleSaveQrToList}
          >
            <IconSave />
            {saving ? 'Saving…' : 'Save QR'}
          </button>
        </div>
      </header>

      <form
        id="generate-form"
        className={`generate-layout${savedId ? '' : ' no-preview'}`}
        onSubmit={handleGenerateQr}
      >
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
            <div className="field full-span">
              <label htmlFor="avatar">
                Profile photo
              </label>
              <div className="file-pick">
                <input
                  id="avatar"
                  className="file-input-hidden"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setAvatarFile(file);
                    setRemoveAvatar(false);
                  }}
                />
                <label htmlFor="avatar" className="file-pick-btn">
                  Choose File
                </label>
                {avatarFile?.name || (!removeAvatar && avatarUrl) ? (
                  <span className="file-pick-name">
                    {avatarFile?.name || 'Photo selected'}
                  </span>
                ) : null}
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
              <label htmlFor="name">Name</label>
              <input
                id="name"
                required
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="position">Position</label>
              <select
                id="position"
                className="field-select"
                value={
                  positionOther
                    ? 'Other'
                    : standardPositions.includes(form.position)
                      ? form.position
                      : ''
                }
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === 'Other') {
                    setPositionOther(true);
                    if (standardPositions.includes(form.position)) setField('position', '');
                  } else {
                    setPositionOther(false);
                    setField('position', v);
                  }
                }}
              >
                <option value="">Select position</option>
                {POSITION_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {positionOther ? (
                <input
                  className="position-custom-input"
                  type="text"
                  placeholder="e.g. Branch Supervisor"
                  value={form.position}
                  onChange={(e) => setField('position', e.target.value)}
                />
              ) : null}
            </div>
            <div className="field field-phones full-span">
              <div className="field-label-row">
                <label>
                  <IconPhone /> Phone no.
                </label>
                <button
                  type="button"
                  className="link-add-phone is-compact"
                  onClick={() =>
                    setField('personalPhones', [...(form.personalPhones || ['']), ''])
                  }
                  aria-label="Add phone"
                  title="Add phone"
                >
                  <IconPlus />
                </button>
              </div>
              <div className="phone-list">
                {(form.personalPhones?.length ? form.personalPhones : ['']).map(
                  (phone, phoneIndex) => (
                    <div className="phone-row" key={`personal-phone-${phoneIndex}`}>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          const next = [...(form.personalPhones || [''])];
                          next[phoneIndex] = e.target.value;
                          setField('personalPhones', next);
                        }}
                      />
                      {(form.personalPhones || []).length > 1 && (
                        <button
                          type="button"
                          className="btn btn-danger"
                          onClick={() => {
                            const next = (form.personalPhones || []).filter(
                              (_, i) => i !== phoneIndex
                            );
                            setField('personalPhones', next.length ? next : ['']);
                          }}
                          aria-label="Remove phone"
                        >
                          <IconTrash />
                        </button>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
            <div className="field">
              <label htmlFor="personalEmail">
                <IconMail /> Email
              </label>
              <input
                id="personalEmail"
                type="email"
                value={form.personalEmail}
                placeholder=""
                onChange={(e) => setField('personalEmail', e.target.value)}
              />
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
              Shop information
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
              <button type="button" className="link-add-btn" onClick={addBranch}>
                + Add location
              </button>

              <div className="shop-products-block">
                <h3 className="step-subtitle">Best-selling products</h3>
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
                      <p className="hint">
                        {existingPhotos.length + previews.length} product(s)
                      </p>
                      <div className="photo-grid photo-grid-compact">
                        {existingPhotos.map((p) => (
                          <div className="photo-thumb" key={p.id}>
                            <img
                              src={p.url}
                              alt={p.originalName || 'Best-selling product'}
                            />
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
                    className="link-add-btn"
                    style={{
                      marginTop:
                        existingPhotos.length || previews.length ? '0.55rem' : 0,
                    }}
                    onClick={() => document.getElementById('photos')?.click()}
                  >
                    + Add products
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="section-off-note">
              Shop information is off. Scan page will show personal info only.
            </p>
          )}

          <div className="section-save-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving}
              onClick={handleGenerateQr}
            >
              <IconSave />
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </section>
      </div>

      {savedId && (
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

            <div className="field" style={{ marginTop: '0.75rem' }}>
              <span className="field-label">QR frame</span>
              <div className="frame-picker">
                {QR_FRAMES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`frame-option ${form.qrFrame === item.id ? 'is-active' : ''}`}
                    onClick={() => setField('qrFrame', item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="qr-preview">
              <BrandedQr
                id="preview-qr"
                value={scanUrl}
                size={220}
                fgColor={form.qrFgColor}
                bgColor={form.qrBgColor}
                logoUrl={logoSrc}
                frame={form.qrFrame}
              />
            </div>

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

            <div className="preview-actions">
              <button type="button" className="btn btn-ghost" onClick={downloadQr}>
                <IconDownload /> Download QR
              </button>
              <a className="btn btn-ghost" href={scanUrl} target="_blank" rel="noreferrer">
                <IconExternal /> Test scan page
              </a>
            </div>

            <p className="save-note">IMPORTANT: Don&apos;t forget to test your QR</p>
          </section>
        </aside>
      )}
    </form>
    </div>
  );
}
