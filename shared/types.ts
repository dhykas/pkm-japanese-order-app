/* Types shared by the Worker (API) and the React UI. */

export interface MenuCategory {
  id: string;
  name: string;
}

export interface MenuItem {
  /** Loyverse variant_id: what a receipt line refers to. */
  id: string;
  /** Loyverse item id (one item can have several variants). */
  itemId: string;
  name: string;
  categoryId: string;
  price: number;
  imageUrl: string | null;
  color: string | null;
  sku: string | null;
  description?: string;
}

export interface Menu {
  fetchedAt: number;
  restaurant: { name: string; currency: string; decimals: number; locale: string; tables: number };
  /** In Loyverse order. Items are sorted by this order, then by name. */
  categories: MenuCategory[];
  items: MenuItem[];
  /** Loyverse products left out and why; explains an empty menu. */
  skipped: { variablePrice: number; notForSale: number; noPrice: number };
}

export interface OrderLine {
  id: string;
  itemId: string;
  name: string;
  categoryId: string;
  price: number;
  qty: number;
}

export interface NewOrderInput {
  table: number;
  customerName: string;
  items: { id: string; qty: number }[];
  note?: string;
  /** Random id made by the browser, so a retried request returns the same receipt instead of a second one. */
  clientOrderId?: string;
}

/** What the guest gets back: the Loyverse receipt that was created. */
export interface PlacedOrder {
  receiptNumber: string;
  reference: string;
  table: number;
  customerName: string;
  note: string;
  items: OrderLine[];
  total: number;
  createdAt: number;
}

export interface ApiError {
  error: string;
  code?: string;
}
