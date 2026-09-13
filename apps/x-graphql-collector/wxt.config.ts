import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'X GraphQL Collector',
    description: 'Research-only observer for X SearchTimeline responses.',
    permissions: ['debugger', 'storage', 'tabs'],
  },
});
