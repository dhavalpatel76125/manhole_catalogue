import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises'
import { join, relative, basename } from 'node:path'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
const source = 'FRP PHOTOS/FRP PHOTOS'
async function walk(dir) { const all = []; for (const entry of await readdir(dir, { withFileTypes: true })) { const p = join(dir, entry.name); if (entry.isDirectory()) all.push(...await walk(p)); else if (/\.jpe?g$/i.test(p)) all.push(p) } return all.sort() }
const files = await walk(source)
const rows = await Promise.all(files.map(async path => ({ path, name: basename(path, '.jpeg'), capacity: /FRP (\d+(?:\.\d+)?) (?:TON|T)[\\/]/.exec(path)?.[1], hash: createHash('sha256').update(await readFile(path)).digest('hex') })))
const capacitiesByHash = new Map()
for (const row of rows) { const list = capacitiesByHash.get(row.hash) || new Set(); list.add(row.capacity); capacitiesByHash.set(row.hash, list) }
await mkdir('tmp/import-backup', { recursive: true }); await copyFile('public/catalogue/products.json','tmp/import-backup/products-before-fibro.json', 1).catch(error => { if(error.code !== 'EEXIST') throw error })
await mkdir('public/catalogue/images', { recursive: true })
const products = [], review = [], seen = new Set()
const format = (a,b,unit) => `${a} × ${b} ${unit}`
for (const row of rows) {
 const { path, name, capacity, hash } = row
 const issues = []
 if (!capacity) { review.push({ file: relative(source,path), status:'held', reason:'No load capacity provided.' }); continue }
 if (capacitiesByHash.get(hash).size > 1) { review.push({file:relative(source,path),status:'held',reason:'Identical photo is assigned to different load capacities. Confirm rating and dimensions.'}); continue }
 if (seen.has(hash)) { review.push({file:relative(source,path),status:'duplicate',reason:'Exact duplicate in the same load capacity; one copy imported.'}); continue }
 if (/\d{3,}X\d{3,}\s*INCH|10X10 INCH \(200X200\)/i.test(name)) { review.push({file:relative(source,path),status:'held',reason:'Conflicting or implausible dimensions/units in filename.'}); continue }
 seen.add(hash)
 let size=null, clear_opening=null, frame_size=null, cover_size=null
 const explicit = /^(?:WHITE\s+|MANHOLE COVER\s+)?(\d+)X(\d+)\s*(MM|INCH)/i.exec(name)
 if (explicit) size=format(explicit[1],explicit[2],explicit[3].toLowerCase())
 const diameter = /^(\d+)MM DIA/i.exec(name); if(diameter) size=`${diameter[1]} mm diameter`
 // Unit confirmed by another named view of the same size within the source set.
 if(!size) {
  const pair=/^(\d+)X(\d+)/i.exec(name)
  if(pair) {
   const matches=rows.filter(r=>r.capacity===capacity && r.name!==name).map(r=>/^(\d+)X(\d+)\s*(MM|INCH)/i.exec(r.name)).filter(m=>m && m[1]===pair[1] && m[2]===pair[2] && !(Number(m[1])>=100 && m[3].toUpperCase()==='INCH'))
   const units=new Set(matches.map(m=>m[3].toLowerCase()))
   if(units.size===1) { size=format(pair[1],pair[2],[...units][0]); issues.push('Size unit matched to another named view; verify the product variant.') }
  }
 }
 if (/36X36 INCH OUTER 30X30 INCH CLEAR/i.test(name)) { frame_size='36 × 36 inch';clear_opening='30 × 30 inch' }
 if (/30X30 INCH OUTER 28X28 INCH CLEAR/i.test(name)) { frame_size='30 × 30 inch';clear_opening='28 × 28 inch' }
 if (/26X26 INCH OUTER 22X22 INCH CLEAR/i.test(name)) { frame_size='26 × 26 inch';clear_opening='22 × 22 inch' }
 if (/15X15 INCH OUTER 13X13 INCH CLEAR/i.test(name)) { frame_size='15 × 15 inch';clear_opening='13 × 13 inch' }
 if (/24X36 INCH OUTER 19X31 CLEAR/i.test(name)) { frame_size='24 × 36 inch';clear_opening='19 × 31 inch' }
 if (/600X600 MM CLEAR OPENING 700X700 MM FRAME SIZE/i.test(name)) { clear_opening='600 × 600 mm';frame_size='700 × 700 mm' }
 if (/400X900 MM CLEAR OPENING/i.test(name)) { clear_opening='400 × 900 mm' }
 if (/30X30.*750X750MM OUTER/i.test(name)) { frame_size='750 × 750 mm' }
 if (/48X48 OUTER 42X42 CLEAR/i.test(name)) { size='48 × 48 inch';frame_size='48 × 48 inch';clear_opening='42 × 42 inch' }
 // Measurements read directly from annotated source images (not nominal cover stamps).
 if ((capacity === '12.5' && /450X450.*YELLOW/.test(name)) || (capacity === '40' && /450X450/.test(name))) { size='450 × 450 mm';clear_opening='450 × 450 mm';frame_size='600 × 600 mm' }
 if (capacity === '25' && /600X600.*WHITE/.test(name)) { size='600 × 600 mm';clear_opening='600 × 600 mm';frame_size='760 × 760 mm' }
 if (capacity === '2.5' && /900X900/.test(name)) { size='36 × 36 inch';clear_opening='36 × 36 inch';issues.push('Photo labels clear opening in inches; filename uses 900X900 without units. No exact unit conversion assumed.') }
 if (capacity === '10' && /MANHOLE COVER 54X54/.test(name)) { frame_size='1380 × 1380 mm';issues.push('Annotated clear opening 1115 mm conflicts with the other 54-inch view (1155 mm); left blank.') }
 if (!size) issues.push('Size unit is not explicit; size left blank.')
 if (!clear_opening || !frame_size || !cover_size) issues.push('Unverified description dimensions left blank; enter them in Admin.')
 const image_path=`frp-${hash.slice(0,16)}.webp`
 await sharp(path).rotate().resize({width:1400,height:1400,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toFile(join('public/catalogue/images',image_path))
 const hex=createHash('sha256').update(relative(source,path)).digest('hex');const id=`${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-8${hex.slice(17,20)}-${hex.slice(20,32)}`
 const colour=/WHITE\s*&\s*GREY/i.test(name)?'White & Grey':/WHITE/i.test(name)?'White':/GREY/i.test(name)?'Grey':/YELLOW/i.test(name)?'Yellow':''
 const title=`FRP Manhole Cover${size ? ' — '+size : ''}${colour ? ' — '+colour : ''}`
 products.push({id,title,product_code:`FIS-${String(products.length+1).padStart(3,'0')}`,load_capacity:`${capacity} ton`,size,clear_opening,frame_size,cover_size,image_path,image_url:`/catalogue/images/${image_path}`,price:null,is_active:true,display_order:products.length,created_at:'2026-09-17T00:00:00.000Z',updated_at:'2026-09-17T00:00:00.000Z'})
 review.push({file:relative(source,path),status:'imported',code:products.at(-1).product_code,notes:issues})
}
await writeFile('public/catalogue/products.json',JSON.stringify({version:1,products},null,2)+'\n')
await writeFile('docs/frp-import-review.json',JSON.stringify({source,photos:files.length,imported:products.length,review},null,2)+'\n')
console.log(JSON.stringify({photos:files.length,imported:products.length,held:review.filter(r=>r.status==='held').length,duplicates:review.filter(r=>r.status==='duplicate').length,sizesMissing:products.filter(p=>!p.size).length},null,2))
