import { useEffect, useState } from 'react';

const STORAGE_KEY = 'qr_public_base';

function isPublicHttpUrl(url) {
  return /^https:\/\//i.test(url || '');
}

export default function usePublicBase() {
  const [baseUrl, setBaseUrl] = useState(
    () => localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_PUBLIC_URL || ''
  );
  const [lanUrl, setLanUrl] = useState('');
  const [serverPublicUrl, setServerPublicUrl] = useState('');

  useEffect(() => {
    fetch('/api/config')
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (!cfg) return;
        setLanUrl(cfg.lanUrl || '');
        setServerPublicUrl(cfg.publicUrl || '');

        // Always sync to server public HTTPS URL (tunnels rotate often)
        if (isPublicHttpUrl(cfg.publicUrl)) {
          const stored = localStorage.getItem(STORAGE_KEY) || '';
          if (stored !== cfg.publicUrl) {
            localStorage.setItem(STORAGE_KEY, cfg.publicUrl);
          }
          setBaseUrl(cfg.publicUrl);
          return;
        }

        if (!localStorage.getItem(STORAGE_KEY) && cfg.publicUrl) {
          setBaseUrl(cfg.publicUrl);
        }
      })
      .catch(() => {});
  }, []);

  function saveBaseUrl(value) {
    const next = value.trim();
    setBaseUrl(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  const publicBase = (
    baseUrl ||
    serverPublicUrl ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  ).replace(/\/$/, '');

  return { publicBase, lanUrl, serverPublicUrl, saveBaseUrl };
}
