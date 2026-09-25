import { test, expect, type Page } from '@playwright/test'
import { createHandler } from '../server/handler'
import { ConflictError, type CatalogueStore, type RecordResult } from '../server/store'
import { PRODUCT_CATEGORIES } from '../shared/categories'
import type { Product } from '../src/types'

class TestStore implements CatalogueStore {
  records = new Map<string, RecordResult<any>>()
  images = new Map<string, Uint8Array>()
  counter = 0
  async read<T>(key: string) { return structuredClone(this.records.get(key) || null) as RecordResult<T> | null }
  async write<T>(key: string, value: T, previous: string | null) {
    if ((this.records.get(key)?.etag || null) !== previous) throw new ConflictError('Conflict')
    const etag = String(++this.counter)
    this.records.set(key, { value: structuredClone(value), etag })
    return etag
  }
  async remove(key: string) { this.records.delete(key); this.images.delete(key) }
  async image(key: string) { const bytes = this.images.get(key); return bytes ? new Response(Buffer.from(bytes)).body : null }
  async putImage(key: string, bytes: Uint8Array) { this.images.set(key, bytes) }
}
const origin = 'http://127.0.0.1:4173'
const first: Product = { id: '00000000-0000-4000-8000-000000000001', title: 'Existing cover', product_code: 'FIS-001', price: null, is_active: true, image_path: 'frp-020e11ac21c71203.webp', image_url: '/catalogue/images/frp-020e11ac21c71203.webp', display_order: 0, created_at: '2026-09-17T00:00:00Z', updated_at: '2026-09-17T00:00:00Z', load_capacity: '5 ton', size: '24 × 24 inch' }
const rows: Product[] = [
  first,
  ...Array.from({ length: 13 }, (_, i): Product => ({ ...first, id: '00000000-0000-4000-8000-' + String(i + 2).padStart(12, '0'), title: 'Manhole cover ' + i, category: PRODUCT_CATEGORIES[0], display_order: i + 1 })),
  { ...first, id: '00000000-0000-4000-8000-000000000020', title: 'Gully cover', category: PRODUCT_CATEGORIES[1], size: '30 × 30 inch', load_capacity: '10 ton', display_order: 20 },
  { ...first, id: '00000000-0000-4000-8000-000000000021', title: 'Tile insert cover', category: PRODUCT_CATEGORIES[2], size: '300 × 300 mm', display_order: 21 },
]
async function backend(page: Page) {
  const store = new TestStore()
  const setupToken = 'local-category-test-setup-token-only'
  const handler = createHandler(store, { configured: true, origin, email: 'test@example.test', setupToken, initialProducts: rows })
  // This account exists only in the in-memory test store; no production credentials or data.
  const setup = await handler(new Request(origin + '/api/catalogue?action=setup', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'test@example.test', password: 'Local-test-only-password', setupToken }) }))
  expect(setup.status).toBe(201)
  const cookie = setup.headers.get('set-cookie')!.split(';')[0]
  await page.route('**/api/catalogue*', async route => {
    const incoming = route.request()
    const response = await handler(new Request(incoming.url(), { method: incoming.method(), headers: { ...await incoming.allHeaders(), origin, cookie }, ...(incoming.method() === 'POST' ? { body: incoming.postDataBuffer() } : {}) }))
    await route.fulfill({ status: response.status, contentType: response.headers.get('content-type') || 'application/json', body: Buffer.from(await response.arrayBuffer()) })
  })
  return store
}
test('category filter combines with capacity and size, resets pagination, and keeps unassigned products unlabeled', async ({ page }) => {
  await backend(page)
  await page.goto('/')
  await expect(page.getByTestId('product-card')).toHaveCount(12)
  await expect(page.getByTestId('product-card').first().locator('.category-label')).toHaveCount(0)
  await page.getByRole('button', { name: 'Page 2', exact: true }).click()
  await page.getByLabel('Category', { exact: true }).selectOption(PRODUCT_CATEGORIES[1])
  await expect(page.getByTestId('product-card')).toHaveCount(1)
  await expect(page.getByTestId('product-card').locator('.category-label')).toHaveText(PRODUCT_CATEGORIES[1])
  await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByLabel('Load capacity', { exact: true }).locator('option')).toHaveText(['All load capacities', '10 ton'])
  await page.getByLabel('Load capacity', { exact: true }).selectOption('10 ton')
  await page.getByLabel('Size', { exact: true }).selectOption('30 × 30 inch')
  await page.getByLabel('Category', { exact: true }).selectOption(PRODUCT_CATEGORIES[2])
  await expect(page.getByLabel('Load capacity', { exact: true })).toHaveValue('')
  await expect(page.getByLabel('Size', { exact: true })).toHaveValue('')
  await expect(page.getByTestId('product-card')).toHaveCount(1)
  await expect(page.getByTestId('product-card').locator('.category-label')).toHaveText(PRODUCT_CATEGORIES[2])
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(page.getByTestId('product-card')).toHaveCount(12)
  await expect(page.getByTestId('product-card').first().locator('.category-label')).toHaveCount(0)
})
for (const width of [1440, 768, 320]) {
  test('category assignment persists through the real save handler and renders at ' + width + 'px', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    const store = await backend(page)
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/hdhdhdhhdhdcurioo')
    await page.getByRole('button', { name: 'Edit Existing cover', exact: true }).click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByLabel('Category', { exact: true })).toHaveValue('')
    await expect(dialog.locator('.category-label')).toHaveCount(0)
    await dialog.getByLabel('Category', { exact: true }).selectOption(PRODUCT_CATEGORIES[2])
    await expect(dialog.locator('.category-label')).toHaveText(PRODUCT_CATEGORIES[2])
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    await page.screenshot({ path: 'test-results/category-editor-' + width + '.png' })
    await dialog.getByRole('button', { name: 'Save product', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    expect((await store.read<any>('catalogue/state.json'))!.value.products[0].category).toBe(PRODUCT_CATEGORIES[2])
    await page.reload()
    await page.getByRole('button', { name: 'Edit Existing cover', exact: true }).click()
    await expect(dialog.getByLabel('Category', { exact: true })).toHaveValue(PRODUCT_CATEGORIES[2])
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await page.goto('/')
    await page.getByLabel('Category', { exact: true }).selectOption(PRODUCT_CATEGORIES[2])
    await expect(page.getByTestId('product-card')).toHaveCount(2)
    await expect(page.getByTestId('product-card').first().locator('.category-label')).toHaveText(PRODUCT_CATEGORIES[2])
    const url = new URL((await page.getByTestId('product-card').first().getByRole('link', { name: 'Buy on WhatsApp' }).getAttribute('href'))!)
    expect(url.searchParams.get('text')).toContain('Category: ' + PRODUCT_CATEGORIES[2])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: 'test-results/category-catalogue-' + width + '.png' })
    expect(errors).toEqual([])
  })
}

test('adding a categorized product publishes its label and clearing the category removes it', async ({ page }) => {
  const store = await backend(page)
  await page.goto('/hdhdhdhhdhdcurioo')
  await page.getByRole('button', { name: 'Add product', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Product title', { exact: true }).fill('New water gully cover')
  await dialog.getByLabel('Category', { exact: true }).selectOption(PRODUCT_CATEGORIES[1])
  await dialog.locator('input[type=file]').setInputFiles('public/catalogue/images/frp-020e11ac21c71203.webp')
  await expect(dialog.getByText(/Image ready/)).toBeVisible()
  await dialog.getByRole('button', { name: 'Save product', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  const saved = (await store.read<any>('catalogue/state.json'))!.value.products.find((p: Product) => p.title === 'New water gully cover')
  expect(saved.category).toBe(PRODUCT_CATEGORIES[1])
  await page.goto('/')
  await page.getByLabel('Category', { exact: true }).selectOption(PRODUCT_CATEGORIES[1])
  await expect(page.getByTestId('product-card')).toHaveCount(2)
  await expect(page.getByTestId('product-card').filter({ hasText: 'New water gully cover' }).locator('.category-label')).toHaveText(PRODUCT_CATEGORIES[1])
  await page.goto('/hdhdhdhhdhdcurioo')
  await page.getByLabel('Search admin products').fill('New water gully cover')
  await page.getByRole('button', { name: 'Edit New water gully cover', exact: true }).click()
  await dialog.getByLabel('Category', { exact: true }).selectOption('')
  await dialog.getByRole('button', { name: 'Save product', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await page.goto('/')
  await page.getByLabel('Search products', { exact: true }).fill('New water gully cover')
  await expect(page.getByTestId('product-card')).toHaveCount(1)
  await expect(page.getByTestId('product-card').locator('.category-label')).toHaveCount(0)
})
