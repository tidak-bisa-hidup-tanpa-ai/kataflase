import { PHASE_DURATIONS } from '../../constant/game'
import { useGame } from '../../contexts/GameContext'
import { formatTime } from '../../helpers/room'
import { useCountdown } from '../../helpers/useCountdown'

// Judul fase + timer + bar sisa waktu.
export default function PhaseBar({ title, barColor = 'bg-flame' }) {
  const { room } = useGame()
  const seconds = useCountdown(room.deadlineAt)
  const total = Number(room.phaseDurationSec) || PHASE_DURATIONS[room.phase] || 0
  const percent = seconds === null || !total ? 0 : Math.min(100, (seconds / total) * 100)

  return (
    <div className="mt-5">
      <div className="flex items-start justify-between gap-3">
        <h1 className="display text-[30px] leading-[1.02]">{title}</h1>
        {seconds !== null && (
          <span
            role="timer"
            aria-label={`${seconds} detik tersisa`}
            className={`mt-1 shrink-0 rounded-lg bg-ink px-2 py-1 font-mono text-sm font-bold ${
              seconds <= 5 ? 'text-flame' : 'text-sun'
            }`}
          >
            {formatTime(seconds)}
          </span>
        )}
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full border-2 border-ink bg-card">
        <div
          className={`h-full ${barColor} transition-[width] duration-300 ease-linear`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
