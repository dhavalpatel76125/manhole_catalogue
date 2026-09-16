import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { ADMIN_PATH } from './lib/config'
import Catalogue from './pages/Catalogue'
import './styles.css'

const Admin = import.meta.env.DEV ? lazy(() => import('./pages/Admin')) : null
const path = window.location.pathname.replace(/\/$/, '') || '/'
const admin = import.meta.env.DEV && (path === ADMIN_PATH || path === `${ADMIN_PATH}/login`)
if (admin) {
  document.title = 'YORVIS | Administration'
  const robots = document.createElement('meta'); robots.name = 'robots'; robots.content = 'noindex, nofollow'; document.head.appendChild(robots)
}
createRoot(document.getElementById('root')!).render(admin && Admin ? <Suspense fallback={<div className="page-loading" role="status">Loading…</div>}><Admin/></Suspense> : path === '/' ? <Catalogue/> : <main className="empty-state"><h1>Page not found</h1><a className="secondary-button" href="/">View catalogue</a></main>)
