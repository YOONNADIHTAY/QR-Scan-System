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
  IconYouTube,
} from '../components/Icons';
import { formatShopLabel } from '../constants/shops';
import { toGoogleMapsQueryUrl, toGoogleMapsUrl } from '../utils/maps';

function IconSms(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...props}>
      <path d="M4.5 6.5h15a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H9l-3.5 2.5V16H4.5A1.5 1.5 0 0 1 3 14.5v-6A1.5 1.5 0 0 1 4.5 6.5z" />
      <path d="M8 11h8M8 14h5" />
    </svg>
  );
}

export default function ScanPage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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
  const position = profile.position || profile.description || '';
  const includeShop = profile.includeShop !== false;
  const hasShopBlock = includeShop && (Boolean(profile.shopName) || branches.length > 0);
  const hasPhotos = profile.photos?.length > 0;

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
          <div className="scan-v2-avatar-wrap">
            {profile.avatarUrl ? (
              <img className="scan-v2-avatar" src={assetUrl(profile.avatarUrl)} alt={profile.name} />
            ) : (
              <div className="scan-v2-avatar fallback" aria-hidden="true">
                <IconUser />
              </div>
            )}
          </div>

          <div className="scan-v2-identity">
            <h1>{profile.name}</h1>
            {position ? <p className="scan-v2-role">{position}</p> : null}
            <p className="scan-v2-tagline">Proudly serving with 29 Jewellery</p>
          </div>

          {(primaryPhone || profile.personalEmail) && (
            <div className="scan-v2-orbs">
              {primaryPhone ? (
                <a className="scan-v2-orb" href={`sms:${primaryPhone}`}>
                  <span className="orb-icon">
                    <IconSms />
                  </span>
                  <small>Text</small>
                </a>
              ) : null}
              {primaryPhone ? (
                <a className="scan-v2-orb" href={`tel:${primaryPhone}`}>
                  <span className="orb-icon">
                    <IconPhone />
                  </span>
                  <small>Call</small>
                </a>
              ) : null}
              {profile.personalEmail ? (
                <a className="scan-v2-orb" href={`mailto:${profile.personalEmail}`}>
                  <span className="orb-icon">
                    <IconMail />
                  </span>
                  <small>Email</small>
                </a>
              ) : null}
            </div>
          )}

          {personalSocial.length > 0 && (
            <div className="scan-v2-social">
              {personalSocial.map((tile) => (
                <a
                  key={tile.key}
                  className={`scan-v2-social-btn ${tile.tone}`}
                  href={tile.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={tile.label}
                >
                  {tile.icon}
                </a>
              ))}
            </div>
          )}

          <div className="scan-v2-grid">
            {hasShopBlock ? (
              <a className="scan-v2-tile" href="#shop">
                <IconMap />
                <span>Shop</span>
              </a>
            ) : null}
            {primaryPhone ? (
              <a className="scan-v2-tile" href={`tel:${primaryPhone}`}>
                <IconPhone />
                <span>Call</span>
              </a>
            ) : null}
            {profile.personalEmail ? (
              <a className="scan-v2-tile" href={`mailto:${profile.personalEmail}`}>
                <IconMail />
                <span>Email</span>
              </a>
            ) : null}
            {hasPhotos ? (
              <a className="scan-v2-tile" href="#photos">
                <IconUser />
                <span>Products</span>
              </a>
            ) : null}
          </div>

          {personalPhones.length > 1 && (
            <div className="scan-v2-phones">
              {personalPhones.map((phone) => (
                <a key={phone} href={`tel:${phone}`}>
                  <IconPhone /> {phone}
                </a>
              ))}
            </div>
          )}
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
                  {branchPhones.map((phone) => (
                    <a className="scan-v2-inline-call" href={`tel:${phone}`} key={phone}>
                      <IconPhone /> {phone}
                    </a>
                  ))}
                  <LocationMap
                    latitude={branch.latitude}
                    longitude={branch.longitude}
                    address={place}
                    locationName={place}
                    googleMapLink={branch.googleMapLink || mapUrl}
                  />
                </article>
              );
            })}
          </section>
        )}

        {hasPhotos && (
          <section className="scan-v2-panel" id="photos">
            <div className="scan-v2-panel-head">
              <h2>Best-selling products</h2>
            </div>
            <div className="scan-v2-photos">
              {profile.photos.map((p) => (
                <img key={p.id} src={assetUrl(p.url)} alt={p.originalName || 'Best seller'} />
              ))}
            </div>
          </section>
        )}

        <footer className="scan-v2-foot">29 Jewellery QR System</footer>
      </div>
    </div>
  );
}
