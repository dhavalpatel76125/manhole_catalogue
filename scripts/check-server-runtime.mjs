import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, copyFile, rm } from 'node:fs/promises'
import { resolve, dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { spawnSync } from 'node:child_process'
import ts from 'typescript'

// Run emitted modules in plain Node, without Vite's import resolver.
const root = resolve(import.meta.dirname, '..')
const temporary = await mkdtemp(join(root, 'node_modules', '.server-runtime-'))
try {
  await writeFile(join(temporary, 'package.json'), '{"type":"module"}')
  for (const file of ['api/catalogue.ts', 'server/handler.ts', 'server/product-share.ts', 'server/security.ts', 'server/store.ts', 'shared/catalogue.ts', 'shared/whatsapp.ts', 'shared/categories.ts']) {
    const output = ts.transpileModule(await readFile(join(root, file), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText
    const destination = join(temporary, file.replace(/\.ts$/, '.js'))
    await mkdir(dirname(destination), { recursive: true })
    await writeFile(destination, output)
  }
  await mkdir(join(temporary, 'public/catalogue'), { recursive: true })
  await copyFile(join(root, 'public/catalogue/products.json'), join(temporary, 'public/catalogue/products.json'))
  const entry = pathToFileURL(join(temporary, 'api/catalogue.js')).href
  const check = `
    import assert from 'node:assert/strict';
    const { default: api } = await import(${JSON.stringify(entry)});
    const session = await api.fetch(new Request('https://manhole-catalogue.vercel.app/api/catalogue?action=session'));
    assert.equal(session.status, 503);
    assert.equal((await session.json()).code, 'SETUP_REQUIRED');
    const catalogue = await api.fetch(new Request('https://manhole-catalogue.vercel.app/api/catalogue?action=public'));
    assert.equal(catalogue.status, 200);
    const products = (await catalogue.json()).products;
    assert.ok(Array.isArray(products));
    const product = await api.fetch(new Request('https://manhole-catalogue.vercel.app/api/catalogue?action=product&id=' + products[0].id));
    assert.equal(product.status, 200);
    assert.match(await product.text(), /property="og:image"/);
    const preview = await api.fetch(new Request('https://manhole-catalogue.vercel.app/api/catalogue?action=product-preview&id=' + products[0].id));
    assert.equal(preview.status, 200);
    assert.equal(preview.headers.get('content-type'), 'image/jpeg');
    assert.ok((await preview.arrayBuffer()).byteLength > 1000);
    console.log('Plain Node API startup, public product page and photo preview passed.');
  `
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', check], {
    cwd: root, stdio: 'inherit', env: { ...process.env, BLOB_READ_WRITE_TOKEN: '', BLOB_STORE_ID: '', VERCEL_OIDC_TOKEN: '', ADMIN_SETUP_TOKEN: '' },
  })
  assert.equal(result.status, 0, 'The production API must start in plain Node.js')
} finally {
  await rm(temporary, { recursive: true, force: true })
}
