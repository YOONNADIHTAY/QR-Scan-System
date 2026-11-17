/**
 * Optional: CAPACITOR_SERVER_URL=https://your-live-host
 * makes the APK load the live site (API works same-origin).
 * Without it, the APK uses bundled dist — set VITE_API_BASE for API calls.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfgPath = path.join(root, 'capacitor.config.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const url = String(process.env.CAPACITOR_SERVER_URL || '').trim().replace(/\/$/, '');

cfg.server = {
  androidScheme: 'https',
  cleartext: true,
  ...(url ? { url } : {}),
};

fs.writeFileSync(cfgPath, `${JSON.stringify(cfg, null, 2)}\n`);
console.log(
  url
    ? `Capacitor will load remote: ${url}`
    : 'Capacitor will use bundled dist (set VITE_API_BASE for API if needed)'
);
