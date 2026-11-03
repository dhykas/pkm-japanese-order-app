/* Money and time formatting. Currency and locale come from the menu response. */
let fmt: Intl.NumberFormat | null = null;

export function configureMoney(currency: string, locale: string, decimals: number) {
  try {
    fmt = new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  } catch {
    fmt = new Intl.NumberFormat(locale);
  }
}
export const money = (n: number) => (fmt ? fmt.format(n) : String(n));

export const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

export function timeAgo(ts: number) {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return 'baru saja';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.round(h / 24)} hari lalu`;
}
