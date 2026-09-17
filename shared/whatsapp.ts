export interface EnquiryProduct {
  id?: string
  updated_at?: string
  product_code?: string | null
  load_capacity?: string | null
  size?: string | null
}

export const PRODUCT_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
export function clampQuantity(value: number) { return Math.max(1, Math.min(999, Math.trunc(value) || 1)) }

export function productUrl(origin: string, product: EnquiryProduct, image = false) {
  if (!product.id || !PRODUCT_ID.test(product.id)) return null
  const url = new URL(`/products/${product.id}${image ? '/preview.jpg' : ''}`, origin)
  const updated = Date.parse(product.updated_at || '')
  if (Number.isFinite(updated)) url.searchParams.set('v', updated.toString(36))
  return url.href
}

// Keep the quantity separate so both the React cards and the public product
// page can change it without replacing any text in the product's title.
export function enquiryMessageParts(title: string, details?: EnquiryProduct, origin?: string) {
  const info = details ? [details.product_code && `Product code: ${details.product_code}`, details.load_capacity && `Load capacity: ${details.load_capacity}`, details.size && `Size: ${details.size}`].filter(Boolean).join('. ') : ''
  const link = origin && details ? productUrl(origin, details) : null
  return {
    before: `Hello, I want to buy ${title}. ${info ? info + '. ' : ''}Quantity: `,
    after: `. Please share the price and availability.${link ? `\n\nProduct: ${link}` : ''}`,
  }
}

export function whatsappEnquiryUrl(number: string, title: string, quantity: number, details?: EnquiryProduct, origin?: string) {
  const { before, after } = enquiryMessageParts(title, details, origin)
  return `https://wa.me/${number}?text=${encodeURIComponent(before + clampQuantity(quantity) + after)}`
}
