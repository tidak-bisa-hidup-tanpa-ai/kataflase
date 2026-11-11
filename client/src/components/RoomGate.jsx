import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { errorMessage } from '../constant/errors'
import { NICKNAME_MAX } from '../constant/game'
import { useGame } from '../contexts/GameContext'
import { cleanNickname, isValidNickname } from '../helpers/room'
import { loadNickname, saveNickname } from '../helpers/session'
import { toast } from '../helpers/toast'
import AppHeader from './AppHeader'
import Mascot from './ui/Mascot'

function ExpiredNotice() {
  const { expiredReason, dismissExpired } = useGame()
  const navigate = useNavigate()

  function goHome() {
    dismissExpired()
    navigate('/')
  }

  return (
    <div>
      <AppHeader />
      <Mascot mood="sleepy" className="mt-10 w-24" />
      <h1 className="display mt-4 text-[44px] leading-none">
        Sesi <span className="misreg">berakhir</span>
      </h1>
      <p className="mt-4 text-sm">
        {errorMessage({ code: expiredReason })} Kembali ke Home untuk membuat atau masuk ke room
        lagi.
      </p>
      <button type="button" className="btn btn-ink mt-8 w-full" onClick={goHome}>
        Kembali ke Home
      </button>
    </div>
  )
}

function JoinFromLink({ code }) {
  const { session, joinRoom } = useGame()
  const [nickname, setNickname] = useState(loadNickname)
  const [busy, setBusy] = useState(false)

  async function onSubmit(event) {
    event.preventDefault()
    const nick = cleanNickname(nickname)
    if (!isValidNickname(nick)) {
      toast(`Nickname harus 1–${NICKNAME_MAX} karakter.`, 'error')
      return
    }
    saveNickname(nick)
    setBusy(true)
    const res = await joinRoom(code, nick)
    setBusy(false)
    if (!res.ok) toast(errorMessage(res), 'error')
  }

  return (
    <div>
      <AppHeader />
      <form onSubmit={onSubmit}>
        <Mascot mood="wave" className="mx-auto mt-6 w-24 motion-safe:animate-bob" />
        <section className="mt-2 rounded-2xl border-2 border-ink bg-ink p-4 text-card shadow-[4px_4px_0_var(--color-flame)]">
          <p className="label text-card/75">Kamu diundang ke room</p>
          <p className="mt-1 text-center font-mono text-4xl font-bold tracking-[0.25em]">{code}</p>
        </section>

        {session && (
          <p className="card mt-4 bg-sun/40 px-3 py-2.5 text-sm">
            Kamu akan keluar dari room <strong className="font-mono">{session.code}</strong> jika
            masuk ke room ini.
          </p>
        )}

        <label htmlFor="link-nickname" className="label mt-6 block">
          Nickname
        </label>
        <input
          id="link-nickname"
          className="input mt-2"
          value={nickname}
          maxLength={NICKNAME_MAX}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Nama panggilanmu"
          autoComplete="nickname"
        />
        <button type="submit" className="btn btn-ink mt-3 w-full" disabled={busy}>
          {busy ? 'Masuk…' : 'Masuk ke Room'}
        </button>
        <Link
          to="/"
          className="mt-4 block text-center text-sm text-muted underline underline-offset-2"
        >
          Kembali ke Home
        </Link>
      </form>
    </div>
  )
}

function Loading() {
  const { status, resume } = useGame()

  return (
    <div>
      <AppHeader />
      <div className="mt-16 text-center">
        {status === 'error' ? (
          <>
            <p className="display text-2xl">Gagal memulihkan room</p>
            <button type="button" className="btn btn-ink mt-6 w-full" onClick={resume}>
              Coba Lagi
            </button>
          </>
        ) : (
          <>
            <Mascot mood="peek" className="mx-auto w-24 motion-safe:animate-bob" />
            <p className="mt-4 animate-pulse font-mono text-xs tracking-[0.14em] uppercase">
              Menyambungkan ke room…
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// Layar sederhana tetap satu kolom sempit, juga di laptop.
function Narrow({ children }) {
  return <div className="mx-auto max-w-md">{children}</div>
}

// Menangani sesi kedaluwarsa, tautan langsung tanpa sesi, dan proses resume
// sebelum menampilkan isi room.
export default function RoomGate({ code, children }) {
  const { session, status, room } = useGame()

  if (status === 'expired') return <Narrow><ExpiredNotice /></Narrow>
  if (!session || session.code !== code) return <Narrow><JoinFromLink code={code} /></Narrow>
  if (!room || room.code !== code) return <Narrow><Loading /></Narrow>
  return children
}
