import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const src = path.join(root, 'public', '29-jewellery-logo.png');
const outDir = path.join(root, 'public', 'icons');

fs.mkdirSync(outDir, { recursive: true });

// Prefer sharp if available; otherwise copy logo for both sizes
async function main() {
  try {
    const require = createRequire(import.meta.url);
    const sharp = require('sharp');
    await sharp(src).resize(192, 192, { fit: 'contain', background: '#ffffff' }).png().toFile(path.join(outDir, 'icon-192.png'));
    await sharp(src).resize(512, 512, { fit: 'contain', background: '#ffffff' }).png().toFile(path.join(outDir, 'icon-512.png'));
    console.log('Icons created with sharp');
  } catch {
    const buf = fs.readFileSync(src);
    fs.writeFileSync(path.join(outDir, 'icon-192.png'), buf);
    fs.writeFileSync(path.join(outDir, 'icon-512.png'), buf);
    console.log('Icons copied from logo (install sharp for resized icons)');
  }
}

main();
