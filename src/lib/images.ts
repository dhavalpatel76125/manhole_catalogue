export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export async function prepareImage(file: File, onProgress: (value: number) => void): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name)) throw new Error('Choose a JPG, JPEG, PNG or WebP image.')
  if (file.size > MAX_IMAGE_BYTES) throw new Error('The original image must be 5 MB or smaller.')
  if (!file.size) throw new Error('This image file is empty.')
  onProgress(10)
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' }) }
  catch { throw new Error('This file could not be decoded as an image. Choose a valid JPG, PNG or WebP file.') }
  try {
    if (bitmap.width * bitmap.height > 40_000_000) throw new Error('Image dimensions are too large. Please use an image below 40 megapixels.')
    onProgress(35)
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image processing is unavailable in this browser.')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    onProgress(70)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image compression failed.')), 'image/webp', .86))
    if (blob.size > MAX_IMAGE_BYTES) throw new Error('The processed image is still too large. Please use a smaller image.')
    onProgress(100)
    return blob
  } finally { bitmap.close() }
}
export function imageExtension(blob: Blob) { return blob.type === 'image/webp' ? 'webp' : blob.type === 'image/jpeg' ? 'jpg' : 'png' }
