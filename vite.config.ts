import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

/* Dev: one server for everything. Vite serves the React app and the Cloudflare plugin runs the API
 * (worker/index.ts) with the .dev.vars secrets. Build: only the static app, into dist/ for Vercel,
 * which runs the same API from api/[...route].ts. */
export default defineConfig(({ command }) => ({
  plugins: [react(), command === 'serve' && cloudflare()],
}));
