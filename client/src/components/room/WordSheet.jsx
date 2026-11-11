import { useEffect } from 'react'
import { useLeaveRoom } from '../../helpers/useLeaveRoom'
import { EyeOffIcon } from '../ui/Icons'
import WordCard from './WordCard'

// Dibuka dari tombol "Lihat kata" selama ronde.
export default function WordSheet({ open, onClose }) {
  const leave = useLeaveRoom()

  useEffect(() => {
    if (!open) return undefined
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-ink/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Kata rahasiamu"
        className="w-full max-w-sm rounded-2xl border-2 border-ink bg-paper px-5 pt-8 pb-5"
        onClick={(event) => event.stopPropagation()}
      >
        <WordCard />
        <button type="button" className="btn btn-outline mt-10 w-full" onClick={onClose}>
          <EyeOffIcon /> Sembunyikan kartu
        </button>
        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-muted underline underline-offset-2"
          onClick={leave}
        >
          Keluar dari room
        </button>
      </div>
    </div>
  )
}
