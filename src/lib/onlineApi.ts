import { parseCatalogue } from './jsonCatalogue'
import type { Product, ProductInput } from '../types'
export interface OnlineCatalogue { revision: number; products: Product[] }
export class ApiError extends Error { constructor(message: string, public status: number) { super(message) } }
function failure(message: string, status: number) {
  if (status === 401) window.dispatchEvent(new Event('yorvis-session-expired'))
  return new ApiError(message, status)
}
export async function apiRequest(action: string, body?: unknown) {
  const response = await fetch(`/api/catalogue?action=${action}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) })
  const data = await response.json().catch(() => ({ error: 'The server returned an unexpected response. Please try again.' }))
  if (!response.ok) throw failure(data.error || 'The request failed.', response.status)
  return data
}
export function catalogueResponse(value: any): OnlineCatalogue {
  if (!Number.isSafeInteger(value.revision)) throw new Error('The server returned an invalid catalogue revision.')
  return { revision: value.revision, products: parseCatalogue(value) }
}
export function saveOnlineProduct(input: ProductInput, id: string | undefined, revision: number, image: Blob | null, progress: (value: number) => void): Promise<OnlineCatalogue> {
  if (image && image.size > 3 * 1024 * 1024) return Promise.reject(new Error('The compressed image is too large for online upload. Please select a smaller image.'))
  const form = new FormData(); form.append('product', JSON.stringify({ ...input, id, revision }))
  if (image) form.append('image', image, image.type === 'image/webp' ? 'product.webp' : image.type === 'image/jpeg' ? 'product.jpg' : 'product.png')
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest(); xhr.open('POST', '/api/catalogue?action=save'); xhr.withCredentials = true; xhr.timeout = 60000
    xhr.upload.onprogress = event => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)) }
    xhr.onerror = () => reject(new Error('Connection lost. Refresh the product list before retrying; the save may have completed.'))
    xhr.ontimeout = () => reject(new Error('The save timed out. Refresh the product list before retrying.'))
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status < 200 || xhr.status >= 300) reject(failure(data.error || 'The save failed.', xhr.status))
        else resolve(catalogueResponse(data))
      } catch (error) { reject(error instanceof Error ? error : new Error('The save could not be verified. Refresh the list.')) }
    }
    xhr.send(form)
  })
}
