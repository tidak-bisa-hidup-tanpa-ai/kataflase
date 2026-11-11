import { useEffect, useRef, useState } from 'react'
import { errorMessage } from '../../constant/errors'
import { CHAT_MAX } from '../../constant/game'
import { useGame } from '../../contexts/GameContext'
import { playerName } from '../../helpers/room'
import { toast } from '../../helpers/toast'
import { ArrowIcon } from '../ui/Icons'

export default function ChatBox({ canSend = true }) {
  const { room, playerId, sendChat, canAct } = useGame()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const endRef = useRef(null)
  const messages = room.chat ?? []

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [messages.length])

  async function onSubmit(event) {
    event.preventDefault()
    const message = text.trim()
    if (!message) return
    setBusy(true)
    const res = await sendChat(message)
    setBusy(false)
    if (res.ok) setText('')
    else toast(errorMessage(res), 'error')
  }

  return (
    <section className="mt-5 lg:flex lg:h-[calc(100vh-17rem)] lg:min-h-96 lg:flex-col lg:overflow-hidden lg:rounded-2xl lg:border-2 lg:border-ink lg:bg-card lg:shadow-[5px_5px_0_var(--color-ink)]">
      <p className="label hidden border-b-2 border-ink px-4 py-3 lg:block">Diskusi</p>
      <div className="lg:flex-1 lg:overflow-y-auto lg:p-4">
      <ul className="space-y-3" aria-live="polite" aria-label="Chat diskusi">
        {messages.length === 0 && (
          <li className="text-sm text-muted">Belum ada pesan. Mulai diskusinya!</li>
        )}
        {messages.map((message, index) => {
          const mine = message.playerId === playerId
          return (
            <li key={message.id ?? index} className={mine ? 'text-right' : ''}>
              <p className="mb-1 text-[11px] text-muted">
                {mine ? 'Kamu' : playerName(room, message.playerId)}
              </p>
              <p
                className={`inline-block max-w-[85%] rounded-xl border-2 border-ink px-3 py-2 text-left text-sm wrap-break-word ${
                  mine ? 'bg-ink text-card' : 'bg-card'
                }`}
              >
                {message.text}
              </p>
            </li>
          )
        })}
      </ul>
      <div ref={endRef} />
      </div>

      {canSend && (
        <form
          onSubmit={onSubmit}
          className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper px-4 py-3 lg:static lg:z-auto"
        >
          <div className="mx-auto flex max-w-md gap-2 lg:max-w-none">
            <label htmlFor="chat-input" className="sr-only">
              Pesan
            </label>
            <input
              id="chat-input"
              className="input flex-1"
              value={text}
              maxLength={CHAT_MAX}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tulis pesan…"
              autoComplete="off"
            />
            <button
              type="submit"
              className="btn btn-cobalt w-12 px-0"
              disabled={busy || !canAct || !text.trim()}
              aria-label="Kirim pesan"
            >
              <ArrowIcon width={18} height={18} />
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
