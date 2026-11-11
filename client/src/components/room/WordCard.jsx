import { useGame } from '../../contexts/GameContext'

// Kartu kata bertumpuk: kartu biru di belakang, kartu putih miring di depan.
export default function WordCard({ hidden = false }) {
  const { myWord } = useGame()

  return (
    <div className="relative mx-auto w-full max-w-68 lg:max-w-sm">
      <div
        aria-hidden="true"
        className="absolute inset-0 -rotate-6 rounded-xl border-2 border-ink bg-cobalt"
      />
      <div className="card relative rotate-2 px-4 pt-4 pb-5 shadow-[4px_4px_0_var(--color-ink)]">
        <p className="label">Kata rahasiamu</p>
        <p className="display py-8 text-center text-5xl leading-none wrap-break-word lg:py-12 lg:text-6xl">
          {!myWord ? '…' : hidden ? '• • •' : myWord}
        </p>
        <p className="text-xs">
          {myWord ? 'Hanya kamu yang melihat kartu ini.' : 'Menunggu kata dari server…'}
        </p>
      </div>
    </div>
  )
}
