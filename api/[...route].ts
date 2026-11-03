/* Vercel entry: every /api/* request runs the same Hono app the local dev server uses.
 * Settings come from the project's Environment Variables (Vercel dashboard or `vercel env add`). */
import app from '../worker/index.js';
import type { Bindings } from '../worker/env.js';

declare const process: { env: Record<string, string | undefined> };

const handle = (req: Request) => app.fetch(req, process.env as Bindings);
export const GET = handle;
export const POST = handle;
