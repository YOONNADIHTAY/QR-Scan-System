import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'public', '29-jewellery-logo.png');
const outDir = path.join(root, 'public', 'icons');
const publicDir = path.join(root, 'public');
const ICON_QR_URL = 'https://qr.29jewellery.com';
const VERSION = 'v4';

fs.mkdirSync(outDir, { recursive: true });

/** Clean circular 29 logo pad — same style as branded QR center */
async function circleLogo(sharp, size, bg = '#ffffff') {
  const logoSize = Math.round(size * 0.72);
  const logo = await sharp(src)
    .resize(logoSize, logoSize, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  const circleMask = Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#fff"/>
    </svg>
  `);

  const ring = Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}"
        fill="none" stroke="#ffffff" stroke-width="${Math.max(4, Math.round(size * 0.08))}"/>
    </svg>
  `);

  const disc = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toBuffer();

  const clipped = await sharp(disc)
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  return sharp(clipped)
    .composite([{ input: ring, gravity: 'centre' }])
    .png()
    .toBuffer();
}

async function makeIcon(sharp, QRCode, size, filePath) {
  // Real QR modules (like branded download QR) with 29 logo in center circle
  const qrPng = await QRCode.toBuffer(ICON_QR_URL, {
    errorCorrectionLevel: 'H',
    type: 'png',
    margin: 2,
    width: size,
    color: { dark: '#111111', light: '#ffffff' },
  });

  const logoCanvas = Math.round(size * 0.28);
  const logoCircle = await circleLogo(sharp, logoCanvas);

  await sharp(qrPng)
    .composite([{ input: logoCircle, gravity: 'centre' }])
    .png()
    .toFile(filePath);
}

async function main() {
  const require = createRequire(import.meta.url);
  const sharp = require('sharp');
  const QRCode = require('qrcode');

  await makeIcon(sharp, QRCode, 180, path.join(outDir, `apple-touch-icon-${VERSION}.png`));
  await makeIcon(sharp, QRCode, 192, path.join(outDir, `icon-192-${VERSION}.png`));
  await makeIcon(sharp, QRCode, 512, path.join(outDir, `icon-512-${VERSION}.png`));
  await makeIcon(sharp, QRCode, 64, path.join(outDir, `favicon-64-${VERSION}.png`));

  for (const [from, to] of [
    [`apple-touch-icon-${VERSION}.png`, 'apple-touch-icon.png'],
    [`icon-192-${VERSION}.png`, 'icon-192.png'],
    [`icon-512-${VERSION}.png`, 'icon-512.png'],
    [`favicon-64-${VERSION}.png`, 'favicon-64.png'],
  ]) {
    fs.copyFileSync(path.join(outDir, from), path.join(outDir, to));
  }
  fs.copyFileSync(
    path.join(outDir, `apple-touch-icon-${VERSION}.png`),
    path.join(publicDir, 'apple-touch-icon.png')
  );

  console.log('Neat branded-QR app icons created (29 logo center)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
