import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import type { CatalogueStore } from './store.js'
import { ConflictError } from './store.js'

const scrypt = promisify(scryptCallback)
export const SESSION_SECONDS = 8 * 60 * 60
export const COOKIE_NAME = '__Host-yorvis_admin'
export interface AdminAccount { email: string; passwordHash: string; version: string }
interface Session { email: string; version: string; expiresAt: number }
export function digest(value: string) { return createHash('sha256').update(value).digest('hex') }
export function equalSecret(a: string, b: string) { return timingSafeEqual(Buffer.from(digest(a), 'hex'), Buffer.from(digest(b), 'hex')) }
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex')
  const key = await scrypt(password, salt, 64) as Buffer
  return `${salt}:${key.toString('hex')}`
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':')
  if (!salt || !/^[a-f0-9]{128}$/.test(hash || '')) return false
  const key = await scrypt(password, salt, 64) as Buffer
  return timingSafeEqual(key, Buffer.from(hash, 'hex'))
}
export function sessionCookie(value: string, expires = SESSION_SECONDS) {
  return `${COOKIE_NAME}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${expires}`
}
export function sessionToken(request: Request) {
  const value = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`${COOKIE_NAME}=`))?.slice(COOKIE_NAME.length + 1)
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null
}
export async function checkSession(request: Request, store: CatalogueStore, now: number) {
  const token = sessionToken(request)
  if (!token) return null
  const session = await store.read<Session>(`auth/sessions/${digest(token)}.json`)
  if (!session || session.value.expiresAt <= now) return null
  const admin = await store.read<AdminAccount>('auth/admin.json')
  if (!admin || session.value.version !== admin.value.version || session.value.email !== admin.value.email) return null
  return { token, email: session.value.email }
}
export async function createSession(store: CatalogueStore, admin: AdminAccount, now: number) {
  const token = randomBytes(32).toString('hex')
  await store.write(`auth/sessions/${digest(token)}.json`, { email: admin.email, version: admin.version, expiresAt: now + SESSION_SECONDS * 1000 }, null)
  return sessionCookie(token)
}

// Atomic shared counters persist across serverless instances; failures are closed.
export async function rateLimit(store: CatalogueStore, key: string, now: number, limit = 10) {
  const path = `auth/rate/${digest(key)}.json`
  for (let attempt = 0; attempt < 6; attempt++) {
    const current = await store.read<{ count: number; until: number }>(path)
    const record = current && current.value.until > now ? current.value : { count: 0, until: now + 15 * 60 * 1000 }
    if (record.count >= limit) return false
    try { await store.write(path, { ...record, count: record.count + 1 }, current?.etag || null); return true }
    catch (error) { if (!(error instanceof ConflictError)) throw error }
  }
  return false
}
