import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Ruang Tenang E-Tiket',
        short_name: 'Ruang Tenang',
        description: 'Sistem manajemen pendaftaran event dan pemindaian e-tiket otomatis',
        theme_color: '#020617',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'logo_ruang_tenang.jpg-removebg-preview.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo_ruang_tenang.jpg-removebg-preview.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
})
