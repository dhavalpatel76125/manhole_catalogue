import { useCallback, useEffect, useMemo, useState } from 'react'
import { readPublishedProducts } from '../lib/jsonCatalogue'
import { errorMessage } from '../lib/catalogue'
import { matchingProducts, productOptions } from '../lib/productFilters'
import { DEMO_MODE, PAGE_SIZE } from '../lib/config'
import type { Product } from '../types'

export function useProducts(search: string, page: number, admin = false, capacity = '', size = '', category = '') {
  const [all, setAll] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => setVersion(v => v + 1), [])
  useEffect(() => {
    let alive = true
    const controller = new AbortController()
    const load = async () => {
      try {
        const result = import.meta.env.DEV && DEMO_MODE && !admin
          ? (await import('../test-fixtures/demoProducts')).demoProducts
          : await readPublishedProducts(controller.signal)
        if (alive) { setAll(result); setError('') }
      } catch (e) { if (alive) setError(errorMessage(e)) }
      finally { if (alive) setLoading(false) }
    }
    void load()
    return () => { alive = false; controller.abort() }
  }, [admin, version])
  useEffect(() => {
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') refresh() }, 30000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [refresh])
  const active = useMemo(() => all.filter(p => p.is_active), [all])
  const filtered = useMemo(() => matchingProducts(active, search, capacity, size, category), [active, search, capacity, size, category])
  return { products: filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: filtered.length, loading, error, refresh,
    capacities: productOptions(matchingProducts(active, '', '', '', category), 'load_capacity'), sizes: productOptions(matchingProducts(active, '', capacity, '', category), 'size') }
}
