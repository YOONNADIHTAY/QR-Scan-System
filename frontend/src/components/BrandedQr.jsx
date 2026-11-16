import { useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

export const QR_FRAMES = [
  { id: 'none', label: 'None' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'double', label: 'Double' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'badge', label: 'Badge' },
];

export default function BrandedQr({
  value,
  size = 220,
  fgColor = '#111111',
  bgColor = '#ffffff',
  logoUrl = '',
  frame = 'none',
  id = 'branded-qr',
}) {
  const imageSettings = useMemo(() => {
    const src = String(logoUrl || '').trim();
    if (!src) return undefined;
    const logoSize = Math.round(size * 0.24);
    const isRemoteHttp = /^https?:\/\//i.test(src);
    return {
      src,
      height: logoSize,
      width: logoSize,
      excavate: true,
      // blob:/uploads same-origin — skip crossOrigin so photo paints
      ...(isRemoteHttp ? { crossOrigin: 'anonymous' } : {}),
    };
  }, [logoUrl, size]);

  return (
    <div
      className={`branded-qr-frame frame-${frame || 'none'}`}
      style={{ '--qr-fg': fgColor, '--qr-bg': bgColor }}
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
          imageSettings={imageSettings}
        />
      </div>
      {frame === 'badge' ? <span className="qr-frame-badge">SCAN ME</span> : null}
    </div>
  );
}

export function downloadBrandedQrPng(canvasId, fileName = 'qr.png') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  // Wait a tick so logo imageSettings finish painting
  window.setTimeout(() => {
    try {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    } catch {
      // tainted canvas if remote logo blocked — still try
    }
  }, 120);
}

export function printBrandedQr(areaSelector = '.qr-print-area') {
  const node = document.querySelector(areaSelector);
  if (!node) return;
  const win = window.open('', '_blank', 'noopener,noreferrer,width=480,height=640');
  if (!win) return;
  const canvas = node.querySelector('canvas');
  let imgSrc = '';
  try {
    imgSrc = canvas ? canvas.toDataURL('image/png') : '';
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
