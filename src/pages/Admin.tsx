import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Download, Edit3, Eye, Plus, Search, Trash2, Upload, X } from 'lucide-react'
import { Brand } from '../components/Brand'
import { Modal } from '../components/Modal'
import { Pagination } from '../components/Pagination'
import { ProductCard } from '../components/ProductCard'
import { ProductEditor } from '../components/ProductEditor'
import { errorMessage } from '../lib/catalogue'
import { imageExtension } from '../lib/images'
import { downloadBlob, exportWorkspace, importWorkspace, loadWorkspace, saveWorkspace, type Workspace } from '../lib/workspace'
import { PAGE_SIZE } from '../lib/config'
import type { Product, ProductInput } from '../types'

export default function Admin() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [exportStatus, setExportStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editor, setEditor] = useState<Product | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [preview, setPreview] = useState<Product | null>(null)
  const [pendingImport, setPendingImport] = useState<File | null>(null)
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const importInput = useRef<HTMLInputElement>(null)
  const lock = useRef(false)
  const notify = useCallback((message: string, error = false) => setToast({ message, error }), [])
  useEffect(() => { let alive = true; loadWorkspace().then(value => { if (alive) setWorkspace(value) }).catch(e => { if (alive) setError(errorMessage(e)) }); return () => { alive = false } }, [])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(null), 6000); return () => clearTimeout(timer) }, [toast])
  useEffect(() => {
    if (!workspace) return
    const next = Object.fromEntries(Object.entries(workspace.assets).map(([path, blob]) => [path, URL.createObjectURL(blob)]))
    setUrls(next)
    return () => Object.values(next).forEach(url => URL.revokeObjectURL(url))
  }, [workspace?.assets])
  const products = workspace?.products || []
  const filtered = useMemo(() => products.filter(p => `${p.title} ${p.product_code || ''} ${p.category || ''}`.toLowerCase().includes(search.toLowerCase().trim())), [products, search])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  const viewProduct = (p: Product) => ({ ...p, image_url: urls[p.image_path] || p.image_url })
  async function commit(next: Workspace, message: string) {
    if (lock.current) throw new Error('Please wait for the current action to finish.')
    lock.current = true; setBusy(true)
    try { const saved = await saveWorkspace(next); setWorkspace(saved); notify(message) }
    finally { lock.current = false; setBusy(false) }
  }
  async function saveProduct(input: ProductInput, image: Blob | null) {
    if (!workspace) return
    const existing = editor === 'new' ? null : editor
    const now = new Date().toISOString()
    const imagePath = image ? `${crypto.randomUUID()}.${imageExtension(image)}` : existing!.image_path
    const product: Product = { ...input, id: existing?.id || crypto.randomUUID(), image_path: imagePath, image_url: `/catalogue/images/${imagePath}`, display_order: existing?.display_order ?? products.length, created_at: existing?.created_at || now, updated_at: now }
    await commit({ ...workspace, products: existing ? products.map(p => p.id === existing.id ? product : p) : [...products, product], assets: image ? { ...workspace.assets, [imagePath]: image } : workspace.assets }, 'Product saved to your local draft. Export to publish.')
  }
  async function reorder(product: Product, direction: number) {
    if (!workspace) return
    const index = products.findIndex(p => p.id === product.id); const target = index + direction
    if (target < 0 || target >= products.length) return
    const reordered = [...products]; [reordered[index], reordered[target]] = [reordered[target], reordered[index]]
    try { await commit({ ...workspace, products: reordered.map((p, i) => ({ ...p, display_order: i, updated_at: new Date().toISOString() })) }, 'Product order saved. Export to publish.') } catch (e) { notify(errorMessage(e), true) }
  }
  async function doExport(backup: boolean) {
    if (!workspace || lock.current) return
    lock.current = true; setBusy(true); setExportStatus('Preparing export…')
    try { const blob = await exportWorkspace(workspace, backup, setExportStatus); downloadBlob(blob, `yorvis-${backup ? 'private-backup' : 'publish'}-${new Date().toISOString().slice(0, 10)}.zip`); notify(backup ? 'Private backup exported. Keep it somewhere safe.' : 'Publishing bundle exported. Upload/redeploy to make changes live.') }
    catch (e) { notify(errorMessage(e), true) }
    finally { lock.current = false; setBusy(false); setExportStatus('') }
  }
  return <>
    <header className="site-header"><div className="header-inner"><Brand/><span className="header-descriptor">LOCAL EDITOR</span><a className="contact-link" href="/">Close editor <X size={16}/></a></div></header>
    <main className="admin-shell"><div className="admin-top"><div><p className="eyebrow"><span/> YOUR PRODUCT WORKSPACE</p><h1>Catalogue editor<span>.</span></h1><p>Manage your products, then export when you’re ready to publish.</p></div><div className="admin-actions"><button className="secondary-button" disabled={!workspace || busy} onClick={() => void doExport(true)}><Download size={15}/>Backup drafts</button><button className="primary-button" disabled={!workspace || busy} onClick={() => void doExport(false)}><Upload size={16}/>Export publish ZIP</button></div></div>
      <div className="notice">This editor runs only on your computer. Drafts are saved in this browser. Publishing ZIPs include only active products; changes go live after you upload or redeploy the exported catalogue. Back up your drafts before clearing browser data.</div>
      {error && <div className="notice error-note" role="alert">{error} <button className="secondary-button" onClick={() => window.location.reload()}>Reload</button></div>}
      {exportStatus && <p className="export-note" role="status">{exportStatus}</p>}
      <div className="admin-toolbar"><div className="search-field"><Search size={19}/><input aria-label="Search admin products" placeholder="Search by name, code or category..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} maxLength={160}/></div><span className="admin-count">{products.length} products · {products.filter(p => p.is_active).length} active</span><button className="secondary-button" disabled={!workspace || busy} onClick={() => importInput.current?.click()}><Upload size={15}/>Import ZIP</button><button className="primary-button" disabled={!workspace || busy} onClick={() => setEditor('new')}><Plus size={17}/>Add product</button><input ref={importInput} type="file" accept=".zip,application/zip" className="hidden-input" aria-label="Import catalogue archive" onChange={e => { const file = e.target.files?.[0]; if (file) setPendingImport(file); e.target.value = '' }}/></div>
      {!workspace && !error ? <div className="empty-state" role="status">Loading local drafts…</div> : !filtered.length ? <div className="empty-state"><Search size={35}/><h2>{search ? 'No products found' : 'Your catalogue starts here'}</h2><p>{search ? 'Try another product name or code.' : 'Add your first product with its image, or import an existing FIBRO ZIP.'}</p>{!search && <button className="primary-button" disabled={!workspace || busy} onClick={() => setEditor('new')}><Plus size={16}/>Add product</button>}</div> : <>
        <div className="table-wrap"><table><thead><tr><th>Product</th><th>Visibility</th><th>Order</th><th>Actions</th></tr></thead><tbody>{filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(product => { const index = products.findIndex(p => p.id === product.id); return <tr key={product.id}>
          <td><div className="table-product"><img src={viewProduct(product).image_url} alt={product.title}/><div><strong>{product.title}</strong>{product.category && <span className="category-label">{product.category}</span>}<small>{[product.product_code, product.load_capacity, product.size].filter(Boolean).join(' · ') || 'Details not specified'}</small></div></div></td>
          <td><button className={`status-toggle ${product.is_active ? '' : 'inactive'}`} aria-label={`${product.is_active ? 'Deactivate' : 'Activate'} ${product.title}`} disabled={busy} onClick={async () => { if (!workspace) return; try { await commit({ ...workspace, products: products.map(p => p.id === product.id ? { ...p, is_active: !p.is_active, updated_at: new Date().toISOString() } : p) }, 'Visibility saved. Export to publish.') } catch (e) { notify(errorMessage(e), true) } }}>{product.is_active ? 'Active' : 'Inactive'}</button></td>
          <td><div className="row-actions"><button className="icon-button" title={search ? 'Clear search to reorder products' : 'Move up'} aria-label={`Move ${product.title} up`} disabled={busy || index === 0 || Boolean(search)} onClick={() => void reorder(product, -1)}><ArrowUp size={16}/></button><button className="icon-button" title={search ? 'Clear search to reorder products' : 'Move down'} aria-label={`Move ${product.title} down`} disabled={busy || index === products.length - 1 || Boolean(search)} onClick={() => void reorder(product, 1)}><ArrowDown size={16}/></button></div></td>
          <td><div className="row-actions"><button className="icon-button" aria-label={`Preview ${product.title}`} onClick={() => setPreview(product)}><Eye size={16}/></button><button className="icon-button" aria-label={`Edit ${product.title}`} disabled={busy} onClick={() => setEditor(product)}><Edit3 size={16}/></button><button className="icon-button delete" aria-label={`Delete ${product.title}`} disabled={busy} onClick={() => setDeleting(product)}><Trash2 size={16}/></button></div></td>
        </tr> })}</tbody></table></div><div className="admin-pagination"><Pagination page={page} pages={pages} onChange={setPage}/></div>
      </>}
      <p className="export-note">To publish: extract the publishing ZIP, replace the project’s public/catalogue folder, build, then deploy. Replace the whole folder to remove obsolete images. Private backups include inactive products and must never be deployed.</p>
    </main>
    {editor && <ProductEditor products={products} product={editor === 'new' ? null : editor} imageUrl={editor === 'new' ? undefined : viewProduct(editor).image_url} onSave={saveProduct} onClose={() => setEditor(null)}/>}
    {preview && <Modal title="Product preview" small onClose={() => setPreview(null)}><div className="editor-preview"><ProductCard product={viewProduct(preview)} preview/></div><div className="dialog-footer"><button className="secondary-button" onClick={() => setPreview(null)}>Close preview</button></div></Modal>}
    {deleting && <Modal title="Delete product?" small busy={busy} onClose={() => setDeleting(null)}><div className="confirm-body">Delete <strong>{deleting.title}</strong> and its image from your local draft? This cannot be undone. Your published website changes only after the next export and deployment.</div><div className="dialog-footer"><button className="secondary-button" disabled={busy} onClick={() => setDeleting(null)}>Cancel</button><button className="danger-button" disabled={busy} onClick={async () => { if (!workspace) return; try { await commit({ ...workspace, products: products.filter(p => p.id !== deleting.id).map((p, i) => ({ ...p, display_order: i })) }, 'Product and unused local image deleted.'); setDeleting(null) } catch (e) { notify(errorMessage(e), true) } }}>{busy ? 'Deleting…' : 'Delete product'}</button></div></Modal>}
    {pendingImport && <Modal title="Replace local draft?" small busy={busy} onClose={() => setPendingImport(null)}><div className="confirm-body">Importing <strong>{pendingImport.name}</strong> replaces all products and images in this browser’s draft. Export a private backup first if you want to keep the current draft.</div><div className="dialog-footer"><button className="secondary-button" disabled={busy} onClick={() => setPendingImport(null)}>Cancel</button><button className="primary-button" disabled={busy} onClick={async () => { if (!workspace || lock.current) return; setBusy(true); lock.current = true; try { const imported = await importWorkspace(pendingImport); lock.current = false; await commit({ ...imported, revision: workspace.revision }, 'Catalogue imported and saved locally.'); setSearch(''); setPage(1); setPendingImport(null) } catch (e) { notify(errorMessage(e), true) } finally { lock.current = false; setBusy(false) } }}>{busy ? 'Importing…' : 'Replace draft'}</button></div></Modal>}
    {toast && <div className={`toast ${toast.error ? 'error' : ''}`} role={toast.error ? 'alert' : 'status'}>{toast.message}<button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16}/></button></div>}
  </>
}
