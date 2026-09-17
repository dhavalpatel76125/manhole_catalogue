import { beforeEach, describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { createHandler } from './handler'
import { ConflictError, type CatalogueStore, type RecordResult } from './store'

class MemoryStore implements CatalogueStore {
  records = new Map<string, RecordResult<any>>()
  images = new Map<string, Uint8Array>()
  counter = 0
  async read<T>(key: string) { return structuredClone(this.records.get(key) || null) as RecordResult<T> | null }
  async write<T>(key: string, value: T, previous: string | null) {
    if ((this.records.get(key)?.etag || null) !== previous) throw new ConflictError('Conflict')
    const etag = String(++this.counter); this.records.set(key, { value: structuredClone(value), etag }); return etag
  }
  async remove(key: string) { this.records.delete(key); this.images.delete(key) }
  async image(key: string) { const bytes = this.images.get(key); return bytes ? new Response(Buffer.from(bytes)).body : null }
  async putImage(key: string, bytes: Uint8Array) { this.images.set(key, bytes) }
}
const origin = 'https://catalogue.test'
const setupToken = 'test-only-setup-token-at-least-32-characters'
const password = 'Test-only long password 724!'
let store: MemoryStore
let handler: ReturnType<typeof createHandler>
let clock: number
function request(action: string, body?: unknown, cookie?: string, overrideOrigin = origin) {
  return new Request(`${origin}/api/catalogue?action=${action}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Origin: overrideOrigin, ...(cookie ? { Cookie: cookie } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}
async function register() {
  const response = await handler(request('setup', { email: 'admin@gmail.com', password, setupToken }))
  expect(response.status).toBe(201)
  return response.headers.get('set-cookie')!.split(';')[0]
}
async function save(cookie: string, revision: number, title = 'LED Flood Light', id?: string, bytes?: Uint8Array, details: Record<string, string> = {}) {
  const form = new FormData()
  form.append('product', JSON.stringify({ id, revision, title, product_code: 'YRV-001', price: null, is_active: true, ...details }))
  if (!id || bytes) {
    const image = bytes || await sharp({ create: { width: 2000, height: 1000, channels: 3, background: '#f0f0f0' } }).png().toBuffer()
    form.append('image', new Blob([new Uint8Array(image)], { type: 'image/png' }), 'light.png')
  }
  return handler(new Request(`${origin}/api/catalogue?action=save`, { method: 'POST', headers: { Origin: origin, Cookie: cookie }, body: form }))
}
beforeEach(() => {
  store = new MemoryStore(); clock = Date.now()
  handler = createHandler(store, { origin, email: 'admin@gmail.com', setupToken, configured: true, now: () => clock })
})
describe('online administration security', () => {
  it('rejects unauthenticated reads and every modification', async () => {
    expect((await handler(request('admin'))).status).toBe(401)
    for (const action of ['save', 'delete', 'toggle', 'move']) expect((await handler(request(action, {}))).status).toBe(401)
    expect((await handler(request('public'))).status).toBe(200)
    expect(store.records.size).toBe(0)
  })
  it('requires the setup token, configured email, strong password and same origin', async () => {
    expect((await handler(request('setup', { email: 'admin@gmail.com', password, setupToken: 'wrong' }))).status).toBe(401)
    expect((await handler(request('setup', { email: 'other@example.test', password, setupToken }))).status).toBe(400)
    expect((await handler(request('setup', { email: 'admin@gmail.com', password: '1234', setupToken }))).status).toBe(400)
    expect((await handler(request('setup', {}, undefined, 'https://attacker.test'))).status).toBe(403)
    expect((await handler(request('login', null))).status).toBe(400)
    expect(store.records.has('auth/admin.json')).toBe(false)
  })
  it('stores password hashes and issues secure expiring, revocable sessions', async () => {
    const cookie = await register()
    const account = store.records.get('auth/admin.json')!.value
    expect(account.passwordHash).not.toContain(password)
    expect(account.passwordHash).toMatch(/^[a-f0-9]{32}:[a-f0-9]{128}$/)
    const response = await handler(request('login', { email: 'admin@gmail.com', password }))
    expect(response.status).toBe(200)
    expect(response.headers.get('set-cookie')).toContain('HttpOnly; Secure; SameSite=Strict; Max-Age=28800')
    expect((await handler(request('admin', undefined, cookie))).status).toBe(200)
    expect((await handler(request('setup', { email: 'admin@gmail.com', password, setupToken }))).status).toBe(409)
    expect((await handler(request('login', { email: 'admin@gmail.com', password: 'incorrect' }))).status).toBe(401)
    await handler(request('logout', {}, cookie))
    expect((await handler(request('admin', undefined, cookie))).status).toBe(401)
    const secondCookie = response.headers.get('set-cookie')!.split(';')[0]
    clock += 8 * 60 * 60 * 1000 + 1
    expect((await handler(request('admin', undefined, secondCookie))).status).toBe(401)
  })
  it('limits repeated login attempts across requests', async () => {
    await register()
    for (let i = 0; i < 10; i++) expect((await handler(request('login', { email: 'admin@gmail.com', password: 'wrong' }))).status).toBe(401)
    expect((await handler(request('login', { email: 'admin@gmail.com', password }))).status).toBe(429)
    clock += 15 * 60 * 1000 + 1
    expect((await handler(request('login', { email: 'admin@gmail.com', password }))).status).toBe(200)
  })
  it('fails closed when online storage is not configured', async () => {
    const offline = createHandler(store, { origin, email: 'admin@gmail.com', setupToken: '', configured: false })
    expect((await offline(request('public'))).status).toBe(200)
    expect((await offline(request('session'))).status).toBe(503)
    expect((await offline(request('save', {}))).status).toBe(503)
  })
})
describe('online catalogue operations', () => {
  it('creates, resizes, hides, edits, orders and deletes products and images', async () => {
    const cookie = await register()
    const created = await save(cookie, 0); expect(created.status).toBe(200)
    const first = (await created.json()).products[0]
    const metadata = await sharp(store.images.get(`images/${first.image_path}`)!).metadata()
    expect([metadata.width, metadata.height, metadata.format]).toEqual([1600, 800, 'webp'])
    expect((await handler(new Request(origin + first.image_url))).status).toBe(200)
    let response = await handler(request('toggle', { id: first.id, revision: 1, is_active: false }, cookie))
    expect(response.status).toBe(200)
    expect((await (await handler(request('public'))).json()).products).toHaveLength(0)
    expect((await handler(new Request(origin + first.image_url))).status).toBe(404)
    expect((await handler(new Request(origin + first.image_url, { headers: { Cookie: cookie } }))).status).toBe(200)
    const replacement = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#fff' } }).png().toBuffer()
    response = await save(cookie, 2, 'Updated Light', first.id, replacement)
    expect(response.status).toBe(200)
    const updated = (await response.json()).products[0]
    expect(store.images.has(`images/${first.image_path}`)).toBe(false)
    expect(store.records.get('catalogue/state.json')!.value.garbage).toEqual([])
    response = await save(cookie, 3, 'Second Light'); const second = (await response.json()).products[1]
    response = await handler(request('move', { id: second.id, revision: 4, direction: -1 }, cookie))
    expect((await response.json()).products[0].id).toBe(second.id)
    response = await handler(request('delete', { id: updated.id, revision: 5 }, cookie))
    expect((await response.json()).products).toHaveLength(1)
    expect(store.images.has(`images/${updated.image_path}`)).toBe(false)
  })
  it('rejects stale writes, forged images, invalid products and cross-origin edits', async () => {
    const cookie = await register()
    const created = await save(cookie, 0); const first = (await created.json()).products[0]
    expect((await handler(request('delete', { id: first.id, revision: 0 }, cookie))).status).toBe(409)
    expect((await handler(request('delete', { id: first.id, revision: 1 }, cookie, 'https://evil.test'))).status).toBe(403)
    expect((await save(cookie, 1, '<script>')).status).toBe(400)
    expect((await save(cookie, 1, 'Invalid Image', undefined, new TextEncoder().encode('not a PNG'))).status).toBe(400)
    expect((await (await handler(request('public'))).json()).products).toHaveLength(1)
    expect(store.images.size).toBe(1)
  })
})

it('persists Fibro filters and descriptions through create, edit, admin and public responses', async () => {
 const cookie=await register()
 const details={load_capacity:'60 ton',size:'800 × 800 mm',clear_opening:'700 × 700 mm',frame_size:'800 × 800 mm',cover_size:'750 × 750 mm'}
 const created=await save(cookie,0,'FRP Cover',undefined,undefined,details)
 expect(created.status).toBe(200)
 const product=(await created.json()).products[0]
 expect(product).toMatchObject(details)
 const edited=await save(cookie,1,'FRP Cover',product.id,undefined,{...details,load_capacity:'65 ton',cover_size:'755 × 755 mm'})
 expect(edited.status).toBe(200)
 for(const action of ['admin','public']) {
  const response=await handler(request(action,undefined,cookie))
  expect((await response.json()).products[0]).toMatchObject({...details,load_capacity:'65 ton',cover_size:'755 × 755 mm'})
 }
})
