import { readFile, stat } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const manifest = JSON.parse(await readFile(resolve(root, 'public/catalogue/products.json'), 'utf8'))
if (manifest.version !== 1 || !Array.isArray(manifest.products)) throw new Error('Catalogue must have version 1 and a products array.')
const ids = new Set()
for (const p of manifest.products) {
  if (!p.is_active) throw new Error(`Inactive product "${p.title}" is in public/catalogue. Use Export publish ZIP, not a private backup.`)
  if (typeof p.title !== 'string' || p.title.trim().length < 2 || p.title.length > 160 || /[<>\x00-\x1f]/.test(p.title)) throw new Error('Invalid product title.')
  if (typeof p.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(p.id) || ids.has(p.id)) throw new Error('Invalid or duplicate product ID.')
  ids.add(p.id)
  if (!/^[a-zA-Z0-9_-]+\.(webp|png|jpe?g)$/.test(p.image_path) || p.image_url !== `/catalogue/images/${p.image_path}`) throw new Error(`Unsafe image path for ${p.title}.`)
  if (typeof p.is_active !== 'boolean' || !Number.isSafeInteger(p.display_order) || p.display_order < 0 || !(p.price === null || (typeof p.price === 'number' && Number.isFinite(p.price) && p.price >= 0 && p.price <= 999999999.99))) throw new Error(`Invalid fields for ${p.title}.`)
  if (!(p.product_code === null || (typeof p.product_code === 'string' && p.product_code.length <= 80 && !/[<>\x00-\x1f]/.test(p.product_code)))) throw new Error(`Invalid product code for ${p.title}.`)
  if (typeof p.created_at !== 'string' || typeof p.updated_at !== 'string' || !Number.isFinite(Date.parse(p.created_at)) || !Number.isFinite(Date.parse(p.updated_at))) throw new Error(`Invalid timestamps for ${p.title}.`)
  const image = await stat(resolve(root, 'public/catalogue/images', p.image_path)).catch(() => null)
  if (!image?.isFile() || image.size === 0 || image.size > 5 * 1024 * 1024) throw new Error(`Missing, empty or oversized image for ${p.title}.`)
}
console.log(`Validated ${manifest.products.length} publishable products.`)
