import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cloudflare } from '@cloudflare/vite-plugin';

/* One dev server for everything: Vite serves the React app, the Cloudflare plugin
 * runs worker/index.ts in workerd with the D1 binding and .dev.vars secrets. */
export default defineConfig({
  plugins: [react(), cloudflare()],
});
