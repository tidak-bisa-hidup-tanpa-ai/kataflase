import { useGame } from '../../contexts/GameContext'
import { toast } from '../../helpers/toast'
import { CopyIcon } from '../ui/Icons'

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text)
    toast(successMessage, 'success')
  } catch {
    toast(`Gagal menyalin. Salin manual: ${text}`, 'error')
  }
}

// Tiket kode room di lobby.
export default function RoomHeader() {
  const { room } = useGame()

  return (
    <section className="relative mt-4 rounded-2xl border-2 border-ink bg-ink p-4 text-card shadow-[4px_4px_0_var(--color-flame)]">
      <p className="label text-card/75">Kode room</p>
      <p className="mt-1 text-center font-mono text-4xl font-bold tracking-[0.25em]">{room.code}</p>
      <div className="relative my-4 border-t-2 border-dashed border-card/35" aria-hidden="true">
        <span className="absolute -top-2.25 -left-6.75 size-4 rounded-full border-2 border-ink bg-paper" />
        <span className="absolute -top-2.25 -right-6.75 size-4 rounded-full border-2 border-ink bg-paper" />
      </div>
      <button
        type="button"
        className="btn btn-sun w-full"
        onClick={() => copyText(room.code, 'Kode room disalin')}
      >
        <CopyIcon /> Salin Kode Room
      </button>
      <button
        type="button"
        className="mt-3 w-full text-center font-mono text-[11px] text-card/70 underline underline-offset-2"
        onClick={() =>
          copyText(`${window.location.origin}/rooms/${room.code}`, 'Tautan undangan disalin')
        }
      >
        atau salin tautan undangan
      </button>
    </section>
  )
}
