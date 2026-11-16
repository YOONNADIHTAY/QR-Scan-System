import { useEffect, useRef, useState } from 'react';

function loadGoogleScript() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById('google-gsi');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Google script failed'))
      );
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google script failed'));
    document.head.appendChild(script);
  });
}

function GoogleLogo() {
  return (
    <svg className="google-g-logo" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.3 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l.1.1 6.2 5.2C36.8 39 44 33.5 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}

export default function GoogleSignInButton({ onCredential, disabled }) {
  const tokenClientRef = useRef(null);
  const onCredentialRef = useRef(onCredential);
  const [clientId, setClientId] = useState(
    () => import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  );
  const [ready, setReady] = useState(false);
  const [hint, setHint] = useState('');

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (cancelled || !cfg?.googleClientId) return;
        setClientId(String(cfg.googleClientId).trim());
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!clientId) {
      setReady(false);
      tokenClientRef.current = null;
      return undefined;
    }

    (async () => {
      try {
        await loadGoogleScript();
        if (cancelled || !window.google?.accounts?.oauth2) return;

        // Always show account picker so any Google account can be chosen
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          prompt: 'select_account',
          callback: (response) => {
            if (response?.error) {
              setHint(response.error_description || response.error);
              return;
            }
            if (response?.access_token) {
              setHint('');
              onCredentialRef.current?.(response.access_token);
            }
          },
          error_callback: (err) => {
            if (err?.type === 'popup_closed') return;
            setHint(err?.message || 'Google Sign-In was cancelled');
          },
        });
        setReady(true);
        setHint('');
      } catch (err) {
        if (!cancelled) {
          setReady(false);
          setHint(err.message || 'Google Sign-In unavailable');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  function onClick() {
    if (disabled) return;

    if (!clientId) {
      setHint(
        'Google account picker needs a one-time Client ID from Google Cloud. Paste it here in chat and we will add it.'
      );
      return;
    }

    if (!ready || !tokenClientRef.current) {
      setHint('Google is still loading… try again in a second.');
      return;
    }

    try {
      tokenClientRef.current.requestAccessToken({ prompt: 'select_account' });
    } catch {
      setHint('Could not open Google Sign-In.');
    }
  }

  return (
    <div className={`google-signin-wrap${disabled ? ' is-disabled' : ''}`}>
      <button
        type="button"
        className="google-signin-custom"
        onClick={onClick}
        disabled={disabled}
      >
        <GoogleLogo />
        <span>Sign in with Google</span>
      </button>
      {hint ? <p className="google-signin-hint is-error">{hint}</p> : null}
    </div>
  );
}
