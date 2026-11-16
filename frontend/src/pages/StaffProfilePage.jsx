import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProfile } from '../api';
import usePublicBase from '../hooks/usePublicBase';
import { getStaffProfileId } from '../auth';

export default function StaffProfilePage() {
  const profileId = getStaffProfileId();
  const { publicBase } = usePublicBase();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profileId) {
      setLoading(false);
      return;
    }
    getProfile(profileId)
      .then(setProfile)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profileId]);

  if (!profileId) {
    return (
      <div className="page-panel">
        <div className="panel-card sidebar-page-card empty-panel">
          <p>Your QR is not linked yet. Ask an admin to create your staff QR.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="loading">Loading profile…</div>;
  if (!profile) {
    return (
      <div className="page-panel">
        <div className="error-banner">{error || 'Profile not found'}</div>
      </div>
    );
  }

  const scanUrl = `${publicBase}/scan/${profile.id}`;

  return (
    <div className="page-panel staff-workspace">
      <div className="welcome-banner erp-hero">
        <h2>My profile</h2>
        <p>Profile details are managed by admin. Customize QR look in My QR design.</p>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="staff-grid">
        <section className="panel-card sidebar-page-card">
          <h3>Profile</h3>
          {profile.avatarUrl ? (
            <img
              className="staff-profile-photo"
              src={profile.avatarUrl}
              alt={profile.name || 'Profile'}
            />
          ) : null}
          <dl className="settings-list">
            <div>
              <dt>Name</dt>
              <dd>{profile.name}</dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{profile.department || profile.description || '—'}</dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{profile.description || '—'}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{profile.personalEmail || '—'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{profile.personalPhone || '—'}</dd>
            </div>
            <div>
              <dt>Profile URL (fixed)</dt>
              <dd className="url-fixed">
                <a href={scanUrl} target="_blank" rel="noreferrer">
                  {scanUrl}
                </a>
              </dd>
            </div>
          </dl>
          <Link className="btn btn-primary" to="/my-qr" style={{ marginTop: '0.75rem' }}>
            Open My QR design
          </Link>
        </section>

        <section className="panel-card sidebar-page-card">
          <h3>My QR scan statistics</h3>
          <div className="stats-grid staff-stats">
            <article className="stat-card">
              <strong>{profile.scanCount || 0}</strong>
              <span>Total scans</span>
            </article>
            <article className="stat-card">
              <strong>
                {profile.lastScannedAt
                  ? new Date(profile.lastScannedAt).toLocaleDateString()
                  : '—'}
              </strong>
              <span>Last scan</span>
            </article>
            <article className="stat-card">
              <strong>{profile.active !== false ? 'Active' : 'Off'}</strong>
              <span>QR status</span>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
