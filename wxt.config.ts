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
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      96: 'icon/96.png',
      128: 'icon/128.png',
    },
    action: {
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        128: 'icon/128.png',
      },
      default_title: 'MoxList',
      default_popup: 'popup.html',
    },
  },
});
