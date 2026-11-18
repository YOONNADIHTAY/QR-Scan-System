import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProfile, getProfile, updateProfile } from '../api';
import BranchFields, { emptyBranch, normalizeBranchPhones } from '../components/BranchFields';
import {
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
  IconTrash,
  IconViber,
  IconWhatsApp,
  IconYouTube,
} from '../components/Icons';
import { isStaff } from '../auth';
import { POSITION_OPTIONS } from '../constants/positions';
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
  aboutMe: '',
  personalPhones: [''],
  personalEmail: '',
  personalLocation: '',
  viberNumber: '',
  includeShop: true,
  shopName: '29 Jewellery',
  shopNo: '',
  whatsappLink: '',
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
          aboutMe: p.aboutMe || '',
          personalPhones: normalizePersonalPhones(p),
          personalEmail: p.personalEmail || '',
          personalLocation: p.personalLocation || '',
          viberNumber: p.viberNumber || '',
          includeShop: p.includeShop !== false,
          shopName: shop.shopName,
          shopNo: shop.shopNo,
          whatsappLink: p.whatsappLink || '',
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

  const logoSrc = avatarPreview || (!removeAvatar ? avatarUrl : '');

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
      fd.append('aboutMe', form.aboutMe.trim());
      fd.append('department', '');
      fd.append('personalPhone', phones[0] || '');
      fd.append('personalPhones', JSON.stringify(phones));
      fd.append('personalEmail', form.personalEmail.trim());
      fd.append('personalLocation', form.personalLocation.trim());
      fd.append('viberNumber', form.viberNumber.trim());
      fd.append('includeShop', form.includeShop ? 'true' : 'false');
      const primaryShopNo =
        form.branches.find((b) => String(b.shopNo || '').trim())?.shopNo ||
        form.shopNo ||
        '';
      fd.append('shopName', formatShopName(form.shopName, primaryShopNo));
      fd.append('whatsappLink', form.whatsappLink.trim());
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
        setError(`QR saved, but Users login failed: ${saved.staffLoginError}`);
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

  function goAfterSave(saved) {
    const nextId = saved?.id || savedId || id;
    if (!nextId) return;
    navigate(`/design/${nextId}`);
  }

  async function handleGenerateQr(e) {
    e?.preventDefault?.();
    const saved = await saveProfile();
    if (saved?.id) goAfterSave(saved);
  }

  async function handleSaveQrToList() {
    const saved = await saveProfile();
    if (saved?.id) goAfterSave(saved);
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="page-panel">
      <div className="welcome-banner erp-hero">
        <h2>
          {staffView
            ? 'My QR design'
            : isEdit
              ? 'Edit Users Record'
              : 'Create Users Record'}
        </h2>
        <p>
          {staffView
            ? 'Update your details, then continue to QR Design.'
            : 'Enter Users and shop details, then continue to QR Design.'}
        </p>
      </div>
      <header className="page-toolbar">
        <div>
          <h1 className="page-heading">
            {staffView ? 'Customize QR' : isEdit ? 'Edit Record' : 'New Record'}
          </h1>
          <p className="page-desc">
            {staffView
              ? 'Update contact info, then save to open QR Design.'
              : 'Complete the form, then save to open QR Design.'}
          </p>
        </div>
      </header>

      <form
        id="generate-form"
        className="generate-layout generate-split"
        onSubmit={handleGenerateQr}
      >
      {error && <div className="error-banner generate-error">{error}</div>}

      <div className="generate-main generate-split-cols">
        <section className="step-card generate-col">
          <h2 className="step-title">
            <span className="section-logo personal">
              <IconIdCard />
            </span>
            Personal information
          </h2>
          <div className="form-grid">
            <div className="field full-span executive-profile-field">
              <label htmlFor="avatar">Profile photo</label>
              <div className="avatar-photo-row">
                {logoSrc ? (
                  <div className="avatar-preview-wrap">
                    <img className="avatar-preview" src={logoSrc} alt="Profile" />
                    <button
                      type="button"
                      className="avatar-remove-btn"
                      onClick={clearAvatar}
                      aria-label="Remove photo"
                      title="Remove photo"
                    >
                      <IconTrash />
                    </button>
                  </div>
                ) : null}
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
                    {logoSrc ? 'Change photo' : 'Choose photo'}
                  </label>
                </div>
              </div>
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
            <div className="field">
              <label htmlFor="personalLocation">
                <IconMap /> Location
              </label>
              <input
                id="personalLocation"
                type="text"
                value={form.personalLocation}
                placeholder=""
                onChange={(e) => setField('personalLocation', e.target.value)}
              />
            </div>
            <div className="field full-span">
              <label htmlFor="aboutMe">About me</label>
              <textarea
                id="aboutMe"
                rows={3}
                value={form.aboutMe}
                placeholder="Short intro shown on the scan card"
                onChange={(e) => setField('aboutMe', e.target.value)}
              />
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
              <label htmlFor="viberNumber">
                <IconViber /> Viber
              </label>
              <input
                id="viberNumber"
                type="tel"
                value={form.viberNumber}
                placeholder=""
                onChange={(e) => setField('viberNumber', e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="whatsapp">
                <IconWhatsApp /> Whats App
              </label>
              <input
                id="whatsapp"
                type="url"
                value={form.whatsappLink}
                onChange={(e) => setField('whatsappLink', e.target.value)}
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

        <section className="step-card generate-col">
          <div className="step-title-row">
            <h2 className="step-title">
              <img
                className="section-logo shop"
                src="/29-jewellery-logo.png"
                alt=""
              />
              Shop locations
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
                <div className="field shop-name-field full-span">
                  <label htmlFor="shopName">
                    <IconStore /> Shop brand
                  </label>
                  <input
                    id="shopName"
                    value={form.shopName}
                    onChange={(e) => setField('shopName', e.target.value)}
                    placeholder="29 Jewellery"
                  />
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
                    shopBrand={form.shopName}
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
                <div className="products-panel-head">
                  <div>
                    <h3>Best-selling products</h3>
                    <p>Shown on the scan card under shop locations</p>
                  </div>
                  {(existingPhotos.length > 0 || previews.length > 0) ? (
                    <span className="products-count-pill">
                      {existingPhotos.length + previews.length}
                    </span>
                  ) : null}
                </div>

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

                {existingPhotos.length > 0 || previews.length > 0 ? (
                  <div className="products-panel-body">
                    <div className="photo-grid photo-grid-compact">
                      {existingPhotos.map((p) => (
                        <div className="photo-thumb" key={p.id}>
                          <img
                            src={p.url}
                            alt={p.originalName || 'Best-selling product'}
                          />
                          <button
                            type="button"
                            onClick={() => markPhotoRemove(p.id)}
                            aria-label="Remove product"
                          >
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
                            aria-label="Remove product"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="products-add-tile"
                        onClick={() => document.getElementById('photos')?.click()}
                      >
                        <IconPlus />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="products-empty-zone"
                    onClick={() => document.getElementById('photos')?.click()}
                  >
                    <span className="products-empty-icon" aria-hidden="true">
                      <IconPhoto />
                    </span>
                    <strong>Add product photos</strong>
                    <small>JPG or PNG · multiple files OK</small>
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="section-off-note">
              Shop information is off. Scan page will show personal info only.
            </p>
          )}
        </section>
      </div>

      <div className="section-save-row generate-split-actions">
        <button
          type="button"
          className="btn btn-primary btn-compact"
          disabled={saving}
          onClick={handleGenerateQr}
        >
          <IconSave />
          {saving ? 'Saving…' : 'Save & design'}
        </button>
      </div>
    </form>
    </div>
  );
}
