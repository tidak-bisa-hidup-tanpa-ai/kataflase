import { useGame } from '../../contexts/GameContext'
import { playerName } from '../../helpers/room'
import Avatar from '../ui/Avatar'

function ClueText({ clue, className = '' }) {
  if (clue.skipped || !clue.text) {
    return <span className={`text-muted italic ${className}`}>dilewati</span>
  }
  return <span className={`font-bold wrap-break-word ${className}`}>{clue.text}</span>
}

// variant: 'list' (fase petunjuk), 'grid' (diskusi), 'chips' (voting)
export default function ClueList({ variant = 'list', highlightId = null }) {
  const { room, playerId } = useGame()
  const clues = room.clues ?? []
  const nameOf = (id) => (id === playerId ? 'Kamu' : playerName(room, id))

  if (clues.length === 0) {
    return <p className="mt-2 text-sm text-muted">Belum ada petunjuk.</p>
  }

  if (variant === 'chips') {
    return (
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {clues.map((clue) => (
          <li
            key={clue.playerId}
            className={`rounded-full border-[1.5px] border-ink px-2.5 py-1 text-xs ${
              clue.playerId === highlightId ? 'bg-sun' : 'bg-card'
            }`}
          >
            <ClueText clue={clue} />
            <span className="text-muted"> · {nameOf(clue.playerId)}</span>
          </li>
        ))}
      </ul>
    )
  }

  if (variant === 'grid') {
    return (
      <ul className="mt-2 grid grid-cols-2 gap-2">
        {clues.map((clue) => (
          <li key={clue.playerId} className="card flex items-baseline gap-2 px-3 py-2.5">
            <ClueText clue={clue} className="min-w-0 flex-1 text-base" />
            <span className="shrink-0 text-[10px] text-muted">{nameOf(clue.playerId)}</span>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <ul className="mt-2 space-y-2">
      {clues.map((clue) => (
        <li key={clue.playerId} className="card flex items-center gap-3 px-3 py-2.5">
          <Avatar room={room} playerId={clue.playerId} size="sm" />
          <ClueText clue={clue} className="min-w-0 flex-1 text-xl" />
          <span className="shrink-0 text-[11px] text-muted">{nameOf(clue.playerId)}</span>
        </li>
      ))}
    </ul>
  )
}
