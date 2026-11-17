import { useEffect, useState } from 'react';

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export default function InstallAppBanner() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return undefined;
    if (window.Capacitor?.isNativePlatform?.()) return undefined;
    // Don't cover the public camera-scan card
    if (/^\/scan\//.test(window.location.pathname)) return undefined;

    const dismissed = sessionStorage.getItem('qr_install_dismissed');
    if (dismissed) return undefined;

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);

    function onBeforeInstall(e) {
      e.preventDefault();
      setDeferred(e);
      setVisible(true);
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    if (isIos && isSafari) {
      setIosHint(true);
      setVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  if (!visible) return null;

  async function onInstall() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setVisible(false);
    sessionStorage.setItem('qr_install_dismissed', '1');
  }

  function onClose() {
    setVisible(false);
    sessionStorage.setItem('qr_install_dismissed', '1');
  }

  return (
    <div className="install-banner" role="dialog" aria-label="Install app">
      <div className="install-banner-copy">
        <strong>29 Jewellery QR</strong>
        <span>
          {iosHint
            ? 'iPhone: Share → Add to Home Screen to install.'
            : 'Install on your phone for quick Users / admin access.'}
        </span>
      </div>
      <div className="install-banner-actions">
        {deferred ? (
          <button type="button" className="btn btn-primary" onClick={onInstall}>
            Install
          </button>
        ) : null}
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Later
        </button>
      </div>
    </div>
  );
}
