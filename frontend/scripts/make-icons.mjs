import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'public', '29-jewellery-logo.png');
const outDir = path.join(root, 'public', 'icons');

fs.mkdirSync(outDir, { recursive: true });

/** QR-style finder corner (like a real QR code corner square) */
function finderSvg(size, x, y, cell) {
  const outer = cell * 7;
  const mid = cell * 5;
  const inner = cell * 3;
  const ox = x;
  const oy = y;
  return `
    <rect x="${ox}" y="${oy}" width="${outer}" height="${outer}" fill="#111111"/>
    <rect x="${ox + cell}" y="${oy + cell}" width="${mid}" height="${mid}" fill="#ffffff"/>
    <rect x="${ox + cell * 2}" y="${oy + cell * 2}" width="${inner}" height="${inner}" fill="#111111"/>
  `;
}

function qrFrameSvg(size) {
  const pad = Math.round(size * 0.06);
  const cell = Math.max(4, Math.round(size * 0.035));
  const right = size - pad - cell * 7;
  const bottom = size - pad - cell * 7;
  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.08)}" ry="${Math.round(size * 0.08)}" fill="#ffffff"/>
      <rect x="${pad / 2}" y="${pad / 2}" width="${size - pad}" height="${size - pad}"
        rx="${Math.round(size * 0.05)}" ry="${Math.round(size * 0.05)}"
        fill="none" stroke="#111111" stroke-width="${Math.max(2, Math.round(size * 0.012))}"/>
      ${finderSvg(size, pad, pad, cell)}
      ${finderSvg(size, right, pad, cell)}
      ${finderSvg(size, pad, bottom, cell)}
    </svg>
  `);
}

async function makeIcon(sharp, size, fileName) {
  const logoMax = Math.round(size * 0.58);
  const logo = await sharp(src)
    .resize(logoMax, logoMax, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  const frame = qrFrameSvg(size);
  await sharp(frame)
    .composite([
      {
        input: logo,
        gravity: 'centre',
      },
    ])
    .png()
    .toFile(path.join(outDir, fileName));
}

async function main() {
  try {
    const require = createRequire(import.meta.url);
    const sharp = require('sharp');
    await makeIcon(sharp, 180, 'apple-touch-icon.png');
    await makeIcon(sharp, 192, 'icon-192.png');
    await makeIcon(sharp, 512, 'icon-512.png');
    // Favicon-sized square for browser tab / Windows search
    await makeIcon(sharp, 64, 'favicon-64.png');
    console.log('QR-shaped icons created with 29 logo');
  } catch (err) {
    console.warn('sharp icon build failed, copying logo:', err.message);
    const buf = fs.readFileSync(src);
    for (const name of ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'favicon-64.png']) {
      fs.writeFileSync(path.join(outDir, name), buf);
    }
  }
}

main();
