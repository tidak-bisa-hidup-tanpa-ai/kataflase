import { useId, useRef } from 'react'
import { useNavigate } from 'react-router'
import { PHASES } from '../../constant/game'
import { useGame } from '../../contexts/GameContext'

export default function LeaveRoomButton({ className, children }) {
  const { room, leaveRoom } = useGame()
  const navigate = useNavigate()
  const dialog = useRef(null)
  const titleId = useId()
  const descriptionId = useId()
  const inRound = room && room.phase !== PHASES.WAITING && room.phase !== PHASES.RESULT

  async function onLeave() {
    dialog.current.close()
    navigate('/')
    await leaveRoom()
  }

  return (
    <>
      <button type="button" className={className} onClick={() => dialog.current.showModal()}>
        {children}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        aria-describedby={inRound ? descriptionId : undefined}
        className="card fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto p-5 text-ink shadow-[4px_4px_0_var(--color-flame)] backdrop:bg-scrim/60"
        onKeyDown={(event) => { if (event.key === 'Escape') event.stopPropagation() }}
      >
        <h2 id={titleId} className="display text-2xl">Keluar dari room?</h2>
        {inRound && <p id={descriptionId} className="mt-2 text-sm">Ronde masih berjalan.</p>}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" className="btn btn-outline" onClick={() => dialog.current.close()}>
            Batal
          </button>
          <button type="button" className="btn btn-ink" onClick={onLeave}>
            Keluar
          </button>
        </div>
      </dialog>
    </>
  )
}
