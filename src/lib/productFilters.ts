import type { Product } from '../types'

export function filterKey(value: string | null | undefined) {
  return (value || '').trim().toLowerCase().replace(/×/g, 'x').replace(/\s+/g, '')
}

// Sort by the numbers as written: 36 x 36, 42 x 42, then 1000 x 1000.
// Units remain labels; unknown sizes follow numeric sizes and ties keep admin order.
function sizeDimensions(value: string | null | undefined): [number, number] | null {
  const match = (value || '').trim().match(/^(?:[ø⌀]\s*)?(\d+(?:\.\d+)?)\s*(?:[x×]\s*(\d+(?:\.\d+)?))?\s*(?:mm|cm|m|in|inch|inches|")?\s*(?:dia(?:meter)?)?$/i)
  if (!match) return null
  const a = Number(match[1])
  const b = Number(match[2] || match[1])
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null
  return [a, b]
}
export function compareSizes(a: string | null | undefined, b: string | null | undefined) {
  const left = sizeDimensions(a)
  const right = sizeDimensions(b)
  if (!left || !right) return left ? -1 : right ? 1 : 0
  return left[0] - right[0] || left[1] - right[1]
}

export function productOptions(products: Product[], field: 'load_capacity' | 'size') {
  const values = new Map<string, string>()
  for (const product of products) {
    const value = product[field]?.trim()
    if (value && !values.has(filterKey(value))) values.set(filterKey(value), value)
  }
  return [...values.values()].sort((a, b) => (field === 'size' ? compareSizes(a, b) : 0) || a.localeCompare(b, undefined, { numeric: true }))
}
export function matchingProducts(products: Product[], search: string, capacity = '', size = '', category = '') {
  const query = search.trim().toLowerCase()
  return products.filter(p => p.is_active && (!category || p.category === category) && (!capacity || filterKey(p.load_capacity) === filterKey(capacity)) && (!size || filterKey(p.size) === filterKey(size)) && `${p.title} ${p.product_code || ''} ${p.category || ''} ${p.load_capacity || ''} ${p.size || ''}`.toLowerCase().includes(query)).sort((a, b) => compareSizes(a.size, b.size))
}
