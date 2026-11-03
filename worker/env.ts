/* Settings the API receives. Locally they come from .dev.vars and wrangler.jsonc vars;
 * on Vercel from the project's Environment Variables. */
export interface Bindings {
  /** Static files, only present in the local Cloudflare dev server. Vercel serves them itself. */
  ASSETS?: { fetch(req: Request): Promise<Response> };
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
