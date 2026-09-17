import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'
import sharp from 'sharp'
import { fileURLToPath } from 'node:url'
import { sharingTags, SHARE_IMAGE_PATH } from './src/lib/socialMetadata'

export default defineConfig(async ({ mode, command }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const image = await sharp(fileURLToPath(new URL(`./public${SHARE_IMAGE_PATH}`, import.meta.url))).metadata()
  if (!image.width || !image.height || image.format !== 'jpeg') throw new Error('The sharing image must be a valid JPEG.')
  const sharing = sharingTags(env.VITE_SITE_URL || 'https://manhole-catalogue.vercel.app', { width: image.width, height: image.height })
  if (command === 'build' && !sharing.origin) {
    console.warn('Link-preview image is ready. Set VITE_SITE_URL to the final HTTPS domain and rebuild to enable image previews on shared links.')
  }
  return {
    plugins: [react(), tailwindcss(), {
      name: 'fibro-social-metadata',
      transformIndexHtml() {
        return [...sharing.tags, ...(sharing.origin ? [{ tag: 'link', attrs: { rel: 'canonical', href: sharing.origin }, injectTo: 'head' as const }] : [])]
      },
    }],
    test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}', 'server/**/*.test.ts'] },
  }
})
