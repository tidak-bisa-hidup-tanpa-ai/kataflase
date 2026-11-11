import { useEffect, useState } from 'react'
import axios from 'axios'
import { errorMessage } from '../../constant/errors'
import { MAX_PLAYERS, MIN_PLAYERS, RANDOM_CATEGORY } from '../../constant/game'
import { useGame } from '../../contexts/GameContext'
import { SERVER_URL } from '../../constant/url'
import { toast } from '../../helpers/toast'
import { useLeaveRoom } from '../../helpers/useLeaveRoom'
import AppHeader from '../AppHeader'
import PlayerList from '../room/PlayerList'
import RoomHeader from '../room/RoomHeader'

const CUSTOM_CATEGORY = { id: 'custom', label: 'Kategori Sendiri' }
const CUSTOM_CATEGORY_MAX = 50

function startBlocker(room) {
  const players = room.players ?? []
  if (room.isStarting) return 'Menyiapkan kata rahasia…'
  if (players.length < MIN_PLAYERS) {
    return `Butuh minimal ${MIN_PLAYERS} pemain · sekarang ${players.length}`
  }
  if (players.length > MAX_PLAYERS) return `Maksimal ${MAX_PLAYERS} pemain`
  if (players.some((p) => !p.online)) return 'Tunggu semua pemain online'
  return null
}

export default function LobbyPhase() {
  const { room, isHost, startGame, canAct } = useGame()
  const leave = useLeaveRoom()
  const [options, setOptions] = useState([RANDOM_CATEGORY])
  const [category, setCategory] = useState(RANDOM_CATEGORY.id)
  const [customCategory, setCustomCategory] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    async function fetchGameOptions() {
      try {
        const { data } = await axios.get(`${SERVER_URL}/api/game-options`, { timeout: 5000 })
        const categories = data.data.categories
          .filter((id) => id !== RANDOM_CATEGORY.id)
          .map((id) => ({ id, label: id }))
        if (active) setOptions([RANDOM_CATEGORY, ...categories])
      } catch {
        if (active) toast('Gagal memuat kategori. "Acak" tetap bisa dipakai.', 'error')
      }
    }

    fetchGameOptions()
    return () => {
      active = false
    }
  }, [])

  const onlineCount = (room.players ?? []).filter((p) => p.online).length
  const isCustom = category === CUSTOM_CATEGORY.id
  const customName = customCategory.trim()
  const blocker = startBlocker(room) ?? (isCustom && !customName ? 'Isi nama kategori untuk mulai' : null)
  const status = blocker ?? `${onlineCount} pemain online · siap mulai`

  async function onStart() {
    setBusy(true)
    const res = await startGame(category, isCustom ? customName : undefined)
    setBusy(false)
    if (!res.ok) toast(errorMessage(res), 'error')
  }

  return (
    <div>
      <AppHeader
        right={
          <button type="button" className="pill" onClick={leave}>
            Keluar
          </button>
        }
      />
      <div className="lg:mt-4 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-12">
        <div className="lg:col-start-1 lg:row-start-1">
          <RoomHeader />
        </div>
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:[&>section]:mt-4">
          <PlayerList />
        </div>
        <div className="lg:col-start-1 lg:row-start-2">
      {isHost && (
        <section className="mt-6">
          <h2 className="label">Kategori</h2>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Kategori kata">
            {[...options, CUSTOM_CATEGORY].map((option) => {
              const active = category === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={busy || room.isStarting}
                  onClick={() => setCategory(option.id)}
                  className={`rounded-full border-2 border-ink px-3.5 py-1.5 text-sm font-semibold transition ${
                    active ? 'bg-ink text-card' : 'bg-card enabled:hover:bg-sun/40'
                  }`}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
          {isCustom && (
            <div className="mt-4">
              <label htmlFor="custom-category" className="label">Nama Kategori</label>
              <input
                id="custom-category"
                className="input mt-2"
                value={customCategory}
                maxLength={CUSTOM_CATEGORY_MAX}
                onChange={(e) => setCustomCategory(e.target.value)}
                placeholder="Contoh: Futsal"
                disabled={busy || room.isStarting}
              />
            </div>
          )}
        </section>
      )}

      <p className="mt-5 text-[13px] leading-relaxed">
        Tiap pemain dapat satu kata pribadi, satu orang dapat kata berbeda. Beri satu petunjuk
        singkat, diskusi, lalu vote.
      </p>

      {isHost ? (
        <button
          type="button"
          className="btn btn-ink mt-5 w-full"
          onClick={onStart}
          disabled={Boolean(blocker) || busy || !canAct}
        >
          {busy || room.isStarting ? 'Menyiapkan ronde…' : 'Mulai Ronde'}
        </button>
      ) : (
        <p className="mt-5 rounded-xl border-2 border-dashed border-ink/45 py-3 text-center text-sm font-semibold">
          Menunggu host memulai ronde…
        </p>
      )}
      <p className="mt-2 text-center font-mono text-[11px] text-muted">{status}</p>
        </div>
      </div>
    </div>
  )
}
