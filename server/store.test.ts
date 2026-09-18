import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BlobPreconditionFailedError, get, put } from '@vercel/blob'
import { BlobStore, ConflictError } from './store'

vi.mock('@vercel/blob', async importOriginal => ({
  ...await importOriginal<typeof import('@vercel/blob')>(),
  get: vi.fn(), put: vi.fn(), del: vi.fn(),
}))

beforeEach(() => vi.clearAllMocks())

describe('private Blob record versions', () => {
  it('uses uncompressed reads so the returned ETag can be used for conditional saves', async () => {
    const etag = '"stored-revision-1"'
    vi.mocked(get).mockImplementation(async (_path, options) => ({
      statusCode: 200,
      stream: new Response(JSON.stringify({ revision: 1 })).body!,
      headers: new Headers(),
      // Compressed Blob GETs return a weak HTTP validator, which is rejected
      // by ifMatch even when the underlying record has not changed.
      blob: { etag: new Headers(options.headers).get('accept-encoding') === 'identity' ? etag : `W/${etag}` },
    } as Awaited<ReturnType<typeof get>>))
    vi.mocked(put).mockImplementation(async (_path, _body, options) => {
      if (options?.ifMatch !== etag) throw new BlobPreconditionFailedError()
      return { etag: '"stored-revision-2"' } as Awaited<ReturnType<typeof put>>
    })
    const store = new BlobStore()
    const current = await store.read<{ revision: number }>('catalogue/state.json')
    await expect(store.write('catalogue/state.json', { revision: 2 }, current!.etag)).resolves.toBe('"stored-revision-2"')
    expect(put).toHaveBeenCalledWith('catalogue/state.json', '{"revision":2}', expect.objectContaining({ allowOverwrite: true, ifMatch: etag }))
  })

  it('still rejects a genuine concurrent write without an unconditional retry', async () => {
    vi.mocked(put).mockRejectedValueOnce(new BlobPreconditionFailedError())
    await expect(new BlobStore().write('catalogue/state.json', { revision: 2 }, '"older-version"')).rejects.toBeInstanceOf(ConflictError)
    expect(put).toHaveBeenCalledTimes(1)
    expect(put).toHaveBeenCalledWith('catalogue/state.json', '{"revision":2}', expect.objectContaining({ ifMatch: '"older-version"' }))
  })

  it.each(['', 'W/"weak-version"'])('fails closed if storage still returns an unusable version: %s', async etag => {
    vi.mocked(get).mockResolvedValueOnce({ statusCode: 200, stream: new Response('{}').body!, headers: new Headers(), blob: { etag } } as Awaited<ReturnType<typeof get>>)
    await expect(new BlobStore().read('catalogue/state.json')).rejects.toThrow('Storage did not return a usable record version.')
    expect(put).not.toHaveBeenCalled()
  })
})
