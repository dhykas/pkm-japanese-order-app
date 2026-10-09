/* Thin Loyverse REST client.
 * Base URL https://api.loyverse.com/v1.0/, Bearer token, limit of 300 requests per 300 s. */
const BASE = 'https://api.loyverse.com/v1.0/';

export class LoyverseError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'LoyverseError';
    this.status = status;
  }
}

type Params = Record<string, string | number | undefined>;

const headers = (token: string) => ({ Authorization: `Bearer ${token}`, Accept: 'application/json' });

async function fail(res: Response): Promise<never> {
  let msg = `${res.status} ${res.statusText}`;
  try {
    const body = (await res.json()) as { errors?: { code: string; details: string; field?: string }[] };
    if (body.errors?.length) msg = body.errors.map((e) => `${e.code}${e.field ? ` (${e.field})` : ''}: ${e.details}`).join('; ');
  } catch {
    /* body was not JSON */
  }
  throw new LoyverseError(res.status, msg);
}

export async function lv<T>(token: string, path: string, params?: Params): Promise<T> {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
  let res = await fetch(url, { headers: headers(token) });
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 1500));
    res = await fetch(url, { headers: headers(token) });
  }
  if (!res.ok) await fail(res);
  return (await res.json()) as T;
}

export async function lvPost<T>(token: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await fail(res);
  return (await res.json()) as T;
}

/** Follow Loyverse cursor pagination and return every record of a list endpoint. */
export async function lvAll<T>(token: string, path: string, listKey: string, params?: Params): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const data = await lv<Record<string, unknown>>(token, path, { limit: 250, ...params, cursor });
    out.push(...((data[listKey] as T[] | undefined) ?? []));
    cursor = typeof data.cursor === 'string' ? data.cursor : undefined;
    pages += 1;
  } while (cursor && pages < 40);
  return out;
}

/* Only the fields this app reads or writes. */
export interface LvMerchant {
  id: string;
  business_name: string;
  /** Seen both as a plain code and as an object. */
  currency?: string | { code?: string; decimal_places?: number };
  country?: string;
}
export interface LvStore { id: string; name: string; deleted_at?: string | null }
export interface LvCategory { id: string; name: string; color?: string; created_at?: string; deleted_at?: string | null }
export interface LvPaymentType { id: string; name: string; type?: string; deleted_at?: string | null }
export interface LvVariantStore { store_id: string; pricing_type: 'FIXED' | 'VARIABLE'; price: number | null; available_for_sale: boolean }
export interface LvVariant {
  variant_id: string;
  item_id: string;
  sku?: string | null;
  option1_value?: string | null;
  option2_value?: string | null;
  option3_value?: string | null;
  default_pricing_type: 'FIXED' | 'VARIABLE';
  default_price: number | null;
  stores?: LvVariantStore[];
}
export interface LvItem {
  id: string;
  item_name: string;
  description?: string | null;
  category_id?: string | null;
  image_url?: string | null;
  color?: string | null;
  deleted_at?: string | null;
  variants?: LvVariant[];
}
export interface LvReceipt {
  receipt_number: string;
  total_money?: number;
  created_at?: string;
  order?: string | null;
  note?: string | null;
}
