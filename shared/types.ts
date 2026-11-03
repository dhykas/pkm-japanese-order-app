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
  /** Loyverse modifiers on the item, e.g. Kuah or Hot / Ice. The guest picks exactly one option of each. */
  modifiers?: MenuModifier[];
}

export interface MenuModifier {
  id: string;
  name: string;
  options: MenuModifierOption[];
}

export interface MenuModifierOption {
  /** Loyverse modifier_option_id, written on the receipt line. */
  id: string;
  name: string;
  /** Added to the item price. */
  price: number;
}

/** A chosen modifier option as it appears on an order line. */
export interface ChosenOption {
  id: string;
  modifier: string;
  name: string;
  price: number;
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
  /** Unit price including the chosen options. */
  price: number;
  qty: number;
  /** Chosen modifier options, in the item's modifier order. Missing on orders placed before options existed. */
  options?: ChosenOption[];
}

export interface NewOrderInput {
  table: number;
  customerName: string;
  /** options: one modifier option id per modifier of the item. */
  items: { id: string; qty: number; options?: string[] }[];
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
