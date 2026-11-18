function escapeVCard(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
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

function safeVcfFileName(name) {
  const base = String(name || 'contact')
    .trim()
    .replace(/[^\w\- ]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);
  return `${base || 'contact'}.vcf`;
}

/** vCard 3.0 — opens Add Contact on iOS + Android */
function buildVCard(profile) {
  const name = String(profile?.name || '').trim() || 'Contact';
  const phones = personalPhonesOf(profile);
  const email = String(profile?.personalEmail || '').trim();
  const title = String(profile?.position || profile?.description || '').trim();
  const location = String(profile?.personalLocation || '').trim();
  const org =
    profile?.includeShop === false
      ? '29 Jewellery'
      : String(profile?.shopName || '').trim() || '29 Jewellery';
  const url = String(profile?.scanUrl || profile?.publicUrl || '').trim();

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCard(name)}`,
    `N:;${escapeVCard(name)};;;`,
    `ORG:${escapeVCard(org)}`,
  ];

  if (title) lines.push(`TITLE:${escapeVCard(title)}`);
  phones.forEach((phone, index) => {
    lines.push(`TEL;TYPE=${index === 0 ? 'CELL' : 'VOICE'}:${escapeVCard(phone)}`);
  });
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(email)}`);
  if (location) lines.push(`ADR;TYPE=HOME:;;${escapeVCard(location)};;;;`);
  if (url) lines.push(`URL:${escapeVCard(url)}`);
  lines.push('END:VCARD');
  return `${lines.join('\r\n')}\r\n`;
}

module.exports = { buildVCard, safeVcfFileName, personalPhonesOf };
