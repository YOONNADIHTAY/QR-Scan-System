/**
 * Web (browser / PWA on same host): relative "/api"
 * Capacitor Android APK: set VITE_API_BASE to your live backend (https://... or http://LAN:5000)
 */
export function apiUrl(path) {
  const base = String(import.meta.env.VITE_API_BASE || '')
    .trim()
    .replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

/** Resolve /uploads/... (and similar) against VITE_API_BASE when set */
export function assetUrl(path) {
  const src = String(path || '').trim();
  if (!src) return '';
  if (/^(https?:|blob:|data:)/i.test(src)) return src;
  return apiUrl(src.startsWith('/') ? src : `/${src}`);
}
