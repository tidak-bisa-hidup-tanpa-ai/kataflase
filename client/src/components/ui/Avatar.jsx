import { AVATAR_COLORS } from '../../constant/game'
import { playerIndex, playerName } from '../../helpers/room'

const SIZES = {
  sm: 'size-6 text-[11px]',
  md: 'size-8 text-sm',
  lg: 'size-10 text-base',
}

export default function Avatar({ room, playerId, size = 'md', ring = false }) {
  const name = playerName(room, playerId)
  const color = AVATAR_COLORS[playerIndex(room, playerId) % AVATAR_COLORS.length]

  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full border-2 border-ink font-bold ${SIZES[size]} ${color} ${
        ring ? 'ring-[3px] ring-flame ring-offset-2 ring-offset-paper' : ''
      }`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
