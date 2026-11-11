import { useCallback, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import CluePhase from '../components/phases/CluePhase'
import DiscussionPhase from '../components/phases/DiscussionPhase'
import LobbyPhase from '../components/phases/LobbyPhase'
import VotingPhase from '../components/phases/VotingPhase'
import WordRevealPhase from '../components/phases/WordRevealPhase'
import RoomGate from '../components/RoomGate'
import PhaseTabs from '../components/room/PhaseTabs'
import RoomTopBar from '../components/room/RoomTopBar'
import WordSheet from '../components/room/WordSheet'
import { PHASES } from '../constant/game'
import { useGame } from '../contexts/GameContext'

const ROUND_VIEWS = {
  [PHASES.WORD_REVEAL]: WordRevealPhase,
  [PHASES.CLUE]: CluePhase,
  [PHASES.DISCUSSION]: DiscussionPhase,
  [PHASES.VOTING]: VotingPhase,
}

function RoomView() {
  const { room } = useGame()
  const [sheetOpen, setSheetOpen] = useState(false)
  const closeSheet = useCallback(() => setSheetOpen(false), [])

  if (room.phase === PHASES.RESULT) {
    return <Navigate to={`/rooms/${room.code}/result`} replace />
  }

  const PhaseView = ROUND_VIEWS[room.phase]
  if (!PhaseView) return <LobbyPhase />

  const isReveal = room.phase === PHASES.WORD_REVEAL

  return (
    <div>
      <RoomTopBar onShowWord={isReveal ? null : () => setSheetOpen(true)} />
      <PhaseTabs />
      <PhaseView key={`${room.roundId}-${room.phase}`} />
      <WordSheet open={sheetOpen && !isReveal} onClose={closeSheet} />
    </div>
  )
}

export default function RoomPage() {
  const { code = '' } = useParams()
  const roomCode = code.toUpperCase()

  return (
    <RoomGate code={roomCode}>
      <RoomView />
    </RoomGate>
  )
}
