import { describe, expect, it } from 'vitest'
import { PRODUCT_CATEGORIES } from '../../shared/categories'
import { parseCatalogue, validateProduct } from '../../shared/catalogue'
import { matchingProducts, productOptions } from './productFilters'
import { whatsappUrl } from './catalogue'
import type { Product } from '../types'

const base: Product = { id: '00000000-0000-4000-8000-000000000001', title: 'FRP Cover', product_code: 'FIS-001', price: null, is_active: true, image_path: 'cover.webp', image_url: '/catalogue/images/cover.webp', display_order: 0, created_at: '2026-09-17T00:00:00Z', updated_at: '2026-09-17T00:00:00Z', load_capacity: '5 ton', size: '24 × 24 inch' }

describe('product categories', () => {
  it('leaves existing products unassigned and visible in All categories', () => {
    expect(parseCatalogue({ version: 1, products: [base] })[0]).toEqual(base)
    expect(matchingProducts([base], '')).toEqual([base])
    for (const category of PRODUCT_CATEGORIES) expect(matchingProducts([base], '', '', '', category)).toEqual([])
  })
  it.each(PRODUCT_CATEGORIES)('preserves %s through validation and catalogue parsing', category => {
    expect(parseCatalogue({ version: 1, products: [{ ...base, category }] })[0].category).toBe(category)
    expect(validateProduct({ ...base, category }).category).toBe(category)
  })
  it('allows removing a category and rejects unsupported values', () => {
    expect(validateProduct({ ...base, category: null }).category).toBeNull()
    for (const category of ['Other', '', '<script>', 123, {}, []]) expect(() => validateProduct({ ...base, category } as any)).toThrow('Choose a valid product category.')
  })
  it('combines category, capacity, size and search before pagination', () => {
    const rows: Product[] = [
      base,
      { ...base, id: 'gully', category: PRODUCT_CATEGORIES[1] },
      { ...base, id: 'big', category: PRODUCT_CATEGORIES[1], size: '30 × 30 inch', load_capacity: '10 ton' },
      { ...base, id: 'tile', category: PRODUCT_CATEGORIES[2] },
      { ...base, id: 'hidden', category: PRODUCT_CATEGORIES[1], is_active: false, load_capacity: '60 ton' },
    ]
    expect(matchingProducts(rows, 'FIS-001', '5 ton', '24x24 inch', PRODUCT_CATEGORIES[1]).map(p => p.id)).toEqual(['gully'])
    expect(matchingProducts(rows, 'tiles insert').map(p => p.id)).toEqual(['tile'])
    const gully = matchingProducts(rows, '', '', '', PRODUCT_CATEGORIES[1])
    expect(productOptions(gully, 'load_capacity')).toEqual(['5 ton', '10 ton'])
    expect(productOptions(matchingProducts(gully, '', '10 ton'), 'size')).toEqual(['30 × 30 inch'])
  })
  it('includes a category in WhatsApp only after it has been assigned', () => {
    expect(new URL(whatsappUrl(base.title, 2, base)).searchParams.get('text')).not.toContain('Category:')
    expect(new URL(whatsappUrl(base.title, 2, { ...base, category: PRODUCT_CATEGORIES[2] })).searchParams.get('text')).toContain('Category: FRP Tiles Insert Manhole Cover')
  })
})
