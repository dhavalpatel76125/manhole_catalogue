# FIBRO social preview image

- Sharing asset: `public/fibro-catalogue-share-v2.jpg`, a 1200 × 630 baseline sRGB JPEG, 97,687 bytes.
- Source artwork: `public/fibro-catalogue-share-v1.png`, preserved unchanged.
- Brand: FIBRO INNOVATION SYSTEM; supplied blue/green FIS logo.
- Visible copy: Product Catalogue / FRP MANHOLE COVERS.
- Method: built-in `image_gen` tool, using `public/fibro-logo.png` as the reference.
- Original output: `exec-c3f7a24e-7046-40b2-bbc2-57fe0916dead.png`, copied unchanged into the project.
- Source dimensions: 1731 × 908 PNG, 1,166,069 bytes. The delivery JPEG keeps the same artwork and uses a white background, quality 84, 4:4:4 chroma sampling and non-progressive encoding for compatibility.
- The legacy `public/yorvis-share.png` path contains the same FIBRO artwork so older image URLs no longer serve the previous branding.
- Open Graph and Twitter metadata are injected into static HTML at build time. Format and dimensions are checked from the actual JPEG, and the new image filename prevents reuse of the previous image URL.
- Inspection: checked the FIS mark, company spelling, FRP wording, landscape composition and legibility at thumbnail size. The artwork makes no product-performance claims.

## Verification

Run `npm test`, `npm run build`, and `node scripts/test-sharing-build.mjs`. After deployment, verify the raw HTML title, description and image URL, plus the image's HTTP content type and dimensions. Verify the same responses using a WhatsApp user agent. These checks validate what the site serves; they do not control WhatsApp's cached or previously sent messages.

The original 1.17 MB PNG and HTML returned HTTP 200 to WhatsApp and Meta user agents. After initially reporting a text-only preview on both clients, the user confirmed mobile was showing the image; desktop remained the reported issue. The smaller JPEG reduces download size and removes a potential decoder obstacle, without treating image size as a proven root cause. Successful HTTP checks alone do not prove WhatsApp displays the image.

For a fresh sharing attempt, use `https://manhole-catalogue.vercel.app/?v=fibro-preview-2`. The ordinary homepage remains the canonical URL. Previously sent previews may retain the old artwork; do not promise they will update automatically.

## Final generation prompt

Use case: compositing. Create exactly one final landscape social link-preview image for the FIBRO INNOVATION SYSTEM product catalogue website, intended aspect ratio 1200:630 (1.905:1). Input image 1 is the supplied authentic company logo, a supporting brand asset: preserve the exact FIS blue letterforms, bright green upward arrow, proportions, gradients and company name without redesigning or misspelling. Create a clean, polished white/light-neutral industrial catalogue card. Feature the supplied FIS logo prominently with ample safe margins; avoid the source image's excessive empty margins. Arrange the exact company name FIBRO INNOVATION SYSTEM clearly legible, with FIBRO in green and remaining words deep navy. Add large upright sans-serif text exactly 'Product Catalogue' and smaller text exactly 'FRP MANHOLE COVERS'. Use restrained navy, medium blue and fresh green accents matching the supplied logo; a subtle geometric panel on the right is enough. Make all words readable at WhatsApp thumbnail size, keep all content within a generous central safe area. No real or invented product photos, no YORVIS, no LED lighting, no claims, no certifications, no prices, no URL, no WhatsApp icon, no device or browser mockup. Return one finished flattened PNG artwork, not a layout sheet.
