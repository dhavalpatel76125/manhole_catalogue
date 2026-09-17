# FIBRO INNOVATION SYSTEM product catalogue

The Fibro update adds the supplied FIS logo, capacity and size filters, responsive catalogue/admin layouts, structured product measurements and WhatsApp enquiries to +91 7990907899. The initial catalogue includes 84 FRP photos. See [source review and missing measurements](docs/frp-review.md). In Add/Edit product, type a new capacity or size or choose an existing suggestion; saved active values populate the catalogue dropdowns. Description fields are optional when dimensions need confirmation.

The historical setup notes below describe the earlier YORVIS version. The local preview now uses the imported FRP catalogue with demo mode disabled. Existing live storage is preserved and requires a separate content migration when publishing.

> **Current deployment: online admin on Vercel.** The owner subsequently requested an online editor. The production build now includes authenticated Vercel API functions and uses private Vercel Blob storage for JSON and images. Follow [Online admin setup](docs/online-admin-setup.md) to connect storage and create the administrator. The sections below describe the earlier static workflow and the retained local editor; claims that production excludes all admin code apply only to that earlier version. A static ZIP cannot deploy the new API.

A static React + Vite + TypeScript + Tailwind website with a local product editor. Arial throughout. No Supabase account, database, API server or runtime backend is needed.

## Agreed JSON architecture

The original Supabase brief was superseded by the request to use JSON and keep the site static. The selected workflow is **edit locally → export JSON and images → upload/redeploy**.

- The public website reads `/catalogue/products.json` and local product images.
- The editor is available only through the development server on your own computer. Its JavaScript is excluded from production builds.
- Drafts and image blobs persist in IndexedDB in the current browser and origin. Export a private backup before changing browsers, changing the development port/hostname, moving computers or clearing browser data.
- There is no remote admin login, password, session, database or RLS. A client-only password form would not secure a static editor. The operating-system account protects local access; your hosting account protects publishing access.
- Customers cannot modify your deployed catalogue because there is no write endpoint. Discovering the configured editor URL on the public site shows “Page not found.”
- Draft edits do not change the live catalogue automatically. Publishing does. Already-open catalogue tabs reload JSON every 30 seconds and when focused.

## Start on your computer

Install Node.js 22.12+ (Node 22 LTS recommended), then run in this folder:

```powershell
npm install
npm run dev -- --port 5173 --strictPort
```

Open the catalogue at `http://127.0.0.1:5173/`.
Open the local editor at `http://127.0.0.1:5173/hdhdhdhhdhdcurioo`.

The development server binds to `127.0.0.1`. Do not expose it publicly or change it to listen on all interfaces. Use the same browser, hostname and port each time so the same local draft is available. Close the editor with **Close editor** and stop Vite with Ctrl+C when finished. There is no separate admin account to create.

If PowerShell's npm shim is broken, use `& 'C:\Program Files\nodejs\npm.cmd'` in place of `npm`.

### Preview data

The checked-out local `.env.local` enables `VITE_DEMO_MODE=true` so you can review the design with sixteen labelled sample products and original schematic illustrations. They are not actual YORVIS product photographs or published inventory. The development editor starts empty, independently of the sample preview.

Set `VITE_DEMO_MODE=false` and restart Vite to view `public/catalogue/products.json`. Production builds always use your real JSON, regardless of the demo setting, and strip sample code. The supplied real catalogue is empty until you add your own products.

## Product editor

1. Click **Add product**. Enter the title, optional code, optional INR price, and image. Leave the price blank to hide it; zero is displayed as ₹0.00.
2. Select a JPG/JPEG, PNG or WebP file up to 5 MB. The editor validates and decodes the file, preserves aspect ratio, resizes the longest edge to at most 1,600 px, and encodes WebP when supported. The original file is not uploaded anywhere. A progress indicator shows local processing.
3. Review the card preview and click **Save draft**. A saved draft survives reloading the browser.
4. Edit, replace images, activate/deactivate, search, preview or delete products in the table. Delete requires confirmation. Up/down arrows reorder the entire catalogue; clear search before reordering.
5. Replaced/deleted image blobs are removed from local draft storage once no product references them. Concurrent edits from another tab are rejected rather than silently overwriting that tab's work.
6. **Backup drafts** exports all products and images, including inactive products, into a private ZIP. Keep backups outside the public deployment. **Import ZIP** restores a backup or imports a publishing bundle after confirmation. Import replaces the current draft.
7. **Export publish ZIP** includes only active products and their images. It contains `catalogue/products.json`, `catalogue/images/`, and publishing instructions. Inactive product data is never included in this export.

The local editor is intended for modest catalogues. JSON supports up to 10,000 products; archive imports are limited to 80 MB compressed / 200 MB expanded. Browser storage capacity depends on your device. Keep backups and use optimised images. If a source image is missing, export fails with the product's name; replace the image to continue.

## Publish your changes

1. Export a publishing ZIP from the editor and extract it.
2. Replace the **entire** `public/catalogue` folder with the exported `catalogue` folder. Do not merge old images: replacing the folder removes images of deleted, deactivated and replaced products.
3. Build and package:

```powershell
npm run package
```

This validates the catalogue and images, creates `dist/`, verifies that local-editor and demo code are excluded, and writes `release/yorvis-website.zip`.

4. Deploy the full `dist` directory or the extracted website ZIP to your host. The editor's publish ZIP is a **content bundle**, not the entire website.

If your host supports direct static uploads, you can alternatively replace `dist/catalogue` with the exported folder and redeploy the whole `dist` directory without rebuilding the frontend. Keep `public/catalogue` in sync to avoid losing updates on the next build. Prefer an atomic deployment so JSON and images become available together. The hosting provider may retain old deployment versions; remove those separately if you need historic assets erased.

Only deploy `dist`. Never deploy the project root, private backups, test results, `node_modules`, or the development server.

## Cloudflare Pages

Use a Pages project, with the repository root as the root directory, build command `npm run build`, and output directory `dist`. Set Node.js to 22.12+ and set `VITE_WHATSAPP_NUMBER` if you want a different contact number. Alternatively, create a direct-upload Pages project and upload the built `dist` folder / website ZIP using the Pages dashboard.

`public/_headers` and `public/_redirects` are copied into the build. They configure security headers, JSON caching and fallback routing. No Functions or Workers are needed. See [Vite deployment instructions](https://vite.dev/guide/static-deploy) and [Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/).

## Netlify

Import the repository and use `npm run build` / `dist`. `netlify.toml` supplies these defaults and Node 22. You may also deploy the complete built folder through Netlify's manual deployment UI. `_headers` and `_redirects` are included. Set any changed `VITE_` values in the Netlify build environment and rebuild. No Netlify Functions are needed. See [Vite's Netlify guide](https://vite.dev/guide/static-deploy#netlify).

## Vercel

Import the repository, select the Vite framework preset, set build command `npm run build`, output `dist`, and Node 22. `vercel.json` provides fallback routing, security headers and no-store for the catalogue JSON. Configure any changed `VITE_` values before building. No serverless functions are needed. See [Vite's Vercel guide](https://vite.dev/guide/static-deploy#vercel).

All three deployments assume a domain root (for example `https://catalogue.example.com/`), not a subdirectory. Use HTTPS. The included CSP permits only local scripts/styles/images and local JSON requests; WhatsApp opens as a normal external navigation.

## Configuration

### Branded previews when sharing the website link

`public/yorvis-share.png` is the YORVIS link-thumbnail image. Open Graph and X/Twitter metadata are inserted directly into the generated HTML, so sharing crawlers do not need JavaScript. The original image is 1731 × 909 pixels (approximately 1.91:1); image dimensions are read automatically at build time.

After your public domain is available, add its **full HTTPS domain root** in `.env.local` for local builds or in your hosting provider's build environment:

```dotenv
VITE_SITE_URL=https://your-actual-domain.com
```

Then run `npm run package` and deploy the new build, or trigger a new build on your hosting provider. Changing the setting without rebuilding cannot change static HTML. Use the final domain you will actually share. Do not enter the local preview URL.

Before a domain is configured, the build includes the image file and title/description metadata, but deliberately omits `og:image`, `og:url` and the canonical URL rather than publishing a made-up domain. A build warning reminds you to finish this setting. Consequently, **the image preview is not fully enabled until the domain is set and the site redeployed**.

After deployment, open `https://your-actual-domain.com/yorvis-share.png` and verify it loads publicly, then paste the main site URL into a new message and allow time for the preview to load. The hosting deployment must be publicly accessible without a login. Each messaging/social app controls whether it displays previews, how it crops the image and how it caches previous previews; an image cannot be forced for every recipient. Meta provides a [Sharing Debugger](https://developers.facebook.com/tools/debug/) to inspect Facebook's cached preview. Protocol details: [Open Graph](https://ogp.me/).

The thumbnail was generated using the built-in image-generation tool; its prompt and provenance are recorded in `docs/share-image.md`. It contains the YORVIS wordmark, catalogue title and abstract light beams, rather than unverified product photographs.

Copy `.env.example` to `.env.local` if setting up a fresh copy. `VITE_` variables are public build-time configuration, not secrets.

```dotenv
VITE_ADMIN_PATH=/hdhdhdhhdhdcurioo
VITE_WHATSAPP_NUMBER=918320587916
VITE_SITE_URL=
VITE_DEMO_MODE=false
```

- `VITE_ADMIN_PATH`: one path segment with 8–100 letters, digits, hyphens or underscores. Restart Vite after changing it. It only controls the local editor; it never enables public admin access.
- `VITE_WHATSAPP_NUMBER`: digits only, including country code, without `+`, spaces or punctuation. Rebuild/redeploy after changing it.
- `VITE_DEMO_MODE`: development preview only. Production always ignores it.

The exact WhatsApp message is constructed in `src/lib/catalogue.ts` and encoded with `encodeURIComponent`:

```text
Hello, I want to buy [PRODUCT TITLE]. Quantity: [SELECTED QUANTITY]. Please share the price and availability.
```

Every card has an independent quantity between 1 and 999. The catalogue shows 12 products per page at all viewport sizes: four columns at 1280px+, three at 900–1279px, two at 600–899px, one below 600px. The last page contains only remaining products.

## JSON format

The editor produces the correct format automatically. If editing manually, ensure every referenced image exists and use a unique UUID for each product:

```json
{
  "version": 1,
  "products": [
    {
      "id": "51c8d769-c2c2-4bda-9c77-1c84e83d3191",
      "title": "500W LED Lens Flood Light",
      "product_code": "YRV-FL-500",
      "image_url": "/catalogue/images/unique-image.webp",
      "image_path": "unique-image.webp",
      "display_order": 0,
      "is_active": true,
      "price": null,
      "created_at": "2026-09-16T00:00:00.000Z",
      "updated_at": "2026-09-16T00:00:00.000Z"
    }
  ]
}
```

Published JSON is public. Never put inactive/private products, credentials or confidential data in it. Runtime validation rejects malformed records, duplicate IDs, unsafe image paths and invalid fields. React renders text without HTML injection. Normal public right-click behaviour is preserved.

## Verification

```powershell
npm test
npm run build
npm run test:e2e
```

Browser tests use installed Google Chrome on Windows; on another machine run `npx playwright install chromium` first. The test runner starts a production preview on port 4173 and a local editor server on 5173 (or reuses already running ones). Screenshot tests expect development demo mode enabled. Tests use temporary browser profiles, so they do not alter your actual editor drafts.

Coverage includes public search, 12-product pagination, all four grid sizes, quantities, exact WhatsApp popup destination (intercepted without contacting WhatsApp), empty/error states, production editor exclusion, image resizing/replacement and invalid-file rejection, product creation/edit/deletion, activation, ordering, draft persistence, private backups and publishing ZIP import/export. No authentication/database tests apply to the agreed static JSON architecture.

## Project map

- `src/pages/Catalogue.tsx`: public catalogue
- `src/pages/Admin.tsx`: development-only editor
- `src/components/`: reusable cards, pagination, modal and product form
- `src/lib/`: JSON validation, image processing, draft storage and ZIP exports
- `public/catalogue/`: the actual published JSON and product images
- `src/test-fixtures/`: development-only sample catalogue
- `scripts/`: catalogue validation, production isolation check and release packaging
- `tests/`: browser verification

No site has been published automatically. Add your actual product data, export, and deploy to the host you choose.
