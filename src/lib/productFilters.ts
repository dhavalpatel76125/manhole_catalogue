import type { Product } from '../types'

export function filterKey(value: string | null | undefined) {
  return (value || '').trim().toLowerCase().replace(/×/g, 'x').replace(/\s+/g, '')
}
export function productOptions(products: Product[], field: 'load_capacity' | 'size') {
  const values = new Map<string, string>()
  for (const product of products) {
    const value = product[field]?.trim()
    if (value && !values.has(filterKey(value))) values.set(filterKey(value), value)
  }
  return [...values.values()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
}
export function matchingProducts(products: Product[], search: string, capacity = '', size = '') {
  const query = search.trim().toLowerCase()
  return products.filter(p => p.is_active && (!capacity || filterKey(p.load_capacity) === filterKey(capacity)) && (!size || filterKey(p.size) === filterKey(size)) && `${p.title} ${p.product_code || ''} ${p.load_capacity || ''} ${p.size || ''}`.toLowerCase().includes(query))
}
