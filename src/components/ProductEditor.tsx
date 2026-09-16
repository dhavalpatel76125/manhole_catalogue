import { useEffect, useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { Modal } from './Modal'
import { ProductCard } from './ProductCard'
import { prepareImage, imageExtension } from '../lib/images'
import { errorMessage, validateProduct } from '../lib/catalogue'
import type { Product, ProductInput } from '../types'
export function ProductEditor({ product, imageUrl, onSave, onClose }: { product: Product | null; imageUrl?: string; onSave: (input: ProductInput, image: Blob | null) => Promise<void>; onClose: () => void }) {
  const [title, setTitle] = useState(product?.title || '')
  const [code, setCode] = useState(product?.product_code || '')
  const [price, setPrice] = useState(product?.price?.toString() || '')
  const [active, setActive] = useState(product?.is_active ?? true)
  const [image, setImage] = useState<Blob | null>(null)
  const [preview, setPreview] = useState(imageUrl || '')
  const [progress, setProgress] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const objectUrl = useRef<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current) }, [])
  const busy = saving || processing
  const dirty = title !== (product?.title || '') || code !== (product?.product_code || '') || price !== (product?.price?.toString() || '') || active !== (product?.is_active ?? true) || image !== null
  const close = () => { if (!dirty || window.confirm('Discard these unsaved product changes?')) onClose() }
  const draft: Product = { id: product?.id || 'preview', title: title.trim() || 'Your product title', product_code: code || null, price: price && Number.isFinite(Number(price)) ? Number(price) : null, image_url: preview, image_path: `preview.${image ? imageExtension(image) : 'webp'}`, display_order: 0, is_active: active, created_at: '', updated_at: '' }
  return <Modal title={product ? 'Edit product' : 'Add product'} onClose={close} busy={busy}>
    <form onSubmit={async e => {
      e.preventDefault(); setError('')
      try {
        const input = validateProduct({ title, product_code: code, price: price.trim() === '' ? null : Number(price), is_active: active })
        if (!product && !image) throw new Error('Choose a product image before saving.')
        setSaving(true); await onSave(input, image); onClose()
      } catch (e) { setError(errorMessage(e)) } finally { setSaving(false) }
    }}>
      <div className="editor-layout"><div className="editor-form">
        <label className="field-label">Product title<input autoFocus required minLength={2} maxLength={160} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. 500W LED Lens Flood Light" disabled={busy}/></label>
        <label className="field-label">Product code <small>Optional</small><input maxLength={80} value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. YRV-FL-500" disabled={busy}/></label>
        <label className="field-label">Price (INR) <small>Optional · Leave blank to hide the price</small><input type="number" min="0" max="999999999.99" step="0.01" value={price} onChange={e => setPrice(e.target.value)} placeholder="Not displayed" disabled={busy}/></label>
        <label className="field-label upload-box"><span>{product ? 'Replace image' : 'Product image'}</span><small>JPG, PNG or WebP · Maximum 5 MB. Images are resized to 1,600 px and compressed locally.</small><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async e => {
          const file = e.target.files?.[0]; if (!file) return
          setProcessing(true); setError(''); setProgress(0)
          try { const blob = await prepareImage(file, setProgress); if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); objectUrl.current = URL.createObjectURL(blob); setImage(blob); setPreview(objectUrl.current) }
          catch (e) { setError(errorMessage(e)); if (fileInput.current) fileInput.current.value = '' }
          finally { setProcessing(false) }
        }}/>{processing && <><progress className="upload-progress" value={progress} max={100}/><small role="status">Processing image… {progress}%</small></>}{image && !processing && <small>Image ready · {Math.round(image.size / 1024)} KB · {image.type.replace('image/', '').toUpperCase()}</small>}</label>
        <label className="check-label"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} disabled={busy}/>Include this product in the published catalogue</label>
        {error && <div className="notice error-note" role="alert">{error}</div>}
      </div><aside className="editor-preview"><p className="preview-label">PRODUCT PREVIEW</p>{preview ? <ProductCard key={preview} product={draft} preview/> : <div className="preview-empty"><ImagePlus size={36}/><span>Choose an image to preview your product</span></div>}</aside></div>
      <div className="dialog-footer"><button type="button" className="secondary-button" disabled={busy} onClick={close}>Cancel</button><button type="submit" className="primary-button" disabled={busy}>{saving ? 'Saving…' : 'Save draft'}</button></div>
    </form>
  </Modal>
}
