import type { Product } from '../types'

export function filterKey(value: string | null | undefined) {
  return (value || '').trim().toLowerCase().replace(/×/g, 'x').replace(/\s+/g, '')
}

// Compare physical dimensions, keeping the original inch/mm labels for display.
// Unknown or unitless sizes follow measured sizes; ties retain catalogue order.
function sizeDimensions(value: string | null | undefined): [number, number] | null {
  const match = (value || '').trim().match(/^(?:[ø⌀]\s*)?(\d+(?:\.\d+)?)\s*(?:[x×]\s*(\d+(?:\.\d+)?))?\s*(mm|cm|m|in|inch|inches|")\s*(?:dia(?:meter)?)?$/i)
  if (!match) return null
  const unit = match[3].toLowerCase()
  const scale = unit === 'mm' ? 1 : unit === 'cm' ? 10 : unit === 'm' ? 1000 : 25.4
  const a = Number(match[1]) * scale
  const b = Number(match[2] || match[1]) * scale
  if (!Number.isFinite(a) || !Number.isFinite(b) || a <= 0 || b <= 0) return null
  return [Math.min(a, b), Math.max(a, b)]
}
export function compareSizes(a: string | null | undefined, b: string | null | undefined) {
  const left = sizeDimensions(a)
  const right = sizeDimensions(b)
  if (!left || !right) return left ? -1 : right ? 1 : 0
  // Round conversion noise so equivalent inch/mm dimensions remain tied.
  return Math.round((left[0] - right[0]) * 1000) || Math.round((left[1] - right[1]) * 1000) || 0
}

export function productOptions(products: Product[], field: 'load_capacity' | 'size') {
  const values = new Map<string, string>()
  for (const product of products) {
    const value = product[field]?.trim()
    if (value && !values.has(filterKey(value))) values.set(filterKey(value), value)
  }
  return [...values.values()].sort((a, b) => (field === 'size' ? compareSizes(a, b) : 0) || a.localeCompare(b, undefined, { numeric: true }))
}
export function matchingProducts(products: Product[], search: string, capacity = '', size = '') {
  const query = search.trim().toLowerCase()
  return products.filter(p => p.is_active && (!capacity || filterKey(p.load_capacity) === filterKey(capacity)) && (!size || filterKey(p.size) === filterKey(size)) && `${p.title} ${p.product_code || ''} ${p.load_capacity || ''} ${p.size || ''}`.toLowerCase().includes(query)).sort((a, b) => compareSizes(a.size, b.size))
}
