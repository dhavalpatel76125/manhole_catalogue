import { WHATSAPP_NUMBER } from './config'
import type { ProductInput } from '../types'

export function clampQuantity(value: number) { return Math.max(1, Math.min(999, Math.trunc(value) || 1)) }
export function whatsappUrl(title: string, quantity: number) {
  const message = `Hello, I want to buy ${title}. Quantity: ${clampQuantity(quantity)}. Please share the price and availability.`
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}
export function pageItems(page: number, total: number): (number | string)[] {
  const pages = new Set([1, total, page - 1, page, page + 1])
  if (page <= 3) [2, 3, 4].forEach(p => pages.add(p))
  if (page >= total - 2) [total - 3, total - 2, total - 1].forEach(p => pages.add(p))
  const result: (number | string)[] = []
  let previous = 0
  for (const p of [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b)) {
    if (p - previous > 1) result.push(`gap-${p}`)
    result.push(p); previous = p
  }
  return result
}
export function validateProduct(input: ProductInput): ProductInput {
  const title = input.title.trim()
  const product_code = input.product_code?.trim() || null
  if (title.length < 2 || title.length > 160 || /[\u0000-\u001f<>]/.test(title)) throw new Error('Enter a title of 2–160 characters without markup or control characters.')
  if (product_code && (product_code.length > 80 || /[\u0000-\u001f<>]/.test(product_code))) throw new Error('Product code must be 80 characters or fewer without markup or control characters.')
  if (input.price !== null && (!Number.isFinite(input.price) || input.price < 0 || input.price > 999999999.99)) throw new Error('Enter a valid price between 0 and 999,999,999.99 or leave it blank.')
  return { title, product_code, is_active: Boolean(input.is_active), price: input.price === null ? null : Math.round(input.price * 100) / 100 }
}
export function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return 'Something went wrong. Please try again.'
}
