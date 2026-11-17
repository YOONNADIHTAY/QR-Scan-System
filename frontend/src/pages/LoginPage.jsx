import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { getAuthUser, isAuthenticated, login } from '../auth';
import { useI18n } from '../I18nContext';

const SLIDES = [
  {
    id: 'build-qr',
    image: '/carousel/qr-1.png',
    title: 'Build customer QR cards',
    text: 'Create and manage branded QR links for every shop and customer.',
  },
  {
    id: 'scan-images',
    image: '/carousel/qr-2.webp',
    title: 'Instant access to images',
    text: 'Customers scan once and open products, maps, and contacts instantly.',
  },
  {
    id: 'scan-qr',
    image: '/carousel/qr-3.png',
    title: 'Scan and open instantly',
    text: 'Point a phone at the customer QR and open the full profile in one tap.',
  },
];

export default function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [slide, setSlide] = useState(0);
  const [unlockAutofill, setUnlockAutofill] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((prev) => (prev + 1) % SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  if (isAuthenticated() || getAuthUser()) {
    return <Navigate to="/" replace />;
  }

  function goAfterLogin(result) {
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const role = result.session?.user?.role;
    navigate(role === 'staff' ? '/my-qr' : '/', { replace: true });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const result = await login(username, password, remember);
    setBusy(false);
    goAfterLogin(result);
  }

  const active = SLIDES[slide];

  return (
    <div className="login-page">
      <div className="login-shell">
        <section className="login-panel">
          <div className="login-card">
            <img
              className="login-logo"
              src="/29-jewellery-logo.png"
              alt="29 Jewellery"
            />
            <h1>{t('loginTitle')}</h1>
            <p className="login-sub">{t('loginSub')}</p>

            <form
              className="login-form"
              onSubmit={onSubmit}
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
            >
              <input
                type="text"
                name="fake-username"
                autoComplete="username"
                tabIndex={-1}
                aria-hidden="true"
                className="login-autofill-decoy"
              />
              <input
                type="password"
                name="fake-password"
                autoComplete="current-password"
                tabIndex={-1}
                aria-hidden="true"
                className="login-autofill-decoy"
              />

              <label className="login-field">
                <span>{t('emailUserPhone')}</span>
                <div className="login-input">
                  <span className="login-input-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="8" r="3.2" />
                      <path d="M5.5 19.2a6.5 6.5 0 0 1 13 0" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    name="login-id"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    readOnly={!unlockAutofill}
                    onFocus={() => setUnlockAutofill(true)}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder=""
                    required
                  />
                </div>
              </label>

              <label className="login-field">
                <span>{t('password')}</span>
                <div className="login-input">
                  <span className="login-input-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V8.5a4 4 0 0 1 8 0V11" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="login-secret"
                    autoComplete="new-password"
                    readOnly={!unlockAutofill}
                    onFocus={() => setUnlockAutofill(true)}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder=""
                    required
                  />
                  <button
                    type="button"
                    className="login-eye"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      {showPassword ? (
                        <>
                          <path d="M3 3l18 18" />
                          <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                          <path d="M9.9 5.1A10.4 10.4 0 0 1 12 5c5 0 9.3 3.1 11 7.5a11.5 11.5 0 0 1-4.2 5.1" />
                          <path d="M6.1 6.1A11.4 11.4 0 0 0 1 12.5C2.7 16.9 7 20 12 20c1.4 0 2.7-.2 3.9-.7" />
                        </>
                      ) : (
                        <>
                          <path d="M1 12.5C2.7 8.1 7 5 12 5s9.3 3.1 11 7.5c-1.7 4.4-6 7.5-11 7.5S2.7 16.9 1 12.5z" />
                          <circle cx="12" cy="12.5" r="3" />
                        </>
                      )}
                    </svg>
                  </button>
                </div>
              </label>

              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>{t('rememberMe')}</span>
              </label>

              {error && <div className="login-error">{error}</div>}

              <button className="login-submit" type="submit" disabled={busy}>
                {busy ? t('signingIn') : t('signIn')}
              </button>
            </form>

            <p className="login-foot">{t('secureFoot')}</p>
          </div>
        </section>

        <section className="login-carousel" aria-label="QR showcase">
          {SLIDES.map((item, index) => (
            <div
              key={item.id}
              className={`login-slide ${index === slide ? 'is-active' : ''}`}
              style={{ backgroundImage: `url(${item.image})` }}
              aria-hidden={index !== slide}
            />
          ))}
          <div className="login-carousel-veil" />
          <div className="login-carousel-copy">
            <p className="login-carousel-kicker">29 Jewellery</p>
            <h2>{active.title}</h2>
            <p>{active.text}</p>
            <div className="login-dots" role="tablist" aria-label="Slides">
              {SLIDES.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={index === slide ? 'is-active' : ''}
                  aria-label={`Show slide ${index + 1}`}
                  onClick={() => setSlide(index)}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
