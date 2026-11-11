import { useState } from 'react'
import { Navigate, useParams } from 'react-router'
import RoomGate from '../components/RoomGate'
import Mascot from '../components/ui/Mascot'
import { errorMessage } from '../constant/errors'
import { PHASES } from '../constant/game'
import { useGame } from '../contexts/GameContext'
import { playerName } from '../helpers/room'
import { toast } from '../helpers/toast'
import LeaveRoomButton from '../components/room/LeaveRoomButton'

function defaultReason(result, room) {
  const impostor = playerName(room, result.impostorId)
  return result.winner === 'IMPOSTOR'
    ? `${impostor} berhasil lolos dari tebakan.`
    : `${impostor} paling banyak dipilih dan memang pemain dengan kata berbeda.`
}

function majorityWord(rows, impostorId) {
  const counts = new Map()
  rows
    .filter((row) => row.id !== impostorId && row.word)
    .forEach((row) => counts.set(row.word, (counts.get(row.word) ?? 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
}

function ResultView() {
  const { room, playerId, isHost, restartGame, canAct } = useGame()
  const [busy, setBusy] = useState(false)

  if (room.phase !== PHASES.RESULT) {
    return <Navigate to={`/rooms/${room.code}`} replace />
  }

  const result = room.result ?? {}
  const impostorWins = result.winner === 'IMPOSTOR'
  const words = result.playerWords ?? {}
  const tally = result.voteTally ?? {}
  const participants = room.participants ?? []
  const abstainCount = Math.max(0, participants.length - (room.voting?.submitted ?? 0))
  const rows = participants
    .map(({ playerId: id }) => ({ id, word: words[id], votes: Number(tally[id] ?? 0) }))
    .sort((a, b) => b.votes - a.votes)
  const maxVotes = Math.max(1, ...rows.map((row) => row.votes))
  const iAmImpostor = result.impostorId === playerId
  const iWon = iAmImpostor === impostorWins

  async function onRestart() {
    setBusy(true)
    const res = await restartGame()
    setBusy(false)
    if (!res.ok) toast(errorMessage(res), 'error')
  }

  return (
    <div className="relative pb-6">
      <div
        aria-hidden="true"
        className="halftone pointer-events-none absolute -top-5 -right-4 h-44 w-44 opacity-70 mask-[radial-gradient(circle_at_top_right,black,transparent_70%)]"
      />

      <div className="relative flex items-center justify-between">
        <span className="label">Hasil ronde</span>
        <span className="label">Room {room.code}</span>
      </div>

      <div className="lg:mt-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-16">
      <section className="relative">
      <div className="flex items-end justify-between gap-3">
      <p
        className={`display relative mt-5 inline-block -rotate-3 rounded-lg border-2 border-ink px-3 py-1.5 text-base tracking-tight uppercase shadow-[3px_3px_0_var(--color-ink)] ${
          impostorWins ? 'bg-flame' : 'bg-sun'
        }`}
      >
        {impostorWins ? 'Impostor menang' : 'Pemain biasa menang'}
      </p>
      <Mascot
        impostor
        mood={impostorWins ? 'smug' : 'caught'}
        word={words.get(result.impostorId) ?? ''}
        className="relative -mb-4 w-20 shrink-0 motion-safe:animate-bob lg:w-28"
        title={impostorWins ? 'Kartu impostor lolos' : 'Kartu impostor tertangkap'}
      />
      </div>

      <p className="label relative mt-5">Impostornya adalah</p>
      <h1 className="display misreg relative mt-1 text-[64px] leading-[0.95] wrap-break-word lg:text-[104px]">
        {playerName(room, result.impostorId)}
      </h1>
      <p className="relative mt-2 text-sm font-semibold">
        {iWon ? 'Kamu menang ronde ini!' : 'Kamu kalah ronde ini.'}
        {iAmImpostor && ' Kamu impostornya.'}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="card px-3 py-3">
          <p className="label text-[10px]">Kata mayoritas</p>
          <p className="display mt-2 text-3xl wrap-break-word">{majorityWord(rows, result.impostorId)}</p>
        </div>
        <div className="card rotate-2 bg-flame px-3 py-3 shadow-[3px_3px_0_var(--color-ink)]">
          <p className="label text-[10px]">Kata impostor</p>
          <p className="display mt-2 text-3xl wrap-break-word">{words[result.impostorId] ?? '—'}</p>
        </div>
      </div>
      </section>

      <section className="lg:mt-5 lg:rounded-2xl lg:border-2 lg:border-ink lg:bg-card lg:p-6 lg:shadow-[5px_5px_0_var(--color-ink)]">
      <h2 className="label mt-7 lg:mt-0">Jumlah suara</h2>
      <ul className="mt-2 space-y-2.5">
        {rows.map((row) => (
          <li key={row.id} className="grid grid-cols-[6.5rem_1fr_1.5rem] items-center gap-3">
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-sm font-bold">
                {playerName(room, row.id)}
                {row.id === playerId && ' (kamu)'}
              </span>
              <span className="block text-[10px] text-muted">{row.word ?? '—'}</span>
            </span>
            <span className="h-3 overflow-hidden rounded-full border-2 border-ink bg-card">
              <span
                className={`block h-full ${row.id === result.impostorId ? 'bg-flame' : 'bg-cobalt'}`}
                style={{ width: `${(row.votes / maxVotes) * 100}%` }}
              />
            </span>
            <span className="text-right font-bold tabular-nums">{row.votes}</span>
          </li>
        ))}
      </ul>
      {abstainCount > 0 && (
        <p className="mt-3 font-mono text-[11px] text-muted">{abstainCount} pemain abstain</p>
      )}

      <p className="mt-5 text-[13px] leading-relaxed">{result.reason || defaultReason(result, room)}</p>

      <div className="mt-7">
        {isHost ? (
          <button
            type="button"
            className="btn btn-ink w-full"
            onClick={onRestart}
            disabled={busy || !canAct}
          >
            {busy ? 'Menyiapkan…' : 'Main Lagi'}
          </button>
        ) : (
          <p className="rounded-xl border-2 border-dashed border-ink/45 py-3 text-center text-sm font-semibold">
            Menunggu host menekan Main Lagi…
          </p>
        )}
        <p className="mt-2 text-center font-mono text-[10px] text-muted">
          Kode room dan anggota tetap sama.
        </p>
        <LeaveRoomButton className="mt-4 w-full text-center text-sm text-muted underline underline-offset-2">
          Keluar dari room
        </LeaveRoomButton>
      </div>
      </section>
      </div>
    </div>
  )
}

export default function ResultPage() {
  const { code = '' } = useParams()
  const roomCode = code.toUpperCase()

  return (
    <RoomGate code={roomCode}>
      <ResultView />
    </RoomGate>
  )
}
