import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { zipSync } from 'fflate'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const files = {}
async function collect(folder, prefix = '') {
  for (const item of await readdir(folder, { withFileTypes: true })) {
    const name = prefix + item.name
    if (item.isDirectory()) await collect(resolve(folder, item.name), `${name}/`)
    else files[name] = new Uint8Array(await readFile(resolve(folder, item.name)))
  }
}
await collect(resolve(root, 'dist'))
await mkdir(resolve(root, 'release'), { recursive: true })
await writeFile(resolve(root, 'release/yorvis-website.zip'), zipSync(files, { level: 6 }))
console.log('Created release/yorvis-website.zip. Upload its contents as a complete static deployment.')
