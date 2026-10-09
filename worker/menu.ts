/* Everything read from Loyverse: the menu the UI shows, and the store + payment type receipts are written with. */
import type { Bindings } from './env';
import type { Menu, MenuCategory, MenuItem } from '../shared/types';
import { lv, lvAll, type LvCategory, type LvItem, type LvMerchant, type LvPaymentType, type LvStore } from './loyverse';

const MENU_TTL_MS = 5 * 60 * 1000;
const CONTEXT_TTL_MS = 30 * 60 * 1000;
let menuCache: { at: number; menu: Menu } | null = null; // per isolate; plenty for one restaurant
let contextCache: { at: number; ctx: LoyverseContext } | null = null;

/** Thrown when the app is not configured yet; the UI turns NO_TOKEN into a setup screen. */
export class ConfigError extends Error {
  code: 'NO_TOKEN' | 'CONFIG';
  constructor(code: 'NO_TOKEN' | 'CONFIG', message: string) {
    super(message);
    this.name = 'ConfigError';
    this.code = code;
  }
}

/* The example file ships with a placeholder; treat it the same as no token at all. */
const PLACEHOLDER = /paste-your|^\s*$|^<.*>$/i;
export function requireToken(env: Bindings): string {
  const t = env.LOYVERSE_TOKEN;
  if (!t || PLACEHOLDER.test(t)) {
    throw new ConfigError(
      'NO_TOKEN',
      'LOYVERSE_TOKEN is not set. Create a token in Back Office > Integrations > Access tokens, put LOYVERSE_TOKEN=... in .dev.vars (local) or run "wrangler secret put LOYVERSE_TOKEN" (deployed).',
    );
  }
  return t;
}

export interface LoyverseContext {
  storeId: string;
  storeName: string;
  paymentTypeId: string;
  paymentTypeName: string;
}

/** The store prices come from and the payment type written on receipts. */
export async function getLoyverseContext(env: Bindings): Promise<LoyverseContext> {
  if (contextCache && Date.now() - contextCache.at < CONTEXT_TTL_MS) return contextCache.ctx;
  const token = requireToken(env);
  const [stores, paymentTypes] = await Promise.all([
    lvAll<LvStore>(token, 'stores', 'stores'),
    lvAll<LvPaymentType>(token, 'payment_types', 'payment_types'),
  ]);
  const liveStores = stores.filter((s) => !s.deleted_at);
  const store = env.LOYVERSE_STORE_ID ? liveStores.find((s) => s.id === env.LOYVERSE_STORE_ID) : liveStores[0];
  if (!store) {
    throw new ConfigError(
      'CONFIG',
      env.LOYVERSE_STORE_ID
        ? `No Loyverse store with id ${env.LOYVERSE_STORE_ID}. Stores: ${liveStores.map((s) => `${s.name} (${s.id})`).join(', ') || 'none'}.`
        : 'The Loyverse account has no store. Create one in Back Office > Settings > Stores.',
    );
  }
  const wanted = (env.LOYVERSE_PAYMENT_TYPE || 'Cash').trim();
  const livePayments = paymentTypes.filter((p) => !p.deleted_at);
  const payment = livePayments.find((p) => p.name.trim().toLowerCase() === wanted.toLowerCase());
  if (!payment) {
    throw new ConfigError(
      'CONFIG',
      `No Loyverse payment type named "${wanted}". Available: ${livePayments.map((p) => p.name).join(', ') || 'none'}. Set LOYVERSE_PAYMENT_TYPE in wrangler.jsonc to one of them.`,
    );
  }
  const ctx = { storeId: store.id, storeName: store.name, paymentTypeId: payment.id, paymentTypeName: payment.name };
  contextCache = { at: Date.now(), ctx };
  return ctx;
}

function tableCount(env: Bindings): number {
  const n = parseInt(env.TABLE_COUNT || '', 10);
  return Number.isInteger(n) && n > 0 ? n : 8;
}

const LOCALES: Record<string, string> = {
  IDR: 'id-ID', JPY: 'ja-JP', MYR: 'ms-MY', SGD: 'en-SG', THB: 'th-TH', PHP: 'en-PH', VND: 'vi-VN', EUR: 'de-DE', GBP: 'en-GB', AUD: 'en-AU',
};
const localeFor = (currency: string) => LOCALES[currency] || 'en-US';
const defaultDecimals = (currency: string) => (['IDR', 'JPY', 'KRW', 'VND'].includes(currency) ? 0 : 2);

export async function getMenu(env: Bindings, refresh = false): Promise<Menu> {
  if (!refresh && menuCache && Date.now() - menuCache.at < MENU_TTL_MS) return menuCache.menu;
  const menu = await fromLoyverse(env);
  menuCache = { at: Date.now(), menu };
  return menu;
}

/* Loyverse lists categories newest first, which puts desserts before mains. Put the configured names
 * first, then the rest by creation time (usually the order the restaurant added them), then by name. */
function orderCategories(cats: LvCategory[], configured?: string): LvCategory[] {
  const pinned = (configured || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const rank = (c: LvCategory) => { const i = pinned.indexOf(c.name.trim().toLowerCase()); return i === -1 ? pinned.length : i; };
  return cats.slice().sort((a, b) => rank(a) - rank(b) || (a.created_at || '').localeCompare(b.created_at || '') || a.name.localeCompare(b.name));
}

/* Loyverse → menu:
 *   categories  = every non-deleted category that has at least one sellable item, in Loyverse order
 *   products    = every variant of every non-deleted item that is available for sale in the store
 *                 and has a fixed price there (variable-price items cannot be self-ordered)
 *   item id     = the variant id, which is what a receipt line refers to */
async function fromLoyverse(env: Bindings): Promise<Menu> {
  const token = requireToken(env);
  const { storeId } = await getLoyverseContext(env);
  const [merchant, categories, items] = await Promise.all([
    lv<LvMerchant>(token, 'merchant'),
    lvAll<LvCategory>(token, 'categories', 'categories'),
    lvAll<LvItem>(token, 'items', 'items'),
  ]);

  const liveCats = orderCategories(categories.filter((c) => !c.deleted_at), env.CATEGORY_ORDER);
  const catIds = new Set(liveCats.map((c) => c.id));
  const OTHER = 'other';

  const menuItems: MenuItem[] = [];
  const skipped = { variablePrice: 0, notForSale: 0, noPrice: 0 };
  for (const it of items) {
    if (it.deleted_at) continue;
    for (const v of it.variants ?? []) {
      const s = (v.stores ?? []).find((x) => x.store_id === storeId);
      if (s && s.available_for_sale === false) { skipped.notForSale += 1; continue; }
      if ((s?.pricing_type ?? v.default_pricing_type) === 'VARIABLE') { skipped.variablePrice += 1; continue; }
      const price = s?.price ?? v.default_price;
      if (price == null) { skipped.noPrice += 1; continue; }
      const opts = [v.option1_value, v.option2_value, v.option3_value].filter(Boolean).join(' / ');
      menuItems.push({
        id: v.variant_id,
        itemId: it.id,
        name: opts ? `${it.item_name} – ${opts}` : it.item_name,
        categoryId: it.category_id && catIds.has(it.category_id) ? it.category_id : OTHER,
        price,
        imageUrl: it.image_url || null,
        color: it.color || null,
        sku: v.sku || null,
        description: it.description?.trim() || undefined,
      });
    }
  }

  const used = new Set(menuItems.map((i) => i.categoryId));
  const cats: MenuCategory[] = liveCats.filter((c) => used.has(c.id)).map((c) => ({ id: c.id, name: c.name }));
  if (used.has(OTHER)) cats.push({ id: OTHER, name: 'Other' });
  const rank = new Map(cats.map((c, i) => [c.id, i]));
  menuItems.sort((a, b) => (rank.get(a.categoryId) ?? 0) - (rank.get(b.categoryId) ?? 0) || a.name.localeCompare(b.name));

  const cur = merchant.currency;
  const currency = (typeof cur === 'string' ? cur : cur?.code) || 'IDR';
  const decimals = typeof cur === 'object' && cur && typeof cur.decimal_places === 'number' ? cur.decimal_places : defaultDecimals(currency);
  return {
    fetchedAt: Date.now(),
    restaurant: {
      name: env.RESTAURANT_NAME || merchant.business_name || 'Restaurant',
      currency,
      decimals,
      locale: localeFor(currency),
      tables: tableCount(env),
    },
    categories: cats,
    items: menuItems,
    skipped,
  };
}
