export const SHARE_TITLE = 'FIBRO INNOVATION SYSTEM | Product Catalogue'
export const SHARE_DESCRIPTION = 'Browse FRP manhole covers by load capacity and size. Choose your quantity and enquire directly on WhatsApp.'
export const SHARE_IMAGE_PATH = '/fibro-catalogue-share-v2.jpg'

export function normaliseSiteUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null
  let url: URL
  try { url = new URL(value.trim()) } catch { throw new Error('VITE_SITE_URL must be your full public HTTPS URL, for example https://catalogue.your-domain.com/.') }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/' || url.hostname === 'localhost' || !url.hostname.includes('.')) {
    throw new Error('VITE_SITE_URL must be a public HTTPS domain root, without a username, password, path, query or fragment.')
  }
  return url.href
}

// These tags are injected into the static HTML at build time. Link preview
// crawlers do not need to execute React or JavaScript to discover them.
export function sharingTags(siteUrl: string | undefined, imageSize: { width: number; height: number }) {
  const origin = normaliseSiteUrl(siteUrl)
  const meta = (attribute: 'property' | 'name', key: string, content: string) => ({ tag: 'meta', attrs: { [attribute]: key, content }, injectTo: 'head' as const })
  const tags = [
    meta('property', 'og:type', 'website'),
    meta('property', 'og:site_name', 'FIBRO INNOVATION SYSTEM'),
    meta('property', 'og:title', SHARE_TITLE),
    meta('property', 'og:description', SHARE_DESCRIPTION),
    meta('property', 'og:locale', 'en_IN'),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', SHARE_TITLE),
    meta('name', 'twitter:description', SHARE_DESCRIPTION),
  ]
  if (origin) {
    const image = new URL(SHARE_IMAGE_PATH, origin).href
    tags.push(
      meta('property', 'og:url', origin),
      meta('property', 'og:image', image),
      meta('property', 'og:image:secure_url', image),
      meta('property', 'og:image:type', 'image/jpeg'),
      meta('property', 'og:image:width', String(imageSize.width)),
      meta('property', 'og:image:height', String(imageSize.height)),
      meta('property', 'og:image:alt', 'FIBRO INNOVATION SYSTEM Product Catalogue — FRP Manhole Covers'),
      meta('name', 'twitter:image', image),
      meta('name', 'twitter:image:alt', 'FIBRO INNOVATION SYSTEM Product Catalogue — FRP Manhole Covers'),
    )
  }
  return { origin, tags }
}
