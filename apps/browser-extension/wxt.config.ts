import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'JudolLens',
    description: 'Deteksi promosi judi online dengan bukti Unicode',
    default_locale: 'id',
    permissions: ['storage', 'contextMenus', 'tabs', 'debugger'],
    host_permissions: [
      'http://localhost/*',
      'http://127.0.0.1/*',
      'http://[::1]/*',
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@/api': fileURLToPath(new URL('./src/api', import.meta.url)),
        '@/components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@/dom': fileURLToPath(new URL('./src/dom', import.meta.url)),
        '@/hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
        '@/lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
        '@/shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
        '@/storage': fileURLToPath(new URL('./src/storage', import.meta.url)),
        '@/src': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }),
});
