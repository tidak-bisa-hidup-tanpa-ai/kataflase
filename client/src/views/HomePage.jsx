import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { errorMessage } from '../constant/errors'
import { MAX_PLAYERS, MIN_PLAYERS, NICKNAME_MAX, ROOM_CODE_MAX } from '../constant/game'
import { useGame } from '../contexts/GameContext'
import { cleanNickname, cleanRoomCode, isValidNickname } from '../helpers/room'
import { loadNickname, saveNickname } from '../helpers/session'
import { toast } from '../helpers/toast'

export default function HomePage() {
  const { session, createRoom, joinRoom, expiredReason, dismissExpired } = useGame()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState(loadNickname)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(null)

  function readNickname() {
    const nick = cleanNickname(nickname)
    if (!isValidNickname(nick)) {
      toast(`Nickname harus 1–${NICKNAME_MAX} karakter.`, 'error')
      return null
    }
    saveNickname(nick)
    return nick
  }

  async function onCreate(event) {
    event.preventDefault()
    const nick = readNickname()
    if (!nick) return
    setBusy('create')
    const res = await createRoom(nick)
    setBusy(null)
    if (res.ok) navigate(`/rooms/${res.data.code}`)
    else toast(errorMessage(res), 'error')
  }

  async function onJoin(event) {
    event.preventDefault()
    const nick = readNickname()
    if (!nick) return
    const roomCode = cleanRoomCode(code)
    if (!roomCode) {
      toast('Masukkan kode room.', 'error')
      return
    }
    setBusy('join')
    const res = await joinRoom(roomCode, nick)
    setBusy(null)
    if (res.ok) navigate(`/rooms/${res.data.code ?? roomCode}`)
    else toast(errorMessage(res), 'error')
  }

  return (
    <div className="relative lg:grid lg:min-h-[calc(100vh-8rem)] lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
      <div
        aria-hidden="true"
        className="halftone pointer-events-none absolute -top-5 -right-4 h-44 w-44 opacity-70 mask-[radial-gradient(circle_at_top_right,black,transparent_70%)] lg:-top-8 lg:right-auto lg:-left-10 lg:h-96 lg:w-96 lg:mask-[radial-gradient(circle_at_top_left,black,transparent_70%)]"
      />

      <section className="relative">
        <div className="flex items-center justify-between lg:justify-start lg:gap-4">
          <span className="label">Game tebak impostor</span>
          <span className="pill bg-sun py-1">
            {MIN_PLAYERS}–{MAX_PLAYERS} pemain
          </span>
        </div>

        <h1 className="display mt-7 text-[78px] leading-[0.82] lg:mt-10 lg:text-[150px]">
          <span className="block">Kata</span>
          <span className="misreg block">flase</span>
        </h1>

        <p className="mt-5 max-w-68 font-semibold lg:mt-8 lg:max-w-md lg:text-xl">
          Semua orang dapat kata yang sama. Satu orang tidak.
        </p>

        <div className="mt-5 flex items-end gap-2 lg:mt-8 lg:gap-3" aria-hidden="true">
          {['Kopi', 'Kopi', 'Kopi'].map((word, index) => (
            <span
              key={index}
              className="card flex h-16 w-14 items-end p-1.5 text-sm font-bold lg:h-24 lg:w-20 lg:p-2 lg:text-base"
            >
              {word}
            </span>
          ))}
          <span className="card ml-1 flex h-16 w-14 -translate-y-1 rotate-[-8deg] items-end bg-flame p-1.5 text-sm font-bold shadow-[3px_3px_0_var(--color-ink)] lg:h-24 lg:w-20 lg:p-2 lg:text-base">
            Teh
          </span>
        </div>
        <p className="mt-2 font-mono text-[11px] text-muted lg:mt-3 lg:text-xs">
          3 pemain dapat Kopi. 1 dapat Teh. Siapa?
        </p>

        <p className="mt-12 hidden font-mono text-[11px] tracking-[0.12em] text-muted uppercase lg:block">
          01 Kata · 02 Petunjuk · 03 Vote
        </p>
      </section>

      <section className="relative mt-6 lg:mt-0 lg:rounded-2xl lg:border-2 lg:border-ink lg:bg-card lg:p-8 lg:shadow-[6px_6px_0_var(--color-ink)]">
        <h2 className="display mb-6 hidden text-3xl lg:block">Mulai main</h2>

      {expiredReason && (
        <div className="card mb-5 flex items-start gap-3 bg-flame/25 px-3 py-2.5">
          <p className="flex-1 text-sm">{errorMessage({ code: expiredReason })}</p>
          <button type="button" className="text-sm underline" onClick={dismissExpired}>
            Tutup
          </button>
        </div>
      )}

      {session && (
        <div className="card mb-5 flex items-center gap-3 bg-sun/40 px-3 py-2.5">
          <p className="flex-1 text-sm">
            Kamu masih di room <strong className="font-mono">{session.code}</strong>.
          </p>
          <Link to={`/rooms/${session.code}`} className="pill">
            Kembali
          </Link>
        </div>
      )}

      <form onSubmit={onCreate}>
        <label htmlFor="nickname" className="label">
          Nickname
        </label>
        <input
          id="nickname"
          className="input mt-2"
          value={nickname}
          maxLength={NICKNAME_MAX}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Nama panggilanmu"
          autoComplete="nickname"
        />
        <button type="submit" className="btn btn-ink mt-3 w-full" disabled={busy !== null}>
          {busy === 'create' ? 'Membuat room…' : 'Buat Room'}
        </button>
      </form>

      <div className="mt-5 flex items-center gap-3 font-mono text-[10px] tracking-[0.12em] uppercase">
        <span className="h-0.5 flex-1 bg-ink" />
        atau masuk dengan kode
        <span className="h-0.5 flex-1 bg-ink" />
      </div>

      <form onSubmit={onJoin} className="mt-4 flex gap-2">
        <label htmlFor="room-code" className="sr-only">
          Kode room
        </label>
        <input
          id="room-code"
          className="input flex-1 font-mono tracking-[0.25em] uppercase placeholder:tracking-[0.25em]"
          value={code}
          maxLength={ROOM_CODE_MAX}
          onChange={(e) => setCode(cleanRoomCode(e.target.value))}
          placeholder="KODE ROOM"
          autoComplete="off"
          autoCapitalize="characters"
        />
        <button type="submit" className="btn btn-cobalt px-5" disabled={busy !== null}>
          {busy === 'join' ? 'Masuk…' : 'Masuk'}
        </button>
      </form>
      </section>

      <p className="mt-10 text-center font-mono text-[10px] tracking-[0.12em] text-muted uppercase lg:hidden">
        01 Kata · 02 Petunjuk · 03 Vote
      </p>
    </div>
  )
}
