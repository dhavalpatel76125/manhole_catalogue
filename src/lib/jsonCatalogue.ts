import type { Product } from '../types'
import { validateProduct } from './catalogue'

export function parseCatalogue(value: unknown): Product[] {
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1 || !('products' in value) || !Array.isArray(value.products)) throw new Error('Invalid catalogue. Expected version 1 with a products array.')
  if (value.products.length > 10000) throw new Error('A catalogue may contain up to 10,000 products.')
  const ids = new Set<string>()
  return value.products.map((row: unknown, index: number) => {
    if (!row || typeof row !== 'object') throw new Error(`Product ${index + 1} is invalid.`)
    const p = row as Product
    if (typeof p.id !== 'string' || !/^[a-f0-9-]{36}$/i.test(p.id) || ids.has(p.id)) throw new Error(`Product ${index + 1} has an invalid or duplicate ID.`)
    ids.add(p.id)
    if (typeof p.title !== 'string' || !(p.product_code === null || typeof p.product_code === 'string') || typeof p.is_active !== 'boolean' || !(p.price === null || typeof p.price === 'number')) throw new Error(`Product ${index + 1} has invalid fields.`)
    const clean = validateProduct(p)
    if (typeof p.image_path !== 'string' || !/^[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg)$/.test(p.image_path) || p.image_url !== `/catalogue/images/${p.image_path}`) throw new Error(`Product ${index + 1} must use a local catalogue image.`)
    if (!Number.isSafeInteger(p.display_order) || p.display_order < 0 || typeof p.created_at !== 'string' || typeof p.updated_at !== 'string' || !Number.isFinite(Date.parse(p.created_at)) || !Number.isFinite(Date.parse(p.updated_at))) throw new Error(`Product ${index + 1} has invalid order or timestamps.`)
    return { id: p.id, ...clean, image_url: p.image_url, image_path: p.image_path, display_order: p.display_order, created_at: p.created_at, updated_at: p.updated_at }
  }).sort((a, b) => a.display_order - b.display_order || a.id.localeCompare(b.id))
}
export async function readPublishedProducts(signal?: AbortSignal) {
  const response = await fetch('/catalogue/products.json', { cache: 'no-store', signal })
  if (!response.ok) throw new Error('The catalogue could not be loaded. Please try again.')
  return parseCatalogue(await response.json())
}
