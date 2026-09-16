import { describe, expect, it } from 'vitest'
import { normaliseSiteUrl, sharingTags, SHARE_TITLE } from './socialMetadata'

describe('static sharing metadata', () => {
  it('emits absolute public URLs, an image description and correct dimensions', () => {
    const { tags, origin } = sharingTags(' https://catalogue.yorvis.test ', { width: 1731, height: 909 })
    expect(origin).toBe('https://catalogue.yorvis.test/')
    const content = (key: string) => tags.find(tag => tag.attrs.property === key || tag.attrs.name === key)?.attrs.content
    expect(content('og:title')).toBe(SHARE_TITLE)
    expect(content('og:url')).toBe(origin)
    expect(content('og:image')).toBe('https://catalogue.yorvis.test/yorvis-share.png')
    expect(content('og:image:width')).toBe('1731')
    expect(content('og:image:height')).toBe('909')
    expect(content('twitter:image')).toBe(content('og:image'))
    expect(content('twitter:card')).toBe('summary_large_image')
  })
  it('does not invent a domain or publish a broken image URL before deployment', () => {
    const { origin, tags } = sharingTags('', { width: 1731, height: 909 })
    expect(origin).toBeNull()
    expect(tags.some(tag => tag.attrs.property === 'og:image' || tag.attrs.property === 'og:url')).toBe(false)
    expect(tags.some(tag => tag.attrs.property === 'og:title')).toBe(true)
  })
  it.each(['http://yorvis.test', 'https://localhost', 'https://yorvis.test/catalogue', 'https://yorvis.test/?token=secret', 'https://user:password@yorvis.test', 'javascript:alert(1)', 'not-a-url'])(
    'rejects invalid deployment URL %s', value => expect(() => normaliseSiteUrl(value)).toThrow(),
  )
})
