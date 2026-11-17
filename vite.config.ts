import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Extra hostnames allowed to reach the dev server are supplied per-run via
 * JENESIS_ALLOWED_HOSTS (comma separated) so no environment hostname is
 * baked into the repository.
 */
const extraHosts = (process.env.JENESIS_ALLOWED_HOSTS ?? '')
  .split(',')
  .map((host) => host.trim())
  .filter(Boolean);

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    strictPort: true,
    allowedHosts: extraHosts,
  },
});
