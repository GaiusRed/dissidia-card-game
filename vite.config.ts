import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: { strictPort: true },
  plugins: [VitePWA({
    registerType: 'prompt',
    includeAssets: ['icons/icon.svg'],
    manifest: {
      name: 'Dissidia Card Game Playtest', short_name: 'Dissidia', start_url: '/', scope: '/',
      display: 'standalone', background_color: '#f7f5ef', theme_color: '#f7f5ef',
      icons: [{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,json,svg}'],
      maximumFileSizeToCacheInBytes: 3_000_000,
      clientsClaim: false, skipWaiting: false,
    },
  })],
});
