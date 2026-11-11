import { useState } from 'react'
import { useGame } from '../../contexts/GameContext'
import { useCountdown } from '../../helpers/useCountdown'
import WordCard from '../room/WordCard'
import { EyeIcon, EyeOffIcon } from '../ui/Icons'

export default function WordRevealPhase() {
  const { room } = useGame()
  const seconds = useCountdown(room.deadlineAt)
  const [hidden, setHidden] = useState(false)

  return (
    <div className="relative pb-6 text-center">
      <div
        aria-hidden="true"
        className="halftone-blue pointer-events-none fixed bottom-0 left-0 h-44 w-44 opacity-60 mask-[radial-gradient(circle_at_bottom_left,black,transparent_70%)] lg:h-80 lg:w-80"
      />
      <div
        role="timer"
        aria-label={seconds === null ? undefined : `${seconds} detik tersisa`}
        className="display mx-auto mt-7 grid size-14 place-items-center rounded-full border-2 border-ink bg-card text-2xl ring-4 ring-flame ring-offset-2 ring-offset-paper"
      >
        {seconds ?? '–'}
      </div>
      <h1 className="display mt-4 text-[26px] lg:text-5xl">Ingat kata ini</h1>

      <div className="mt-6">
        <WordCard hidden={hidden} />
      </div>

      <button
        type="button"
        className="btn btn-outline relative mt-10 min-h-10 px-5 text-sm"
        onClick={() => setHidden((value) => !value)}
      >
        {hidden ? <EyeIcon /> : <EyeOffIcon />}
        {hidden ? 'Tampilkan kartu' : 'Sembunyikan kartu'}
      </button>

      <p className="relative mx-auto mt-10 max-w-xs text-xs leading-relaxed text-muted">
        Giliran pertama dimulai setelah hitung mundur. Kartu bisa dibuka lagi kapan saja selama
        ronde.
      </p>
    </div>
  )
}
