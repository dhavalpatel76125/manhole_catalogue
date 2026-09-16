import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Edit3, Eye, LockKeyhole, LogOut, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react'
import { Brand } from '../components/Brand'
import { Modal } from '../components/Modal'
import { ProductCard } from '../components/ProductCard'
import { ProductEditor } from '../components/ProductEditor'
import { Pagination } from '../components/Pagination'
import { ADMIN_PATH, PAGE_SIZE } from '../lib/config'
import { errorMessage } from '../lib/catalogue'
import { apiRequest, catalogueResponse, saveOnlineProduct, type OnlineCatalogue } from '../lib/onlineApi'
import type { Product, ProductInput } from '../types'

export default function OnlineAdmin() {
  const [auth, setAuth] = useState<'checking' | 'login' | 'setup' | 'ready' | 'error'>('checking')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [setupToken, setSetupToken] = useState('')
  const [error, setError] = useState('')
  const [catalogue, setCatalogue] = useState<OnlineCatalogue | null>(null)
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Product | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [preview, setPreview] = useState<Product | null>(null)
  const [toast, setToast] = useState('')
  const refresh = useCallback(async () => { setCatalogue(catalogueResponse(await apiRequest('admin'))) }, [])
  const checkAuth = useCallback(async () => {
    try {
      const session = await apiRequest('session')
      if (session.authenticated) { setAuth('ready'); setEmail(session.email); await refresh(); history.replaceState(null, '', ADMIN_PATH) }
      else { setCatalogue(null); setAuth(session.needsSetup ? 'setup' : 'login'); history.replaceState(null, '', `${ADMIN_PATH}/login`) }
      setError('')
    } catch (e) { setError(errorMessage(e)); setAuth('error') }
  }, [refresh])
  useEffect(() => { void checkAuth() }, [checkAuth])
  useEffect(() => {
    const expire = () => { setAuth('login'); setCatalogue(null); setEditing(null); setDeleting(null); setPreview(null); setPassword(''); setError('Your session has expired. Please sign in again.'); history.replaceState(null, '', `${ADMIN_PATH}/login`) }
    window.addEventListener('yorvis-session-expired', expire)
    return () => window.removeEventListener('yorvis-session-expired', expire)
  }, [])
  useEffect(() => {
    if (auth !== 'ready') return
    const verify = async () => { try { const result = await apiRequest('session'); if (!result.authenticated) window.dispatchEvent(new Event('yorvis-session-expired')) } catch { /* Writes still require a valid server session. */ } }
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void verify() }, 60000)
    window.addEventListener('focus', verify)
    return () => { clearInterval(timer); window.removeEventListener('focus', verify) }
  }, [auth])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 6000); return () => clearTimeout(timer) }, [toast])
  const products = catalogue?.products || []
  const filtered = useMemo(() => products.filter(p => `${p.title} ${p.product_code || ''}`.toLowerCase().includes(search.trim().toLowerCase())), [products, search])
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  useEffect(() => { if (page > pages) setPage(pages) }, [page, pages])
  async function mutate(action: string, body: object) {
    if (!catalogue || busy) return
    setBusy(true); setError('')
    try { setCatalogue(catalogueResponse(await apiRequest(action, { ...body, revision: catalogue.revision }))); setToast('Catalogue updated. Your changes are live.'); setDeleting(null) }
    catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  async function save(input: ProductInput, image: Blob | null, progress: (value: number) => void) {
    if (!catalogue) throw new Error('Refresh the catalogue and try again.')
    const result = await saveOnlineProduct(input, editing && editing !== 'new' ? editing.id : undefined, catalogue.revision, image, progress)
    setCatalogue(result); setToast('Product saved. Your changes are live.')
  }
  if (auth !== 'ready') return <main className="login-shell"><Brand/><section className="login-card"><div className="login-icon"><LockKeyhole size={24}/></div><p className="eyebrow">YORVIS ADMINISTRATION</p><h1>{auth === 'setup' ? 'Set up your admin' : 'Admin sign in'}</h1><p className="login-description">{auth === 'setup' ? 'Create the administrator account using the private setup token from your Vercel configuration.' : 'Sign in to manage your online product catalogue.'}</p>
    {auth === 'checking' ? <p role="status">Checking your session…</p> : auth === 'error' ? <><div className="notice error-note" role="alert">{error}</div><button className="primary-button" onClick={() => { setAuth('checking'); void checkAuth() }}>Try again</button></> : <form className="editor-form" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setError('')
      try {
        if (auth === 'setup' && password !== confirm) throw new Error('The passwords do not match.')
        await apiRequest(auth === 'setup' ? 'setup' : 'login', { email, password, ...(auth === 'setup' ? { setupToken } : {}) })
        setPassword(''); setConfirm(''); setSetupToken(''); await checkAuth()
      } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
    }}>
      <label className="field-label">Email address<input type="email" required autoComplete="username" value={email} maxLength={254} disabled={busy} onChange={e => setEmail(e.target.value)}/></label>
      {auth === 'setup' && <label className="field-label">Private setup token<input type="password" required autoComplete="off" value={setupToken} disabled={busy} onChange={e => setSetupToken(e.target.value)}/></label>}
      <label className="field-label">Password<input type="password" required minLength={auth === 'setup' ? 12 : undefined} maxLength={256} autoComplete={auth === 'setup' ? 'new-password' : 'current-password'} value={password} disabled={busy} onChange={e => setPassword(e.target.value)}/>{auth === 'setup' && <small>Use at least 12 characters.</small>}</label>
      {auth === 'setup' && <label className="field-label">Confirm password<input type="password" required minLength={12} autoComplete="new-password" value={confirm} disabled={busy} onChange={e => setConfirm(e.target.value)}/></label>}
      {error && <div className="notice error-note" role="alert">{error}</div>}
      <button className="primary-button" disabled={busy}>{busy ? 'Please wait…' : auth === 'setup' ? 'Create administrator' : 'Sign in'}</button>
    </form>}
    <a className="login-back" href="/">Back to catalogue</a>
  </section></main>
  return <>
    <header className="site-header"><div className="header-inner"><Brand/><span className="header-descriptor">ONLINE ADMIN</span><button className="contact-link secondary-button" disabled={busy} onClick={async () => { setBusy(true); try { await apiRequest('logout', {}); setCatalogue(null); setAuth('login'); setEditing(null); setError(''); history.replaceState(null, '', `${ADMIN_PATH}/login`) } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) } }}><LogOut size={16}/>Sign out</button></div></header>
    <main className="admin-shell"><div className="admin-top"><div><p className="eyebrow"><span/> LIVE PRODUCT MANAGEMENT</p><h1>Catalogue admin<span>.</span></h1><p>Manage products, images and availability. Saved changes appear online.</p></div><div className="admin-actions"><button className="secondary-button" disabled={busy} onClick={async () => { setBusy(true); try { await refresh(); setError('') } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) } }}><RefreshCw size={16}/>Refresh</button><a className="secondary-button" href="/" target="_blank" rel="noopener noreferrer">View catalogue</a></div></div>
      {error && <div className="notice error-note" role="alert">{error}</div>}
      <div className="admin-toolbar"><div className="search-field"><Search size={19}/><input aria-label="Search admin products" placeholder="Search products by name or code..." maxLength={160} value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}/></div><span className="admin-count">{products.length} products · {products.filter(p => p.is_active).length} active</span><button className="primary-button" disabled={busy || !catalogue} onClick={() => setEditing('new')}><Plus size={17}/>Add product</button></div>
      {!catalogue ? <div className="empty-state" role="status">Loading products…</div> : !filtered.length ? <div className="empty-state"><Search size={35}/><h2>{search ? 'No products found' : 'Your catalogue starts here'}</h2><p>{search ? 'Try another name or product code.' : 'Add your first product and it will appear in your online catalogue.'}</p></div> : <>
        <div className="table-wrap"><table><thead><tr><th>Product</th><th>Visibility</th><th>Order</th><th>Actions</th></tr></thead><tbody>{filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(product => { const index = products.findIndex(p => p.id === product.id); return <tr key={product.id}>
          <td><div className="table-product"><img src={product.image_url} alt={product.title}/><div><strong>{product.title}</strong><small>{product.product_code || 'No product code'}</small></div></div></td>
          <td><button className={`status-toggle ${product.is_active ? '' : 'inactive'}`} disabled={busy} aria-label={`${product.is_active ? 'Deactivate' : 'Activate'} ${product.title}`} onClick={() => void mutate('toggle', { id: product.id, is_active: !product.is_active })}>{product.is_active ? 'Active' : 'Inactive'}</button></td>
          <td><div className="row-actions"><button className="icon-button" disabled={busy || !!search || index === 0} aria-label={`Move ${product.title} up`} onClick={() => void mutate('move', { id: product.id, direction: -1 })}><ArrowUp size={16}/></button><button className="icon-button" disabled={busy || !!search || index === products.length - 1} aria-label={`Move ${product.title} down`} onClick={() => void mutate('move', { id: product.id, direction: 1 })}><ArrowDown size={16}/></button></div></td>
          <td><div className="row-actions"><button className="icon-button" aria-label={`Preview ${product.title}`} onClick={() => setPreview(product)}><Eye size={16}/></button><button className="icon-button" disabled={busy} aria-label={`Edit ${product.title}`} onClick={() => setEditing(product)}><Edit3 size={16}/></button><button className="icon-button delete" disabled={busy} aria-label={`Delete ${product.title}`} onClick={() => setDeleting(product)}><Trash2 size={16}/></button></div></td>
        </tr> })}</tbody></table></div><div className="admin-pagination"><Pagination page={page} pages={pages} onChange={setPage}/></div>
      </>}
    </main>
    {editing && <ProductEditor product={editing === 'new' ? null : editing} imageUrl={editing === 'new' ? undefined : editing.image_url} onSave={save} onClose={() => setEditing(null)} saveLabel="Save product"/>}
    {preview && <Modal title="Product preview" small onClose={() => setPreview(null)}><div className="editor-preview"><ProductCard product={preview} preview/></div><div className="dialog-footer"><button className="secondary-button" onClick={() => setPreview(null)}>Close preview</button></div></Modal>}
    {deleting && <Modal title="Delete product?" small busy={busy} onClose={() => setDeleting(null)}><div className="confirm-body">Delete <strong>{deleting.title}</strong> and its image from the online catalogue? This cannot be undone.</div><div className="dialog-footer"><button className="secondary-button" disabled={busy} onClick={() => setDeleting(null)}>Cancel</button><button className="danger-button" disabled={busy} onClick={() => void mutate('delete', { id: deleting.id })}>{busy ? 'Deleting…' : 'Delete product'}</button></div></Modal>}
    {toast && <div className="toast" role="status">{toast}<button aria-label="Dismiss notification" onClick={() => setToast('')}><X size={16}/></button></div>}
  </>
}
