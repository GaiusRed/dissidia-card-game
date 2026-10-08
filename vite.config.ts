import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { randomUUID } from 'node:crypto';

const buildId = process.env.DISSIDIA_BUILD_ID ?? randomUUID();

export default defineConfig({
  define: { __DISSIDIA_BUILD_ID__: JSON.stringify(buildId) },
  server: { strictPort: true },
  build: { outDir: process.env.DISSIDIA_OUT_DIR ?? 'dist', emptyOutDir: true },
  plugins: [VitePWA({
    strategies: 'injectManifest',
    srcDir: 'src/pwa',
    filename: 'sw.ts',
    registerType: 'prompt',
    includeAssets: ['icons/icon.svg'],
    manifest: {
      name: 'Dissidia Card Game Playtest', short_name: 'Dissidia', start_url: '/', scope: '/',
      display: 'standalone', background_color: '#f7f5ef', theme_color: '#f7f5ef',
      icons: [{ src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
    },
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,json,svg}'],
      maximumFileSizeToCacheInBytes: 3_000_000,
    },
  })],
});
