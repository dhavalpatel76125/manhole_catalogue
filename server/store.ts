import { BlobPreconditionFailedError, del, get, put } from '@vercel/blob'

export class ConflictError extends Error {}
export interface RecordResult<T> { value: T; etag: string }
export interface CatalogueStore {
  read<T>(key: string): Promise<RecordResult<T> | null>
  write<T>(key: string, value: T, previous: string | null): Promise<string>
  remove(key: string): Promise<void>
  image(key: string): Promise<ReadableStream<Uint8Array> | null>
  putImage(key: string, bytes: Uint8Array): Promise<void>
}

export class BlobStore implements CatalogueStore {
  async read<T>(key: string): Promise<RecordResult<T> | null> {
    // Brotli/gzip responses weaken the HTTP ETag (W/"..."). Blob's ifMatch
    // requires the strong storage ETag, so JSON records must be read without
    // transfer compression. Keep origin reads to avoid stale catalogue data.
    const data = await get(key, { access: 'private', useCache: false, headers: { 'Accept-Encoding': 'identity' } })
    if (!data || data.statusCode !== 200) return null
    if (!data.blob.etag || data.blob.etag.startsWith('W/')) {
      await data.stream.cancel()
      throw new Error('Storage did not return a usable record version.')
    }
    return { value: await new Response(data.stream).json() as T, etag: data.blob.etag }
  }
  async write<T>(key: string, value: T, previous: string | null) {
    try {
      const result = await put(key, JSON.stringify(value), {
        access: 'private', addRandomSuffix: false, contentType: 'application/json',
        allowOverwrite: previous !== null, ...(previous ? { ifMatch: previous } : {}),
      })
      return result.etag
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) throw new ConflictError('This record changed. Reload and try again.')
      // Creation must be atomic too. An existing key can never be overwritten.
      if (previous === null && await this.read(key)) throw new ConflictError('This record already exists.')
      throw error
    }
  }
  async remove(key: string) { await del(key) }
  async image(key: string) {
    const result = await get(key, { access: 'private' })
    return result?.statusCode === 200 ? result.stream : null
  }
  async putImage(key: string, bytes: Uint8Array) {
    await put(key, Buffer.from(bytes), { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'image/webp' })
  }
}
