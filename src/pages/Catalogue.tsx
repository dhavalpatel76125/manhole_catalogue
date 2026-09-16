import { useEffect, useRef, useState } from 'react'
import { Search, ArrowUpRight, PackageSearch, X, Grid2X2, RotateCw } from 'lucide-react'
import { Brand } from '../components/Brand'
import { ProductCard } from '../components/ProductCard'
import { Pagination } from '../components/Pagination'
import { useProducts } from '../hooks/useProducts'
import { DEMO_MODE, PAGE_SIZE, WHATSAPP_NUMBER } from '../lib/config'

export default function Catalogue() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const { products, total, loading, error, refresh } = useProducts(search, page)
  const heading = useRef<HTMLHeadingElement>(null)
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  useEffect(() => { if (!loading && !error && page > pages) setPage(pages) }, [pages, loading, error, page])
  const changePage = (next: number) => { setPage(next); heading.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }) }
  return <>
    <header className="site-header"><div className="header-inner"><Brand/><span className="header-descriptor">LED LIGHTING</span><a className="contact-link" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">Contact us <ArrowUpRight size={16}/></a></div></header>
    <main className="catalogue-shell">
      {DEMO_MODE && <div className="demo-note">Development preview · Sample products and illustrations. Published catalogue uses your JSON file.</div>}
      <div className="breadcrumb"><span>YORVIS</span><span>/</span>Catalogue</div>
      <section className="catalogue-intro"><div><p className="eyebrow"><span/> THE YORVIS COLLECTION</p><h1 ref={heading}>Product Catalogue<span>.</span></h1><p className="intro-copy">Find the right light for your next project.</p></div><div className="catalogue-label"><Grid2X2 size={17}/><span>LED lighting catalogue</span></div></section>
      <div className="catalogue-toolbar"><div className="search-field"><Search size={21}/><input aria-label="Search products" placeholder="Search products..." value={search} maxLength={160} onChange={e => { setSearch(e.target.value); setPage(1) }}/>{search && <button className="icon-button" aria-label="Clear search" onClick={() => { setSearch(''); setPage(1) }}><X size={18}/></button>}<span className="search-hint">Name or product code</span></div></div>
      <div className="results-line"><p aria-live="polite">{loading ? 'Loading products…' : error ? 'Catalogue' : <><strong>{total}</strong> {search ? 'matching products' : 'products'}<span className="result-divider">/</span>{total > 0 ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)}` : 'More lighting, coming soon'}</>}</p><span>SELECT. SET QUANTITY. ENQUIRE.</span></div>
      {error ? <div className="empty-state" role="alert"><PackageSearch size={38}/><h2>We couldn’t load the catalogue</h2><p>Please try again in a moment.</p><button className="secondary-button" onClick={refresh}><RotateCw size={16}/>Try again</button></div> : loading ? <div className="product-grid" aria-label="Loading products" aria-busy="true">{Array.from({ length: 12 }, (_, i) => <div className="skeleton-card" key={i}><div/><span/><span/><span/></div>)}</div> : !products.length ? <div className="empty-state"><PackageSearch size={40}/><h2>{search ? 'No products found' : 'Our catalogue is taking shape'}</h2><p>{search ? 'Try another product name or code.' : 'New products will appear here soon. Contact us for current availability.'}</p>{search && <button className="secondary-button" onClick={() => { setSearch(''); setPage(1) }}>Clear search</button>}</div> : <div className="product-grid">{products.map(product => <ProductCard key={`${product.id}-${product.image_url}`} product={product} quantity={quantities[product.id] || 1} onQuantity={q => setQuantities(old => ({ ...old, [product.id]: q }))}/>)}</div>}
      {!error && !loading && total > 0 && <div className="pagination-section"><p>Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} products</p><Pagination page={page} pages={pages} onChange={changePage}/></div>}
    </main>
    <footer className="site-footer"><span>© {new Date().getFullYear()} YORVIS</span><span>LED lighting. Direct enquiries.</span><span>All rights reserved.</span></footer>
  </>
}
