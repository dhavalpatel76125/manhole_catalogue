# FIBRO social preview image

- Sharing asset: `public/fibro-catalogue-share-v3.jpg`, a 1200 × 630 baseline sRGB JPEG, 101,492 bytes.
- Source artwork: `public/fibro-catalogue-share-v3.png`, copied unchanged from the built-in image editor.
- Brand: FIBRO INNOVATION SYSTEM; complete round company image, including both telephone numbers and the Rajkot address.
- Visible copy: Product Catalogue / FRP MANHOLE COVERS.
- Method: built-in `image_gen` tool, editing `public/fibro-catalogue-share-v2.jpg` with `public/fibro-round-logo-v1.jpg` as the supporting company image. Only the left-side branding changes; the catalogue design on the right is retained.
- Original output: `exec-7f82e706-fa8f-4f8e-877f-5e0db88c7d4b.png`, copied unchanged into the project.
- Source dimensions: 1731 × 908 PNG, 1,534,409 bytes. The delivery JPEG uses sRGB, quality 85 and non-progressive encoding for compatibility.
- Earlier source and delivery images remain available at their original versioned filenames. The legacy `public/yorvis-share.png` still contains the earlier FIBRO artwork.
- Open Graph and Twitter metadata are injected into static HTML at build time. Format and dimensions are checked from the actual JPEG, and the new image filename prevents reuse of the previous image URL.
- Inspection: checked the full circle, FIS mark, company spelling, manufacturing line, `7990907899 / 9978717496`, `Rajkot, Gujarat.`, and the right-side catalogue text. The artwork makes no product-performance claims.

## Verification

Run `npm test`, `npm run build`, and `node scripts/test-sharing-build.mjs`. After deployment, verify the raw HTML title, description and image URL, plus the image's HTTP content type and dimensions. Verify the same responses using a WhatsApp user agent. These checks validate what the site serves; they do not control WhatsApp's cached or previously sent messages.

The original 1.17 MB PNG and HTML returned HTTP 200 to WhatsApp and Meta user agents. After initially reporting a text-only preview on both clients, the user confirmed mobile was showing the image; desktop remained the reported issue. The smaller JPEG reduces download size and removes a potential decoder obstacle, without treating image size as a proven root cause. Successful HTTP checks alone do not prove WhatsApp displays the image.

For a fresh sharing attempt, use `https://manhole-catalogue.vercel.app/?v=fibro-round-preview-3`. The ordinary homepage remains the canonical URL. Previously sent previews may retain the old artwork; do not promise they will update automatically.

## Original generation prompt (version 1)

Use case: compositing. Create exactly one final landscape social link-preview image for the FIBRO INNOVATION SYSTEM product catalogue website, intended aspect ratio 1200:630 (1.905:1). Input image 1 is the supplied authentic company logo, a supporting brand asset: preserve the exact FIS blue letterforms, bright green upward arrow, proportions, gradients and company name without redesigning or misspelling. Create a clean, polished white/light-neutral industrial catalogue card. Feature the supplied FIS logo prominently with ample safe margins; avoid the source image's excessive empty margins. Arrange the exact company name FIBRO INNOVATION SYSTEM clearly legible, with FIBRO in green and remaining words deep navy. Add large upright sans-serif text exactly 'Product Catalogue' and smaller text exactly 'FRP MANHOLE COVERS'. Use restrained navy, medium blue and fresh green accents matching the supplied logo; a subtle geometric panel on the right is enough. Make all words readable at WhatsApp thumbnail size, keep all content within a generous central safe area. No real or invented product photos, no YORVIS, no LED lighting, no claims, no certifications, no prices, no URL, no WhatsApp icon, no device or browser mockup. Return one finished flattened PNG artwork, not a layout sheet.

## Final image edit prompt (version 3)

Use case: compositing. Edit image 1, the existing wide FIBRO Product Catalogue social-sharing banner. Image 2 is the exact company badge to insert. Replace ONLY the large FIS symbol and company-name line on the LEFT side of image 1 with the COMPLETE round image from image 2. Treat image 2 as an existing printed sticker to reproduce intact, not as inspiration for a redesign. Preserve its full circle, beige woven texture, FIS mark, green FIBRO INNOVATION SYSTEM name, manufacturing line, BOTH telephone numbers, phone icon, green rules, location pin and Rajkot, Gujarat. Do not crop anything off the circle. Exact badge text: 'FIBRO INNOVATION SYSTEM'; 'Mfg. Frp manhole cover'; '7990907899 / 9978717496'; 'Rajkot, Gujarat.' Keep all digits correct. Fit the complete circle neatly inside the left region at approximately x=44 to 540, y=67 to 563 on a 1200x630 canvas. Remove all remnants of the old left logo/name outside the new badge. Preserve the RIGHT side of image 1 unchanged: same navy 'Product', blue 'Catalogue', thin green underline, 'FRP MANHOLE COVERS', vertical grey divider, white background, pale diagonal lines, blue/green diagonal corner decoration, fonts, sizes, positions and colors. Do not add any new text, frame, shadow, objects, or WhatsApp UI. Output a clean standalone wide banner at 1200x630 or precisely the same aspect ratio. This is a minimal left-side replacement; everything else stays as in image 1.
