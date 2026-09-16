import type { Product, ProductInput } from '../src/types.js'

export function validateProduct(input: ProductInput): ProductInput {
  if (!input || typeof input.title !== 'string' || !(input.product_code === null || typeof input.product_code === 'string') || typeof input.is_active !== 'boolean') throw new Error('Invalid product fields.')
  const title = input.title.trim()
  const product_code = input.product_code?.trim() || null
  if (title.length < 2 || title.length > 160 || /[\u0000-\u001f<>]/.test(title)) throw new Error('Enter a title of 2–160 characters without markup or control characters.')
  if (product_code && (product_code.length > 80 || /[\u0000-\u001f<>]/.test(product_code))) throw new Error('Product code must be 80 characters or fewer without markup or control characters.')
  if (input.price !== null && (typeof input.price !== 'number' || !Number.isFinite(input.price) || input.price < 0 || input.price > 999999999.99)) throw new Error('Enter a valid price between 0 and 999,999,999.99 or leave it blank.')
  return { title, product_code, is_active: input.is_active, price: input.price === null ? null : Math.round(input.price * 100) / 100 }
}

export function parseCatalogue(value: unknown): Product[] {
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('products' in value) || !Array.isArray(value.products)) throw new Error('Invalid catalogue. Expected version 1 with a products array.')
  if (value.products.length > 10000) throw new Error('A catalogue may contain up to 10,000 products.')
  const ids = new Set<string>()
  return value.products.map((row: unknown, index: number) => {
    if (!row || typeof row !== 'object') throw new Error(`Product ${index + 1} is invalid.`)
    const p = row as Product
    if (typeof p.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(p.id) || ids.has(p.id)) throw new Error(`Product ${index + 1} has an invalid or duplicate ID.`)
    ids.add(p.id)
    const clean = validateProduct(p)
    if (typeof p.image_path !== 'string' || !/^[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg)$/.test(p.image_path) || ![`/catalogue/images/${p.image_path}`, `/api/catalogue?action=image&name=${p.image_path}`].includes(p.image_url)) throw new Error(`Product ${index + 1} must use a catalogue image.`)
    if (!Number.isSafeInteger(p.display_order) || p.display_order < 0 || typeof p.created_at !== 'string' || typeof p.updated_at !== 'string' || !Number.isFinite(Date.parse(p.created_at)) || !Number.isFinite(Date.parse(p.updated_at))) throw new Error(`Product ${index + 1} has invalid order or timestamps.`)
    return { id: p.id, ...clean, image_url: p.image_url, image_path: p.image_path, display_order: p.display_order, created_at: p.created_at, updated_at: p.updated_at }
  }).sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id))
}
