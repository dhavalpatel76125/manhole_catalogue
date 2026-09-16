import { parseCatalogue } from '../../shared/catalogue'
import { ONLINE_MODE } from './config'
export { parseCatalogue }
export async function readPublishedProducts(signal?: AbortSignal) {
  const response = await fetch(ONLINE_MODE ? '/api/catalogue' : '/catalogue/products.json', { cache: 'no-store', signal })
  if (!response.ok) throw new Error('The catalogue could not be loaded. Please try again.')
  return parseCatalogue(await response.json())
}
