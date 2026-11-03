/* Everything read from Loyverse: the menu the UI shows, and the store + payment type receipts are written with. */
import type { Bindings } from './env.js';
import type { Menu, MenuCategory, MenuItem, MenuModifier } from '../shared/types.js';
import { lv, lvAll, type LvCategory, type LvItem, type LvMerchant, type LvModifier, type LvPaymentType, type LvStore } from './loyverse.js';

const MENU_TTL_MS = 5 * 60 * 1000;
const CONTEXT_TTL_MS = 30 * 60 * 1000;
let menuCache: { at: number; menu: Menu } | null = null; // per instance; plenty for one restaurant
let contextCache: { at: number; ctx: LoyverseContext } | null = null;
/* Guests who arrive while a fetch is running wait for it instead of starting their own Loyverse calls. */
let menuLoading: Promise<Menu> | null = null;
let contextLoading: Promise<LoyverseContext> | null = null;
/* Cloudflare Cache API, only there in the local dev server; on Vercel the memory cache above is used. Not a real URL. */
const SHARED_MENU_KEY = 'https://menu.cache.internal/v2';

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
      'LOYVERSE_TOKEN belum diatur. Buat token di Back Office > Integrations > Access tokens, isi LOYVERSE_TOKEN=... di .dev.vars (lokal) atau di Environment Variables proyek Vercel (deploy).',
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
  contextLoading ??= loadContext(env).finally(() => { contextLoading = null; });
  return contextLoading;
}

async function loadContext(env: Bindings): Promise<LoyverseContext> {
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
        ? `Tidak ada toko Loyverse dengan id ${env.LOYVERSE_STORE_ID}. Toko yang ada: ${liveStores.map((s) => `${s.name} (${s.id})`).join(', ') || 'tidak ada'}.`
        : 'Akun Loyverse belum memiliki toko. Buat toko di Back Office > Settings > Stores.',
    );
  }
  const wanted = (env.LOYVERSE_PAYMENT_TYPE || 'Cash').trim();
  const livePayments = paymentTypes.filter((p) => !p.deleted_at);
  const payment = livePayments.find((p) => p.name.trim().toLowerCase() === wanted.toLowerCase());
  if (!payment) {
    throw new ConfigError(
      'CONFIG',
      `Tidak ada jenis pembayaran Loyverse bernama "${wanted}". Yang tersedia: ${livePayments.map((p) => p.name).join(', ') || 'tidak ada'}. Atur LOYVERSE_PAYMENT_TYPE (Environment Variables di Vercel, wrangler.jsonc untuk lokal) ke salah satunya.`,
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

const defaultDecimals = (currency: string) => (['IDR', 'JPY', 'KRW', 'VND'].includes(currency) ? 0 : 2);

/* Memory, then the location's shared cache, then Loyverse. Table count and name come from env on every
 * call, so a changed TABLE_COUNT applies at once instead of after the cached menu expires. */
export async function getMenu(env: Bindings): Promise<Menu> {
  let menu: Menu;
  if (menuCache && Date.now() - menuCache.at < MENU_TTL_MS) menu = menuCache.menu;
  else {
    menuLoading ??= loadMenu(env).finally(() => { menuLoading = null; });
    menu = await menuLoading;
  }
  return { ...menu, restaurant: { ...menu.restaurant, tables: tableCount(env), name: env.RESTAURANT_NAME || menu.restaurant.name } };
}

async function loadMenu(env: Bindings): Promise<Menu> {
  const shared = await readSharedMenu();
  if (shared && Date.now() - shared.at < MENU_TTL_MS) {
    menuCache = shared;
    return shared.menu;
  }
  const entry = { at: Date.now(), menu: await fromLoyverse(env) };
  menuCache = entry;
  await writeSharedMenu(entry);
  return entry.menu;
}

/* The Cache API is a speed-up only: when it is missing or fails, memory and Loyverse are used. */
type SharedCache = { match(key: string): Promise<Response | undefined>; put(key: string, res: Response): Promise<void> };
const sharedCache = () => (globalThis as { caches?: { default?: SharedCache } }).caches?.default;

async function readSharedMenu(): Promise<{ at: number; menu: Menu } | null> {
  try {
    const res = await sharedCache()?.match(SHARED_MENU_KEY);
    return res ? ((await res.json()) as { at: number; menu: Menu }) : null;
  } catch {
    return null;
  }
}

async function writeSharedMenu(entry: { at: number; menu: Menu }): Promise<void> {
  try {
    const maxAge = Math.max(1, Math.floor((entry.at + MENU_TTL_MS - Date.now()) / 1000));
    const res = new Response(JSON.stringify(entry), { headers: { 'content-type': 'application/json', 'cache-control': `max-age=${maxAge}` } });
    await sharedCache()?.put(SHARED_MENU_KEY, res);
  } catch {
    /* not cached; the next isolate fetches from Loyverse */
  }
}

/* Loyverse lists categories newest first, which puts desserts before mains. Put the configured names
 * first, then the rest by creation time (usually the order the restaurant added them), then by name. */
function orderCategories(cats: LvCategory[], configured?: string): LvCategory[] {
  const pinned = (configured || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const rank = (c: LvCategory) => { const i = pinned.indexOf(c.name.trim().toLowerCase()); return i === -1 ? pinned.length : i; };
  return cats.slice().sort((a, b) => rank(a) - rank(b) || (a.created_at || '').localeCompare(b.created_at || '') || a.name.localeCompare(b.name));
}

/* Modifiers that are live in the store, with their live options in Loyverse order. */
function storeModifiers(modifiers: LvModifier[], storeId: string): Map<string, MenuModifier & { position: number }> {
  const out = new Map<string, MenuModifier & { position: number }>();
  for (const m of modifiers) {
    if (m.deleted_at || (m.stores?.length && !m.stores.includes(storeId))) continue;
    const options = (m.modifier_options ?? [])
      .filter((o) => !o.deleted_at)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((o) => ({ id: o.id, name: o.name, price: o.price ?? 0 }));
    if (options.length) out.set(m.id, { id: m.id, name: m.name, options, position: m.position ?? 0 });
  }
  return out;
}

function itemModifiers(it: LvItem, modifierById: Map<string, MenuModifier & { position: number }>): MenuModifier[] | undefined {
  const mods = (it.modifier_ids ?? []).flatMap((id) => modifierById.get(id) ?? []).sort((a, b) => a.position - b.position);
  return mods.length ? mods.map(({ position: _, ...m }) => m) : undefined;
}

/* Loyverse → menu:
 *   categories  = every non-deleted category that has at least one sellable item, in Loyverse order
 *   products    = every variant of every non-deleted item that is available for sale in the store
 *                 and has a fixed price there (variable-price items cannot be self-ordered)
 *   item id     = the variant id, which is what a receipt line refers to
 *   modifiers   = the item's modifiers that are live in the store; the guest picks one option of each */
async function fromLoyverse(env: Bindings): Promise<Menu> {
  const token = requireToken(env);
  /* One round trip: the store context is fetched alongside the menu data, not before it. */
  const [{ storeId }, merchant, categories, items, modifiers] = await Promise.all([
    getLoyverseContext(env),
    lv<LvMerchant>(token, 'merchant'),
    lvAll<LvCategory>(token, 'categories', 'categories'),
    lvAll<LvItem>(token, 'items', 'items'),
    lvAll<LvModifier>(token, 'modifiers', 'modifiers'),
  ]);
  const modifierById = storeModifiers(modifiers, storeId);

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
        modifiers: itemModifiers(it, modifierById),
      });
    }
  }

  const used = new Set(menuItems.map((i) => i.categoryId));
  const cats: MenuCategory[] = liveCats.filter((c) => used.has(c.id)).map((c) => ({ id: c.id, name: c.name }));
  if (used.has(OTHER)) cats.push({ id: OTHER, name: 'Lainnya' });
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
      locale: 'id-ID', // the whole app is in Bahasa Indonesia
      tables: tableCount(env),
    },
    categories: cats,
    items: menuItems,
    skipped,
  };
}
