import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service Worker is only generated in production build
      devOptions: { enabled: false },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            // Cache drug list — NetworkFirst (fresh when online, fallback when offline)
            urlPattern: /^\/api\/drugs/,
            handler: 'NetworkFirst',
            options: {
              cacheName:  'api-drugs',
              expiration: { maxEntries: 1, maxAgeSeconds: 86400 },  // 24 h
              networkTimeoutSeconds: 5,
            },
          },
          {
            // Cache customer list
            urlPattern: /^\/api\/customers/,
            handler: 'NetworkFirst',
            options: {
              cacheName:  'api-customers',
              expiration: { maxEntries: 1, maxAgeSeconds: 86400 },
              networkTimeoutSeconds: 5,
            },
          },
        ],
      },
      manifest: {
        name:             'PharmacyPOS',
        short_name:       'PharmPOS',
        description:      'ระบบจัดการร้านยา',
        theme_color:      '#2563eb',
        background_color: '#ffffff',
        display:          'standalone',
        start_url:        '/sell',
        icons: [
          {
            src:   'favicon.svg',
            sizes: 'any',
            type:  'image/svg+xml',
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target:       'http://localhost:8087',
        changeOrigin: true,
      },
    },
  },
})
