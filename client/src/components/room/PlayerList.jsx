import { MAX_PLAYERS } from '../../constant/game'
import { useGame } from '../../contexts/GameContext'
import Avatar from '../ui/Avatar'

export default function PlayerList() {
  const { room, playerId } = useGame()
  const players = room.players ?? []

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="label">Pemain</h2>
        <span className="label">
          {players.length} / {MAX_PLAYERS}
        </span>
      </div>
      <ul className="mt-2 space-y-2">
        {players.map((player) => (
          <li key={player.playerId} className="card flex items-center gap-3 px-3 py-2">
            <Avatar room={room} playerId={player.playerId} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {player.nickname}
              {player.playerId === playerId && <span className="font-normal text-muted"> (kamu)</span>}
            </span>
            {player.playerId === room.hostId && (
              <span className="pill bg-sun px-2 py-0.5 text-[10px]">Host</span>
            )}
            <span
              className={`font-mono text-[11px] ${player.online ? 'text-emerald-700' : 'text-muted'}`}
            >
              {player.online ? '● online' : '○ offline'}
            </span>
          </li>
        ))}
        {players.length < MAX_PLAYERS && (
          <li className="rounded-xl border-2 border-dashed border-ink/45 py-2 text-center font-mono text-[11px] text-muted">
            Slot kosong · menunggu pemain
          </li>
        )}
      </ul>
    </section>
  )
}
