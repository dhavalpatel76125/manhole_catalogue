import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { createHandler } from '../server/handler'
import { BlobStore } from '../server/store'
import { parseCatalogue } from '../shared/catalogue'

const products = parseCatalogue(JSON.parse(await readFile('public/catalogue/products.json', 'utf8')))
const config = JSON.parse(await readFile('vercel.json', 'utf8'))
const securityHeaders = Object.fromEntries(config.headers[0].headers.map((header: { key: string; value: string }) => [header.key, header.value]))

for (const width of [320, 1440]) {
  test(`shared product photo, quantity and enquiry at ${width}px`, async ({ page, context, baseURL }) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    const handler = createHandler(new BlobStore(), {
      origin: baseURL!, email: '', setupToken: '', configured: false, initialProducts: products,
      readStaticImage: name => readFile(`public/catalogue/images/${name}`),
    })
    // Exercise the real server response and browser assets, including the
    // deployed CSP. Vercel's actual rewrites are checked after deployment.
    await page.route('**/products/**', async route => {
      const url = new URL(route.request().url())
      const [, , id, image] = url.pathname.split('/')
      const response = await handler(new Request(`${baseURL}/api/catalogue?action=${image ? 'product-preview' : 'product'}&id=${id}`))
      await route.fulfill({ status: response.status, headers: { ...securityHeaders, ...Object.fromEntries(response.headers) }, body: Buffer.from(await response.arrayBuffer()) })
    })
    // Intercept the external navigation: no WhatsApp message is sent.
    await context.route('https://wa.me/**', route => route.fulfill({ contentType: 'text/plain', body: 'WhatsApp enquiry destination verified.' }))
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(`/products/${products[0].id}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(products[0].title)
    await expect(page.locator('.photo img')).toBeVisible()
    await expect.poll(() => page.locator('.photo img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1200)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(page.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled()
    await page.getByRole('button', { name: 'Increase quantity' }).click({ clickCount: 2 })
    await page.getByRole('button', { name: 'Decrease quantity' }).click()
    await expect(page.getByLabel('Quantity', { exact: true })).toHaveValue('2')
    const enquiry = new URL((await page.getByRole('link', { name: 'Enquire on WhatsApp' }).getAttribute('href'))!)
    expect(enquiry.pathname).toBe('/917990907899')
    for (const value of [products[0].title, 'Quantity: 2.', products[0].product_code!, `/products/${products[0].id}?v=`]) expect(enquiry.searchParams.get('text')).toContain(value)
    await page.screenshot({ path: `test-results/shared-product-${width}.png`, fullPage: true })
    const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('link', { name: 'Enquire on WhatsApp' }).click()])
    await popup.waitForLoadState('domcontentloaded')
    expect(new URL(popup.url()).searchParams.get('text')).toBe(enquiry.searchParams.get('text'))
    await popup.close()
    await page.getByLabel('Quantity', { exact: true }).fill('9999')
    await page.getByLabel('Quantity', { exact: true }).blur()
    await expect(page.getByLabel('Quantity', { exact: true })).toHaveValue('999')
    await expect(page.getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
    await page.getByLabel('Quantity', { exact: true }).fill('0')
    await page.getByLabel('Quantity', { exact: true }).blur()
    await expect(page.getByLabel('Quantity', { exact: true })).toHaveValue('1')
    await expect(page.getByRole('link', { name: 'All products' })).toHaveAttribute('href', '/')
    expect(errors).toEqual([])
  })
}
