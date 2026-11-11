import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { PHASES } from '../constant/game'
import { useGame } from '../contexts/GameContext'

export function useLeaveRoom() {
  const { room, leaveRoom } = useGame()
  const navigate = useNavigate()

  return useCallback(async () => {
    const inRound =
      room && room.phase !== PHASES.WAITING && room.phase !== PHASES.RESULT
    const message = inRound
      ? 'Ronde sedang berjalan. Yakin keluar dari room?'
      : 'Keluar dari room?'
    if (!window.confirm(message)) return
    navigate('/')
    await leaveRoom()
  }, [room, leaveRoom, navigate])
}
