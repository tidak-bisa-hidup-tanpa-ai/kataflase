import { useEffect, useState } from 'react'
import { useGame } from '../contexts/GameContext'

// Sisa detik menuju deadlineAt (ISO string atau epoch ms) memakai jam server.
export function useCountdown(deadlineAt) {
  const { now } = useGame()
  const [current, setCurrent] = useState(now)

  useEffect(() => {
    if (!deadlineAt) return undefined
    const id = setInterval(() => setCurrent(now()), 250)
    return () => clearInterval(id)
  }, [deadlineAt, now])

  if (!deadlineAt) return null
  const end =
    typeof deadlineAt === 'number' ? deadlineAt : Date.parse(deadlineAt)
  if (Number.isNaN(end)) return null
  return Math.max(0, Math.ceil((end - current) / 1000))
}
