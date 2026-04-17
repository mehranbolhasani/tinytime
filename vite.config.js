import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/react-router-dom/')
          ) {
            return 'react'
          }

          if (id.includes('/recharts/')) {
            return 'charts-recharts'
          }

          if (id.includes('/victory-vendor/') || id.includes('/d3-')) {
            return 'charts-d3'
          }

          if (id.includes('/@supabase/supabase-js/')) {
            return 'supabase'
          }

          if (id.includes('/@radix-ui/')) {
            return 'radix'
          }

          return 'vendor'
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
