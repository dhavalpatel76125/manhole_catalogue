import { describe, expect, it } from 'vitest'
import { compareSizes, matchingProducts, productOptions } from './productFilters'
import { parseCatalogue, validateProduct } from '../../shared/catalogue'
import { whatsappUrl } from './catalogue'
import type { Product } from '../types'
const base: Product = { id:'00000000-0000-4000-8000-000000000001',title:'FRP Cover',product_code:'FIS-001',price:null,is_active:true,image_path:'cover.webp',image_url:'/catalogue/images/cover.webp',display_order:0,created_at:'2026-09-17T00:00:00Z',updated_at:'2026-09-17T00:00:00Z',load_capacity:'5 ton',size:'24 × 24 inch',clear_opening:'20 × 20 inch',frame_size:'24 × 24 inch',cover_size:'22 × 22 inch' }
describe('Fibro catalogue data flow', () => {
 it('preserves all filter and description fields through catalogue parsing', () => {
  expect(parseCatalogue({version:1,products:[base]})[0]).toEqual(base)
  expect(validateProduct({...base,load_capacity:'  5   ton  '})).toMatchObject({load_capacity:'5 ton'})
 })
 it('filters across the entire catalogue before pagination and keeps units distinct', () => {
  const rows=[base,{...base,id:'2',load_capacity:'10 ton'},{...base,id:'3',size:'24 × 24 mm'},{...base,id:'4',is_active:false}]
  expect(matchingProducts(rows,'','5 ton','24x24 INCH')).toEqual([base])
  expect(matchingProducts(rows,'FIS-001','10 ton')).toHaveLength(1)
  expect(matchingProducts(rows,'','40 ton')).toHaveLength(0)
 })
 it('adds new admin values to options and deduplicates spacing and case', () => {
  const rows=[base,{...base,size:'24x24 INCH'},{...base,size:'300 × 300 mm',load_capacity:'60 ton'}]
  expect(productOptions(rows,'size')).toEqual(['300 × 300 mm','24 × 24 inch'])
  expect(productOptions(rows,'load_capacity')).toEqual(['5 ton','60 ton'])
 })
 it('sorts small sizes first across units, rectangles and diameters without changing source order', () => {
  const sizes = ['Custom', '30 × 30 inch', '600 mm diameter', '24 × 24 inch', '300 × 300 mm', '12 × 18 inch', '12 × 12 inch', null]
  const rows = sizes.map((size, index) => ({...base, id:String(index), size}))
  const expected = ['300 × 300 mm', '12 × 12 inch', '12 × 18 inch', '600 mm diameter', '24 × 24 inch', '30 × 30 inch', 'Custom', null]
  expect(matchingProducts(rows, '').map(p => p.size)).toEqual(expected)
  expect(productOptions(rows, 'size')).toEqual(expected.filter(Boolean))
  expect(rows.map(p => p.size)).toEqual(sizes)
  expect(compareSizes('24 x 18 INCH', '18 × 24 inch')).toBe(0)
  expect(compareSizes('12 inch', '304.8 mm')).toBe(0)
 })
 it('keeps equal-sized variants in admin order and places unknown dimensions last', () => {
  const rows = [{...base,id:'unknown',size:null},{...base,id:'first'},{...base,id:'second',size:'609.6 × 609.6 mm'}]
  expect(matchingProducts(rows,'').map(p=>p.id)).toEqual(['first','second','unknown'])
  expect(compareSizes('300x300', '5 inch')).toBeGreaterThan(0)
 })
 it('rejects malformed description and filter values on the shared server/client boundary', () => {
  for(const key of ['load_capacity','size','clear_opening','frame_size','cover_size']) {
   expect(()=>validateProduct({...base,[key]:'<script>'})).toThrow()
   expect(()=>validateProduct({...base,[key]:123})).toThrow()
   expect(()=>validateProduct({...base,[key]:'a'.repeat(81)})).toThrow()
  }
 })
 it('identifies the selected capacity, size, product and quantity in WhatsApp', () => {
  const url=new URL(whatsappUrl(base.title,3,base))
  expect(url.pathname).toBe('/917990907899')
  for(const text of ['FIS-001','5 ton','24 × 24 inch','Quantity: 3']) expect(url.searchParams.get('text')).toContain(text)
 })
})
