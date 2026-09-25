import { useState } from 'react'
import { Minus, Plus, ImageOff, LoaderCircle } from 'lucide-react'
import { clampQuantity, whatsappUrl } from '../lib/catalogue'
import type { Product } from '../types'

export function WhatsAppIcon() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="19" height="19"><path d="M20.52 3.48A11.87 11.87 0 0 0 12.04 0C5.47 0 .13 5.34.13 11.91c0 2.1.55 4.15 1.6 5.96L0 24l6.29-1.65a11.88 11.88 0 0 0 5.75 1.46h.01c6.56 0 11.9-5.34 11.91-11.91a11.83 11.83 0 0 0-3.44-8.42ZM12.05 21.8a9.86 9.86 0 0 1-5.03-1.38l-.36-.21-3.73.98 1-3.64-.24-.38a9.86 9.86 0 0 1-1.51-5.26c0-5.46 4.44-9.9 9.9-9.9a9.83 9.83 0 0 1 7 2.9 9.84 9.84 0 0 1 2.9 7c0 5.46-4.45 9.9-9.93 9.9Zm5.43-7.41c-.3-.15-1.76-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.48-1.77-1.65-2.07-.17-.3-.02-.46.13-.61.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.2-.24-.58-.48-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.71.22 1.36.19 1.87.11.57-.08 1.76-.72 2.01-1.42.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z"/></svg>
}
export function ProductCard({ product, quantity = 1, onQuantity, preview = false }: { product: Product; quantity?: number; onQuantity?: (q: number) => void; preview?: boolean }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  return <article className="product-card" data-testid="product-card">
    <div className="product-image">
      {failed ? <div className="image-fallback"><ImageOff size={30}/><span>Image unavailable</span></div> : <img src={product.image_url} alt={product.title} loading="lazy" width="480" height="360" onError={() => setFailed(true)} />}
    </div>
    <div className="product-body">
      <div className="product-code">{product.product_code || 'FIBRO FRP COVERS'}</div>
      <h2 title={product.title}>{product.title}</h2>
      {product.category && <span className="category-label" aria-label={`Category: ${product.category}`}>{product.category}</span>}
      <div className="product-tags">{product.load_capacity && <span>{product.load_capacity}</span>}{product.size && <span>{product.size}</span>}</div>
      <dl className="product-description" aria-label="Description"><div><dt>Clear opening</dt><dd>{product.clear_opening || 'Not specified'}</dd></div><div><dt>Frame size</dt><dd>{product.frame_size || 'Not specified'}</dd></div><div><dt>Cover size</dt><dd>{product.cover_size || 'Not specified'}</dd></div></dl>
      <p className="price">{product.price !== null && new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(product.price)}</p>
      <div className="quantity-row"><span>Quantity</span><div className="quantity-control">
        <button type="button" aria-label={`Decrease quantity for ${product.title}`} disabled={quantity <= 1 || preview} onClick={() => onQuantity?.(clampQuantity(quantity - 1))}><Minus size={14}/></button>
        <output aria-label={`Quantity for ${product.title}`}>{quantity}</output>
        <button type="button" aria-label={`Increase quantity for ${product.title}`} disabled={quantity >= 999 || preview} onClick={() => onQuantity?.(clampQuantity(quantity + 1))}><Plus size={14}/></button>
      </div></div>
      <a className={`whatsapp-button ${preview ? 'is-disabled' : ''}`} href={preview ? undefined : whatsappUrl(product.title, quantity, product)} target="_blank" rel="noopener noreferrer" aria-disabled={preview || busy} onClick={event => { if (preview || busy) { event.preventDefault(); return }; setBusy(true); window.setTimeout(() => setBusy(false), 1000) }}>
        {busy ? <LoaderCircle className="spin" size={19}/> : <WhatsAppIcon/>}{busy ? 'Opening WhatsApp…' : 'Buy on WhatsApp'}
      </a>
    </div>
  </article>
}
