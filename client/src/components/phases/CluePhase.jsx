import { useState } from 'react'
import { ERROR_MESSAGES, errorMessage } from '../../constant/errors'
import { CLUE_MAX } from '../../constant/game'
import { useGame } from '../../contexts/GameContext'
import { containsWord, playerName } from '../../helpers/room'
import { toast } from '../../helpers/toast'
import ClueList from '../room/ClueList'
import PhaseBar from '../room/PhaseBar'
import Avatar from '../ui/Avatar'
import Mascot from '../ui/Mascot'

export default function CluePhase() {
  const { room, playerId, myWord, submitClue, canAct } = useGame()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const order = room.turnOrder ?? []
  const currentId = room.currentTurnPlayerId
  const submitted = new Set((room.clues ?? []).map((clue) => clue.playerId))
  const isMyTurn = currentId === playerId && !submitted.has(playerId)
  const isParticipant = (room.participants ?? []).some((p) => p.playerId === playerId)

  const title = isMyTurn
    ? 'Giliran kamu'
    : currentId
      ? `Giliran ${playerName(room, currentId)}`
      : 'Petunjuk'

  async function onSubmit(event) {
    event.preventDefault()
    const clue = text.trim().replace(/\s+/g, ' ')
    if (!clue) {
      toast('Petunjuk tidak boleh kosong.', 'error')
      return
    }
    if (containsWord(clue, myWord)) {
      toast(ERROR_MESSAGES.CLUE_CONTAINS_WORD, 'error')
      return
    }
    setBusy(true)
    const res = await submitClue(clue)
    setBusy(false)
    if (res.ok) {
      setText('')
      toast('Petunjuk terkirim!', 'success')
    } else {
      toast(errorMessage(res), 'error')
    }
  }

  return (
    <div className={isMyTurn ? 'pb-56 lg:pb-6' : 'pb-6'}>
      <PhaseBar title={title} barColor="bg-flame" />

      <div className={isMyTurn ? 'lg:mt-2 lg:grid lg:grid-cols-[1fr_24rem] lg:items-start lg:gap-10' : ''}>
      <div>
      <ol className="mt-5 flex flex-wrap justify-around gap-x-2 gap-y-3 lg:justify-start lg:gap-x-6" aria-label="Urutan giliran">
        {order.map((id) => {
          const done = submitted.has(id)
          const current = id === currentId && !done
          return (
            <li
              key={id}
              className="flex min-w-0 flex-col items-center gap-1.5"
              aria-current={current ? 'step' : undefined}
            >
              <Avatar room={room} playerId={id} ring={current} />
              <span className="max-w-16 truncate text-[11px]">
                {id === playerId ? 'Kamu' : playerName(room, id)}
                {done && ' ✓'}
              </span>
            </li>
          )
        })}
      </ol>

      <h2 className="label mt-6">Petunjuk masuk</h2>
      <ClueList variant="list" />
      {isParticipant && !submitted.has(playerId) && (
        <p className="mt-2 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/50 py-2 text-center font-mono text-[11px] text-muted">
          <Mascot mood={isMyTurn ? 'happy' : 'peek'} className="w-10" />
          {isMyTurn ? 'Petunjukmu muncul di sini' : 'Tunggu giliranmu'}
        </p>
      )}
      </div>

      {isMyTurn && (
        <form
          onSubmit={onSubmit}
          className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-t-2 border-ink bg-ink px-4 pt-4 pb-5 lg:sticky lg:inset-auto lg:top-8 lg:z-auto lg:mt-5 lg:rounded-2xl lg:border-2 lg:p-6 lg:shadow-[5px_5px_0_var(--color-flame)]"
        >
          <div className="mx-auto max-w-md lg:max-w-none">
            <label htmlFor="clue-input" className="label text-card">
              Petunjuk singkatmu
            </label>
            <input
              id="clue-input"
              className="input mt-2"
              value={text}
              maxLength={CLUE_MAX}
              onChange={(e) => setText(e.target.value)}
              placeholder="Satu kata atau frasa pendek"
              autoComplete="off"
              autoFocus
            />
            <button
              type="submit"
              className="btn btn-sun mt-3 w-full shadow-none"
              disabled={busy || !canAct || !text.trim()}
            >
              {busy ? 'Mengirim…' : 'Kirim Petunjuk'}
            </button>
            <p className="mt-2 text-center text-[11px] text-card/80">
              Jangan tulis kata rahasiamu secara langsung · {text.length}/{CLUE_MAX}
            </p>
          </div>
        </form>
      )}
      </div>
    </div>
  )
}
