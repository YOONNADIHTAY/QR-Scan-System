import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicScanProfile } from '../api';
import { assetUrl } from '../apiBase';
import LocationMap from '../components/LocationMap';
import {
  IconFacebook,
  IconMail,
  IconMap,
  IconPhone,
  IconTikTok,
  IconUser,
  IconViber,
  IconWhatsApp,
  IconYouTube,
} from '../components/Icons';
import { formatShopLabel } from '../constants/shops';
import { toGoogleMapsQueryUrl, toGoogleMapsUrl } from '../utils/maps';

function toViberHref(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^viber:/i.test(raw) || /^https?:\/\//i.test(raw)) return raw;
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return '';
  const num = digits.startsWith('+') ? digits.slice(1) : digits;
  return `viber://chat?number=${encodeURIComponent(num)}`;
}

function toWhatsAppHref(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || /^whatsapp:/i.test(raw)) return raw;
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  return `https://wa.me/${digits}`;
}

const SCAN_BANNER_BGS = [
  '/scan-bg/bg-1.jpg',
  '/scan-bg/bg-2.jpg',
  '/scan-bg/bg-3.jpg',
];

export default function ScanPage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [bgIndex, setBgIndex] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBgIndex((i) => (i + 1) % SCAN_BANNER_BGS.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const count = profile?.photos?.length || 0;
    if (count < 2) return undefined;
    const timer = window.setInterval(() => {
      setPhotoIndex((i) => (i + 1) % count);
    }, 3500);
    return () => window.clearInterval(timer);
  }, [profile?.photos?.length]);

  useEffect(() => {
    if (!id) {
      setError('Missing profile id');
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);

    setLoading(true);
    setError('');
    setProfile(null);

    getPublicScanProfile(id, { signal: controller.signal })
      .then((data) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.name === 'AbortError') {
          setError('Scan page timed out. Tunnel may be slow or offline — open again in a moment.');
        } else {
          setError(err.message || 'Failed to load profile');
        }
      })
      .finally(() => {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [id]);

  if (loading) return <div className="loading">Loading…</div>;
  if (error) {
    return (
      <div className="scan-v2">
        <div className="scan-v2-shell">
          <div className="error-banner">{error}</div>
          <button className="btn btn-primary" type="button" onClick={() => window.location.reload()}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  if (!profile) return null;

  const branches = profile.branches?.length
    ? profile.branches
    : profile.locationName || profile.googleMapLink || profile.phoneNumbers?.length
      ? [
          {
            name: profile.locationName || 'Location',
            phone: profile.phoneNumbers?.[0] || '',
            address: profile.locationName || '',
            googleMapLink: profile.googleMapLink,
            locationName: profile.locationName,
            latitude: profile.latitude,
            longitude: profile.longitude,
          },
        ]
      : [];

  const personalSocial = [];
  if (profile.facebookLink) {
    personalSocial.push({
      key: 'facebook',
      href: profile.facebookLink,
      label: 'Facebook',
      tone: 'fb',
      icon: <IconFacebook />,
    });
  }
  if (profile.tiktokLink) {
    personalSocial.push({
      key: 'tiktok',
      href: profile.tiktokLink,
      label: 'TikTok',
      tone: 'tt',
      icon: <IconTikTok />,
    });
  }
  if (profile.youtubeLink) {
    personalSocial.push({
      key: 'youtube',
      href: profile.youtubeLink,
      label: 'YouTube',
      tone: 'yt',
      icon: <IconYouTube />,
    });
  }

  const personalPhones = (
    Array.isArray(profile.personalPhones) && profile.personalPhones.length
      ? profile.personalPhones
      : profile.personalPhone
        ? [profile.personalPhone]
        : []
  )
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  const primaryPhone = personalPhones[0] || '';
  const whatsappHref = toWhatsAppHref(profile.whatsappLink);
  const whatsappLabel = String(profile.whatsappLink || '').trim() || 'Whats App';
  const viberHref = toViberHref(profile.viberNumber);
  const viberLabel = String(profile.viberNumber || '').trim() || 'Viber';
  const position = profile.position || profile.description || '';
  const aboutMe = String(profile.aboutMe || '').trim();
  const includeShop = profile.includeShop !== false;
  const hasShopBlock = includeShop && (Boolean(profile.shopName) || branches.length > 0);
  const hasPhotos = profile.photos?.length > 0;
  const hasLinkOrbs = personalSocial.length > 0;
  const hasInfoRows = Boolean(
    primaryPhone || whatsappHref || viberHref || profile.personalEmail
  );

  return (
    <div className="scan-v2">
      <div className="scan-v2-bg" aria-hidden="true">
        <span className="blob blob-a" />
        <span className="blob blob-b" />
        <span className="blob blob-c" />
        <span className="grid-lines" />
      </div>

      <div className="scan-v2-shell">
        <header className="scan-v2-brand">
          <img src="/29-jewellery-logo.png" alt="" />
          <div>
            <strong>29 Jewellery</strong>
            <small>Digital QR Card</small>
          </div>
        </header>

        <article className="scan-v2-card">
          <div className="scan-v2-banner">
            <div className="scan-v2-banner-slides" aria-hidden="true">
              {SCAN_BANNER_BGS.map((src, i) => (
                <img
                  key={src}
                  className={`scan-v2-banner-slide ${i === bgIndex ? 'is-active' : ''}`}
                  src={src}
                  alt=""
                />
              ))}
            </div>
            <div className="scan-v2-banner-shade" aria-hidden="true" />
            <div className="scan-v2-banner-dots" aria-hidden="true">
              {SCAN_BANNER_BGS.map((src, i) => (
                <span key={src} className={i === bgIndex ? 'is-active' : ''} />
              ))}
            </div>
            <div className="scan-v2-banner-row">
              <div className="scan-v2-avatar-wrap">
                {profile.avatarUrl ? (
                  <img
                    className="scan-v2-avatar"
                    src={assetUrl(profile.avatarUrl)}
                    alt={profile.name}
                  />
                ) : (
                  <div className="scan-v2-avatar fallback" aria-hidden="true">
                    <IconUser />
                  </div>
                )}
              </div>
              <div className="scan-v2-banner-copy">
                <h1>{profile.name}</h1>
                {position ? <p className="scan-v2-role">{position}</p> : null}
                <p className="scan-v2-tagline">Proudly serving with 29 Jewellery</p>
                {profile.personalLocation ? (
                  <p className="scan-v2-location">
                    <IconMap />
                    <span>{profile.personalLocation}</span>
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="scan-v2-body">
            {aboutMe ? (
              <div className="scan-v2-about">
                <p className="scan-v2-about-label">About me</p>
                <p className="scan-v2-about-text">{aboutMe}</p>
              </div>
            ) : null}

            {hasLinkOrbs ? (
              <div className="scan-v2-orbs">
                {personalSocial.map((tile) => (
                  <a
                    key={tile.key}
                    className={`scan-v2-orb ${tile.tone}`}
                    href={tile.href}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span className="orb-icon">{tile.icon}</span>
                    <span className="orb-label">{tile.label}</span>
                  </a>
                ))}
              </div>
            ) : null}

            {profile.id ? (
              <div className="scan-v2-contact-actions">
                {primaryPhone ? (
                  <a className="scan-v2-cta call" href={`tel:${primaryPhone}`}>
                    <IconPhone />
                    <span>Call</span>
                  </a>
                ) : null}
                <a
                  className="scan-v2-cta save"
                  href={`/api/scan/${encodeURIComponent(profile.id)}/vcard`}
                >
                  <IconUser />
                  <span>Save Contact</span>
                </a>
              </div>
            ) : null}

            {hasInfoRows ? (
              <div className="scan-v2-info-rows">
                {primaryPhone ? (
                  <a className="scan-v2-info-row" href={`tel:${primaryPhone}`}>
                    <IconPhone />
                    <span>{primaryPhone}</span>
                  </a>
                ) : null}
                {whatsappHref ? (
                  <a
                    className="scan-v2-info-row wa"
                    href={whatsappHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <IconWhatsApp />
                    <span>{whatsappLabel}</span>
                  </a>
                ) : null}
                {viberHref ? (
                  <a
                    className="scan-v2-info-row vb"
                    href={viberHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <IconViber />
                    <span>{viberLabel}</span>
                  </a>
                ) : null}
                {profile.personalEmail ? (
                  <a className="scan-v2-info-row" href={`mailto:${profile.personalEmail}`}>
                    <IconMail />
                    <span>{profile.personalEmail}</span>
                  </a>
                ) : null}
              </div>
            ) : null}

          </div>
        </article>

        {hasShopBlock && (
          <section className="scan-v2-panel" id="shop">
            <div className="scan-v2-panel-head">
              <img src="/29-jewellery-logo.png" alt="" />
              <div>
                <h2>Shop locations</h2>
                <p>{profile.shopName || '29 Jewellery'}</p>
              </div>
            </div>

            {branches.map((branch, i) => {
              const hasCoords =
                branch.latitude != null &&
                branch.longitude != null &&
                !Number.isNaN(Number(branch.latitude)) &&
                !Number.isNaN(Number(branch.longitude));
              const place = String(
                branch.address || branch.locationName || branch.name || ''
              ).trim();
              const mapUrl =
                branch.googleMapLink ||
                (hasCoords
                  ? toGoogleMapsUrl(Number(branch.latitude), Number(branch.longitude))
                  : toGoogleMapsQueryUrl(place));
              const shopLabel = formatShopLabel(branch.shopNo);
              const area = String(branch.name || '').trim();
              const title =
                [shopLabel, area || place].filter(Boolean).join(' · ') || 'Location';
              const branchPhones = (
                Array.isArray(branch.phones) && branch.phones.length
                  ? branch.phones
                  : branch.phone
                    ? [branch.phone]
                    : []
              )
                .map((p) => String(p || '').trim())
                .filter(Boolean);

              return (
                <article className="scan-v2-branch" key={`${title}-${i}`}>
                  <h3>{title}</h3>
                  {shopLabel && place && place !== area ? <p>{place}</p> : null}
                  <LocationMap
                    latitude={branch.latitude}
                    longitude={branch.longitude}
                    address={place}
                    locationName={place}
                    googleMapLink={branch.googleMapLink || mapUrl}
                  />
                  {branchPhones.length ? (
                    <div className="scan-v2-branch-actions">
                      {branchPhones.map((phone) => (
                        <a className="scan-v2-call-btn" href={`tel:${phone}`} key={phone}>
                          <IconPhone /> Call {phone}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        )}

        {hasPhotos ? (
          <section className="scan-v2-panel" id="photos">
            <div className="scan-v2-panel-head">
              <h2>Best-selling products</h2>
            </div>
            <div className="scan-v2-photo-carousel">
              <div className="scan-v2-photo-slides">
                {profile.photos.map((p, i) => (
                  <img
                    key={p.id}
                    className={`scan-v2-photo-slide ${i === photoIndex ? 'is-active' : ''}`}
                    src={assetUrl(p.url)}
                    alt={p.originalName || 'Best seller'}
                    loading={i === 0 ? 'eager' : 'lazy'}
                  />
                ))}
              </div>
              {profile.photos.length > 1 ? (
                <div className="scan-v2-photo-dots" aria-hidden="true">
                  {profile.photos.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      className={i === photoIndex ? 'is-active' : ''}
                      onClick={() => setPhotoIndex(i)}
                      aria-label={`Show photo ${i + 1}`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        <footer className="scan-v2-foot">29 Jewellery QR System</footer>
      </div>
    </div>
  );
}
