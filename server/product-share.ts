import sharp from 'sharp'
import type { Product } from '../src/types.js'
import { enquiryMessageParts, productUrl, whatsappEnquiryUrl } from '../shared/whatsapp.js'

function escape(value: unknown) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!)
}

const brand = 'FIBRO INNOVATION SYSTEM'
function document(title: string, metadata: string, body: string) {
  return `<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)}</title>${metadata}<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/product-page.css"><script src="/product-page.js" defer></script></head><body>
  <header><a class="brand" href="/" aria-label="Fibro catalogue"><img src="/fibro-round-logo-v1.jpg" width="144" height="144" alt="FIBRO INNOVATION SYSTEM. FRP manhole cover manufacturer. 7990907899 / 9978717496. Rajkot, Gujarat."></a><a class="back" href="/">All products <span aria-hidden="true">↗</span></a></header>
  ${body}<footer>${brand} · FRP Manhole Covers</footer></body></html>`
}

export function productPage(product: Product, origin: string, whatsappNumber: string) {
  const title = `${product.title} | ${brand}`
  const description = [product.product_code, product.load_capacity && `Load capacity: ${product.load_capacity}`, product.size && `Size: ${product.size}`, 'Enquire on WhatsApp for price and availability.'].filter(Boolean).join(' · ')
  const url = productUrl(origin, product)!
  const image = productUrl(origin, product, true)!
  const tags: [string, string][] = [
    ['og:type', 'website'], ['og:site_name', brand], ['og:locale', 'en_IN'],
    ['og:title', title], ['og:description', description], ['og:url', url],
    ['og:image', image], ['og:image:secure_url', image], ['og:image:type', 'image/jpeg'],
    ['og:image:width', '1200'], ['og:image:height', '630'], ['og:image:alt', product.title],
  ]
  const metadata = `<meta name="description" content="${escape(description)}"><link rel="canonical" href="${escape(url)}">` + tags.map(([key, value]) => `<meta property="${key}" content="${escape(value)}">`).join('') +
    `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${escape(image)}"><meta name="twitter:image:alt" content="${escape(product.title)}">`
  const { before, after } = enquiryMessageParts(product.title, product, origin)
  const measurements = [['Clear opening', product.clear_opening], ['Frame size', product.frame_size], ['Cover size', product.cover_size]]
  return document(title, metadata, `<main class="product">
    <div class="photo"><img src="${escape(image)}" alt="${escape(product.title)}" width="1200" height="630"></div>
    <section class="details" aria-labelledby="product-title"><p class="eyebrow">${escape(product.product_code || 'FRP MANHOLE COVERS')}</p><h1 id="product-title">${escape(product.title)}</h1>
    <div class="tags">${[product.load_capacity, product.size].filter(Boolean).map(value => `<span>${escape(value)}</span>`).join('')}</div>
    <h2>Description</h2><dl>${measurements.map(([label, value]) => `<div><dt>${label}</dt><dd>${escape(value || 'Not specified')}</dd></div>`).join('')}</dl>
    ${product.price !== null ? `<p class="price">${escape(new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(product.price))}</p>` : ''}
    <div class="quantity-row"><label for="quantity">Quantity</label><div class="quantity-control"><button type="button" id="decrease" aria-label="Decrease quantity" disabled>−</button><input id="quantity" type="number" inputmode="numeric" min="1" max="999" step="1" value="1"><button type="button" id="increase" aria-label="Increase quantity">+</button></div></div>
    <a id="whatsapp" class="whatsapp" href="${escape(whatsappEnquiryUrl(whatsappNumber, product.title, 1, product, origin))}" data-before="${escape(before)}" data-after="${escape(after)}" target="_blank" rel="noopener noreferrer">Enquire on WhatsApp <span aria-hidden="true">↗</span></a><p class="note">Choose your quantity and enquire for price and availability.</p>
    </section></main>`)
}

export function unavailableProductPage() {
  return document(`Product unavailable | ${brand}`, '<meta name="robots" content="noindex">', '<main class="unavailable"><h1>This product is unavailable</h1><p>Explore our catalogue for available sizes and load capacities.</p><a class="whatsapp" href="/">Browse the catalogue</a></main>')
}

export function productPreview(bytes: Uint8Array) {
  return sharp(bytes, { limitInputPixels: 40_000_000, animated: false }).rotate()
    .resize(1200, 630, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' }).toColourspace('srgb')
    .jpeg({ quality: 80, progressive: false }).toBuffer()
}
