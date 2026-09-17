# Activate the online administrator on Vercel

The current production build includes a password-protected online editor at:

https://manhole-catalogue.vercel.app/hdhdhdhhdhdcurioo

Publishing code alone does not provision storage or create the admin account. Until storage is connected, the editor shows a setup-required message and refuses writes. No default password exists.

## Vercel project configuration

1. In the Vercel project, open **Storage** and create/connect a **private Vercel Blob store** for **Production**. Do not use a public store: it holds the catalogue, inactive products, password hash and sessions. Current connections use `BLOB_STORE_ID` with Vercel-managed OIDC authentication; existing connections using `BLOB_READ_WRITE_TOKEN` are also supported. Let the Blob SDK obtain and refresh OIDC credentials automatically; do not copy a short-lived OIDC token into a permanent environment variable. See the [Vercel Blob authentication documentation](https://vercel.com/docs/vercel-blob/using-blob-sdk).
2. Set these Production environment variables:

| Variable | Value |
| --- | --- |
| `APP_ORIGIN` | `https://manhole-catalogue.vercel.app` (no trailing slash) |
| `ADMIN_EMAIL` | `admin@gmail.com` |
| `ADMIN_SETUP_TOKEN` | A new random secret of at least 32 characters |
| `VITE_SITE_URL` | `https://manhole-catalogue.vercel.app` |
| `VITE_ONLINE_ADMIN` | `true` |

Generate the setup token on your own computer using `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Enter it only in Vercel and the first-time setup form. Never commit it, publish it, or prefix it with `VITE_`.

3. Redeploy the repository with build command `npm run build` and output directory `dist`. Vercel also deploys `api/catalogue.ts` as a serverless function. Deploy the repository; uploading the static `dist` ZIP alone cannot deploy the API.
4. Open the admin URL. Enter `admin@gmail.com`, the private setup token, and your chosen password of at least 12 characters. Confirm the password and create the administrator.
5. Remove `ADMIN_SETUP_TOKEN` from Vercel and redeploy after account creation. The account is already stored privately; the setup endpoint will not overwrite it.

Use the final public production domain. Preview deployments do not accept writes unless `APP_ORIGIN` matches that deployment's exact origin. Use separate Blob stores for production and non-production environments.

## Managing products

Sign in, then add, edit, upload/replace images, activate/deactivate, reorder or delete products. Saves update private JSON immediately; public catalogue requests return only active products. Already-open visitor tabs refresh on focus and at most every 30 seconds while visible. Deleted/replaced images are queued for removal and retried on subsequent saves if storage is temporarily unavailable.

Images are processed on the client and revalidated/re-encoded on the server. Original browser selections may be up to 5 MB; compressed online uploads must fit within 3 MB so the multipart request stays below Vercel's function payload limit. Unsupported or corrupt files are rejected. The server preserves aspect ratio and limits images to 1600 pixels on the longest edge.

The first online catalogue starts from `public/catalogue/products.json`, which contains the 84 imported FRP product entries. Once a catalogue has been saved to Blob, that saved catalogue takes precedence over this initial JSON. Drafts previously saved in the local editor are not automatically uploaded; the local draft remains in its original browser.

## Security and persistence

- Credentials and sessions remain in private Blob storage. Passwords are salted and hashed with scrypt.
- Eight-hour sessions use random opaque identifiers in Secure, HttpOnly, SameSite=Strict cookies. Logout revokes the stored session.
- Every admin read/write is checked on the server. Hiding the admin route is not the security boundary.
- Setup requires a secret token and an exact configured email. Login/setup attempts are rate-limited with atomic counters shared across function instances.
- All mutations require the configured origin; unauthenticated or cross-origin writes fail.
- JSON writes use Blob ETags to reject stale updates. Refresh the list if another session edited the catalogue.
- Image requests check product visibility; inactive product images require an admin session. Provider errors and secret values are not returned to the browser.
- The Blob token and setup token must never appear in `VITE_` variables or committed files.

There is no password-reset email flow. If locked out, use the Vercel Blob dashboard to recover administrative access under your hosting account: back up the private `auth/admin.json` file, remove only that account record, set a new setup token, redeploy and create a new account. The new account version invalidates old sessions. Do not delete the catalogue or images. These are owner-operated recovery steps, not public application endpoints.

A function that is interrupted after image upload but before its catalogue commit can leave an unreferenced private image. Ambiguous write errors deliberately preserve that image to avoid deleting a successfully saved product's asset. Expired session/rate records remain private until hosting maintenance removes them. This version has no automated background storage-retention job.

## Verification

`npm test` covers authentication, origin enforcement, setup protection, hashed passwords, expiry/logout, attempt limiting, product mutations, image validation/removal and stale revision protection using an isolated in-memory storage adapter. It also runs the public catalogue and sharing-metadata unit tests.

`npm run test:e2e` checks browser layouts, catalogue interactions, the production login boundary and the retained local-editor workflow. The real Blob connection and live admin sign-in must be verified after Vercel configuration. The tests do not provision a store or validate production credentials.
