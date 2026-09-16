import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import ts from 'typescript'
import sharp from 'sharp'

const root = resolve(import.meta.dirname, '..')
const manifestPath = resolve(root, 'public/catalogue/products.json')
const existing = JSON.parse(await readFile(manifestPath, 'utf8'))
if (existing.products.length) throw new Error('The catalogue already contains products; refusing to replace them.')
const source = await readFile(resolve(root, 'src/test-fixtures/demoProducts.ts'), 'utf8')
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText
const { demoProducts } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString('base64')}`)
const imageDirectory = resolve(root, 'public/catalogue/images')
await mkdir(imageDirectory, { recursive: true })
const products = []
for (const [index, product] of demoProducts.slice(0, 10).entries()) {
  const imageName = `test-light-${String(index + 1).padStart(2, '0')}.webp`
  const svg = decodeURIComponent(product.image_url.slice('data:image/svg+xml,'.length))
  await sharp(Buffer.from(svg), { density: 144 }).webp({ quality: 90 }).toFile(resolve(imageDirectory, imageName))
  products.push({ ...product,
    title: `[TEST] ${product.title}`,
    product_code: `TEST-${String(index + 1).padStart(3, '0')}`,
    image_path: imageName,
    image_url: `/catalogue/images/${imageName}`,
    created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  })
}
await writeFile(manifestPath, JSON.stringify({ version: 1, products }, null, 2) + '\n')
console.log('Added 10 clearly labeled test products with local illustrations and no prices.')
