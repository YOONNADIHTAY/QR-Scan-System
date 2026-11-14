function Svg({ children, fill = 'none', stroke = 'currentColor', strokeWidth = 1.75, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconGenerate(props) {
  return (
    <Svg {...props}>
      <path d="M5 7h14" />
      <path d="M5 12h9" />
      <path d="M5 17h12" />
      <path d="M17.5 10.5v5" />
      <path d="M15 13h5" />
    </Svg>
  );
}

export function IconQrCodes(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <path d="M14 14.5h3.5v3.5" />
      <path d="M20.5 14.5v3.5H17" />
      <path d="M14 20.5h2" />
      <path d="M18.5 20.5H20.5" />
    </Svg>
  );
}

export function IconSearch(props) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-3.2-3.2" />
    </Svg>
  );
}

export function IconPlus(props) {
  return (
    <Svg {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  );
}

export function IconFolder(props) {
  return (
    <Svg {...props}>
      <path d="M3.5 8.5A2 2 0 0 1 5.5 6.5h3.2l1.6 1.6H18.5a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
    </Svg>
  );
}

export function IconDetail(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </Svg>
  );
}

export function IconMore(props) {
  return (
    <Svg fill="currentColor" stroke="none" {...props}>
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </Svg>
  );
}

export function IconEdit(props) {
  return (
    <Svg {...props}>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <path d="M13.5 5.5l3 3" />
    </Svg>
  );
}

export function IconTrash(props) {
  return (
    <Svg {...props}>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7" />
      <path d="M7 7l.8 12.2A1.5 1.5 0 0 0 9.3 20.5h5.4a1.5 1.5 0 0 0 1.5-1.3L17 7" />
      <path d="M10 11v5.5" />
      <path d="M14 11v5.5" />
    </Svg>
  );
}

export function IconExternal(props) {
  return (
    <Svg {...props}>
      <path d="M14 5h5v5" />
      <path d="M10 14L19 5" />
      <path d="M18 13.5V18a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18V7A1.5 1.5 0 0 1 5.5 5.5H10" />
    </Svg>
  );
}

export function IconDownload(props) {
  return (
    <Svg {...props}>
      <path d="M12 4v10" />
      <path d="M8 10.5L12 14.5l4-4" />
      <path d="M5 19h14" />
    </Svg>
  );
}

export function IconSave(props) {
  return (
    <Svg {...props}>
      <path d="M5.5 4.5h10.2L18.5 7.3V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4.5 19V6A1.5 1.5 0 0 1 6 4.5z" />
      <path d="M8 4.5v4.2h6.5V4.5" />
      <path d="M8.5 14.5h7" />
    </Svg>
  );
}

export function IconFilter(props) {
  return (
    <Svg {...props}>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </Svg>
  );
}

export function IconBranches(props) {
  return (
    <Svg {...props}>
      <circle cx="6" cy="6" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="12" cy="18" r="2" />
      <path d="M8 6h8" />
      <path d="M6 8v2.5a4 4 0 0 0 4 4H12" />
      <path d="M18 8v2.5a4 4 0 0 1-4 4H12" />
    </Svg>
  );
}

export function IconFacebook(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.6c0-.9.3-1.6 1.6-1.6H17V4.1C16.6 4 15.6 4 14.5 4 12 4 10.3 5.5 10.3 8.3v2.3H7.5v3.2h2.8V22h3.2z" />
    </svg>
  );
}

export function IconTikTok(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M19.2 8.4a5.9 5.9 0 0 1-3.7-1.3v7.4a5.8 5.8 0 1 1-5-5.7c.3 0 .6 0 .9.1v2.9a2.9 2.9 0 1 0 2.1 2.8V3.8h2.8c.1 1.1.6 2.2 1.4 3 .8.7 1.8 1.2 2.9 1.4v2.2z" />
    </svg>
  );
}

export function IconYouTube(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12.1c0-1.6-.1-3.1-.4-3.7a2.9 2.9 0 0 0-2-2C18 6 12 6 12 6s-6 0-7.6.4a2.9 2.9 0 0 0-2 2C2.1 9 2 10.5 2 12.1s.1 3.1.4 3.7a2.9 2.9 0 0 0 2 2C6 18.2 12 18.2 12 18.2s6 0 7.6-.4a2.9 2.9 0 0 0 2-2c.3-.6.4-2.1.4-3.7zM10 15.1V9.1l5.2 3-5.2 3z" />
    </svg>
  );
}

export function IconPhone(props) {
  return (
    <Svg {...props}>
      <path d="M8.2 4.8l1.7 1.7a1.5 1.5 0 0 1 0 2.1l-.9.9a12.2 12.2 0 0 0 5.5 5.5l.9-.9a1.5 1.5 0 0 1 2.1 0l1.7 1.7a1.5 1.5 0 0 1 0 2.1l-.8.8a3.2 3.2 0 0 1-3.2.8 17.2 17.2 0 0 1-9.8-9.8 3.2 3.2 0 0 1 .8-3.2l.8-.8a1.5 1.5 0 0 1 2.1 0z" />
    </Svg>
  );
}

export function IconMail(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="M4.2 7.2L12 12.4l7.8-5.2" />
    </Svg>
  );
}

export function IconMap(props) {
  return (
    <Svg {...props}>
      <path d="M12 21s6.5-5.4 6.5-10.2A6.5 6.5 0 0 0 12 4.3a6.5 6.5 0 0 0-6.5 6.5C5.5 15.6 12 21 12 21z" />
      <circle cx="12" cy="10.8" r="2.2" />
    </Svg>
  );
}

export function IconPhoto(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M3.8 16.5l4.4-3.6 3 2.4 3.3-3.5 5.7 4.7" />
    </Svg>
  );
}

export function IconUser(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 19.2a6.5 6.5 0 0 1 13 0" />
    </Svg>
  );
}

export function IconIdCard(props) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
      <circle cx="9" cy="11" r="2.2" />
      <path d="M13.2 10h4.3" />
      <path d="M13.2 13.2h3.2" />
    </Svg>
  );
}

export function IconGem(props) {
  return (
    <Svg {...props}>
      <path d="M12 3.5L19.5 10 12 20.5 4.5 10z" />
      <path d="M4.5 10h15" />
      <path d="M9.2 3.8L12 10l2.8-6.2" />
    </Svg>
  );
}

export function IconStore(props) {
  return (
    <Svg {...props}>
      <path d="M4 10.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-8.5" />
      <path d="M3.5 10.5L5.2 5.5h13.6l1.7 5" />
      <path d="M3.5 10.5h3.2a2.2 2.2 0 0 0 4.4 0h1.8a2.2 2.2 0 0 0 4.4 0h3.2" />
    </Svg>
  );
}
