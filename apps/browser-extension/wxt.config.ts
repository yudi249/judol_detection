import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@/components': fileURLToPath(new URL('./src/components', import.meta.url)),
        '@/hooks': fileURLToPath(new URL('./src/hooks', import.meta.url)),
        '@/lib': fileURLToPath(new URL('./src/lib', import.meta.url)),
        '@/shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
        '@/src': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  }),
});
