import { readdir, readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
const assets = await readdir(resolve(root, 'assets'))
for (const file of assets.filter(p => p.endsWith('.js'))) {
  const code = await readFile(resolve(root, 'assets', file), 'utf8')
  for (const forbidden of ['yorvis-local-editor', 'Replace local draft?', 'Preparing export', 'demoProducts', 'sample-0.webp']) {
    if (code.includes(forbidden)) throw new Error(`Release contains development-only code: ${forbidden}`)
  }
}
console.log('Release verified: no local editor or sample-product code.')
