import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'public', '29-jewellery-logo.png');
const outDir = path.join(root, 'public', 'icons');
const publicDir = path.join(root, 'public');

fs.mkdirSync(outDir, { recursive: true });

/** QR finder corner — kept inside iOS safe zone (inset from edges) */
function finderSvg(x, y, cell) {
  const outer = cell * 7;
  const mid = cell * 5;
  const inner = cell * 3;
  return `
    <rect x="${x}" y="${y}" width="${outer}" height="${outer}" rx="${cell * 0.35}" fill="#111111"/>
    <rect x="${x + cell}" y="${y + cell}" width="${mid}" height="${mid}" rx="${cell * 0.25}" fill="#ffffff"/>
    <rect x="${x + cell * 2}" y="${y + cell * 2}" width="${inner}" height="${inner}" rx="${cell * 0.15}" fill="#111111"/>
  `;
}

function qrFrameSvg(size) {
  // iOS rounds/crops ~10% of edges — keep QR markers well inside
  const inset = Math.round(size * 0.12);
  const cell = Math.max(5, Math.round(size * 0.032));
  const box = size - inset * 2;
  const right = inset + box - cell * 7;
  const bottom = inset + box - cell * 7;
  const stroke = Math.max(3, Math.round(size * 0.014));
  return Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#ffffff"/>
      <rect x="${inset}" y="${inset}" width="${box}" height="${box}"
        rx="${Math.round(size * 0.04)}" ry="${Math.round(size * 0.04)}"
        fill="#ffffff" stroke="#111111" stroke-width="${stroke}"/>
      ${finderSvg(inset + cell * 0.4, inset + cell * 0.4, cell)}
      ${finderSvg(right - cell * 0.4, inset + cell * 0.4, cell)}
      ${finderSvg(inset + cell * 0.4, bottom - cell * 0.4, cell)}
      <!-- quiet-zone dots to reinforce QR look without edge clipping -->
      <rect x="${right + cell * 2}" y="${bottom + cell * 2}" width="${cell}" height="${cell}" fill="#111111"/>
      <rect x="${right + cell * 4}" y="${bottom + cell * 2}" width="${cell}" height="${cell}" fill="#111111"/>
      <rect x="${right + cell * 2}" y="${bottom + cell * 4}" width="${cell}" height="${cell}" fill="#111111"/>
    </svg>
  `);
}

async function makeIcon(sharp, size, filePath) {
  const logoMax = Math.round(size * 0.48);
  const logo = await sharp(src)
    .resize(logoMax, logoMax, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp(qrFrameSvg(size))
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(filePath);
}

async function main() {
  try {
    const require = createRequire(import.meta.url);
    const sharp = require('sharp');

    // Versioned names so Safari / Cloudflare cannot reuse old icon paths
    await makeIcon(sharp, 180, path.join(outDir, 'apple-touch-icon-v3.png'));
    await makeIcon(sharp, 192, path.join(outDir, 'icon-192-v3.png'));
    await makeIcon(sharp, 512, path.join(outDir, 'icon-512-v3.png'));
    await makeIcon(sharp, 64, path.join(outDir, 'favicon-64-v3.png'));

    // Stable aliases + iOS root convention
    for (const [from, to] of [
      ['apple-touch-icon-v3.png', 'apple-touch-icon.png'],
      ['icon-192-v3.png', 'icon-192.png'],
      ['icon-512-v3.png', 'icon-512.png'],
      ['favicon-64-v3.png', 'favicon-64.png'],
    ]) {
      fs.copyFileSync(path.join(outDir, from), path.join(outDir, to));
    }
    fs.copyFileSync(
      path.join(outDir, 'apple-touch-icon-v3.png'),
      path.join(publicDir, 'apple-touch-icon.png')
    );

    console.log('QR-shaped icons v3 created (iOS-safe inset)');
  } catch (err) {
    console.warn('sharp icon build failed, copying logo:', err.message);
    const buf = fs.readFileSync(src);
    for (const name of [
      'icon-192.png',
      'icon-512.png',
      'apple-touch-icon.png',
      'favicon-64.png',
      'icon-192-v3.png',
      'icon-512-v3.png',
      'apple-touch-icon-v3.png',
      'favicon-64-v3.png',
    ]) {
      fs.writeFileSync(path.join(outDir, name), buf);
    }
    fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), buf);
  }
}

main();
