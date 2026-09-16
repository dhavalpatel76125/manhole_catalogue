import { describe, expect, it } from 'vitest'
import { clampQuantity, pageItems, validateProduct, whatsappUrl } from './catalogue'
import { parseCatalogue } from './jsonCatalogue'

describe('catalogue rules', () => {
  it('clamps quantities to 1–999', () => { expect([-1, 0, 1, 2, 999, 1000, NaN].map(clampQuantity)).toEqual([1, 1, 1, 2, 999, 999, 1]) })
  it('encodes the exact WhatsApp message, including special characters', () => {
    const url = new URL(whatsappUrl('500W LED Lens Flood Light & "Pro"', 3))
    expect(url.origin + url.pathname).toBe('https://wa.me/918320587916')
    expect(url.searchParams.get('text')).toBe('Hello, I want to buy 500W LED Lens Flood Light & "Pro". Quantity: 3. Please share the price and availability.')
  })
  it('shows page boundaries and ellipses without duplicates', () => {
    expect(pageItems(1, 2)).toEqual([1, 2]); expect(pageItems(6, 20)).toEqual([1, 'gap-5', 5, 6, 7, 'gap-20', 20])
    expect(pageItems(20, 20)).toEqual([1, 'gap-17', 17, 18, 19, 20])
  })
  it('validates and normalizes optional fields', () => {
    expect(validateProduct({ title: '  LED Light  ', product_code: ' ', price: null, is_active: true })).toEqual({ title: 'LED Light', product_code: null, price: null, is_active: true })
    expect(() => validateProduct({ title: '<script>', product_code: null, price: null, is_active: true })).toThrow()
    expect(() => validateProduct({ title: 'LED Light', product_code: null, price: -1, is_active: true })).toThrow()
  })
})
const product = { id: '00000000-0000-4000-8000-000000000001', title: 'LED Light', product_code: null, price: null, is_active: true, image_url: '/catalogue/images/test.webp', image_path: 'test.webp', display_order: 0, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }
describe('untrusted JSON', () => {
  it('accepts an empty or valid versioned catalogue', () => { expect(parseCatalogue({ version: 1, products: [] })).toEqual([]); expect(parseCatalogue({ version: 1, products: [product] })[0].title).toBe('LED Light') })
  it.each([
    { ...product, image_path: '../private.webp' }, { ...product, image_url: 'javascript:alert(1)' },
    { ...product, title: '<img onerror=alert(1)>' }, { ...product, display_order: -1 },
    { ...product, price: '0' }, { ...product, is_active: 'true' },
  ])('rejects malformed product %#', value => { expect(() => parseCatalogue({ version: 1, products: [value] })).toThrow() })
  it('rejects duplicate IDs and unknown schema versions', () => { expect(() => parseCatalogue({ version: 1, products: [product, product] })).toThrow(); expect(() => parseCatalogue({ version: 2, products: [] })).toThrow() })
})
