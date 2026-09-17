import { randomBytes, randomUUID } from 'node:crypto'
import sharp from 'sharp'
import type { Product } from '../src/types.js'
import { parseCatalogue, validateProduct } from '../shared/catalogue.js'
import type { CatalogueStore } from './store.js'
import { ConflictError } from './store.js'
import { checkSession, createSession, digest, equalSecret, hashPassword, rateLimit, sessionCookie, sessionToken, verifyPassword, type AdminAccount } from './security.js'
import { PRODUCT_ID } from '../shared/whatsapp.js'
import { productPage, productPreview, unavailableProductPage } from './product-share.js'

interface State { version: 1; revision: number; products: Product[]; garbage: string[] }
interface Configuration { origin: string; email: string; setupToken: string; configured: boolean; now?: () => number; initialProducts?: Product[]; whatsappNumber?: string; readStaticImage?: (name: string) => Promise<Uint8Array | null> }
class HttpError extends Error { constructor(public status: number, message: string) { super(message) } }
function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', ...extra } })
}
async function bodyBytes(request: Request, max: number) {
  if (Number(request.headers.get('content-length') || 0) > max) throw new HttpError(413, 'This request is too large.')
  const reader = request.body?.getReader()
  if (!reader) return new Uint8Array()
  const chunks: Uint8Array[] = []; let size = 0
  for (;;) {
    const { done, value } = await reader.read(); if (done) break
    size += value.length
    if (size > max) { await reader.cancel(); throw new HttpError(413, 'This request is too large.') }
    chunks.push(value)
  }
  return Buffer.concat(chunks)
}
async function bodyJson(request: Request) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Expected JSON.')
  try { return JSON.parse(Buffer.from(await bodyBytes(request, 256 * 1024)).toString()) }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, 'Invalid JSON.') }
}
function publicProducts(products: Product[]) { return products.filter(p => p.is_active) }

export function createHandler(store: CatalogueStore, config: Configuration) {
  const now = config.now || Date.now
  async function state() {
    const record = await store.read<State>('catalogue/state.json')
    return record || { value: { version: 1 as const, revision: 0, products: config.initialProducts || [], garbage: [] }, etag: null }
  }
  async function cleanup(value: State, etag: string) {
    const referenced = new Set(value.products.map(p => p.image_path))
    const removed = new Set<string>()
    for (const name of value.garbage.slice(0, 50)) {
      if (!referenced.has(name)) {
        try { await store.remove(`images/${name}`); removed.add(name) } catch { /* Retained in the queue for retry on the next save. */ }
      }
    }
    if (removed.size) {
      try { await store.write('catalogue/state.json', { ...value, garbage: value.garbage.filter(name => !removed.has(name)) }, etag) }
      catch { /* Another edit won; its queue remains available for retry. */ }
    }
  }
  return async function handler(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const action = url.searchParams.get('action') || 'public'
    try {
      if (['GET', 'HEAD'].includes(request.method) && ['product', 'product-preview'].includes(action)) {
        const respond = (body: BodyInit, contentType: string, status = 200) => new Response(request.method === 'HEAD' ? null : body, { status, headers: { 'Content-Type': contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
        const missing = () => respond(unavailableProductPage(), 'text/html; charset=utf-8', 404)
        const id = url.searchParams.get('id') || ''
        if (!PRODUCT_ID.test(id)) return missing()
        const products = config.configured ? (await state()).value.products : config.initialProducts || []
        // Visibility is checked on every request, including image requests and
        // authenticated visitors. A shared link never exposes a hidden item.
        const product = products.find(p => p.id === id && p.is_active)
        if (!product) return missing()
        if (action === 'product') return respond(productPage(product, config.origin, config.whatsappNumber || '917990907899'), 'text/html; charset=utf-8')
        const name = product.image_path
        if (!/^[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg)$/.test(name)) return missing()
        let bytes: Uint8Array | null = null
        if (product.image_url === `/catalogue/images/${name}`) bytes = await config.readStaticImage?.(name) || null
        else if (product.image_url === `/api/catalogue?action=image&name=${name}` && config.configured) {
          const stream = await store.image(`images/${name}`)
          if (stream) bytes = new Uint8Array(await new Response(stream).arrayBuffer())
        }
        if (!bytes?.length || bytes.length > 3 * 1024 * 1024) return missing()
        return respond(new Uint8Array(await productPreview(bytes)), 'image/jpeg')
      }
      if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, POST' })
      if (request.method === 'POST' && request.headers.get('origin') !== config.origin) throw new HttpError(403, 'Request origin is not allowed.')
      if (!config.configured) {
        if (request.method === 'GET' && action === 'public') return json({ version: 1, products: publicProducts(config.initialProducts || []) })
        return json({ error: 'Online storage has not been connected yet. Connect a private Vercel Blob store and configure the admin setup token in Vercel.', code: 'SETUP_REQUIRED' }, 503)
      }
      if (request.method === 'GET' && action === 'public') return json({ version: 1, products: publicProducts((await state()).value.products) })
      if (request.method === 'GET' && action === 'image') {
        const name = url.searchParams.get('name') || ''
        if (!/^[a-f0-9-]{36}\.webp$/.test(name)) throw new HttpError(404, 'Image not found.')
        const catalogue = (await state()).value
        const product = catalogue.products.find(p => p.image_path === name)
        if (!product || (!product.is_active && !await checkSession(request, store, now()))) throw new HttpError(404, 'Image not found.')
        const stream = await store.image(`images/${name}`)
        if (!stream) throw new HttpError(404, 'Image not found.')
        return new Response(stream, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
      }
      if (request.method === 'GET' && action === 'session') {
        const admin = await store.read<AdminAccount>('auth/admin.json')
        const session = await checkSession(request, store, now())
        return json({ authenticated: !!session, email: session?.email, needsSetup: !admin })
      }
      if (request.method === 'POST' && ['login', 'setup'].includes(action)) {
        const body = await bodyJson(request)
        const ip = request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
        if (!await rateLimit(store, `${action}:${ip}`, now())) throw new HttpError(429, 'Too many attempts. Please try again in 15 minutes.')
        if (!body || typeof body.email !== 'string' || body.email.length > 254 || typeof body.password !== 'string' || body.password.length > 256) throw new HttpError(400, 'Enter a valid email and password.')
        const email = body.email.trim().toLowerCase()
        const account = await store.read<AdminAccount>('auth/admin.json')
        if (action === 'setup') {
          if (account) throw new HttpError(409, 'An administrator already exists. Sign in instead.')
          if (!config.setupToken || config.setupToken.length < 32 || typeof body.setupToken !== 'string' || !equalSecret(body.setupToken, config.setupToken)) throw new HttpError(401, 'Invalid setup token.')
          if (email !== config.email.toLowerCase()) throw new HttpError(400, 'Use the administrator email configured for this website.')
          if (body.password.length < 12) throw new HttpError(400, 'Choose a password with at least 12 characters.')
          const admin = { email, passwordHash: await hashPassword(body.password), version: randomBytes(16).toString('hex') }
          await store.write('auth/admin.json', admin, null)
          return json({ ok: true, email }, 201, { 'Set-Cookie': await createSession(store, admin, now()) })
        }
        if (!account) throw new HttpError(401, 'Administrator setup is required.')
        const passwordValid = await verifyPassword(body.password, account.value.passwordHash)
        if (email !== account.value.email || !passwordValid) throw new HttpError(401, 'Email or password is incorrect.')
        return json({ ok: true, email }, 200, { 'Set-Cookie': await createSession(store, account.value, now()) })
      }
      if (request.method === 'POST' && action === 'logout') {
        const token = sessionToken(request)
        if (token) await store.remove(`auth/sessions/${digest(token)}.json`)
        return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie('', 0) })
      }
      const session = await checkSession(request, store, now())
      if (!session) throw new HttpError(401, 'Your session has expired. Please sign in again.')
      if (request.method === 'GET' && action === 'admin') {
        const current = (await state()).value
        return json({ version: 1, revision: current.revision, products: current.products })
      }
      if (request.method !== 'POST' || !['save', 'delete', 'toggle', 'move'].includes(action)) throw new HttpError(404, 'Unknown action.')
      const current = await state()
      let input: any
      let upload: File | null = null
      if (action === 'save') {
        if (!request.headers.get('content-type')?.startsWith('multipart/form-data;')) throw new HttpError(415, 'Expected a product form.')
        const bytes = await bodyBytes(request, 4 * 1024 * 1024)
        let form: FormData
        try { form = await new Response(Buffer.from(bytes), { headers: { 'Content-Type': request.headers.get('content-type')! } }).formData(); input = JSON.parse(String(form.get('product'))) }
        catch { throw new HttpError(400, 'Invalid product form.') }
        const file = form.get('image'); if (file instanceof File) upload = file
      } else input = await bodyJson(request)
      if (!input || !Number.isSafeInteger(input.revision) || input.revision !== current.value.revision) throw new HttpError(409, 'Products changed in another session. Refresh the list and try again.')
      let products = [...current.value.products]
      const garbage = [...current.value.garbage]
      const index = products.findIndex(p => p.id === input.id)
      let uploadedName: string | null = null
      if (action === 'save') {
        let clean
        try { clean = validateProduct(input) } catch (error) { throw new HttpError(400, (error as Error).message) }
        if (input.id && index < 0) throw new HttpError(404, 'Product not found.')
        if (!input.id && products.length >= 10000) throw new HttpError(400, 'Catalogue product limit reached.')
        const existing = products[index]
        if (!existing && !upload) throw new HttpError(400, 'A product image is required.')
        let name = existing?.image_path
        if (upload) {
          if (!['image/jpeg', 'image/png', 'image/webp'].includes(upload.type) || upload.size > 3 * 1024 * 1024 || !upload.size) throw new HttpError(400, 'Upload a JPG, PNG or WebP image of 3 MB or smaller after compression.')
          let bytes: Buffer
          try {
            const image = sharp(Buffer.from(await upload.arrayBuffer()), { limitInputPixels: 40_000_000, animated: false })
            const metadata = await image.metadata()
            if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) throw new Error('Unsupported image')
            bytes = await image.rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()
            if (bytes.length > 3 * 1024 * 1024) throw new Error('Image too large')
          } catch { throw new HttpError(400, 'The image could not be processed. Please use a valid, smaller JPG, PNG or WebP image.') }
          name = `${randomUUID()}.webp`; uploadedName = name
          await store.putImage(`images/${name}`, bytes)
          if (existing?.image_url.startsWith('/api/')) garbage.push(existing.image_path)
        }
        const timestamp = new Date(now()).toISOString()
        const product: Product = { ...clean, id: existing?.id || randomUUID(), image_path: name!, image_url: upload ? `/api/catalogue?action=image&name=${name}` : existing.image_url, display_order: existing?.display_order ?? products.length, created_at: existing?.created_at || timestamp, updated_at: timestamp }
        if (existing) products[index] = product; else products.push(product)
      } else {
        if (index < 0) throw new HttpError(404, 'Product not found.')
        if (action === 'delete') { if (products[index].image_url.startsWith('/api/')) garbage.push(products[index].image_path); products.splice(index, 1) }
        if (action === 'toggle') {
          if (typeof input.is_active !== 'boolean') throw new HttpError(400, 'Invalid visibility.')
          products[index] = { ...products[index], is_active: input.is_active, updated_at: new Date(now()).toISOString() }
        }
        if (action === 'move') {
          if (![-1, 1].includes(input.direction)) throw new HttpError(400, 'Invalid order direction.')
          const target = index + input.direction
          if (target >= 0 && target < products.length) [products[index], products[target]] = [products[target], products[index]]
        }
      }
      products = products.map((p, i) => ({ ...p, display_order: i }))
      parseCatalogue({ version: 1, products })
      const next: State = { version: 1, revision: current.value.revision + 1, products, garbage: [...new Set(garbage)] }
      let savedEtag: string
      try { savedEtag = await store.write('catalogue/state.json', next, current.etag) }
      catch (error) {
        // A confirmed conflict means our new image is unused. On an ambiguous
        // network failure preserve it: the catalogue write may have succeeded.
        if (uploadedName && error instanceof ConflictError) { try { await store.remove(`images/${uploadedName}`) } catch {} }
        throw error
      }
      await cleanup(next, savedEtag)
      return json({ version: 1, revision: next.revision, products: next.products })
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status)
      if (error instanceof ConflictError) return json({ error: 'Products changed in another session. Refresh and try again.' }, 409)
      // Never return provider errors, tokens, stack traces or password hashes.
      console.error('Catalogue request failed:', error instanceof Error ? error.name : 'UnknownError')
      return json({ error: 'The service is temporarily unavailable. Please try again.' }, 503)
    }
  }
}
