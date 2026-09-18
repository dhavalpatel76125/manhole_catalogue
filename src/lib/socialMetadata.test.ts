import { describe, expect, it } from 'vitest'
import { normaliseSiteUrl, sharingTags, SHARE_TITLE } from './socialMetadata'

describe('static sharing metadata', () => {
  it('emits absolute public URLs, an image description and correct dimensions', () => {
    const { tags, origin } = sharingTags(' https://catalogue.fibro.test ', { width: 1200, height: 630 })
    expect(origin).toBe('https://catalogue.fibro.test/')
    const content = (key: string) => tags.find(tag => tag.attrs.property === key || tag.attrs.name === key)?.attrs.content
    expect(content('og:title')).toBe(SHARE_TITLE)
    expect(content('og:url')).toBe(origin)
    expect(content('og:image')).toBe('https://catalogue.fibro.test/fibro-catalogue-share-v3.jpg')
    expect(content('og:image:type')).toBe('image/jpeg')
    expect(content('og:image:width')).toBe('1200')
    expect(content('og:image:height')).toBe('630')
    expect(content('twitter:image')).toBe(content('og:image'))
    expect(content('twitter:card')).toBe('summary_large_image')
  })
  it('does not invent a domain or publish a broken image URL before deployment', () => {
    const { origin, tags } = sharingTags('', { width: 1200, height: 630 })
    expect(origin).toBeNull()
    expect(tags.some(tag => tag.attrs.property === 'og:image' || tag.attrs.property === 'og:url')).toBe(false)
    expect(tags.some(tag => tag.attrs.property === 'og:title')).toBe(true)
  })
  it.each(['http://fibro.test', 'https://localhost', 'https://fibro.test/catalogue', 'https://fibro.test/?token=secret', 'https://user:password@fibro.test', 'javascript:alert(1)', 'not-a-url'])(
    'rejects invalid deployment URL %s', value => expect(() => normaliseSiteUrl(value)).toThrow(),
  )
})
