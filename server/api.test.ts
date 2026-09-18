import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { get } from '@vercel/blob'

vi.mock('@vercel/blob', async (importOriginal) => ({
  ...await importOriginal<typeof import('@vercel/blob')>(),
  get: vi.fn(),
}))

const origin = 'https://manhole-catalogue.vercel.app'
async function session() {
  const { default: api } = await import('../api/catalogue')
  return api.fetch(new Request(`${origin}/api/catalogue?action=session`))
}

beforeEach(() => {
  vi.resetModules()
  vi.stubEnv('BLOB_READ_WRITE_TOKEN', '')
  vi.stubEnv('BLOB_STORE_ID', '')
  vi.stubEnv('VERCEL_OIDC_TOKEN', '')
  vi.mocked(get).mockReset().mockResolvedValue(null)
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('production API storage configuration', () => {
  it('keeps admin closed and the bundled catalogue available without a store', async () => {
    vi.stubEnv('BLOB_STORE_ID', ' ')
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', ' ')
    const response = await session()
    expect(response.status).toBe(503)
    expect((await response.json()).code).toBe('SETUP_REQUIRED')
    const { default: api } = await import('../api/catalogue')
    const catalogue = await api.fetch(new Request(`${origin}/api/catalogue?action=public`))
    expect(catalogue.status).toBe(200)
    expect((await catalogue.json()).products.length).toBeGreaterThan(0)
    expect(get).not.toHaveBeenCalled()
  })

  it.each([
    ['BLOB_READ_WRITE_TOKEN', 'test-only-read-write-token'],
    ['BLOB_STORE_ID', 'store_test-only-oidc-store'],
  ])('checks the private account with %s configured', async (variable, value) => {
    vi.stubEnv(variable, value)
    const response = await session()
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ authenticated: false, needsSetup: true })
    expect(get).toHaveBeenCalledWith('auth/admin.json', { access: 'private', useCache: false, headers: { 'Accept-Encoding': 'identity' } })
  })

  it('still denies access if the configured store rejects its credentials', async () => {
    vi.stubEnv('BLOB_STORE_ID', 'store_test-only-oidc-store')
    vi.mocked(get).mockRejectedValue(new Error('Credential rejected: secret-must-stay-private'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await session()
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'The service is temporarily unavailable. Please try again.' })
  })
})
