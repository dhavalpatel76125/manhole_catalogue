import { strFromU8, strToU8, unzipSync, zip } from 'fflate'
import type { Product } from '../types'
import { parseCatalogue, readPublishedProducts } from './jsonCatalogue'
import { MAX_IMAGE_BYTES } from './images'

export interface Workspace { revision: number; products: Product[]; assets: Record<string, Blob> }
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('yorvis-local-editor', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('workspace')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(new Error('Local storage is unavailable. Allow browser storage to use the editor.'))
  })
}
export async function loadWorkspace(): Promise<Workspace> {
  const db = await openDatabase()
  const saved = await new Promise<Workspace | undefined>((resolve, reject) => {
    const transaction = db.transaction('workspace', 'readonly')
    const request = transaction.objectStore('workspace').get('catalogue')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    transaction.oncomplete = () => db.close()
  })
  return saved || { revision: 0, products: await readPublishedProducts(), assets: {} }
}
export async function saveWorkspace(workspace: Workspace): Promise<Workspace> {
  const referenced = new Set(workspace.products.map(p => p.image_path))
  const next = { ...workspace, revision: workspace.revision + 1, assets: Object.fromEntries(Object.entries(workspace.assets).filter(([path]) => referenced.has(path))) }
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('workspace', 'readwrite')
    const store = transaction.objectStore('workspace')
    let conflict = false
    const request = store.get('catalogue')
    request.onsuccess = () => {
      if ((request.result?.revision || 0) !== workspace.revision) { conflict = true; transaction.abort(); return }
      store.put(next, 'catalogue')
    }
    transaction.oncomplete = () => { db.close(); resolve(next) }
    transaction.onabort = () => { db.close(); reject(new Error(conflict ? 'The draft changed in another tab. Reload this editor before continuing.' : 'The draft could not be saved. Browser storage may be full. Export a backup and free some space.')) }
    transaction.onerror = () => { /* onabort reports errors */ }
  })
}
export async function exportWorkspace(workspace: Workspace, backup: boolean, progress: (message: string) => void) {
  const products = workspace.products.filter(p => backup || p.is_active)
  const folder = backup ? 'draft' : 'catalogue'
  const files: Record<string, Uint8Array> = {}
  files[`${folder}/products.json`] = strToU8(JSON.stringify({ version: 1, products }, null, 2))
  for (const [index, product] of products.entries()) {
    progress(`Preparing image ${index + 1} of ${products.length}…`)
    let image = workspace.assets[product.image_path]
    if (!image) {
      const response = await fetch(product.image_url, { cache: 'no-store' })
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image missing for ${product.title}. Replace its image before exporting.`)
      image = await response.blob()
    }
    files[`${folder}/images/${product.image_path}`] = new Uint8Array(await image.arrayBuffer())
  }
  files['README.txt'] = strToU8(backup
    ? 'YORVIS PRIVATE DRAFT BACKUP\nContains active and inactive products. Do not publish this archive. Import it with the local editor.\n'
    : 'YORVIS PUBLISHING BUNDLE\nOnly active products are included. Replace public/catalogue in the source project with this catalogue folder, then run npm run build and deploy dist. Or replace dist/catalogue before uploading the complete dist folder. Remove the old catalogue/images folder first to remove deleted/replaced images. Deploy atomically; never merge a bundle into an old deployment without removing obsolete images.\n')
  progress('Creating ZIP…')
  const zipped = await new Promise<Uint8Array>((resolve, reject) => zip(files, { level: 1 }, (error, data) => error ? reject(error) : resolve(data)))
  return new Blob([new Uint8Array(zipped)], { type: 'application/zip' })
}
export async function importWorkspace(file: File): Promise<Omit<Workspace, 'revision'>> {
  if (!/\.zip$/i.test(file.name) || file.size > 80 * 1024 * 1024) throw new Error('Choose a YORVIS ZIP archive of 80 MB or smaller.')
  let expanded = 0; let count = 0
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter(entry) {
    expanded += entry.originalSize; count++
    if (expanded > 200 * 1024 * 1024 || count > 10002) throw new Error('This archive is too large to import safely.')
    return /^(draft|catalogue)\/(products\.json|images\/[a-zA-Z0-9_-]+\.(webp|png|jpg|jpeg))$/.test(entry.name)
  } })
  const folder = files['draft/products.json'] ? 'draft' : 'catalogue'
  if (!files[`${folder}/products.json`]) throw new Error('The archive does not contain a YORVIS catalogue.')
  const products = parseCatalogue(JSON.parse(strFromU8(files[`${folder}/products.json`])))
  const assets: Record<string, Blob> = {}
  for (const product of products) {
    const bytes = files[`${folder}/images/${product.image_path}`]
    if (!bytes || bytes.length > MAX_IMAGE_BYTES) throw new Error(`Missing or oversized image for ${product.title}.`)
    const extension = product.image_path.split('.').pop()
    const blob = new Blob([new Uint8Array(bytes)], { type: extension === 'webp' ? 'image/webp' : extension === 'png' ? 'image/png' : 'image/jpeg' })
    let bitmap: ImageBitmap
    try { bitmap = await createImageBitmap(blob) } catch { throw new Error(`Invalid image for ${product.title}.`) }
    if (bitmap.width * bitmap.height > 40_000_000) { bitmap.close(); throw new Error(`Image dimensions are too large for ${product.title}.`) }
    bitmap.close(); assets[product.image_path] = blob
  }
  return { products, assets }
}
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10000)
}
