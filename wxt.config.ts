import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'MoxList — Wishlist Highlighter for Moxfield',
    description: 'Highlights cards from your Moxfield wishlist with 👑 when browsing decklists',
    version: '1.0.0',
    permissions: ['storage'],
    host_permissions: [
      '*://*.moxfield.com/*',
      '*://api2.moxfield.com/*',
    ],
  },
});
