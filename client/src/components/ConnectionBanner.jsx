import { useGame } from '../contexts/GameContext'

export default function ConnectionBanner() {
  const { session, connected } = useGame()
  if (!session || connected) return null

  return (
    <p
      role="status"
      className="fixed inset-x-0 top-0 z-50 border-b-2 border-ink bg-flame px-4 py-2 text-center font-mono text-xs font-medium tracking-wide text-ink"
    >
      Koneksi terputus · menyambungkan ulang…
    </p>
  )
}
