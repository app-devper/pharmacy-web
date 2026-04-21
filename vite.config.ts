import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  build: {
    // Split heavy third-party libs into their own chunks so the main app
    // bundle stays under the 500 kB warning threshold AND the browser can
    // cache vendor code across app deploys.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('recharts'))                       return 'vendor-charts'
          if (id.includes('xlsx'))                           return 'vendor-xlsx'
          if (id.includes('react-markdown') ||
              id.includes('remark') ||
              id.includes('micromark') ||
              id.includes('mdast'))                          return 'vendor-md'
          if (id.includes('react-router'))                   return 'vendor-router'
          if (id.includes('react-dom') ||
              id.includes('scheduler') ||
              id.includes('/react/'))                        return 'vendor-react'
          return undefined
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service Worker is only generated in production build
      devOptions: { enabled: false },
      workbox: {
        // `md` is included so the user guide loads offline via /help.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,md}'],
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
})
