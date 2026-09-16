import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
export function Modal({ title, children, onClose, busy = false, small = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; small?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => { const dialog = ref.current!; dialog.showModal(); return () => dialog.close() }, [])
  return <dialog ref={ref} className={`editor-dialog ${small ? 'confirm-dialog' : ''}`} aria-label={title} onCancel={e => { e.preventDefault(); if (!busy) onClose() }}>
    <div className="dialog-header"><h2>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" disabled={busy} onClick={onClose}><X size={20}/></button></div>{children}
  </dialog>
}
