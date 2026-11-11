import { useGame } from '../../contexts/GameContext'
import { EyeIcon } from '../ui/Icons'

export default function RoomTopBar({ onShowWord = null }) {
  const { room, me } = useGame()

  return (
    <div className="flex min-h-9 items-center justify-between gap-3">
      <span className="label">Room {room.code}</span>
      {onShowWord ? (
        <button type="button" className="pill" onClick={onShowWord}>
          <EyeIcon width={13} height={13} /> Lihat kata
        </button>
      ) : (
        <span className="label truncate">Kamu · {me?.nickname ?? '—'}</span>
      )}
    </div>
  )
}
