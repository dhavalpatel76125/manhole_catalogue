import { BlobStore } from '../server/store.js'
import { createHandler } from '../server/handler.js'
import initial from '../public/catalogue/products.json' with { type: 'json' }
import { parseCatalogue } from '../shared/catalogue.js'

const handler = createHandler(new BlobStore(), {
  origin: process.env.APP_ORIGIN || 'https://manhole-catalogue.vercel.app',
  email: process.env.ADMIN_EMAIL || 'admin@gmail.com',
  setupToken: process.env.ADMIN_SETUP_TOKEN || '',
  // Connected stores can use OIDC. The SDK obtains the rotating credential
  // from Vercel's request context; it need not exist in env at module startup.
  configured: !!(process.env.BLOB_READ_WRITE_TOKEN?.trim() || process.env.BLOB_STORE_ID?.trim()),
  initialProducts: parseCatalogue(initial),
})
export default { fetch: handler }
