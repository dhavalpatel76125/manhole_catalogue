import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pageItems } from '../lib/catalogue'

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (page: number) => void }) {
  if (pages < 1) return null
  return <nav className="pagination" aria-label="Catalogue pages">
    <button className="page-edge" aria-label="Previous" onClick={() => onChange(page - 1)} disabled={page === 1}><ChevronLeft size={16}/><span>Previous</span></button>
    <div className="page-numbers">{pageItems(page, pages).map(p => typeof p === 'string' ? <span className="ellipsis" key={p}>…</span> : <button key={p} aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined} onClick={() => onChange(p)}>{p}</button>)}</div>
    <button className="page-edge" aria-label="Next" onClick={() => onChange(page + 1)} disabled={page === pages}><span>Next</span><ChevronRight size={16}/></button>
  </nav>
}
