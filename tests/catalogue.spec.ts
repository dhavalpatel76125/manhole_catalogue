import { test, expect, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { unzipSync, strFromU8 } from 'fflate'

const products = Array.from({ length: 26 }, (_, i) => ({ id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, title: `${i + 1}W LED Test Light`, product_code: `YRV-${String(i + 1).padStart(3, '0')}`, image_path: `test-${i}.png`, image_url: `/catalogue/images/test-${i}.png`, display_order: i, is_active: i !== 25, price: i === 0 ? 100 : null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }))
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6o0AAAAASUVORK5CYII=', 'base64')
async function seedPublic(page: Page, data = products) {
  await page.route('**/api/catalogue', route => route.fulfill({ json: { version: 1, products: data } }))
  await page.route('**/catalogue/images/*', route => route.fulfill({ contentType: 'image/png', body: pixel }))
}
test('search, pagination, independent counters, exact WhatsApp popup and no public editor', async ({ page, context }) => {
  await seedPublic(page); await page.goto('/')
  await expect(page.getByTestId('product-card')).toHaveCount(12)
  await expect(page.getByRole('button', { name: 'Previous' })).toBeDisabled()
  const first = page.getByTestId('product-card').first(); const second = page.getByTestId('product-card').nth(1)
  await expect(first.getByRole('button', { name: /Decrease/ })).toBeDisabled()
  await first.getByRole('button', { name: /Increase/ }).click({ clickCount: 2 })
  await expect(first.locator('output')).toHaveText('3'); await expect(second.locator('output')).toHaveText('1')
  await context.route('https://wa.me/**', route => route.fulfill({ body: 'WhatsApp destination verified', contentType: 'text/plain' }))
  const popupPromise = context.waitForEvent('page'); await first.getByRole('link', { name: 'Buy on WhatsApp' }).click(); const popup = await popupPromise
  await popup.waitForLoadState()
  expect(new URL(popup.url()).searchParams.get('text')).toBe('Hello, I want to buy 1W LED Test Light. Product code: YRV-001. Quantity: 3. Please share the price and availability.'); await popup.close()
  await page.getByRole('button', { name: 'Page 2', exact: true }).click(); await expect(page.getByTestId('product-card')).toHaveCount(12)
  await page.getByRole('button', { name: 'Next', exact: true }).click(); await expect(page.getByTestId('product-card')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()
  await page.getByRole('textbox', { name: 'Search products', exact: true }).fill('YRV-002')
  await expect(page.getByTestId('product-card')).toHaveCount(1); await expect(page.getByRole('heading', { name: '2W LED Test Light' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Page 1', exact: true })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('textbox', { name: 'Search products', exact: true }).fill('not found'); await expect(page.getByRole('heading', { name: 'No products found' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear search', exact: true }).first().click(); await expect(page.getByTestId('product-card')).toHaveCount(12)
  await expect(page.locator('a[href*="hdhd"]')).toHaveCount(0)
  await page.route('**/api/catalogue?action=session', route => route.fulfill({ json: { authenticated: false, needsSetup: false } }))
  await page.goto('/hdhdhdhhdhdcurioo'); await expect(page.getByRole('heading', { name: 'Admin sign in' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add product', exact: true })).toHaveCount(0)
})
for (const [width, columns] of [[1440, 4], [1100, 3], [768, 2], [390, 1]]) {
  test(`${width}px shows ${columns} columns and 12 products`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 }); await seedPublic(page); await page.goto('/')
    await expect(page.getByTestId('product-card')).toHaveCount(12)
    const actual = await page.locator('.product-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)
    expect(actual).toBe(columns)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  })
}
test('empty and failure states', async ({ page }) => {
  await seedPublic(page, []); await page.goto('/'); await expect(page.getByRole('heading', { name: 'Our catalogue is taking shape' })).toBeVisible()
  await page.route('**/api/catalogue', route => route.fulfill({ status: 500 })); await page.reload(); await expect(page.getByRole('heading', { name: 'We couldn’t load the catalogue' })).toBeVisible()
})

async function getWorkspace(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('yorvis-local-editor', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error) })
    const data = await new Promise<any>((resolve) => { const r = db.transaction('workspace').objectStore('workspace').get('catalogue'); r.onsuccess = () => resolve(r.result) }); db.close()
    return { products: data.products, assets: Object.keys(data.assets), revision: data.revision }
  })
}
async function addProduct(page: Page, name: string, file: Buffer) {
  await page.getByRole('button', { name: 'Add product', exact: true }).first().click()
  await page.getByLabel('Product title', { exact: true }).fill(name)
  await page.getByLabel(/Product code/).fill(name === 'Flood Light' ? 'FL-001' : 'ST-002')
  await page.locator('input[type=file]').last().setInputFiles({ name: 'light.png', mimeType: 'image/png', buffer: file })
  await expect(page.getByText(/Image ready/)).toBeVisible()
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}
test('local editor CRUD, image resize/replacement, persistence, ordering, visibility, preview and ZIP round trip', async ({ page }) => {
  await page.route('**/catalogue/products.json', route => route.fulfill({json:{version:1,products:[]}}))
  await page.goto('http://127.0.0.1:5173/hdhdhdhhdhdcurioo')
  await expect(page.getByRole('heading', { name: 'Your catalogue starts here' })).toBeVisible()
  const image = Buffer.from(await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = 2400; canvas.height = 1200; const c = canvas.getContext('2d')!; c.fillStyle = '#c9d8c3'; c.fillRect(0, 0, 2400, 1200); return canvas.toDataURL('image/png').split(',')[1] }), 'base64')
  await addProduct(page, 'Flood Light', image); await addProduct(page, 'Street Light', image)
  let workspace = await getWorkspace(page); expect(workspace.products).toHaveLength(2); expect(workspace.assets).toHaveLength(2)
  const dimensions = await page.evaluate(async () => { const db = await new Promise<IDBDatabase>(r => { const q = indexedDB.open('yorvis-local-editor'); q.onsuccess = () => r(q.result) }); const value = await new Promise<any>(r => { const q = db.transaction('workspace').objectStore('workspace').get('catalogue'); q.onsuccess = () => r(q.result) }); const bitmap = await createImageBitmap(Object.values(value.assets)[0] as Blob); const result = [bitmap.width, bitmap.height]; bitmap.close(); db.close(); return result })
  expect(dimensions).toEqual([1600, 800])
  await page.reload(); await expect(page.getByText('Flood Light', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Move Street Light up', exact: true }).click(); await expect(page.locator('tbody tr').first()).toContainText('Street Light')
  await page.getByRole('button', { name: 'Preview Flood Light', exact: true }).click(); await expect(page.getByRole('dialog').getByTestId('product-card')).toBeVisible(); await page.getByRole('button', { name: 'Close preview' }).click()
  const oldImage = (await getWorkspace(page)).products.find((p: any) => p.title === 'Flood Light').image_path
  await page.getByRole('button', { name: 'Edit Flood Light', exact: true }).click(); await page.getByLabel('Product title', { exact: true }).fill('Updated Flood Light')
  await page.locator('input[type=file]').last().setInputFiles({ name: 'updated.png', mimeType: 'image/png', buffer: image }); await expect(page.getByText(/Image ready/)).toBeVisible()
  await page.getByRole('button', { name: 'Save draft', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0)
  workspace = await getWorkspace(page); expect(workspace.assets).not.toContain(oldImage); expect(workspace.assets).toHaveLength(2)
  await page.getByRole('button', { name: 'Deactivate Street Light', exact: true }).click(); await expect(page.getByRole('button', { name: 'Activate Street Light', exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: 'Search admin products' }).fill('FL-001'); await expect(page.locator('tbody tr')).toHaveCount(1); await page.getByRole('textbox', { name: 'Search admin products' }).fill('')
  const exportDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export publish ZIP' }).click(); const publish = await exportDownload
  const publishedFiles = unzipSync(await readFile((await publish.path())!)); const published = JSON.parse(strFromU8(publishedFiles['catalogue/products.json']))
  expect(published.products).toHaveLength(1); expect(published.products[0].title).toBe('Updated Flood Light'); expect(Object.keys(publishedFiles).filter(p => p.includes('/images/'))).toHaveLength(1)
  const backupDownload = page.waitForEvent('download'); await page.getByRole('button', { name: 'Backup drafts' }).click(); const backup = await backupDownload; const backupPath = (await backup.path())!
  const backupBytes = await readFile(backupPath); expect(JSON.parse(strFromU8(unzipSync(backupBytes)['draft/products.json'])).products).toHaveLength(2)
  await page.getByRole('button', { name: 'Delete Updated Flood Light', exact: true }).click(); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(page.getByText('Updated Flood Light', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Delete Updated Flood Light', exact: true }).click(); await page.getByRole('button', { name: 'Delete product', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await getWorkspace(page)).assets).toHaveLength(1)
  await page.getByLabel('Import catalogue archive').setInputFiles({ name: 'backup.zip', mimeType: 'application/zip', buffer: backupBytes }); await page.getByRole('button', { name: 'Replace draft', exact: true }).click(); await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await getWorkspace(page)).products).toHaveLength(2)
  await page.screenshot({ path: 'test-results/editor-desktop.png', fullPage: true })
})
test('editor rejects invalid and oversized image files', async ({ page }) => {
  await page.route('**/catalogue/products.json', route => route.fulfill({json:{version:1,products:[]}}))
  await page.goto('http://127.0.0.1:5173/hdhdhdhhdhdcurioo'); await page.getByRole('button', { name: 'Add product', exact: true }).first().click()
  await page.locator('input[type=file]').last().setInputFiles({ name: 'bad.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') }); await expect(page.getByRole('alert')).toContainText('Choose a JPG')
  await page.locator('input[type=file]').last().setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }); await expect(page.getByRole('alert')).toContainText('5 MB')
  await page.locator('input[type=file]').last().setInputFiles({ name: 'fake.png', mimeType: 'image/png', buffer: Buffer.from('not an image') }); await expect(page.getByRole('alert')).toContainText('could not be decoded')
})
test('sample preview screenshots', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5173/'); await expect(page.getByTestId('product-card')).toHaveCount(12)
  expect(await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily)).toContain('Arial')
  await page.screenshot({ path: 'test-results/catalogue-desktop.png', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: 'test-results/catalogue-mobile.png', fullPage: true })
  await page.screenshot({ path: 'test-results/catalogue-mobile-viewport.png' })
  expect(errors).toEqual([])
})
test('concurrent editor tabs cannot overwrite newer drafts', async ({ page, context }) => {
  await page.route('**/catalogue/products.json', route => route.fulfill({json:{version:1,products:[]}}))
  await page.goto('http://127.0.0.1:5173/hdhdhdhhdhdcurioo')
  const image = Buffer.from(await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 10; c.height = 10; return c.toDataURL('image/png').split(',')[1] }), 'base64')
  await addProduct(page, 'Concurrent Light', image)
  const second = await context.newPage(); await second.goto('http://127.0.0.1:5173/hdhdhdhhdhdcurioo'); await expect(second.getByText('Concurrent Light', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Deactivate Concurrent Light', exact: true }).click(); await expect(page.getByRole('button', { name: 'Activate Concurrent Light', exact: true })).toBeVisible()
  await second.getByRole('button', { name: 'Deactivate Concurrent Light', exact: true }).click(); await expect(second.getByRole('alert')).toContainText('changed in another tab')
  await second.reload(); await expect(second.getByRole('button', { name: 'Activate Concurrent Light', exact: true })).toBeVisible()
})
