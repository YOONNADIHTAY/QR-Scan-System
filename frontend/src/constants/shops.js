/** Shop numbers available across forms and registry filters */
export const SHOP_NOS = Array.from({ length: 16 }, (_, i) => String(i + 1));

export function parseShopNo(shopName) {
  const match = String(shopName || '').match(/(?:Shop|No\.?)\s*(\d+)/i);
  return match ? match[1] : '';
}

export function formatShopLabel(shopNo) {
  const n = String(shopNo || '').trim();
  return n ? `Shop ${n}` : '';
}
