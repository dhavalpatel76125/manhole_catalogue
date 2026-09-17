import { SITE_ORIGIN, WHATSAPP_NUMBER } from './config'
import { whatsappEnquiryUrl, type EnquiryProduct } from '../../shared/whatsapp'
export { validateProduct } from '../../shared/catalogue'
export { clampQuantity } from '../../shared/whatsapp'

export function whatsappUrl(title: string, quantity: number, details?: EnquiryProduct) {
  return whatsappEnquiryUrl(WHATSAPP_NUMBER, title, quantity, details, SITE_ORIGIN)
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
export function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return 'Something went wrong. Please try again.'
}
