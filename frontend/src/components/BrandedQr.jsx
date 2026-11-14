import { useEffect, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

function drawLogo(canvas, logoUrl, size, bgColor) {
  if (!canvas || !logoUrl) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const logoSize = size * 0.22;
    const x = (size - logoSize) / 2;
    const y = (size - logoSize) / 2;
    const pad = 6;

    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, logoSize / 2 + pad, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, logoSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, logoSize, logoSize);
    ctx.restore();
  };
  img.src = logoUrl;
}

export default function BrandedQr({
  value,
  size = 220,
  fgColor = '#111111',
  bgColor = '#ffffff',
  logoUrl = '',
  id = 'branded-qr',
}) {
  const wrapRef = useRef(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const canvas = wrapRef.current?.querySelector('canvas') || document.getElementById(id);
      drawLogo(canvas, logoUrl, size, bgColor);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [value, size, fgColor, bgColor, logoUrl, id]);

  return (
    <div className="branded-qr" ref={wrapRef}>
      <QRCodeCanvas
        id={id}
        value={value}
        size={size}
        bgColor={bgColor}
        fgColor={fgColor}
        level="H"
        includeMargin
      />
    </div>
  );
}

export function downloadBrandedQrPng(canvasId, fileName = 'qr.png') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  // slight delay ensures logo paint finished
  window.setTimeout(() => {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
  }, 80);
}
