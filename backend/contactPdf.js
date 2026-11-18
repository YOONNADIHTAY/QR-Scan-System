function safeFileName(name) {
  const base = String(name || 'contact')
    .trim()
    .replace(/[^\w\- ]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${base || 'contact'}.pdf`;
}

function personalPhonesOf(profile) {
  if (Array.isArray(profile?.personalPhones) && profile.personalPhones.length) {
    return profile.personalPhones.map((p) => String(p || '').trim()).filter(Boolean);
  }
  if (profile?.personalPhone) {
    return [String(profile.personalPhone).trim()].filter(Boolean);
  }
  return [];
}

function pdfEscape(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function toWinAnsi(text) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?');
}

/**
 * Build a clean single-page contact PDF (no external deps).
 * A4 portrait, systematic card layout.
 */
function buildContactPdf(profile) {
  const name = toWinAnsi(profile?.name || 'Contact');
  const title = toWinAnsi(profile?.position || profile?.description || '');
  const org =
    profile?.includeShop === false
      ? '29 Jewellery'
      : toWinAnsi(String(profile?.shopName || '').trim() || '29 Jewellery');
  const email = toWinAnsi(profile?.personalEmail || '');
  const location = toWinAnsi(profile?.personalLocation || '');
  const phones = personalPhonesOf(profile).map(toWinAnsi);
  const url = toWinAnsi(profile?.scanUrl || '');

  const rows = [];
  rows.push({ label: 'Name', value: name });
  if (title) rows.push({ label: 'Position', value: title });
  rows.push({ label: 'Company', value: org });
  phones.forEach((phone, i) => {
    rows.push({ label: phones.length > 1 ? `Phone ${i + 1}` : 'Phone', value: phone });
  });
  if (email) rows.push({ label: 'Email', value: email });
  if (location) rows.push({ label: 'Location', value: location });
  if (url) rows.push({ label: 'Scan card', value: url });

  const pageW = 595.28;
  const pageH = 841.89;
  const marginX = 48;
  const contentW = pageW - marginX * 2;

  const ops = [];
  const push = (s) => ops.push(s);

  // Soft page background strip
  push('0.97 0.98 0.99 rg');
  push(`0 0 ${pageW.toFixed(2)} ${pageH.toFixed(2)} re f`);

  // Header bar
  push('0.12 0.16 0.22 rg');
  push(`0 ${(pageH - 120).toFixed(2)} ${pageW.toFixed(2)} 120 re f`);

  // Accent line
  push('0.29 0.33 0.39 rg');
  push(`${marginX.toFixed(2)} ${(pageH - 128).toFixed(2)} ${contentW.toFixed(2)} 2.5 re f`);

  // Header text
  push('BT');
  push('/F2 11 Tf');
  push('1 1 1 rg');
  push(`1 0 0 1 ${marginX.toFixed(2)} ${(pageH - 42).toFixed(2)} Tm`);
  push(`(${pdfEscape('29 JEWELLERY')}) Tj`);
  push('/F1 22 Tf');
  push(`1 0 0 1 ${marginX.toFixed(2)} ${(pageH - 74).toFixed(2)} Tm`);
  push(`(${pdfEscape(name)}) Tj`);
  if (title) {
    push('/F2 12 Tf');
    push('0.85 0.88 0.92 rg');
    push(`1 0 0 1 ${marginX.toFixed(2)} ${(pageH - 96).toFixed(2)} Tm`);
    push(`(${pdfEscape(title)}) Tj`);
  }
  push('ET');

  // Card panel
  const cardTop = pageH - 160;
  const cardH = Math.max(280, 70 + rows.length * 34 + 48);
  push('1 1 1 rg');
  push(
    `${marginX.toFixed(2)} ${(cardTop - cardH).toFixed(2)} ${contentW.toFixed(2)} ${cardH.toFixed(2)} re f`
  );
  push('0.90 0.91 0.93 RG');
  push('1 w');
  push(
    `${marginX.toFixed(2)} ${(cardTop - cardH).toFixed(2)} ${contentW.toFixed(2)} ${cardH.toFixed(2)} re S`
  );

  push('BT');
  push('/F2 10 Tf');
  push('0.42 0.45 0.50 rg');
  push(`1 0 0 1 ${(marginX + 22).toFixed(2)} ${(cardTop - 28).toFixed(2)} Tm`);
  push(`(${pdfEscape('PERSONAL INFORMATION')}) Tj`);
  push('ET');

  let y = cardTop - 58;
  rows.forEach((row, index) => {
    if (index > 0) {
      push('0.93 0.94 0.96 RG');
      push('0.6 w');
      push(
        `${(marginX + 22).toFixed(2)} ${(y + 16).toFixed(2)} m ${(marginX + contentW - 22).toFixed(2)} ${(y + 16).toFixed(2)} l S`
      );
    }
    push('BT');
    push('/F2 9 Tf');
    push('0.45 0.49 0.55 rg');
    push(`1 0 0 1 ${(marginX + 22).toFixed(2)} ${y.toFixed(2)} Tm`);
    push(`(${pdfEscape(row.label.toUpperCase())}) Tj`);
    push('/F1 12 Tf');
    push('0.12 0.16 0.22 rg');
    push(`1 0 0 1 ${(marginX + 22).toFixed(2)} ${(y - 16).toFixed(2)} Tm`);
    const value = row.value.length > 70 ? `${row.value.slice(0, 67)}...` : row.value;
    push(`(${pdfEscape(value)}) Tj`);
    push('ET');
    y -= 34;
  });

  // Footer
  push('BT');
  push('/F2 9 Tf');
  push('0.55 0.58 0.62 rg');
  push(`1 0 0 1 ${marginX.toFixed(2)} 36 Tm`);
  push(`(${pdfEscape('29 Jewellery QR System  ·  Digital contact card')}) Tj`);
  push('ET');

  const contentStream = ops.join('\n');
  const contentLen = Buffer.byteLength(contentStream, 'utf8');

  const objects = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n`
  );
  objects.push(
    `4 0 obj\n<< /Length ${contentLen} >>\nstream\n${contentStream}\nendstream\nendobj\n`
  );
  objects.push('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n');
  objects.push('6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  });
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

module.exports = { buildContactPdf, safeFileName, personalPhonesOf };
