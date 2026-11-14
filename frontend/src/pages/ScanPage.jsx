import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getProfile } from '../api';
import LocationMap from '../components/LocationMap';
import {
  IconFacebook,
  IconIdCard,
  IconMail,
  IconMap,
  IconPhone,
  IconTikTok,
  IconUser,
  IconYouTube,
} from '../components/Icons';
import { toGoogleMapsQueryUrl, toGoogleMapsUrl } from '../utils/maps';

export default function ScanPage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile(id)
      .then(setProfile)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading">Loading…</div>;
  if (error) {
    return (
      <div className="scan-page">
        <div className="error-banner">{error}</div>
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

  const hasPersonalBlock = Boolean(
    profile.personalPhone || profile.personalEmail || personalSocial.length
  );
  const includeShop = profile.includeShop !== false;
  const hasShopBlock =
    includeShop &&
    (Boolean(profile.shopName) || branches.length > 0);

  return (
    <div className="scan-page employee-profile">
      <section className="employee-hero">
        <div className="employee-photo-wrap">
          {profile.avatarUrl ? (
            <img className="employee-avatar-img" src={profile.avatarUrl} alt={profile.name} />
          ) : (
            <div className="employee-avatar" aria-hidden="true">
              <IconUser />
            </div>
          )}
        </div>
        <div className="employee-identity">
          <p className="hero-kicker">Personal</p>
          <h1>{profile.name}</h1>
          {profile.description && <p className="employee-role">{profile.description}</p>}
        </div>
      </section>

      {hasPersonalBlock && (
        <section className="scan-block">
          <h2>
            <span className="section-logo personal">
              <IconIdCard />
            </span>
            Personal information
          </h2>
          <div className="contact-list">
            {profile.personalPhone && (
              <a className="contact-row" href={`tel:${profile.personalPhone}`}>
                <span className="contact-icon phone">
                  <IconPhone />
                </span>
                <span className="contact-copy">
                  <small>Phone</small>
                  <strong>{profile.personalPhone}</strong>
                </span>
              </a>
            )}
            {profile.personalEmail && (
              <a className="contact-row" href={`mailto:${profile.personalEmail}`}>
                <span className="contact-icon mail">
                  <IconMail />
                </span>
                <span className="contact-copy">
                  <small>Email</small>
                  <strong>{profile.personalEmail}</strong>
                </span>
              </a>
            )}
            {personalSocial.map((tile) => (
              <a
                key={tile.key}
                className="contact-row"
                href={tile.href}
                target="_blank"
                rel="noreferrer"
              >
                <span className={`contact-icon ${tile.tone}`}>{tile.icon}</span>
                <span className="contact-copy">
                  <small>Social</small>
                  <strong>{tile.label}</strong>
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      {hasShopBlock && (
        <section className="scan-block shop-block">
          <h2>
            <img
              className="section-logo shop"
              src="/29-jewellery-logo.png"
              alt=""
            />
            29 Jewellery
          </h2>
          <p className="shop-block-name">{profile.shopName || '29 Jewellery'}</p>

          {branches.length > 0 && (
            <div className="branch-scan-list">
              <h3 className="scan-subheading">
                <IconMap /> Shop locations
              </h3>
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
                const title = place || 'Location';

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
                  <article className="branch-scan-card" key={`${title}-${i}`}>
                    {place && <h3>{place}</h3>}
                    {branchPhones.length > 0 && (
                      <div className="branch-phone-list">
                        {branchPhones.map((phone) => (
                          <p className="branch-phone-line" key={phone}>
                            <a href={`tel:${phone}`}>{phone}</a>
                          </p>
                        ))}
                      </div>
                    )}
                    <LocationMap
                      latitude={branch.latitude}
                      longitude={branch.longitude}
                      address={place}
                      locationName={place}
                      googleMapLink={branch.googleMapLink || mapUrl}
                    />
                    {branchPhones.map((phone) => (
                      <a
                        key={`call-${phone}`}
                        className="btn btn-ghost btn-block call-shop-btn"
                        href={`tel:${phone}`}
                      >
                        <IconPhone /> Call {phone}
                      </a>
                    ))}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {profile.photos?.length > 0 && (
        <section className="scan-section" id="photos">
          <h2>Best-selling products</h2>
          <div className="scan-photos">
            {profile.photos.map((p) => (
              <img key={p.id} src={p.url} alt={p.originalName || 'Best seller'} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
