import { useCallback, useEffect, useRef, useState } from 'react'
import { readPublishedProducts } from '../lib/jsonCatalogue'
import { errorMessage } from '../lib/catalogue'
import { DEMO_MODE, PAGE_SIZE } from '../lib/config'
import type { Product } from '../types'

export function useProducts(search: string, page: number, admin = false) {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const generation = useRef(0)
  const lastQuery = useRef('')
  const refresh = useCallback(() => setVersion(v => v + 1), [])
  useEffect(() => {
    let alive = true
    const controller = new AbortController()
    const current = ++generation.current
    const queryKey = JSON.stringify([search, page, admin])
    if (lastQuery.current !== queryKey) setLoading(true)
    lastQuery.current = queryKey
    setError('')
    const load = async () => {
      try {
        let result
        if (import.meta.env.DEV && DEMO_MODE && !admin) {
          const { demoProducts } = await import('../test-fixtures/demoProducts')
          const filtered = demoProducts.filter(p => `${p.title} ${p.product_code}`.toLowerCase().includes(search.toLowerCase()))
          result = { products: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: filtered.length }
        } else {
          const all = await readPublishedProducts(controller.signal)
          const filtered = all.filter(p => p.is_active && `${p.title} ${p.product_code || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
          result = { products: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: filtered.length }
        }
        if (alive && current === generation.current) { setProducts(result.products); setTotal(result.total) }
      } catch (e) { if (alive && current === generation.current) setError(errorMessage(e)) }
      finally { if (alive && current === generation.current) setLoading(false) }
    }
    void load()
    return () => { alive = false; controller.abort() }
  }, [search, page, admin, version])
  useEffect(() => {
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 30000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [admin, refresh])
  return { products, total, loading, error, refresh }
}
