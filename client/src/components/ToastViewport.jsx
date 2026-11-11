import { useCallback, useEffect, useRef, useState } from 'react'
import { toastEvents } from '../helpers/toast'

const TOAST_DURATION_MS = 3000
const SURFACES = { error: 'bg-flame', success: 'bg-mint', info: 'bg-card' }

function ToastCard({ notice, dismiss }) {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (hovered || focused) return
    const timer = setTimeout(() => dismiss(notice.id), TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [notice.id, dismiss, hovered, focused])

  return (
    <div
      className={`card pointer-events-auto flex items-start gap-2 px-3 py-2 text-ink shadow-[3px_3px_0_var(--color-ink)] ${SURFACES[notice.type] ?? SURFACES.info}`}
      onPointerEnter={(event) => { if (event.pointerType === 'mouse') setHovered(true) }}
      onPointerLeave={() => setHovered(false)}
    >
      <p className="min-w-0 flex-1 py-2 text-sm font-semibold wrap-break-word">{notice.text}</p>
      <button
        type="button"
        aria-label="Tutup notifikasi"
        className="grid size-9 shrink-0 place-items-center rounded-lg text-xl hover:bg-ink/10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ink"
        onClick={() => dismiss(notice.id)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  )
}

export default function ToastViewport() {
  const [notices, setNotices] = useState([])
  const nextId = useRef(0)

  const dismiss = useCallback((id) => {
    setNotices((current) => current.filter((notice) => notice.id !== id))
  }, [])

  useEffect(() => {
    function receive(event) {
      const notice = { ...event.detail, id: nextId.current++ }
      setNotices((current) => [...current, notice])
    }
    toastEvents.addEventListener('toast', receive)
    return () => toastEvents.removeEventListener('toast', receive)
  }, [])

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-4 top-12 z-[60] mx-auto max-w-sm space-y-2"
    >
      {notices.map((notice) => <ToastCard key={notice.id} notice={notice} dismiss={dismiss} />)}
    </div>
  )
}
