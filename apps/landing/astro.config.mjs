// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwind from '@astrojs/tailwind'

// https://astro.build/config
export default defineConfig({
  site: 'https://tinytime.work',
  trailingSlash: 'never',
  integrations: [tailwind(), sitemap()],
  vite: {
    server: {
      host: true,
    },
  },
})
