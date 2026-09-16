import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'
import { readFileSync } from 'node:fs'
import { sharingTags } from './src/lib/socialMetadata'

export default defineConfig(({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const png = readFileSync(new URL('./public/yorvis-share.png', import.meta.url))
  const sharing = sharingTags(env.VITE_SITE_URL, { width: png.readUInt32BE(16), height: png.readUInt32BE(20) })
  if (command === 'build' && !sharing.origin) {
    console.warn('Link-preview image is ready. Set VITE_SITE_URL to the final HTTPS domain and rebuild to enable image previews on shared links.')
  }
  return {
    plugins: [react(), tailwindcss(), {
      name: 'yorvis-social-metadata',
      transformIndexHtml() {
        return [...sharing.tags, ...(sharing.origin ? [{ tag: 'link', attrs: { rel: 'canonical', href: sharing.origin }, injectTo: 'head' as const }] : [])]
      },
    }],
    test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
  }
})
