function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseCoord(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapsOpenUrl(branch) {
  if (branch.googleMapLink) return branch.googleMapLink;
  const lat = parseCoord(branch.latitude);
  const lng = parseCoord(branch.longitude);
  if (lat != null && lng != null) {
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }
  const place = String(
    branch.address || branch.locationName || branch.name || ''
  ).trim();
  if (!place) return '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

function mapsDirectionsUrl(branch) {
  const lat = parseCoord(branch.latitude);
  const lng = parseCoord(branch.longitude);
  if (lat != null && lng != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }
  const place = String(
    branch.address || branch.locationName || branch.name || ''
  ).trim();
  if (!place) return '';
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`;
}

function branchCoords(branch) {
  const lat = parseCoord(branch.latitude);
  const lng = parseCoord(branch.longitude);
  if (lat != null && lng != null) {
    return { lat, lng };
  }
  return null;
}

const ICONS = {
  phone:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.2 4.8l1.7 1.7a1.5 1.5 0 0 1 0 2.1l-.9.9a12.2 12.2 0 0 0 5.5 5.5l.9-.9a1.5 1.5 0 0 1 2.1 0l1.7 1.7a1.5 1.5 0 0 1 0 2.1l-.8.8a3.2 3.2 0 0 1-3.2.8 17.2 17.2 0 0 1-9.8-9.8 3.2 3.2 0 0 1 .8-3.2l.8-.8a1.5 1.5 0 0 1 2.1 0z"/></svg>',
  mail:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4.2 7.2L12 12.4l7.8-5.2"/></svg>',
  facebook:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.6c0-.9.3-1.6 1.6-1.6H17V4.1C16.6 4 15.6 4 14.5 4 12 4 10.3 5.5 10.3 8.3v2.3H7.5v3.2h2.8V22h3.2z"/></svg>',
  tiktok:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.2 8.4a5.9 5.9 0 0 1-3.7-1.3v7.4a5.8 5.8 0 1 1-5-5.7c.3 0 .6 0 .9.1v2.9a2.9 2.9 0 1 0 2.1 2.8V3.8h2.8c.1 1.1.6 2.2 1.4 3 .8.7 1.8 1.2 2.9 1.4v2.2z"/></svg>',
  youtube:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 12.1c0-1.6-.1-3.1-.4-3.7a2.9 2.9 0 0 0-2-2C18 6 12 6 12 6s-6 0-7.6.4a2.9 2.9 0 0 0-2 2C2.1 9 2 10.5 2 12.1s.1 3.1.4 3.7a2.9 2.9 0 0 0 2 2C6 18.2 12 18.2 12 18.2s6 0 7.6-.4a2.9 2.9 0 0 0 2-2c.3-.6.4-2.1.4-3.7zM10 15.1V9.1l5.2 3-5.2 3z"/></svg>',
  viber:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.1 2.1c-4.9 0-8.9 3.5-8.9 7.9 0 2.5 1.3 4.7 3.3 6.2l-.7 3.4 3.6-1.1c.8.2 1.7.3 2.7.3 4.9 0 8.9-3.5 8.9-7.9S17 2.1 12.1 2.1zm4.4 10.6c-.2.5-1 .9-1.4 1-.4.1-.8.2-2.6-.5-2.2-.9-3.6-3.2-3.7-3.3-.1-.1-1-1.3-1-2.5s.6-1.8.9-2c.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.4.2.5.7 1.7.8 1.8.1.1.1.3 0 .5l-.4.6c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.2 1.4 2.5 1.5.3.1.5.1.7-.1.2-.2.7-.8.9-1.1.2-.3.4-.2.6-.1.2.1 1.6.8 1.9.9.3.1.5.2.5.3.1.2 0 .8-.2 1.3z"/></svg>',
  whatsapp:
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2.1a9.9 9.9 0 0 0-8.5 14.9L2.1 21.9l5-1.3a9.9 9.9 0 1 0 4.94-18.5zm5.78 14.1c-.24.68-1.4 1.24-1.94 1.32-.5.07-1.13.1-1.82-.11-.42-.13-.96-.31-1.66-.61-2.92-1.26-4.82-4.2-4.97-4.4-.14-.2-1.2-1.6-1.2-3.05 0-1.45.76-2.16 1.03-2.45.27-.29.59-.36.79-.36h.57c.18 0 .42-.07.66.5.24.59.82 2.02.89 2.17.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.17-.31.39-.45.52-.15.15-.3.31-.13.6.17.3.76 1.25 1.63 2.03 1.12 1 2.07 1.32 2.37 1.47.3.15.47.12.64-.07.18-.2.74-.86.94-1.16.2-.3.4-.25.67-.15.27.1 1.72.81 2.01.96.3.15.5.22.57.34.08.13.08.74-.16 1.42z"/></svg>',
  map:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s6.5-5.2 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.8 12 21 12 21z"/><circle cx="12" cy="10.5" r="2.4"/></svg>',
};

function toViberHref(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^viber:/i.test(raw) || /^https?:\/\//i.test(raw)) return raw;
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits) return '';
  const num = digits.startsWith('+') ? digits.slice(1) : digits;
  return `viber://chat?number=${encodeURIComponent(num)}`;
}

function contactRow({ href, label, value, tone, icon, external }) {
  const target = external ? ' target="_blank" rel="noreferrer"' : '';
  return `<a class="row" href="${escapeHtml(href)}"${target}><span class="icon ${escapeHtml(tone)}">${icon}</span><span class="copy"><span class="label">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></span></a>`;
}

function renderScanHtml(profile) {
  const branches = Array.isArray(profile.branches) ? profile.branches : [];
  const includeShop = profile.includeShop !== false;
  const hasShop =
    includeShop && (Boolean(profile.shopName) || branches.length > 0);

  const social = [];
  if (profile.whatsappLink) {
    social.push({
      href: profile.whatsappLink,
      label: 'WhatsApp',
      tone: 'wa',
      icon: ICONS.whatsapp,
    });
  }
  if (profile.facebookLink) {
    social.push({
      href: profile.facebookLink,
      label: 'Facebook',
      tone: 'fb',
      icon: ICONS.facebook,
    });
  }
  if (profile.tiktokLink) {
    social.push({
      href: profile.tiktokLink,
      label: 'TikTok',
      tone: 'tt',
      icon: ICONS.tiktok,
    });
  }
  if (profile.youtubeLink) {
    social.push({
      href: profile.youtubeLink,
      label: 'YouTube',
      tone: 'yt',
      icon: ICONS.youtube,
    });
  }

  const personalRows = [];
  const personalPhones = (
    Array.isArray(profile.personalPhones) && profile.personalPhones.length
      ? profile.personalPhones
      : profile.personalPhone
        ? [profile.personalPhone]
        : []
  )
    .map((p) => String(p || '').trim())
    .filter(Boolean);
  for (const phone of personalPhones) {
    personalRows.push(
      contactRow({
        href: `tel:${phone}`,
        label: 'Phone',
        value: phone,
        tone: 'phone',
        icon: ICONS.phone,
      })
    );
  }
  if (profile.personalEmail) {
    personalRows.push(
      contactRow({
        href: `mailto:${profile.personalEmail}`,
        label: 'Email',
        value: profile.personalEmail,
        tone: 'mail',
        icon: ICONS.mail,
      })
    );
  }
  const viberForRows = toViberHref(profile.viberNumber);
  if (viberForRows) {
    personalRows.push(
      contactRow({
        href: viberForRows,
        label: 'Viber',
        value: String(profile.viberNumber || '').trim(),
        tone: 'phone',
        icon: ICONS.viber,
      })
    );
  }
  for (const item of social) {
    personalRows.push(
      contactRow({
        href: item.href,
        label: 'Social',
        value: item.label,
        tone: item.tone,
        icon: item.icon,
        external: true,
      })
    );
  }

  const mapMarkers = [];
  let needsMap = false;

  const branchHtml = branches
    .map((branch, index) => {
      const place = String(
        branch.address || branch.locationName || branch.name || ''
      ).trim();
      const phones = (
        Array.isArray(branch.phones) && branch.phones.length
          ? branch.phones
          : branch.phone
            ? [branch.phone]
            : []
      )
        .map((p) => String(p || '').trim())
        .filter(Boolean);
      const coords = branchCoords(branch);
      const openUrl = mapsOpenUrl(branch);
      const directionsUrl = mapsDirectionsUrl(branch);
      const mapId = `shop-map-${index}`;
      if (place || coords) {
        needsMap = true;
        mapMarkers.push({
          id: mapId,
          lat: coords ? coords.lat : null,
          lng: coords ? coords.lng : null,
          label: place || 'Shop location',
          place: place || '',
        });
      }
      const phoneLines = phones
        .map(
          (phone) =>
            `<p class="phone"><a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a></p>`
        )
        .join('');
      const callBtns = phones
        .map(
          (phone) =>
            `<a class="btn ghost" href="tel:${escapeHtml(phone)}">Call ${escapeHtml(phone)}</a>`
        )
        .join('');
      const mapBlock =
        place || coords
          ? `<div id="${mapId}" class="map" data-place="${escapeHtml(place)}" role="img" aria-label="Map of ${escapeHtml(place || 'shop')}"><div class="map-loading">Loading map…</div></div>`
          : '';
      const shopNo = String(branch.shopNo || '').trim();
      const shopLabel = shopNo ? `Shop ${shopNo}` : '';
      const area = String(branch.name || '').trim();
      const title =
        [shopLabel, area || place].filter(Boolean).join(' · ') || 'Location';
      const addressLine =
        shopLabel && place && place !== area
          ? `<p class="muted">${escapeHtml(place)}</p>`
          : '';
      return `
        <article class="branch">
          <h3>${escapeHtml(title)}</h3>
          ${addressLine}
          ${phoneLines}
          ${mapBlock}
          <div class="actions">
            ${openUrl ? `<a class="btn primary" href="${escapeHtml(openUrl)}" target="_blank" rel="noreferrer">Open in Google Maps</a>` : ''}
            ${directionsUrl ? `<a class="btn ghost" href="${escapeHtml(directionsUrl)}" target="_blank" rel="noreferrer">Get directions</a>` : ''}
            ${callBtns}
          </div>
        </article>`;
    })
    .join('');

  const photos = Array.isArray(profile.photos) ? profile.photos : [];
  const photosHtml = photos.length
    ? `<section class="panel" id="photos"><div class="panel-head"><h2>Best-selling products</h2></div><div class="photos">${photos
        .map(
          (p) =>
            `<img src="${escapeHtml(p.url)}" alt="${escapeHtml(p.originalName || 'Product')}" loading="lazy" />`
        )
        .join('')}</div></section>`
    : '';

  const primaryPhone = personalPhones[0] || '';
  const viberHref = toViberHref(profile.viberNumber);
  const position = profile.position || profile.description || '';
  const personalLocation = String(profile.personalLocation || '').trim();
  const locationHtml = personalLocation
    ? `<p class="location">${ICONS.map}<span>${escapeHtml(personalLocation)}</span></p>`
    : '';
  const orbHtml = [
    primaryPhone
      ? `<a class="orb" href="sms:${escapeHtml(primaryPhone)}"><span class="orb-icon">${ICONS.phone}</span><small>Text</small></a>`
      : '',
    primaryPhone
      ? `<a class="orb" href="tel:${escapeHtml(primaryPhone)}"><span class="orb-icon">${ICONS.phone}</span><small>Call</small></a>`
      : '',
    profile.personalEmail
      ? `<a class="orb" href="mailto:${escapeHtml(profile.personalEmail)}"><span class="orb-icon">${ICONS.mail}</span><small>Email</small></a>`
      : '',
    viberHref
      ? `<a class="orb" href="${escapeHtml(viberHref)}"><span class="orb-icon">${ICONS.viber}</span><small>Viber</small></a>`
      : '',
  ]
    .filter(Boolean)
    .join('');

  const socialHtml = social
    .map(
      (item) =>
        `<a class="${escapeHtml(item.tone)}" href="${escapeHtml(item.href)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(item.label)}">${item.icon}</a>`
    )
    .join('');

  const gridHtml = photos.length
    ? `<a class="tile" href="#photos"><span class="tile-ico">◆</span><span>Products</span></a>`
    : '';

  const leafletAssets = '';

  const leafletBoot = needsMap
    ? `
  <script>
    (function () {
      var markers = ${JSON.stringify(mapMarkers)};

      function shopQuery(place) {
        var q = String(place || '').trim();
        if (!q) return '';
        if (/29\\s*jewellery/i.test(q)) return q;
        return '29 Jewellery ' + q + ', Yangon';
      }

      function embedUrl(item) {
        if (item.lat != null && item.lng != null) {
          return 'https://maps.google.com/maps?q=' + item.lat + ',' + item.lng + '&z=17&hl=en&output=embed';
        }
        var q = shopQuery(item.place || item.label || '');
        if (!q) return '';
        return 'https://maps.google.com/maps?q=' + encodeURIComponent(q) + '&z=16&hl=en&output=embed';
      }

      markers.forEach(function (item) {
        var el = document.getElementById(item.id);
        if (!el) return;
        var src = embedUrl(item);
        if (!src) {
          el.innerHTML = '<div class="map-fallback"><span>Map unavailable</span></div>';
          return;
        }
        el.innerHTML = '<iframe class="gmap" title="Shop map" src="' + src + '" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>';
      });
    })();
  </script>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(profile.name || '29 Jewellery')} · Scan</title>
  ${leafletAssets}
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, sans-serif;
      color: #10233a;
      line-height: 1.45;
      min-height: 100vh;
      background:
        radial-gradient(circle at 100% 0%, rgba(20,90,150,.1), transparent 38%),
        radial-gradient(circle at 0% 18%, rgba(61,143,209,.08), transparent 36%),
        linear-gradient(180deg, #ffffff 0%, #f7fbff 55%, #eef6fc 100%);
    }
    .shell { max-width: 440px; margin: 0 auto; padding: 1rem 1rem 2.2rem; }
    .brand { display:flex; align-items:center; gap:.65rem; color:#0a2744; margin-bottom:3.4rem; }
    .brand img { width:42px; height:42px; object-fit:contain; border-radius:10px; background:#fff; padding:.2rem; border:1px solid #d7e6f5; }
    .brand strong { display:block; font-size:.95rem; }
    .brand small { color:#145a96; font-size:.72rem; }
    .card {
      position:relative; background:#fff; border-radius:22px; padding:3.4rem 1.15rem 1.25rem;
      box-shadow: 0 14px 32px rgba(10,39,68,.1); text-align:center;
      border:1px solid #d7e6f5;
    }
    .avatar-wrap { position:absolute; left:50%; top:0; transform:translate(-50%,-48%); }
    .avatar {
      width:108px; height:108px; border-radius:999px; object-fit:cover; display:block;
      border:4px solid #fff; box-shadow:0 10px 28px rgba(10,39,68,.25); background:#e8eef5;
    }
    .avatar.fallback {
      display:grid; place-items:center; font-weight:700; color:#64748b; font-size:2rem;
    }
    h1 { margin:0; font-size:1.45rem; color:#0a2744; letter-spacing:-.02em; }
    .role { margin:.3rem 0 0; color:#145a96; font-weight:700; font-size:.92rem; }
    .location {
      margin:.4rem 0 0; color:#64748b; font-size:.84rem; font-weight:600;
      display:inline-flex; align-items:center; justify-content:center; gap:.3rem;
    }
    .location svg { width:14px; height:14px; color:#145a96; flex-shrink:0; }
    .tagline { margin:.35rem 0 0; color:#64748b; font-size:.82rem; }
    .orbs { display:flex; flex-wrap:wrap; justify-content:center; gap:.85rem 1rem; margin-top:1.15rem; }
    .orb { display:grid; gap:.35rem; justify-items:center; text-decoration:none; color:#0a2744; }
    .orb-icon {
      width:58px; height:58px; border-radius:999px; display:grid; place-items:center;
      background:linear-gradient(160deg,#0a2744,#145a96); color:#fff;
      box-shadow:0 10px 22px rgba(10,39,68,.28);
    }
    .orb-icon svg { width:22px; height:22px; display:block; }
    .orb small { font-size:.72rem; font-weight:700; letter-spacing:.04em; text-transform:uppercase; color:#475569; }
    .social { display:flex; justify-content:center; flex-wrap:wrap; gap:.55rem; margin-top:1rem; }
    .social a {
      width:40px; height:40px; border-radius:12px; display:grid; place-items:center;
      text-decoration:none; border:1px solid #dbe7f3; background:#f5f9fd; color:#0a2744;
    }
    .social a svg { width:16px; height:16px; }
    .social a.wa { color:#25d366; }
    .social a.fb { color:#1877f2; }
    .social a.tt { color:#111; }
    .social a.yt { color:#e11d48; }
    .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:.55rem; margin-top:1.1rem; max-width:260px; margin-left:auto; margin-right:auto; }
    .tile {
      display:grid; gap:.3rem; justify-items:center; padding:.7rem .35rem; border-radius:14px;
      border:1px solid #d7e6f5; background:linear-gradient(180deg,#f8fbfe,#eef6fc);
      text-decoration:none; color:#0a2744; font-size:.7rem; font-weight:700;
    }
    .tile svg, .tile .tile-ico svg { width:18px; height:18px; color:#145a96; }
    .panel {
      margin-top:1rem; background:#fff; border-radius:18px; padding:1rem;
      box-shadow:0 10px 28px rgba(10,39,68,.12);
    }
    .panel-head { display:flex; align-items:center; gap:.65rem; margin-bottom:.85rem; }
    .panel-head img { width:34px; height:34px; object-fit:contain; border-radius:8px; border:1px solid #e2e8f0; background:#fff; }
    .panel-head h2 { margin:0; font-size:.95rem; color:#0a2744; }
    .panel-head p { margin:.1rem 0 0; color:#64748b; font-size:.8rem; }
    .branch { padding:.75rem 0; border-top:1px solid #e8eef5; text-align:left; }
    .branch:first-of-type { border-top:0; padding-top:0; }
    .branch h3 { margin:0 0 .25rem; font-size:.95rem; }
    .muted { margin:0 0 .45rem; color:#64748b; font-size:.85rem; }
    .phone { margin:0; }
    .phone a { color:#145a96; text-decoration:none; font-weight:700; }
    .map {
      width:100%; height:240px; min-height:240px; border-radius:12px; overflow:hidden;
      border:1px solid #e2e8f0; margin-top:.55rem;
    }
    .map .gmap { width:100%; height:100%; border:0; display:block; background:#e8eef5; }
    .map-loading, .map-fallback {
      display:grid; place-items:center; width:100%; height:100%; min-height:240px;
      color:#64748b; font-size:.9rem; background:#e8eef5;
    }
    .actions { display:flex; flex-wrap:wrap; gap:.55rem; margin-top:.55rem; }
    .btn {
      display:inline-flex; align-items:center; justify-content:center;
      padding:.65rem .9rem; border-radius:10px; text-decoration:none; font-weight:600; font-size:.9rem;
    }
    .btn.primary { background:#145a96; color:#fff; }
    .btn.ghost { background:#fff; color:#1e293b; border:1px solid #cbd5e1; }
    .photos { display:grid; grid-template-columns:1fr 1fr; gap:.55rem; }
    .photos img { width:100%; aspect-ratio:1; object-fit:cover; border-radius:12px; border:1px solid #e2e8f0; }
    .foot { text-align:center; margin-top:1.1rem; color:#145a96; font-size:.72rem; font-weight:700; letter-spacing:.04em; opacity:.85; }
    @media (max-width:380px) { .grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
  </style>
</head>
<body>
  <main class="shell">
    <header class="brand">
      <img src="/29-jewellery-logo.png" alt="" />
      <div><strong>29 Jewellery</strong><small>Digital QR Card</small></div>
    </header>

    <article class="card">
      <div class="avatar-wrap">
        ${
          profile.avatarUrl
            ? `<img class="avatar" src="${escapeHtml(profile.avatarUrl)}" alt="${escapeHtml(profile.name)}" />`
            : `<div class="avatar fallback" aria-hidden="true">${escapeHtml((profile.name || '?').slice(0, 1).toUpperCase())}</div>`
        }
      </div>
      <h1>${escapeHtml(profile.name || 'Profile')}</h1>
      ${position ? `<p class="role">${escapeHtml(position)}</p>` : ''}
      ${locationHtml}
      <p class="tagline">Proudly serving with 29 Jewellery</p>
      ${orbHtml ? `<div class="orbs">${orbHtml}</div>` : ''}
      ${socialHtml ? `<div class="social">${socialHtml}</div>` : ''}
      ${gridHtml ? `<div class="grid">${gridHtml}</div>` : ''}
    </article>

    ${
      hasShop
        ? `<section class="panel" id="shop">
            <div class="panel-head">
              <img src="/29-jewellery-logo.png" alt="" />
              <div>
                <h2>Shop locations</h2>
                <p>${escapeHtml(profile.shopName || '29 Jewellery')}</p>
              </div>
            </div>
            ${branchHtml}
          </section>`
        : ''
    }

    ${photosHtml}
    <p class="foot">29 Jewellery QR System</p>
  </main>
  ${leafletBoot}
</body>
</html>`;
}

module.exports = { renderScanHtml };
