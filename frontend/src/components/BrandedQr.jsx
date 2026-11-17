import { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { assetUrl } from '../apiBase';

export const QR_FRAMES = [
  { id: 'none', label: 'None' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'double', label: 'Double' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'badge', label: 'Badge' },
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:\/\//i.test(src)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Circular PNG for overlay + download */
async function toCircleLogoDataUrl(src, size, bgColor) {
  if (!src) return '';
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return src;
  ctx.clearRect(0, 0, size, size);
  const r = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(r, r, r - 1, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = bgColor || '#ffffff';
  ctx.fillRect(0, 0, size, size);
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  ctx.restore();
  ctx.beginPath();
  ctx.arc(r, r, r - 2, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, Math.round(size * 0.08));
  ctx.stroke();
  return canvas.toDataURL('image/png');
}

export default function BrandedQr({
  value,
  size = 220,
  fgColor = '#111111',
  bgColor = '#ffffff',
  logoUrl = '',
  frame = 'none',
  id = 'branded-qr',
}) {
  const resolvedSrc = assetUrl(logoUrl);
  const [circleLogo, setCircleLogo] = useState('');

  useEffect(() => {
    let cancelled = false;
    setCircleLogo('');
    if (!resolvedSrc) return undefined;
    toCircleLogoDataUrl(resolvedSrc, 192, bgColor)
      .then((dataUrl) => {
        if (!cancelled) setCircleLogo(dataUrl || resolvedSrc);
      })
      .catch(() => {
        if (!cancelled) setCircleLogo(resolvedSrc);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedSrc, bgColor]);

  return (
    <div
      className={`branded-qr-frame frame-${frame || 'none'}`}
      style={{ '--qr-fg': fgColor, '--qr-bg': bgColor }}
      data-logo={circleLogo || ''}
    >
      <div className="branded-qr">
        <QRCodeCanvas
          id={id}
          value={value}
          size={size}
          bgColor={bgColor}
          fgColor={fgColor}
          level="H"
          includeMargin
        />
        {resolvedSrc ? (
          <img
            className="branded-qr-logo-circle"
            src={circleLogo || resolvedSrc}
            alt=""
            aria-hidden="true"
          />
        ) : null}
      </div>
      {frame === 'badge' ? <span className="qr-frame-badge">SCAN ME</span> : null}
    </div>
  );
}

export async function downloadBrandedQrPng(canvasId, fileName = 'qr.png') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const wrap = canvas.closest('.branded-qr-frame');
  const logoSrc = wrap?.getAttribute('data-logo') || '';
  try {
    const out = document.createElement('canvas');
    out.width = canvas.width;
    out.height = canvas.height;
    const ctx = out.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(canvas, 0, 0);
    if (logoSrc) {
      const logo = await loadImage(logoSrc);
      const logoSize = Math.round(Math.min(out.width, out.height) * 0.26);
      const x = (out.width - logoSize) / 2;
      const y = (out.height - logoSize) / 2;
      ctx.drawImage(logo, x, y, logoSize, logoSize);
    }
    const url = out.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  } catch {
    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    } catch {
      /* ignore */
    }
  }
}

export function printBrandedQr(areaSelector = '.qr-print-area') {
  const node = document.querySelector(areaSelector);
  if (!node) return;
  const win = window.open('', '_blank', 'noopener,noreferrer,width=480,height=640');
  if (!win) return;
  const canvas = node.querySelector('canvas');
  const logo = node.querySelector('.branded-qr-logo-circle');
  let imgSrc = '';
  try {
    if (canvas) {
      const out = document.createElement('canvas');
      out.width = canvas.width;
      out.height = canvas.height;
      const ctx = out.getContext('2d');
      ctx.drawImage(canvas, 0, 0);
      if (logo?.complete && logo.naturalWidth) {
        const logoSize = Math.round(Math.min(out.width, out.height) * 0.26);
        const x = (out.width - logoSize) / 2;
        const y = (out.height - logoSize) / 2;
        ctx.drawImage(logo, x, y, logoSize, logoSize);
      }
      imgSrc = out.toDataURL('image/png');
    }
  } catch {
    imgSrc = '';
  }
  win.document.write(`<!doctype html><html><head><title>Print QR</title>
    <style>
      body{font-family:sans-serif;text-align:center;padding:24px;color:#0f172a}
      img{width:260px;height:260px;object-fit:contain}
      p{word-break:break-all;font-size:12px;color:#64748b}
    </style></head><body>
    <h2>29 Jewellery QR</h2>
    ${imgSrc ? `<img src="${imgSrc}" alt="QR" />` : node.innerHTML}
    <p>${node.dataset.url || ''}</p>
    <script>window.onload=()=>{window.print();}</script>
    </body></html>`);
  win.document.close();
}
