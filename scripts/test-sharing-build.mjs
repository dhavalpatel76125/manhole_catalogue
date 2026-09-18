import { build } from 'vite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
import sharp from 'sharp'

// Build into an isolated test directory; never ship this test domain.
process.env.VITE_SITE_URL = 'https://catalogue.fibro.test'
await build({ build: { outDir: 'test-results/share-build' } })
const html = readFileSync('test-results/share-build/index.html', 'utf8')
assert.ok(html.includes('property="og:title" content="FIBRO INNOVATION SYSTEM | Product Catalogue"'))
assert.ok(html.includes('property="og:image" content="https://catalogue.fibro.test/fibro-catalogue-share-v3.jpg"'))
assert.ok(html.includes('rel="canonical" href="https://catalogue.fibro.test/"'))
assert.ok(html.includes('name="twitter:image" content="https://catalogue.fibro.test/fibro-catalogue-share-v3.jpg"'))
const image = readFileSync('public/fibro-catalogue-share-v3.jpg')
const metadata = await sharp(image).metadata()
assert.ok(readFileSync('test-results/share-build/fibro-catalogue-share-v3.jpg').equals(image))
assert.equal(metadata.format, 'jpeg')
assert.equal(metadata.space, 'srgb')
assert.equal(metadata.isProgressive, false)
assert.deepEqual([metadata.width, metadata.height], [1200, 630])
assert.ok(image.length < 150_000, 'Keep the preview image lightweight for messaging clients.')
assert.ok(html.includes('property="og:image:type" content="image/jpeg"'))
assert.ok(html.includes(`property="og:image:width" content="${metadata.width}"`))
assert.ok(html.includes(`property="og:image:height" content="${metadata.height}"`))
assert.ok(!/YORVIS|LED Lighting/i.test(html))
assert.ok(!readFileSync('dist/index.html', 'utf8').includes('fibro.test'))
console.log('PASS: absolute sharing URLs and canonical metadata are in static HTML; image is included unchanged; release contains no test domain.')
