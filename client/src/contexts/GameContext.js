import { createContext, useContext } from 'react'

export const GameContext = createContext(null)

export function useGame() {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame harus dipakai di dalam <GameProvider>')
  return context
}
