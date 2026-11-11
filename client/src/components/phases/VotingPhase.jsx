import { useState } from 'react'
import { errorMessage } from '../../constant/errors'
import { useGame } from '../../contexts/GameContext'
import { playerName } from '../../helpers/room'
import { toast } from '../../helpers/toast'
import ClueList from '../room/ClueList'
import PhaseBar from '../room/PhaseBar'
import Avatar from '../ui/Avatar'
import { CheckIcon } from '../ui/Icons'
import Mascot from '../ui/Mascot'

export default function VotingPhase() {
  const { room, playerId, hasVoted, submitVote, canAct } = useGame()
  const [selected, setSelected] = useState(null)
  const [lockedTarget, setLockedTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  const participants = room.participants ?? []
  const isParticipant = participants.includes(playerId)
  const candidates = participants.filter((id) => id !== playerId)
  const voted = hasVoted || lockedTarget !== null
  const progress = room.voteProgress ?? { voted: 0, total: participants.length }
  const chosen = lockedTarget ?? selected

  async function onVote() {
    if (!selected) return
    setBusy(true)
    const res = await submitVote(selected)
    setBusy(false)
    if (res.ok) {
      setLockedTarget(selected)
      toast('Suaramu diterima.', 'success')
    } else {
      toast(errorMessage(res), 'error')
    }
  }

  return (
    <div className={isParticipant ? 'pb-40 lg:pb-6' : 'pb-6'}>
      <PhaseBar title="Pilih satu orang" barColor="bg-flame" />

      <div className="lg:mt-2 lg:grid lg:grid-cols-[20rem_1fr] lg:items-start lg:gap-10">
      <section>
      <div className="mt-4 flex items-center gap-2 lg:mt-5" aria-live="polite">
        <span className="flex gap-1" aria-hidden="true">
          {Array.from({ length: progress.total }, (_, index) => (
            <span
              key={index}
              className={`size-2.5 rounded-full border-2 border-ink ${index < progress.voted ? 'bg-ink' : 'bg-card'}`}
            />
          ))}
        </span>
        <span className="font-mono text-[11px]">
          {progress.voted} dari {progress.total} sudah memilih
        </span>
      </div>

      <ClueList variant="chips" highlightId={chosen} />
      </section>

      <section>
      {!isParticipant ? (
        <p className="mt-6 rounded-xl border-2 border-dashed border-ink/45 py-3 text-center text-sm">
          Kamu tidak ikut ronde ini. Tunggu hasilnya.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-end justify-between gap-3">
            <h2 className="label pb-1">Siapa impostornya?</h2>
            <Mascot mood={voted ? 'happy' : 'panic'} className="w-14 shrink-0 motion-safe:animate-bob" />
          </div>
          <ul className="mt-2 space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0" role="radiogroup" aria-label="Kandidat impostor">
            {candidates.map((id) => {
              const active = chosen === id
              const player = room.players.find((p) => p.id === id)
              return (
                <li key={id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={voted || busy}
                    onClick={() => setSelected(id)}
                    className={`card flex w-full items-center gap-3 px-3 py-3 text-left transition disabled:cursor-not-allowed ${
                      active ? 'bg-flame shadow-[3px_3px_0_var(--color-ink)]' : 'enabled:hover:bg-sun/30'
                    }`}
                  >
                    <Avatar room={room} playerId={id} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-bold">{playerName(room, id)}</span>
                      {player && !player.online && (
                        <span className="block font-mono text-[10px] text-ink/70">
                          offline · tetap bisa dipilih
                        </span>
                      )}
                    </span>
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full border-2 border-ink ${
                        active ? 'bg-ink text-card' : 'bg-card'
                      }`}
                    >
                      {active && <CheckIcon width={12} height={12} />}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper px-4 pt-3 pb-4 lg:static lg:z-auto lg:mt-6 lg:border-0 lg:bg-transparent lg:p-0">
            <div className="mx-auto max-w-md lg:max-w-none">
              {voted ? (
                <p className="card py-3 text-center text-sm font-bold">
                  {lockedTarget
                    ? `Kamu memilih ${playerName(room, lockedTarget)} · tunggu pemain lain`
                    : 'Suaramu sudah diterima · tunggu pemain lain'}
                </p>
              ) : (
                <button
                  type="button"
                  className="btn btn-ink w-full"
                  onClick={onVote}
                  disabled={!selected || busy || !canAct}
                >
                  {busy
                    ? 'Mengirim…'
                    : selected
                      ? `Kunci pilihan: ${playerName(room, selected)}`
                      : 'Pilih satu pemain'}
                </button>
              )}
              <p className="mt-2 text-center font-mono text-[10px] text-muted">
                Setelah diterima, pilihan tidak bisa diubah.
              </p>
            </div>
          </div>
        </>
      )}
      </section>
      </div>
    </div>
  )
}
