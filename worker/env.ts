/* Bindings and variables the Worker receives. Vars live in wrangler.jsonc,
 * secrets in .dev.vars (local) or `wrangler secret put` (deployed). */
export interface Bindings {
  ASSETS: Fetcher;
  /** Secret. Never sent to the browser. */
  LOYVERSE_TOKEN?: string;
  /** Optional: which Loyverse store to sell from. Defaults to the first store. */
  LOYVERSE_STORE_ID?: string;
  /** Name of the Loyverse payment type written on each receipt, e.g. "Cash" or "Pay at cashier". */
  LOYVERSE_PAYMENT_TYPE?: string;
  /** Optional comma-separated category names in the order the menu should show them. Others follow by creation time. */
  CATEGORY_ORDER?: string;
  TABLE_COUNT?: string;
  RESTAURANT_NAME?: string;
}
