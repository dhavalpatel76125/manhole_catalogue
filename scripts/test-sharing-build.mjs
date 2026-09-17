import { build } from 'vite'
import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

// Build into an isolated test directory; never ship this test domain.
process.env.VITE_SITE_URL = 'https://catalogue.fibro.test'
await build({ build: { outDir: 'test-results/share-build' } })
const html = readFileSync('test-results/share-build/index.html', 'utf8')
assert.ok(html.includes('property="og:title" content="FIBRO INNOVATION SYSTEM | Product Catalogue"'))
assert.ok(html.includes('property="og:image" content="https://catalogue.fibro.test/fibro-catalogue-share-v1.png"'))
assert.ok(html.includes('rel="canonical" href="https://catalogue.fibro.test/"'))
assert.ok(html.includes('name="twitter:image" content="https://catalogue.fibro.test/fibro-catalogue-share-v1.png"'))
const image = readFileSync('public/fibro-catalogue-share-v1.png')
assert.ok(readFileSync('test-results/share-build/fibro-catalogue-share-v1.png').equals(image))
assert.ok(readFileSync('test-results/share-build/yorvis-share.png').equals(image))
assert.ok(html.includes(`property="og:image:width" content="${image.readUInt32BE(16)}"`))
assert.ok(html.includes(`property="og:image:height" content="${image.readUInt32BE(20)}"`))
assert.ok(!/YORVIS|LED Lighting/i.test(html))
assert.ok(!readFileSync('dist/index.html', 'utf8').includes('fibro.test'))
console.log('PASS: absolute sharing URLs and canonical metadata are in static HTML; image is included unchanged; release contains no test domain.')
