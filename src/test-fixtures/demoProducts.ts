import type { Product } from '../types'

// Clearly labelled development-only illustrations, never bundled into production.
function lightIllustration(kind: number) {
  const defs = '<defs><linearGradient id="case" x2=".8" y2="1"><stop stop-color="#424944"/><stop offset="1" stop-color="#171b18"/></linearGradient><linearGradient id="face" x2="0" y2="1"><stop stop-color="#fbfbeb"/><stop offset="1" stop-color="#dadfd5"/></linearGradient><filter id="shadow"><feGaussianBlur stdDeviation="7"/></filter></defs>'
  const shadow = '<ellipse cx="160" cy="209" rx="80" ry="9" fill="#bdc3b8" opacity=".5" filter="url(#shadow)"/>'
  let shape = ''
  if (kind === 0) shape = '<path d="M85 123v70h138v-70" stroke="#292e2b" stroke-width="9" fill="none"/>' + '<rect x="67" y="47" width="186" height="131" rx="8" fill="url(#case)"/><rect x="79" y="58" width="162" height="108" rx="4" fill="#888e80"/>' + Array.from({length:24},(_,i)=>`<g><circle cx="${95+(i%6)*26}" cy="${74+Math.floor(i/6)*26}" r="10" fill="url(#face)" stroke="#656b5f"/><rect x="${92+(i%6)*26}" y="${71+Math.floor(i/6)*26}" width="6" height="6" fill="#e3cb72"/></g>`).join('')
  else if (kind === 1) shape = '<path d="M144 43v-9q16-15 32 0v9" fill="none" stroke="#272e29" stroke-width="6"/><rect x="126" y="45" width="68" height="33" rx="7" fill="#303631"/><path d="M126 69 83 145q77 25 154 0L194 69Z" fill="url(#case)"/>' + Array.from({length:12},(_,i)=>`<path d="M${130+i*5} 70 ${87+i*13} 144" stroke="#626a61" stroke-width="2"/>`).join('') + '<ellipse cx="160" cy="151" rx="81" ry="24" fill="#242c25"/><ellipse cx="160" cy="154" rx="72" ry="18" fill="url(#face)"/>'
  else if (kind === 2) shape = '<g transform="rotate(-25 160 120)"><path d="M187 143h70v16h-70" fill="#717c73"/><rect x="52" y="73" width="154" height="104" rx="28" fill="#88958b"/><rect x="67" y="82" width="113" height="86" rx="15" fill="#373f38"/>' + Array.from({length:15},(_,i)=>`<circle cx="${83+(i%5)*20}" cy="${98+Math.floor(i/5)*27}" r="8" fill="url(#face)"/>`).join('') + '</g>'
  else if (kind === 3) shape = '<ellipse cx="160" cy="121" rx="100" ry="55" fill="#b9c1b7"/><path d="M60 113v14c0 66 200 66 200 0v-14Z" fill="#d6dbd0"/><ellipse cx="160" cy="112" rx="100" ry="54" fill="#fffef7" stroke="#d3d8cd" stroke-width="3"/><ellipse cx="160" cy="112" rx="78" ry="40" fill="url(#face)"/>'
  else if (kind === 4) shape = '<path d="M62 101 185 49 260 120 133 175Z" fill="#bac2b8"/><path d="M62 101v13l71 76 127-58v-12l-127 55Z" fill="#d0d6c9"/><path d="M71 103 184 58 250 119 133 166Z" fill="#fffef5"/><path d="M84 106 184 66 239 116 134 154Z" fill="url(#face)"/>'
  else shape = '<g transform="rotate(-23 160 120)"><rect x="35" y="99" width="250" height="39" rx="10" fill="#c6cfc3"/><rect x="37" y="99" width="246" height="29" rx="10" fill="url(#face)"/><rect x="33" y="98" width="17" height="39" rx="5" fill="#eef1e6"/><rect x="270" y="98" width="17" height="39" rx="5" fill="#eef1e6"/></g>'
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240">${defs}${shadow}${shape}</svg>`)}`
}
const names = ['500W LED Lens Flood Light', '150W UFO LED High Bay Light', '100W LED Street Light', '18W Round LED Panel Light', '36W Square LED Panel Light', '20W LED Batten Light', '200W LED Lens Flood Light', '100W UFO LED High Bay Light', '60W LED Street Light', '12W Round LED Panel Light', '24W Square LED Panel Light', '40W LED Batten Light', '300W LED Lens Flood Light', '200W UFO LED High Bay Light', '150W LED Street Light', '6W Round LED Panel Light']
export const demoProducts: Product[] = names.map((title, i) => ({
  id: `00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`, title,
  product_code: `YRV-${['FL','HB','SL','RP','SP','BT'][i%6]}-${title.split('W')[0]}`,
  image_url: lightIllustration(i%6), image_path: `sample-${i}.webp`, price: null,
  display_order: i, is_active: true, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z',
}))
